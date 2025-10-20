import { GoogleGenAI, Type } from "@google/genai";
import type { TradingRecommendation, BinanceTicker, MarketAnalysisData, BinanceFundingRate, AnalyzedTicker, SentimentResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const BINANCE_TICKER_API_URL = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
const BINANCE_FUNDING_API_URL = 'https://fapi.binance.com/fapi/v1/premiumIndex';


export const fetchAndFilterBinanceData = async (): Promise<MarketAnalysisData> => {
  try {
    const [tickerResponse, fundingResponse] = await Promise.all([
      fetch(BINANCE_TICKER_API_URL),
      fetch(BINANCE_FUNDING_API_URL)
    ]);

    if (!tickerResponse.ok) {
      throw new Error(`Binance Ticker API request failed: ${tickerResponse.status}`);
    }
    if (!fundingResponse.ok) {
      throw new Error(`Binance Funding Rate API request failed: ${fundingResponse.status}`);
    }

    const tickers: BinanceTicker[] = await tickerResponse.json();
    const fundingRates: BinanceFundingRate[] = await fundingResponse.json();

    const fundingRateMap = new Map(fundingRates.map(item => [item.symbol, parseFloat(item.lastFundingRate)]));

    const btcTicker = tickers.find(t => t.symbol === 'BTCUSDT');
    let marketTrend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let btcPrice = 'N/A';
    let btcChange = '0.00';

    if (btcTicker) {
      const changePercent = parseFloat(btcTicker.priceChangePercent);
      btcPrice = parseFloat(btcTicker.lastPrice).toLocaleString();
      btcChange = changePercent.toFixed(2);
      if (changePercent > 1) {
        marketTrend = 'Bullish';
      } else if (changePercent < -1) {
        marketTrend = 'Bearish';
      }
    }

    const analyzedTickers: AnalyzedTicker[] = tickers
      .map(ticker => {
        const volatility = Math.abs(parseFloat(ticker.priceChangePercent));
        const fundingRate = fundingRateMap.get(ticker.symbol) || 0;
        return { ticker, volatility, fundingRate };
      })
      .filter(({ ticker, volatility, fundingRate }) => 
        ticker.symbol.endsWith('USDT') &&
        ticker.symbol !== 'BTCUSDT' &&
        parseFloat(ticker.quoteVolume) > 10000000 &&
        parseFloat(ticker.openInterest) > 1000000 &&
        volatility >= 2 &&
        Math.abs(fundingRate) <= 0.001
      )
      .map(({ ticker, volatility, fundingRate }) => ({
        symbol: ticker.symbol,
        lastPrice: ticker.lastPrice,
        priceChangePercent: ticker.priceChangePercent,
        volume: ticker.quoteVolume,
        openInterest: ticker.openInterest,
        volatility,
        fundingRate,
      }));
      
    const top5Candidates = analyzedTickers
      .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
      .slice(0, 5);

    return { tickers: top5Candidates, marketTrend, btcPrice, btcChange };

  } catch (error) {
    console.error("Error fetching or filtering Binance data:", error);
    throw new Error("Failed to fetch or process market data from Binance.");
  }
};

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      pair: { type: Type.STRING },
      recommendation: { type: Type.STRING },
      justification: { type: Type.STRING },
      entryPrice: { type: Type.NUMBER },
      takeProfit: { type: Type.NUMBER },
      stopLoss: { type: Type.NUMBER },
      gridLevels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER },
            size: { type: Type.STRING },
          },
          required: ["price", "size"],
        },
      },
    },
    required: ["pair", "recommendation", "justification", "entryPrice", "takeProfit", "stopLoss", "gridLevels"],
  },
};

export const getTradingRecommendations = async (marketData: AnalyzedTicker[], marketTrend: string): Promise<TradingRecommendation[]> => {
  const prompt = `
    You are 'MR Profit Lite', an expert AI trading analyst for Binance Futures. Your goal is to identify the top 3 high-probability trades from a pre-vetted list, aiming for a 10% profit per cycle.

    The current overall market trend, based on BTCUSDT's 24h performance, is "${marketTrend}".

    I have already performed an initial screening of all Binance pairs based on strict criteria:
    1. High Liquidity: Volume > 10M USDT and Open Interest > 1M USDT.
    2. Significant Volatility: Absolute 24h price change > 2%.
    3. Stable Funding: Funding Rate between -0.1% and +0.1%.

    This process has produced the following TOP 5 CANDIDATES for your deep analysis:
    ${JSON.stringify(marketData, null, 2)}

    Your task is to analyze these 5 candidates and select the absolute BEST 3 trading opportunities.
    - If "Bullish", prioritize LONG positions.
    - If "Bearish", prioritize SHORT positions.
    - If "Neutral", analyze for both based on individual merit.

    For each of your top 3 picks, provide a complete trading plan. The entry price must be realistic based on the 'lastPrice'.
    Generate a response in the specified JSON format. Ensure all currency values have a realistic number of decimal places.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.6,
      },
    });

    const jsonText = response.text.trim();
    const aiRecommendations: Omit<TradingRecommendation, 'id' | 'estimatedProfitPercent'>[] = JSON.parse(jsonText);
    
    const priceMap = new Map(marketData.map(t => [t.symbol, parseFloat(t.lastPrice)]));

    const finalRecommendations: TradingRecommendation[] = aiRecommendations.map(rec => {
      const currentPrice = priceMap.get(rec.pair);
      if (!currentPrice) return null;

      const isLong = rec.recommendation === 'LONG';
      const takeProfit = isLong ? currentPrice * 1.10 : currentPrice * 0.90;
      const stopLoss = isLong ? currentPrice * 0.95 : currentPrice * 1.05;
      const gridLevels = [
        { price: isLong ? currentPrice * 1.01 : currentPrice * 0.99, size: '33%' },
        { price: isLong ? currentPrice * 1.02 : currentPrice * 0.98, size: '33%' },
        { price: isLong ? currentPrice * 1.03 : currentPrice * 0.97, size: '34%' },
      ];

      return {
        ...rec,
        id: `${rec.pair}-${Date.now()}`, // Add a unique ID
        entryPrice: currentPrice,
        takeProfit,
        stopLoss,
        gridLevels,
        estimatedProfitPercent: 9.9,
      };
    }).filter((rec): rec is TradingRecommendation => rec !== null);

    return finalRecommendations;

  } catch (error) {
    console.error("Error generating or processing recommendations:", error);
    throw new Error("Failed to communicate with the AI analyst or process its response.");
  }
};

const COINS = ["BTC", "ETH", "SOL", "DOGE", "XRP", "BNB"];
const BULLISH_WORDS = ["pump", "moon", "bullish", "breakout", "ath", "listing", "rocket", "surge", "rally", "partnership", "upgrade"];
const BEARISH_WORDS = ["dump", "scam", "bearish", "rekt", "crash", "hacked", "sec", "lawsuit", "selloff", "exploit", "rug"];
const INFLUENCERS = ["elonmusk", "cz_binance", "saylor"];
const MEDIA = ["cointelegraph", "watcher_guru", "whalechart"];

const BULLISH_THRESHOLD = 66;
const BEARISH_THRESHOLD = 39;

const mockTweets: Record<string, string[]> = {
  BTC: ["Big breakout for #bitcoin, saylor just bought more!", "BTC is going to pump hard this week, massive volume incoming.", "Potential SEC lawsuit news could cause a selloff on BTC."],
  ETH: ["#ethereum upgrade complete! Very bullish for the ecosystem.", "ETH fees are high, but the rocket is fueled for a new ATH.", "Whalechart shows big wallets are accumulating ETH."],
  SOL: ["Another #solana outage? This is getting bearish.", "SOL is so fast, huge potential. Watcher_guru just posted a bullish article.", "Solana could flip ETH, it's a moon mission."],
  DOGE: ["elonmusk tweeted about #dogecoin again! To the moon!", "Just a meme coin, be careful, high risk of a dump.", "DOGE is fun but lacks real utility. Neutral for now."],
  XRP: ["The SEC vs Ripple lawsuit is still ongoing, bearish outlook for #XRP.", "If XRP wins the lawsuit, it will surge like never before.", "Cointelegraph reports positive developments in the XRP case."],
  BNB: ["cz_binance announced a new #BNB launchpad project. Bullish!", "Binance chain is solid, BNB is a safe bet for long term.", "FUD around Binance, could see a BNB dump soon."],
};

const sentimentScore = (text: string): number => {
    const cleanedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    let score = 50;
    BULLISH_WORDS.forEach(word => { if (cleanedText.includes(word)) score += 10; });
    BEARISH_WORDS.forEach(word => { if (cleanedText.includes(word)) score -= 10; });
    INFLUENCERS.forEach(influencer => { if (cleanedText.includes(influencer)) score += 25; });
    MEDIA.forEach(media_outlet => { if (cleanedText.includes(media_outlet)) score += 10; });
    return Math.max(0, Math.min(100, score));
};

const classify = (score: number): 'Bullish 🚀' | 'Bearish ⚠️' | 'Neutral ⚪' => {
    if (score >= BULLISH_THRESHOLD) return "Bullish 🚀";
    if (score <= BEARISH_THRESHOLD) return "Bearish ⚠️";
    return "Neutral ⚪";
};

export const analyzeTwitterSentiment = async (): Promise<SentimentResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return COINS.map(coin => {
    const tweets = mockTweets[coin] || [];
    if (tweets.length === 0) return { coin, score: 50, status: "Neutral ⚪" };
    const scores = tweets.map(sentimentScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { coin, score: parseFloat(avgScore.toFixed(2)), status: classify(avgScore) };
  });
};
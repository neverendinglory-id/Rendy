
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getTradingRecommendations, fetchAndFilterBinanceData, analyzeTwitterSentiment } from './services/geminiService';
import type { TradingRecommendation, SentimentResult, LoggedTrade, TelegramMessage, ToastNotification, TelegramSettings } from './types';
import { Header } from './components/Header';
import { ResultsDisplay } from './components/ResultsDisplay';
import { TwitterSentimentDisplay } from './components/TwitterSentimentDisplay';
import { TradeLog } from './components/TradeLog';
import { TelegramFeed } from './components/TelegramFeed';
import { Toast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';

type ScanMode = 'manual' | 'semi-auto';
const AUTO_SCAN_INTERVAL_MINUTES = 30;

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [results, setResults] = useState<TradingRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [marketInfo, setMarketInfo] = useState<{ trend: string; price: string; change: string } | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('manual');
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [sentimentResults, setSentimentResults] = useState<SentimentResult[]>([]);
  const [isSentimentLoading, setIsSentimentLoading] = useState<boolean>(false);
  
  const [loggedTrades, setLoggedTrades] = useState<LoggedTrade[]>([]);
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({ token: '', chatId: '' });


  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const storedTrades = localStorage.getItem('mrprofit_loggedTrades');
      if (storedTrades) setLoggedTrades(JSON.parse(storedTrades));

      const storedMessages = localStorage.getItem('mrprofit_telegramMessages');
      if (storedMessages) setTelegramMessages(JSON.parse(storedMessages));

      const storedSettings = localStorage.getItem('mrprofit_telegramSettings');
      if (storedSettings) setTelegramSettings(JSON.parse(storedSettings));

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mrprofit_loggedTrades', JSON.stringify(loggedTrades));
  }, [loggedTrades]);

  useEffect(() => {
    localStorage.setItem('mrprofit_telegramMessages', JSON.stringify(telegramMessages));
  }, [telegramMessages]);

  useEffect(() => {
    localStorage.setItem('mrprofit_telegramSettings', JSON.stringify(telegramSettings));
  }, [telegramSettings]);


  const scanIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  
  const showToast = (message: string, type: ToastNotification['type'] = 'success') => {
    const newToast = { id: Date.now(), message, type };
    setToast(newToast);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleLogTrade = (rec: TradingRecommendation) => {
    const newTrade: LoggedTrade = {
      id: rec.id,
      pair: rec.pair,
      recommendation: rec.recommendation,
      entryPrice: rec.entryPrice,
      status: 'Active',
      logTime: Date.now(),
    };
    setLoggedTrades(prev => [newTrade, ...prev]);
  };

  const handleCloseTrade = (tradeId: string) => {
    setLoggedTrades(prev => prev.map(trade => {
      if (trade.id === tradeId) {
        const outcome = Math.random() > 0.4 ? 'win' : 'loss'; // 60% win rate
        const pnlMultiplier = trade.recommendation === 'LONG'
          ? (outcome === 'win' ? 1 + (Math.random() * 0.1 + 0.05) : 1 - (Math.random() * 0.05))
          : (outcome === 'win' ? 1 - (Math.random() * 0.1 + 0.05) : 1 + (Math.random() * 0.05));
        
        const closePrice = trade.entryPrice * pnlMultiplier;
        const pnlPercent = ((closePrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.recommendation === 'LONG' ? 1 : -1);

        // FIX: Corrected a typo in the variable name from `pnl-percent` to `pnlPercent`.
        return { ...trade, status: 'Closed', closePrice, pnlPercent: parseFloat(pnlPercent.toFixed(2)) };
      }
      return trade;
    }));
  };

  const handleSendToTelegram = async (rec: TradingRecommendation) => {
    if (!telegramSettings.token || !telegramSettings.chatId) {
      showToast("Please configure your Telegram settings first.", 'info');
      setIsSettingsModalOpen(true);
      return;
    }

    const directionEmoji = rec.recommendation === 'LONG' ? '🚀' : '📉';
    const messageText = `${directionEmoji} NEW SIGNAL: ${rec.recommendation} ${rec.pair} @ $${rec.entryPrice.toLocaleString()}\nTP: $${rec.takeProfit.toLocaleString()}\nSL: $${rec.stopLoss.toLocaleString()}`;
    
    const { token, chatId } = telegramSettings;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(messageText)}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Failed to send message.');
      }
      
      const newMessage: TelegramMessage = {
        id: rec.id,
        text: messageText,
        timestamp: Date.now(),
      };
      setTelegramMessages(prev => [newMessage, ...prev]);
      showToast(`Signal for ${rec.pair} sent to Telegram!`);

    } catch (error) {
      console.error("Telegram API error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      showToast(`Telegram Error: ${errorMessage}`, 'error');
    }
  };

  const stopAutoScan = useCallback(() => {
    setIsAutoScanning(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    scanIntervalRef.current = null;
    countdownIntervalRef.current = null;
    setCountdown(0);
  }, []);

  const handleScan = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
        setResults([]);
        setMarketInfo(null);
        setSentimentResults([]);
    }
    setIsLoading(true);
    setIsSentimentLoading(true);
    setError(null);
    let statusInterval: number;

    try {
        setAnalysisStatus("Fetching live market data from Binance...");
        
        const [marketData, sentimentData] = await Promise.all([
            fetchAndFilterBinanceData(),
            analyzeTwitterSentiment()
        ]);
        
        const { tickers, marketTrend, btcPrice, btcChange } = marketData;
        setMarketInfo({ trend: marketTrend, price: btcPrice, change: btcChange });
        setSentimentResults(sentimentData);
        setIsSentimentLoading(false);

        const aiStatusUpdates = [
          `Market trend is ${marketTrend}. Analyzing pairs...`,
          "Filtering coins by volume and volatility...",
          "Screening for stable funding rates...",
          "Identifying top 5 candidates...",
          "Engaging AI for deep analysis...",
          "Compiling top 3 recommendations...",
          "Finalizing grid strategies...",
        ];

        let currentUpdateIndex = 0;
        statusInterval = window.setInterval(() => {
          setAnalysisStatus(aiStatusUpdates[currentUpdateIndex % aiStatusUpdates.length]);
          currentUpdateIndex++;
        }, 1500);

        const recommendations = await getTradingRecommendations(tickers, marketTrend);
        
        if (statusInterval) clearInterval(statusInterval);
        setResults(recommendations);

    } catch (err) {
      if (statusInterval) clearInterval(statusInterval);
      console.error("Error during scan process:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to complete analysis. ${errorMessage} Please try again later.`);
      if (isAutoScanning) {
        stopAutoScan();
      }
    } finally {
      setIsLoading(false);
      setIsSentimentLoading(false);
      setAnalysisStatus('');
    }
  }, [isAutoScanning, stopAutoScan]);

  const startAutoScan = useCallback(() => {
    handleScan(); 
    setIsAutoScanning(true);
    setCountdown(AUTO_SCAN_INTERVAL_MINUTES * 60);

    scanIntervalRef.current = window.setInterval(() => handleScan(true), AUTO_SCAN_INTERVAL_MINUTES * 60 * 1000);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : AUTO_SCAN_INTERVAL_MINUTES * 60));
    }, 1000);
  }, [handleScan]);

  useEffect(() => {
    return () => { 
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    if (isAutoScanning) {
      stopAutoScan();
    }
  };
  
  const handleSaveSettings = (settings: TelegramSettings) => {
    setTelegramSettings(settings);
    setIsSettingsModalOpen(false);
    showToast("Settings saved successfully!", "success");
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'Bullish': return 'text-green-400';
      case 'Bearish': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Header onSettingsClick={() => setIsSettingsModalOpen(true)} />
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-8 border border-gray-700 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-400 mb-4">
            AI-Powered Futures Analysis
          </h2>
          
          <div className="mb-6">
            <span className="text-sm font-medium text-gray-400 mr-4">Scan Mode:</span>
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button type="button" onClick={() => handleModeChange('manual')} className={`px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors ${scanMode === 'manual' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                Manual
              </button>
              <button type="button" onClick={() => handleModeChange('semi-auto')} className={`px-4 py-2 text-sm font-medium border rounded-r-lg transition-colors ${scanMode === 'semi-auto' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                Semi Auto
              </button>
            </div>
          </div>
          
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            {scanMode === 'manual' 
              ? 'Click "Scan Now" to deploy the AI for a one-time market analysis.'
              : `The AI will auto-refresh every ${AUTO_SCAN_INTERVAL_MINUTES} minutes to find new opportunities.`
            }
          </p>
          
          {scanMode === 'manual' && (
            <button
              onClick={() => handleScan(false)}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Scanning...' : 'Scan Now'}
            </button>
          )}

          {scanMode === 'semi-auto' && (
            <>
              {!isAutoScanning ? (
                <button onClick={startAutoScan} disabled={isLoading} className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-50">
                  {isLoading ? 'Starting...' : 'Start Auto-Scan'}
                </button>
              ) : (
                <div className="flex flex-col items-center">
                   <button onClick={stopAutoScan} disabled={isLoading} className="px-8 py-3 mb-4 bg-gradient-to-r from-red-500 to-yellow-600 text-white font-bold rounded-lg shadow-lg hover:from-red-600 hover:to-yellow-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 disabled:opacity-50">
                     Stop Auto-Scan
                   </button>
                   <p className="text-sm text-gray-400">
                     Next scan in: <span className="font-mono font-bold text-lg text-blue-400">{formatCountdown(countdown)}</span>
                   </p>
                </div>
              )}
            </>
          )}
        </div>

        {marketInfo && !isLoading && (
          <div className="w-full mb-6 p-4 bg-gray-800/60 rounded-lg border border-gray-700 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-gray-400 text-sm font-semibold">BTC Price</span>
              <p className="text-lg sm:text-xl font-bold font-mono">${marketInfo.price}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm font-semibold">24h Change</span>
              <p className={`text-lg sm:text-xl font-bold font-mono ${parseFloat(marketInfo.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {marketInfo.change}%
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm font-semibold">Market Trend</span>
              <p className={`text-lg sm:text-xl font-bold ${getTrendColor(marketInfo.trend)}`}>
                {marketInfo.trend}
              </p>
            </div>
          </div>
        )}

        <TwitterSentimentDisplay isLoading={isSentimentLoading} results={sentimentResults} />

        <ResultsDisplay
          isLoading={isLoading}
          status={analysisStatus}
          results={results}
          error={error}
          marketTrend={marketInfo?.trend ?? null}
          loggedTradeIds={loggedTrades.map(t => t.id)}
          onLogTrade={handleLogTrade}
          onSendToTelegram={handleSendToTelegram}
        />

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <TradeLog trades={loggedTrades} onCloseTrade={handleCloseTrade} />
            <TelegramFeed messages={telegramMessages} />
        </div>
      </main>
       <footer className="w-full max-w-7xl mx-auto text-center text-gray-500 text-sm mt-8">
          <p>Disclaimer: MR Profit Lite provides AI-generated analysis and is not financial advice. Trading futures involves significant risk. Always do your own research.</p>
      </footer>
      <Toast notification={toast} />
      {isSettingsModalOpen && (
        <SettingsModal 
          initialSettings={telegramSettings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
import React from 'react';
import type { TradingRecommendation } from '../types';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';
import { SendIcon } from './icons/SendIcon';
import { ArchiveIcon } from './icons/ArchiveIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ResultsDisplayProps {
  isLoading: boolean;
  status: string;
  results: TradingRecommendation[];
  error: string | null;
  marketTrend: string | null;
  loggedTradeIds: string[];
  onLogTrade: (rec: TradingRecommendation) => void;
  onSendToTelegram: (rec: TradingRecommendation) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  isLoading, status, results, error, marketTrend, loggedTradeIds, onLogTrade, onSendToTelegram 
}) => {
  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-center p-8 bg-gray-800/30 rounded-lg min-h-[200px]">
        <LoadingSpinnerIcon className="w-12 h-12 mb-4 text-blue-400" />
        <p className="text-lg font-semibold text-gray-300">{status}</p>
        <p className="text-gray-500">The AI is analyzing the market...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center p-8 bg-red-900/20 border border-red-500 rounded-lg">
        <p className="text-xl font-bold text-red-400 mb-2">Analysis Failed</p>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  const getTrendColor = (trend: string | null) => {
    if (!trend) return 'text-gray-400';
    switch (trend) {
      case 'Bullish': return 'text-green-400';
      case 'Bearish': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (results.length > 0) {
    return (
        <div className="w-full overflow-x-auto bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-lg border border-gray-700">
            <table className="w-full min-w-max text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Coin</th>
                        <th scope="col" className="px-6 py-3">Direction</th>
                        <th scope="col" className="px-6 py-3">Entry</th>
                        <th scope="col" className="px-6 py-3">TP / SL</th>
                        <th scope="col" className="px-6 py-3">Grid Levels</th>
                        <th scope="col" className="px-6 py-3 text-center">Est. Profit</th>
                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {results.map((rec) => {
                        const isLong = rec.recommendation === 'LONG';
                        const isLogged = loggedTradeIds.includes(rec.id);
                        return (
                            <tr key={rec.id} className="hover:bg-gray-800/70 transition-colors duration-200">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-base text-gray-100">{rec.pair}</div>
                                  <div className={`text-xs font-bold ${getTrendColor(marketTrend)}`}>BTC Impact: {marketTrend}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                                        {isLong ? <TrendingUpIcon className="w-4 h-4 mr-2" /> : <TrendingDownIcon className="w-4 h-4 mr-2" />}
                                        {rec.recommendation}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono">${rec.entryPrice.toLocaleString()}</td>
                                <td className="px-6 py-4 font-mono">
                                    <div className="text-green-400">${rec.takeProfit.toLocaleString()}</div>
                                    <div className="text-red-400">${rec.stopLoss.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4 font-mono">
                                    <ul className="space-y-1">
                                        {rec.gridLevels.map((level, i) => (
                                            <li key={i} className="text-xs text-gray-400">
                                                <span className="font-semibold text-gray-200">${level.price.toLocaleString()}</span> ({level.size})
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-center text-blue-400 text-lg">{rec.estimatedProfitPercent}%</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button 
                                      onClick={() => onLogTrade(rec)}
                                      disabled={isLogged}
                                      className="p-2 rounded-full text-gray-300 disabled:text-green-500 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                                      aria-label={isLogged ? "Trade Logged" : "Log Trade"}
                                      title={isLogged ? "Trade Logged" : "Log Trade"}
                                    >
                                      {isLogged ? <CheckCircleIcon className="w-5 h-5" /> : <ArchiveIcon className="w-5 h-5" />}
                                    </button>
                                    <button 
                                      onClick={() => onSendToTelegram(rec)}
                                      className="p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-blue-400 transition-colors"
                                      aria-label="Send to Telegram"
                                      title="Send to Telegram"
                                    >
                                      <SendIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
  }

  return (
    <div className="w-full text-center p-8 bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-lg min-h-[200px]">
      <p className="text-gray-400">Trading recommendations will appear here once the scan is complete.</p>
    </div>
  );
};
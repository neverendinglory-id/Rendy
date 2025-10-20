import React from 'react';
import type { LoggedTrade } from '../types';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';

interface TradeLogProps {
  trades: LoggedTrade[];
  onCloseTrade: (tradeId: string) => void;
}

export const TradeLog: React.FC<TradeLogProps> = ({ trades, onCloseTrade }) => {
  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-lg border border-gray-700 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-200 mb-4">Trade Log</h3>
      <div className="overflow-y-auto max-h-96 pr-2">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No trades have been logged yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase sticky top-0 bg-gray-800/50">
              <tr>
                <th className="py-2 px-2">Pair</th>
                <th className="py-2 px-2">Entry</th>
                <th className="py-2 px-2 text-center">Status</th>
                <th className="py-2 px-2 text-center">P/L %</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {trades.map(trade => {
                const isLong = trade.recommendation === 'LONG';
                const pnlColor = trade.pnlPercent === undefined 
                  ? 'text-gray-400' 
                  : trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400';
                return (
                  <tr key={trade.id}>
                    <td className="py-3 px-2">
                      <div className="font-bold">{trade.pair}</div>
                      <div className={`text-xs inline-flex items-center ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                        {isLong ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : <TrendingDownIcon className="w-3 h-3 mr-1" />}
                        {trade.recommendation}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono">${trade.entryPrice.toLocaleString()}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.status === 'Active' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${pnlColor}`}>
                      {trade.pnlPercent !== undefined ? `${trade.pnlPercent.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {trade.status === 'Active' ? (
                        <button 
                          onClick={() => onCloseTrade(trade.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white font-semibold transition-colors"
                        >
                          Close
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
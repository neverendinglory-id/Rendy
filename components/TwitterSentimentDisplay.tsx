import React from 'react';
import type { SentimentResult } from '../types';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface TwitterSentimentDisplayProps {
  isLoading: boolean;
  results: SentimentResult[];
}

export const TwitterSentimentDisplay: React.FC<TwitterSentimentDisplayProps> = ({ isLoading, results }) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto mb-6 p-4 bg-gray-800/60 rounded-lg border border-gray-700 flex flex-col items-center justify-center min-h-[120px]">
        <LoadingSpinnerIcon className="w-8 h-8 mb-2 text-blue-400" />
        <p className="text-gray-400">Analyzing Twitter Sentiment...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return null; // Don't show anything if there are no results (e.g., before the first scan)
  }

  const getStatusColor = (status: string) => {
    if (status.includes('Bullish')) return 'text-green-400';
    if (status.includes('Bearish')) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="w-full max-w-5xl mx-auto mb-6 p-4 bg-gray-800/60 rounded-lg border border-gray-700">
      <h3 className="text-lg font-bold text-gray-200 mb-3 flex items-center">
        <ChatBubbleIcon className="w-5 h-5 mr-2 text-blue-400" />
        Twitter Sentiment Score
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase">
            <tr>
              <th scope="col" className="px-4 py-2">Coin</th>
              <th scope="col" className="px-4 py-2 text-center">Score</th>
              <th scope="col" className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {results.map((result) => (
              <tr key={result.coin}>
                <td className="px-4 py-3 font-bold">{result.coin}</td>
                <td className="px-4 py-3 font-mono text-center">{result.score.toFixed(2)}</td>
                <td className={`px-4 py-3 font-semibold ${getStatusColor(result.status)}`}>{result.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

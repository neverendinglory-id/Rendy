import React, { useRef, useEffect } from 'react';
import type { TelegramMessage } from '../types';
import { SendIcon } from './icons/SendIcon';

interface TelegramFeedProps {
  messages: TelegramMessage[];
}

export const TelegramFeed: React.FC<TelegramFeedProps> = ({ messages }) => {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-lg border border-gray-700 p-4 sm:p-6 flex flex-col">
      <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center">
        <SendIcon className="w-5 h-5 mr-2 text-blue-400" />
        Telegram Feed
      </h3>
      <div className="flex-grow overflow-y-auto max-h-96 pr-2 bg-gray-900/50 rounded-lg p-2 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Signals sent to Telegram will appear here.</p>
        ) : (
          messages.slice().reverse().map(message => (
            <div key={message.id} className="p-3 rounded-lg bg-gray-800 shadow">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{message.text}</pre>
              <div className="text-right text-xs text-gray-500 mt-1">{formatTimestamp(message.timestamp)}</div>
            </div>
          ))
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
};
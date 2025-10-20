import React, { useState } from 'react';
import type { TelegramSettings } from '../types';
import { XIcon } from './icons/XIcon';

interface SettingsModalProps {
  initialSettings: TelegramSettings;
  onSave: (settings: TelegramSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ initialSettings, onSave, onClose }) => {
  const [settings, setSettings] = useState<TelegramSettings>(initialSettings);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-md p-6 text-gray-200 relative animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `}</style>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Close settings"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4">Telegram Settings</h2>
        <p className="text-sm text-gray-400 mb-6">
          Your credentials are saved locally in your browser and are not shared.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1">
              Bot Token
            </label>
            <input
              type="password"
              id="token"
              name="token"
              value={settings.token}
              onChange={handleChange}
              placeholder="Enter your Telegram Bot Token"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="chatId" className="block text-sm font-medium text-gray-300 mb-1">
              Chat ID
            </label>
            <input
              type="text"
              id="chatId"
              name="chatId"
              value={settings.chatId}
              onChange={handleChange}
              placeholder="Enter your target Chat ID"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

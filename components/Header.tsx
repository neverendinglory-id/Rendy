import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="w-full max-w-5xl mx-auto mb-8 text-center flex justify-center items-center">
        <div className="relative inline-block bg-gray-800 rounded-full px-4 py-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                MR Profit
                <span className="text-lg font-bold text-gray-400 ml-1">Lite</span>
            </h1>
            <button 
                onClick={onSettingsClick}
                className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Settings"
                title="Settings"
            >
                <SettingsIcon className="w-6 h-6" />
            </button>
        </div>
    </header>
  );
};
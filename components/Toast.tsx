import React, { useState, useEffect } from 'react';
import type { ToastNotification } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ToastProps {
  notification: ToastNotification | null;
}

export const Toast: React.FC<ToastProps> = ({ notification }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2800); // Slightly less than the App's timeout to allow for fade-out
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) {
    return null;
  }

  const baseClasses = 'fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center w-full max-w-xs p-4 space-x-4 rounded-lg shadow-lg text-gray-200 transition-all duration-300';
  const stateClasses = {
    success: 'bg-green-800/90 backdrop-blur-sm border border-green-600',
    info: 'bg-blue-800/90 backdrop-blur-sm border border-blue-600',
    error: 'bg-red-800/90 backdrop-blur-sm border border-red-600',
  };
  const visibilityClasses = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  const Icon = () => {
    // Extend with other icons for info/error if needed
    return <CheckCircleIcon className="w-6 h-6 text-green-300" />;
  };

  return (
    <div className={`${baseClasses} ${stateClasses[notification.type]} ${visibilityClasses}`} role="alert">
      <div className="flex-shrink-0">
        <Icon />
      </div>
      <div className="text-sm font-semibold">{notification.message}</div>
    </div>
  );
};
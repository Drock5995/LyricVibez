import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 animate-fade-in">
      <div className="relative">
        <div className="spinner mb-6"></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse"></div>
      </div>
      <p className="text-xl text-gray-300 font-medium">{message}</p>
      <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 mt-4 rounded-full animate-pulse"></div>
    </div>
  );
};

export default LoadingSpinner;
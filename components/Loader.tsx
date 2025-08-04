import React from 'react';

interface LoaderProps {
  step: string;
}

export const Loader: React.FC<LoaderProps> = ({ step }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/70 backdrop-blur-md text-center p-8 animate-fade-in">
      <div className="relative flex justify-center items-center h-24 w-24">
        <div className="absolute w-full h-full rounded-full animate-spin border-4 border-dashed border-cyan-500/50" style={{ animationDuration: '4s' }}></div>
        <div className="absolute w-20 h-20 rounded-full animate-spin border-4 border-dotted border-pink-500/50" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
        <div className="w-16 h-16 bg-gray-900/50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-2xl">
          <svg className="w-8 h-8 text-cyan-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m14 0h2M3 15h2m14 0h2M12 5.378A6.622 6.622 0 0 0 5.378 12 6.622 6.622 0 0 0 12 18.622 6.622 6.622 0 0 0 18.622 12 6.622 6.622 0 0 0 12 5.378Z"/>
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold mt-8 text-gray-200">AI is working its magic...</h2>
      <p className="text-gray-400 mt-2">{step}</p>
    </div>
  );
};
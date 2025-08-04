import React from 'react';
import { Navigation } from './Navigation';
import { TikTokIcon } from './icons';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onShowAuth: () => void;
  onShowDashboard: () => void;
  onShowPricing: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onShowAuth, 
  onShowDashboard, 
  onShowPricing 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Navigation 
        user={user}
        onShowAuth={onShowAuth}
        onShowDashboard={onShowDashboard}
        onShowPricing={onShowPricing}
      />
      
      <main className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-6xl">
            {children}
          </div>
        </div>
        
        <footer className="text-center space-y-3 mt-8">
          <a
            href="https://www.tiktok.com/@lyricvibez0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors font-medium"
          >
            <TikTokIcon className="w-5 h-5" />
            Follow LyricVibez on TikTok
          </a>
          <p className="text-xs text-pink-600">
            Powered by AI. Created By <strong>David Spradlin</strong> ©2025
          </p>
        </footer>
      </main>
    </div>
  );
};
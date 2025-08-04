import React from 'react';
import { Navigation } from './Navigation';
import { TikTokIcon } from './icons';

interface DesktopLayoutProps {
  children: React.ReactNode;
  user: any;
  onShowAuth: () => void;
  onShowDashboard: () => void;
  onShowPricing: () => void;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ 
  children, 
  user, 
  onShowAuth, 
  onShowDashboard, 
  onShowPricing 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
      <Navigation 
        user={user}
        onShowAuth={onShowAuth}
        onShowDashboard={onShowDashboard}
        onShowPricing={onShowPricing}
      />
      
      <div className="flex-1 flex pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-80 bg-gray-900/50 backdrop-blur-sm border-r border-gray-800/50 flex-col">
          <div className="p-6">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-black text-white">LV</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">LyricVibez</h2>
                  <p className="text-sm text-gray-400">AI Lyric Videos</p>
                </div>
              </div>
              
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{user.name}</p>
                      <p className="text-gray-400 text-xs capitalize">{user.plan} Plan</p>
                    </div>
                  </div>
                  
                  {user.plan === 'free' && (
                    <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg p-3">
                      <p className="text-cyan-300 text-sm font-medium mb-2">Free Plan Limits</p>
                      <p className="text-gray-300 text-xs">
                        {user.videosToday}/1 videos used today
                      </p>
                      <button 
                        onClick={onShowPricing}
                        className="w-full mt-2 btn bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-xs py-2"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={onShowAuth}
                  className="w-full btn bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                >
                  Sign In to Start
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-6 pt-0">
            <div className="glass-panel p-4">
              <h3 className="text-white font-semibold mb-3">Quick Tips</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Upload high-quality audio files</p>
                <p>• Use clear, well-formatted lyrics</p>
                <p>• Choose themes that match your genre</p>
                <p>• Preview before generating</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl">
              {children}
            </div>
          </div>
          
          <footer className="border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <a
                href="https://www.tiktok.com/@lyricvibez0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                <TikTokIcon className="w-4 h-4" />
                Follow on TikTok
              </a>
              <p className="text-xs text-pink-600">
                Powered by AI. Created By <strong>David Spradlin</strong> ©2025
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
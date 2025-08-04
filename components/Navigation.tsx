import React from 'react';
import { authService } from '../services/authService';
import { CrownIcon } from './icons';

interface NavigationProps {
  user: any;
  onShowAuth: () => void;
  onShowDashboard: () => void;
  onShowPricing: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  user, 
  onShowAuth, 
  onShowDashboard, 
  onShowPricing 
}) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-lg font-black text-white">LV</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              LyricVibez
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">Welcome,</span>
                  <span className="text-white font-medium">{user.name}</span>
                  {user.plan !== 'free' && (
                    <CrownIcon className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                
                <button
                  onClick={onShowDashboard}
                  className="btn bg-gray-700/50 hover:bg-gray-600/50 text-sm border border-gray-600/50"
                >
                  Dashboard
                </button>
                
                {user.plan === 'free' && (
                  <button
                    onClick={onShowPricing}
                    className="btn bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-sm"
                  >
                    Upgrade
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onShowAuth}
                className="btn bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
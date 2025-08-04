import React, { useState } from 'react';
import { authService } from '../services/authService';
import { CrownIcon, XIcon } from './icons';
import { PRICING } from '../utils/constants';

interface DashboardProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'pro' | 'premium') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, isOpen, onClose, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'settings'>('overview');

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'from-cyan-500 to-blue-500';
      case 'premium': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
        
        <div className="relative bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <button
            onClick={onClose}
            title="Close dashboard"
            className="absolute top-6 right-6 z-10 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full p-2 transition-all duration-200"
          >
            <XIcon className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getPlanColor(user.plan)} rounded-xl flex items-center justify-center shadow-lg`}>
                <span className="text-2xl font-black text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getPlanColor(user.plan)} text-white`}>
                    {user.plan.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-sm">{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'usage', label: 'Usage' },
              { id: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Videos Today</h3>
                    <p className="text-3xl font-bold text-cyan-400">{user.videosToday}</p>
                    <p className="text-gray-400 text-sm">
                      {user.plan === 'free' ? `${authService.getRemainingVideos()} remaining` : 'Unlimited'}
                    </p>
                  </div>
                  
                  <div className="glass-panel p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Plan Status</h3>
                    <p className="text-2xl font-bold text-purple-400 capitalize">{user.plan}</p>
                    <p className="text-gray-400 text-sm">
                      {user.plan === 'free' ? 'Upgrade for more features' : 'Premium features enabled'}
                    </p>
                  </div>
                  
                  <div className="glass-panel p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Member Since</h3>
                    <p className="text-xl font-bold text-green-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 text-sm">Account created</p>
                  </div>
                </div>

                {user.plan === 'free' && (
                  <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CrownIcon className="w-8 h-8 text-yellow-400" />
                      <h3 className="text-xl font-bold text-white">Upgrade Your Plan</h3>
                    </div>
                    <p className="text-gray-300 mb-4">Unlock unlimited videos, premium themes, and more features.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => onUpgrade('pro')}
                        className="btn bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                      >
                        Pro ${PRICING.pro}/mo
                      </button>
                      <button
                        onClick={() => onUpgrade('premium')}
                        className="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                      >
                        Premium ${PRICING.premium}/mo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Usage Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Videos Created Today</span>
                      <span className="text-cyan-400 font-semibold">{user.videosToday}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Daily Limit</span>
                      <span className="text-purple-400 font-semibold">
                        {user.plan === 'free' ? '1' : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Plan Type</span>
                      <span className="text-green-400 font-semibold capitalize">{user.plan}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={user.name}
                        disabled
                        className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
                        placeholder="Your name"
                        title="User name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
                        placeholder="Your email"
                        title="User email"
                      />
                    </div>
                    <button
                      onClick={() => {
                        authService.logout();
                        onClose();
                        window.location.reload();
                      }}
                      className="btn bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
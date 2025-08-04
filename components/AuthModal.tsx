import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { XIcon } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.register(email, password, name);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-lg">
        {/* Background glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
        
        <div className="relative bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full p-2 transition-all duration-200"
            title="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
          
          <div className="text-center mb-10">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <span className="text-3xl font-black text-white tracking-tight">LV</span>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-2xl blur-lg -z-10"></div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent mb-3">
              {isLogin ? 'Welcome Back' : 'Join LyricVibez'}
            </h1>
            <p className="text-gray-400 text-base font-medium">
              {isLogin ? 'Sign in to create amazing lyric videos' : 'Start creating professional lyric videos today'}
            </p>
          </div>
        
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-200 tracking-wide">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-cyan-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 text-base"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none"></div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-200 tracking-wide">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-cyan-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 text-base"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none"></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-200 tracking-wide">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-gray-800/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-cyan-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 text-base"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none"></div>
              </div>
            </div>
          
            {error && (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/30 to-pink-500/30 rounded-xl blur-sm"></div>
                <div className="relative bg-red-500/10 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-300 text-sm font-medium text-center">{error}</p>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full group overflow-hidden rounded-xl p-4 font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-300 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-3 text-white">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  )}
                </div>
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-900/90 text-gray-400 font-medium">
                  {isLogin ? "New to LyricVibez?" : "Already have an account?"}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="mt-4 text-cyan-400 hover:text-cyan-300 font-semibold text-base transition-colors duration-200 hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In Instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
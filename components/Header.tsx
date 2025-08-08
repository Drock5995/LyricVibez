
import React from 'react';
import { MusicIcon } from './icons';

export const Header: React.FC = () => {
    return (
        <header className="w-full max-w-5xl mx-auto mb-12 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-glow">
                       <MusicIcon className="w-10 h-10 text-cyan-300"/>
                    </div>
                </div>
                <div>
                    <h1 className="text-6xl font-black tracking-tight mb-2">
                        Lyric<span className="gradient-text">Vibez</span>
                    </h1>
                    <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full"></div>
                </div>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
                Transform your favorite songs into stunning, AI-powered lyric videos with professional themes and perfect synchronization.
            </p>
            <div className="flex justify-center gap-2 mt-6">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold border border-cyan-500/30">⚡ AI-Powered</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold border border-purple-500/30">🎨 Professional</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm font-semibold border border-pink-500/30">⏱️ Instant</span>
            </div>
        </header>
    );
};
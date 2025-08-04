
import React from 'react';
import { MusicIcon } from './icons';

export const Header: React.FC = () => {
    return (
        <header className="w-full max-w-4xl mx-auto mb-6 md:mb-10 text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                <div className="p-3 rounded-full bg-cyan-900/50 border border-cyan-500/30 shadow-[0_0_20px] shadow-cyan-500/30">
                   <MusicIcon className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300"/>
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-gray-200 via-cyan-300 to-pink-400 text-transparent bg-clip-text">
                    LyricVibez
                </h1>
            </div>
            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
                Turn your favorite song into a stunning, AI-powered lyric video in seconds.
            </p>
        </header>
    );
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PreparedLyric, TimedLyric } from '../types';
import { PlayIcon, PauseIcon, BackIcon, SearchIcon } from './icons';
import { AudioWaveform } from './AudioWaveform';
import { autoSyncWithAI } from '../services/geminiService';

interface LyricTimerProps {
  audioUrl: string;
  audioFile: File;
  lyrics: PreparedLyric[];
  onComplete: (timedLyrics: TimedLyric[]) => void;
  onBack: () => void;
}

const REACTION_TIME_OFFSET_S = 0.200; 

export const LyricTimer: React.FC<LyricTimerProps> = ({ audioUrl, audioFile, lyrics, onComplete, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const isFinished = currentIndex >= lyrics.length;

  const handleTap = useCallback(() => {
    if (isFinished || !audioRef.current || !isPlaying) return;
    
    setTimestamps(prev => [...prev, audioRef.current!.currentTime]);
    setCurrentIndex(prev => prev + 1);
  }, [isFinished, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isFinished) {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap, isFinished]);
  
  const handleComplete = () => {
    if (timestamps.length !== lyrics.length) {
        console.error("Mismatch between lyrics and timestamps.");
        return;
    }

    const compensatedTimestamps = timestamps.map(t => Math.max(0, t - REACTION_TIME_OFFSET_S));
    
    const timedLyrics: TimedLyric[] = lyrics.map((lyric, i) => {
        const startTime = compensatedTimestamps[i];
        return {
            ...lyric,
            startTime,
            endTime: 0, // Will be set in the next step
        };
    });
    
    onComplete(timedLyrics);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleRestart = () => {
    if(!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.pause();
    setCurrentIndex(0);
    setTimestamps([]);
    setIsPlaying(false);
  }

  const handleAutoSync = async () => {
    setIsAutoSyncing(true);
    try {
      // Try AI sync first (more accurate)
      const syncedLyrics = await autoSyncWithAI(audioFile, lyrics);
      
      // Validate results
      if (syncedLyrics.length !== lyrics.length) {
        throw new Error('AI sync returned incomplete results');
      }
      
      // Check for reasonable timing
      const hasValidTiming = syncedLyrics.every((lyric, i) => {
        const isValidStart = lyric.startTime >= 0;
        const isValidDuration = lyric.endTime > lyric.startTime;
        const isValidOrder = i === 0 || lyric.startTime >= syncedLyrics[i-1].startTime;
        return isValidStart && isValidDuration && isValidOrder;
      });
      
      if (!hasValidTiming) {
        throw new Error('AI sync produced invalid timing');
      }
      
      onComplete(syncedLyrics);
    } catch (error) {
      console.error('AI Auto-sync failed:', error);
      
      // Fallback to browser speech recognition if available
      if (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) {
        try {
          const { autoSyncLyrics } = await import('../services/speechSyncService');
          const speechSyncedLyrics = await autoSyncLyrics(audioUrl, lyrics);
          onComplete(speechSyncedLyrics);
          return;
        } catch (speechError) {
          console.error('Speech sync also failed:', speechError);
        }
      }
      
      // Show user-friendly error with suggestions
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Auto-sync failed: ${errorMsg}\n\nTips for better results:\n• Ensure clear audio quality\n• Try with songs that have distinct vocals\n• Use manual timing for complex songs`);
    } finally {
      setIsAutoSyncing(false);
    }
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, []);


  const progressPercentage = (currentIndex / lyrics.length) * 100;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-4 text-center animate-fade-in">
        <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous"></audio>
        <div className="w-full relative">
            <button onClick={onBack} className="absolute top-0 left-0 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-10">
                <BackIcon className="w-5 h-5"/> Back
            </button>
            <h2 className="text-3xl font-bold text-cyan-300">Sync Lyrics</h2>
            <p className="text-gray-400 mt-1">Use Smart Auto-Sync for instant results, or manually tap for each line.</p>
        </div>

        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-4 border border-gray-700">
            <div className="h-full bg-cyan-500 transition-all duration-300" style={{width: `${progressPercentage}%`, boxShadow: '0 0 10px var(--aurora-cyan)'}}></div>
        </div>

        <div className="w-full glass-panel p-2">
            <AudioWaveform audioUrl={audioUrl} currentTime={currentTime} />
        </div>

        <div 
            onClick={handleTap} 
            className="w-full h-64 flex flex-col items-center justify-center glass-panel cursor-pointer select-none relative overflow-hidden p-4 group"
        >
            <div className={`absolute inset-0 bg-cyan-500/20 transition-opacity duration-500 opacity-0 ${isPlaying && !isFinished ? 'group-hover:opacity-100' : ''}`}></div>
            {isPlaying && <div className="absolute inset-0 bg-cyan-900/20 animate-pulse-slow"></div>}

            {isFinished ? (
                <div className="text-center animate-fade-in z-10">
                    <p className="text-3xl font-bold text-green-400">All lines synced!</p>
                    <p className="text-gray-300 mt-2">Now, let's fine-tune the timing.</p>
                </div>
            ) : (
                 <>
                    <div className="flex flex-col items-center justify-center h-full z-10">
                        {currentIndex === 0 ? (
                            <div className="text-gray-400 text-center">
                                 <p className="text-xl font-semibold">
                                     {isPlaying ? "Get ready..." : "Press Play to begin"}
                                 </p>
                                 <p>Tap (or use Spacebar) when the first lyric starts.</p>
                            </div>
                        ) : (
                            <p 
                                key={currentIndex - 1}
                                className="text-4xl font-bold text-white animate-fade-in"
                                style={{textShadow: '0 2px 10px rgba(0,0,0,0.7)'}}
                            >
                                {lyrics[currentIndex - 1].line}
                            </p>
                        )}
                    </div>
                    {lyrics[currentIndex] && (
                         <p className="absolute bottom-4 text-lg text-gray-500 animate-fade-in z-10">
                            Next: {lyrics[currentIndex].line}
                        </p>
                    )}
                </>
            )}
        </div>

        {isFinished ? (
             <button
                onClick={handleComplete}
                className="w-full mt-4 btn bg-green-600 hover:bg-green-500 text-lg"
            >
                Continue to Timeline Editor
            </button>
        ) : (
            <div className="w-full p-4 glass-panel flex items-center justify-center gap-6">
                <button onClick={togglePlayPause} className="p-4 bg-cyan-500/80 rounded-full text-white hover:bg-cyan-500 shadow-[0_0_20px] shadow-cyan-500/30">
                    {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
            </div>
        )}
        <div className="flex flex-col gap-3 mt-2">
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={handleAutoSync} 
                    disabled={isAutoSyncing} 
                    className="btn bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-sm font-semibold shadow-lg"
                    title="AI analyzes audio and automatically syncs lyrics with high precision"
                >
                    {isAutoSyncing ? (
                        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    ) : (
                        <SearchIcon className="w-4 h-4 mr-2" />
                    )}
                    {isAutoSyncing ? 'AI Analyzing Audio...' : '🤖 Smart Auto-Sync'}
                </button>
                <button onClick={handleRestart} className="text-sm text-gray-500 hover:text-gray-300 underline">Restart</button>
            </div>
            {isAutoSyncing && (
                <div className="text-center text-sm text-gray-400 animate-pulse">
                    <p>🎵 Analyzing vocal patterns and timing...</p>
                    <p className="text-xs mt-1">This may take 10-30 seconds for best results</p>
                </div>
            )}
        </div>
    </div>
  );
};
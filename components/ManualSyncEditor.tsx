import React, { useState, useRef, useEffect } from 'react';
import { PreparedLyric, TimedLyric } from '../types';

interface ManualSyncEditorProps {
  audioUrl: string;
  lyrics: PreparedLyric[];
  onSyncComplete: (timedLyrics: TimedLyric[]) => void;
  onCancel: () => void;
}

const ManualSyncEditor: React.FC<ManualSyncEditorProps> = ({
  audioUrl,
  lyrics,
  onSyncComplete,
  onCancel
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [timedLyrics, setTimedLyrics] = useState<TimedLyric[]>([]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentLyricIndex < lyrics.length) {
          markLyricTime();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        undoLastMark();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentLyricIndex, lyrics.length]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const markLyricTime = () => {
    if (currentLyricIndex >= lyrics.length) return;

    // More accurate timing with better duration estimation
    const lyricLength = lyrics[currentLyricIndex].line.length;
    const wordCount = lyrics[currentLyricIndex].line.split(' ').length;
    const estimatedDuration = Math.max(1.5, Math.min(6, wordCount * 0.6 + lyricLength * 0.02));

    const newTimedLyric: TimedLyric = {
      ...lyrics[currentLyricIndex],
      startTime: Math.round(currentTime * 10) / 10, // Round to 0.1s precision
      endTime: Math.round((currentTime + estimatedDuration) * 10) / 10
    };

    setTimedLyrics(prev => [...prev, newTimedLyric]);
    setCurrentLyricIndex(prev => prev + 1);
  };

  const undoLastMark = () => {
    if (timedLyrics.length === 0) return;
    
    setTimedLyrics(prev => prev.slice(0, -1));
    setCurrentLyricIndex(prev => prev - 1);
  };

  const handleComplete = () => {
    if (timedLyrics.length === lyrics.length) {
      onSyncComplete(timedLyrics);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold gradient-text mb-4">Manual Sync</h2>
        <p className="text-xl text-gray-300 mb-4">Play the audio and mark when each lyric line starts</p>
        <div className="flex justify-center gap-6 text-sm text-gray-400 mb-4">
          <span>⏯️ <kbd className="bg-gray-700 px-2 py-1 rounded">Enter</kbd> Play/Pause</span>
          <span>✅ <kbd className="bg-gray-700 px-2 py-1 rounded">Space</kbd> Mark Lyric</span>
          <span>↩️ <kbd className="bg-gray-700 px-2 py-1 rounded">Backspace</kbd> Undo</span>
        </div>
        <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full"></div>
      </div>
      
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-center gap-6 mb-6">
          <button onClick={togglePlayPause} className="btn btn-primary px-8 py-4 text-lg">
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <div className="text-2xl font-mono text-cyan-400 font-bold">
            {formatTime(currentTime)}
          </div>
          <button onClick={undoLastMark} disabled={timedLyrics.length === 0} className="btn btn-secondary">
            ↶ Undo
          </button>
        </div>

        <div className="progress-bar mb-4">
          <div className="progress-fill" style={{width: `${(timedLyrics.length / lyrics.length) * 100}%`}}></div>
        </div>
        <div className="text-center text-gray-300">
          <span className="text-lg font-semibold">{timedLyrics.length}</span> / <span className="text-lg">{lyrics.length}</span> lyrics synced
        </div>
      </div>

      {currentLyricIndex < lyrics.length && (
        <div className="glass-card p-8 mb-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Current Lyric</h3>
          <p className="text-3xl font-bold gradient-text mb-6">{lyrics[currentLyricIndex].line}</p>
          <button onClick={markLyricTime} className="btn btn-primary text-xl px-8 py-4 animate-glow">
            ✓ Mark at {formatTime(currentTime)}
          </button>
        </div>
      )}

      <div className="glass-card p-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">Synced Lyrics</h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {timedLyrics.map((lyric, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <span className="text-cyan-400 font-mono font-bold min-w-[60px]">{formatTime(lyric.startTime)}</span>
              <span className="text-white">{lyric.line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button onClick={onCancel} className="btn btn-secondary px-8 py-3">
          Cancel
        </button>
        <button 
          onClick={handleComplete} 
          disabled={timedLyrics.length !== lyrics.length}
          className="btn btn-primary px-8 py-3 text-lg font-bold"
        >
          ✓ Complete Sync
        </button>
      </div>


    </div>
  );
};

export default ManualSyncEditor;
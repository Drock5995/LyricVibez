import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimedLyric } from '../types';
import { PlayIcon, PauseIcon, BackIcon } from './icons';

interface TimelineEditorProps {
  audioUrl: string;
  initialLyrics: TimedLyric[];
  onComplete: (timedLyrics: TimedLyric[]) => void;
  onBack: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ audioUrl, initialLyrics, onComplete, onBack }) => {
  const [lyrics, setLyrics] = useState<TimedLyric[]>(initialLyrics);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(100); // Pixels per second - higher default for better precision

  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  const [dragging, setDragging] = useState<{index: number, type: 'start' | 'end' | 'block', initialX: number, initialTime: number} | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);
  
  const handleMouseDown = (e: React.MouseEvent, index: number, type: 'start' | 'end' | 'block') => {
    e.stopPropagation();
    const initialTime = type === 'end' ? lyrics[index].endTime : lyrics[index].startTime;
    setDragging({ index, type, initialX: e.clientX, initialTime });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    
    const dx = e.clientX - dragging.initialX;
    const deltaTime = dx / zoom;
    const newTime = Math.max(0, dragging.initialTime + deltaTime);

    setLyrics(prevLyrics => {
        const newLyrics = [...prevLyrics];
        const lyric = { ...newLyrics[dragging.index] };

        if (dragging.type === 'block') {
            const duration = lyric.endTime - lyric.startTime;
            lyric.startTime = newTime;
            lyric.endTime = newTime + duration;
        } else if (dragging.type === 'start') {
            lyric.startTime = Math.min(newTime, lyric.endTime - 0.1);
        } else { // 'end'
            lyric.endTime = Math.max(newTime, lyric.startTime + 0.1);
        }

        // Prevent overlap with neighbors
        const prevLyric = newLyrics[dragging.index - 1];
        const nextLyric = newLyrics[dragging.index + 1];
        if (prevLyric && lyric.startTime < prevLyric.endTime) {
            lyric.startTime = prevLyric.endTime;
        }
        if (nextLyric && lyric.endTime > nextLyric.startTime) {
            lyric.endTime = nextLyric.startTime;
        }

        newLyrics[dragging.index] = lyric;
        return newLyrics;
    });

  }, [dragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);


  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };
  
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toFixed(1).padStart(4, '0')}`;

  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-4 text-center animate-fade-in">
        <audio ref={audioRef} src={audioUrl}></audio>
        <div className="w-full relative">
            <button onClick={onBack} className="absolute top-0 left-0 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-10">
                <BackIcon className="w-5 h-5"/> Back
            </button>
            <h2 className="text-3xl font-bold text-cyan-300">Fine-Tune Timeline</h2>
            <p className="text-gray-400 mt-1">Drag the blocks to adjust the start and end times for each lyric.</p>
        </div>

        <div className="w-full p-4 glass-panel flex items-center justify-center gap-4">
             <button onClick={togglePlayPause} className="p-3 bg-cyan-500/80 rounded-full text-white hover:bg-cyan-500 transition-colors shadow-[0_0_15px] shadow-cyan-500/30">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <span className="font-mono text-lg text-gray-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <div className="flex-grow"></div>
            <label className="text-sm text-gray-400">Zoom:</label>
            <input type="range" min="20" max="400" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-32 accent-cyan-500"/>
            <button 
              onClick={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = Math.max(0, audio.currentTime - 5);
                }
              }}
              className="btn btn-secondary text-sm px-3 py-1"
            >
              -5s
            </button>
            <button 
              onClick={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = Math.min(duration, audio.currentTime + 5);
                }
              }}
              className="btn btn-secondary text-sm px-3 py-1"
            >
              +5s
            </button>
        </div>

        <div ref={timelineContainerRef} className="w-full h-96 overflow-x-auto bg-gray-900/70 rounded-2xl p-4 relative border border-gray-700">
            <div className="relative" style={{ width: duration * zoom, height: '100%' }}>
                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_10px] shadow-red-500" style={{ left: currentTime * zoom }}></div>
                
                {/* Timeline markers */}
                {Array.from({ length: Math.floor(duration) }, (_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 text-xs text-gray-500" style={{left: i * zoom}}>
                       <div className="w-px h-full bg-gray-700/50"></div>
                       <span className="absolute -top-4">{formatTime(i)}</span>
                    </div>
                ))}

                {lyrics.map((lyric, index) => {
                    const left = lyric.startTime * zoom;
                    const width = (lyric.endTime - lyric.startTime) * zoom;
                    const isChorus = lyric.section === 'chorus';
                    const bgColor = isChorus 
                        ? 'from-pink-500/80 to-purple-500/80' 
                        : 'from-blue-500/80 to-cyan-500/80';
                    return (
                        <div
                            key={index}
                            className={`absolute h-10 top-1/2 -mt-5 px-2 rounded-lg flex items-center justify-between text-white select-none shadow-lg whitespace-nowrap overflow-hidden bg-gradient-to-r ${bgColor}`}
                            style={{ left, width, minWidth: 20 }}
                            onMouseDown={(e) => handleMouseDown(e, index, 'block')}
                        >
                            <div onMouseDown={(e) => handleMouseDown(e, index, 'start')} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 transition-colors"></div>
                            <span className="text-sm pointer-events-none px-2 font-medium" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>{lyric.line}</span>
                            <div onMouseDown={(e) => handleMouseDown(e, index, 'end')} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 transition-colors"></div>
                        </div>
                    )
                })}
            </div>
        </div>

        <button onClick={() => onComplete(lyrics)} className="w-full mt-4 btn bg-green-600 hover:bg-green-500 text-lg">
            Finish & Generate Video
        </button>
    </div>
  );
};
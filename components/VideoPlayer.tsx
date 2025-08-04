

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimedLyric, Theme, AspectRatio } from '../types';
import { PlayIcon, PauseIcon, ReplayIcon, DownloadIcon, ExternalLinkIcon, EditIcon, CheckIcon, XIcon } from './icons';

interface VideoPlayerProps {
  audioUrl: string;
  lyricsData: TimedLyric[];
  backgroundImages: Record<string, string>; // section -> base64
  onReset: () => void;
  aspectRatio: AspectRatio;
  theme: Theme;
}

type Particle = { id: number; x: number; y: number; vx: number; vy: number; opacity: number; char: string; size: number; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const INTRO_ANIMATION_DURATION = 0.5; // seconds

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ audioUrl, lyricsData, backgroundImages, onReset, aspectRatio, theme }) => {
  // Initialize editing lyrics with the provided data
  useEffect(() => {
    setEditingLyrics(lyricsData);
  }, [lyricsData]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [editingLyrics, setEditingLyrics] = useState<TimedLyric[]>(lyricsData);
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [spacebarEditMode, setSpacebarEditMode] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);

  // Export-related state
  const [isRecording, setIsRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Animation State
  const [particles, setParticles] = useState<Particle[]>([]);
  const [watermarkParams, setWatermarkParams] = useState({ x: 0, y: 0, angle: 0 });
  const [kenBurnsParams, setKenBurnsParams] = useState({ startZoom: 1, endZoom: 1.15, startX: 0, startY: 0, endX: 0, endY: 0 });
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRefs = useRef<Record<string, HTMLImageElement>>({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const frameCountRef = useRef(0);
  const lastLineIndexRef = useRef(-1);
  const lastSectionRef = useRef('');
  const bgFadeTimeRef = useRef(0);
  const lyricIntroTimeRef = useRef(0);
  const nextParticleId = useRef(0);

  const isPortrait = aspectRatio === '9:16';
  const canvasWidth = isPortrait ? 720 : 1280;
  const canvasHeight = isPortrait ? 1280 : 720;

  // Preload all background images and watermark
  useEffect(() => {
    Object.entries(backgroundImages).forEach(([imageKey, src]) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `data:image/jpeg;base64,${src}`;
      img.onload = () => {
        bgImageRefs.current[imageKey] = img;
      };
    });
    
    // Load watermark image
    const watermarkImg = new Image();
    watermarkImg.src = '/LyricVibez_watermark_compressed.png';
    watermarkImg.onload = () => {
      watermarkImageRef.current = watermarkImg;
    };
  }, [backgroundImages]);

  // Initialize random parameters on mount
  useEffect(() => {
    setKenBurnsParams({
      startZoom: 1, endZoom: 1.15,
      startX: (Math.random() - 0.5) * 0.5, startY: (Math.random() - 0.5) * 0.5,
      endX: (Math.random() - 0.5) * 0.5, endY: (Math.random() - 0.5) * 0.5,
    });
    
    const updateWatermarkPosition = () => {
      const randomAngle = (Math.random() * 40) - 20;
      const randomX = Math.random() * 0.6 + 0.2;
      const isTop = Math.random() < 0.5;
      const randomY = isTop ? Math.random() * 0.2 + 0.1 : Math.random() * 0.2 + 0.7;
      setWatermarkParams({ x: randomX, y: randomY, angle: randomAngle });
    };
    
    updateWatermarkPosition(); // Initial position
    
    const interval = setInterval(updateWatermarkPosition, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const drawCanvas = useCallback((time: number, duration: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    frameCountRef.current++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Find current lyric and section ---
    const currentLineIndex = editingLyrics.findIndex(l => time >= l.startTime && time < l.endTime);
    const currentLine = currentLineIndex > -1 ? editingLyrics[currentLineIndex] : null;
    const currentSection = currentLine?.section || lastSectionRef.current || editingLyrics[0]?.section || 'verse';

    // --- Background Drawing with intelligent transitions ---
    const sectionLyrics = editingLyrics.filter(l => l.section === currentSection);
    const sectionProgress = currentLine && sectionLyrics.length > 0 ? 
        sectionLyrics.findIndex(l => l === currentLine) / Math.max(1, sectionLyrics.length - 1) : 0;
    
    // Get available images for current section
    const availableImages = Object.keys(bgImageRefs.current)
        .filter(key => key.startsWith(currentSection + '_'))
        .sort();
    
    // Smart image selection based on section progress and emotional intensity
    let imageIndex = 0;
    if (availableImages.length > 1) {
        if (currentSection === 'chorus') {
            // Chorus: transition at 1/3 and 2/3 points
            imageIndex = sectionProgress < 0.33 ? 0 : sectionProgress < 0.67 ? 1 : 2;
        } else {
            // Other sections: transition at midpoint
            imageIndex = sectionProgress < 0.5 ? 0 : 1;
        }
        imageIndex = Math.min(imageIndex, availableImages.length - 1);
    }
    
    const currentImageKey = availableImages[imageIndex] || `${currentSection}_0`;
    const bgImage = bgImageRefs.current[currentImageKey] || bgImageRefs.current[currentSection];
    const lastBgImage = bgImageRefs.current[lastSectionRef.current + '_0'] || bgImageRefs.current[lastSectionRef.current];
    // Track both section changes and image changes within sections
    const lastImageKey = `${lastSectionRef.current}_${Math.floor((lastLineIndexRef.current >= 0 ? 
        editingLyrics.filter(l => l.section === lastSectionRef.current).findIndex(l => l === editingLyrics[lastLineIndexRef.current]) / 
        Math.max(1, editingLyrics.filter(l => l.section === lastSectionRef.current).length - 1) : 0) * 
        (Object.keys(bgImageRefs.current).filter(key => key.startsWith(lastSectionRef.current + '_')).length || 1))}`;
    
    if (currentSection !== lastSectionRef.current || currentImageKey !== lastImageKey) {
        bgFadeTimeRef.current = time;
        lastSectionRef.current = currentSection;
    }
    

    const bgFadeProgress = Math.min((time - bgFadeTimeRef.current) / 1.0, 1);
    
    [lastBgImage, bgImage].forEach((img, index) => {
        if (!img) return;
        ctx.save();
        if (index === 0) ctx.globalAlpha = 1 - bgFadeProgress;
        if (index === 1) ctx.globalAlpha = bgFadeProgress;
        
        if (ctx.globalAlpha > 0) {
            ctx.save();
            const bgAnimProgress = duration > 0 ? Math.min(time / duration, 1) : 0;
            let zoom = lerp(kenBurnsParams.startZoom, kenBurnsParams.endZoom, bgAnimProgress);
            let x = lerp(kenBurnsParams.startX, kenBurnsParams.endX, bgAnimProgress);
            let y = lerp(kenBurnsParams.startY, kenBurnsParams.endY, bgAnimProgress);
            
            // Theme-specific background animations
            switch (theme) {
                case 'rock':
                    // Aggressive beat pump - simulates heavy metal rhythm
                    const rockBeatInterval = 0.4; // Fast rock beat
                    const rockBeatPhase = (time % rockBeatInterval) / rockBeatInterval;
                    const rockBump = rockBeatPhase < 0.15 ? (1 - rockBeatPhase / 0.15) * 0.12 : 0;
                    zoom *= (1 + rockBump);
                    // Intense shake effect
                    x += Math.sin(time * 2.5) * 0.008;
                    y += Math.cos(time * 2.8) * 0.008;
                    break;
                case 'country':
                    // Slow, natural drift like wind through fields
                    zoom *= 1 + Math.sin(time * 0.2) * 0.015;
                    x += Math.sin(time * 0.15) * 0.008;
                    y += Math.cos(time * 0.12) * 0.006;
                    break;
                case 'chill':
                    // Gentle floating motion
                    zoom *= 1 + Math.sin(time * 0.1) * 0.01;
                    x += Math.sin(time * 0.08) * 0.003;
                    y += Math.cos(time * 0.06) * 0.003;
                    break;
                case 'underground':
                    // Beat bump effect - simulates 120 BPM
                    const beatInterval = 0.5; // 120 BPM = 2 beats per second
                    const beatPhase = (time % beatInterval) / beatInterval;
                    // Sharp bump that quickly fades
                    const beatBump = beatPhase < 0.1 ? (1 - beatPhase / 0.1) * 0.08 : 0;
                    zoom *= (1 + beatBump);
                    // Subtle drift
                    x += Math.sin(time * 0.3) * 0.005;
                    y += Math.cos(time * 0.25) * 0.005;
                    break;
            }

            const imgAspect = img.width / img.height;
            const canvasAspect = canvas.width / canvas.height;
            let sWidth = img.width, sHeight = img.height;
            if (imgAspect > canvasAspect) { sWidth = sHeight * canvasAspect; } else { sHeight = sWidth / canvasAspect; }
            sWidth /= zoom; sHeight /= zoom;
            ctx.drawImage(img, (img.width - sWidth) * (0.5 + x), (img.height - sHeight) * (0.5 + y), sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        ctx.restore();
    });

    // --- Theme Overlays ---
    ctx.save();
    switch (theme) {
        case 'rock':
            // Lightning/electric effects
            if (Math.random() > 0.92) {
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                const startX = Math.random() * canvas.width;
                ctx.moveTo(startX, 0);
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(startX + (Math.random() - 0.5) * 100, (i + 1) * canvas.height / 5);
                }
                ctx.stroke();
            }
            // Sparks and embers
            ctx.globalAlpha = 0.2;
            for (let i = 0; i < 15; i++) {
                const sparkX = Math.random() * canvas.width;
                const sparkY = Math.random() * canvas.height;
                const sparkSize = Math.random() * 3 + 1;
                ctx.fillStyle = Math.random() > 0.5 ? '#ff4500' : '#ffff00';
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'country':
            // Warm dust particles floating
            ctx.globalAlpha = 0.1;
            for (let i = 0; i < 20; i++) {
                const dustX = (Math.sin(time * 0.1 + i) * 0.3 + 0.5) * canvas.width;
                const dustY = (Math.cos(time * 0.08 + i * 0.5) * 0.4 + 0.5) * canvas.height;
                const dustSize = Math.sin(time * 0.2 + i) * 2 + 3;
                ctx.fillStyle = 'rgba(255, 220, 180, 0.6)';
                ctx.beginPath();
                ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
                ctx.fill();
            }
            // Subtle vignette
            const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(101, 67, 33, 0.15)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        case 'chill':
            // Soft floating particles
            ctx.globalAlpha = 0.08;
            for (let i = 0; i < 25; i++) {
                const particleX = (Math.sin(time * 0.05 + i) * 0.4 + 0.5) * canvas.width;
                const particleY = (Math.cos(time * 0.03 + i * 0.7) * 0.3 + 0.5) * canvas.height;
                const particleSize = Math.sin(time * 0.1 + i) * 4 + 6;
                const hue = (time * 10 + i * 30) % 360;
                ctx.fillStyle = `hsla(${hue}, 60%, 80%, 0.3)`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
            // Soft gradient overlay
            const chillGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            chillGradient.addColorStop(0, 'rgba(173, 216, 230, 0.05)');
            chillGradient.addColorStop(1, 'rgba(255, 182, 193, 0.05)');
            ctx.fillStyle = chillGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        case 'underground':
            // VHS distortion lines
            ctx.globalAlpha = 0.15;
            for (let i = 0; i < 8; i++) {
                const y = Math.random() * canvas.height;
                const height = Math.random() * 3 + 1;
                ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff' : '#00ffff';
                ctx.fillRect(0, y, canvas.width, height);
            }
            // Digital noise
            ctx.globalAlpha = 0.08;
            for (let i = 0; i < 3000; i++) {
                ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, ${Math.random()})`;
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
            }
            // Glitch effect
            if (Math.random() > 0.95) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 2);
            }
            break;
    }
    ctx.restore();

    // Darkening overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Particle System ---
    if (currentLine?.glyph && currentLineIndex !== lastLineIndexRef.current) {
        for (let i = 0; i < 5; i++) {
            setParticles(p => [...p, {
                id: nextParticleId.current++,
                x: canvas.width * (Math.random() * 0.6 + 0.2),
                y: canvas.height * 0.6,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 1.5 - 0.5,
                opacity: 1,
                char: currentLine.glyph!,
                size: (canvas.width / 40) * (Math.random() * 0.5 + 0.75),
            }]);
        }
    }
    ctx.save();
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.opacity -= 0.01;
        if (p.opacity <= 0) {
            setParticles(all => all.filter(particle => particle.id !== p.id));
            return;
        }
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#fff';
        ctx.font = `${p.size}px sans-serif`;
        ctx.fillText(p.char, p.x, p.y);
    });
    ctx.restore();
    
    // --- Lyric Drawing ---
    if (currentLineIndex !== lastLineIndexRef.current) lyricIntroTimeRef.current = time;
    lastLineIndexRef.current = currentLineIndex;

    if (currentLine) {
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // Font selection based on theme
        let fontName = `900 ${canvas.width / 18}px Inter, sans-serif`;
        let baseFill = '#fff', highlightFill = '#00FFFF';
        switch (theme) {
            case 'rock': fontName = `900 ${canvas.width / 14}px "Impact", sans-serif`; baseFill = '#E0E0E0'; highlightFill = '#FF4500'; break;
            case 'country': fontName = `800 ${canvas.width / 16}px "Georgia", serif`; baseFill = '#F5E6D3'; highlightFill = '#FFD700'; break;
            case 'chill': fontName = `300 ${canvas.width / 18}px "Poppins", sans-serif`; baseFill = 'rgba(255,255,255,0.8)'; highlightFill = '#87CEEB'; break;
        }
        ctx.font = fontName;

        const text = currentLine.line;
        const words = text.split(' ');
        const maxWidth = canvas.width * 0.9;
        let lines: string[] = []; let currentTextLine = words[0] || '';
        for (let i = 1; i < words.length; i++) {
            if (ctx.measureText(currentTextLine + " " + words[i]).width < maxWidth) { currentTextLine += " " + words[i]; } 
            else { lines.push(currentTextLine); currentTextLine = words[i]; }
        }
        lines.push(currentTextLine);

        const lineHeight = (canvas.width / 20) * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const startY = (canvas.height / 2) - (totalTextHeight / 2) + (lineHeight / 2);
        
        const introProgress = Math.min((time - lyricIntroTimeRef.current) / INTRO_ANIMATION_DURATION, 1);
        ctx.save();
        
        // Lyric Intro Animation
        switch(theme) {
            case 'rock': // Explosive entrance
                if (introProgress < 1) {
                    ctx.translate((Math.random()-0.5)*8, (Math.random()-0.5)*8);
                }
                ctx.globalAlpha = introProgress;
                ctx.translate(canvas.width / 2, startY);
                ctx.scale(lerp(1.3, 1, introProgress), lerp(1.3, 1, introProgress));
                ctx.translate(-canvas.width / 2, -startY);
                break;
            case 'country': // Gentle fade with slight scale
                ctx.globalAlpha = introProgress;
                ctx.translate(canvas.width / 2, startY);
                ctx.scale(lerp(1.05, 1, introProgress), lerp(1.05, 1, introProgress));
                ctx.translate(-canvas.width / 2, -startY);
                break;
            case 'chill': // Soft float in
                ctx.globalAlpha = introProgress;
                ctx.translate(0, lerp(30, 0, introProgress));
                ctx.translate(canvas.width / 2, startY);
                ctx.scale(lerp(0.9, 1, introProgress), lerp(0.9, 1, introProgress));
                ctx.translate(-canvas.width / 2, -startY);
                break;
            case 'underground': // Glitch in
                if (introProgress < 1) {
                    ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
                    if (Math.random() > 0.5) {
                        ctx.fillStyle = '#FF00FF';
                        ctx.fillText(text, canvas.width/2 + 5, startY + 5);
                    }
                }
                ctx.globalAlpha = introProgress > 0.2 ? 1 : 0;
                break;
            case 'default': // Slide up
                ctx.globalAlpha = introProgress;
                ctx.translate(0, lerp(20, 0, introProgress));
                break;
        }

        const lyricDuration = currentLine.endTime - currentLine.startTime;
        const lyricProgress = lyricDuration > 0 ? Math.min(1, (time - currentLine.startTime) / lyricDuration) : 1;
        
        for (let i = 0; i < lines.length; i++) {
            const yPos = startY + (i * lineHeight);
            const lineText = lines[i];

            // Base text style
            ctx.save();
            ctx.fillStyle = baseFill;
            ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
            if (theme === 'rock') { ctx.shadowColor = '#000'; ctx.shadowBlur = 15; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeText(lineText, canvas.width / 2, yPos); }
            if (theme === 'country') { ctx.shadowColor = 'rgba(101, 67, 33, 0.8)'; ctx.shadowBlur = 8; }
            if (theme === 'chill') { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; }
            ctx.fillText(lineText, canvas.width / 2, yPos);
            ctx.restore();
            
            // Karaoke highlight
            const textMetrics = ctx.measureText(lineText);
            const highlightWidth = textMetrics.width * lyricProgress;
            ctx.save();
            ctx.beginPath();
            ctx.rect(canvas.width/2 - textMetrics.width/2, yPos - lineHeight/2, highlightWidth, lineHeight);
            ctx.clip();
            ctx.fillStyle = highlightFill;
            ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
            if (theme === 'rock') { ctx.shadowColor = highlightFill; ctx.shadowBlur = 20; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeText(lineText, canvas.width / 2, yPos); }
            if (theme === 'country') { ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'; ctx.shadowBlur = 15; }
            if (theme === 'chill') { ctx.shadowColor = 'rgba(135, 206, 235, 0.8)'; ctx.shadowBlur = 12; }
            ctx.fillText(lineText, canvas.width / 2, yPos);
            ctx.restore();
        }
        ctx.restore(); // Restore from intro animation
        ctx.restore(); // Restore from main save
    }
    
    // Watermark Drawing
    ctx.save();
    const watermarkImg = watermarkImageRef.current;
    if (watermarkImg) {
      const { x, y, angle } = watermarkParams;
      const watermarkSize = canvas.width / 4.2; // Made 20% bigger
      ctx.globalAlpha = 0.7; // Make it transparent
      ctx.translate(canvas.width * x, canvas.height * y);
      ctx.rotate(angle * Math.PI / 180);
      ctx.drawImage(watermarkImg, -watermarkSize/2, -watermarkSize/2, watermarkSize, watermarkSize);
    }
    ctx.restore();

  }, [editingLyrics, canvasHeight, canvasWidth, kenBurnsParams, watermarkParams, particles, theme]);

  // Main animation loop
  useEffect(() => {
    let frameId: number;
    const tick = () => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        drawCanvas(time, songDuration);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [drawCanvas, songDuration]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => { if (audio.duration && !isNaN(audio.duration)) setSongDuration(audio.duration); };
    const handleSongEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioUrl]);

  // Keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickEditMode(false);
        setSpacebarEditMode(false);
        setCurrentEditIndex(0);
      }
      
      if (quickEditMode && e.key === ' ') {
        e.preventDefault();
        if (!audioRef.current) return;
        
        const currentTime = audioRef.current.currentTime;
        const currentLineIndex = editingLyrics.findIndex(l => currentTime >= l.startTime && currentTime < l.endTime);
        
        if (currentLineIndex >= 0) {
          setEditingLyrics(prev => prev.map((lyric, i) => {
            if (i === currentLineIndex) {
              return { ...lyric, startTime: currentTime };
            }
            if (i === currentLineIndex - 1) {
              return { ...lyric, endTime: currentTime };
            }
            return lyric;
          }));
        }
      }
      
      if (spacebarEditMode && e.key === ' ') {
        e.preventDefault();
        if (!audioRef.current || currentEditIndex >= editingLyrics.length) return;
        
        const currentTime = audioRef.current.currentTime - 0.2; // Reaction time offset
        
        setEditingLyrics(prev => prev.map((lyric, i) => {
          if (i === currentEditIndex) {
            return { ...lyric, startTime: Math.max(0, currentTime) };
          }
          if (i === currentEditIndex - 1) {
            return { ...lyric, endTime: Math.max(0, currentTime) };
          }
          return lyric;
        }));
        
        setCurrentEditIndex(prev => prev + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickEditMode, spacebarEditMode, editingLyrics, currentEditIndex]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(e => console.error("Playback failed:", e));
    }
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = parseFloat(e.target.value);
  };
  
  const handleStartExport = () => {
    setExportError(null); setDownloadUrl(null);
    const canvas = canvasRef.current; const audio = audioRef.current;
    if (!canvas || !audio || !('captureStream' in canvas) || !('captureStream' in audio)) {
      setExportError("Video export is not supported by your browser."); return;
    }
    setIsRecording(true);
    const recordedChunks: Blob[] = [];
    const videoStream = canvas.captureStream(30);
    const audioStream = (audio as any).captureStream();
    const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9,opus' });
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      } catch (e2) {
         setExportError("Video export failed. Your browser may not support WebM recording."); setIsRecording(false); return;
      }
    }
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
    mediaRecorder.onstop = () => {
        setDownloadUrl(URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' })));
        setIsRecording(false);
        combinedStream.getTracks().forEach(track => track.stop());
    };
    const onRecordEnd = () => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); };
    audio.addEventListener('ended', onRecordEnd, { once: true });
    
    const startAndRecord = () => {
        audio.play().then(() => mediaRecorder?.start()).catch(err => {
            setExportError("Export failed: Could not start audio playback."); setIsRecording(false);
        });
    };
    const seekAndStart = () => { audio.removeEventListener('seeked', seekAndStart); startAndRecord(); };
    audio.pause();
    if (audio.currentTime === 0) startAndRecord();
    else { audio.addEventListener('seeked', seekAndStart, { once: true }); audio.currentTime = 0; }
  };

  const handleServerExport = async () => {
    setExportError(null);
    setDownloadUrl(null);
    setIsGeneratingVideo(true);
    
    try {
      // Convert audio URL to blob
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.mp3');
      formData.append('data', JSON.stringify({
        lyrics: JSON.stringify(editingLyrics),
        theme,
        aspectRatio,
        backgroundImages: JSON.stringify(backgroundImages)
      }));
      
      const response = await fetch('/generate-video', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      } else {
        let errorMessage = 'Server export failed';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        setExportError(errorMessage);
      }
    } catch (error) {
      setExportError('Network error: ' + (error as Error).message);
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  
  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateLyricTiming = (index: number, field: 'startTime' | 'endTime', value: number) => {
    setEditingLyrics(prev => prev.map((lyric, i) => 
      i === index ? { ...lyric, [field]: value } : lyric
    ));
  };

  const jumpToLyric = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  };

  const handleCanvasClick = useCallback(() => {
    if (!quickEditMode || !audioRef.current) return;
    
    const currentTime = audioRef.current.currentTime;
    const currentLineIndex = editingLyrics.findIndex(l => currentTime >= l.startTime && currentTime < l.endTime);
    
    if (currentLineIndex >= 0) {
      // Update the current line's start time
      setEditingLyrics(prev => prev.map((lyric, i) => {
        if (i === currentLineIndex) {
          return { ...lyric, startTime: currentTime };
        }
        if (i === currentLineIndex - 1) {
          // Update previous line's end time
          return { ...lyric, endTime: currentTime };
        }
        return lyric;
      }));
    }
  }, [quickEditMode, editingLyrics]);

  return (
    <div className={`w-full ${isPortrait ? 'max-w-sm' : 'max-w-4xl'} flex flex-col items-center gap-4 animate-fade-in`}>
        <div className={`w-full rounded-2xl shadow-2xl overflow-hidden relative bg-black border border-gray-700 ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'} ${quickEditMode ? 'cursor-crosshair' : ''}`}>
            <canvas 
                ref={canvasRef} 
                width={canvasWidth} 
                height={canvasHeight} 
                className="w-full h-full" 
                onClick={handleCanvasClick}
            ></canvas>
            {quickEditMode && (
                <div className="absolute top-2 left-2 bg-yellow-600/90 text-white px-3 py-1 rounded text-sm font-medium">
                    Click or SPACE to set timing • ESC to exit
                </div>
            )}
            {spacebarEditMode && (
                <div className="absolute top-2 left-2 bg-green-600/90 text-white px-3 py-1 rounded text-sm font-medium">
                    SPACE for next lyric ({currentEditIndex + 1}/{editingLyrics.length}) • ESC to exit
                </div>
            )}
            {spacebarEditMode && currentEditIndex < editingLyrics.length && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white p-3 rounded text-center">
                    <p className="text-lg font-semibold">{editingLyrics[currentEditIndex]?.line}</p>
                    <p className="text-sm text-gray-300 mt-1">Press SPACE when this lyric starts</p>
                </div>
            )}
            {spacebarEditMode && currentEditIndex >= editingLyrics.length && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center text-white">
                        <p className="text-2xl font-bold text-green-400 mb-2">All lyrics synced!</p>
                        <button 
                            onClick={() => {
                                setSpacebarEditMode(false);
                                setCurrentEditIndex(0);
                            }}
                            className="btn bg-green-600 hover:bg-green-500"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
            <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
        </div>
        <div className="w-full p-4 glass-panel flex items-center gap-4">
            <button onClick={togglePlayPause} disabled={isRecording} className="p-3 bg-cyan-500/80 rounded-full text-white hover:bg-cyan-500 transition-colors disabled:bg-gray-500 shadow-[0_0_15px] shadow-cyan-500/30">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <span className="text-sm text-gray-300 font-mono">{formatTime(currentTime)}</span>
            <input type="range" min="0" max={songDuration || 100} value={currentTime} onChange={handleSeek} disabled={isRecording} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:accent-gray-500" />
            <span className="text-sm text-gray-300 font-mono">{formatTime(songDuration)}</span>
        </div>
        <div className="w-full p-4 glass-panel flex flex-col sm:flex-row items-center justify-center gap-4">
          {downloadUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <a href={downloadUrl} download={downloadUrl.includes('video_') ? "lyric-video.mp4" : "lyric-video.webm"} className="btn bg-green-600 hover:bg-green-500 text-lg">
                    <DownloadIcon className="w-6 h-6 mr-2"/> Download Video {downloadUrl.includes('video_') ? '(.mp4)' : '(.webm)'}
                </a>
                {!downloadUrl.includes('video_') && (
                    <a href="https://convertio.co/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
                        <ExternalLinkIcon className="w-4 h-4 mr-2"/> Convert to MP4
                    </a>
                )}
             </div>
          ) : (
             <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleServerExport} disabled={isRecording || isGeneratingVideo} className="btn bg-purple-600 hover:bg-purple-500 text-lg">
                    {isGeneratingVideo ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            Generating MP4...
                        </>
                    ) : 'Generate MP4 Video'}
                </button>
                <button onClick={handleStartExport} disabled={isRecording || isGeneratingVideo} className="btn btn-secondary text-lg">
                    {isRecording ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            Recording...
                        </>
                    ) : 'Quick Export (WebM)'}
                </button>
             </div>
          )}
          {exportError && <p className="text-sm text-red-400 text-center">{exportError}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button 
                onClick={() => setQuickEditMode(!quickEditMode)} 
                className={`flex items-center gap-2 transition-colors ${
                    quickEditMode ? 'text-yellow-300 bg-yellow-600/20 px-3 py-1 rounded' : 'text-yellow-400 hover:text-yellow-300'
                }`}
            >
                <EditIcon className="w-5 h-5"/> {quickEditMode ? 'Exit Quick Edit' : 'Quick Edit'}
            </button>
            <button 
                onClick={() => {
                    setSpacebarEditMode(!spacebarEditMode);
                    setCurrentEditIndex(0);
                    if (!spacebarEditMode && audioRef.current) {
                        audioRef.current.currentTime = 0;
                    }
                }} 
                className={`flex items-center gap-2 transition-colors text-sm ${
                    spacebarEditMode ? 'text-green-300 bg-green-600/20 px-3 py-1 rounded' : 'text-green-400 hover:text-green-300'
                }`}
            >
                <PlayIcon className="w-4 h-4"/> {spacebarEditMode ? 'Exit Re-sync' : 'Re-sync All'}
            </button>
            <button 
                onClick={() => setShowTimingEditor(!showTimingEditor)} 
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
            >
                <EditIcon className="w-4 h-4"/> {showTimingEditor ? 'Hide' : 'Advanced'} Timing
            </button>
            <button 
                onClick={() => {
                    const randomAngle = (Math.random() * 40) - 20;
                    const randomX = Math.random() * 0.6 + 0.2;
                    const isTop = Math.random() < 0.5;
                    const randomY = isTop ? Math.random() * 0.2 + 0.1 : Math.random() * 0.2 + 0.7;
                    setWatermarkParams({ x: randomX, y: randomY, angle: randomAngle });
                }} 
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
            >
                <ReplayIcon className="w-4 h-4"/> Move Watermark
            </button>
            <button onClick={onReset} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <ReplayIcon className="w-5 h-5"/> Create Another Video
            </button>
        </div>
        
        {showTimingEditor && (
            <div className="w-full mt-4 glass-panel p-4 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-4">Edit Lyric Timing</h3>
                <div className="space-y-3">
                    {editingLyrics.map((lyric, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{lyric.line}</p>
                                <p className="text-xs text-gray-400">{lyric.section}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400">Start</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        value={lyric.startTime.toFixed(1)}
                                        onChange={(e) => updateLyricTiming(index, 'startTime', parseFloat(e.target.value))}
                                        className="w-16 text-xs p-1 bg-gray-700 border border-gray-600 rounded"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400">End</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        value={lyric.endTime.toFixed(1)}
                                        onChange={(e) => updateLyricTiming(index, 'endTime', parseFloat(e.target.value))}
                                        className="w-16 text-xs p-1 bg-gray-700 border border-gray-600 rounded"
                                    />
                                </div>
                                <button 
                                    onClick={() => jumpToLyric(lyric.startTime)}
                                    className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                                    title="Jump to this lyric"
                                >
                                    <PlayIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
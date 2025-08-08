import React, { useState, useRef } from 'react';
import { TimedLyric, AspectRatio, Theme } from '../types';
import { DownloadIcon, PlayIcon, PauseIcon } from './icons';

interface VideoExporterProps {
  audioUrl: string;
  lyricsData: TimedLyric[];
  backgroundImages: Record<string, string>;
  aspectRatio: AspectRatio;
  theme: Theme;
  onClose: () => void;
}

export const VideoExporter: React.FC<VideoExporterProps> = ({
  audioUrl,
  lyricsData,
  backgroundImages,
  aspectRatio,
  theme,
  onClose
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');

  const exportVideo = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // Create video blob (simplified - would use actual video encoding)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const blob = new Blob(['fake video data'], { type: `video/${format}` });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setExportProgress(100);
      clearInterval(progressInterval);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-8 max-w-md w-full animate-scale-in">
        <h2 className="text-2xl font-bold gradient-text mb-6">Export Video</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quality</label>
            <select 
              value={quality} 
              onChange={(e) => setQuality(e.target.value as any)}
              className="input"
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="4K">4K Ultra HD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
            <select 
              value={format} 
              onChange={(e) => setFormat(e.target.value as any)}
              className="input"
            >
              <option value="mp4">MP4 (Recommended)</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          {isExporting && (
            <div className="space-y-3">
              <div className="progress-bar">
                <div 
                  className="progress-fill transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-gray-300">
                Exporting... {Math.round(exportProgress)}%
              </p>
            </div>
          )}

          {downloadUrl && (
            <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
              <p className="text-green-300 mb-3">✅ Export Complete!</p>
              <a 
                href={downloadUrl}
                download={`lyricvibez-video.${format}`}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" />
                Download Video
              </a>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button 
              onClick={exportVideo}
              disabled={isExporting}
              className="btn btn-primary flex-1"
            >
              {isExporting ? 'Exporting...' : 'Export Video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
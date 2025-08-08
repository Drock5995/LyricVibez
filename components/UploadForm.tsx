

import React, { useState } from 'react';
import { UploadIcon, SearchIcon, ExternalLinkIcon, YouTubeIcon, StepOneIcon, StepTwoIcon, StepThreeIcon, StepFourIcon } from './icons';
import { findLyrics } from '../services/geminiService';
import { Theme, AspectRatio } from '../types';

interface UploadFormProps {
  onStartSync: (file: File, lyrics: string, artist: string, theme: Theme, aspectRatio: AspectRatio) => void;
  isLoading: boolean;
}

const Step: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start gap-4 sm:gap-6">
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow">
                {icon}
            </div>
        </div>
        <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-200 mb-3 mt-2">{title}</h3>
            {children}
        </div>
    </div>
);

export const UploadForm: React.FC<UploadFormProps> = ({ onStartSync, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [artist, setArtist] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [theme, setTheme] = useState<Theme>('default');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  
  const [isFindingLyrics, setIsFindingLyrics] = useState(false);
  const [findLyricsError, setFindLyricsError] = useState('');
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if(selectedFile.type.startsWith('audio/')) {
        setFile(selectedFile);
        setFileError('');
      } else {
        setFileError('Please upload a valid audio file (e.g., MP3, WAV).');
        setFile(null);
      }
    }
  };

  const handleFindLyrics = async () => {
    if (!artist.trim() || !songTitle.trim()) {
        setFindLyricsError('Please enter both artist and song title.');
        return;
    }
    setIsFindingLyrics(true);
    setFindLyricsError('');
    setLyrics('');
    try {
        const foundLyrics = await findLyrics(artist, songTitle);
        setLyrics(foundLyrics);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        setFindLyricsError(message);
    } finally {
        setIsFindingLyrics(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (file && lyrics.trim()) {
      onStartSync(file, lyrics, artist, theme, aspectRatio);
    } else {
      setFormError('Please provide an audio file, lyrics, and artist name.');
    }
  };

  const themeOptions: { id: Theme, name: string, description: string }[] = [
    { id: 'default', name: 'Cinematic', description: 'Dramatic, high-impact style with a clean, modern look.' },
    { id: 'rock', name: 'Rock/Metal', description: 'Intense energy with lightning effects, sparks, and bold typography.' },
    { id: 'country', name: 'Country', description: 'Rustic Americana with golden hour lighting and heartland landscapes.' },
    { id: 'chill', name: 'Chill/Relaxing', description: 'Soft pastel colors, floating particles, and peaceful vibes.' },
    { id: 'underground', name: 'Underground', description: 'VHS aesthetic with glitchcore and lo-fi grainy visuals for melancholy moods.' },
  ];

  return (
      <div className="w-full max-w-4xl glass-card p-8 md:p-10 animate-fade-in shadow-glow">
          <form onSubmit={handleSubmit} className="space-y-8">
              <Step icon={<StepOneIcon />} title="Provide Your Audio">
                  <div className="bg-black/20 border border-gray-700/50 rounded-xl p-4 space-y-3">
                      <p className="text-sm text-gray-400">Get your audio file ready (opens new tabs):</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                          <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="flex-1 btn btn-secondary text-sm">
                              <YouTubeIcon className="w-5 h-5 mr-2 text-red-500" />
                              Search on YouTube
                          </a>
                          <a href="https://en.onlymp3.io/convert/GhcMmaUPtrk/" target="_blank" rel="noopener noreferrer" className="flex-1 btn btn-secondary text-sm">
                              <ExternalLinkIcon className="w-4 h-4 mr-2 text-cyan-400" />
                              Convert to MP3
                          </a>
                      </div>
                      <div className="flex items-center gap-4 py-2"><hr className="flex-grow border-gray-700" /><span className="text-gray-500 text-xs">THEN</span><hr className="flex-grow border-gray-700" /></div>
                      <div className="flex justify-center p-6 border-2 border-gray-700 border-dashed rounded-lg bg-black/20 hover:border-cyan-500 transition-colors">
                          <div className="space-y-1 text-center">
                              <UploadIcon className="mx-auto h-10 w-10 text-gray-500"/>
                              <div className="flex text-sm text-gray-400">
                                  <label htmlFor="audio-upload" className="relative cursor-pointer rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none">
                                      <span>Upload the MP3 file</span>
                                      <input id="audio-upload" name="audio-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*"/>
                                  </label>
                              </div>
                              <p className="text-xs text-gray-500">{file ? file.name : 'MP3, WAV, OGG up to 20MB'}</p>
                          </div>
                      </div>
                      {fileError && <p className="text-sm text-red-400 text-center">{fileError}</p>}
                  </div>
              </Step>

              <Step icon={<StepTwoIcon />} title="Provide Artist & Lyrics">
                  <div className="bg-black/20 border border-gray-700/50 rounded-xl p-4">
                      <div className="flex flex-col gap-y-4">
                          {/* AI Finder Section */}
                          <div className="flex flex-col space-y-4">
                              <p className="text-sm font-medium text-gray-300 text-center -mb-2">Find with AI</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <input type="text" placeholder="Artist Name" value={artist} onChange={(e) => setArtist(e.target.value)} required className="input" />
                                  <input type="text" placeholder="Song Title" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="input" />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <button type="button" onClick={handleFindLyrics} disabled={!artist.trim() || !songTitle.trim() || isFindingLyrics} className="btn btn-secondary bg-cyan-900/50 border-cyan-500/50 hover:bg-cyan-900/70 disabled:bg-gray-600 disabled:border-gray-500">
                                      {isFindingLyrics ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <SearchIcon className="w-5 h-5"/>}
                                      <span className="ml-2">{isFindingLyrics ? 'Finding...' : 'Find Lyrics'}</span>
                                  </button>
                                  <a 
                                      href={artist.trim() && songTitle.trim() ? `https://genius.com/search?q=${encodeURIComponent(artist + ' ' + songTitle)}` : '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className={`btn btn-secondary text-sm ${!artist.trim() || !songTitle.trim() ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                      <ExternalLinkIcon className="w-4 h-4 mr-2 text-yellow-400" />
                                      Search Genius
                                  </a>
                              </div>
                              {findLyricsError && <p className="text-sm text-red-400 text-center">{findLyricsError}</p>}
                          </div>
                          
                          {/* "OR" Divider */}
                          <div className="relative flex items-center justify-center">
                              <div className="w-full h-px bg-gray-700"></div>
                              <span className="text-gray-500 text-xs px-2 bg-gray-900 absolute rounded-full">OR</span>
                          </div>

                          {/* Manual Paste Section */}
                          <div className="flex flex-col space-y-2">
                              <p className="text-sm font-medium text-gray-300 text-center -mb-2">Paste Manually</p>
                              <textarea
                                  placeholder="Paste lyrics manually..."
                                  value={lyrics}
                                  onChange={(e) => setLyrics(e.target.value)}
                                  required
                                  rows={12}
                                  className="input resize-none"
                              />
                          </div>
                      </div>
                  </div>
              </Step>
              
              <Step icon={<StepThreeIcon />} title="Choose a Vibe">
                  <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {themeOptions.map(opt => (
                          <label key={opt.id} className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border-2 ${theme === opt.id ? 'border-cyan-400 bg-cyan-900/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}>
                               <input type="radio" name="theme" value={opt.id} className="sr-only" onChange={(e) => setTheme(e.target.value as Theme)} checked={theme === opt.id} />
                               <div className="font-bold text-white text-base">{opt.name}</div>
                               <div className="text-sm text-gray-400">{opt.description}</div>
                               {theme === opt.id && <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-transparent via-transparent to-cyan-500/20"></div>}
                          </label>
                      ))}
                  </div>
              </Step>
              
              <Step icon={<StepFourIcon />} title="Choose Aspect Ratio">
                   <div role="radiogroup" className="flex flex-col sm:flex-row gap-4">
                      <label className={`relative flex-1 p-5 rounded-xl cursor-pointer transition-all duration-200 border-2 ${aspectRatio === '16:9' ? 'border-cyan-400 bg-cyan-900/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}>
                          <input type="radio" name="aspect-ratio" value="16:9" className="sr-only" onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} checked={aspectRatio === '16:9'} />
                          <div>
                            <div className="font-bold text-white">16:9 Widescreen</div>
                            <div className="text-sm text-gray-400">Best for YouTube</div>
                          </div>
                          {aspectRatio === '16:9' && <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-transparent via-transparent to-cyan-500/20"></div>}
                      </label>
                       <label className={`relative flex-1 p-5 rounded-xl cursor-pointer transition-all duration-200 border-2 ${aspectRatio === '9:16' ? 'border-cyan-400 bg-cyan-900/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}>
                          <input type="radio" name="aspect-ratio" value="9:16" className="sr-only" onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} checked={aspectRatio === '9:16'} />
                          <div>
                            <div className="font-bold text-white">9:16 Portrait</div>
                            <div className="text-sm text-gray-400">Best for TikTok, Reels</div>
                          </div>
                          {aspectRatio === '9:16' && <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-transparent via-transparent to-cyan-500/20"></div>}
                      </label>
                  </div>
              </Step>
              
              {formError && <p className="text-sm text-red-400 text-center py-2">{formError}</p>}

              <div>
                  <button type="submit" disabled={!file || !lyrics.trim() || !artist.trim() || isLoading} className="w-full btn btn-primary text-lg py-4 text-xl font-bold animate-glow">
                      {isLoading ? 'Processing...' : 'Create My Video'}
                  </button>
              </div>
          </form>
      </div>
  );
};
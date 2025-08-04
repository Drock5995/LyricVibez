

import React, { useState } from 'react';
import { UploadForm } from './components/UploadForm';
import { VideoPlayer } from './components/VideoPlayer';
import { LyricTimer } from './components/LyricTimer';
import { TimelineEditor } from './components/TimelineEditor';
import { PricingModal } from './components/PricingModal';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { DesktopLayout } from './components/DesktopLayout';
import { prepareLyricLines, generateBackgroundImages } from './services/geminiService';
import { PreparedLyric, TimedLyric, Theme, AspectRatio } from './types';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { TikTokIcon, InfoIcon, CrownIcon } from './components/icons';
import { authService } from './services/authService';
import { useDebounce } from './hooks/useDebounce';

type AppState = 'upload' | 'timing' | 'editing' | 'generating' | 'displaying' | 'error';

const App: React.FC = () => {
  // Core asset state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artist, setArtist] = useState('');
  const [originalLyrics, setOriginalLyrics] = useState('');
  
  // Configuration state
  const [theme, setTheme] = useState<Theme>('default');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');

  // Processed data state
  const [preparedLyrics, setPreparedLyrics] = useState<PreparedLyric[] | null>(null);
  const [timedLyrics, setTimedLyrics] = useState<TimedLyric[] | null>(null);
  const [backgroundImages, setBackgroundImages] = useState<Record<string, string> | null>(null);
  
  // App flow and UI state
  const [appState, setAppState] = useState<AppState>('upload');
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debouncedError = useDebounce(error, 300);
  const [showPricing, setShowPricing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(() => authService.getUser());

  const handleError = (message: string, error?: any) => {
    if (error) console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    setError(`${message} ${errorMessage}`);
    setAppState('error');
  };

  const handleStart = async (file: File, lyrics: string, artistName: string, selectedTheme: Theme, selectedAspectRatio: AspectRatio) => {
    // Check if user is logged in
    if (!user) {
      setShowAuth(true);
      return;
    }

    // Check if user can create video
    if (!authService.canCreateVideo()) {
      setShowPricing(true);
      return;
    }

    setAppState('generating');
    setLoadingStep('Preparing lyrics...');
    
    // Reset all state
    setAudioFile(file);
    setOriginalLyrics(lyrics);
    setArtist(artistName);
    setTheme(selectedTheme);
    setAspectRatio(selectedAspectRatio);
    setPreparedLyrics(null);
    setTimedLyrics(null);
    setBackgroundImages(null);
    setError(null);

    try {
      const lyricData = await prepareLyricLines(lyrics);
      if (!lyricData || lyricData.length === 0) {
        throw new Error("AI could not process the lyrics. Please try again with clearer lyrics.");
      }
      setPreparedLyrics(lyricData);
      setAppState('timing');
    } catch (e) {
      handleError('Failed to prepare lyrics.', e);
    } finally {
      setLoadingStep('');
    }
  };

  const handleTimingComplete = (initialTimedLyrics: TimedLyric[]) => {
    const lyricsWithEndTime = initialTimedLyrics.map((lyric, index) => {
      const nextLyric = initialTimedLyrics[index + 1];
      // Default duration is 3s, or until the next lyric starts
      const endTime = nextLyric ? nextLyric.startTime : lyric.startTime + 3;
      return { ...lyric, endTime };
    });
    setTimedLyrics(lyricsWithEndTime);
    setAppState('editing');
  };

  const handleEditingComplete = async (finalTimedLyrics: TimedLyric[]) => {
    setAppState('generating');
    setLoadingStep('Generating dynamic background images...');
    setTimedLyrics(finalTimedLyrics);
    
    try {
        const sections = [...new Set(finalTimedLyrics.map(l => l.section || 'verse'))];
        const bgImages = await generateBackgroundImages(sections, originalLyrics, finalTimedLyrics, artist, theme, aspectRatio);
        
        // Increment video count for users
        await authService.incrementVideoCount();
        
        setBackgroundImages(bgImages);
        setAppState('displaying');
    } catch (e) {
        handleError('Failed to generate video assets.', e);
    } finally {
        setLoadingStep('');
    }
  };
  
  const handleReset = () => {
    setAudioFile(null);
    setOriginalLyrics('');
    setArtist('');
    setTheme('default');
    setAspectRatio('9:16');
    setPreparedLyrics(null);
    setTimedLyrics(null);
    setBackgroundImages(null);
    setError(null);
    setAppState('upload');
  };

  const renderContent = () => {
    switch (appState) {
        case 'generating':
            return (
                <div className="flex items-center justify-center">
                    <Loader step={loadingStep} />
                </div>
            );
        case 'error':
            return (
                <div className="flex items-center justify-center">
                    <div className="text-center glass-panel p-8 animate-fade-in max-w-md">
                        <div className="mx-auto bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center border-2 border-red-500/50">
                            <InfoIcon className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-300 mt-4">Generation Failed</h2>
                        <p className="text-red-200/80 mt-2 mb-6">{debouncedError}</p>
                        <button onClick={handleReset} className="btn bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
                            Try Again
                        </button>
                    </div>
                </div>
            );
        case 'timing':
            if (preparedLyrics && audioFile) {
                return (
                    <div className="w-full">
                        <LyricTimer 
                            audioUrl={URL.createObjectURL(audioFile)}
                            audioFile={audioFile}
                            lyrics={preparedLyrics}
                            onComplete={handleTimingComplete}
                            onBack={handleReset}
                        />
                    </div>
                );
            }
            break;
        case 'editing':
            if (timedLyrics && audioFile) {
                return (
                    <div className="w-full">
                        <TimelineEditor
                            audioUrl={URL.createObjectURL(audioFile)}
                            initialLyrics={timedLyrics}
                            onComplete={handleEditingComplete}
                            onBack={() => setAppState('timing')}
                        />
                    </div>
                );
            }
            break;
        case 'displaying':
            if (timedLyrics && backgroundImages && audioFile) {
                return (
                    <div className="w-full">
                        <VideoPlayer
                            audioUrl={URL.createObjectURL(audioFile)}
                            lyricsData={timedLyrics}
                            backgroundImages={backgroundImages}
                            onReset={handleReset}
                            aspectRatio={aspectRatio}
                            theme={theme}
                        />
                    </div>
                );
            }
            break;
        case 'upload':
        default:
            return (
                <>
                    <div className="grid lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2">
                            <UploadForm onStartSync={handleStart} isLoading={false} />
                        </div>
                        
                        <div className="space-y-4">
                            {user && user.plan === 'free' && (
                                <div className="glass-panel p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CrownIcon className="w-5 h-5 text-yellow-400" />
                                        <span className="text-white font-semibold">Usage Today</span>
                                    </div>
                                    <p className="text-gray-300 text-sm">
                                        {user.videosToday}/1 videos created
                                    </p>
                                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                        <div 
                                            className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(user.videosToday / 1) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="glass-panel p-4">
                                <h3 className="text-white font-semibold mb-3">Recent Features</h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span>Genre-specific themes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                                        <span>AI-powered sync</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                        <span>Multiple aspect ratios</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            );
    }
    // Fallback if state is inconsistent
    handleReset();
    return <UploadForm onStartSync={handleStart} isLoading={false} />;
  }

  return (
    <DesktopLayout
      user={user}
      onShowAuth={() => setShowAuth(true)}
      onShowDashboard={() => setShowDashboard(true)}
      onShowPricing={() => setShowPricing(true)}
    >
      {renderContent()}
      
      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)}
        onUpgrade={async (plan) => {
          await authService.upgradePlan(plan);
          setUser(authService.getUser());
          setShowPricing(false);
        }}
      />
      
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setUser(authService.getUser());
          setShowAuth(false);
        }}
      />
      
      {user && (
        <Dashboard 
          user={user}
          isOpen={showDashboard}
          onClose={() => setShowDashboard(false)}
          onUpgrade={async (plan) => {
            await authService.upgradePlan(plan);
            setUser(authService.getUser());
            setShowDashboard(false);
          }}
        />
      )}
    </DesktopLayout>
  );
};

export default App;
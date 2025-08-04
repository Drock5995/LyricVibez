import { PreparedLyric, TimedLyric } from '../types';

// Enhanced word similarity function
const calculateSimilarity = (str1: string, str2: string): number => {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  let matches = 0;
  const totalWords = Math.max(words1.length, words2.length);
  
  words1.forEach(word1 => {
    if (words2.some(word2 => 
      word2.includes(word1) || word1.includes(word2) || 
      levenshteinDistance(word1, word2) <= 2
    )) {
      matches++;
    }
  });
  
  return matches / totalWords;
};

// Simple Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

export const autoSyncLyrics = async (
  audioUrl: string, 
  lyrics: PreparedLyric[]
): Promise<TimedLyric[]> => {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Optimized recognition settings
    recognition.continuous = true;
    recognition.interimResults = false; // Only final results for better accuracy
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3; // Get multiple alternatives

    const audio = new Audio(audioUrl);
    const timedLyrics: TimedLyric[] = [];
    let currentLyricIndex = 0;
    let recognitionBuffer: string[] = [];
    const SIMILARITY_THRESHOLD = 0.4;
    const BUFFER_SIZE = 5;

    recognition.onresult = (event: any) => {
      const currentTime = audio.currentTime;
      
      // Get the best transcript from alternatives
      let bestTranscript = '';
      let bestConfidence = 0;
      
      for (let i = 0; i < event.results[event.results.length - 1].length; i++) {
        const result = event.results[event.results.length - 1][i];
        if (result.confidence > bestConfidence) {
          bestTranscript = result.transcript;
          bestConfidence = result.confidence;
        }
      }
      
      // Add to buffer for context
      recognitionBuffer.push(bestTranscript.toLowerCase());
      if (recognitionBuffer.length > BUFFER_SIZE) {
        recognitionBuffer.shift();
      }
      
      const fullContext = recognitionBuffer.join(' ');
      
      if (currentLyricIndex < lyrics.length) {
        const currentLyric = lyrics[currentLyricIndex].line;
        const similarity = calculateSimilarity(currentLyric, fullContext);
        
        // Also check individual transcript
        const directSimilarity = calculateSimilarity(currentLyric, bestTranscript);
        const maxSimilarity = Math.max(similarity, directSimilarity);
        
        if (maxSimilarity >= SIMILARITY_THRESHOLD && bestConfidence > 0.5) {
          // Calculate more accurate end time based on lyric length
          const wordsInLyric = currentLyric.split(/\s+/).length;
          const estimatedDuration = Math.max(1.5, Math.min(5, wordsInLyric * 0.5));
          
          timedLyrics.push({
            ...lyrics[currentLyricIndex],
            startTime: Math.max(0, currentTime - 0.5), // Slight offset for reaction time
            endTime: currentTime - 0.5 + estimatedDuration
          });
          
          currentLyricIndex++;
          recognitionBuffer = []; // Clear buffer after match
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      reject(new Error(`Speech recognition failed: ${event.error}`));
    };
    
    recognition.onend = () => {
      // Fill in any missing lyrics with estimated timing
      while (currentLyricIndex < lyrics.length) {
        const prevLyric = timedLyrics[timedLyrics.length - 1];
        const startTime = prevLyric ? prevLyric.endTime + 0.5 : audio.duration * 0.1;
        
        timedLyrics.push({
          ...lyrics[currentLyricIndex],
          startTime,
          endTime: startTime + 3
        });
        currentLyricIndex++;
      }
      
      resolve(timedLyrics);
    };

    audio.onloadeddata = () => {
      audio.play();
      recognition.start();
    };

    audio.onended = () => {
      recognition.stop();
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (timedLyrics.length === 0) {
        recognition.stop();
        reject(new Error('Speech recognition timeout - no lyrics detected'));
      }
    }, audio.duration * 1000 + 5000);
  });
};
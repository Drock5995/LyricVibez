

export type Theme = 'default' | 'rock' | 'country' | 'chill' | 'underground';
export type AspectRatio = '16:9' | '9:16';

export interface PreparedLyric {
  line: string;
  visualPrompt: string;
  section: string; // e.g., 'verse', 'chorus'
  glyph?: string;
}

export interface TimedLyric {
  line: string;
  visualPrompt: string;
  section: string;
  startTime: number;
  endTime: number;
  glyph?: string;
}
export const DAILY_LIMITS = {
  free: 1,
  pro: Infinity,
  premium: Infinity
} as const;

export const PRICING = {
  pro: 9.99,
  premium: 19.99
} as const;

export const THEMES = ['default', 'rock', 'country', 'chill', 'underground'] as const;
export const ASPECT_RATIOS = ['9:16', '16:9', '1:1'] as const;
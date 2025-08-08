import { DAILY_LIMITS } from '../utils/constants';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'premium';
  videosToday: number;
  lastVideoDate: string;
  createdAt: string;
}

class AuthService {
  private user: User | null = null;
  private apiUrl = 'http://localhost:3000/api';

  constructor() {
    this.loadUser();
  }

  private loadUser() {
    const token = localStorage.getItem('lyricvibez_token');
    if (token) {
      this.verifyToken(token);
    }
  }

  private async verifyToken(token: string) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (response.ok) {
        this.user = await response.json();
      } else {
        localStorage.removeItem('lyricvibez_token');
      }
    } catch (error) {
      localStorage.removeItem('lyricvibez_token');
    }
  }

  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const { user, token } = await response.json();
    localStorage.setItem('lyricvibez_token', token);
    this.user = user;
    return user;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    const response = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const text = await response.text();
      let error;
      try {
        error = JSON.parse(text);
      } catch {
        error = { message: 'Registration failed' };
      }
      throw new Error(error.message || 'Registration failed');
    }

    const { user, token } = await response.json();
    localStorage.setItem('lyricvibez_token', token);
    this.user = user;
    return user;
  }

  logout() {
    localStorage.removeItem('lyricvibez_token');
    this.user = null;
  }



  getUser(): User | null {
    return this.user;
  }

  canCreateVideo(): boolean {
    if (!this.user) return false;
    const limit = DAILY_LIMITS[this.user.plan];
    return this.user.videosToday < limit;
  }

  async incrementVideoCount(): Promise<boolean> {
    if (!this.user) return false;

    const token = localStorage.getItem('lyricvibez_token');
    if (!token) return false;

    try {
      const response = await fetch(`${this.apiUrl}/user/increment-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        this.user = await response.json();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async upgradePlan(plan: 'pro' | 'premium'): Promise<boolean> {
    if (!this.user) return false;

    const token = localStorage.getItem('lyricvibez_token');
    if (!token) return false;

    try {
      const response = await fetch(`${this.apiUrl}/user/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        this.user = await response.json();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  getRemainingVideos(): number {
    if (!this.user) return 0;
    const limit = DAILY_LIMITS[this.user.plan];
    return limit === Infinity ? Infinity : Math.max(0, limit - this.user.videosToday);
  }

  private getCSRFToken(): string | null {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf-token='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
  }
}

export const authService = new AuthService();
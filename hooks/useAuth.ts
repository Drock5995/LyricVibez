import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'premium';
  videosToday: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setUser(user);
    return user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const canCreateVideo = () => {
    return authService.canCreateVideo();
  };

  return {
    user,
    loading,
    login,
    logout,
    canCreateVideo,
    isAuthenticated: !!user
  };
};
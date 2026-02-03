import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: number;
  name: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, token: string) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth
  };
}

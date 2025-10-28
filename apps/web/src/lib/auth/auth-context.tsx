import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { AuthContextType, User, AuthTokens } from './types';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  function getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!accessToken) return null;
    return { accessToken, refreshToken: refreshToken || undefined };
  }

  function setTokens(tokens: AuthTokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  useEffect(() => {
    const tokens = getTokens();
    if (tokens) {
      apiClient
        .get('/auth/me')
        .then((res) => {
          // Backend retorna: { user: {...} }
          const userData = res.data?.user || res.data;
          setUser(userData || null);
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => {
          setLoading(false);
          setInitialized(true);
        });
    } else {
      setLoading(false);
      setInitialized(true);
    }
  }, [])

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      const res = await apiClient.post('/auth/login', { email, password });
      const data = res.data;
      
      // Backend retorna: { user, accessToken, refreshToken }
      const tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      
      if (!tokens.accessToken) {
        throw new Error('No access token in response');
      }

      setTokens(tokens);
      
      // O usuário já vem na resposta do login
      const user = data.user;
      setUser(user || null);
      
      return { user, ...tokens };
    } catch (error) {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        initialized,
        login, 
        logout,
        getTokens,
        setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx || Object.keys(ctx).length === 0) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

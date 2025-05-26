"use client";

import type { User } from '@/lib/types';
import { mock_SP_AuthenticateUser } from '@/lib/mock-data';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (username: string, password_plaintext: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('tasksp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoadingAuth(false);
  }, []);

  const login = async (username: string, password_plaintext: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    const authenticatedUser = await mock_SP_AuthenticateUser(username, password_plaintext);
    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('tasksp_user', JSON.stringify(authenticatedUser));
      setIsLoadingAuth(false);
      return true;
    }
    setIsLoadingAuth(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tasksp_user');
    router.push('/login');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

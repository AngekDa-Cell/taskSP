"use client";

import type { User } from '@/lib/types';
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
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id && parsedUser.Username) {
             setUser(parsedUser);
        } else {
            localStorage.removeItem('tasksp_user'); // Limpiar si está malformado
        }
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('tasksp_user');
      }
    }
    setIsLoadingAuth(false);
  }, []);

  // Mejorar el manejo de errores en el cliente
  // Manejar respuestas no JSON en el cliente
  const login = async (username: string, password_plaintext: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: password_plaintext }),
      });

      if (!response.ok) {
        console.error(`Login failed with status: ${response.status}`);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorDetails = await response.json();
          console.error('Error details:', errorDetails);
        } else {
          const errorText = await response.text();
          console.error('Error response is not JSON:', errorText);
        }
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const authenticatedUser: User = await response.json();
      if (authenticatedUser && authenticatedUser.id) {
        setUser(authenticatedUser);
        localStorage.setItem('tasksp_user', JSON.stringify(authenticatedUser));
        return true;
      } else {
        console.warn("Invalid user data received:", authenticatedUser);
        throw new Error("Invalid user data");
      }
    } catch (error) {
      console.error('Login failed:', error);
      setUser(null);
      localStorage.removeItem('tasksp_user');
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tasksp_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, login, logout }}>
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

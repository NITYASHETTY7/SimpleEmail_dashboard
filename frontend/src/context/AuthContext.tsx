import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogleToken: (credential: string) => Promise<boolean>;
  loginDemoUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('reachinbox_jwt_token');
    const savedUser = localStorage.getItem('reachinbox_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('reachinbox_user');
      }
    }

    // Verify token with backend
    if (token) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      api.getCurrentUser()
        .then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('reachinbox_user', JSON.stringify(res.data));
          } else if (!savedUser) {
            logout();
          }
        })
        .catch(() => {})
        .finally(() => {
          clearTimeout(timer);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogleToken = async (credential: string): Promise<boolean> => {
    try {
      const res = await api.loginWithGoogle(credential);
      if (res.success && res.data) {
        localStorage.setItem('reachinbox_jwt_token', res.data.token);
        localStorage.setItem('reachinbox_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Google login error:', err);
      return false;
    }
  };

  const loginDemoUser = async () => {
    // Generate a demo JWT token for instant evaluation
    const demoPayload = {
      email: 'alex.rivera@reachinbox.test',
      name: 'Alex Rivera',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      sub: 'demo-user-12345',
    };

    // Base64 demo credential token
    const demoToken = btoa(JSON.stringify(demoPayload));
    await loginWithGoogleToken(demoToken);
  };

  const logout = () => {
    localStorage.removeItem('reachinbox_jwt_token');
    localStorage.removeItem('reachinbox_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogleToken,
        loginDemoUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

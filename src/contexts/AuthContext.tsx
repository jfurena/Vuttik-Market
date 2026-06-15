import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  uid: string;
  originalUid?: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: string;
  planId: string;
  isBanned: boolean;
  onboardingCompleted: boolean;
  activeProfileMode?: 'personal' | 'business' | string;
  age?: number;
  gender?: string;
  country?: string;
  username?: string;
  emailVerified: boolean;
  businessName?: string;
  businessLogo?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
  unreadMessagesCount: number;
  isBusinessModeActive: boolean;
  switchProfileMode: (mode: string) => void;
  updateUser: (data: Partial<AuthUser>) => void;
  showGlobalBusinessSelector: boolean;
  setShowGlobalBusinessSelector: (show: boolean) => void;
  globalInviteData: any | null;
  setGlobalInviteData: (data: any | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
  unreadMessagesCount: 0,
  isBusinessModeActive: false,
  switchProfileMode: () => {},
  updateUser: () => {},
  showGlobalBusinessSelector: false,
  setShowGlobalBusinessSelector: () => {},
  globalInviteData: null,
  setGlobalInviteData: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('vuttik_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isBusinessModeActive, setIsBusinessModeActive] = useState(localStorage.getItem('vuttik_business_mode') === 'true');
  const [showGlobalBusinessSelector, setShowGlobalBusinessSelector] = useState(false);
  const [globalInviteData, setGlobalInviteData] = useState<any | null>(null);

  const updateUser = (data: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const switchProfileMode = async (mode: string) => {
    // mode is 'personal' or businessUid
    setIsBusinessModeActive(mode !== 'personal');
    localStorage.setItem('vuttik_business_mode', (mode !== 'personal').toString());
    if (user) {
      try {
        await api.updateProfileMode(mode, user.originalUid || user.uid);
        const updatedUser = await api.getMe();
        setUser(updatedUser);
      } catch (err) {
        console.error("Failed to update profile mode", err);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          localStorage.setItem('vuttik_token', token);
          const me = await api.getMe();
          setUser(me);
          if (me.activeProfileMode) {
            const isBiz = me.activeProfileMode === 'business';
            setIsBusinessModeActive(isBiz);
            localStorage.setItem('vuttik_business_mode', isBiz.toString());
          }
        } catch (err) {
          console.error("Token validation failed", err);
          logout();
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (user) {
      const fetchUnread = async () => {
        try {
          const res = await api.getUnreadMessagesCount(user.uid);
          setUnreadMessagesCount(res.count);
        } catch (err) {
          // ignore
        }
      };
      fetchUnread();
      interval = setInterval(fetchUnread, 15000);
    } else {
      setUnreadMessagesCount(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('vuttik_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('vuttik_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, unreadMessagesCount, isBusinessModeActive, switchProfileMode,
        updateUser,
        showGlobalBusinessSelector,
        setShowGlobalBusinessSelector,
        globalInviteData,
        setGlobalInviteData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

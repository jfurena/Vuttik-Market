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
  dateOfBirth?: string;
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
  plans: any[];
  hasFeature: (featureId: string) => boolean;
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
  plans: [],
  hasFeature: () => false,
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
  const [plans, setPlans] = useState<any[]>([]);

  const hasFeature = (featureId: string) => {
    // DESACTIVADO TEMPORALMENTE: Todas las funciones están permitidas ya que la app es solo de anuncios
    return true;
  };

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
          const [me, plansData] = await Promise.all([
            api.getMe(),
            api.getSubscriptionPlans().catch(() => [])
          ]);
          setUser(me);
          setPlans(plansData);
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
        setPlans([]);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (user?.uid) {
      const fetchUnread = async () => {
        // Skip polling if tab is not visible to save resources
        if (document.visibilityState !== 'visible') return;
        try {
          const res = await api.getUnreadMessagesCount(user.uid);
          setUnreadMessagesCount(res.count);
        } catch (err) {
          // ignore
        }
      };
      fetchUnread();
      interval = setInterval(fetchUnread, 60000); // Poll every 60s
    } else {
      setUnreadMessagesCount(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.uid]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('vuttik_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('vuttik_token');
    setToken(null);
    setUser(null);
    setPlans([]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isLoading,
      unreadMessagesCount,
      isBusinessModeActive,
      switchProfileMode,
      updateUser,
      showGlobalBusinessSelector,
      setShowGlobalBusinessSelector,
      globalInviteData,
      setGlobalInviteData,
      plans,
      hasFeature
    }}>
      {children}
    </AuthContext.Provider>
  );
};

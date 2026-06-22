import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (correo: string, password: string, location?: { lat: number, lng: number, address?: string }) => Promise<void>;
  register: (nombre: string, correo: string, password: string) => Promise<void>;
  employeeLogin: (business_codigo: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectBusiness: (business_id: string) => Promise<void>;
  exitBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  employeeLogin: async () => {},
  logout: async () => {},
  selectBusiness: async () => {},
  exitBusiness: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const currentUser = await ApiService.loginMe();
      if (currentUser) {
        setUser(currentUser);
        setProfile(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const handlePracticeModeChange = () => {
      setLoading(true);
      setUser(null);
      setProfile(null);
      checkAuth();
    };
    window.addEventListener('practice_mode_changed', handlePracticeModeChange);
    return () => window.removeEventListener('practice_mode_changed', handlePracticeModeChange);
  }, []);

  const login = async (correo: string, password: string, location?: { lat: number, lng: number, address?: string }) => {
    const data = await ApiService.login(correo, password, location);
    // After owner login, no business selected yet
    const ownerProfile: UserProfile = {
      id: data.owner.id,
      nombre: data.owner.nombre,
      correo: data.owner.correo,
      rol: 'admin' as any,
      estado: 'activo',
      fecha_creacion: data.owner.fecha_creacion,
    };
    setUser(ownerProfile);
    setProfile(ownerProfile);
  };

  const register = async (nombre: string, correo: string, password: string) => {
    const data = await ApiService.register(nombre, correo, password);
    const ownerProfile: UserProfile = {
      id: data.owner.id,
      nombre: data.owner.nombre,
      correo: data.owner.correo,
      rol: 'admin' as any,
      estado: 'activo',
      fecha_creacion: data.owner.fecha_creacion,
    };
    setUser(ownerProfile);
    setProfile(ownerProfile);
  };

  const employeeLogin = async (business_codigo: string, username: string, password: string) => {
    const data = await ApiService.employeeLogin(business_codigo, username, password);
    const empProfile: UserProfile = {
      ...data.user,
      estado: 'activo',
      fecha_creacion: new Date().toISOString(),
    };
    setUser(empProfile);
    setProfile(empProfile);
  };

  const selectBusiness = async (business_id: string) => {
    await ApiService.selectBusiness(business_id);
    // Reload user profile now it includes business context
    await checkAuth();
  };

  const exitBusiness = async () => {
    await ApiService.exitBusiness();
    await checkAuth();
  };

  const logout = async () => {
    await ApiService.logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, employeeLogin, logout, selectBusiness, exitBusiness }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

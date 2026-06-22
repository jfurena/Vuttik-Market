import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, Store, Hash, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ApiService } from '../services/api';
import { api } from '../../lib/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

type Tab = 'login' | 'register' | 'employee';

export default function Login() {
  const { login, register, employeeLogin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');

  // Owner fields
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Employee fields
  const [bizCodigo, setBizCodigo] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Legal Modal states
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('vuttik_language');
    if (saved) return saved;
    return navigator.language.startsWith('en') ? 'en' : 'es';
  });
  const [legalDocToShow, setLegalDocToShow] = useState<'terms' | 'privacy' | null>(null);

  React.useEffect(() => {
    const processOAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (code && state) {
        setLoading(true);
        try {
          let response;
          const isLocal = window.location.hostname === 'localhost';
          const googleRedirectUri = isLocal ? 'http://localhost:5173' : 'https://vuttik.com';
          const facebookRedirectUri = isLocal ? 'http://localhost:5173' : 'https://vuttik.com/';

          if (state === 'google') {
            response = await ApiService.googleCallback({ code, redirect_uri: googleRedirectUri });
          } else if (state === 'facebook') {
            response = await ApiService.facebookCallback({ code, redirect_uri: facebookRedirectUri });
          }

          if (response?.token && response?.user) {
            localStorage.setItem('vuttik_token', response.token);
            // Full page reload to ensure session cookie is properly picked up by checkAuth
            window.location.href = '/businesses';
          }
        } catch (err: any) {
          console.error('OAuth error:', err);
          setError(err.message || 'Error en la autenticación social.');
        } finally {
          setLoading(false);
          // Remove query params
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    processOAuth();
  }, []);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login is not configured on this environment.');
      return;
    }
    setLoading(true);
    const isLocal = window.location.hostname === 'localhost';
    const redirectUri = isLocal ? 'http://localhost:5173' : 'https://vuttik.com';
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=pos_google`;
  };

  const handleFacebookLogin = () => {
    if (!FACEBOOK_APP_ID) {
      setError('Facebook login is not configured.');
      return;
    }
    setLoading(true);
    const isLocal = window.location.hostname === 'localhost';
    const redirectUri = isLocal ? 'http://localhost:5173' : 'https://vuttik.com/';
    window.location.href = `https://www.facebook.com/v16.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&state=pos_facebook`;
  };

  const handleWalletLogin = async () => {
    try {
      if (!window.ethereum) {
        setError('No se detectó ninguna billetera (MetaMask). Instálala para continuar.');
        return;
      }
      setLoading(true);
      setError('');
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) throw new Error('No se seleccionó ninguna cuenta.');
      const address = accounts[0];
      
      const { nonce } = await api.getWalletNonce(address);
      if (!nonce) throw new Error('No se pudo obtener el nonce del servidor.');
      
      const message = `Iniciando sesión en Vuttik Market. Nonce: ${nonce}`;
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, address] });
      if (!signature) throw new Error('Firma cancelada.');
      
      const response = await api.verifyWalletSignature(address, signature);
      if (response?.token && response?.user) {
        localStorage.setItem('vuttik_token', response.token);
        window.location.href = '/businesses';
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar la billetera.');
    } finally {
      setLoading(false);
    }
  };

  const clearState = (newTab: Tab) => {
    setTab(newTab);
    setError('');
    setNombre(''); setCorreo(''); setPassword('');
    setBizCodigo(''); setEmpUsername(''); setEmpPassword('');
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        if (!nombre.trim()) { setError('El nombre es obligatorio.'); setLoading(false); return; }
        // Ensure practice mode is off before real registration
        localStorage.setItem('vuttik_practice_mode', 'false');
        await register(nombre, correo, password);
      } else {
        // Ensure practice mode is off before real login
        localStorage.setItem('vuttik_practice_mode', 'false');
        await login(correo, password);
      }
      
      const nextPath = '/businesses';
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev || localStorage.getItem('vuttik_legal_accepted_v1') === 'true') {
        // Full page reload to ensure session cookie is properly picked up by checkAuth
        window.location.href = nextPath;
      } else {
        setPendingRedirect(nextPath);
        setShowLegalModal(true);
      }
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('No se pudo conectar al servidor. Asegúrate de que el servidor está iniciado (Iniciar_Colmado.bat).');
      } else {
        setError(err.message || 'Error de autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeLogin(bizCodigo.trim().toUpperCase(), empUsername.trim(), empPassword);
      
      const nextPath = '/pos';
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev || localStorage.getItem('vuttik_legal_accepted_v1') === 'true') {
        navigate(nextPath);
      } else {
        setPendingRedirect(nextPath);
        setShowLegalModal(true);
      }
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('No se pudo conectar al servidor. Asegúrate de que el servidor está iniciado (Iniciar_Colmado.bat).');
      } else {
        setError(err.message || 'Credenciales incorrectas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTermsAndGps = async () => {
    setModalError('');
    setModalLoading(true);
    
    const completeAccess = async (lat: number, lng: number, source: string) => {
      try {
        if (pendingRedirect === '/pos') {
          await ApiService.logLocation(lat, lng);
        }
        
        localStorage.setItem('vuttik_language', language);
        localStorage.setItem('vuttik_legal_accepted_v1', 'true');
        localStorage.setItem('vuttik_last_gps', JSON.stringify({ lat, lng, time: new Date().toISOString(), source }));
        
        setShowLegalModal(false);
        setModalLoading(false);
        window.location.href = pendingRedirect;
      } catch (err: any) {
        console.error("Failed to log login location:", err);
        localStorage.setItem('vuttik_language', language);
        localStorage.setItem('vuttik_legal_accepted_v1', 'true');
        localStorage.setItem('vuttik_last_gps', JSON.stringify({ lat, lng, time: new Date().toISOString(), source }));
        setShowLegalModal(false);
        setModalLoading(false);
        window.location.href = pendingRedirect;
      }
    };

    // 1. Intentar GPS Nativo de Hardware
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await completeAccess(lat, lng, 'gps_nativo');
      },
      async (geoErr) => {
        console.warn("GPS nativo falló o no está disponible en la app empaquetada. Intentando Geolocalización por IP...", geoErr);
        
        // 2. Fallback: Geolocalización por IP (Ideal para Electron/PC de escritorio sin hardware GPS)
        try {
          const response = await fetch('https://ipapi.co/json/');
          if (response.ok) {
            const data = await response.json();
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              await completeAccess(lat, lng, 'ip_geolocalizacion');
              return;
            }
          }
        } catch (ipErr) {
          console.error("IP Geolocation falló también:", ipErr);
        }

        // 3. Fallback: Historial previo registrado
        const savedGpsRaw = localStorage.getItem('vuttik_last_gps');
        if (savedGpsRaw) {
          try {
            const savedGps = JSON.parse(savedGpsRaw);
            if (savedGps && savedGps.lat && savedGps.lng) {
              await completeAccess(savedGps.lat, savedGps.lng, 'historial_gps');
              return;
            }
          } catch (e) {}
        }

        // 4. Fallback: Ubicación dominicana por defecto si está completamente offline en su primera ejecución
        const defaultLat = 18.4861;
        const defaultLng = -69.9312;
        await completeAccess(defaultLat, defaultLng, 'defecto_offline');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Left Panel — Brand (Darker Premium Look) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex flex-col flex-1 p-12 relative overflow-hidden bg-slate-950 justify-between animate-fade-in"
      >
        {/* Background Image with Dark Blue Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <img 
            src="/background_login.jpeg" 
            alt="Supermarket Background" 
            className="w-full h-full object-cover" 
          />
          {/* Tint overlays to replicate the screenshot's premium look */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
          <div className="absolute inset-0 bg-blue-950/35 mix-blend-color" />
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6 leading-[1.1] tracking-tight font-sans"
          >
            Gestión inteligente para tu negocio.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-slate-300 text-base md:text-lg leading-relaxed mb-10 font-medium font-sans opacity-90"
          >
            Controla tu inventario, registra ventas y monitorea tus ganancias con una plataforma rápida, segura y fácil de usar.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex gap-4"
          >
            {[['📦', 'Inventario'], ['💰', 'Ventas'], ['📊', 'Reportes']].map(([emoji, label]) => (
              <div key={label} className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <span className="text-white text-sm font-semibold">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
        
        <div className="relative z-10 text-white/50 text-xs font-semibold">
          &copy; {new Date().getFullYear()} Vuttik. Todos los derechos reservados.
        </div>
      </motion.div>

      {/* Right Panel — Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center justify-center w-full lg:w-[540px] xl:w-[600px] p-6 sm:p-12 bg-white"
      >
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex justify-center mb-4 lg:mb-6">
            <img src="/Logo.png" alt="Vuttik POS" className="h-24 md:h-28 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              {tab === 'login' ? 'Bienvenido de vuelta' : tab === 'register' ? 'Crea tu cuenta' : 'Acceso de Empleado'}
            </h2>
            <p className="text-slate-500 text-sm">
              {tab === 'login' ? 'Ingresa tus credenciales para continuar.' : 
               tab === 'register' ? 'Comienza a gestionar tu negocio hoy mismo.' : 
               'Ingresa el código proporcionado por tu administrador.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl mb-8">
            {([['login', 'Entrar'], ['register', 'Registrarme'], ['employee', 'Empleado']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => clearState(t)}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm flex items-start gap-3 font-medium">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OWNER FORM (login + register) */}
          <AnimatePresence mode="wait">
            {(tab === 'login' || tab === 'register') && (
              <motion.form
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleOwnerSubmit}
                className="space-y-5"
              >
                {tab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Nombre completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required type="email" value={correo} onChange={e => setCorreo(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                    {tab === 'login' && (
                      <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                        ¿Olvidaste tu contraseña?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      {tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* EMPLOYEE FORM */}
            {tab === 'employee' && (
              <motion.form
                key="employee"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleEmployeeSubmit}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Código del Negocio</label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required type="text" value={bizCodigo} onChange={e => setBizCodigo(e.target.value.toUpperCase())}
                      placeholder="Ej. NEG-001"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required type="text" value={empUsername} onChange={e => setEmpUsername(e.target.value)}
                      placeholder="Nombre de usuario"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required type={showEmpPassword ? 'text' : 'password'} value={empPassword} onChange={e => setEmpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                    <button type="button" onClick={() => setShowEmpPassword(!showEmpPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showEmpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Store size={16} />
                      Entrar al Punto de Venta
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {tab !== 'employee' && (
            <>
              <div className="relative flex items-center gap-4 my-6">
                <div className="flex-1 h-[1px] bg-slate-200"></div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">o</span>
                <div className="flex-1 h-[1px] bg-slate-200"></div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-1 shadow-sm" title="Continuar con Google">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                </button>
                <button type="button" onClick={handleFacebookLogin} disabled={loading} className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-1 shadow-sm" title="Continuar con Facebook">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button type="button" onClick={handleWalletLogin} disabled={loading} className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-all hover:-translate-y-1 shadow-sm" title="Conectar Billetera">
                  <svg width="24" height="24" viewBox="0 0 118 118" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M116.326 47.9304L59.0003 4.20508L1.67432 47.9304L23.491 113.795H94.5097L116.326 47.9304Z" fill="#E2761B"/>
                    <path d="M94.5097 113.795L116.326 47.9304L59.0003 76.5414L94.5097 113.795Z" fill="#E4761B"/>
                    <path d="M23.491 113.795L1.67432 47.9304L59.0003 76.5414L23.491 113.795Z" fill="#E4761B"/>
                    <path d="M59.0003 4.20508L40.7163 47.9304L59.0003 76.5414L77.2843 47.9304L59.0003 4.20508Z" fill="#E4761B"/>
                    <path d="M1.67432 47.9304L40.7163 47.9304L59.0003 4.20508L1.67432 47.9304Z" fill="#D7C1B3"/>
                    <path d="M116.326 47.9304L77.2843 47.9304L59.0003 4.20508L116.326 47.9304Z" fill="#D7C1B3"/>
                    <path d="M59.0003 76.5414L77.2843 47.9304H40.7163L59.0003 76.5414Z" fill="#233447"/>
                    <path d="M59.0003 76.5414L94.5097 113.795H23.491L59.0003 76.5414Z" fill="#CD6116"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-slate-450 text-xs font-semibold">
            Al acceder aceptas los{' '}
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); setLegalDocToShow('terms'); }} 
              className="text-slate-550 hover:text-slate-700 underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer font-bold outline-none"
            >
              Términos de Uso
            </button>{' '}
            y la{' '}
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); setLegalDocToShow('privacy'); }} 
              className="text-slate-550 hover:text-slate-700 underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer font-bold outline-none"
            >
              Política de Privacidad
            </button>.
          </p>
        </div>
      </motion.div>

      {/* FULL SCREEN LEGAL & GPS AUTHORIZATION MODAL */}
      <AnimatePresence>
        {showLegalModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full p-8 md:p-10 space-y-6 relative overflow-hidden text-gray-900 text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-2">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-100">
                  <ShieldAlert className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-4 uppercase">Aviso Legal y Consentimiento</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cumplimiento de Seguridad y Auditoría de Ubicación</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
                <p className="font-bold text-slate-900 text-sm">Términos de Operación de Vuttik POS</p>
                <p>
                  Para garantizar la legitimidad fiscal, auditoría contra fraudes y seguridad comercial de este punto de venta, la aplicación recopilará y registrará de forma obligatoria las coordenadas físicas del dispositivo (GPS Latitud y Longitud) al momento del acceso y con cada transacción comercial efectuada.
                </p>
                <p>
                  Estos datos serán almacenados como metadatos de auditoría interna de manera totalmente cifrada y segura en nuestra base de datos.
                </p>
                <p className="font-bold text-slate-900">Uso Obligatorio de Hardware:</p>
                <p>
                  Al dar su consentimiento, autoriza que la aplicación solicite acceso a los sensores de geolocalización de su equipo o navegador. La negativa de dar estos accesos impedirá de forma definitiva el uso de la plataforma.
                </p>
              </div>

              {modalError && (
                <div className="bg-red-50 text-red-600 border border-red-150 p-4 rounded-xl text-xs flex items-start gap-2.5 font-bold leading-normal">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{modalError}</p>
                </div>
              )}

              {/* Language Selector Section */}
              <div className="bg-slate-50 p-4 md:p-5 rounded-[1.5rem] border border-slate-100 space-y-3 font-sans">
                <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest leading-none">Idioma de Preferencia / Language Preference</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 cursor-pointer",
                      language === 'es'
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/15"
                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <span>🇪🇸</span> Español
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 cursor-pointer",
                      language === 'en'
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/15"
                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                    )}
                  >
                    <span>🇺🇸</span> English
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  {language === 'es' 
                    ? 'El idioma elegido configurará el sistema y traducirá al español los productos escaneados por código de barras (ej: "Whole Milk" se registrará como "Leche Entera").' 
                    : 'The selected language will configure the system and translate scanned product details automatically (e.g. Spanish terms will be translated to English).'}
                </p>
              </div>

              <div className="space-y-4 font-sans text-xs">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={termsAccepted} 
                    onChange={e => setTermsAccepted(e.target.checked)} 
                    className="h-4 w-4 mt-0.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                  />
                  <div>
                    <span className="font-bold text-slate-700 block">
                      Acepto los{' '}
                      <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline font-bold">
                        Términos de Servicio
                      </a>{' '}
                      y la{' '}
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setLegalDocToShow('privacy'); }} 
                        className="text-blue-600 hover:text-blue-700 underline bg-transparent border-none p-0 cursor-pointer font-bold outline-none"
                      >
                        Política de Privacidad
                      </button>
                    </span>
                    <span className="text-[10px] text-slate-450 leading-relaxed block font-medium">Consiento todas las cláusulas legales para el uso regulado del POS.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={gpsConsent} 
                    onChange={e => setGpsConsent(e.target.checked)} 
                    className="h-4 w-4 mt-0.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                  />
                  <div>
                    <span className="font-bold text-slate-700 block">Autorizo el rastreo GPS de mi ubicación actual</span>
                    <span className="text-[10px] text-slate-450 leading-relaxed block font-medium">Concedo permiso de geolocalización física para auditorías de ventas y seguridad del local.</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex gap-3 font-sans">
                <button 
                  type="button"
                  onClick={() => { setShowLegalModal(false); setModalError(''); }}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer border-none"
                >
                  Declinar Acceso
                </button>
                <button 
                  type="button"
                  onClick={handleAcceptTermsAndGps}
                  disabled={!termsAccepted || !gpsConsent || modalLoading}
                  className={cn(
                    "flex-1 py-3.5 rounded-xl font-black uppercase tracking-wider text-[10px] text-white transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer",
                    (!termsAccepted || !gpsConsent || modalLoading)
                      ? "bg-slate-200 shadow-none cursor-not-allowed text-slate-400"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                  )}
                >
                  {modalLoading ? <Loader2 size={14} className="animate-spin" /> : 'Aceptar y Entrar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Legal Document Viewer Modal */}
      <AnimatePresence>
        {legalDocToShow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full p-8 md:p-10 space-y-6 relative overflow-hidden text-gray-900 text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {legalDocToShow === 'terms' ? 'Términos de Servicio' : 'Política de Privacidad'}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase">Establecimiento Oficial Vuttik</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLegalDocToShow(null)} 
                  className="text-slate-400 hover:text-slate-650 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-h-96 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed font-medium font-sans">
                {legalDocToShow === 'terms' ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm">1. Aceptación de los Términos</p>
                    <p>
                      Al utilizar Vuttik POS, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de uso comercial. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la plataforma.
                    </p>
                    <p className="font-bold text-slate-900 text-sm">2. Uso Obligatorio de Geolocalización (GPS)</p>
                    <p>
                      Para garantizar la integridad fiscal y evitar fraudes operativos en el punto de venta, la aplicación registra e inyecta de forma inmutable la ubicación física exacta del dispositivo al momento de inicio de sesión y en cada transacción comercial. La desactivación o el bloqueo deliberado del GPS por parte del usuario impedirá el acceso operativo al sistema.
                    </p>
                    <p className="font-bold text-slate-900 text-sm">3. Responsabilidad de la Cuenta</p>
                    <p>
                      Usted es el único responsable de salvaguardar la confidencialidad de sus credenciales de acceso (usuario y contraseña) y del uso que se le dé a las mismas en este equipo. El propietario del negocio asume plena responsabilidad por las acciones realizadas por sus empleados registrados en el sistema.
                    </p>
                    <p className="font-bold text-slate-900 text-sm">4. Limitación de Responsabilidad</p>
                    <p>
                      Vuttik POS proporciona herramientas de gestión comercial local. No nos hacemos responsables por pérdidas de datos por fallas de hardware locales, omisión de respaldos o diferencias en balances de caja debidas al uso del software.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm">1. Recolección de Datos</p>
                    <p>
                      Vuttik POS recopila datos operativos mínimos para su funcionamiento: nombres de usuarios, roles de acceso, registros de transacciones de ventas y egresos, y coordenadas geográficas de geolocalización (GPS).
                    </p>
                    <p className="font-bold text-slate-900 text-sm">2. Uso de la Ubicación</p>
                    <p>
                      Las coordenadas GPS se utilizan única y exclusivamente para auditar que el POS sea operado dentro del perímetro comercial del negocio establecido por el administrador. Estos datos no son compartidos con anunciantes ni redes de terceros bajo ninguna circunstancia.
                    </p>
                    <p className="font-bold text-slate-905 text-sm">3. Seguridad de la Información</p>
                    <p>
                      Todos los datos operativos y metadatos de ubicación se almacenan de forma local cifrada y se transmiten mediante canales seguros TLS en caso de sincronización en la nube, garantizando altos estándares de confidencialidad y protección contra accesos no autorizados.
                    </p>
                    <p className="font-bold text-slate-900 text-sm">4. Derechos del Usuario</p>
                    <p>
                      Como usuario de Vuttik POS, puede solicitar al administrador la consulta, modificación o eliminación de sus registros personales, siempre que no afecten los requisitos de auditoría de transacciones fiscales y contables obligatorias del negocio.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-end font-sans">
                <button 
                  type="button"
                  onClick={() => setLegalDocToShow(null)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer border-none shadow-md shadow-blue-500/10"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, History, Menu, X, Wallet, Receipt, Shield, MapPin, RefreshCw, Key, ShieldAlert, Clock, BookOpen, Calculator, ArrowLeft, Cloud, WifiOff, CloudLightning, UserCheck, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { ApiService, isPracticeModeActive, setPracticeModeActive } from '../services/api';
import TrainingTour from './TrainingTour';

import LocationPromptModal from './LocationPromptModal';

export default function Layout() {
  const { profile, logout, exitBusiness } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = React.useState<'synced' | 'syncing' | 'offline'>(navigator.onLine ? 'synced' : 'offline');
  const [criticalStockCount, setCriticalStockCount] = React.useState(0);

  React.useEffect(() => {
    const checkStock = async () => {
      try {
        const products = await ApiService.getProducts();
        if (Array.isArray(products)) {
          const count = products.filter(p => p.estado === 'activo' && p.cantidad_disponible < p.stock_minimo).length;
          setCriticalStockCount(count);
        }
      } catch (e) {
        console.error("Error loading products for critical stock badge:", e);
      }
    };
    checkStock();
    const interval = setInterval(checkStock, 20000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setSyncStatus('syncing'); setTimeout(() => setSyncStatus('synced'), 2000); };
    const handleOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // States for employee geolocation restriction checking
  const [geoRestricted, setGeoRestricted] = React.useState(false);
  const [geoChecking, setGeoChecking] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [allowedLocation, setAllowedLocation] = React.useState<any | null>(null);
  const [currentCoords, setCurrentCoords] = React.useState<{lat: number, lng: number} | null>(null);

  // New States for Remote Location Approvals
  const [requestStatus, setRequestStatus] = React.useState<'none' | 'pendiente' | 'aprobado' | 'rechazado'>('none');
  const [isSubmittingApproval, setIsSubmittingApproval] = React.useState(false);
  const [approvalRequest, setApprovalRequest] = React.useState<any | null>(null);

  const checkEmployeeLocation = React.useCallback(async () => {
    if (!profile) return;
    setGeoChecking(true);
    setGeoError(null);
    try {
      const settings = await ApiService.getSettings();
      const statusRes = await ApiService.getApprovalStatus(profile.id);
      
      setApprovalRequest(statusRes);
      if (statusRes) {
        setRequestStatus(statusRes.estado);
      } else {
        setRequestStatus('none');
      }

      // Helper distance calculator (Haversine formula)
      const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371e3; // Earth radius in meters
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      if (settings && settings.allowed_location) {
        setAllowedLocation(settings.allowed_location);
        
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const empLat = pos.coords.latitude;
            const empLng = pos.coords.longitude;
            setCurrentCoords({ lat: empLat, lng: empLng });

            // 1. Check primary allowed location
            const targetCoords = settings.allowed_location;
            const radius = targetCoords.radius_meters || 200;
            const distanceToPrimary = getDistance(empLat, empLng, targetCoords.lat, targetCoords.lng);

            let isAllowed = distanceToPrimary <= radius;

            // 2. Check whitelisted locations
            if (!isAllowed && settings.whitelisted_locations && settings.whitelisted_locations.length > 0) {
              for (const wl of settings.whitelisted_locations) {
                const distanceToWL = getDistance(empLat, empLng, wl.lat, wl.lng);
                if (distanceToWL <= (wl.radius_meters || 200)) {
                  isAllowed = true;
                  break;
                }
              }
            }

            if (isAllowed) {
              setGeoRestricted(false);
              setGeoChecking(false);
            } else {
              // Not in range, check if latest request was approved
              if (statusRes && statusRes.estado === 'aprobado') {
                setGeoRestricted(false);
              } else {
                setGeoRestricted(true);
              }
              setGeoChecking(false);
            }
          },
          (err) => {
            console.error("Layout Location retrieval failed:", err);
            setGeoError("Permiso de GPS requerido: Es obligatorio activar tu GPS para abrir el sistema de ventas de la caja.");
            
            if (statusRes && statusRes.estado === 'aprobado') {
              setGeoRestricted(false);
            } else {
              setGeoRestricted(true);
            }
            setGeoChecking(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setGeoChecking(false);
      }
    } catch (e) {
      console.error(e);
      setGeoChecking(false);
    }
  }, [profile]);

  // Request Remote Access Approval
  const handleRequestApproval = async () => {
    if (!profile) return;
    setIsSubmittingApproval(true);
    try {
      let lat = 0;
      let lng = 0;
      let addressStr = "Ubicación remota fuera del Colmado";

      if (currentCoords) {
        lat = currentCoords.lat;
        lng = currentCoords.lng;
        addressStr = `Coordenadas: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
      } else {
        // Try to fetch coords
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              addressStr = `Coordenadas: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
              setCurrentCoords({ lat, lng });
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }

      const reqRes = await ApiService.requestLocationApproval({
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        lat,
        lng,
        address: addressStr
      });
      setApprovalRequest(reqRes);
      setRequestStatus('pendiente');
    } catch (err) {
      console.error("Error submitting remote access request:", err);
      alert("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  React.useEffect(() => {
    if (!profile) return;

    const checkCoordsAndLog = async (lat: number, lng: number) => {
      setCurrentCoords({ lat, lng });
      try {
        await ApiService.logLocation(lat, lng);
      } catch (e) {
        console.warn("Could not log session location to server:", e);
      }
    };

    // 1. Intentar GPS de Hardware
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await checkCoordsAndLog(pos.coords.latitude, pos.coords.longitude);
      },
      async (err) => {
        console.warn("Audit geolocation nativo falló en Layout, intentando IP...", err);
        
        // 2. Fallback: Geolocalización por IP
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const data = await res.json();
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              await checkCoordsAndLog(lat, lng);
              return;
            }
          }
        } catch (ipErr) {
          console.error("IP Geolocation falló en Layout:", ipErr);
        }

        // 3. Fallback: Historial previo
        const saved = localStorage.getItem('vuttik_last_gps');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.lat && parsed.lng) {
              setCurrentCoords({ lat: parsed.lat, lng: parsed.lng });
              return;
            }
          } catch (e) {}
        }

        // 4. Fallback: Ubicación por defecto
        setCurrentCoords({ lat: 18.4861, lng: -69.9312 });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    if (profile.rol === UserRole.CAJERO) {
      checkEmployeeLocation();
    } else if (profile.rol === UserRole.ADMIN) {
      ApiService.getSettings().then(settings => {
        if (!settings || !settings.allowed_location) {
          setShowLocationPrompt(true);
        }
      });
    }
  }, [profile, checkEmployeeLocation]);

  // Live polling for admin approvals
  React.useEffect(() => {
    if (profile?.rol !== UserRole.CAJERO || !geoRestricted || requestStatus !== 'pendiente') return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await ApiService.getApprovalStatus(profile.id);
        if (statusRes) {
          setApprovalRequest(statusRes);
          setRequestStatus(statusRes.estado);
          if (statusRes.estado === 'aprobado') {
            setGeoRestricted(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Approval request polling failed:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [profile, geoRestricted, requestStatus]);

  const navigationSections = [
    {
      title: '1. Trabajo Diario (Para Cobrar)',
      items: [
        { name: 'Vender Producto', description: 'Toca aquí para cobrar rápido a clientes', href: '/pos', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.CAJERO] },
        { name: 'Ventas de Hoy', description: 'Ver facturas generadas o cancelar', href: '/sales', icon: Receipt, roles: [UserRole.CAJERO] },
        { name: 'Hacer Cotización', description: 'Calcula presupuestos para tus clientes', href: '/quotes', icon: Calculator, roles: [UserRole.ADMIN, UserRole.CAJERO] },
        { name: 'Abrir / Cerrar Caja', description: 'Ver cuánto dinero hay en efectivo', href: '/shifts', icon: History, roles: [UserRole.ADMIN, UserRole.CAJERO] },
      ]
    },
    {
      title: '2. Dueño (Control del Negocio)',
      items: [
        { name: 'Mis Productos', description: 'Ver inventario, subir precios, stock', href: '/inventory', icon: Package, roles: [UserRole.ADMIN, UserRole.CAJERO] },
        { name: 'Clientes y Crédito (Fiao)', description: 'Gestionar fiaos y cuentas por cobrar', href: '/clients', icon: UserCheck, roles: [UserRole.ADMIN, UserRole.CAJERO] },
        { name: 'Gastos del Colmado', description: 'Anotar pagos, luz, agua, suplidores', href: '/expenses', icon: Wallet, roles: [UserRole.ADMIN, UserRole.CAJERO] },
        { name: 'Contabilidad y Ganancias', description: 'Ver cuánto dinero neto estás ganando', href: '/admin', icon: LayoutDashboard, roles: [UserRole.ADMIN] },
      ]
    },
    {
      title: '3. Seguridad y Control',
      items: [
        { name: 'Historial / Auditoría', description: 'Ver quién cambió o borró mercancías', href: '/audit', icon: Shield, roles: [UserRole.ADMIN] },
        { name: 'Histórico de Ventas', description: 'Revisar recibos, facturas antiguas y buscar', href: '/sales', icon: History, roles: [UserRole.ADMIN] },
        { name: 'Mis Empleados', description: 'Crear y gestionar accesos de empleados', href: '/employees', icon: Users, roles: [UserRole.ADMIN] },
      ]
    }
  ];

  const mobileNav = [
    { name: 'Vender', href: '/pos', icon: ShoppingCart },
    { name: 'Ventas', href: '/sales', icon: Receipt },
    { name: 'Admin', href: '/admin', icon: LayoutDashboard, roles: [UserRole.ADMIN] },
    { name: 'Caja', href: '/shifts', icon: History, roles: [UserRole.ADMIN, UserRole.CAJERO] },
  ].filter(item => !item.roles || item.roles.includes(profile?.rol as UserRole));

  const isPractice = isPracticeModeActive();

  const handleExitPractice = () => {
    setPracticeModeActive(false);
    navigate('/');
  };

  return (
    <div className={cn("bg-surface flex flex-col font-sans", location.pathname === '/pos' ? "h-screen overflow-hidden" : "min-h-screen")}>
      <LocationPromptModal isOpen={showLocationPrompt} businessId={profile?.business_id || ''} onComplete={() => setShowLocationPrompt(false)} />
      {isPractice && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-550 to-amber-700 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-pro shrink-0 z-50 border-b border-amber-500/30 flex-col sm:flex-row text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-surface-container-lowest animate-pulse shrink-0" />
            <p className="text-[11px] sm:font-label-md font-black uppercase tracking-wide">
              🛠️ MODO DE PRÁCTICA ACTIVO — <span className="font-semibold text-amber-100 normal-case text-[11px] sm:text-[11.5px]">Estás operando en el simulador seguro para entrenamiento de personal. Nada de lo que hagas aquí afectará los datos reales de la tienda.</span>
            </p>
          </div>
          <button
            onClick={handleExitPractice}
            className="px-4 py-1.5 bg-surface-container-lowest hover:bg-amber-50 active:scale-95 text-amber-950 font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all border-0 shadow-sm cursor-pointer shrink-0 mt-2 sm:mt-0"
          >
            Salir de Práctica
          </button>
        </div>
      )}
      <div className={cn("flex-1 flex bg-surface min-h-0", location.pathname === '/pos' && "overflow-hidden")}>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-surface-container-lowest border-r border-outline-variant/20 sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="p-8">
          <div className="flex flex-col gap-1 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-emerald-100">
                <ShoppingCart className="text-white h-7 w-7" />
              </div>
              <div>
                <span className="font-black text-xl tracking-tighter text-vuttik-navy uppercase leading-none block truncate max-w-[140px]">{profile?.business_nombre || 'Mi Negocio'}</span>
                <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase font-mono">{profile?.business_codigo || ''}</span>
              </div>
            </div>
            {profile?.rol === UserRole.ADMIN && (
              <button
                onClick={async () => { await exitBusiness(); navigate('/businesses'); }}
                className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={12} />
                Cambiar de negocio
              </button>
            )}

            {/* SYNC INDICATOR DESKTOP */}
            <div className={cn(
              "flex items-center gap-2 mt-4 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-colors",
              syncStatus === 'synced' ? "bg-emerald-50 text-emerald-700" :
              syncStatus === 'syncing' ? "bg-blue-50 text-blue-700" :
              "bg-orange-50 text-orange-700"
            )}>
              {syncStatus === 'synced' ? <Cloud className="h-4 w-4 text-emerald-500" /> :
               syncStatus === 'syncing' ? <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" /> :
               <WifiOff className="h-4 w-4 text-orange-500" />}
              <span>{syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Modo Offline'}</span>
            </div>
          </div>
          
          <nav className="space-y-8">
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(profile?.rol as UserRole));
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={section.title} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{section.title}</h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            "flex items-start gap-4 px-4 py-3 rounded-3xl font-body-md font-bold transition-all",
                            isActive 
                              ? "bg-vuttik-blue text-white shadow-pro-hover shadow-blue-100 scale-[1.02]" 
                              : "text-on-surface-variant hover:bg-surface hover:text-vuttik-navy"
                          )}
                        >
                          <item.icon className={cn("h-5 w-5 mt-1 flex-shrink-0", isActive ? "text-white" : "text-gray-400")} />
                          <div className="flex flex-col text-left">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm", isActive ? "text-white" : "text-gray-955")}>{item.name}</span>
                              {item.href === '/inventory' && criticalStockCount > 0 && (
                                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-0.5 shadow-sm">
                                  <Bell className="h-2.5 w-2.5" />
                                  {criticalStockCount}
                                </span>
                              )}
                            </div>
                            <span className={cn("text-[10px] font-medium leading-normal", isActive ? "text-blue-100" : "text-gray-400")}>
                              {item.description}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6 space-y-4">
          <button 
            onClick={() => setShowTour(true)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-[1.25rem] font-label-md font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white transition-all shadow-pro shadow-amber-500/10 cursor-pointer text-left border-0 outline-none"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 shrink-0 text-white" />
              <div className="flex flex-col">
                <span className="leading-tight">Entrenar Personal</span>
                <span className="text-[9px] font-bold text-amber-50 leading-none mt-0.5">Recorrido Completo →</span>
              </div>
            </div>
          </button>

          {isPractice && (
            <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 space-y-2 text-amber-950">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Modo Práctica Activo</span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                Estás operando en simulación segura. Los datos reales de la tienda no se dañarán.
              </p>
              <button
                onClick={handleExitPractice}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.97] text-white font-black text-[9px] uppercase tracking-wider rounded-2xl transition-all border-0 shadow-sm cursor-pointer"
              >
                Salir de Práctica
              </button>
            </div>
          )}

          <div className="p-4 bg-surface rounded-3xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-3xl bg-surface-container-lowest border border-gray-100 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-vuttik-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-vuttik-navy truncate leading-tight">{profile?.nombre}</p>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{profile?.rol}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Turno Activo</span>
              </div>
              {currentCoords && (
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-800 font-bold border-t border-emerald-100/50 pt-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                  <span className="truncate">GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={async () => {
              if (profile?.owner_id === profile?.id) {
                // Owner logging out: exit business first, then redirect to businesses
                await logout();
                navigate('/login');
              } else {
                // Employee logging out
                await logout();
                navigate('/login');
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-3xl font-body-md font-bold text-red-500 hover:bg-red-50 transition-all group"
          >
            <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden relative", location.pathname === '/pos' && "h-screen")}>
        {/* Mobile Header */}
        <header className="md:hidden glass-nav-pro border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight uppercase truncate max-w-[160px] block">{profile?.business_nombre || 'Mi Negocio'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 font-mono">{profile?.business_codigo}</span>
                <span className={cn("flex h-1.5 w-1.5 rounded-full", syncStatus === 'synced' ? "bg-emerald-500" : syncStatus === 'syncing' ? "bg-blue-500 animate-pulse" : "bg-orange-500")} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalStockCount > 0 && (
              <Link 
                to="/inventory" 
                className="p-2 bg-amber-500/10 text-amber-600 rounded-2xl relative hover:scale-105 active:scale-95 transition-all"
                title={`${criticalStockCount} productos bajo stock mínimo`}
              >
                <Bell className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
                  {criticalStockCount}
                </span>
              </Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-vuttik-navy bg-gray-100 rounded-2xl">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsOpen(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-surface-container-lowest p-6 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <span className="font-black text-xl tracking-tighter uppercase text-vuttik-blue">MENÚ</span>
                <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400">
                  <X />
                </button>
              </div>

              {isPractice && (
                <div className="mb-6 p-4 bg-amber-50 rounded-3xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Práctica Activa</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleExitPractice();
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[9px] uppercase tracking-wider rounded-2xl transition-all border-0 shadow-sm cursor-pointer"
                  >
                    Salir de Práctica
                  </button>
                </div>
              )}

              <nav className="space-y-6">
                {navigationSections.map(section => (
                  <div key={section.title} className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{section.title}</h3>
                    <div className="space-y-1">
                      {section.items.map(item => {
                        if (item.roles && !item.roles.includes(profile?.rol as UserRole)) return null;
                        return (
                          <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 rounded-2xl font-body-md font-bold text-gray-650 hover:bg-surface"
                          >
                            <item.icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col text-left">
                              <span className="text-sm text-vuttik-navy leading-tight">{item.name}</span>
                              <span className="text-[9px] font-normal text-gray-400 leading-normal">{item.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="mt-6 pt-6 border-t border-gray-105 flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setShowTour(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-3xl text-white font-black text-xs uppercase tracking-wider transition-all shadow-pro shadow-amber-500/10 cursor-pointer text-left border-0"
                >
                  <BookOpen className="h-4.5 w-4.5 text-white shrink-0" />
                  Entrenar Personal
                </button>
                <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 text-red-500 font-extrabold text-xs tracking-wider uppercase">
                  <LogOut className="h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        <main className={cn(
          "flex-1 overflow-auto pb-24 md:pb-8 p-6 md:p-10",
          location.pathname === '/pos' && "h-full md:h-screen p-3 md:p-5 flex flex-col min-h-0 overflow-hidden pb-16 md:pb-5"
        )}>
          <Outlet />
        </main>

        <TrainingTour isOpen={showTour} onClose={() => setShowTour(false)} />

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav-pro border-t border-outline-variant/20 flex justify-around p-3 z-40 pb-safe">
          {mobileNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center p-2 rounded-2xl transition-all",
                  isActive ? "text-vuttik-blue scale-110" : "text-gray-400"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-black mt-1 uppercase">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
    </div>
  );
}

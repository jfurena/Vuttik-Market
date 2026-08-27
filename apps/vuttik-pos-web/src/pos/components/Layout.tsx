import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, History, Menu, X, Wallet, Receipt, Shield, MapPin, RefreshCw, Key, ShieldAlert, Clock, BookOpen, Calculator, ArrowLeft, Cloud, WifiOff, CloudLightning, UserCheck, Bell, HandCoins } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { ApiService, isPracticeModeActive, setPracticeModeActive } from '../services/api';
import TrainingTour from './TrainingTour';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { profile, logout, exitBusiness } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = React.useState<'synced' | 'syncing' | 'offline'>(navigator.onLine ? 'synced' : 'offline');
  const [criticalStockCount, setCriticalStockCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showAllNotifications, setShowAllNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  React.useEffect(() => {
    const fetchNotifications = async () => {
      if (profile?.rol === UserRole.ADMIN || profile?.rol === UserRole.SUPERVISOR) {
        try {
          const data = await ApiService.getNotifications();
          setNotifications(data);
        } catch (e) {
          console.error("Error fetching notifications:", e);
        }
      }
    };
    fetchNotifications();
    const intv = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intv);
  }, [profile?.id, profile?.rol]);

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

  const navigationItems = [
    { name: 'Vender Producto', description: 'Toca aquí para cobrar rápido a clientes', href: '/pos', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.CAJERO] },
    { name: 'Ventas de Hoy', description: 'Ver facturas generadas o cancelar', href: '/sales', icon: Receipt, roles: [UserRole.CAJERO] },
    { name: 'Mis Productos', description: 'Ver inventario, subir precios, stock', href: '/inventory', icon: Package, roles: [UserRole.ADMIN] },
    { name: 'Abrir / Cerrar Caja', description: 'Ver cuánto dinero hay en efectivo', href: '/shifts', icon: History, roles: [UserRole.ADMIN, UserRole.CAJERO] },
    { name: 'Hacer Cotización', description: 'Calcula presupuestos para tus clientes', href: '/quotes', icon: Calculator, roles: [UserRole.ADMIN, UserRole.CAJERO] },
    { name: 'Clientes y Fidelidad', description: 'Gestionar fiaos y cuentas por cobrar', href: '/clients', icon: UserCheck, roles: [UserRole.ADMIN, UserRole.CAJERO] },
    { name: 'Gastos del Colmado', description: 'Anotar pagos, luz, agua, suplidores', href: '/expenses', icon: Wallet, roles: [UserRole.ADMIN, UserRole.CAJERO] },
    { name: 'Contabilidad y Ganancias', description: 'Ver cuánto dinero neto estás ganando', href: '/admin', icon: LayoutDashboard, roles: [UserRole.ADMIN], permissionKey: 'view_finances' },
    { name: 'Historial / Auditoría', description: 'Ver quién cambió o borró mercancías', href: '/audit', icon: Shield, roles: [UserRole.ADMIN], permissionKey: 'view_audit' },
    { name: 'Histórico de Ventas', description: 'Revisar recibos, facturas antiguas y buscar', href: '/sales', icon: History, roles: [UserRole.ADMIN], permissionKey: 'view_history' },
    { name: 'Mis Comisiones', icon: HandCoins, href: '/commissions', description: 'Ganancias por ventas' },
    { name: 'Mis Empleados', description: 'Crear y gestionar accesos de empleados', href: '/employees', icon: Users, roles: [UserRole.ADMIN], permissionKey: 'manage_employees' },
  ];
  
  const hasAccess = (item: any) => {
    if (profile?.rol === UserRole.ADMIN) return true;
    if (item.roles && item.roles.includes(profile?.rol as UserRole)) return true;
    if (item.permissionKey && profile?.permisos?.includes(item.permissionKey)) return true;
    if (!item.roles && !item.permissionKey) return true;
    return false;
  };

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
    <div className={cn("bg-gray-50 flex flex-col font-sans", location.pathname === '/pos' ? "h-screen overflow-hidden" : "min-h-screen")}>
      {isPractice && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-550 to-amber-700 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-md shrink-0 z-50 border-b border-amber-500/30 flex-col sm:flex-row text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-wide">
              🛠️ MODO DE PRÁCTICA ACTIVO — <span className="font-semibold text-amber-100 normal-case text-[11px] sm:text-[11.5px]">Estás operando en el simulador seguro para entrenamiento de personal. Nada de lo que hagas aquí afectará los datos reales de la tienda.</span>
            </p>
          </div>
          <button
            onClick={handleExitPractice}
            className="px-4 py-1.5 bg-white hover:bg-amber-50 active:scale-95 text-amber-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all border-0 shadow-sm cursor-pointer shrink-0 mt-2 sm:mt-0"
          >
            Salir de Práctica
          </button>
        </div>
      )}
      <div className={cn("flex-1 flex bg-gray-50 min-h-0", location.pathname === '/pos' && "overflow-hidden")}>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="p-8">
                      <div className="flex flex-col gap-1 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-emerald-100">
                  <ShoppingCart className="text-white h-7 w-7" />
                </div>
                <div>
                  <span className="font-black text-xl tracking-tighter text-gray-950 uppercase leading-none block truncate max-w-[140px]">{profile?.business_nombre || 'Mi Negocio'}</span>
                  <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase font-mono">{profile?.business_codigo || ''}</span>
                </div>
              </div>
            </div>
            {(profile?.rol === UserRole.ADMIN || profile?.rol === UserRole.SUPERVISOR) && (
              <button
                onClick={async () => { await exitBusiness(); navigate('/businesses'); }}
                className="flex items-center justify-center gap-2 mt-5 w-full px-3 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-[11px] uppercase tracking-widest font-black rounded-xl transition-all border border-gray-200 shadow-sm group"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-gray-400 group-hover:-translate-x-1 transition-transform" />
                Cambiar Negocio
              </button>
            )}
          </div>

            {/* SYNC INDICATOR DESKTOP */}
            <div className={cn(
              "flex items-center gap-2 mb-8 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors",
              syncStatus === 'synced' ? "bg-emerald-50 text-emerald-700" :
              syncStatus === 'syncing' ? "bg-blue-50 text-blue-700" :
              "bg-orange-50 text-orange-700"
            )}>
              {syncStatus === 'synced' ? <Cloud className="h-4 w-4 text-emerald-500" /> :
               syncStatus === 'syncing' ? <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" /> :
               <WifiOff className="h-4 w-4 text-orange-500" />}
              <span>{syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Modo Offline'}</span>
            </div>

          <nav className="space-y-8">
            <div className="space-y-1">
              {navigationItems.map((item) => {
  if (!hasAccess(item)) return null;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href + item.name}
                    to={item.href}
                    className={cn(
                      "flex items-start gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
          </nav>
        </div>
        
        </aside>

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden relative", location.pathname === '/pos' && "h-screen")}>
                {/* Floating Desktop Header (User Section + Notifications) */}
        <div className="hidden md:flex items-center justify-end px-6 pt-4 pb-2 shrink-0 bg-gray-50 relative">
          <div className="flex items-center gap-3 bg-white p-1.5 pr-3 rounded-3xl border border-gray-100 shadow-sm z-50">
          
          <div className="relative">
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="flex items-center gap-2 pl-2 hover:bg-gray-50 rounded-2xl transition-colors py-0.5 pr-2"
            >
              <div className="h-10 w-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col text-left mr-2">
                <p className="text-sm font-black text-gray-900 truncate max-w-[150px] leading-tight">{profile?.nombre || 'Usuario'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">{profile?.rol}</p>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-emerald-700">Turno</span>
                  </div>
                </div>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute top-14 right-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col">
                <button 
                  onClick={async () => {
                    if (profile?.owner_id === profile?.id) {
                      await exitBusiness();
                      await logout();
                      navigate('/login');
                    } else {
                      await logout();
                      navigate('/login');
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200 mx-1"></div>

          {(profile?.rol === UserRole.ADMIN || profile?.rol === UserRole.SUPERVISOR) && (
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              className="relative p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
              title="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
        </div>

        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
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
            {(profile?.rol === UserRole.ADMIN || profile?.rol === UserRole.SUPERVISOR) && (
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>
            )}
            {criticalStockCount > 0 && (
              <Link 
                to="/inventory" 
                className="p-2 bg-amber-500/10 text-amber-600 rounded-xl relative hover:scale-105 active:scale-95 transition-all"
                title={`${criticalStockCount} productos bajo stock mínimo`}
              >
                <Bell className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
                  {criticalStockCount}
                </span>
              </Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-900 bg-gray-100 rounded-xl">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsOpen(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <span className="font-black text-xl tracking-tighter uppercase text-blue-600">MENÚ</span>
                <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400">
                  <X />
                </button>
              </div>

              {isPractice && (
                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Práctica Activa</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleExitPractice();
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all border-0 shadow-sm cursor-pointer"
                  >
                    Salir de Práctica
                  </button>
                </div>
              )}

              <nav className="space-y-1">
                {navigationItems.map(item => {
                  if (item.roles && !item.roles.includes(profile?.rol as UserRole)) return null;
                  return (
                    <Link
                        key={item.href + item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-650 hover:bg-gray-50"
                    >
                      <item.icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-sm text-gray-900 leading-tight">{item.name}</span>
                        <span className="text-[9px] font-normal text-gray-400 leading-normal">{item.description}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 pt-6 border-t border-gray-105 flex flex-col gap-2">

                <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 text-red-500 font-extrabold text-xs tracking-wider uppercase">
                  <LogOut className="h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        <main className={cn(
          "flex-1 overflow-auto pb-24 md:pb-8 p-6 md:px-10 md:pt-4 md:pb-10",
          location.pathname === '/pos' && "h-full md:h-screen p-3 md:p-5 flex flex-col min-h-0 overflow-hidden pb-16 md:pb-5"
        )}>
          <Outlet />
        </main>



        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-3 z-40 pb-safe">
          {mobileNav.map((item) => {
  if (!hasAccess(item)) return null;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center p-2 rounded-xl transition-all",
                  isActive ? "text-blue-600 scale-110" : "text-gray-400"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-black mt-1 uppercase">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute top-20 right-6 md:right-8 z-50 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">Notificaciones</h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-2 flex-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm font-medium">No tienes notificaciones.</div>
              ) : (
                      notifications.slice().reverse().map(n => (
                        <div 
                          key={n.id} 
                          onClick={async () => {
                            if (!n.isRead) {
                              await ApiService.markNotificationsRead(n.id);
                              setNotifications(notifications.map(no => no.id === n.id ? { ...no, isRead: true } : no));
                            }
                            setShowNotifications(false);
                            if (n.type === 'descuadre') navigate('/shifts', { state: { viewShiftId: n.metadata?.shiftId } });
                            if (n.type === 'stock_bajo') navigate('/inventory');
                          }}
                          className={cn(
                            "p-3 rounded-2xl mb-1 cursor-pointer transition-colors text-left w-full border",
                            n.isRead ? "bg-white border-transparent hover:bg-gray-50" : "bg-blue-50 border-blue-100 hover:bg-blue-100"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-blue-600">{n.title}</span>
                            {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                          </div>
                          <p className="text-xs text-gray-700 font-medium leading-relaxed">{n.message}</p>
                          <span className="text-[9px] font-bold text-gray-400 mt-2 block">
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <button 
                      onClick={() => { setShowNotifications(false); setShowAllNotifications(true); }}
                      className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      Ver historial completo
                    </button>
                  </div>
                </div>
              )}
            </div>

      {/* Full Notifications History Modal */}
      <AnimatePresence>
        {showAllNotifications && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowAllNotifications(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                    <History className="h-6 w-6 text-blue-500" />
                    Historial de Notificaciones
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Registro histórico de eventos del sistema</p>
                </div>
                <button onClick={() => setShowAllNotifications(false)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 font-medium">No hay notificaciones en el historial.</div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice().reverse().map(n => (
                      <div 
                        key={n.id}
                        className={cn("p-4 rounded-2xl border transition-all", n.isRead ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200 shadow-sm")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg", n.isRead ? "bg-gray-100 text-gray-600" : "bg-blue-600 text-white")}>
                              {n.title}
                            </span>
                            {!n.isRead && <span className="text-[10px] text-blue-600 font-bold">Nueva</span>}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className={cn("text-sm mt-2", n.isRead ? "text-gray-600" : "text-blue-900 font-medium")}>{n.message}</p>
                        {n.type === 'descuadre' && (
                          <button 
                            onClick={() => {
                              setShowAllNotifications(false);
                              navigate('/shifts', { state: { viewShiftId: n.metadata?.shiftId } });
                            }}
                            className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors inline-block"
                          >
                            Ver Turno
                          </button>
                        )}
                        {n.type === 'stock_bajo' && (
                          <button 
                            onClick={() => {
                              setShowAllNotifications(false);
                              navigate('/inventory');
                            }}
                            className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors inline-block"
                          >
                            Ver Inventario
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </div>
        </div>
      );
}


import { useState, useEffect } from 'react';
import { Bell, User, Search, X, CheckCheck, Menu, Settings, Briefcase, Shield, ShieldAlert, LogOut, Store, LayoutGrid, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface TopNavProps {
  userRole?: string;
  userPlan?: any;
  userProfile?: any;
  
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Mega Guardian',
  mega_guardian: 'Mega Guardian',
  guardian: 'Guardian Junior',
  business: 'Comprador Elite',
  negocio: 'Negocio Verificado',
  user: 'Comprador',
};

export default function TopNav({ userRole = 'user', userPlan, userProfile }: TopNavProps) {
  const { user, logout, switchProfileMode, unreadMessagesCount, setGlobalInviteData, setShowGlobalBusinessSelector, isBusinessModeActive } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid) {
      api.getNotifications(user.uid)
        .then(data => setNotifications(data))
        .catch(err => console.error(err));
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch(e) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length + unreadMessagesCount;

  const navigate = useNavigate();

  const menuItems = [
    { id: 'profile', path: '/perfil', label: 'Mi Perfil', icon: User, role: ['user', 'business', 'negocio', 'guardian', 'mega_guardian', 'admin'], feature: 'profile' },
    { id: 'negocio', path: '/panel/negocio', label: 'Modo Negocio', icon: Store, role: ['user', 'negocio', 'business', 'guardian', 'mega_guardian', 'admin'], feature: 'negocio_dash' },
    { id: 'guardian', path: '/panel/guardian', label: 'Modo Guardian', icon: Shield, role: ['guardian', 'mega_guardian', 'admin'], feature: 'guardian_dash' },
    { id: 'mega-guardian', path: '/panel/mega-guardian', label: 'Modo Mega Guardian', icon: ShieldAlert, role: ['mega_guardian', 'admin'], feature: 'mega_guardian_dash' },
    { id: 'herramientas', path: '/herramientas', label: 'Otras herramientas', icon: LayoutGrid, role: ['user', 'business', 'negocio', 'guardian', 'mega_guardian', 'admin'], feature: 'profile' },
    { id: 'settings', path: '/ajustes', label: 'Ajustes', icon: Settings, role: ['user', 'business', 'guardian', 'mega_guardian', 'admin'], feature: 'settings' },
  ];

  const filteredMenu = menuItems.filter(item => {
    // Admin and Mega Guardian bypass feature checks for their specific modes
    if (userRole === 'admin' || userRole === 'mega_guardian') {
      return true;
    }
    
    if (item.feature === 'profile' || item.feature === 'settings') return true;

    const roleMatch = item.role.includes(userRole);
    const featureMatch = userPlan?.features?.includes(item.feature);

    return roleMatch || featureMatch;
  });

  return (
    <header className="glass-nav-pro sticky top-0 left-0 right-0 z-40 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center md:bg-white/80 backdrop-blur-2xl md:backdrop-blur-2xl md:border-b border-gray-100/50">
      <div 
        className="flex items-center gap-2.5 md:gap-3 md:hidden shrink-0 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl shadow-sm bg-white border border-gray-50">
          <img src="/favicon.png" alt="Vuttik Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-xl tracking-tight font-display font-black text-on-surface">Vuttik <span className="text-vuttik-blue">Market</span></h1>
      </div>
      
      <div className="hidden md:block">
        <h2 className="text-3xl font-display font-black text-on-surface tracking-tight">Panel de Control</h2>
        <p className="text-on-surface-variant/80 text-sm font-medium mt-1">Bienvenido de nuevo a Vuttik Market</p>
      </div>
      
      <div className="flex items-center gap-3 md:gap-5 ml-auto relative">
        {isBusinessModeActive && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-vuttik-blue/10 border border-vuttik-blue/20 rounded-2xl shadow-sm transition-all" title="Estás interactuando como este negocio">
            <Store size={16} className="text-vuttik-blue" />
            <span className="text-[11px] font-black uppercase tracking-widest text-on-surface">{user?.businessName || user?.displayName || 'Modo Negocio'}</span>
          </div>
        )}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-3 bg-white border rounded-2xl transition-all duration-300 shadow-pro hover:shadow-pro-hover hover:-translate-y-0.5 ${showNotifications ? 'text-vuttik-blue border-vuttik-blue/30 ring-4 ring-vuttik-blue/10' : 'text-on-surface/60 hover:text-vuttik-blue'} ${unreadCount > 0 ? 'border-red-200/50 bg-red-50/30' : 'border-gray-100/50'}`}
          >
            <Bell size={20} className={`md:size-5 transition-colors ${unreadCount > 0 && !showNotifications ? 'text-red-500' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-black text-white items-center justify-center shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowNotifications(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed left-0 right-0 top-20 w-full rounded-b-3xl md:absolute md:left-auto md:right-0 md:top-auto md:mt-4 md:w-96 bg-white border border-gray-100 md:rounded-[32px] shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-vuttik-navy text-white">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-vuttik-blue" />
                      <h3 className="text-sm font-black uppercase tracking-widest">Notificaciones</h3>
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="hover:text-vuttik-blue transition-colors"><X size={18} /></button>
                  </div>
                  <div className="max-h-[70vh] md:max-h-96 overflow-y-auto custom-scrollbar">
                    {unreadMessagesCount > 0 && (
                      <div 
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/mensajes');
                        }}
                        className="p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 relative overflow-hidden bg-blue-50/40"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-vuttik-blue" />
                        <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20">
                          <MessageSquare size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="text-sm font-black leading-tight pr-2 text-vuttik-blue">Nuevos Mensajes</h4>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            Tienes {unreadMessagesCount} {unreadMessagesCount === 1 ? 'mensaje sin leer' : 'mensajes sin leer'} en tu bandeja.
                          </p>
                        </div>
                      </div>
                    )}
                    {notifications.length === 0 && unreadMessagesCount === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                          <Bell size={24} />
                        </div>
                        <span className="text-on-surface-variant text-sm font-bold">No tienes notificaciones</span>
                      </div>
                    ) : notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={async () => {
                          markAsRead(n.id);
                          if (n.type === 'invite' || n.title === 'Invitación a Negocio') {
                            setShowNotifications(false);
                            switchProfileMode('personal');
                            if (user) {
                              try {
                                const invites = await api.getBusinessInvites(user.originalUid || user.uid);
                                if (invites && invites.length > 0) {
                                  // Asumimos que la primera o encontramos la que coincida con el negocio
                                  // Ya que la notif no tiene ID de invite, abrimos el modal con la más reciente
                                  setGlobalInviteData(invites[0]);
                                } else {
                                  navigate('/perfil');
                                }
                              } catch (e) {
                                navigate('/perfil');
                              }
                            }
                          }
                        }}
                        className={`p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 relative overflow-hidden ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                      >
                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-vuttik-blue" />}
                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20' : 'bg-gray-100 text-gray-400'}`}>
                          <Bell size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className={`text-sm font-black leading-tight pr-2 ${!n.is_read ? 'text-vuttik-blue' : 'text-on-surface'}`}>{n.title}</h4>
                            <span className="text-[10px] text-on-surface-variant whitespace-nowrap font-bold mt-0.5">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notificaciones');
                    }}
                    className="w-full p-4 text-xs font-black text-vuttik-blue hover:bg-vuttik-blue hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Ver todas las notificaciones
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Menu button — after bell */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-3 bg-white border rounded-2xl transition-all duration-300 shadow-pro hover:shadow-pro-hover hover:-translate-y-0.5 ${showMenu ? 'text-vuttik-blue border-vuttik-blue/30 ring-4 ring-vuttik-blue/10' : 'text-on-surface/60 hover:text-vuttik-blue border-gray-100/50'}`}
          >
            <Menu size={20} className="md:size-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-64 bg-white border border-gray-100 rounded-[32px] shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-gray-50">
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Menú</h3>
                  </div>
                  <div className="p-2">
                    {filteredMenu.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'negocio') {
                            setShowGlobalBusinessSelector(true);
                          } else {
                            navigate(item.path);
                          }
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 p-4 hover:bg-surface-container rounded-2xl transition-colors text-on-surface group"
                      >
                        <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-white transition-colors">
                          <item.icon size={18} className="text-vuttik-blue" />
                        </div>
                        <span className="text-xs font-bold">{item.label}</span>
                      </button>
                    ))}
                    <div className="h-px bg-gray-50 my-2 mx-4" />
                    <button 
                      onClick={() => logout()}
                      className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-2xl transition-colors text-red-500 group"
                    >
                      <div className="p-2 bg-red-50/50 rounded-xl group-hover:bg-white transition-colors">
                        <LogOut size={18} />
                      </div>
                      <span className="text-xs font-bold">Cerrar Sesión</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
      </div>
    </header>
  );
}

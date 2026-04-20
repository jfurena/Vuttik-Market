import { useState } from 'react';
import { Bell, User, Search, X, CheckCheck, Menu, Settings, Briefcase, Shield, ShieldAlert, LogOut, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

const NOTIFICATIONS = [
  { id: '1', title: 'Nueva oferta', body: 'El arroz premium bajó a 40 DOP en Negocio Bravo.', time: '5 min' },
  { id: '2', title: 'Mensaje nuevo', body: 'Ana Martínez te envió un mensaje.', time: '12 min' },
  { id: '3', title: 'Validación exitosa', body: 'Tu publicación de "Leche" ha sido validada.', time: '1 hora' },
];

interface TopNavProps {
  userRole?: string;
  userPlan?: any;
  userProfile?: any;
  onNavigate?: (tab: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Mega Guardian',
  mega_guardian: 'Mega Guardian',
  guardian: 'Guardian Junior',
  business: 'Comprador Elite',
  negocio: 'Negocio Verificado',
  user: 'Comprador',
};

export default function TopNav({ userRole = 'user', userPlan, userProfile, onNavigate }: TopNavProps) {
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    { id: 'profile', label: 'Mi Perfil', icon: User, role: ['user', 'business', 'negocio', 'guardian', 'mega_guardian', 'admin'], feature: 'profile' },
    { id: 'negocio', label: 'Modo Negocio', icon: Store, role: ['negocio', 'mega_guardian', 'admin'], feature: 'negocio_dash' },
    { id: 'business', label: 'Modo Empresa', icon: Briefcase, role: ['business', 'mega_guardian', 'admin'], feature: 'business_dash' },
    { id: 'guardian', label: 'Modo Guardian', icon: Shield, role: ['guardian', 'mega_guardian', 'admin'], feature: 'guardian_dash' },
    { id: 'mega-guardian', label: 'Modo Mega Guardian', icon: ShieldAlert, role: ['mega_guardian', 'admin'], feature: 'mega_guardian_dash' },
    { id: 'admin', label: 'Panel Dueño', icon: ShieldAlert, role: ['admin'], feature: 'admin_dash' },
    { id: 'settings', label: 'Ajustes', icon: Settings, role: ['user', 'business', 'guardian', 'mega_guardian', 'admin'], feature: 'settings' },
  ];

  const filteredMenu = menuItems.filter(item => {
    // Admin and Mega Guardian bypass feature checks for their specific modes
    if (userRole === 'admin' || userRole === 'mega_guardian') {
      if (item.id === 'admin' && userRole !== 'admin') return false;
      return true;
    }
    
    // Check role first
    const roleMatch = item.role.includes(userRole);
    if (!roleMatch) return false;

    // Check plan features
    if (userPlan && userPlan.features) {
      if (item.feature === 'profile' || item.feature === 'settings') return true;
      return userPlan.features.includes(item.feature);
    }

    // Default to false if no plan found (except for basic profile/settings)
    return item.feature === 'profile' || item.feature === 'settings';
  });

  return (
    <header className="glass-nav sticky top-0 left-0 right-0 z-40 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center md:bg-transparent md:backdrop-blur-none md:border-none">
      <div className="flex items-center gap-1.5 md:gap-2 md:hidden shrink-0">
        <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Vuttik Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-xl md:text-2xl tracking-tight font-display font-bold text-vuttik-navy">Vuttik <span className="text-vuttik-blue">Market</span></h1>
      </div>
      
      <div className="hidden md:block">
        <h2 className="text-2xl font-display font-bold text-vuttik-navy">Panel de Control</h2>
        <p className="text-vuttik-text-muted text-sm">Bienvenido de nuevo a Vuttik Market</p>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4 ml-auto relative">
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 md:p-2.5 bg-white border border-gray-100 rounded-xl transition-all shadow-sm ${showMenu ? 'text-vuttik-blue border-vuttik-blue' : 'text-vuttik-navy/70 hover:text-vuttik-blue'}`}
          >
            <Menu size={18} className="md:size-5" />
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
                    <h3 className="text-sm font-black text-vuttik-navy uppercase tracking-widest">Menú</h3>
                  </div>
                  <div className="p-2">
                    {filteredMenu.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => {
                          onNavigate?.(item.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 p-4 hover:bg-vuttik-gray rounded-2xl transition-colors text-vuttik-navy group"
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

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 md:p-2.5 bg-white border border-gray-100 rounded-xl transition-all shadow-sm ${showNotifications ? 'text-vuttik-blue border-vuttik-blue' : 'text-vuttik-navy/70 hover:text-vuttik-blue'}`}
          >
            <Bell size={18} className="md:size-5" />
            <span className="absolute top-2 md:top-2.5 right-2 md:right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowNotifications(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-white border border-gray-100 rounded-[32px] shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-vuttik-navy uppercase tracking-widest">Notificaciones</h3>
                    <button onClick={() => setShowNotifications(false)}><X size={16} className="text-vuttik-text-muted" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto no-scrollbar">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-vuttik-gray transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-bold text-vuttik-navy">{n.title}</h4>
                          <span className="text-[10px] text-vuttik-text-muted">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-vuttik-text-muted leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full p-4 text-xs font-bold text-vuttik-blue hover:bg-vuttik-blue/5 transition-colors">
                    Ver todas las notificaciones
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
      </div>
    </header>
  );
}

import { Home, Search, PlusCircle, User, Settings, LogOut, MessageSquare, Shield, Briefcase, Globe, ShieldAlert, Store, ClipboardList, CreditCard, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  userRole?: string;
  userPlan?: any;
  onPublishClick: () => void;
  onMarketClick?: () => void;
}

export default function Sidebar({ activeTab, userRole = 'user', userPlan, onPublishClick, onMarketClick }: SidebarProps) {
  const { logout, unreadMessagesCount, isBusinessModeActive } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'market', action: onMarketClick || (() => navigate('/')), icon: ShoppingBag, label: 'Mercado' },
    { id: 'social', path: '/social', icon: Globe, label: 'Social' },
    { id: 'publish', action: onPublishClick, icon: PlusCircle, label: 'Publicar' },
    { id: 'messages', path: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
    isBusinessModeActive 
      ? { id: 'business', path: '/panel/negocio', icon: Store, label: 'Mi Negocio' }
      : { id: 'profile', path: '/perfil', icon: User, label: 'Mi Perfil' },
    { id: 'myplan', path: '/mi-plan', icon: CreditCard, label: 'Mi Plan' },
  ];

  if (userRole === 'guardian' || userRole === 'mega_guardian' || userRole === 'admin') {
    menuItems.push({ id: 'guardian_dash', path: '/panel/guardian', icon: Shield, label: 'Panel Guardian' });
  }

  if (userRole === 'mega_guardian' || userRole === 'admin') {
    menuItems.push({ id: 'mega_guardian_dash', path: '/panel/mega-guardian', icon: ShieldAlert, label: 'Mega Guardian' });
  }

  return (
    <aside className="hidden md:flex flex-col w-[240px] bg-surface-container-lowest border-r border-outline-variant/20 h-screen sticky top-0 p-6 z-50">
      <div 
        className="flex items-center gap-3 mb-10 px-2 justify-start cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl shadow-sm border border-outline-variant/10">
          <img src="/favicon.png" alt="Vuttik Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[20px] leading-none tracking-tighter font-display font-black text-vuttik-navy">
            Vuttik
          </h1>
          <span className="text-vuttik-blue font-display font-black text-sm leading-none tracking-wide">Market</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-3">
        <div className="text-[11px] font-black text-vuttik-text-muted/60 uppercase tracking-[0.2em] mb-4 px-4">Menú Principal</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : navigate(item.path)}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} />
              <span>{item.label}</span>
              {item.id === 'messages' && unreadMessagesCount > 0 && (
                <div className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </div>
              )}
              {isActive && item.id !== 'messages' && (
                <motion.div
                  layoutId="sidebarActive"
                  className="ml-auto w-1.5 h-6 bg-vuttik-blue rounded-full"
                />
              )}
              {isActive && item.id === 'messages' && unreadMessagesCount === 0 && (
                <motion.div
                  layoutId="sidebarActive"
                  className="ml-auto w-1.5 h-6 bg-vuttik-blue rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

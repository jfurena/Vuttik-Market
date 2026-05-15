import { Home, Search, PlusCircle, User, Settings, LogOut, MessageSquare, Shield, Briefcase, Globe, ShieldAlert, Store, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  userRole?: string;
  userPlan?: any;
  onPublishClick: () => void;
}

export default function Sidebar({ activeTab, userRole = 'user', userPlan, onPublishClick }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'market', path: '/', icon: Search, label: 'Mercado' },
    { id: 'social', path: '/social', icon: Globe, label: 'Social' },
    { id: 'publish', action: onPublishClick, icon: PlusCircle, label: 'Publicar' },
    { id: 'messages', path: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
    { id: 'profile', path: '/perfil', icon: User, label: 'Mi Perfil' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 h-screen sticky top-0 p-6">
      <div className="flex items-center gap-3 mb-10 px-2 justify-center">
        <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
          <img src="/favicon.png" alt="Vuttik Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl leading-none tracking-tighter font-display font-black text-vuttik-navy">
            Vuttik
          </h1>
          <span className="text-vuttik-blue font-display font-bold text-lg leading-none">Market</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-2 px-4">Principal</div>
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
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

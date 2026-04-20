import { Home, Search, PlusCircle, User, Settings, LogOut, MessageSquare, Shield, Briefcase, Globe, ShieldAlert, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
  userPlan?: any;
}

export default function Sidebar({ activeTab, setActiveTab, userRole = 'user', userPlan }: SidebarProps) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'market', icon: Search, label: 'Mercado' },
    { id: 'social', icon: Globe, label: 'Social' },
    { id: 'publish', icon: PlusCircle, label: 'Publicar' },
    { id: 'messages', icon: MessageSquare, label: 'Mensajes' },
    { id: 'profile', icon: User, label: 'Mi Perfil' },
  ];

  const roleItems = [];
  if (userRole === 'admin' || userRole === 'mega_guardian') {
    roleItems.push({ id: 'negocio_dash', icon: Store, label: 'Negocio' });
    roleItems.push({ id: 'business_dash', icon: Briefcase, label: 'Empresa' });
    roleItems.push({ id: 'guardian_dash', icon: Shield, label: 'Guardian' });
    roleItems.push({ id: 'mega_guardian_dash', icon: ShieldAlert, label: 'Mega Guardian' });
  } else {
    const features = userPlan?.features || [];
    if (userRole === 'business' && features.includes('business_dash')) {
      roleItems.push({ id: 'business_dash', icon: Briefcase, label: 'Empresa' });
    }
    if (userRole === 'negocio') {
      roleItems.push({ id: 'negocio_dash', icon: Store, label: 'Negocio' });
    }
    if (userRole === 'guardian' && features.includes('guardian_dash')) {
      roleItems.push({ id: 'guardian_dash', icon: Shield, label: 'Guardian' });
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 h-screen sticky top-0 p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Vuttik Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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
              onClick={() => setActiveTab(item.id)}
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

        {roleItems.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mt-6 mb-2 px-4">Herramientas Pro</div>
            {roleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
          </>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-50">
        <button 
          onClick={() => logout()}
          className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={22} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

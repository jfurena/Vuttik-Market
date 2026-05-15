import { Home, Search, PlusCircle, User, MessageSquare, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface BottomNavProps {
  activeTab: string;
  onPublishClick: () => void;
}

export default function BottomNav({ activeTab, onPublishClick }: BottomNavProps) {
  const navigate = useNavigate();

  const tabs = [
    { id: 'market', path: '/', icon: Search, label: 'Mercado' },
    { id: 'social', path: '/social', icon: Globe, label: 'Social' },
    { id: 'publish', action: onPublishClick, icon: PlusCircle, label: 'Publicar', isCenter: true },
    { id: 'messages', path: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
    { id: 'profile', path: '/perfil', icon: User, label: 'Perfil' },
  ];

  const getProfileIcon = () => {
    if (activeTab === 'business_dash') return '💼';
    if (activeTab === 'negocio_dash') return '🏪';
    if (activeTab === 'guardian_dash') return '🛡️';
    if (activeTab === 'mega_guardian_dash') return '⚡';
    return null;
  };

  const profileEmoji = getProfileIcon();

  return (
    <nav className="bottom-nav px-4 sm:px-8">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
                        (tab.id === 'profile' && (activeTab === 'business_dash' || activeTab === 'negocio_dash' || activeTab === 'guardian_dash' || activeTab === 'mega_guardian_dash'));

        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => tab.action ? tab.action() : navigate(tab.path)}
              className="relative flex-1 flex flex-col items-center py-1"
            >
              <div className="relative w-12 h-12 bg-vuttik-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-vuttik-blue/30 hover:scale-110 active:scale-90 transition-all">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter sm:tracking-wider mt-0.5 text-vuttik-blue">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`nav-item flex-1 py-1 ${isActive ? 'active' : ''}`}
          >
            <motion.div
              whileTap={{ scale: 0.8 }}
              className="relative flex flex-col items-center"
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-vuttik-blue/10' : ''}`}>
                {tab.id === 'profile' && profileEmoji ? (
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                    <span className="absolute -top-2 -right-2 text-xs">{profileEmoji}</span>
                  </div>
                ) : (
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter sm:tracking-wider mt-0.5 ${isActive ? 'text-vuttik-blue' : 'text-vuttik-text-muted'}`}>
                {tab.label}
              </span>
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}

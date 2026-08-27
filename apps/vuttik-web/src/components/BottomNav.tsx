import { Home, Search, PlusCircle, User, MessageSquare, Globe, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavProps {
  activeTab: string;
  onPublishClick: () => void;
  onMarketClick?: () => void;
}

export default function BottomNav({ activeTab, onPublishClick, onMarketClick }: BottomNavProps) {
  const navigate = useNavigate();
  const { unreadMessagesCount } = useAuth();

  const tabs = [
    { id: 'market', action: onMarketClick || (() => navigate('/')), icon: ShoppingBag, label: 'Mercado' },
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
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white/80 dark:bg-vuttik-navy/80 backdrop-blur-lg shadow-[0_-8px_32px_0_rgba(6,11,25,0.04)] border-t border-outline-variant/20">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
                        (tab.id === 'profile' && (activeTab === 'business_dash' || activeTab === 'negocio_dash' || activeTab === 'guardian_dash' || activeTab === 'mega_guardian_dash'));

        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => tab.action ? tab.action() : navigate(tab.path)}
              className="relative flex-1 flex flex-col items-center justify-center active:scale-95 transition-all duration-200"
            >
              <div className="relative flex items-center justify-center text-vuttik-blue">
                <Icon size={40} strokeWidth={2} />
              </div>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => tab.action ? tab.action() : tab.path && navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${isActive ? 'text-vuttik-blue dark:text-sky-accent font-bold' : 'text-on-surface-variant dark:text-outline-variant hover:text-vuttik-blue'}`}
          >
            <motion.div
              whileTap={{ scale: 0.8 }}
              className="relative flex flex-col items-center"
            >
              {tab.id === 'profile' && profileEmoji ? (
                <div className="relative mb-1">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="absolute -top-2 -right-2 text-xs">{profileEmoji}</span>
                </div>
              ) : tab.id === 'messages' && unreadMessagesCount > 0 ? (
                <div className="relative mb-1">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                </div>
              ) : (
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
              )}
              <span className="font-label-sm text-[10px] uppercase">
                {tab.label}
              </span>
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}

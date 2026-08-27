import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(user.uid);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await api.markAllNotificationsRead(user.uid);
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy mb-2">Tus Notificaciones</h1>
          <p className="text-vuttik-text-muted">Mantente al día con lo que sucede en tu cuenta.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-vuttik-text-muted text-sm font-bold rounded-xl hover:text-vuttik-blue hover:border-vuttik-blue hover:bg-vuttik-blue/5 transition-all"
          >
            <CheckCheck size={16} />
            <span className="hidden md:inline">Marcar todas como leídas</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
              <Bell size={40} />
            </div>
            <h3 className="text-xl font-bold text-vuttik-navy">No tienes notificaciones</h3>
            <p className="text-vuttik-text-muted">Aquí aparecerán todas tus alertas y mensajes importantes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`p-6 md:p-8 flex gap-6 relative transition-colors cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/20' : ''}`}
              >
                {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-vuttik-blue" />}
                
                <div className={`mt-1 shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20' : 'bg-gray-100 text-gray-400'}`}>
                  <Bell size={20} />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <h3 className={`text-lg font-black ${!n.is_read ? 'text-vuttik-blue' : 'text-vuttik-navy'}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-vuttik-text-muted font-bold">
                      {new Date(n.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <p className="text-vuttik-text-muted leading-relaxed max-w-3xl">
                    {n.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

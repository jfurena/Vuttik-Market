import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, User, Activity, AlertTriangle, 
  CheckCircle, MessageSquare, Trash2, PlusCircle, 
  ThumbsUp, UserPlus, LogIn, ExternalLink, Ban, Search
} from 'lucide-react';

interface AuditLogEntry {
  id: number;
  user_id: string;
  user_name: string;
  user_avatar: string;
  action: string;
  target_id: string;
  target_type: string;
  metadata: string;
  timestamp: string;
}

import { api } from '../lib/api';
import { auth } from '../lib/firebase';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBan = async (targetUid: string) => {
    if (!auth.currentUser) return;
    if (!window.confirm('¿Estás seguro de que deseas banear a este usuario?')) return;
    try {
      await api.banUser(targetUid, auth.currentUser.uid);
      alert('Usuario baneado correctamente');
      fetchLogs();
    } catch (err) {
      console.error('Failed to ban user:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLog();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_PRODUCT': return <PlusCircle size={18} className="text-green-500" />;
      case 'DELETE_PRODUCT': return <Trash2 size={18} className="text-red-500" />;
      case 'CREATE_POST': return <Activity size={18} className="text-blue-500" />;
      case 'COMMENT': return <MessageSquare size={18} className="text-purple-500" />;
      case 'FOLLOW': return <UserPlus size={18} className="text-vuttik-blue" />;
      case 'VOTE_VERACITY': return <CheckCircle size={18} className="text-orange-500" />;
      case 'SEND_MESSAGE': return <MessageSquare size={18} className="text-gray-400" />;
      default: return <History size={18} className="text-gray-400" />;
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase();
  };

  const formatMetadata = (metadataStr: string) => {
    try {
      const meta = JSON.parse(metadataStr);
      if (meta.title) return `"${meta.title}"`;
      if (meta.snippet) return `"${meta.snippet}..."`;
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-black text-vuttik-navy">Registro de Actividad</h2>
          <p className="text-vuttik-text-muted text-sm mt-1">Control global de acciones para evitar trolls y spam.</p>
        </div>
        <div className="flex items-center gap-3 bg-vuttik-navy/5 px-4 py-2 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-widest text-vuttik-navy">En vivo</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-vuttik-blue/20 border-t-vuttik-blue rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-vuttik-text-muted font-bold">Cargando registros...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Usuario</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Acción</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Objeto</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Fecha</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border-b border-gray-50 hover:bg-vuttik-gray/30 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-vuttik-navy flex items-center justify-center text-white text-xs font-black overflow-hidden shadow-md">
                            {log.user_avatar ? (
                              <img src={log.user_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              log.user_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-vuttik-navy">{log.user_name || 'Usuario desconocido'}</p>
                            <p className="text-[10px] text-vuttik-text-muted font-bold truncate w-24">ID: {log.user_id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-[11px] font-black uppercase tracking-tighter text-vuttik-navy bg-vuttik-gray px-2 py-1 rounded-lg">
                            {formatAction(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-vuttik-navy capitalize truncate">
                              {log.target_type}: {log.target_id.substring(0, 8)}
                            </span>
                            <button className="text-vuttik-blue hover:text-vuttik-blue/80">
                              <ExternalLink size={12} />
                            </button>
                          </div>
                          <span className="text-[10px] text-vuttik-text-muted font-medium italic truncate">
                            {formatMetadata(log.metadata)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <p className="text-xs font-black text-vuttik-text-muted">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] font-bold text-vuttik-text-muted opacity-60">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleBan(log.user_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Banear Usuario"
                        >
                          <Ban size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

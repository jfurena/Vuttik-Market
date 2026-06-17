import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Store, User, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEscapeKey } from '../hooks/useEscapeKey';

export default function GlobalInviteModal() {
  const { globalInviteData, setGlobalInviteData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEscapeKey(() => setGlobalInviteData(null));

  if (!globalInviteData) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.acceptBusinessInvite(globalInviteData.id);
      setGlobalInviteData(null);
      // Opcional: Navegar al perfil o recargar
      navigate('/perfil');
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Error al aceptar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.deleteBusinessMember(globalInviteData.id);
      setGlobalInviteData(null);
    } catch (error) {
      console.error('Error rejecting invite:', error);
      alert('Error al rechazar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-vuttik-navy/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-[32px] w-full max-w-md p-8 relative shadow-2xl flex flex-col items-center text-center"
        >
          <button 
            onClick={() => setGlobalInviteData(null)}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-vuttik-navy hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-24 h-24 bg-vuttik-gray rounded-[28px] overflow-hidden flex items-center justify-center shadow-lg mb-6">
            {globalInviteData.business_logo ? (
              <img src={globalInviteData.business_logo} className="w-full h-full object-cover" />
            ) : (
              <Store size={40} className="text-vuttik-navy" />
            )}
          </div>

          <h2 className="text-2xl font-display font-black text-vuttik-navy mb-2">Invitación a Negocio</h2>
          <p className="text-vuttik-text-muted mb-6">
            Has sido invitado a formar parte del equipo de administración de <strong className="text-vuttik-navy">{globalInviteData.business_name || 'este negocio'}</strong>.
          </p>

          <div className="flex gap-4 w-full">
            <button 
              onClick={handleReject}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors"
            >
              Rechazar
            </button>
            <button 
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-vuttik-navy text-white font-bold rounded-2xl hover:bg-vuttik-blue transition-colors shadow-lg shadow-vuttik-navy/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /> Aceptar</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

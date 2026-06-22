import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Store, User, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalBusinessSelector() {
  const { user, switchProfileMode, showGlobalBusinessSelector, setShowGlobalBusinessSelector } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (showGlobalBusinessSelector && user) {
      setLoading(true);
      api.getBusinesses(user.originalUid || user.uid)
        .then((data) => {
          if (Array.isArray(data)) {
            setBusinesses(data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading businesses:', err);
          setLoading(false);
        });
    }
  }, [showGlobalBusinessSelector, user]);

  if (!showGlobalBusinessSelector) return null;

  const handleSelect = (uid: string) => {
    switchProfileMode(uid);
    setShowGlobalBusinessSelector(false);
    navigate('/panel/negocio');
  };

  const handleCreate = () => {
    setShowGlobalBusinessSelector(false);
    navigate('/panel/negocio');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-vuttik-navy/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[32px] w-full max-w-4xl p-8 relative shadow-2xl flex flex-col max-h-[90vh]"
        >
          <button 
            onClick={() => setShowGlobalBusinessSelector(false)}
            className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-vuttik-navy hover:bg-gray-200 transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-black text-vuttik-navy mb-2">Selecciona un Perfil</h2>
            <p className="text-vuttik-text-muted">Elige con cuál negocio deseas interactuar.</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-vuttik-blue animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
              
              {/* Opción Crear Nuevo */}
              <div 
                onClick={handleCreate}
                className="group cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-vuttik-blue rounded-[32px] p-8 flex flex-col items-center justify-center text-center transition-all hover:bg-blue-50/50 min-h-[240px]"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Store size={32} className="text-vuttik-blue" />
                </div>
                <h3 className="font-bold text-vuttik-navy text-lg">Crear Negocio</h3>
                <p className="text-xs text-vuttik-text-muted mt-2">Abre un nuevo perfil comercial</p>
              </div>

              {/* Lista de Negocios */}
              {businesses.map((b) => (
                <div 
                  key={b.uid}
                  onClick={() => handleSelect(b.uid)}
                  className="group cursor-pointer bg-white border border-gray-100 hover:border-vuttik-blue rounded-[32px] p-8 flex flex-col items-center text-center transition-all hover:shadow-xl min-h-[240px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="text-vuttik-blue" size={20} />
                  </div>
                  
                  <div className="w-20 h-20 rounded-[24px] bg-vuttik-gray mb-4 overflow-hidden flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store size={32} className="text-vuttik-navy" />
                    )}
                  </div>
                  <h3 className="font-bold text-vuttik-navy text-lg line-clamp-1">{b.name}</h3>
                  <p className="text-xs text-vuttik-text-muted mt-2 uppercase tracking-wider font-bold">
                    {b.category || 'Negocio'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

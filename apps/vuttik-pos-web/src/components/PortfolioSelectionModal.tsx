import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Folder, Lock, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Portfolio {
  id: string;
  name: string;
  isPublic: boolean;
  products: any[];
}

interface PortfolioSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  product: any;
}

export default function PortfolioSelectionModal({ isOpen, onClose, userId, product }: PortfolioSelectionModalProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen && userId) {
      fetchPortfolios();
    }
  }, [isOpen, userId]);

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const data = await api.getPortfolios(userId);
      setPortfolios(data);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    setSaving(true);
    try {
      const res = await api.createPortfolio(userId, { name: newPortfolioName.trim(), isPublic });
      setPortfolios([...portfolios, res]);
      setIsCreating(false);
      setNewPortfolioName('');
    } catch (error) {
      console.error('Error creating portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPortfolio = async (portfolioId: string) => {
    setSaving(true);
    try {
      await api.addProductToPortfolio(portfolioId, product, 1);
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} 
          className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm" 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden z-10"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-black text-vuttik-navy">Guardar en Portafolio</h3>
            <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-500 transition-colors shadow-sm border border-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                {portfolios.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {portfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAddToPortfolio(p.id)}
                        disabled={saving}
                        className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-vuttik-blue hover:bg-vuttik-blue/5 transition-all flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center shrink-0 border border-gray-100">
                          <Folder size={18} className="text-vuttik-blue" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{p.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            {p.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                            {p.isPublic ? 'Público' : 'Privado'} • {p.products?.length || 0} items
                          </p>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-vuttik-blue flex items-center justify-center" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4 text-sm">No tienes portafolios creados aún.</p>
                )}

                {!isCreating ? (
                  <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-vuttik-blue hover:text-vuttik-blue transition-colors mt-4"
                  >
                    <Plus size={18} /> Crear Nuevo Portafolio
                  </button>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4 mt-4">
                    <input 
                      type="text" 
                      placeholder="Nombre del portafolio..." 
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-vuttik-blue outline-none text-sm font-medium"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setIsPublic(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${!isPublic ? 'border-vuttik-blue bg-vuttik-blue/10 text-vuttik-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Privado</button>
                      <button onClick={() => setIsPublic(true)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${isPublic ? 'border-vuttik-blue bg-vuttik-blue/10 text-vuttik-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Público</button>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setIsCreating(false)} className="flex-1 py-2 text-sm text-gray-500 font-bold">Cancelar</button>
                      <button onClick={handleCreatePortfolio} disabled={saving || !newPortfolioName.trim()} className="flex-1 py-2 bg-vuttik-blue text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50">Crear</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

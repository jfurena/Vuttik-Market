import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Plus, Package } from 'lucide-react';
import { api } from '../lib/api';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface MarketSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: any) => Promise<void>;
  portfolioId: string;
}

export default function MarketSearchModal({ isOpen, onClose, onAddProduct, portfolioId }: MarketSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  useEscapeKey(onClose, isOpen);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Usar getProducts simulando que retorna todos si no hay categoría, o añadir search en api.ts
      const data = await api.getProducts('GLOBAL');
      
      // Filtrar localmente por búsqueda
      const filtered = data.filter((p: any) => 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.business?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setProducts(filtered);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (product: any) => {
    setAddingIds(prev => new Set(prev).add(product.id));
    try {
      await onAddProduct(product);
      // Opcional: mostrar un mini toast de éxito
    } catch (error) {
      console.error('Error adding product to portfolio', error);
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
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
          className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-gray-100 flex flex-col gap-4 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-vuttik-navy">Añadir desde Mercado Global</h3>
              <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-500 transition-colors shadow-sm border border-gray-100">
                <X size={18} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar productos, negocios o categorías..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 font-medium outline-none focus:border-vuttik-blue transition-colors shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin" /></div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-gray-200 transition-colors shadow-sm">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                      {(product.images?.[0] || product.image) ? (
                        <img src={product.images[0] || product.image} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={24} className="opacity-40 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{product.title}</h4>
                      <p className="text-xs text-gray-500 truncate mb-1">{product.business || product.authorName}</p>
                      <p className="font-black text-vuttik-navy text-sm">${(parseFloat(product.price) || 0).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleAdd(product)}
                      disabled={addingIds.has(product.id)}
                      className="w-10 h-10 shrink-0 rounded-xl bg-vuttik-blue/10 text-vuttik-blue hover:bg-vuttik-blue hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {addingIds.has(product.id) ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
                <p className="text-gray-500 text-sm">No se encontraron productos en el mercado para tu búsqueda.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

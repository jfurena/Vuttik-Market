import React, { useState } from 'react';
import { ShoppingBag, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface PublishSelectionProps {
  onSelect: (type: 'product' | 'social' | 'bulk' | 'ai-menu' | 'ai-receipt') => void;
  onClose: () => void;
}

export default function PublishSelection({ onSelect, onClose }: PublishSelectionProps) {
  const [showAiOptions, setShowAiOptions] = useState(false);
  useEscapeKey(onClose, true);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-black text-vuttik-navy">¿Qué quieres publicar?</h2>
          <button onClick={onClose} className="p-2 hover:bg-vuttik-gray rounded-full transition-colors">
            <X size={24} className="text-vuttik-navy" />
          </button>
        </div>

        
        {showAiOptions ? (
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => onSelect('ai-menu')}
              className="group flex items-center gap-6 p-6 bg-vuttik-gray hover:bg-orange-500 transition-all rounded-[32px] text-left"
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ShoppingBag size={32} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-vuttik-navy group-hover:text-white transition-colors">Subir Menú Completo</h3>
                <p className="text-sm text-vuttik-text-muted group-hover:text-white/80 transition-colors font-medium">Extrae múltiples productos de la carta.</p>
              </div>
            </button>
            <button 
              onClick={() => onSelect('ai-receipt')}
              className="group flex items-center gap-6 p-6 bg-vuttik-gray hover:bg-vuttik-blue transition-all rounded-[32px] text-left"
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ShoppingBag size={32} className="text-vuttik-blue" />
              </div>
              <div>
                <h3 className="text-lg font-black text-vuttik-navy group-hover:text-white transition-colors">Subir Recibo</h3>
                <p className="text-sm text-vuttik-text-muted group-hover:text-white/80 transition-colors font-medium">Extrae múltiples productos de tu factura.</p>
              </div>
            </button>
            <button onClick={() => setShowAiOptions(false)} className="mt-2 text-center text-vuttik-text-muted font-bold hover:text-vuttik-navy">Volver</button>
          </div>
        ) : (
<div className="grid grid-cols-1 gap-4">

          <button 
            onClick={() => setShowAiOptions(true)}
            className="group flex items-center gap-6 p-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all rounded-[32px] text-left"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-white group-hover:text-white transition-colors">Escaneo Inteligente (IA)</h3>
              <p className="text-sm text-white/80 transition-colors font-medium">Sube una foto y la IA hará el trabajo por ti.</p>
            </div>
          </button>
          <button 
            onClick={() => onSelect('product')}
            className="group flex items-center gap-6 p-6 bg-vuttik-gray hover:bg-vuttik-blue transition-all rounded-[32px] text-left"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <ShoppingBag size={32} className="text-vuttik-blue" />
            </div>
            <div>
              <h3 className="text-lg font-black text-vuttik-navy group-hover:text-white transition-colors">Producto o Servicio</h3>
              <p className="text-sm text-vuttik-text-muted group-hover:text-white/80 transition-colors font-medium">Vende, compra o alquila en el mercado.</p>
            </div>
          </button>

          <button 
            onClick={() => onSelect('social')}
            className="group flex items-center gap-6 p-6 bg-vuttik-gray hover:bg-vuttik-navy transition-all rounded-[32px] text-left"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Globe size={32} className="text-vuttik-blue" />
            </div>
            <div>
              <h3 className="text-lg font-black text-vuttik-navy group-hover:text-white transition-colors">Publicación Social</h3>
              <p className="text-sm text-vuttik-text-muted group-hover:text-white/80 transition-colors font-medium">Comparte hallazgos, ofertas o noticias.</p>
            </div>
          </button>

          <button 
            onClick={() => onSelect('bulk')}
            className="group flex items-center gap-6 p-6 bg-vuttik-gray hover:bg-green-600 transition-all rounded-[32px] text-left"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-vuttik-navy group-hover:text-white transition-colors">Subir Base de Datos</h3>
              <p className="text-sm text-vuttik-text-muted group-hover:text-white/80 transition-colors font-medium">Sube múltiples productos desde Excel o CSV.</p>
            </div>
          </button>
        </div>
              )}
      </motion.div>
    </div>
  );
}

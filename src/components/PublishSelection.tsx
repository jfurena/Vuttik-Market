import { ShoppingBag, Globe, X } from 'lucide-react';
import { motion } from 'motion/react';

interface PublishSelectionProps {
  onSelect: (type: 'product' | 'social') => void;
  onClose: () => void;
}

export default function PublishSelection({ onSelect, onClose }: PublishSelectionProps) {
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

        <div className="grid grid-cols-1 gap-4">
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
        </div>
      </motion.div>
    </div>
  );
}

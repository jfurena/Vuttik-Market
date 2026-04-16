import { motion } from 'motion/react';
import { X, MapPin, Calendar, ShieldCheck, Star, Share2, Edit2, Trash2, Clock, Info, Building2, TrendingUp, Users, Eye, Tag, Phone } from 'lucide-react';
import { ProductCardProps } from './ProductCard';
import { useEffect, useState } from 'react';
import { trackMetric } from '../utils/metrics';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface ProductDetailsProps {
  product: any;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

export default function ProductDetails({ product, onClose, onEdit, onDelete, currentUserId }: ProductDetailsProps) {
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    trackMetric({
      userId: currentUserId || 'anonymous',
      action: 'view',
      targetId: product.id,
      targetType: 'product',
      metadata: { category: product.category, type: product.type }
    });
  }, [product.id]);

  useEffect(() => {
    const q = query(collection(db, 'transactionTypes'), orderBy('label', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; label: string }));
      setTransactionTypes(types);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactionTypes');
    });
    return () => unsubscribe();
  }, []);

  const isAuthor = currentUserId === product.authorId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] md:max-h-[90vh]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 bg-white/80 backdrop-blur-md rounded-full text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all shadow-lg"
        >
          <X size={20} className="md:size-6" />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-gray-100 relative group h-[30vh] md:h-auto shrink-0">
          <img 
            src={product.image || product.images?.[0] || 'https://picsum.photos/seed/detail/1200/1200'} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
          {product.isOnSale && (
            <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl">
              Oferta Especial
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto no-scrollbar flex flex-col">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <span className="bg-vuttik-blue/10 text-vuttik-blue text-[8px] md:text-[10px] font-black px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest">
              {product.category}
            </span>
            <span className={`text-white text-[8px] md:text-[10px] font-black px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest ${
              product.typeId === 'sell' ? 'bg-green-500' : 
              product.typeId === 'buy' ? 'bg-vuttik-blue' : 'bg-vuttik-navy'
            }`}>
              {transactionTypes.find(t => t.id === product.typeId)?.label || product.typeId}
            </span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-display font-black text-vuttik-navy mb-2">{product.title}</h2>
          
          <div className="flex flex-col gap-1 md:gap-2 mb-6 md:mb-8">
            <div className="flex items-center gap-2 text-vuttik-text-muted">
              <MapPin size={14} className="text-vuttik-blue md:size-[18px]" />
              <span className="text-xs md:text-sm font-bold">{product.location || 'Ubicación no especificada'}</span>
              {product.location && (
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.location)}`, '_blank')}
                  className="ml-2 p-1.5 bg-vuttik-blue/10 text-vuttik-blue rounded-lg hover:bg-vuttik-blue hover:text-white transition-all flex items-center gap-1.5"
                >
                  <MapPin size={12} />
                  <span className="text-[10px] font-black uppercase">Ver en Mapa</span>
                </button>
              )}
            </div>
            {product.business && (
              <div className="flex items-center gap-2 text-vuttik-text-muted">
                <Building2 size={14} className="text-vuttik-blue md:size-[18px]" />
                <span className="text-xs md:text-sm font-bold">Cadena: {product.business}</span>
              </div>
            )}
            {product.phone && (
              <div className="flex items-center gap-2 text-vuttik-text-muted">
                <Phone size={14} className="text-vuttik-blue md:size-[18px]" />
                <a href={`tel:${product.phone}`} className="text-xs md:text-sm font-bold hover:text-vuttik-blue transition-colors">
                  {product.phone}
                </a>
              </div>
            )}
            {product.barcode && (
              <div className="flex items-center gap-2 text-vuttik-text-muted">
                <Info size={14} className="text-vuttik-blue md:size-[18px]" />
                <span className="text-xs md:text-sm font-bold">Código: {product.barcode}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
            <div className="bg-vuttik-gray p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100">
              <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-1">Precio</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-4xl font-display font-black text-vuttik-navy">{product.isOnSale ? product.salePrice : product.price}</span>
                <span className="text-[10px] md:text-sm font-bold text-vuttik-text-muted">{product.currency}</span>
              </div>
            </div>
            {product.isOnSale && (
              <div className="bg-vuttik-gray p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 opacity-60">
                <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-1">Precio Regular</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-3xl font-display font-black text-vuttik-text-muted line-through">{product.price}</span>
                  <span className="text-[10px] md:text-sm font-bold text-vuttik-text-muted">{product.currency}</span>
                </div>
              </div>
            )}
          </div>

          {product.description && (
            <div className="mb-6 md:mb-10">
              <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-2">Descripción</p>
              <p className="text-xs md:text-sm text-vuttik-navy leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Custom Fields */}
          {product.customFields && Object.keys(product.customFields).length > 0 && (
            <div className="mb-6 md:mb-10">
              <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-4">Especificaciones</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(product.customFields).map(([key, value]) => {
                  // Try to find the field name if we have categories, but for now we'll just show the value
                  // In a real app, we might want to pass the category object to get the field labels
                  return (
                    <div key={key} className="bg-vuttik-gray/50 px-4 py-3 rounded-2xl flex flex-col">
                      <span className="text-[9px] font-black text-vuttik-text-muted uppercase tracking-wider">{key}</span>
                      <span className="text-xs md:text-sm font-bold text-vuttik-navy">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Author Info */}
          <div className="bg-white border border-gray-100 rounded-[24px] md:rounded-[32px] p-4 md:p-6 mb-6 md:mb-10 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-vuttik-navy text-white flex items-center justify-center text-base md:text-xl font-black">
                  {product.authorName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm md:text-lg font-black text-vuttik-navy">{product.authorName || 'Usuario'}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-yellow-400">
                      <Star size={10} className="md:size-[14px]" fill="currentColor" />
                      <span className="text-[10px] md:text-xs font-bold ml-1">4.5</span>
                    </div>
                    <span className="text-[10px] md:text-xs text-vuttik-text-muted font-bold">• Alta Confianza</span>
                  </div>
                </div>
              </div>
              <ShieldCheck className="text-vuttik-blue" size={24} />
            </div>
            <p className="text-[10px] md:text-xs text-vuttik-text-muted font-medium leading-relaxed">
              Publicado el {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Recientemente'}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-3 md:gap-4">
            <div className="flex gap-3 md:gap-4">
              <button className="flex-1 vuttik-button !py-3 md:!py-5 !text-sm md:!text-lg !rounded-2xl md:!rounded-3xl shadow-xl shadow-vuttik-blue/20">
                {product.typeId === 'buy' ? 'Tomar Pedido' : 'Contactar Ahora'}
              </button>
              <button className="p-3 md:p-5 bg-vuttik-gray rounded-xl md:rounded-[24px] text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all">
                <Share2 size={20} className="md:size-6" />
              </button>
            </div>

            {isAuthor && (
              <div className="flex gap-3 md:gap-4">
                <button 
                  onClick={() => onEdit?.(product.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 md:py-4 bg-white border-2 border-vuttik-navy text-vuttik-navy rounded-2xl md:rounded-3xl font-black text-xs md:text-sm hover:bg-vuttik-navy hover:text-white transition-all"
                >
                  <Edit2 size={14} className="md:size-[18px]" />
                  Editar
                </button>
                <button 
                  onClick={() => onDelete?.(product.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 md:py-4 bg-red-50 text-red-500 rounded-2xl md:rounded-3xl font-black text-xs md:text-sm hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={14} className="md:size-[18px]" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

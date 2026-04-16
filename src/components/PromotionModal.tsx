import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Megaphone, Target, Users, CreditCard, DollarSign, Package, Globe, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetId?: string;
  initialTargetType?: 'product' | 'post';
}

export default function PromotionModal({ isOpen, onClose, initialTargetId = '', initialTargetType = 'product' }: PromotionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoType, setPromoType] = useState<'post' | 'product'>(initialTargetType);
  const [promoTargetId, setPromoTargetId] = useState(initialTargetId);
  const [promoAudience, setPromoAudience] = useState<'global' | 'segmented'>('global');
  const [promoBudget, setPromoBudget] = useState('50');
  const [segmentCategory, setSegmentCategory] = useState('');
  const [segmentLocation, setSegmentLocation] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'categories'));
    getDocs(q).then(snapshot => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleCreatePromotion = async () => {
    if (!auth.currentUser || !promoTargetId) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'promotions'), {
        businessId: auth.currentUser.uid,
        targetType: promoType,
        targetId: promoTargetId,
        audience: promoAudience,
        segment: promoAudience === 'segmented' ? {
          category: segmentCategory,
          location: segmentLocation
        } : null,
        budget: parseFloat(promoBudget),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'promotions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted hover:bg-vuttik-blue hover:text-white transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-10">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-display font-black text-vuttik-navy mb-2">¡Promoción Solicitada!</h3>
              <p className="text-vuttik-text-muted">Tu campaña está siendo procesada y se activará pronto.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-vuttik-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-vuttik-blue/20">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">Promocionar Contenido</h3>
                  <p className="text-sm text-vuttik-text-muted font-bold uppercase tracking-wider">Llega a miles de usuarios</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPromoType('product')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${promoType === 'product' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/30'}`}
                  >
                    <Package size={20} className={promoType === 'product' ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                    <p className="font-bold text-sm mt-2">Producto</p>
                  </button>
                  <button 
                    onClick={() => setPromoType('post')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${promoType === 'post' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/30'}`}
                  >
                    <Globe size={20} className={promoType === 'post' ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                    <p className="font-bold text-sm mt-2">Publicación</p>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Audiencia</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPromoAudience('global')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${promoAudience === 'global' ? 'bg-vuttik-navy text-white' : 'bg-vuttik-gray text-vuttik-navy'}`}
                    >
                      <Users size={18} />
                      Global
                    </button>
                    <button 
                      onClick={() => setPromoAudience('segmented')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${promoAudience === 'segmented' ? 'bg-vuttik-navy text-white' : 'bg-vuttik-gray text-vuttik-navy'}`}
                    >
                      <Target size={18} />
                      Segmentada
                    </button>
                  </div>
                </div>

                {promoAudience === 'segmented' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Categoría</label>
                      <select 
                        value={segmentCategory}
                        onChange={(e) => setSegmentCategory(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                      >
                        <option value="">Todas</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Ubicación</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Santo Domingo"
                        value={segmentLocation}
                        onChange={(e) => setSegmentLocation(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Presupuesto (USD)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                    <input 
                      type="number" 
                      value={promoBudget}
                      onChange={(e) => setPromoBudget(e.target.value)}
                      className="w-full bg-vuttik-gray border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-vuttik-text-muted font-medium px-1">
                    <AlertCircle size={10} className="inline mr-1" />
                    El presupuesto determina el alcance y la duración de la notificación.
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleCreatePromotion}
                    disabled={isSubmitting || !promoTargetId}
                    className="w-full bg-vuttik-blue text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-vuttik-blue/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Pagar y Promocionar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

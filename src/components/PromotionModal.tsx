import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Target, Users, CreditCard, DollarSign, Package, Globe, X, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Calendar, Clock, BarChart3 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LemonSqueezyMockCheckout from './LemonSqueezyMockCheckout';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetId?: string;
  initialTargetType?: 'product' | 'post';
}

export default function PromotionModal({ isOpen, onClose, initialTargetId = '', initialTargetType = 'product' }: PromotionModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoType, setPromoType] = useState<'post' | 'product'>(initialTargetType);
  const [promoTargetId, setPromoTargetId] = useState(initialTargetId);
  
  // Segmentation
  const [promoAudience, setPromoAudience] = useState<'global' | 'segmented'>('global');
  const [segmentCategory, setSegmentCategory] = useState('');
  const [segmentLocation, setSegmentLocation] = useState('');
  const [segmentAgeMin, setSegmentAgeMin] = useState('18');
  const [segmentAgeMax, setSegmentAgeMax] = useState('65');
  const [segmentGender, setSegmentGender] = useState('');
  const [segmentLanguage, setSegmentLanguage] = useState('');
  
  // Budget & Schedule
  const [promoBudget, setPromoBudget] = useState('50');
  const [promoDuration, setPromoDuration] = useState('7');
  const [promoStartDate, setPromoStartDate] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCats();
  }, []);

  const handleOpenCheckout = () => {
    if (!user || !promoTargetId) return;
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    setIsCheckoutOpen(false);
    setIsSubmitting(true);
    try {
      await api.createPromotion({
        businessId: user.uid,
        targetType: promoType,
        targetId: promoTargetId,
        audience: promoAudience,
        segment: promoAudience === 'segmented' ? {
          category: segmentCategory,
          location: segmentLocation,
          ageMin: parseInt(segmentAgeMin) || 18,
          ageMax: parseInt(segmentAgeMax) || 65,
          gender: segmentGender,
          language: segmentLanguage
        } : null,
        budget: parseFloat(promoBudget),
        durationDays: parseInt(promoDuration) || 7,
        startDate: promoStartDate || new Date().toISOString(),
        status: 'pending'
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setStep(1);
      }, 2000);
    } catch (error) {
      console.error('Error creating promotion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const estimatedReach = Math.floor(parseFloat(promoBudget || '0') * 15.4 * (promoAudience === 'segmented' ? 0.7 : 1));

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
        className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted hover:bg-vuttik-blue hover:text-white transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-display font-black text-vuttik-navy mb-2">¡Campaña Programada!</h3>
              <p className="text-vuttik-text-muted">Tu promoción está siendo procesada y se activará según lo programado.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-vuttik-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-vuttik-blue/20 shrink-0">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">Crear Campaña</h3>
                  <p className="text-sm text-vuttik-text-muted font-bold uppercase tracking-wider">Paso {step} de 3</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex gap-2 mb-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${step >= i ? 'bg-vuttik-blue' : 'bg-gray-100'}`} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* STEP 1: Content & Audience */}
                  {step === 1 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPromoType('product')}
                          className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${promoType === 'product' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/30'}`}
                        >
                          <Package size={20} className={promoType === 'product' ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                          <span className="font-bold text-sm">Producto</span>
                        </button>
                        <button 
                          onClick={() => setPromoType('post')}
                          className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${promoType === 'post' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/30'}`}
                        >
                          <Globe size={20} className={promoType === 'post' ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />
                          <span className="font-bold text-sm">Publicación</span>
                        </button>
                      </div>

                      <div className="space-y-2 mt-6">
                        <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest ml-1">Audiencia Objetivo</label>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setPromoAudience('global')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${promoAudience === 'global' ? 'bg-vuttik-navy text-white shadow-lg shadow-vuttik-navy/20' : 'bg-vuttik-gray text-vuttik-navy'}`}
                          >
                            <Users size={18} />
                            Global (Todo Vuttik)
                          </button>
                          <button 
                            onClick={() => setPromoAudience('segmented')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${promoAudience === 'segmented' ? 'bg-vuttik-navy text-white shadow-lg shadow-vuttik-navy/20' : 'bg-vuttik-gray text-vuttik-navy'}`}
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
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-5 bg-vuttik-gray/50 rounded-[24px] border border-gray-100"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">País/Ubicación</label>
                            <input 
                              type="text" 
                              placeholder="Ej: República Dominicana"
                              value={segmentLocation}
                              onChange={(e) => setSegmentLocation(e.target.value)}
                              className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-vuttik-blue focus:ring-2 focus:ring-vuttik-blue/10"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Idioma</label>
                            <select 
                              value={segmentLanguage}
                              onChange={(e) => setSegmentLanguage(e.target.value)}
                              className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-vuttik-blue focus:ring-2 focus:ring-vuttik-blue/10 appearance-none"
                            >
                              <option value="">Todos los idiomas</option>
                              <option value="es">Español</option>
                              <option value="en">Inglés</option>
                              <option value="pt">Portugués</option>
                              <option value="fr">Francés</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Rango de Edad</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                placeholder="Min"
                                value={segmentAgeMin}
                                onChange={(e) => setSegmentAgeMin(e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-center"
                              />
                              <span className="text-vuttik-text-muted font-bold">-</span>
                              <input 
                                type="number" 
                                placeholder="Max"
                                value={segmentAgeMax}
                                onChange={(e) => setSegmentAgeMax(e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-center"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Género</label>
                            <select 
                              value={segmentGender}
                              onChange={(e) => setSegmentGender(e.target.value)}
                              className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-vuttik-blue appearance-none"
                            >
                              <option value="">Todos</option>
                              <option value="Masculino">Hombres</option>
                              <option value="Femenino">Mujeres</option>
                            </select>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* STEP 2: Schedule & Budget */}
                  {step === 2 && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest ml-1">Fecha de Inicio (Opcional)</label>
                          <div className="relative">
                            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" />
                            <input 
                              type="date" 
                              value={promoStartDate}
                              onChange={(e) => setPromoStartDate(e.target.value)}
                              className="w-full bg-vuttik-gray border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all text-vuttik-navy"
                            />
                          </div>
                          <p className="text-[10px] text-vuttik-text-muted font-medium ml-1">Si dejas esto vacío, iniciará de inmediato.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest ml-1">Duración (Días)</label>
                          <div className="relative">
                            <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" />
                            <input 
                              type="number" 
                              value={promoDuration}
                              onChange={(e) => setPromoDuration(e.target.value)}
                              min="1"
                              max="365"
                              className="w-full bg-vuttik-gray border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all text-vuttik-navy"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mt-6">
                        <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest ml-1">Presupuesto Total (USD)</label>
                        <div className="relative">
                          <DollarSign size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                          <input 
                            type="number" 
                            value={promoBudget}
                            onChange={(e) => setPromoBudget(e.target.value)}
                            min="1"
                            className="w-full bg-vuttik-gray border-none rounded-[24px] pl-16 pr-6 py-6 text-2xl font-black text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/20 transition-all"
                          />
                        </div>
                        <div className="flex justify-between items-center px-2 mt-2">
                          <p className="text-[11px] text-vuttik-text-muted font-medium">
                            <AlertCircle size={12} className="inline mr-1" />
                            Gasto promedio de ${(parseFloat(promoBudget) / (parseInt(promoDuration) || 1)).toFixed(2)} por día.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 3: Summary */}
                  {step === 3 && (
                    <div className="bg-gray-50 rounded-[24px] p-6 space-y-6">
                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center shrink-0">
                          <BarChart3 size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Alcance Estimado</p>
                          <h4 className="text-2xl font-display font-black text-vuttik-navy">{estimatedReach.toLocaleString()} <span className="text-sm font-bold text-vuttik-text-muted">vistas</span></h4>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Resumen de la Campaña</h4>
                        <div className="bg-white p-4 rounded-2xl shadow-sm text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-vuttik-text-muted font-bold">Tipo:</span>
                            <span className="font-black text-vuttik-navy">{promoType === 'post' ? 'Publicación' : 'Producto'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vuttik-text-muted font-bold">Audiencia:</span>
                            <span className="font-black text-vuttik-navy">{promoAudience === 'global' ? 'Global' : 'Segmentada'}</span>
                          </div>
                          {promoAudience === 'segmented' && (
                            <div className="flex justify-between text-xs pl-4 border-l-2 border-gray-100">
                              <span className="text-vuttik-text-muted">{segmentAgeMin}-{segmentAgeMax} años, {segmentGender || 'Todos'}, {segmentLocation || 'Global'}, {segmentLanguage ? segmentLanguage.toUpperCase() : 'Cualquier idioma'}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-vuttik-text-muted font-bold">Duración:</span>
                            <span className="font-black text-vuttik-navy">{promoDuration} días</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vuttik-text-muted font-bold">Inicio:</span>
                            <span className="font-black text-vuttik-navy">{promoStartDate ? new Date(promoStartDate).toLocaleDateString() : 'Inmediato'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-vuttik-blue/10 p-5 rounded-2xl flex justify-between items-center border border-vuttik-blue/20">
                        <span className="font-black text-vuttik-blue uppercase tracking-widest text-sm">Total a pagar</span>
                        <span className="font-display font-black text-2xl text-vuttik-blue">${parseFloat(promoBudget).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex gap-3">
                    {step > 1 && (
                      <button 
                        onClick={() => setStep(step - 1)}
                        className="px-6 py-4 rounded-2xl bg-vuttik-gray text-vuttik-navy font-bold hover:bg-gray-200 transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                    )}
                    
                    {step < 3 ? (
                      <button 
                        onClick={() => setStep(step + 1)}
                        className="flex-1 bg-vuttik-navy text-white py-4 rounded-[20px] font-black shadow-xl shadow-vuttik-navy/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        Continuar
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleOpenCheckout}
                        disabled={isSubmitting || !promoTargetId}
                        className="flex-1 bg-vuttik-blue text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-vuttik-blue/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CreditCard size={20} />
                            Pagar e Iniciar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>

      <LemonSqueezyMockCheckout 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
        planName={`Campaña: ${promoDuration} días`}
        planPrice={parseFloat(promoBudget) || 0}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Star, Shield, TrendingUp, Zap, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import LemonSqueezyMockCheckout from './LemonSqueezyMockCheckout';

export default function MyPlan() {
  const { user, login, token } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getSubscriptionPlans();
      // Sort plans by order_index
      setPlans(data.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan: any) => {
    if (!user) return;
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    if (!user || !selectedPlan) return;
    
    setIsCheckoutOpen(false);
    setProcessingId(selectedPlan.id);
    
    try {
      // Obtener perfil completo del servidor para no perder ningún campo
      const fullProfile = await api.getUser(user.uid);
      
      const updatedUser = {
        uid: user.uid,
        email: user.email,
        displayName: fullProfile.displayName || fullProfile.display_name || user.displayName,
        photoURL: fullProfile.photoURL || fullProfile.photo_url || user.photoURL,
        role: fullProfile.role || user.role,
        planId: selectedPlan.id,
      };
      
      await api.saveUser(updatedUser);
      
      // Actualizar el estado de autenticación local
      if (token) {
        login(token, { ...user, planId: selectedPlan.id });
      }
      
      alert(`¡Felicidades! Te has suscrito exitosamente al plan "${selectedPlan.name}". ¡Bienvenido!`);
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Hubo un error al procesar tu suscripción. Por favor intenta de nuevo.');
    } finally {
      setProcessingId(null);
      setSelectedPlan(null);
    }
  };

  const featuresList = [
    { id: 'market', label: 'Acceso a Marketplace' },
    { id: 'social', label: 'Red Social' },
    { id: 'business_dash', label: 'Panel de Negocios' },
    { id: 'admin_dash', label: 'Panel de Administración' },
    { id: 'analytics', label: 'Analíticas Avanzadas' },
    { id: 'premium_support', label: 'Soporte Premium' },
    { id: 'promotions', label: 'Crear Promociones' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentPlanId = user?.planId || 'free';

  return (
    <div className="flex-1 bg-gray-50/50 overflow-y-auto custom-scrollbar p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-black text-vuttik-navy mb-4">Elige tu Plan</h1>
          <p className="text-vuttik-text-muted text-lg max-w-2xl mx-auto">
            Desbloquea todo el potencial de Vuttik con nuestros planes diseñados para hacer crecer tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Planes Dinámicos desde la BD */}
          {plans.filter(p => !p.is_hidden).map((plan, index) => {
            const isCurrent = currentPlanId === plan.id;
            const isProcessing = processingId === plan.id;
            
            const isFeatured = plan.is_recommended;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className={`bg-white rounded-3xl p-8 border-2 relative flex flex-col ${
                  isCurrent 
                    ? 'border-vuttik-blue shadow-lg shadow-vuttik-blue/20' 
                    : isFeatured 
                      ? 'border-vuttik-blue/50 shadow-2xl' 
                      : 'border-transparent shadow-xl'
                }`}
              >
                {isCurrent && isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2 w-max">
                    <div className="bg-vuttik-blue text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                      Tu Plan Actual
                    </div>
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                      <Star size={12} fill="currentColor" />
                      Recomendado
                    </div>
                  </div>
                )}
                {isCurrent && !isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-vuttik-blue text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                    Tu Plan Actual
                  </div>
                )}
                {!isCurrent && isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Star size={12} fill="currentColor" />
                    Recomendado
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-black text-vuttik-navy">${plan.price}</span>
                    <span className="text-vuttik-text-muted font-bold">/mes</span>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                  {[...featuresList].sort((a, b) => {
                    const aHas = plan.features?.includes(a.id);
                    const bHas = plan.features?.includes(b.id);
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    return 0;
                  }).map(feature => {
                    const hasFeature = plan.features?.includes(feature.id);
                    return (
                      <div key={feature.id} className={`flex items-center gap-3 ${!hasFeature ? 'opacity-40' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          hasFeature ? 'bg-vuttik-blue/10 text-vuttik-blue' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className={`text-sm font-bold leading-tight ${hasFeature ? 'text-vuttik-navy' : 'text-gray-500 line-through'}`}>
                          {feature.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || isProcessing || plan.is_coming_soon}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest mt-8 transition-colors flex items-center justify-center gap-2 ${
                    isCurrent 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : plan.is_coming_soon
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isFeatured
                          ? 'bg-vuttik-blue text-white hover:bg-opacity-90 shadow-lg shadow-vuttik-blue/30'
                          : 'bg-vuttik-navy text-white hover:bg-opacity-90'
                  }`}
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isCurrent ? (
                    'Activo'
                  ) : plan.is_coming_soon ? (
                    'Próximamente'
                  ) : (
                    <>
                      Suscribirse
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <LemonSqueezyMockCheckout 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
        planName={selectedPlan?.name || ''}
        planPrice={selectedPlan?.price || 0}
      />
    </div>
  );
}

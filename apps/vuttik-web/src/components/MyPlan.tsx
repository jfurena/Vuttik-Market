import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Star, Zap, Building2, ChevronRight, Sparkles, BadgeCheck, BarChart2, ShoppingCart, Package, Map, FileText, Headphones, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import CrossmintCheckout from './CrossmintCheckout';

const FEATURE_META: Record<string, { label: string }> = {
  market:             { label: 'Acceso al Marketplace' },
  social:             { label: 'Red Social' },
  ai_publish:         { label: 'IA para publicar productos' },
  unlimited_products: { label: 'Productos ilimitados' },
  no_ads:             { label: 'Sin anuncios' },
  basic_analytics:    { label: 'Estadísticas básicas' },
  advanced_analytics: { label: 'Analíticas avanzadas' },
  verified_badge:     { label: 'Sello de negocio verificado' },
  pos_access:         { label: 'Acceso al POS de Vuttik' },
  bulk_upload:        { label: 'Carga masiva de productos' },
  advanced_offermap:  { label: 'Filtros avanzados en OfferMap' },
  price_reports:      { label: 'Informes de precios de mercado' },
  priority_support:   { label: 'Soporte prioritario' },
};

const PLAN_TIER_FEATURES: Record<string, { includes?: string, added: string[] }> = {
  free: {
    includes: 'Características base:',
    added: ['market', 'social', 'ai_publish', 'unlimited_products', 'bulk_upload']
  },
  emprendedor: {
    includes: 'Todo en Gratis, más:',
    added: ['no_ads', 'basic_analytics', 'verified_badge']
  },
  business: {
    includes: 'Todo en Emprendedor, más:',
    added: ['advanced_analytics', 'pos_access', 'advanced_offermap', 'price_reports', 'priority_support']
  }
};

export default function MyPlan() {
  const { user, login, token } = useAuth();
  const [plans, setPlans]                   = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [annual, setAnnual]                 = useState(false);
  const [processingId, setProcessingId]     = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan]     = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getSubscriptionPlans();
      setPlans(data.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan: any) => {
    if (!user) return;
    setSelectedPlan({ ...plan, billingCycle: annual ? 'annual' : 'monthly' });
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    if (!user || !selectedPlan) return;
    setIsCheckoutOpen(false);
    setProcessingId(selectedPlan.id);
    try {
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
      if (token) login(token, { ...user, planId: selectedPlan.id });
      alert(`¡Felicidades! Te has suscrito al plan "${selectedPlan.name}". ¡Bienvenido!`);
    } catch (error) {
      alert('Hubo un error al procesar tu suscripción. Por favor intenta de nuevo.');
    } finally {
      setProcessingId(null);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlanId = user?.planId || 'free';
  const visiblePlans  = plans.filter(p => !p.is_hidden && ['free', 'emprendedor', 'business'].includes(p.id));

  const planIcons: Record<string, React.ReactNode> = {
    free:        <Zap size={22} className="text-gray-500" />,
    emprendedor: <Star size={22} className="text-amber-500" />,
    business:    <Building2 size={22} className="text-vuttik-blue" />,
  };

  return (
    <div className="flex-1 bg-gray-50/50 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-display font-black text-vuttik-navy mb-3">
            Elige tu Plan
          </h1>
          <p className="text-vuttik-text-muted text-lg max-w-xl mx-auto">
            Todas las herramientas que necesitas para crecer en Vuttik.
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-bold transition-colors ${!annual ? 'text-vuttik-navy' : 'text-vuttik-text-muted'}`}>
            Mensual
          </span>
          <button
            onClick={() => setAnnual(a => !a)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${annual ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${annual ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${annual ? 'text-vuttik-navy' : 'text-vuttik-text-muted'}`}>
            Anual
          </span>
          <AnimatePresence>
            {annual && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full"
              >
                🎉 2 meses gratis
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visiblePlans.map((plan, index) => {
            const isCurrent    = currentPlanId === plan.id;
            const isProcessing = processingId === plan.id;
            const isFeatured   = !!plan.is_recommended;
            const isFree       = plan.id === 'free';
            const displayPrice = annual && !isFree ? plan.annual_price : plan.price;
            const suffix       = isFree ? '' : annual ? '/año' : '/mes';
            const savings      = annual && !isFree ? Math.round(plan.price * 12 - plan.annual_price) : 0;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index }}
                className={`relative flex flex-col rounded-3xl border-2 overflow-hidden ${
                  isFeatured
                    ? 'border-vuttik-blue shadow-2xl shadow-vuttik-blue/20'
                    : isCurrent
                      ? 'border-vuttik-blue/40 shadow-lg'
                      : 'border-transparent shadow-xl'
                }`}
              >
                {/* Featured Badge (Invisible placeholder on non-featured cards to preserve perfectly symmetrical alignment) */}
                <div className={`px-6 py-2 flex items-center justify-center gap-2 ${isFeatured ? 'bg-gradient-to-r from-vuttik-blue to-blue-500' : 'opacity-0 pointer-events-none'}`}>
                  <Star size={13} fill="white" className="text-white" />
                  <span className="text-white text-xs font-black uppercase tracking-widest">Más Popular</span>
                  <Star size={13} fill="white" className="text-white" />
                </div>

                <div className="flex-1 p-7 flex flex-col bg-white">
                  {/* Name & icon */}
                  <div className="flex items-center gap-3 mb-5 h-[40px]">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFeatured ? 'bg-vuttik-blue/10' : 'bg-gray-100'}`}>
                      {planIcons[plan.id] ?? <Zap size={22} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-vuttik-navy">{plan.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest">Tu plan actual</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4 h-[64px] flex flex-col justify-start">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-vuttik-navy leading-none">
                        {isFree ? 'Gratis' : `$${displayPrice}`}
                      </span>
                      {!isFree && (
                        <span className="text-vuttik-text-muted font-bold text-sm">{suffix}</span>
                      )}
                    </div>
                    {annual && savings > 0 && (
                      <p className="text-green-600 text-xs font-bold mt-2">Ahorras ${savings} al año</p>
                    )}
                    {!annual && !isFree && plan.annual_price > 0 && (
                      <p className="text-vuttik-text-muted text-xs mt-2">
                        o ${plan.annual_price}/año con plan anual
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-100 mb-4" />

                  {/* Features */}
                  <div className="flex-1 mb-6 flex flex-col">
                    {PLAN_TIER_FEATURES[plan.id]?.includes && (
                      <p className="text-sm font-bold text-vuttik-text-muted mb-4 pb-3 border-b border-gray-100">
                        {PLAN_TIER_FEATURES[plan.id]?.includes}
                      </p>
                    )}
                    <ul className="space-y-3">
                      {PLAN_TIER_FEATURES[plan.id]?.added.map(fid => {
                        const meta = FEATURE_META[fid];
                        if (!meta) return null;
                        return (
                          <li key={fid} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-vuttik-blue/10 text-vuttik-blue mt-0.5">
                              <Check size={11} strokeWidth={3} />
                            </span>
                            <span className="text-sm font-semibold leading-tight text-vuttik-navy">
                              {meta.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent || isProcessing || !!plan.is_coming_soon || isFree}
                    className={`mt-auto w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                      isCurrent || isFree
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan.is_coming_soon
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isFeatured
                            ? 'bg-vuttik-blue text-white hover:bg-blue-600 shadow-lg shadow-vuttik-blue/30 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-vuttik-navy text-white hover:bg-opacity-90 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isCurrent ? (
                      'Plan Activo ✓'
                    ) : isFree ? (
                      'Plan Actual'
                    ) : plan.is_coming_soon ? (
                      'Próximamente'
                    ) : (
                      <>Elegir {plan.name} <ChevronRight size={16} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-vuttik-text-muted text-xs mt-8 font-medium">
          Todos los precios en USD · Cancela cuando quieras · Sin penalidades
        </p>
      </div>

      {isCheckoutOpen && selectedPlan && (
        <CrossmintCheckout
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          price={String(annual && selectedPlan.annual_price ? selectedPlan.annual_price : selectedPlan.price)}
          onSuccess={handleCheckoutSuccess}
          onCancel={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  );
}

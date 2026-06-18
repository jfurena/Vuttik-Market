/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import P2PBoard from './components/P2PBoard';
import Auth from './components/Auth';
import OnboardingModal from './components/OnboardingModal';
import MissingDemographicsModal from './components/MissingDemographicsModal';
import GlobalInviteModal from './components/GlobalInviteModal';

// Lazy loaded heavy routes to reduce initial JS bundle size
const Chat = lazy(() => import('./components/Chat'));
const Profile = lazy(() => import('./components/Profile'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const VerifyEmail = lazy(() => import('./components/VerifyEmail'));
const MegaGuardianDashboard = lazy(() => import('./components/MegaGuardianDashboard'));
const GuardianDashboard = lazy(() => import('./components/GuardianDashboard'));
const BusinessDashboard = lazy(() => import('./components/BusinessDashboard'));
const NegocioDashboard = lazy(() => import('./components/NegocioDashboard'));
const CategoryExplorer = lazy(() => import('./components/CategoryExplorer'));
const SocialFeed = lazy(() => import('./components/SocialFeed'));
const PublishForm = lazy(() => import('./components/PublishForm'));
const ProductDetails = lazy(() => import('./components/ProductDetails'));
const PublishSelection = lazy(() => import('./components/PublishSelection'));
const MyPlan = lazy(() => import('./components/MyPlan'));
const Settings = lazy(() => import('./components/Settings'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const LemonSqueezyMockCheckout = lazy(() => import('./components/LemonSqueezyMockCheckout'));
const GlobalBusinessSelector = lazy(() => import('./components/GlobalBusinessSelector'));
const Herramientas = lazy(() => import('./components/Herramientas'));
const EanRecollector = lazy(() => import('./components/EanRecollector'));
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { trackMetric } from './utils/metrics';
import { Ban, Mail } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

function EditFormWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return <PublishForm editProductId={id} onComplete={() => navigate('/')} onCancel={() => navigate(-1)} />;
}

export default function App() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [marketCategory, setMarketCategory] = useState<string | null>(null);
  const [marketType, setMarketType] = useState('buy');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPublishSelection, setShowPublishSelection] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle'|'success'|'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [skipVerify, setSkipVerify] = useState(false);

  const userProfile = user;
  const userPlan = user ? { id: user.planId || 'free', name: user.planId || 'free', features: ['profile', 'settings'] } : null;

  useEffect(() => {
    if (selectedProductId) {
      const loadProduct = async () => {
        try {
          const products = await api.getProducts();
          const product = products.find((p: any) => p.id === selectedProductId);
          if (product) setSelectedProduct(product);
        } catch (err) {
          console.error('Error loading product details:', err);
        }
      };
      loadProduct();
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (user) {
      trackMetric({
        userId: user.uid,
        action: 'click',
        targetId: location.pathname,
        targetType: 'user',
        metadata: { path: location.pathname }
      });
    }
  }, [location.pathname, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname === '/reset-password') {
      return <ResetPassword />;
    }
    if (location.pathname === '/verificar') {
      return <VerifyEmail />;
    }
    return <Auth onLogin={() => {}} />;
  }

  if (userProfile?.isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Ban size={48} />
          </div>
          <h1 className="text-3xl font-display font-black text-vuttik-navy">Cuenta Suspendida</h1>
          <p className="text-vuttik-text-muted">Tu cuenta ha sido suspendida por un Mega Guardian debido a infracciones de las normas de la comunidad.</p>
          <button 
            onClick={() => logout()}
            className="w-full py-4 bg-vuttik-navy text-white rounded-2xl font-black uppercase tracking-widest"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (user && !user.onboardingCompleted) {
    return <OnboardingModal onComplete={() => window.location.reload()} />;
  }

  const handleCategorySelect = (categoryId: string, type: string) => {
    setMarketCategory(categoryId);
    setMarketType(type);
    
    if (user) {
      trackMetric({
        userId: user.uid,
        action: 'search',
        targetId: categoryId,
        targetType: 'category',
        metadata: { type }
      });
    }
  };

  const handlePublishSelect = (type: 'product' | 'social') => {
    setShowPublishSelection(false);
    if (type === 'product') {
      navigate('/publicar');
    } else {
      navigate('/social');
    }
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/social')) return 'social';
    if (path.startsWith('/mensajes')) return 'messages';
    if (path.startsWith('/perfil')) return 'profile';
    if (path.startsWith('/panel/negocio')) return 'business';
    if (path.startsWith('/panel/empresa')) return 'business_dash';
    if (path.startsWith('/panel/guardian')) return 'guardian_dash';
    if (path.startsWith('/panel/mega-guardian')) return 'mega_guardian_dash';
    if (path.startsWith('/publicar')) return 'publish';
    if (path.startsWith('/mi-plan')) return 'myplan';
    if (path.startsWith('/herramientas')) return 'tools';
    if (path.startsWith('/ajustes')) return 'settings';
    return 'market';
  };

  const activeTab = getActiveTab();

  if (!user.emailVerified && user.role !== 'mega_guardian' && !skipVerify && location.pathname !== '/verificar') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-vuttik-blue/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-vuttik-blue" />
          </div>
          <h2 className="text-2xl font-black text-vuttik-navy">Verifica tu correo</h2>
          <p className="text-sm text-vuttik-text-muted">
            Hemos enviado un enlace de verificación a <strong>{user.email}</strong>. Por favor, haz clic en el enlace para activar tu cuenta.
          </p>
          <button 
            onClick={() => {
              api.resendVerification()
                .then(() => {
                  setResendStatus('success');
                  setResendMessage('¡Correo reenviado! Revisa tu bandeja.');
                  setTimeout(() => setResendStatus('idle'), 5000);
                })
                .catch(e => {
                  setResendStatus('error');
                  setResendMessage(e.message);
                  setTimeout(() => setResendStatus('idle'), 5000);
                });
            }}
            className="w-full bg-vuttik-blue text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform mt-4"
          >
            Reenviar enlace de verificación
          </button>
          
          <AnimatePresence>
            {resendStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`w-full p-3 rounded-xl text-sm font-bold ${resendStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {resendMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex w-full gap-2 mt-2">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 py-2 text-xs font-bold text-vuttik-text-muted hover:text-vuttik-navy transition-colors"
            >
              Ya lo verifiqué
            </button>
            {user.email === 'jfurena02@gmail.com' && (
              <button 
                onClick={() => setSkipVerify(true)}
                className="flex-1 py-2 text-xs font-bold text-vuttik-blue hover:text-blue-700 transition-colors"
              >
                Verificar después
              </button>
            )}
            <button 
              onClick={logout}
              className="flex-1 py-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar 
        activeTab={activeTab} 
        userRole={userProfile?.role || 'user'}
        userPlan={userPlan}
        onPublishClick={() => setShowPublishSelection(true)}
        onMarketClick={() => {
          setMarketCategory(null);
          navigate('/');
        }}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopNav 
          userRole={userProfile?.role || 'user'} 
          userPlan={userPlan}
          userProfile={userProfile}
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pt-20 md:pt-24 pb-24 md:pb-10">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-[1600px] mx-auto w-full"
              >
                <Routes location={location}>
                  <Route path="/" element={
                    (!marketCategory && !new URLSearchParams(location.search).get('q')) ? 
                      <CategoryExplorer onSelectCategory={handleCategorySelect} /> :
                      <P2PBoard 
                        initialCategory={marketCategory || 'GLOBAL'} 
                        initialType={marketType}
                        onViewDetails={(id) => setSelectedProductId(id)} 
                        onBack={() => {
                          setMarketCategory(null);
                          if (new URLSearchParams(location.search).get('q')) {
                            navigate('/');
                          }
                        }}
                      />
                  } />
                  <Route path="/social" element={<SocialFeed onNavigateToProfile={(uid) => navigate('/perfil/' + uid)} />} />
                  <Route path="/mensajes" element={<Chat />} />
                  <Route path="/perfil/:userId" element={<Profile currentUserId={user.uid} onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/perfil" element={<Profile currentUserId={user.uid} onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/@:username" element={<Profile currentUserId={user.uid} onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/notificaciones" element={<NotificationsPage />} />
                  <Route path="/panel/empresa" element={<BusinessDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/panel/negocio" element={<NegocioDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/panel/guardian" element={<GuardianDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                  <Route path="/panel/mega-guardian" element={<MegaGuardianDashboard />} />
                  <Route path="/publicar" element={<PublishForm onComplete={() => navigate('/')} onCancel={() => navigate('/')} />} />
                  <Route path="/editar/:id" element={<EditFormWrapper />} />
                  <Route path="/checkout" element={<LemonSqueezyMockCheckout isOpen={true} onClose={() => {}} onSuccess={() => {}} planName="Plan" planPrice={0} />} />
                  <Route path="/mi-plan" element={<MyPlan />} />
                  <Route path="/herramientas" element={<Herramientas />} />
                  <Route path="/herramientas/ean-recollector" element={<EanRecollector />} />
                  <Route path="/ajustes" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>

        <BottomNav 
          activeTab={activeTab} 
          onPublishClick={() => setShowPublishSelection(true)} 
          onMarketClick={() => {
            setMarketCategory(null);
            navigate('/');
          }}
        />
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProductId && selectedProduct && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div></div>}>
            <ProductDetails 
              product={selectedProduct}
              onClose={() => setSelectedProductId(null)}
              onEdit={(id) => {
                navigate(`/editar/${id}`);
                setSelectedProductId(null); // Close the details modal
              }}
              onDelete={async (id) => {
                if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                  try {
                    await api.deleteProduct(id, user?.uid || '');
                    setSelectedProductId(null);
                    window.location.reload(); // Refresh to reflect deletion globally
                  } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('Hubo un error al eliminar el producto.');
                  }
                }
              }}
              currentUserId={user?.uid || ''}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Publish Selection Modal */}
      <AnimatePresence>
        {showPublishSelection && (
          <Suspense fallback={null}>
            <PublishSelection 
              onSelect={handlePublishSelect}
              onClose={() => setShowPublishSelection(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <GlobalBusinessSelector />
      <GlobalInviteModal />
      <MissingDemographicsModal />
    </div>
  );
}

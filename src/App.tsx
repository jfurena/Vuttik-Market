/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import P2PBoard from './components/P2PBoard';
import Auth from './components/Auth';
import Chat from './components/Chat';
import Profile from './components/Profile';
import MegaGuardianDashboard from './components/MegaGuardianDashboard';
import GuardianDashboard from './components/GuardianDashboard';
import BusinessDashboard from './components/BusinessDashboard';
import NegocioDashboard from './components/NegocioDashboard';
import CategoryExplorer from './components/CategoryExplorer';
import SocialFeed from './components/SocialFeed';
import PublishForm from './components/PublishForm';
import ProductDetails from './components/ProductDetails';
import PublishSelection from './components/PublishSelection';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { trackMetric } from './utils/metrics';
import { Ban } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [marketCategory, setMarketCategory] = useState<string | null>(null);
  const [marketType, setMarketType] = useState('sell');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPublishSelection, setShowPublishSelection] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
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
    if (path.startsWith('/panel/negocio')) return 'negocio_dash';
    if (path.startsWith('/panel/empresa')) return 'business_dash';
    if (path.startsWith('/panel/guardian')) return 'guardian_dash';
    if (path.startsWith('/panel/mega-guardian')) return 'mega_guardian_dash';
    if (path.startsWith('/publicar')) return 'publish';
    return 'market';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar 
        activeTab={activeTab} 
        userRole={userProfile?.role || 'user'}
        userPlan={userPlan}
        onPublishClick={() => setShowPublishSelection(true)}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopNav 
          userRole={userProfile?.role || 'user'} 
          userPlan={userPlan}
          userProfile={userProfile}
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-24 md:pb-10">
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
                  !marketCategory ? 
                    <CategoryExplorer onSelectCategory={handleCategorySelect} /> :
                    <P2PBoard 
                      initialCategory={marketCategory} 
                      initialType={marketType}
                      onViewDetails={(id) => setSelectedProductId(id)} 
                      onBack={() => setMarketCategory(null)}
                    />
                } />
                <Route path="/social" element={<SocialFeed onNavigateToProfile={(uid) => navigate('/perfil/' + uid)} />} />
                <Route path="/mensajes" element={<Chat />} />
                <Route path="/perfil/:userId" element={<Profile currentUserId={user.uid} onViewProduct={(id) => setSelectedProductId(id)} />} />
                <Route path="/perfil" element={<Profile currentUserId={user.uid} onViewProduct={(id) => setSelectedProductId(id)} />} />
                <Route path="/panel/empresa" element={<BusinessDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                <Route path="/panel/negocio" element={<NegocioDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                <Route path="/panel/guardian" element={<GuardianDashboard onViewProduct={(id) => setSelectedProductId(id)} />} />
                <Route path="/panel/mega-guardian" element={<MegaGuardianDashboard />} />
                <Route path="/publicar" element={<PublishForm onComplete={() => navigate('/')} onCancel={() => navigate('/')} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activeTab={activeTab} onPublishClick={() => setShowPublishSelection(true)} />
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProductId && selectedProduct && (
          <ProductDetails 
            product={selectedProduct}
            onClose={() => setSelectedProductId(null)}
            onEdit={(id) => console.log('Edit', id)}
            onDelete={(id) => setSelectedProductId(null)}
            currentUserId={user?.uid || ''}
          />
        )}
      </AnimatePresence>

      {/* Publish Selection Modal */}
      <AnimatePresence>
        {showPublishSelection && (
          <PublishSelection 
            onSelect={handlePublishSelect}
            onClose={() => setShowPublishSelection(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

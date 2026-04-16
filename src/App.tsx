/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
import AdminDashboard from './components/AdminDashboard';
import CategoryExplorer from './components/CategoryExplorer';
import SocialFeed from './components/SocialFeed';
import PublishForm from './components/PublishForm';
import ProductDetails from './components/ProductDetails';
import PublishSelection from './components/PublishSelection';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { Ban } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  const [marketCategory, setMarketCategory] = useState<string | null>(null);
  const [marketType, setMarketType] = useState('sell');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPublishSelection, setShowPublishSelection] = useState(false);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setUserProfile(null);
        setUserPlan(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        try {
          const profile = await api.getUser(user.uid);
          setUserProfile(profile);
          
          // Note: In SQL migration, plan info is currently embedded or fetched separately
          // For now, we use a default plan if not found
          setUserPlan({ id: profile.plan_id || 'free', name: profile.plan_id || 'free', features: ['profile', 'settings'] });
        } catch (err) {
          if (user.email === 'jfurena02@gmail.com') {
            const ownerProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Mega Guardian',
              role: 'admin',
              plan_id: 'mega',
              created_at: new Date().toISOString()
            };
            setUserProfile(ownerProfile);
            await api.saveUser(ownerProfile);
          }
        }
      };
      loadProfile();
    }
  }, [user]);

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
        targetId: activeTab,
        targetType: 'user',
        metadata: { tab: activeTab }
      });
    }
  }, [activeTab, user]);

  if (!isAuthReady) {
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
            onClick={() => auth.signOut()}
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

  const handleTabChange = (tab: string) => {
    if (tab === 'publish') {
      setShowPublishSelection(true);
      return;
    }
    if (tab === 'market') {
      setMarketCategory(null);
    }
    if (tab === 'profile') {
      setViewProfileUserId(null);
    }
    setActiveTab(tab);
  };

  const handlePublishSelect = (type: 'product' | 'social') => {
    setShowPublishSelection(false);
    if (type === 'product') {
      setActiveTab('publish');
    } else {
      setActiveTab('social');
      // In a real app, we might trigger the social publish modal directly
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        if (!marketCategory) {
          return <CategoryExplorer onSelectCategory={handleCategorySelect} />;
        }
        return (
          <P2PBoard 
            initialCategory={marketCategory} 
            initialType={marketType}
            onViewDetails={(id) => setSelectedProductId(id)} 
            onBack={() => setMarketCategory(null)}
          />
        );
      case 'social':
        return <SocialFeed onNavigateToProfile={(uid) => {
          setViewProfileUserId(uid);
          setActiveTab('profile');
        }} />;
      case 'messages':
        return <Chat />;
      case 'profile':
        return <Profile 
          userId={viewProfileUserId || undefined} 
          currentUserId={user.uid} 
          onViewProduct={(id) => setSelectedProductId(id)}
        />;
      case 'business_dash':
        return <BusinessDashboard onViewProduct={(id) => setSelectedProductId(id)} />;
      case 'negocio_dash':
        return <NegocioDashboard onViewProduct={(id) => setSelectedProductId(id)} />;
      case 'guardian_dash':
        return <GuardianDashboard onViewProduct={(id) => setSelectedProductId(id)} />;
      case 'mega_guardian_dash':
        return <MegaGuardianDashboard />;
      case 'admin_dash':
        return <AdminDashboard />;
      case 'publish':
        return (
          <PublishForm 
            onComplete={() => {
              setMarketCategory('GLOBAL');
              setActiveTab('market');
            }} 
            onCancel={() => setActiveTab('market')} 
          />
        );
      default:
        return <P2PBoard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        userRole={userProfile?.role || 'user'}
        userPlan={userPlan}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopNav 
          userRole={userProfile?.role || 'user'} 
          userPlan={userPlan}
          userProfile={userProfile}
          onNavigate={(tab) => {
            if (tab === 'business') setActiveTab('business_dash');
            else if (tab === 'negocio') setActiveTab('negocio_dash');
            else if (tab === 'guardian') setActiveTab('guardian_dash');
            else if (tab === 'mega-guardian') setActiveTab('mega_guardian_dash');
            else if (tab === 'admin') setActiveTab('admin_dash');
            else if (tab === 'settings' || tab === 'profile') {
              setViewProfileUserId(null);
              setActiveTab('profile');
            }
          }} 
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-24 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (viewProfileUserId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1600px] mx-auto w-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
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



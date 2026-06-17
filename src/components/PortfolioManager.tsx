import React, { useState, useEffect, useMemo } from 'react';
import { Folder, Lock, Globe, Plus, Trash2, Edit2, ChevronLeft, Minus, ShoppingBag, Search } from 'lucide-react';
import { api } from '../lib/api';
import MarketSearchModal from './MarketSearchModal';

export default function PortfolioManager({ userId }: { userId: string }) {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<any | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, [userId]);

  const fetchPortfolios = async () => {
    try {
      const data = await api.getPortfolios(userId);
      setPortfolios(data);
    } catch (error) {
      console.error('Error fetching portfolios', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    setSaving(true);
    try {
      const res = await api.createPortfolio(userId, { name: newPortfolioName.trim(), isPublic });
      setPortfolios([...portfolios, res]);
      setIsCreating(false);
      setNewPortfolioName('');
    } catch (error) {
      console.error('Error creating portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este portafolio?')) return;
    try {
      await api.deletePortfolio(id, userId);
      setPortfolios(portfolios.filter(p => p.id !== id));
      if (selectedPortfolio?.id === id) setSelectedPortfolio(null);
    } catch (error) {
      console.error('Error deleting', error);
    }
  };

  const handleUpdateQuantity = async (productId: string, delta: number) => {
    if (!selectedPortfolio) return;
    const itemIndex = selectedPortfolio.products.findIndex((p: any) => p.product.id === productId);
    if (itemIndex === -1) return;

    const newQuantity = Math.max(1, selectedPortfolio.products[itemIndex].quantity + delta);
    
    // Optimistic update without immediate API call
    const updatedPortfolio = { ...selectedPortfolio };
    updatedPortfolio.products[itemIndex].quantity = newQuantity;
    setSelectedPortfolio(updatedPortfolio);
    setHasUnsavedChanges(true);
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedPortfolio) return;
    if (!confirm('¿Remover producto del portafolio? (Deberás guardar los cambios)')) return;
    
    const updatedPortfolio = { ...selectedPortfolio };
    updatedPortfolio.products = updatedPortfolio.products.filter((p: any) => p.product.id !== productId);
    setSelectedPortfolio(updatedPortfolio);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedPortfolio) return;
    setIsSavingChanges(true);
    try {
      await api.updatePortfolioProducts(selectedPortfolio.id, selectedPortfolio.products);
      setHasUnsavedChanges(false);
      // Fetch updated portfolio to sync
      const updated = await api.getPortfolios(userId);
      setPortfolios(updated);
    } catch (error) {
      console.error('Error saving changes', error);
      alert('Hubo un error al guardar los cambios.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleAddProductFromSearch = async (product: any) => {
    if (!selectedPortfolio) return;
    try {
      const updatedPortfolio = { ...selectedPortfolio };
      const existingIndex = updatedPortfolio.products.findIndex((p: any) => p.product.id === product.id);
      
      if (existingIndex !== -1) {
        updatedPortfolio.products[existingIndex].quantity += 1;
      } else {
        updatedPortfolio.products.push({ product, quantity: 1 });
      }
      
      setSelectedPortfolio(updatedPortfolio);
      setHasUnsavedChanges(true);
      setIsSearchModalOpen(false); // Close modal when added to let user see
    } catch (error) {
      console.error('Error adding product', error);
      throw error; // Let modal handle error
    }
  };

  const { majorityCurrency, totalMajority, totalUSD } = useMemo(() => {
    if (!selectedPortfolio || selectedPortfolio.products.length === 0) return { majorityCurrency: 'USD', totalMajority: 0, totalUSD: 0 };
    
    const currencyCounts: Record<string, number> = {};
    selectedPortfolio.products.forEach((item: any) => {
      const c = item.product.currency || 'DOP'; // Fallback a DOP por defecto para Dominicana
      currencyCounts[c] = (currencyCounts[c] || 0) + 1;
    });
    
    let majorityCurrency = 'DOP';
    let maxCount = 0;
    for (const [c, count] of Object.entries(currencyCounts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityCurrency = c;
      }
    }

    const EXCHANGE_RATES: Record<string, number> = {
      USD: 1,
      DOP: 59.5, // Tasa de cambio aprox
      EUR: 0.92,
    };

    const convertToUSD = (price: number, currency: string) => {
      const rate = EXCHANGE_RATES[currency] || 1;
      return price / rate;
    };

    const convertFromUSD = (usdPrice: number, currency: string) => {
      const rate = EXCHANGE_RATES[currency] || 1;
      return usdPrice * rate;
    };

    let totalUSD = 0;
    selectedPortfolio.products.forEach((item: any) => {
      const price = parseFloat(item.product.price) || 0;
      const currency = item.product.currency || 'DOP';
      totalUSD += convertToUSD(price * item.quantity, currency);
    });

    const totalMajority = convertFromUSD(totalUSD, majorityCurrency);

    return { majorityCurrency, totalMajority, totalUSD };
  }, [selectedPortfolio]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (selectedPortfolio) {
    return (
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm('Tienes cambios sin guardar. ¿Deseas salir de todos modos?')) return;
              }
              setSelectedPortfolio(null);
              setHasUnsavedChanges(false);
            }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-vuttik-navy flex items-center gap-2">
                {selectedPortfolio.name}
                {selectedPortfolio.isPublic ? <Globe size={16} className="text-gray-400" /> : <Lock size={16} className="text-gray-400" />}
              </h2>
              <p className="text-gray-500 text-sm">{selectedPortfolio.products.length} artículos</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Costo Estimado</p>
              <div className="flex flex-col items-end leading-none gap-1">
                <p className="text-2xl font-black text-vuttik-blue">
                  {majorityCurrency === 'USD' ? '$' : ''}{totalMajority.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-bold">{majorityCurrency}</span>
                </p>
                {majorityCurrency !== 'USD' && (
                  <p className="text-xs font-bold text-gray-500">
                    ≈ ${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSearchModalOpen(true)} className="flex items-center gap-2 bg-vuttik-blue/10 text-vuttik-blue px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-vuttik-blue/20 transition-colors">
                <Search size={16} /> Añadir Producto
              </button>
              {hasUnsavedChanges && (
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isSavingChanges}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isSavingChanges ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Edit2 size={16} />
                  )}
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedPortfolio.products.length > 0 ? (
          <div className="space-y-4">
            {selectedPortfolio.products.map((item: any) => (
              <div key={item.product.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                    <img src={item.product.images?.[0] || item.product.image || 'https://picsum.photos/seed/p/200/200'} alt="product" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{item.product.title}</h4>
                    <p className="text-xs text-gray-500">{item.product.business || item.product.authorName || 'Vendedor'}</p>
                    <p className="font-black text-vuttik-navy mt-1">
                      {item.product.currency === 'USD' ? '$' : ''}{(parseFloat(item.product.price) || 0).toLocaleString()} <span className="text-xs">{item.product.currency || 'DOP'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-6 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-vuttik-blue hover:text-vuttik-blue transition-colors text-gray-500">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-vuttik-blue hover:text-vuttik-blue transition-colors text-gray-500">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</p>
                    <p className="font-black text-gray-900">
                      {item.product.currency === 'USD' ? '$' : ''}{((parseFloat(item.product.price) || 0) * item.quantity).toLocaleString()} <span className="text-[10px]">{item.product.currency || 'DOP'}</span>
                    </p>
                  </div>
                  <button onClick={() => handleRemoveProduct(item.product.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Portafolio Vacío</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">Busca en el mercado global y añade productos a tu lista.</p>
            <button onClick={() => setIsSearchModalOpen(true)} className="inline-flex items-center gap-2 bg-vuttik-blue text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-colors">
              <Search size={18} /> Explorar Mercado
            </button>
          </div>
        )}

        <MarketSearchModal 
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onAddProduct={handleAddProductFromSearch}
          portfolioId={selectedPortfolio.id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map(p => (
          <div key={p.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:border-vuttik-blue hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => setSelectedPortfolio(p)}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-vuttik-blue/10 rounded-2xl flex items-center justify-center text-vuttik-blue">
                <Folder size={24} />
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(p.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </div>
            <h3 className="text-lg font-black text-vuttik-navy mb-1 line-clamp-1">{p.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                {p.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {p.isPublic ? 'Público' : 'Privado'}
              </span>
              <span>•</span>
              <span>{p.products?.length || 0} items</span>
            </div>
          </div>
        ))}
        {portfolios.length === 0 && !isCreating && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-[32px] bg-white">
            <Folder size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No tienes portafolios</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">Crea listas de seguimiento para guardar productos y cotizar tus compras.</p>
            <button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 bg-vuttik-blue text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-colors">
              <Plus size={18} /> Crear Nuevo Portafolio
            </button>
          </div>
        )}
        
        {isCreating && (
          <div className="bg-white rounded-[24px] p-6 shadow-md border border-vuttik-blue/30 relative overflow-hidden">
            <h3 className="text-lg font-black text-vuttik-navy mb-4">Nuevo Portafolio</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre del portafolio..." 
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-vuttik-blue outline-none text-sm font-medium"
              />
              <div className="flex gap-2">
                <button onClick={() => setIsPublic(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${!isPublic ? 'border-vuttik-blue bg-vuttik-blue/10 text-vuttik-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Privado</button>
                <button onClick={() => setIsPublic(true)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${isPublic ? 'border-vuttik-blue bg-vuttik-blue/10 text-vuttik-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Público</button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCreating(false)} className="flex-1 py-2 text-sm text-gray-500 font-bold">Cancelar</button>
                <button onClick={handleCreatePortfolio} disabled={saving || !newPortfolioName.trim()} className="flex-1 py-2 bg-vuttik-blue text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {portfolios.length > 0 && !isCreating && (
          <button onClick={() => setIsCreating(true)} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-vuttik-blue hover:border-vuttik-blue transition-all min-h-[160px]">
            <Plus size={32} className="mb-2" />
            <span className="font-bold">Crear Portafolio</span>
          </button>
        )}
      </div>
    </div>
  );
}

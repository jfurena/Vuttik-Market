import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, MapPin, Tag, Box, Coins, Store, Barcode, Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';
import CameraModal from './CameraModal';
import { useAuth } from '../contexts/AuthContext';
import { WORLD_CURRENCIES } from '../constants/currencies';
import { v4 as uuidv4 } from 'uuid';
import LocationInput from './LocationInput';
import PhoneInput from './PhoneInput';

interface AiScannerModalProps {
  onClose: () => void;
  mode: 'menu' | 'product';
}

export default function AiScannerModal({ onClose, mode }: AiScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsedMenu, setParsedMenu] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const { user, isBusinessModeActive } = useAuth();
  const [storeName, setStoreName] = useState(isBusinessModeActive && user?.businessName ? user.businessName : '');
  const [location, setLocation] = useState(isBusinessModeActive && user?.businessLocation ? user.businessLocation : (user?.location || ''));
  
  // Global fields for the Menu
  const [categories, setCategories] = useState<any[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<any[]>([]);
  const [globalCategory, setGlobalCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [globalType, setGlobalType] = useState('sell');
  const [globalCurrency, setGlobalCurrency] = useState(user?.currency || 'DOP');
  const [globalBarcode, setGlobalBarcode] = useState('');
  const [globalLat, setGlobalLat] = useState<number | null>(user?.lat || null);
  const [globalLng, setGlobalLng] = useState<number | null>(user?.lng || null);
  const [globalProvince, setGlobalProvince] = useState('');
  const [globalCountry, setGlobalCountry] = useState('');
  
  // New Global Fields added for parity with PublishForm
  const [phone, setPhone] = useState(user?.phone || '');
  const [chain, setChain] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [isOwner, setIsOwner] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, types] = await Promise.all([
          api.getCategories(),
          api.getTransactionTypes()
        ]);
        setCategories(cats);
        setTransactionTypes(types);
        if (cats.length > 0) { setGlobalCategory(cats[0].id); setCategorySearch(cats[0].name); }
        if (types.length > 0) { 
          const sellType = types.find((t: any) => t.id === 'sell');
          setGlobalType(sellType ? sellType.id : types[0].id); 
        }
      } catch (e) {
        console.error('Error fetching categories/types', e);
      }
    };
    fetchData();
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const handleCreateCategory = async (name: string) => {
    if (!name.trim()) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/categories/create-or-propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: name.trim().toUpperCase(), createdBy: user?.id })
      });
      const data = await response.json();
      
      if (data.status === 'proposed') {
        alert(`Has alcanzado tu límite de 10 categorías creadas. La categoría "${name.trim().toUpperCase()}" ha sido enviada a los guardianes para su aprobación.\nMientras tanto, por favor selecciona una categoría existente.`);
        setCategorySearch('');
        setGlobalCategory('');
      } else {
        setGlobalCategory(data.id);
        setCategorySearch(name.trim().toUpperCase());
        if (data.status === 'created') {
          setCategories(prev => [...prev, { id: data.id, name: name.trim().toUpperCase() }]);
        }
      }
      setShowCategoryDropdown(false);
    } catch (e) {
      console.error(e);
      alert('Error al crear la categora.');
    }
  };

  const handleCameraCapture = async (base64String: string) => {
    setShowCamera(false);
    setLoading(true);
    setError(null);
    setPreview(base64String);

    try {
      const res = await api.scanImageAI(base64String, mode);
      if (res.data) {
        const menuArray = Array.isArray(res.data) ? res.data : [res.data];
        setParsedMenu(menuArray);
      }
    } catch (err: any) {
      setError(err.message || 'Error analizando la imagen. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Compress the image before showing preview and uploading
      const base64String = await compressImage(file, 1200, 0.8);
      setPreview(base64String);
      
      try {
        const res = await api.scanImageAI(base64String, mode);
        if (res.data) {
          const menuArray = Array.isArray(res.data) ? res.data : [res.data];
          setParsedMenu(menuArray);
        }
      } catch (err: any) {
        setError(err.message || 'Error analizando la imagen. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    } catch (err: any) {
      setError('Error al procesar la imagen antes de subirla.');
      setLoading(false);
    }
  };


  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const newMenu = [...parsedMenu];
    newMenu[index] = { ...newMenu[index], [field]: value };
    setParsedMenu(newMenu);
  };
  const handleRemoveItem = (index: number) => {
    setParsedMenu(parsedMenu.filter((_, i) => i !== index));
  };

  const handlePublishMenu = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      
      if (!user) throw new Error('No estás autenticado');

      // Validate required fields
      if (!globalCategory) {
        setError('Por favor selecciona o crea una categoría antes de publicar.');
        setIsPublishing(false);
        return;
      }

      // Generate Menu Group ID
      const menuId = uuidv4();
      
      // Publish all items
      for (const item of parsedMenu) {
        if (!item.title || !item.price) continue;
        
        await api.publishProduct({
          title: item.title,
          price: Number(item.price),
          regularPrice: Number(item.price),
          categoryId: globalCategory,
          currency: globalCurrency,
          typeId: globalType || 'sell',
          status: 'active',
          authorId: isBusinessModeActive && user?.businessId ? user.businessId : user?.uid,
          authorName: isBusinessModeActive && user?.businessName ? user.businessName : (user?.displayName || 'Usuario'),
          authorAvatar: isBusinessModeActive && user?.businessLogo ? user.businessLogo : (user?.photoURL || ''),
          location: location,
          lat: globalLat,
          lng: globalLng,
          province: globalProvince,
          country: globalCountry,
          storeName: storeName,
          barcode: item.barcode || '',
          postedAs: isBusinessModeActive ? 'business' : 'personal',
          description: mode === 'menu' ? `Producto de menú: ${storeName || 'Lote automático'}` : `Producto escaneado: ${storeName || 'Lote automático'}`,
          isOffer: false,
          phone: phone,
          chain: chain,
          isIndependent: isIndependent,
          isOwner: isBusinessModeActive ? true : isOwner,
          customFields: mode === 'menu' ? { menuId: menuId, isMenuGroup: true, subCategory: item.category || '' } : { subCategory: item.category || '' },
            images: preview ? [preview] : []
        });
      }
      
      alert('Productos subidos con éxito!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al publicar los productos');
    } finally {
      setIsPublishing(false);
    }
  };


  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-vuttik-navy/40 backdrop-blur-sm md:p-4">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full h-full md:max-w-4xl md:mx-auto md:h-[90vh] bg-white md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-vuttik-gray">
          <h2 className="text-xl font-black text-vuttik-navy flex items-center gap-2">
            <span className="text-2xl">✨</span> 
            {mode === 'menu' ? 'Escáner de Menú Inteligente' : 'Escáner de Recibos Inteligente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-vuttik-navy" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!preview ? (
            <div className="flex flex-col items-center justify-center h-full text-center min-h-[400px]">
                <input 
                  type="file"
                  id="ai-image-upload"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                
                <div className="w-20 h-20 bg-gradient-to-tr from-vuttik-blue to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-vuttik-blue/20">
                  <Sparkles size={36} className="text-white" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-vuttik-navy mb-3">
                  {mode === 'menu' ? 'Digitaliza tu Menú' : 'Sube tus Recibos'}
                </h3>
                
                <p className="text-vuttik-text-muted font-medium max-w-md mx-auto mb-10 text-lg">
                  {mode === 'menu' 
                    ? 'Sube una foto clara de tu menú. Nuestra IA extraerá los platos y precios por ti en segundos.' 
                    : 'Toma foto de tu factura. La IA extraerá los productos y precios automáticamente.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-2xl">
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="flex-1 flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-vuttik-blue/40 rounded-[32px] hover:bg-vuttik-blue/5 hover:border-vuttik-blue hover:shadow-lg transition-all group"
                  >
                    <div className="w-20 h-20 bg-vuttik-blue/10 group-hover:bg-vuttik-blue/20 rounded-full flex items-center justify-center transition-colors">
                      <Camera size={40} className="text-vuttik-blue" />
                    </div>
                    <div>
                      <span className="block text-xl font-bold text-vuttik-navy mb-1">Cámara</span>
                      <span className="text-sm text-vuttik-text-muted">Tomar foto ahora</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex-1 flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-purple-500/40 rounded-[32px] hover:bg-purple-50 hover:border-purple-500 hover:shadow-lg transition-all group"
                  >
                    <div className="w-20 h-20 bg-purple-100 group-hover:bg-purple-200 rounded-full flex items-center justify-center transition-colors">
                      <Upload size={40} className="text-purple-600" />
                    </div>
                    <div>
                      <span className="block text-xl font-bold text-vuttik-navy mb-1">Galería</span>
                      <span className="text-sm text-vuttik-text-muted">Elegir archivo</span>
                    </div>
                  </button>
                </div>
              </div>
          ) : (
            <div className="space-y-6">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 size={48} className="text-vuttik-blue animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-vuttik-navy">La IA está haciendo magia...</h3>
                  <p className="text-vuttik-text-muted mt-2">Analizando imagen y extrayendo datos</p>
                  <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mt-6 opacity-50 blur-sm" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <img src={preview} alt="Uploaded menu" className="w-full h-auto rounded-xl shadow-md border border-gray-200 sticky top-0" />
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-bold text-lg text-vuttik-navy flex items-center gap-2">
                      <CheckCircle2 className="text-green-500" size={20} />
                      {parsedMenu.length} Productos encontrados
                    </h3>
                    
                    {error && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-sm text-vuttik-navy flex items-center gap-2 mb-1">
                        <Store size={16} className="text-vuttik-blue" />
                        Configuración Global del Menú
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Box size={14} className="text-gray-400 shrink-0" /> Categoría *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={(e) => {
                                setCategorySearch(e.target.value);
                                setShowCategoryDropdown(true);
                                setGlobalCategory('');
                              }}
                              onFocus={() => setShowCategoryDropdown(true)}
                              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                              placeholder="Buscar categoría..."
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                            />
                            {showCategoryDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => {
                                      setGlobalCategory(c.id);
                                      setCategorySearch(c.name);
                                      setShowCategoryDropdown(false);
                                    }} 
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                  >
                                    {c.name}
                                  </div>
                                ))}
                                {(() => {
                                  const exactMatch = categories.some(c => c.name.toLowerCase() === categorySearch.trim().toLowerCase());
                                  return !exactMatch && categorySearch.trim().length > 0 && (
                                    <div 
                                      className="px-3 py-2 text-sm text-vuttik-blue font-medium hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center gap-2"
                                      onClick={() => handleCreateCategory(categorySearch)}
                                    >
                                      <Plus className="w-4 h-4" /> Crear "{categorySearch.toUpperCase()}"
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Tag size={14} className="text-gray-400 shrink-0" /> Tipo *</label>
                          <select 
                            value={globalType}
                            onChange={(e) => setGlobalType(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                          >
                            <option value="inform">Informar</option>
                            {transactionTypes.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Coins size={14} className="text-gray-400 shrink-0" /> Moneda *</label>
                          <select 
                            value={globalCurrency}
                            onChange={(e) => setGlobalCurrency(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                          >
                            {WORLD_CURRENCIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Store size={14} className="text-gray-400" /> Nombre del Menú/Negocio</label>
                          <input
                            type="text"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="Ej: Menú de Colmado Los Hermanos"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Store size={14} className="text-gray-400" /> Cadena / Supermercado</label>
                          <input
                            type="text"
                            value={chain}
                            onChange={(e) => setChain(e.target.value)}
                            placeholder="Ej: Sirena, Jumbo..."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                            disabled={isIndependent}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5">Teléfono de Contacto</label>
                          <PhoneInput 
                            value={phone} 
                            onChange={(formatted) => setPhone(formatted)} 
                            placeholder="Ej: 809 555 0123" 
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isIndependent ? 'bg-vuttik-blue text-white' : 'border-2 border-gray-300'}`}>
                            {isIndependent && <CheckCircle2 size={14} />}
                          </div>
                          <span className="text-sm font-bold text-vuttik-navy">Es un local independiente</span>
                          <input type="checkbox" className="hidden" checked={isIndependent} onChange={(e) => {
                            setIsIndependent(e.target.checked);
                            if (e.target.checked) setChain('');
                          }} />
                        </label>

                        {!isBusinessModeActive && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isOwner ? 'bg-vuttik-blue text-white' : 'border-2 border-gray-300'}`}>
                              {isOwner && <CheckCircle2 size={14} />}
                            </div>
                            <span className="text-sm font-bold text-vuttik-navy">Soy el dueño / oficial</span>
                            <input type="checkbox" className="hidden" checked={isOwner} onChange={(e) => setIsOwner(e.target.checked)} />
                          </label>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><MapPin size={14} className="text-gray-400" /> Ubicación (GPS) *</label>
                        <LocationInput
                          value={location}
                          onChange={(loc, placeName, country, state) => {
                            setLocation(loc);
                            setGlobalCountry(country || '');
                            setGlobalProvince(state || '');
                          }}
                          onCoordinatesChange={(lat, lng) => {
                            setGlobalLat(lat);
                            setGlobalLng(lng);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                      {parsedMenu.map((item, index) => (
                        <div key={index} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-vuttik-blue to-purple-500 opacity-50"></div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={item.title || ''} 
                              onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-vuttik-navy focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                              placeholder="Nombre del producto"
                            />
                            <div className="relative min-w-[110px] w-1/3">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vuttik-blue text-sm font-bold">{globalCurrency === 'EUR' ? '€' : globalCurrency === 'GBP' ? '£' : '$'}</span>
                              <input 
                                type="number" 
                                value={item.price || ''} 
                                onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                                className="w-full pl-7 pr-2 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-vuttik-navy focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none bg-blue-50/30"
                              />
                            </div>
                            <button onClick={() => handleRemoveItem(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                              <X size={20} />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={item.category || ''} 
                              onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-xs text-vuttik-navy focus:bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                              placeholder="Sub-categoría (Ej: Entradas)"
                            />
                            <input 
                              type="text" 
                              value={item.barcode || ''} 
                              onChange={(e) => handleUpdateItem(index, 'barcode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-xs text-vuttik-navy focus:bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                              placeholder="EAN / Código (Opcional)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <button 
                        onClick={() => { setPreview(null); setParsedMenu([]); }}
                        className="flex-1 py-3 bg-gray-100 text-vuttik-navy font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        disabled={isPublishing}
                      >
                        Subir otra foto
                      </button>
                      <button 
                        onClick={handlePublishMenu}
                        disabled={parsedMenu.length === 0 || isPublishing}
                        className="flex-1 py-3 bg-vuttik-blue text-white font-bold rounded-xl hover:bg-vuttik-blue-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isPublishing ? <Loader2 size={20} className="animate-spin" /> : null}
                        {isPublishing ? 'Publicando...' : 'Publicar Todos'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}

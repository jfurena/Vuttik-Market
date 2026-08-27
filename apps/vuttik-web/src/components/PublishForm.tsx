import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Camera, DollarSign, CheckCircle2, Plus, Percent, Search, X, ImageIcon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trackMetric } from '../utils/metrics';
import LocationInput from './LocationInput';
import EanRecollector from './EanRecollector';
import { WORLD_CURRENCIES } from '../constants/currencies';
import PhoneInput from './PhoneInput';
import CameraModal from './CameraModal';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types/index';
import { compressImage } from '../utils/imageCompressor';
import { toTitleCase } from '../utils/formatters';

interface CategoryField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
}

interface Category {
  id: string;
  name: string;
  allowedTypes: string[];
  fields?: CategoryField[];
  systemFields?: {
    title?: { label: string; required: boolean };
    price?: { label: string; required: boolean };
    location?: { label: string; required: boolean };
    description?: { label: string; required: boolean };
    barcode?: { label: string; required: boolean; active: boolean };
    images?: { label: string; required: boolean };
  };
  requiresEan?: boolean;
  isService?: boolean;
}

interface PublishFormProps {
  onComplete: () => void;
  onCancel: () => void;
  editProductId?: string;
  initialAiData?: any;
  initialImage?: string;
}

export default function PublishForm({ onComplete, onCancel, editProductId, initialAiData, initialImage }: PublishFormProps) {
  const { user, isBusinessModeActive } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{id: string, label: string}[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showEanModal, setShowEanModal] = useState(false);
  const [hasEan, setHasEan] = useState(true);
  const currencies = WORLD_CURRENCIES;

  // Image upload state
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // base64 previews
  const [showCamera, setShowCamera] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    regularPrice: '',
    currency: 'DOP',
    category: '',
    location: '',
    phone: '',
    lat: null as number | null,
    lng: null as number | null,
    description: '',
    business: '',
    isOffer: false,
    barcode: '',
    salePrice: '',
    type: 'inform', // Por defecto "inform"
    chain: '',
    storeName: '',
    isIndependent: false,
    isOwner: true,
    province: '',
    country: '',
    customFields: {} as Record<string, any>
  });

  const [availableChains, setAvailableChains] = useState<{id: string, name: string}[]>([]);
  const [businessSuggestions, setBusinessSuggestions] = useState<string[]>([]);
  const [showBusinessSuggestions, setShowBusinessSuggestions] = useState(false);
  const [isFetchingBusinesses, setIsFetchingBusinesses] = useState(false);
  const businessContainerRef = useRef<HTMLDivElement>(null);

  const [hasAcceptedLocationEdit, setHasAcceptedLocationEdit] = useState(false);
  const [showLocationEditWarning, setShowLocationEditWarning] = useState(false);

  useEffect(() => {
    if (isBusinessModeActive) {
      setFormData(prev => ({
        ...prev,
        type: prev.type === 'inform' ? 'sell' : prev.type,
        isIndependent: false
      }));
    }
  }, [isBusinessModeActive]);

  const handleLocationFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!hasAcceptedLocationEdit) {
      e.target.blur();
      setShowLocationEditWarning(true);
    }
  };

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const chains = await api.getChains();
        setAvailableChains(chains);
      } catch (err) {
        console.error('Error fetching chains:', err);
      }
    };
    fetchChains();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (formData.storeName.length < 2) {
        setBusinessSuggestions([]);
        return;
      }
      setIsFetchingBusinesses(true);
      try {
        const suggestions = await api.getBusinessSuggestions(formData.storeName);
        setBusinessSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching business suggestions:', error);
      } finally {
        setIsFetchingBusinesses(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [formData.storeName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (businessContainerRef.current && !businessContainerRef.current.contains(event.target as Node)) {
        setShowBusinessSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editProductId) {
      setIsEditingMode(true);
      const loadProduct = async () => {
        try {
          const prod = await api.getProduct(editProductId);
          if (prod) {
            setFormData({
              title: prod.title || '',
              price: String(prod.price || ''),
              regularPrice: String(prod.regularPrice || prod.regular_price || ''),
              currency: prod.currency || 'DOP',
              category: prod.categoryId || prod.category_id || '',
              location: prod.location || '',
              province: prod.province || '',
              country: prod.country || '',
              phone: prod.phone || '',
              lat: prod.lat,
              lng: prod.lng,
              description: prod.description || '',
              business: prod.storeName || prod.store_name || prod.business || prod.chain || '',
              isOffer: !!prod.isOnSale || !!prod.is_on_sale,
              barcode: prod.barcode || '',
              salePrice: String(prod.salePrice || prod.sale_price || ''),
              type: prod.typeId || prod.type_id || 'sell',
              chain: prod.chain || '',
              storeName: prod.storeName || prod.store_name || '',
              isIndependent: !!prod.isIndependent || !!prod.is_independent,
              customFields: prod.customFields || prod.custom_fields || {}
            });
            if (prod.barcode) setHasEan(true);
            else setHasEan(false);

            if (prod.images && Array.isArray(prod.images)) {
              setSelectedImages(prod.images);
            } else if (typeof prod.images === 'string') {
              try {
                setSelectedImages(JSON.parse(prod.images));
              } catch {
                setSelectedImages([prod.images]);
              }
            }
          }
        } catch (error) {
          console.error("Error loading product to edit:", error);
        }
      };
      loadProduct();
    } else if (initialAiData) {
      setFormData(prev => ({
        ...prev,
        title: initialAiData.title || prev.title,
        price: initialAiData.discountPrice ? String(initialAiData.discountPrice) : (initialAiData.price ? String(initialAiData.price) : ''),
        regularPrice: initialAiData.price ? String(initialAiData.price) : '',
        isOffer: !!initialAiData.discountPrice,
        salePrice: initialAiData.discountPrice ? String(initialAiData.discountPrice) : '',
        description: initialAiData.description || prev.description
      }));
      if (initialImage) {
        setSelectedImages([initialImage]);
      }
    }
  }, [editProductId, initialAiData, initialImage]);

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const b64 = await compressImage(file);
          newImages.push(b64);
        } catch (error) {
          console.error('Compression error:', error);
        }
      }
    }
    const maxImages = 5;
    const combined = [...selectedImages, ...newImages].slice(0, maxImages);
    if (combined.length < [...selectedImages, ...newImages].length) {
      alert(`Solo se permiten máximo ${maxImages} imágenes. Se agregaron solo las primeras.`);
    }
    setSelectedImages(combined);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await api.getTransactionTypes();
        setTransactionTypes(types);
      } catch (error) {
        console.error('Error loading transaction types:', error);
      }
    };
    loadTypes();
  }, []);

  useEffect(() => {
    const currentCat = categories.find(c => c.id === formData.category);
    if (currentCat && !currentCat.allowedTypes.includes(formData.type) && formData.type !== 'inform') {
      setFormData(prev => ({ ...prev, type: currentCat.allowedTypes[0] }));
    }
  }, [formData.category, categories]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setPublishError(null);
    if (!user) {
      setPublishError('Debes iniciar sesión para publicar un producto.');
      return;
    }
    if (!formData.title.trim()) {
      setPublishError('El título del producto es obligatorio.');
      return;
    }
    if (!formData.category) {
      setPublishError('Debes seleccionar una categoría.');
      return;
    }
    if (!formData.price || isNaN(parseFloat(String(formData.price)))) {
      setPublishError('El precio es obligatorio y debe ser un número válido.');
      return;
    }

    setIsPublishing(true);
    try {
      if (!user) throw new Error('User not authenticated');

      const images = selectedImages.length > 0 ? selectedImages : [];

      // Ensure customFields is always a plain object, never a string
      let safeCustomFields: Record<string, any> = {};
      try {
        const cf = formData.customFields;
        if (typeof cf === 'string') {
          safeCustomFields = JSON.parse(cf);
        } else if (cf && typeof cf === 'object') {
          safeCustomFields = cf;
        }
      } catch {
        safeCustomFields = {};
      }

      const productData = {
        title: String(formData.title || '').trim(),
        description: String(formData.description || ''),
        price: parseFloat(String(formData.price)),
        currency: formData.currency || 'DOP',
        categoryId: formData.category,
        typeId: formData.type || 'sell',
        authorId: isBusinessModeActive && user.businessId ? user.businessId : user.uid,
        authorName: isBusinessModeActive && user.businessName ? user.businessName : (user.displayName || 'Usuario'),
        authorAvatar: isBusinessModeActive && user.businessLogo ? user.businessLogo : (user.photoURL || ''),
        location: String(formData.location || ''),
        province: String(formData.province || ''),
        country: String(formData.country || ''),
        phone: String(formData.phone || ''),
        lat: formData.lat,
        lng: formData.lng,
        barcode: String(formData.barcode || ''),
        isOnSale: !!formData.isOffer,
        salePrice: formData.isOffer ? parseFloat(String(formData.salePrice || '0')) : null,
        postedAs: isBusinessModeActive ? 'business' : 'personal',
        customFields: safeCustomFields,
        storeName: String(formData.storeName || ''),
        isIndependent: !!formData.isIndependent,
        isOwner: formData.type === 'inform' ? false : !!(formData as any).isOwner,
        images
      };

      if (isEditingMode && editProductId) {
        await api.updateProduct(editProductId, productData, user.uid);
        try {
          await api.trackMetric({
            userId: user.uid, action: 'update', targetId: editProductId, targetType: 'product',
            metadata: { category: formData.category, type: formData.type, price: formData.price }
          });
        } catch { /* non-critical */ }
      } else {
        await api.publishProduct(productData);
        try {
          await api.trackMetric({
            userId: user.uid, action: 'publish', targetId: 'new_product', targetType: 'product',
            metadata: { category: formData.category, type: formData.type, price: formData.price }
          });
        } catch { /* non-critical */ }
      }
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error publishing product:', error);
      const msg = error?.message || error?.error || 'Error desconocido al publicar.';
      setPublishError('Error al publicar: ' + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value
      }
    }));
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 className="text-4xl font-display font-black text-vuttik-navy mb-4">
          {isEditingMode ? '¡Cambios Guardados!' : '¡Publicación Exitosa!'}
        </h2>
        <p className="text-vuttik-text-muted text-lg max-w-md mb-10">
          {isEditingMode 
            ? 'Tu producto ha sido actualizado correctamente.' 
            : 'Tu registro ha sido enviado y está siendo validado.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {!isEditingMode && (
            <button 
              onClick={() => {
                setIsSuccess(false);
                setFormData({
                  title: '', price: '', regularPrice: '', currency: 'DOP', category: '', location: '', phone: '', lat: null, lng: null,
                  description: '', business: '', isOffer: false, barcode: '', salePrice: '', type: 'sell', chain: '', storeName: '', isIndependent: false, province: '', country: '', customFields: {}
                });
                setSelectedImages([]);
              }}
              className="bg-vuttik-gray text-vuttik-navy font-bold px-12 py-5 rounded-2xl"
            >
              Crear otra
            </button>
          )}
          <button 
            onClick={onComplete}
            className="vuttik-button !px-12 !py-5"
          >
            {isEditingMode ? 'Volver' : 'Ir al Mercado'}
          </button>
        </div>
      </div>
    );
  }

  const currentCategory = categories.find(c => c.id === formData.category);
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const isFormValid = () => {
    try {
      if (!formData.category) return false;
      const sys = currentCategory?.systemFields;
      if (sys?.title?.required && !formData.title) return false;
      if (currentCategory?.requiresEan && !formData.barcode) return false;
      if (!currentCategory?.requiresEan && hasEan && !formData.barcode) return false;
      if (currentCategory?.fields && Array.isArray(currentCategory.fields)) {
        const safeCustom = (typeof formData.customFields === 'object' && formData.customFields !== null)
          ? formData.customFields as Record<string, any>
          : {};
        for (const field of currentCategory.fields) {
          if (field.required && !safeCustom[field.id]) return false;
        }
      }
      if (sys?.price?.required) {
        const priceNum = parseFloat(String(formData.price));
        if (!formData.price || isNaN(priceNum) || priceNum < 0) return false;
      }
      if (sys?.location?.required && !formData.location) return false;
      if (!formData.isIndependent && !formData.storeName) return false;
      return true;
    } catch {
      return false;
    }
  };
  
  // Find name of currently selected category to display in the input
  const selectedCategoryName = categories.find(c => c.id === formData.category)?.name || '';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-40 pt-8">
      <div className="flex flex-col gap-2 mb-10 text-center md:text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-4xl md:text-5xl font-display font-black text-vuttik-navy tracking-tight">
            {isEditingMode ? 'Editar Publicación' : 'Nueva Publicación'}
          </h2>
          <button onClick={onCancel} className="text-vuttik-text-muted hover:text-vuttik-navy font-bold text-sm bg-gray-100 hover:bg-gray-200 px-6 py-2 rounded-full transition-colors self-center md:self-auto">
            Cancelar
          </button>
        </div>
        <p className="text-vuttik-text-muted text-lg">
          Completa los detalles de tu producto o servicio para publicarlo en el mercado.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* CARD 1: CATEGORY & TRANSACTION */}
        <section className="bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-vuttik-blue font-black text-lg">1</div>
            <h3 className="text-2xl font-black text-vuttik-navy">Clasificación</h3>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">Buscar Categoría <span className="text-red-500">*</span></label>
              <div className="relative" ref={categoryInputRef}>
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
                <input 
                  type="text" 
                  placeholder="Ej: Teléfonos, Ropa, Inmuebles..."
                  value={showCategoryDropdown ? categorySearch : (selectedCategoryName || categorySearch)}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                    setFormData({ ...formData, category: '' });
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                />
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setFormData({ ...formData, category: cat.id, customFields: {} });
                            setCategorySearch('');
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-6 py-4 font-bold transition-colors hover:bg-gray-50 ${formData.category === cat.id ? 'text-vuttik-blue bg-blue-50/50' : 'text-vuttik-navy'}`}
                        >
                          <span className="text-gray-900">{String(toTitleCase(cat.name))}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm font-bold text-gray-500 mb-4">No encontramos "{categorySearch}"</p>
                        <button
                          onClick={async () => {
                            if (!user) return alert('Debes iniciar sesión.');
                            try {
                              const name = categorySearch.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                              const data = await api.createOrProposeCategory(name, user.uid);
                              
                              if (data.status === 'proposed') {
                                alert(`Has alcanzado tu límite de 10 categorías creadas. La categoría "${name}" ha sido enviada a los guardianes para su aprobación.\nMientras tanto, por favor selecciona una categoría existente.`);
                                setCategorySearch('');
                              } else {
                                setFormData({ ...formData, category: data.id, customFields: {} });
                                setShowCategoryDropdown(false);
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Error al crear o enviar sugerencia.');
                            }
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-vuttik-navy text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                        >
                          <Plus size={18} /> Solicitar Categoría
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`space-y-3 transition-opacity duration-300 ${!formData.category ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">¿Qué quieres hacer? <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from(new Set([
                  ...(!isBusinessModeActive ? ['inform'] : []), 
                  ...(Array.isArray(currentCategory?.allowedTypes) && currentCategory!.allowedTypes.length > 0
                    ? currentCategory!.allowedTypes.filter((t): t is string => typeof t === 'string')
                    : transactionTypes.map(t => t.id).filter((id): id is string => typeof id === 'string'))
                ])).filter((typeId): typeId is string => typeof typeId === 'string').map((typeId) => {
                  const type = transactionTypes.find(t => t.id === typeId);
                  const isInform = typeId === 'inform';
                  const displayLabel = type?.label ? String(type.label).toUpperCase() : typeId.toUpperCase();
                  return (
                    <button
                      type="button"
                      key={typeId}
                      onClick={() => setFormData({ ...formData, type: typeId })}
                      className={`py-4 px-2 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all border-2 relative overflow-hidden flex items-center justify-center text-center ${
                        formData.type === typeId 
                          ? 'bg-vuttik-navy text-white border-vuttik-navy shadow-lg shadow-vuttik-navy/20' 
                          : 'bg-white text-vuttik-navy border-gray-200 hover:border-vuttik-blue/50 hover:bg-blue-50/30'
                      }`}
                    >
                      {isInform && <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />}
                      <span className={isInform ? (formData.type === typeId ? 'text-orange-400' : 'text-orange-600') : ''}>
                        {String(displayLabel)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!isBusinessModeActive && (
                <div className="bg-orange-50 rounded-xl p-4 mt-2 border border-orange-100 flex gap-3 items-start">
                  <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 font-medium">
                    Usa <strong className="font-black">INFORMAR</strong> si viste un producto en un local y quieres compartir su precio con la comunidad, aunque no seas el dueño.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CARD 2: DETAILS */}
        <section className={`bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 transition-opacity duration-300 ${!formData.category ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-vuttik-blue font-black text-lg">2</div>
            <h3 className="text-2xl font-black text-vuttik-navy">Detalles del Producto</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">
                {typeof currentCategory?.systemFields?.title?.label === 'string' ? currentCategory!.systemFields!.title!.label : 'Título de la publicación'} {currentCategory?.systemFields?.title?.required === true && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="text" 
                placeholder="Ej: Leche Entera Rica 1L, Apartamento en Piantini..."
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest flex items-center gap-2">
                  Código de Barras (EAN)
                  {currentCategory?.requiresEan && <span className="text-red-500">*</span>}
                  {!currentCategory?.requiresEan && <span className="text-gray-400 font-medium normal-case">(Opcional)</span>}
                </label>
                <button onClick={() => setShowEanModal(true)} className="text-vuttik-blue hover:text-blue-700 transition-colors flex items-center gap-1 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md">
                  <Info size={14} /> ¿Qué es esto?
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Ej: 7460123456789 (Escanea o escribe el código)"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            {currentCategory?.fields?.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">
                  {field.name} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select 
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map((opt, i) => <option key={String(opt) + i} value={String(opt)}>{String(opt)}</option>)}
                  </select>
                ) : (
                  <input 
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={`Ingresa ${field.name.toLowerCase()}`}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">
                {typeof currentCategory?.systemFields?.description?.label === 'string' ? currentCategory!.systemFields!.description!.label : 'Descripción del Producto'} {currentCategory?.systemFields?.description?.required === true && <span className="text-red-500">*</span>}
              </label>
              <textarea 
                placeholder="Describe las características, estado, o cualquier detalle importante..."
                rows={4}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-medium text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* CARD 3: PHOTOS */}
        <section className={`bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 transition-opacity duration-300 ${!formData.category ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-vuttik-blue font-black text-lg">3</div>
            <h3 className="text-2xl font-black text-vuttik-navy">Galería Visual</h3>
          </div>

          <div className="space-y-4">
            <input id="gallery-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
            
            {selectedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedImages.map((img, i) => (
                  <div key={i} className="relative aspect-video md:aspect-square rounded-3xl overflow-hidden group shadow-sm border border-gray-200">
                    <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                ))}
                
                {selectedImages.length < 1 && (
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <button type="button" onClick={() => setShowCamera(true)} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-vuttik-blue hover:text-vuttik-blue hover:bg-blue-50/30 transition-all cursor-pointer h-full min-h-[150px]">
                      <Camera size={32} /> <span className="text-xs font-black uppercase">Tomar Foto</span>
                    </button>
                    <label htmlFor="gallery-input" className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-vuttik-blue hover:text-vuttik-blue hover:bg-blue-50/30 transition-all cursor-pointer h-full min-h-[150px]">
                      <ImageIcon size={32} /> <span className="text-xs font-black uppercase">Subir Fotos</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => setShowCamera(true)} className="aspect-video sm:aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-4 text-gray-500 hover:border-vuttik-blue hover:text-vuttik-blue hover:bg-blue-50/50 transition-all cursor-pointer">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 group-hover:text-vuttik-blue">
                    <Camera size={32} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">Tomar Foto</span>
                </button>
                <label htmlFor="gallery-input" className="aspect-video sm:aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-4 text-gray-500 hover:border-vuttik-blue hover:text-vuttik-blue hover:bg-blue-50/50 transition-all cursor-pointer">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 group-hover:text-vuttik-blue">
                    <ImageIcon size={32} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">Subir de Galería</span>
                </label>
              </div>
            )}
            <p className="text-xs text-gray-400 text-center font-medium mt-2">Máximo 1 foto destacada por publicación.</p>
          </div>
        </section>

        {/* CARD 4: LOCATION & BUSINESS */}
        <section className={`bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 transition-opacity duration-300 ${!formData.category ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-vuttik-blue font-black text-lg">4</div>
            <h3 className="text-2xl font-black text-vuttik-navy">Ubicación y Negocio</h3>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-vuttik-navy uppercase tracking-widest">Soy Vendedor Independiente</h4>
                  <p className="text-xs text-gray-500 font-medium mt-1 max-w-sm">Si vendes por tu cuenta (sin un local comercial o nombre de tienda), activa esta opción.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, isIndependent: !formData.isIndependent, chain: '', storeName: '' })}
                  className={`w-14 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${formData.isIndependent ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.isIndependent ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {!formData.isIndependent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">Nombre del Negocio / Tienda <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Ej: Colmado Los Hermanos"
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2 flex items-center gap-2">
                      Cadena / Franquicia <span className="text-gray-400 font-medium normal-case">(Opcional)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej: Grupo CCN, Sirena"
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                      value={formData.chain}
                      onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ¿Eres dueño? solo si hay nombre de negocio */}
              {!formData.isIndependent && formData.storeName && (
                <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <p className="text-sm font-black text-vuttik-navy mb-4">¿Eres el dueño o representante legal de este negocio?</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isOwner: true }))}
                      className={`flex-1 py-3 px-6 rounded-xl font-black text-sm border-2 transition-all shadow-sm ${
                        formData.isOwner
                          ? 'bg-vuttik-blue border-vuttik-blue text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-vuttik-blue/50'
                      }`}
                    >
                      Sí, soy el dueño
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isOwner: false }))}
                      className={`flex-1 py-3 px-6 rounded-xl font-black text-sm border-2 transition-all shadow-sm ${
                        !formData.isOwner
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'
                      }`}
                    >
                      No, soy un cliente
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h4 className="text-sm font-black text-vuttik-navy uppercase tracking-widest ml-2 mb-4">Dirección y Contacto</h4>
                
                <LocationInput 
                  label="Buscar en Google Maps"
                  value={formData.location}
                  onChange={(val, placeName, country, state) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      location: val, 
                      country: country || prev.country, 
                      province: state || prev.province 
                    }));
                  }}
                  onCoordinatesChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))}
                  placeholder="Busca una calle, sector o ciudad..."
                />

                {/* Explicit Address Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-2">Calle / Dirección Exacta <span className="text-red-500">*</span></label>
                    <textarea
                      rows={2}
                      className={`w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all resize-none ${!hasAcceptedLocationEdit ? 'opacity-80' : ''}`}
                      value={formData.location}
                      onFocus={handleLocationFocus}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-2">Provincia / Estado <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className={`w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all ${!hasAcceptedLocationEdit ? 'opacity-80' : ''}`} 
                      value={formData.province} 
                      onFocus={handleLocationFocus} 
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-2">País <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className={`w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all ${!hasAcceptedLocationEdit ? 'opacity-80' : ''}`} 
                      value={formData.country} 
                      onFocus={handleLocationFocus} 
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">Teléfono de contacto <span className="text-gray-400 font-medium normal-case">(Opcional)</span></label>
                  <PhoneInput value={formData.phone} onChange={(formatted) => setFormData({ ...formData, phone: formatted })} placeholder="Ej: 809 555 0123" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 5: PRICE */}
        <section className={`bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 transition-opacity duration-300 ${!formData.category ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-vuttik-blue font-black text-lg">5</div>
            <h3 className="text-2xl font-black text-vuttik-navy">Precio</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest ml-2">
                {typeof currentCategory?.systemFields?.price?.label === 'string' ? currentCategory!.systemFields!.price!.label : 'Precio Principal'} {currentCategory?.systemFields?.price?.required === true && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-3">
                <select 
                  className="bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-5 font-bold text-vuttik-navy outline-none focus:border-vuttik-blue transition-colors"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {currencies.map((curr, i) => <option key={String(curr) + i} value={String(curr)}>{String(curr)}</option>)}
                </select>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue" size={24} />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-16 pr-6 py-5 font-black text-3xl text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 focus:border-vuttik-blue transition-all"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Percent size={12} className="text-vuttik-blue" />
                    </div>
                    <p className="text-sm font-black text-vuttik-navy uppercase tracking-widest">¿Este precio es una oferta?</p>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1 ml-8">Actívalo para destacar un descuento frente al precio regular.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, isOffer: !formData.isOffer })}
                  className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${formData.isOffer ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.isOffer ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {formData.isOffer && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 pt-6 border-t border-blue-100/50 ml-8">
                  <label className="text-xs font-black text-vuttik-blue uppercase tracking-widest">Precio Final de Oferta</label>
                  <div className="relative">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-vuttik-blue" size={20} />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-white border border-vuttik-blue/30 rounded-2xl pl-12 pr-6 py-4 font-black text-2xl text-vuttik-blue outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all shadow-sm"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* FIXED FOOTER SUBMIT */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 md:p-6 z-40 transition-transform duration-500 ${!formData.category ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:block">
            {publishError ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold border border-red-100">
                <span>⚠️</span> {publishError}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-medium">Revisa que todos los campos obligatorios estén completos.</p>
            )}
          </div>
          
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isPublishing}
            className={`w-full sm:w-auto min-w-[240px] text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-lg ${
              isPublishing || !isFormValid() ? 'bg-vuttik-navy/70 cursor-not-allowed opacity-80' : 'bg-vuttik-navy hover:bg-gray-900 shadow-vuttik-navy/20 hover:-translate-y-1 active:scale-95'
            }`}
          >
            {isPublishing ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{isEditingMode ? 'Guardar Cambios' : 'Publicar Ahora'}</span>
            )}
          </button>
        </div>
        {/* Mobile error view */}
        {publishError && (
          <div className="sm:hidden mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl text-xs font-bold w-full border border-red-100">
            <span>⚠️</span> {publishError}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showLocationEditWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden border border-gray-100">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl">⚠️</span></div>
              <h3 className="text-2xl font-black text-vuttik-navy mb-3 tracking-tight">Atención</h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed font-medium">Recomendamos no editar manualmente la dirección autocompletada por Google Maps, ya que esto garantiza mayor precisión para los compradores. ¿Estás seguro de que quieres editarla?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLocationEditWarning(false)} className="flex-1 px-4 py-3.5 bg-gray-100 text-vuttik-navy font-bold rounded-2xl text-sm transition-colors hover:bg-gray-200">Cancelar</button>
                <button onClick={() => { setHasAcceptedLocationEdit(true); setShowLocationEditWarning(false); }} className="flex-1 px-4 py-3.5 bg-vuttik-blue text-white font-bold rounded-2xl text-sm shadow-lg shadow-vuttik-blue/20 hover:bg-blue-600 transition-colors">Sí, Editar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEanModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-vuttik-blue to-vuttik-purple"></div>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"><Info className="w-8 h-8 text-vuttik-blue" /></div>
              <h3 className="text-2xl font-black text-vuttik-navy mb-3 tracking-tight">¿Qué es el EAN?</h3>
              <p className="text-gray-500 mb-8 text-sm text-left font-medium leading-relaxed">El <strong className="text-vuttik-navy font-black">EAN (European Article Number)</strong> es el código numérico que aparece debajo del código de barras en los productos comerciales.<br /><br />Usarlo ayuda a identificar el producto de forma global, lo que facilita que los compradores lo encuentren rápidamente al buscar, y les permite "seguirlo" para recibir alertas cuando bajes el precio.</p>
              <button onClick={() => setShowEanModal(false)} className="w-full py-4 bg-vuttik-navy text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-900 shadow-lg shadow-vuttik-navy/20 transition-all active:scale-95">Entendido</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCamera && (
        <CameraModal onCapture={(base64Img: string) => { setSelectedImages([base64Img]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}

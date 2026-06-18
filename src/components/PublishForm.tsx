import React, { useState, useEffect, useRef } from 'react';
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
}

export default function PublishForm({ onComplete, onCancel, editProductId }: PublishFormProps) {
  const { user, isBusinessModeActive } = useAuth();
  const [step, setStep] = useState(1);
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
    type: 'sell',
    chain: '',
    storeName: '',
    isIndependent: false,
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
    }
  }, [editProductId]);

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
    setSelectedImages(prev => [...prev, ...newImages].slice(0, 6)); // max 6 images
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
    if (currentCat && !currentCat.allowedTypes.includes(formData.type)) {
      setFormData(prev => ({ ...prev, type: currentCat.allowedTypes[0] }));
    }
  }, [formData.category, categories]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleNext = async () => {
    setPublishError(null);

    if (step === 4) {
      // --- Validación antes de publicar ---
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
      if (!formData.price || isNaN(parseFloat(formData.price))) {
        setPublishError('El precio es obligatorio y debe ser un número válido.');
        return;
      }
      // --- Fin validación ---

      setIsPublishing(true);
      try {
        if (!user) throw new Error('User not authenticated');

        // Use real images if selected, fallback to placeholder
        const images = selectedImages.length > 0
          ? selectedImages
          : ['https://picsum.photos/seed/' + Math.random() + '/800/600'];

        const productData = {
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          currency: formData.currency,
          categoryId: formData.category,
          typeId: formData.type,
          authorId: user.uid,
          authorName: isBusinessModeActive && user.businessName ? user.businessName : (user.displayName || 'Usuario'),
          authorAvatar: isBusinessModeActive && user.businessLogo ? user.businessLogo : (user.photoURL || ''),
          location: formData.location,
          province: formData.province,
          country: formData.country,
          phone: formData.phone,
          lat: formData.lat,
          lng: formData.lng,
          barcode: formData.barcode,
          isOnSale: formData.isOffer,
          salePrice: formData.isOffer ? parseFloat(formData.salePrice) : null,
          customFields: formData.customFields,
          storeName: formData.storeName,
          isIndependent: formData.isIndependent,
          images
        };

        if (isEditingMode && editProductId) {
          await api.updateProduct(editProductId, productData, user.uid);
          await api.trackMetric({
            userId: user.uid,
            action: 'update',
            targetId: editProductId,
            targetType: 'product',
            metadata: { category: formData.category, type: formData.type, price: formData.price }
          });
        } else {
          await api.publishProduct(productData);
          await api.trackMetric({
            userId: user.uid,
            action: 'publish',
            targetId: 'new_product',
            targetType: 'product',
            metadata: { category: formData.category, type: formData.type, price: formData.price }
          });
        }
        setStep(prev => prev + 1);
      } catch (error) {
        console.error('Error publishing product:', error);
        setPublishError('Error al publicar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      } finally {
        setIsPublishing(false);
      }
      return;
    }
    setStep(prev => prev + 1);
  };
  const handleBack = () => setStep(prev => prev - 1);

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value
      }
    }));
  };

  if (step === 5) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h2 className="text-4xl font-display font-black text-vuttik-navy mb-4">
          {isEditingMode ? '¡Cambios Guardados!' : '¡Publicación Exitosa!'}
        </h2>
        <p className="text-vuttik-text-muted text-lg max-w-md mb-10">
          {isEditingMode 
            ? 'Tu producto ha sido actualizado correctamente.' 
            : 'Tu registro ha sido enviado y está siendo validado por los Guardianes de la comunidad.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {!isEditingMode && (
            <button 
              onClick={() => setStep(1)}
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

  const isStep3Valid = () => {
    const sys = currentCategory?.systemFields;
    
    if (sys?.title?.required && !formData.title) return false;
    
    // EAN Validation
    if (currentCategory?.requiresEan && !formData.barcode) return false;
    if (!currentCategory?.requiresEan && hasEan && !formData.barcode) return false;
    
    // Check required custom fields
    if (currentCategory?.fields) {
      for (const field of currentCategory.fields) {
        if (field.required && !formData.customFields[field.id]) {
          return false;
        }
      }
    }
    
    return true;
  };

  const isStep4Valid = () => {
    // If categories haven't loaded yet, allow the attempt (validation in handleNext will catch it)
    if (!currentCategory) return true;
    const sys = currentCategory?.systemFields;
    if (sys?.price?.required && !formData.price) return false;
    if (sys?.location?.required && !formData.location) return false;
    if (!formData.isIndependent && !formData.storeName) return false;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pb-32">
      <div className="flex flex-col gap-2 mb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-display font-black text-vuttik-navy">
            {isEditingMode ? 'Editar Publicación' : 'Nueva Publicación'}
          </h2>
          <button onClick={onCancel} className="text-vuttik-text-muted hover:text-vuttik-navy font-bold text-sm">Cancelar</button>
        </div>
        <p className="text-vuttik-text-muted text-lg">
          Paso {step} de 4: {
            step === 1 ? 'Seleccionar Categoría' : 
            step === 2 ? '¿Qué quieres hacer?' : 
            step === 3 ? 'Detalles y Fotos' : 
            'Precio y Ubicación'
          }
        </p>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-vuttik-gray rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            className="h-full bg-vuttik-blue"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Selecciona una categoría</label>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar categoría..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setFormData({ ...formData, category: cat.id, customFields: {} });
                      handleNext();
                    }}
                    className={`py-6 px-4 rounded-3xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-3 ${
                      formData.category === cat.id 
                        ? 'bg-vuttik-blue text-white border-vuttik-blue shadow-xl shadow-vuttik-blue/20' 
                        : 'bg-white text-vuttik-navy border-gray-100 hover:border-vuttik-blue'
                    }`}
                  >
                    <span className="text-lg">{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Suggest category when no results */}
              {categorySearch.trim() && filteredCategories.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-6 border-2 border-dashed border-vuttik-blue/30 rounded-3xl bg-vuttik-blue/5 text-center"
                >
                  <p className="text-sm font-bold text-vuttik-navy mb-1">No encontramos la categoría <span className="text-vuttik-blue">"{categorySearch}"</span></p>
                  <p className="text-xs text-vuttik-text-muted mb-4">¿Crees que debería existir? Envíala a votación de los Guardianes.</p>
                  <button
                    onClick={async () => {
                      if (!user) return alert('Debes iniciar sesión.');
                      try {
                        const id = 'cat_' + Date.now();
                        await api.submitCategoryProposal({
                          id,
                          name: categorySearch.trim(),
                          suggested_by_id: user.uid,
                          suggested_by_name: user.displayName || 'Usuario'
                        });
                        await trackMetric({
                          userId: user.uid,
                          action: 'click',
                          targetId: id,
                          targetType: 'category',
                          metadata: { name: categorySearch.trim() }
                        });
                        setShowSuggestionModal(true);
                      } catch {
                        alert('Error al enviar sugerencia.');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-vuttik-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-vuttik-blue/20"
                  >
                    <Plus size={16} />
                    Sugerir Categoría
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">¿Qué quieres hacer?</label>
              <div className="grid grid-cols-2 gap-4">
                {Array.from(new Set(['inform', ...(currentCategory?.allowedTypes || [])])).map((typeId) => {
                  const type = transactionTypes.find(t => t.id === typeId);
                  const isInform = typeId === 'inform';
                  return (
                    <button
                      key={typeId}
                      onClick={() => {
                        setFormData({ ...formData, type: typeId });
                        handleNext();
                      }}
                      className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 relative overflow-hidden ${
                        formData.type === typeId 
                          ? 'bg-vuttik-navy text-white border-vuttik-navy shadow-lg shadow-vuttik-navy/20' 
                          : 'bg-white text-vuttik-navy border-gray-100 hover:border-vuttik-blue'
                      }`}
                    >
                      {isInform && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
                      )}
                      <span className={isInform ? 'text-orange-600' : ''}>
                        {type?.label.toUpperCase() || typeId.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-vuttik-text-muted font-bold text-center italic mt-2">
                * Usa <strong className="text-orange-500">INFORMAR</strong> para registrar el precio de un producto que viste en un local (ideal si no eres el dueño).
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 bg-vuttik-gray text-vuttik-navy font-bold py-5 rounded-2xl">Atrás</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">
                {currentCategory?.systemFields?.title?.label || 'Título de la publicación'} {currentCategory?.systemFields?.title?.required && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="text" 
                placeholder="Ej: Leche Entera 1L, Solar en Jarabacoa..."
                className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Barcode Field */}
            {currentCategory?.requiresEan ? (
              <div className="space-y-4">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest flex items-center gap-2">
                  Código de Barras (EAN) <span className="text-red-500">*</span>
                  <button onClick={() => setShowEanModal(true)} className="text-vuttik-text-muted hover:text-vuttik-blue transition-colors">
                    <Info size={16} />
                  </button>
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: 7460123456789"
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest flex items-center gap-2">
                    ¿El producto tiene código de barras (EAN)?
                    <button onClick={() => setShowEanModal(true)} className="text-vuttik-text-muted hover:text-vuttik-blue transition-colors">
                      <Info size={16} />
                    </button>
                  </label>
                  <div className="flex bg-vuttik-gray p-1 rounded-xl">
                    <button
                      onClick={() => setHasEan(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${hasEan ? 'bg-vuttik-blue text-white shadow-md' : 'text-vuttik-text-muted'}`}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => { setHasEan(false); setFormData(prev => ({...prev, barcode: ''})); }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!hasEan ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
                {hasEan && (
                  <input 
                    type="text" 
                    placeholder="Ej: 7460123456789"
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                )}
              </div>
            )}



            {/* Dynamic Custom Fields */}
            {currentCategory?.fields?.map((field) => (
              <div key={field.id} className="space-y-4">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">
                  {field.name} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select 
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none"
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={`Ingresa ${field.name.toLowerCase()}`}
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">
                {currentCategory?.systemFields?.description?.label || 'Descripción'} {currentCategory?.systemFields?.description?.required && <span className="text-red-500">*</span>}
              </label>
              <textarea 
                placeholder="Cuéntanos más detalles sobre lo que publicas..."
                rows={4}
                className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-medium text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Fotos del producto/precio</label>

              {/* Hidden inputs for gallery */}
              <input
                id="gallery-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />

              {/* Image previews */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                      <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="aspect-square bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                >
                  <Camera size={32} />
                  <span className="text-[10px] font-black uppercase">Tomar Foto</span>
                </button>
                <label
                  htmlFor="gallery-input"
                  className="aspect-square bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                >
                  <ImageIcon size={32} />
                  <span className="text-[10px] font-black uppercase">Subir Fotos</span>
                </label>
              </div>
              {selectedImages.length > 0 && (
                <p className="text-[10px] text-vuttik-text-muted text-center">{selectedImages.length} foto(s) seleccionada(s) · Máx. 6</p>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 bg-vuttik-gray text-vuttik-navy font-bold py-5 rounded-2xl">Atrás</button>
              <button 
                onClick={handleNext}
                disabled={!isStep3Valid()}
                className="flex-[2] vuttik-button !py-5 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">
                {currentCategory?.systemFields?.price?.label || 'Precio'} {currentCategory?.systemFields?.price?.required && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-2">
                <select 
                  className="bg-vuttik-gray border-none rounded-2xl px-4 py-5 font-bold text-vuttik-navy outline-none"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {currencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                </select>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue" size={24} />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-vuttik-gray border-none rounded-2xl pl-16 pr-6 py-5 font-black text-2xl text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              {/* Offer Toggle & Sale Price */}
              <div className="bg-vuttik-blue/5 border border-vuttik-blue/10 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-vuttik-blue" />
                      <p className="text-xs font-black text-vuttik-navy uppercase tracking-widest">¿Este precio es una oferta?</p>
                    </div>
                    <p className="text-[10px] text-vuttik-text-muted font-bold mt-0.5">Actívalo para destacar el descuento</p>
                  </div>
                  <button 
                    onClick={() => setFormData({ ...formData, isOffer: !formData.isOffer })}
                    className={`w-12 h-7 rounded-full transition-all relative ${formData.isOffer ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.isOffer ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {formData.isOffer && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-3 pt-4 border-t border-vuttik-blue/10"
                  >
                    <label className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest">Precio Final de Oferta</label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-vuttik-blue" size={20} />
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-white border border-vuttik-blue/20 rounded-2xl pl-12 pr-6 py-4 font-black text-xl text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                        value={formData.salePrice}
                        onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="bg-vuttik-gray/50 rounded-3xl p-6 space-y-6 border border-gray-100">
              {formData.type !== 'inform' && (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-vuttik-navy uppercase tracking-widest">Soy Vendedor Independiente</h4>
                    <p className="text-[10px] text-vuttik-text-muted font-bold mt-1">Marca esta opción si vendes por tu cuenta y no aplica indicar cadena comercial.</p>
                  </div>
                  <button 
                    onClick={() => setFormData({ ...formData, isIndependent: !formData.isIndependent, chain: '', storeName: '' })}
                    className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${formData.isIndependent ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.isIndependent ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

              <div className={`space-y-4 ${formData.type !== 'inform' ? 'pt-4 border-t border-gray-200' : ''}`}>
                {/* Location Input behaves as Store Name search if not independent or if type is inform */}
                <LocationInput 
                  label={formData.isIndependent && formData.type !== 'inform' ? 'Ubicación (Google Maps)' : 'Nombre del Negocio / Tienda'}
                  value={formData.isIndependent && formData.type !== 'inform' ? formData.location : formData.storeName}
                  onChange={(val, placeName, country, state) => {
                    if (formData.isIndependent && formData.type !== 'inform') {
                      setFormData(prev => ({ ...prev, location: val, country: country || '', province: state || '' }));
                    } else {
                      setFormData(prev => ({ ...prev, storeName: placeName || val, location: val, country: country || '', province: state || '' }));
                    }
                  }}
                  onCoordinatesChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))}
                  placeholder={formData.isIndependent && formData.type !== 'inform' ? "Ej: Ensanche Naco, Santo Domingo" : "Ej: Ágora Mall, Santo Domingo"}
                />

                {!formData.isIndependent && formData.type !== 'inform' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-4">
                      <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Cadena / Franquicia (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Grupo CCN"
                        className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                        value={formData.chain}
                        onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Show the resolved location and make it editable */}
                {formData.location && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-2"
                  >
                    {(!formData.isIndependent || formData.type === 'inform') && (
                      <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Dirección Exacta (Autocompletada)</label>
                        <textarea
                          rows={2}
                          className={`w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-medium text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all resize-none ${!hasAcceptedLocationEdit ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                          value={formData.location}
                          onFocus={handleLocationFocus}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Provincia / Estado</label>
                        <input
                          type="text"
                          className={`w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-medium text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all ${!hasAcceptedLocationEdit ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                          value={formData.province}
                          onFocus={handleLocationFocus}
                          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">País</label>
                        <input
                          type="text"
                          className={`w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-sm font-medium text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all ${!hasAcceptedLocationEdit ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                          value={formData.country}
                          onFocus={handleLocationFocus}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Teléfono de contacto (Opcional)</label>
              <PhoneInput 
                value={formData.phone}
                onChange={(formatted) => setFormData({ ...formData, phone: formatted })}
                placeholder="Ej: 809 555 0123"
              />
            </div>

            {/* Phone input and other step 3 items */}

            {/* Error banner - visible en móvil y desktop */}
            {publishError && (
              <div className="w-full mt-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-start gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={handleBack} 
                disabled={isPublishing}
                className="flex-1 bg-vuttik-gray text-vuttik-navy font-bold py-5 rounded-2xl disabled:opacity-50"
              >
                Atrás
              </button>
              <button 
                onClick={handleNext}
                disabled={!isStep3Valid() || !isStep4Valid() || isPublishing}
                className={`flex-[2] text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                  isPublishing ? 'bg-vuttik-navy/70 cursor-not-allowed' : 'bg-vuttik-navy shadow-vuttik-navy/20 active:scale-95'
                }`}
              >
                {isPublishing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <span>Publicar Ahora</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLocationEditWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              
              <h3 className="text-xl font-black text-vuttik-navy mb-2 tracking-tight">Atención</h3>
              <p className="text-vuttik-text-muted mb-8 text-sm leading-relaxed">
                Recomendamos no editar manualmente la dirección autocompletada por Google Maps, ya que esto garantiza mayor precisión para los compradores. ¿Estás seguro de que quieres editarla?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLocationEditWarning(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-vuttik-navy font-bold rounded-xl text-sm transition-colors hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setHasAcceptedLocationEdit(true);
                    setShowLocationEditWarning(false);
                  }}
                  className="flex-1 px-4 py-3 bg-vuttik-blue text-white font-bold rounded-xl text-sm shadow-lg shadow-vuttik-blue/20 hover:bg-blue-600 transition-colors"
                >
                  Sí, Editar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuggestionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-vuttik-blue to-vuttik-purple"></div>
              
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              
              <h3 className="text-2xl font-black text-vuttik-navy mb-2 tracking-tight">¡Sugerencia Enviada!</h3>
              <p className="text-vuttik-text-muted mb-8 text-sm">
                Tu categoría <span className="font-bold text-vuttik-navy">"{categorySearch}"</span> ha sido enviada al panel de Guardianes. Si aprueban la solicitud, estará disponible muy pronto para todos en Vuttik.
              </p>
              
              <button
                onClick={() => {
                  setShowSuggestionModal(false);
                  setCategorySearch(''); // clear search
                }}
                className="w-full py-4 bg-vuttik-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-vuttik-blue/30"
              >
                Aceptar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEanModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-vuttik-blue to-vuttik-purple"></div>
              
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-8 h-8 text-vuttik-blue" />
              </div>
              
              <h3 className="text-xl font-black text-vuttik-navy mb-2 tracking-tight">¿Qué es el EAN?</h3>
              <p className="text-vuttik-text-muted mb-8 text-sm text-left">
                El <strong className="text-vuttik-navy">EAN (European Article Number)</strong> es el código numérico que aparece debajo del código de barras en los productos comerciales.
                <br /><br />
                Usarlo ayuda a identificar el producto de forma global, lo que facilita que los compradores lo encuentren rápidamente al buscar, y les permite "seguirlo" para recibir alertas cuando bajes el precio.
              </p>
              
              <button
                onClick={() => setShowEanModal(false)}
                className="w-full py-4 bg-vuttik-gray text-vuttik-navy rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCamera && (
        <CameraModal 
          onCapture={(base64Img) => {
            if (selectedImages.length < 6) {
              setSelectedImages([...selectedImages, base64Img]);
            }
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

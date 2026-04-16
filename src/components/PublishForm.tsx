import { useState, useEffect } from 'react';
import { Camera, MapPin, Tag, DollarSign, Info, ChevronRight, CheckCircle2, Plus, Barcode, Percent, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trackMetric } from '../utils/metrics';
import LocationInput from './LocationInput';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import { Product } from '../types/index';

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
}

interface PublishFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function PublishForm({ onComplete, onCancel }: PublishFormProps) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{id: string, label: string}[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const currencies = ['DOP', 'USD', 'EUR', 'BTC', 'ETH', 'GBP', 'CAD'];

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
    customFields: {} as Record<string, any>
  });

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

  const handleNext = async () => {
    if (step === 3) {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const productData = {
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          currency: formData.currency,
          categoryId: formData.category,
          typeId: formData.type,
          authorId: user.uid,
          authorName: user.displayName || 'Usuario',
          location: formData.location,
          phone: formData.phone,
          lat: formData.lat,
          lng: formData.lng,
          barcode: formData.barcode,
          isOnSale: formData.isOffer,
          salePrice: formData.isOffer ? parseFloat(formData.salePrice) : null,
          customFields: formData.customFields,
          images: ['https://picsum.photos/seed/' + Math.random() + '/800/600'] // Placeholder
        };

        await api.publishProduct(productData);
        
        await api.trackMetric({
          userId: user.uid,
          action: 'publish',
          targetId: 'new_product',
          targetType: 'product',
          metadata: formData
        });
      } catch (error) {
        console.error('Error publishing product:', error);
        return;
      }
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

  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h2 className="text-4xl font-display font-black text-vuttik-navy mb-4">¡Publicación Exitosa!</h2>
        <p className="text-vuttik-text-muted text-lg max-w-md mb-10">
          Tu registro ha sido enviado y está siendo validado por los Guardianes de la comunidad.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setStep(1)}
            className="bg-vuttik-gray text-vuttik-navy font-bold px-12 py-5 rounded-2xl"
          >
            Crear otra
          </button>
          <button 
            onClick={onComplete}
            className="vuttik-button !px-12 !py-5"
          >
            Ir al Mercado
          </button>
        </div>
      </div>
    );
  }

  const currentCategory = categories.find(c => c.id === formData.category);
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const isStep2Valid = () => {
    const sys = currentCategory?.systemFields;
    
    if (sys?.title?.required && !formData.title) return false;
    if (sys?.barcode?.active && sys?.barcode?.required && !formData.barcode) return false;
    
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

  const isStep3Valid = () => {
    const sys = currentCategory?.systemFields;
    if (sys?.price?.required && !formData.price) return false;
    if (sys?.location?.required && !formData.location) return false;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pb-32">
      <div className="flex flex-col gap-2 mb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-display font-black text-vuttik-navy">Nueva Publicación</h2>
          <button onClick={onCancel} className="text-vuttik-text-muted hover:text-vuttik-navy font-bold text-sm">Cancelar</button>
        </div>
        <p className="text-vuttik-text-muted text-lg">
          Paso {step} de 3: {
            step === 1 ? 'Seleccionar Categoría' : 
            step === 2 ? 'Detalles del Producto' : 
            'Precio y Ubicación'
          }
        </p>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-vuttik-gray rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 3) * 100}%` }}
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
                {currentCategory?.allowedTypes.map((typeId) => {
                  const type = transactionTypes.find(t => t.id === typeId);
                  return (
                    <button
                      key={typeId}
                      onClick={() => setFormData({ ...formData, type: typeId })}
                      className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                        formData.type === typeId 
                          ? 'bg-vuttik-navy text-white border-vuttik-navy shadow-lg shadow-vuttik-navy/20' 
                          : 'bg-white text-vuttik-navy border-gray-100 hover:border-vuttik-blue'
                      }`}
                    >
                      {type?.label.toUpperCase() || typeId.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

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
            {currentCategory?.systemFields?.barcode?.active && (
              <div className="space-y-4">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">
                  {currentCategory.systemFields.barcode.label} {currentCategory.systemFields.barcode.required && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: 7460123456789"
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            )}

            {/* Offer Toggle */}
            <div className="flex items-center justify-between p-6 bg-vuttik-gray rounded-3xl">
              <div>
                <p className="text-sm font-black text-vuttik-navy uppercase tracking-widest">¿Está en oferta?</p>
                <p className="text-xs text-vuttik-text-muted font-bold">Marca esta opción si el precio es especial</p>
              </div>
              <button 
                onClick={() => setFormData({ ...formData, isOffer: !formData.isOffer })}
                className={`w-14 h-8 rounded-full transition-all relative ${formData.isOffer ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isOffer ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {formData.isOffer && (
              <div className="space-y-4">
                <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Precio de Oferta</label>
                <div className="relative">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue" size={24} />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-vuttik-gray border-none rounded-2xl pl-16 pr-6 py-4 font-black text-xl text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  />
                </div>
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

            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 bg-vuttik-gray text-vuttik-navy font-bold py-5 rounded-2xl">Atrás</button>
              <button 
                onClick={handleNext}
                disabled={!isStep2Valid()}
                className="flex-[2] vuttik-button !py-5 disabled:opacity-50"
              >
                Continuar
              </button>
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
            </div>

            <div className="space-y-4">
              <LocationInput 
                label={currentCategory?.systemFields?.location?.label || 'Ubicación (Google Maps)'}
                value={formData.location}
                onChange={(val) => setFormData({ ...formData, location: val })}
                onCoordinatesChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))}
                placeholder="Ej: Av. Winston Churchill 123, Santo Domingo"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Teléfono de contacto (Opcional)</label>
              <input 
                type="tel" 
                placeholder="Ej: 809-555-0123"
                className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none focus:ring-4 focus:ring-vuttik-blue/10 transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-vuttik-navy uppercase tracking-widest">Fotos del producto/precio</label>
              <div className="grid grid-cols-2 gap-4">
                <button className="aspect-square bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all">
                  <Camera size={32} />
                  <span className="text-[10px] font-black uppercase">Tomar Foto</span>
                </button>
                <div className="aspect-square bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted">
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase">Añadir más</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 bg-vuttik-gray text-vuttik-navy font-bold py-5 rounded-2xl">Atrás</button>
              <button 
                onClick={handleNext}
                disabled={!isStep3Valid()}
                className="flex-[2] bg-vuttik-navy text-white font-black py-5 rounded-2xl shadow-xl shadow-vuttik-navy/20"
              >
                Publicar Ahora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

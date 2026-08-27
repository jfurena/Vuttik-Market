import React, { useState, useRef } from 'react';
import { X, Upload, Download, Loader2, CheckCircle2, AlertCircle, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LocationInput from './LocationInput';
import PhoneInput from './PhoneInput';

interface BulkUploadModalProps {
  onClose: () => void;
}

export default function BulkUploadModal({ onClose }: BulkUploadModalProps) {
  useEscapeKey(onClose, true);
  const { user, isBusinessModeActive } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [success, setSuccess] = useState(false);
  const [locationStr, setLocationStr] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [country, setCountry] = useState('Dominican Republic');
  
  // New Global Fields
  const [phone, setPhone] = useState(user?.phone || '');
  const [storeName, setStoreName] = useState(isBusinessModeActive && user?.businessName ? user.businessName : '');
  const [chain, setChain] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Titulo: 'Zapatos Deportivos',
        Descripcion: 'Zapatos cómodos para correr',
        Precio: 1200,
        PrecioRegular: 1500,
        PrecioOferta: 1200,
        Moneda: 'DOP',
        Categoria: 'moda',
        Tipo: 'sell',
        Stock: 10,
        CodigoBarras: '1234567890123'
      }
    ];
    
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Productos");
    xlsx.writeFile(wb, "Plantilla_Productos_Vuttik.xlsx");
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    if (!selectedFile) return;
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['csv', 'xlsx', 'xls', 'xml', 'ods', 'ots', 'sxc', 'stc', 'dif', 'dbf', 'xlt', 'slk', 'html', 'uos'];
    
    if (!ext || !allowedExts.includes(ext)) {
      setError('Por favor, selecciona un archivo en un formato soportado (Excel, CSV, ODS, XML, DBF, etc).');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsUploading(true);
    setError(null);
    setCompletedItems(0);
    setProgress(0);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawJson = xlsx.utils.sheet_to_json<any>(worksheet);
      
      if (!rawJson || rawJson.length === 0) {
        throw new Error('El archivo está vacío.');
      }
      
      const batchId = uuidv4();
      
      const parsedProducts = rawJson.map((rawRow: any) => {
        // Normalizar las llaves (eliminar espacios extra y pasar a minúsculas)
        const row: any = {};
        for (const key in rawRow) {
          if (Object.prototype.hasOwnProperty.call(rawRow, key)) {
            row[key.trim().toLowerCase()] = rawRow[key];
          }
        }

        let priceStr = String(row['precio'] || row['price'] || 0);
        priceStr = priceStr.replace(/[^0-9.-]+/g, "");
        const priceValue = parseFloat(priceStr) || 0;

        let regularPriceStr = String(row['precioregular'] || row['precio regular'] || row['regularprice'] || row['precio_regular'] || priceValue);
        regularPriceStr = regularPriceStr.replace(/[^0-9.-]+/g, "");
        const regularPriceValue = parseFloat(regularPriceStr) || priceValue;

        let salePriceStr = String(row['preciooferta'] || row['precio oferta'] || row['saleprice'] || row['precio_oferta'] || 0);
        salePriceStr = salePriceStr.replace(/[^0-9.-]+/g, "");
        const salePriceValue = parseFloat(salePriceStr) || 0;

        const isOfferValue = salePriceValue > 0 && salePriceValue < regularPriceValue;
        const finalPrice = isOfferValue ? salePriceValue : regularPriceValue;

        return {
          title: row['titulo'] || row['título'] || row['title'] || '',
          description: row['descripcion'] || row['descripción'] || row['description'] || '',
          price: finalPrice,
          regularPrice: regularPriceValue,
          currency: (row['moneda'] || row['currency'] || 'DOP').toUpperCase(),
          categoryId: (row['categoria'] || row['categoría'] || row['category'] || 'global').toLowerCase(),
          typeId: (row['tipo'] || row['type'] || 'sell').toLowerCase(),
          stock: parseInt(row['stock'] || 1, 10),
          barcode: row['codigobarras'] || row['código de barras'] || row['barcode'] || '',
          authorId: isBusinessModeActive && user.businessId ? user.businessId : user.uid,
          authorName: isBusinessModeActive && user.businessName ? user.businessName : (user.displayName || 'Usuario'),
          authorAvatar: isBusinessModeActive && user.businessLogo ? user.businessLogo : (user.photoURL || ''),
          postedAs: isBusinessModeActive ? 'business' : 'personal',
          country: country,
          location: locationStr,
          lat: lat,
          lng: lng,
          phone: phone,
          chain: chain,
          storeName: storeName,
          isIndependent: isIndependent,
          isOwner: isBusinessModeActive ? true : isOwner,
          isOnSale: isOfferValue,
          isOffer: isOfferValue,
          salePrice: isOfferValue ? salePriceValue : null,
          customFields: { menuId: batchId, isMenuGroup: true },
          images: []
        };
      }).filter(p => p.title && p.price > 0);

      if (parsedProducts.length === 0) {
        throw new Error('No se encontraron productos válidos. Asegúrate de que el archivo tenga al menos Título y Precio.');
      }

      setTotalItems(parsedProducts.length);
      
      // Upload one by one with a small delay to prevent rate limit
      let currentCompleted = 0;
      for (const product of parsedProducts) {
        try {
          await api.publishProduct(product);
          await api.trackMetric({
            userId: user.uid,
            action: 'publish',
            targetId: 'new_product_bulk',
            targetType: 'product',
            metadata: { category: product.categoryId, type: product.typeId, price: product.price }
          });
        } catch (uploadErr) {
          console.warn('Failed to upload a product:', uploadErr);
        }
        
        currentCompleted++;
        setCompletedItems(currentCompleted);
        setProgress(Math.round((currentCompleted / parsedProducts.length) * 100));
        
        // Wait 300ms between requests to be safe
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error procesando el archivo.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <button 
            onClick={onClose} 
            disabled={isUploading}
            className="absolute top-6 right-6 p-2 bg-gray-100 text-vuttik-navy rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 z-10"
          >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-vuttik-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-2xl font-display font-black text-vuttik-navy mb-2">Carga Masiva de Productos</h2>
          <p className="text-vuttik-text-muted">Sube tu base de datos en formato Excel o CSV.</p>
        </div>

        {success ? (
          <div className="text-center py-10">
            <CheckCircle2 size={64} className="text-vuttik-cyan mx-auto mb-4" />
            <h3 className="text-xl font-bold text-vuttik-navy mb-2">¡Carga Completada!</h3>
            <p className="text-vuttik-text-muted">Se han publicado {completedItems} productos exitosamente.</p>
          </div>
        ) : isUploading ? (
          <div className="py-8">
            <div className="flex justify-between text-sm font-bold text-vuttik-navy mb-2">
              <span>Subiendo productos...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-vuttik-blue h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-vuttik-text-muted">
              {completedItems} de {totalItems} procesados
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <h4 className="font-bold text-vuttik-blue mb-1 text-sm">Plantilla de Referencia</h4>
              <p className="text-xs text-blue-700/70 mb-3">Descarga el ejemplo para ver exactamente cómo debe estar organizado tu archivo antes de subirlo.</p>
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm font-bold text-vuttik-blue bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow transition-shadow"
              >
                <Download size={16} /> Descargar Plantilla
              </button>
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${file ? 'border-vuttik-blue bg-blue-50/50' : 'border-gray-200 hover:border-vuttik-blue bg-gray-50'}`}
            >
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls, .xml, .ods, .ots, .sxc, .stc, .dif, .dbf, .xlt, .slk, .html, .uos"
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => e.target.files && processFile(e.target.files[0])}
              />
              
              {file ? (
                <div>
                  <div className="text-vuttik-blue font-bold mb-1">{file.name}</div>
                  <div className="text-xs text-gray-500 mb-4">{(file.size / 1024).toFixed(1)} KB</div>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    Quitar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-vuttik-navy mb-1">Arrastra tu archivo aquí</p>
                  <p className="text-xs text-gray-500 mb-4">o haz clic para buscar en tu equipo (Máx. 5MB)</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-bold text-white bg-vuttik-navy px-6 py-2.5 rounded-xl hover:bg-opacity-90 transition-opacity"
                  >
                    Buscar archivo
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isIndependent && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Store size={14} className="text-gray-400" /> Nombre del Negocio / Tienda</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ej: Colmado Los Hermanos"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                  />
                </div>
              )}
              {!isIndependent && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5"><Store size={14} className="text-gray-400" /> Cadena / Supermercado</label>
                  <input
                    type="text"
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    placeholder="Ej: Sirena, Jumbo..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue transition-all outline-none"
                  />
                </div>
              )}
              <div className="col-span-1 sm:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-vuttik-navy mb-1.5">Teléfono de Contacto</label>
                <PhoneInput 
                  value={phone} 
                  onChange={(formatted) => setPhone(formatted)} 
                  placeholder="Ej: 809 555 0123" 
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
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
            
            <div className="pt-2">
              <LocationInput 
                label="Ubicación para estos productos"
                value={locationStr}
                onChange={(val, placeName, c, state) => {
                  setLocationStr(val);
                  if (c) setCountry(c);
                }}
                onCoordinatesChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
                placeholder="Ej: Ensanche Naco, Santo Domingo"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-500 p-4 rounded-xl text-sm flex gap-3 items-center font-medium"
                >
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleUpload}
              disabled={!file || !locationStr || lat === null || lng === null}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${file && locationStr && lat !== null ? 'bg-vuttik-blue text-white shadow-xl shadow-vuttik-blue/20 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Comenzar Carga
            </button>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}

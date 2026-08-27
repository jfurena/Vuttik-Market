import React, { useState, useRef } from 'react';
import { X, Upload, Download, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import * as xlsx from 'xlsx';
import { ApiService } from '../services/api';
import { UnitType } from '../types';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  useEscapeKey(onClose, true);
  
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nombre: 'Refresco Cola 500ml',
        Categoria: 'Bebidas',
        Marca: 'Cola',
        PrecioVenta: 35,
        CostoCompra: 20,
        CantidadDisponible: 24,
        StockMinimo: 5,
        CodigoBarras: '1234567890123'
      }
    ];
    
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Inventario");
    xlsx.writeFile(wb, "Plantilla_Inventario_POS.xlsx");
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    if (!selectedFile) return;
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['csv', 'xlsx', 'xls', 'xml', 'ods'];
    
    if (!ext || !allowedExts.includes(ext)) {
      setError('Por favor, selecciona un archivo en un formato soportado (Excel, CSV, ODS).');
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
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setCompletedItems(0);
    setProgress(0);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      
      if (!firstSheetName) {
        throw new Error('El archivo está vacío o tiene un formato no válido.');
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = xlsx.utils.sheet_to_json<any>(worksheet);
      
      if (rawJson.length === 0) {
        throw new Error('El archivo está vacío.');
      }
      
      const parsedProducts = rawJson.map((rawRow: any) => {
        // Normalizar las llaves (eliminar espacios extra y pasar a minúsculas)
        const row: any = {};
        for (const key in rawRow) {
          if (Object.prototype.hasOwnProperty.call(rawRow, key)) {
            row[key.trim().toLowerCase()] = rawRow[key];
          }
        }

        let priceStr = String(row['precioventa'] || row['precio_venta'] || row['precio'] || 0);
        priceStr = priceStr.replace(/[^0-9.-]+/g, "");
        const priceValue = parseFloat(priceStr) || 0;

        let costStr = String(row['costocompra'] || row['costo_compra'] || row['costo'] || 0);
        costStr = costStr.replace(/[^0-9.-]+/g, "");
        const costValue = parseFloat(costStr) || 0;

        return {
          nombre: row['nombre'] || row['titulo'] || row['título'] || '',
          categoria: row['categoria'] || row['categoría'] || 'Otros',
          marca: row['marca'] || '',
          precio_venta: priceValue,
          costo_compra: costValue,
          cantidad_disponible: parseInt(row['cantidaddisponible'] || row['cantidad_disponible'] || row['stock'] || row['cantidad'] || 0, 10),
          stock_minimo: parseInt(row['stockminimo'] || row['stock_minimo'] || 0, 10),
          unidad_venta: UnitType.UNIDAD,
          codigo_barra: row['codigobarras'] || row['codigo_barras'] || row['codigo de barras'] || row['codigo_barra'] || row['barcode'] || '',
        };
      }).filter(p => p.nombre && p.precio_venta > 0);

      if (parsedProducts.length === 0) {
        throw new Error('No se encontraron productos válidos. Asegúrate de que el archivo tenga al menos Nombre y Precio de Venta.');
      }

      setTotalItems(parsedProducts.length);
      
      let currentCompleted = 0;
      for (const product of parsedProducts) {
        try {
          await ApiService.addProduct(product);
        } catch (uploadErr) {
          console.warn('Failed to upload a product:', uploadErr);
        }
        
        currentCompleted++;
        setCompletedItems(currentCompleted);
        setProgress(Math.round((currentCompleted / parsedProducts.length) * 100));
        
        // Wait 100ms between requests to be safe
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
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
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden p-8"
      >
        <button 
          onClick={onClose} 
          disabled={isUploading}
          className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-900 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Cargar Base de Datos</h2>
          <p className="text-gray-500">Sube tu inventario en formato Excel o CSV.</p>
        </div>

        {success ? (
          <div className="text-center py-10">
            <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Carga Completada!</h3>
            <p className="text-gray-500">Se han guardado {completedItems} productos en tu inventario.</p>
          </div>
        ) : isUploading ? (
          <div className="py-8">
            <div className="flex justify-between text-sm font-bold text-gray-900 mb-2">
              <span>Guardando productos...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-500">
              {completedItems} de {totalItems} guardados
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <h4 className="font-bold text-blue-700 mb-1 text-sm">Plantilla de Referencia</h4>
              <p className="text-xs text-blue-700/70 mb-3">Descarga el ejemplo para ver exactamente cómo debe estar organizado tu archivo antes de subirlo.</p>
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow transition-shadow"
              >
                <Download size={16} /> Descargar Plantilla
              </button>
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${file ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-500 bg-gray-50'}`}
            >
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls, .xml, .ods"
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
              {file ? (
                <div>
                  <p className="font-bold text-blue-700 mb-1">{file.name}</p>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Quitar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Arrastra tu archivo aquí o</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 font-bold hover:text-blue-700 underline underline-offset-4"
                  >
                    selecciona un archivo
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
            >
              SUBIR E IMPORTAR PRODUCTOS
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

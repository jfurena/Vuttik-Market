import React, { useState, useRef } from 'react';
import { X, Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import * as xlsx from 'xlsx';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface EanBulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EanBulkUploadModal({ onClose, onSuccess }: EanBulkUploadModalProps) {
  useEscapeKey(onClose, true);
  const { user } = useAuth();
  
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
        EAN: '1234567890123',
        Nombre: 'Zapatos Deportivos',
        Descripcion: 'Zapatos cómodos para correr',
        Marca: 'Nike',
        Categoria: 'MODA',
        ImagenURL: 'https://ejemplo.com/imagen.jpg'
      }
    ];
    
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Productos_EAN");
    xlsx.writeFile(wb, "Plantilla_EAN_Vuttik.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.match(/\.(xlsx|csv)$/)) {
      setError('Por favor selecciona un archivo Excel (.xlsx) o CSV (.csv)');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);
    setCompletedItems(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('El archivo está vacío');
      }

      setTotalItems(jsonData.length);

      let processed = 0;
      let hasErrors = false;

      for (const row of jsonData) {
        try {
          if (!row.EAN || !row.Nombre) {
            console.warn('Fila ignorada por falta de EAN o Nombre:', row);
            processed++;
            continue;
          }

          const payload = {
            ean: String(row.EAN).trim(),
            name: String(row.Nombre).trim(),
            description: row.Descripcion ? String(row.Descripcion).trim() : '',
            brand: row.Marca ? String(row.Marca).trim() : '',
            category: row.Categoria ? String(row.Categoria).trim().toUpperCase() : '',
            image_url: row.ImagenURL ? String(row.ImagenURL).trim() : '',
            userId: user?.uid,
            created_by: user?.uid
          };

          await api.addEanEntry(payload);
        } catch (err) {
          console.error(`Error procesando fila ${processed + 1}:`, err);
          hasErrors = true;
        }

        processed++;
        setCompletedItems(processed);
        setProgress(Math.round((processed / jsonData.length) * 100));
      }

      if (hasErrors) {
        setError('Proceso finalizado con algunos errores. Verifica la consola para más detalles.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setError(err.message || 'Error al procesar el archivo. Verifica que el formato sea correcto.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isUploading ? onClose : undefined}
        className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h3 className="text-2xl font-black text-vuttik-navy mb-1">Carga Masiva EAN</h3>
            <p className="text-sm text-vuttik-text-muted font-medium">Sube múltiples códigos de barra desde un archivo Excel o CSV</p>
          </div>
          {!isUploading && (
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-vuttik-gray rounded-full transition-colors self-start"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h4 className="text-2xl font-black text-vuttik-navy mb-2">¡Carga Completada!</h4>
            <p className="text-vuttik-text-muted font-medium mb-8">
              Se han procesado {completedItems} productos correctamente.
            </p>
            <button
              onClick={() => {
                onClose();
                onSuccess();
              }}
              className="px-8 py-4 bg-vuttik-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-colors shadow-md"
            >
              Ver Base de Datos
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
            <div className="bg-blue-50/50 rounded-[24px] p-6 mb-8 border border-blue-100/50">
              <h4 className="font-bold text-vuttik-navy mb-2 flex items-center gap-2">
                <AlertCircle size={18} className="text-vuttik-blue" />
                Instrucciones
              </h4>
              <ol className="list-decimal list-inside text-sm text-vuttik-text-muted space-y-2 mb-4 font-medium">
                <li>Descarga la plantilla de Excel</li>
                <li>Rellena los datos de los productos (EAN y Nombre son obligatorios)</li>
                <li>Sube el archivo modificado aquí</li>
              </ol>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm font-bold text-vuttik-blue hover:text-blue-700 transition-colors"
              >
                <Download size={16} />
                Descargar Plantilla
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-vuttik-navy mb-3">Archivo de Datos</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-[24px] p-8 text-center cursor-pointer transition-all ${
                    file ? 'border-vuttik-blue bg-blue-50/30' : 'border-gray-200 hover:border-vuttik-blue/50 hover:bg-gray-50'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload size={32} className={`mx-auto mb-4 ${file ? 'text-vuttik-blue' : 'text-gray-400'}`} />
                  {file ? (
                    <div>
                      <p className="font-bold text-vuttik-navy">{file.name}</p>
                      <p className="text-xs text-vuttik-text-muted mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-gray-600">Haz clic para seleccionar tu archivo</p>
                      <p className="text-xs text-gray-400 mt-1">Soporta .xlsx y .csv</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-vuttik-navy flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-vuttik-blue" />
                      Procesando productos...
                    </span>
                    <span className="text-vuttik-blue">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-vuttik-blue transition-all duration-300 rounded-full"
                      style={{ width: `\${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-vuttik-text-muted text-center font-medium">
                    {completedItems} de {totalItems} procesados
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!success && (
          <div className="pt-6 border-t border-gray-50 shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1 py-4 bg-vuttik-blue text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50 disabled:hover:bg-vuttik-blue flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Procesar Archivo
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { api } from '../lib/api';
import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, MapPin, Plus, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MapDatabaseUpload() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPlace, setManualPlace] = useState({ nombre: '', latitud: '', longitud: '', direccion: '', categoria: '' });
  
  const handleManualSave = async () => {
    const lat = parseFloat(manualPlace.latitud);
    const lng = parseFloat(manualPlace.longitud);
    if (!manualPlace.nombre || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Nombre requerido y coordenadas deben ser números válidos (-90 a 90 lat, -180 a 180 lng)');
        return;
    }
    setLoading(true);
    try {
        await api.createMapPlace(manualPlace);
        alert('Lugar anadido correctamente');
        setIsManualModalOpen(false);
        setManualPlace({ nombre: '', latitud: '', longitud: '', direccion: '', categoria: '' });
    } catch (e: any) {
        alert(e.message || 'Error al anadir lugar');
    } finally {
        setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        nombre: 'Chimi Alexander El Rubio',
        latitud: 18.4832146,
        longitud: -69.953867,
        direccion: 'Los Jardines, Santo Domingo',
        categoria: 'Food Truck'
      },
      {
        nombre: 'Supermercado Nacional',
        latitud: 18.471853,
        longitud: -69.923411,
        direccion: 'Av. 27 de Febrero, SD',
        categoria: 'Supermercado'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_lugares_vuttik.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        throw new Error('El archivo está vacío');
      }

      const response = await fetch('/api/places/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vuttik_token')}`
        },
        body: JSON.stringify({ places: json })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Error al subir lugares');
      }

      setSuccess(`¡Éxito! Se han importado ${json.length} lugares al mapa de Vuttik.`);
    } catch (err: any) {
      setError(err.message || 'Error procesando el archivo');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] shadow-sm p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-vuttik-blue/10 text-vuttik-blue rounded-[24px] flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h3 className="text-2xl font-display font-black text-vuttik-navy mb-2">
            Base de Datos de Mapa
          </h3>
          <p className="text-vuttik-text-muted">
            Alimenta el mapa subiendo archivos Excel con lugares para que aparezcan en las búsquedas de todos los usuarios.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-bold">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={downloadTemplate}
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-3xl hover:border-vuttik-blue hover:bg-blue-50 transition-all text-vuttik-text-muted hover:text-vuttik-blue"
          >
            <Download size={32} />
            <span className="font-bold text-center">Descargar Plantilla</span>
            <span className="text-xs text-center opacity-70">Excel con el formato correcto</span>
          </button>

                      <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-3xl hover:border-vuttik-blue hover:bg-blue-50 transition-all text-vuttik-text-muted hover:text-vuttik-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
              <span className="font-bold text-center">Subir Archivo</span>
              <span className="text-xs text-center opacity-70">Importar lugares a la BD</span>
            </button>
            
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-3xl hover:border-vuttik-blue hover:bg-blue-50 transition-all text-vuttik-text-muted hover:text-vuttik-blue"
            >
              <Plus size={32} />
              <span className="font-bold text-center">Añadir Manualmente</span>
              <span className="text-xs text-center opacity-70">Ingresar un solo lugar</span>
            </button>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
          />
        </div>
      </div>
      
      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setIsManualModalOpen(false)}
              className="absolute right-6 top-6 p-2 bg-vuttik-gray text-vuttik-text-muted hover:text-vuttik-navy rounded-xl transition-all"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black text-vuttik-navy flex items-center gap-2 mb-6">
              <Plus className="text-vuttik-blue" />
              Añadir Lugar Manualmente
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Nombre *</label>
                <input 
                  type="text" 
                  value={manualPlace.nombre}
                  onChange={(e) => setManualPlace({...manualPlace, nombre: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                  placeholder="Ej. Colmado El Moreno"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Latitud *</label>
                  <input 
                    type="number" 
                    value={manualPlace.latitud}
                    onChange={(e) => setManualPlace({...manualPlace, latitud: e.target.value})}
                    className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                    placeholder="18.4861"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Longitud *</label>
                  <input 
                    type="number" 
                    value={manualPlace.longitud}
                    onChange={(e) => setManualPlace({...manualPlace, longitud: e.target.value})}
                    className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                    placeholder="-69.9312"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Dirección</label>
                <input 
                  type="text" 
                  value={manualPlace.direccion}
                  onChange={(e) => setManualPlace({...manualPlace, direccion: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Categoría (Opcional)</label>
                <input 
                  type="text" 
                  value={manualPlace.categoria}
                  onChange={(e) => setManualPlace({...manualPlace, categoria: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                  placeholder="Ej. supermercado"
                />
              </div>

              <button 
                onClick={handleManualSave}
                disabled={loading}
                className="w-full bg-vuttik-blue text-white mt-4 py-4 rounded-[20px] font-black uppercase tracking-widest hover:bg-vuttik-navy shadow-lg shadow-vuttik-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Guardar Lugar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

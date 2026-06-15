import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Check, ExternalLink } from 'lucide-react';
import { ApiService } from '../services/api';
import LocationInput from '../../components/LocationInput';

interface LocationPromptModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function LocationPromptModal({ isOpen, onComplete }: LocationPromptModalProps) {
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!coords) return;
    setIsSubmitting(true);
    try {
      const settings = await ApiService.getSettings() || {};
      settings.allowed_location = {
        ...coords,
        address: locationName || 'Ubicación del Negocio',
        radius_meters: 200
      };
      await ApiService.updateSettings(settings);
      
      // Also update the business profile in Vuttik Market (SQLite) using our custom endpoint
      try {
        await fetch('/api/businesses/' + ApiService.getBusinessId() + '/location', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('vuttik_token') // if any
          },
          body: JSON.stringify({ location: locationName, lat: coords.lat, lng: coords.lng })
        });
      } catch (e) {
        console.error("Failed to sync location to Vuttik Market", e);
      }

      onComplete();
    } catch (e) {
      console.error(e);
      alert('Error guardando la ubicación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Configura la Ubicación de tu Negocio</h2>
              <p className="text-sm text-emerald-700 mt-1">
                Esto es vital para que tus productos aparezcan en el mapa de Vuttik Market y los clientes cercanos te encuentren.
              </p>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 items-start border border-blue-100">
              <ExternalLink size={20} className="shrink-0 text-blue-500 mt-0.5" />
              <p>
                Al configurar tu ubicación aquí, Vuttik POS sincronizará automáticamente todos tus productos con el Market usando esta ubicación GPS.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Ubica tu negocio en el mapa:</label>
              <LocationInput 
                value={locationName}
                onChange={(name, placeName) => setLocationName(placeName || name)}
                onCoordinatesChange={(lat, lng) => setCoords({ lat, lng })}
                placeholder="Busca tu dirección o local..."
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={!coords || isSubmitting}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar y Continuar'}
              {!isSubmitting && <Check size={18} />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

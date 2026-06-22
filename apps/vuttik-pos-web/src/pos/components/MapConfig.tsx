import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ApiService } from '../services/api';
import { Shield, Save, Navigation, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LocationInput from './LocationInput';

// Fix for default Leaflet icon paths in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// MapEvents handles dragging and clicking
function MapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Updater component to sync center
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 18.4861, lng: -69.9312 }); // Default Santo Domingo
  const [address, setAddress] = useState('Santo Domingo, República Dominicana');
  const [radius, setRadius] = useState(200);
  
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Load current config settings first
    const loadSettings = async () => {
      try {
        const settings = await ApiService.getSettings();
        if (settings && settings.allowed_location) {
          const loc = settings.allowed_location;
          setCoords({ lat: loc.lat, lng: loc.lng });
          setAddress(loc.address || '');
          setRadius(loc.radius_meters || 200);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Error al cargar la ubicación autorizada");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (e) {
      console.error(e);
      setAddress(`Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  // Center on browser's current GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      },
      (err) => {
        console.error("Locate me failed:", err);
        alert("No se pudo obtener tu ubicación de GPS actual. Asegúrate de dar los permisos correspondientes.");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const payload = {
        allowed_location: {
          lat: coords.lat,
          lng: coords.lng,
          address: address.trim() || `Coordenadas: ${coords.lat}, ${coords.lng}`,
          radius_meters: radius
        }
      };
      
      const response = await ApiService.updateSettings(payload);
      if (response) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Save settings failed:", err);
      setError("No se pudo guardar la ubicación de restricción.");
    } finally {
      setSaving(false);
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const position = marker.getLatLng();
          setCoords({ lat: position.lat, lng: position.lng });
          reverseGeocode(position.lat, position.lng);
        }
      },
    }),
    [],
  );

  const handleMapClick = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    reverseGeocode(lat, lng);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Cargando mapa de configuraciones...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 p-1 font-sans">
      {/* Settings Form Column */}
      <div className="space-y-8 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-950 uppercase tracking-tight">Geocercas de Seguridad Activas</h4>
              <p className="text-xs text-emerald-700/85 font-semibold">
                Cuando estableces un perímetro de GPS, el sistema validará que los empleados en turno estén obligatoriamente dentro del rango de metros para iniciar sesión u operar el punto de venta.
              </p>
            </div>
          </div>

          {/* Integrated premium LocationInput from reference app */}
          <LocationInput
            label="Dirección o Nombre de Localización"
            value={address}
            onChange={setAddress}
            onCoordinatesChange={(lat, lng) => setCoords({ lat, lng })}
            placeholder="Busca una calle, sector o negocio..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-2">Latitud</label>
              <input
                type="number"
                step="any"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm outline-none"
                value={coords.lat}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setCoords(prev => ({ ...prev, lat: val }));
                }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-2">Longitud</label>
              <input
                type="number"
                step="any"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm outline-none"
                value={coords.lng}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setCoords(prev => ({ ...prev, lng: val }));
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-400 tracking-wider">
              <span>Perímetro de Acceso</span>
              <span className="text-blue-600 font-extrabold text-xs">{radius} Metros</span>
            </div>
            <input
              type="range"
              min="20"
              max="2000"
              step="10"
              value={radius}
              onChange={e => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
              <span>20m (Exacto)</span>
              <span>200m (Ideal)</span>
              <span>2km (Libre)</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          {error && (
            <p className="text-red-600 font-bold text-sm bg-red-50 p-3 rounded-xl border border-red-100 mb-2">{error}</p>
          )}
          {success && (
            <p className="text-emerald-700 font-bold text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-2">¡Configuración de geolocalización guardada exitosamente!</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLocateMe}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              <Navigation className="h-4 w-4 text-slate-500" />
              Usar mi ubicación actual
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Perímetro'}
            </button>
          </div>
        </div>
      </div>

      {/* Map Display Column */}
      <div className="space-y-3 relative z-0">
        <div className="text-[10px] uppercase font-black text-gray-400 tracking-wider flex justify-between items-center">
          <span>Vista Interactiva</span>
          <span className="text-[10px] text-gray-400 font-bold">Arrastra el marcador o haz clic en el mapa</span>
        </div>
        <div className="w-full h-[400px] lg:h-[480px] bg-gray-100 rounded-[2.5rem] border-4 border-gray-100 shadow-inner overflow-hidden relative">
          <MapContainer 
            center={[coords.lat, coords.lng]} 
            zoom={16} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={[coords.lat, coords.lng]} />
            <MapEvents onLocationChange={handleMapClick} />
            <Circle 
              center={[coords.lat, coords.lng]} 
              radius={radius} 
              pathOptions={{ fillColor: '#10b981', color: '#059669', fillOpacity: 0.15, weight: 2 }} 
            />
            <Marker 
              position={[coords.lat, coords.lng]} 
              draggable={true} 
              eventHandlers={eventHandlers} 
              ref={markerRef}
            />
          </MapContainer>
        </div>
        <div className="text-[10px] text-gray-400 font-bold text-center">
          El círculo verde muestra el área donde tus empleados tendrán permitido abrir caja y facturar.
        </div>
      </div>
    </div>
  );
}

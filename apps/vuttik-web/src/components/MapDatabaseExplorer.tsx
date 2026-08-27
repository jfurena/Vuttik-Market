import React, { useState, useEffect } from 'react';
import { Search, MapPin, Edit2, Trash2, X, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet Default Icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapDatabaseExplorer: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Edit State
  const [editingPlace, setEditingPlace] = useState<any>(null);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.4861, -69.9312]); // DR Default

  const fetchPlaces = async (searchQuery: string, pageNum: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getMapPlaces(searchQuery, pageNum, 20);
      setPlaces(res.places);
      setTotalPages(res.totalPages);
      
      // Auto-center map on first result if exists
      if (res.places.length > 0) {
        setMapCenter([parseFloat(res.places[0].latitud), parseFloat(res.places[0].longitud)]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar lugares');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchPlaces(search, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchPlaces(search, newPage);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este lugar?')) return;
    try {
      await api.deleteMapPlace(id);
      setPlaces(places.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPlace) return;
    try {
      await api.updateMapPlace(editingPlace.id, editingPlace);
      setPlaces(places.map(p => p.id === editingPlace.id ? editingPlace : p));
      setEditingPlace(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-vuttik-navy flex items-center gap-2">
            <Search className="text-vuttik-blue" size={24} />
            Explorador de Mapa
          </h3>
          <p className="text-vuttik-text-muted mt-1">Busca, edita y administra los lugares de la base de datos.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-vuttik-gray/50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20 transition-all text-sm font-medium"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 h-[800px] lg:h-[600px]">
        {/* Table/List View */}
        <div className="bg-vuttik-gray/20 rounded-2xl overflow-hidden border border-gray-100 flex flex-col h-1/2 lg:h-auto">
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-vuttik-text-muted">
                <Loader2 size={32} className="animate-spin mb-2" />
                Cargando lugares...
              </div>
            ) : places.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-vuttik-text-muted">
                <MapPin size={48} className="text-gray-300 mb-2" />
                No se encontraron lugares.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {places.map((place) => (
                  <div key={place.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-vuttik-blue/10 text-vuttik-blue rounded-full shrink-0">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-vuttik-navy">{place.nombre}</h4>
                          <p className="text-xs text-vuttik-text-muted line-clamp-1">{place.direccion || 'Sin dirección'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-md text-gray-500">
                              {place.latitud}, {place.longitud}
                            </span>
                            {place.categoria && (
                              <span className="text-[10px] bg-vuttik-blue/10 text-vuttik-blue px-2 py-1 rounded-md font-bold uppercase">
                                {place.categoria}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => {
                            setEditingPlace(place);
                            setMapCenter([parseFloat(place.latitud), parseFloat(place.longitud)]);
                          }}
                          className="p-2 text-gray-400 hover:text-vuttik-blue hover:bg-vuttik-blue/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(place.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 bg-white flex justify-center items-center gap-2 shrink-0">
              <button 
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-3 py-1 bg-vuttik-gray rounded-md text-sm font-bold text-vuttik-navy hover:bg-vuttik-blue hover:text-white disabled:opacity-50"
              >
                Ant
              </button>
              <span className="text-sm font-medium text-vuttik-text-muted">Pág {page} de {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-3 py-1 bg-vuttik-gray rounded-md text-sm font-bold text-vuttik-navy hover:bg-vuttik-blue hover:text-white disabled:opacity-50"
              >
                Sig
              </button>
            </div>
          )}
        </div>

        {/* Map View */}
        <div className="bg-gray-100 rounded-2xl overflow-hidden relative z-0 border border-gray-100 h-1/2 lg:h-auto">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            />
            <ChangeView center={mapCenter} zoom={13} />
            
            {places.filter(place => !isNaN(parseFloat(place.latitud)) && !isNaN(parseFloat(place.longitud))).map((place) => (
              <Marker 
                key={place.id} 
                position={[parseFloat(place.latitud), parseFloat(place.longitud)]}
              >
                <Popup>
                  <div className="font-bold">{place.nombre}</div>
                  <div className="text-xs">{place.direccion}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setEditingPlace(null)}
              className="absolute right-6 top-6 p-2 bg-vuttik-gray text-vuttik-text-muted hover:text-vuttik-navy rounded-xl transition-all"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black text-vuttik-navy flex items-center gap-2 mb-6">
              <Edit2 className="text-vuttik-blue" />
              Editar Lugar
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Nombre</label>
                <input 
                  type="text" 
                  value={editingPlace.nombre}
                  onChange={(e) => setEditingPlace({...editingPlace, nombre: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Latitud</label>
                  <input 
                    type="number" 
                    value={editingPlace.latitud}
                    onChange={(e) => setEditingPlace({...editingPlace, latitud: e.target.value})}
                    className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Longitud</label>
                  <input 
                    type="number" 
                    value={editingPlace.longitud}
                    onChange={(e) => setEditingPlace({...editingPlace, longitud: e.target.value})}
                    className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Dirección</label>
                <input 
                  type="text" 
                  value={editingPlace.direccion || ''}
                  onChange={(e) => setEditingPlace({...editingPlace, direccion: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-vuttik-navy uppercase tracking-wider ml-2 mb-1 block">Categoría (Opcional)</label>
                <input 
                  type="text" 
                  value={editingPlace.categoria || ''}
                  onChange={(e) => setEditingPlace({...editingPlace, categoria: e.target.value})}
                  className="w-full bg-vuttik-gray/50 px-5 py-4 rounded-[20px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-vuttik-blue/20"
                />
              </div>

              <button 
                onClick={handleSaveEdit}
                className="w-full bg-vuttik-blue text-white mt-4 py-4 rounded-[20px] font-black uppercase tracking-widest hover:bg-vuttik-navy shadow-lg shadow-vuttik-blue/20 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDatabaseExplorer;

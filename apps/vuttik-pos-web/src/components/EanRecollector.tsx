import React, { useState, useEffect } from 'react';
import { Search, Plus, Barcode, Edit2, X, Package, Tag, Save, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function EanRecollector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ean: '',
    name: '',
    description: '',
    brand: '',
    category: '',
    image_url: ''
  });
  const [saving, setSaving] = useState(false);

  const isAdminOrGuardian = user?.role === 'admin' || user?.role === 'mega_guardian' || user?.role === 'guardian';

  const loadData = async (q: string = '') => {
    setLoading(true);
    try {
      const data = await api.searchEanDatabase(q);
      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      if (!isAdminOrGuardian) {
        alert("Solo los guardianes pueden editar la base de datos de EAN.");
        return;
      }
      setIsEditing(true);
      setFormData({
        ean: item.ean || '',
        name: item.name || '',
        description: item.description || '',
        brand: item.brand || '',
        category: item.category || '',
        image_url: item.image_url || ''
      });
    } else {
      setIsEditing(false);
      setFormData({
        ean: '',
        name: '',
        description: '',
        brand: '',
        category: '',
        image_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ean || !formData.name) {
      alert("El código EAN y el Nombre son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        userId: user?.uid,
        created_by: user?.uid
      };

      if (isEditing) {
        await api.updateEanEntry(formData.ean, payload);
      } else {
        await api.addEanEntry(payload);
      }
      setIsModalOpen(false);
      loadData(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Ocurrió un error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/herramientas')}
          className="p-2 md:p-3 bg-vuttik-gray/50 rounded-2xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={20} className="md:size-5" />
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy tracking-tight">EAN Recollector</h1>
          <p className="text-vuttik-text-muted font-medium">Base de Datos Global de Códigos de Barra</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por código EAN, nombre o marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl px-12 py-4 shadow-sm focus:border-vuttik-blue transition-colors outline-none text-sm md:text-base font-bold"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-vuttik-blue text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-colors shadow-md"
        >
          <Plus size={20} />
          Añadir Producto
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {loading && results.length === 0 ? (
          <div className="p-12 text-center text-vuttik-text-muted">
            <div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold">Cargando base de datos...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center text-vuttik-text-muted flex flex-col items-center">
            <Barcode size={48} className="opacity-20 mb-4" />
            <p className="font-bold text-lg mb-2">No se encontraron resultados</p>
            <p className="text-sm">Intenta con otro código EAN o sé el primero en agregarlo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-vuttik-gray/30 text-vuttik-text-muted text-xs uppercase tracking-wider">
                  <th className="p-4 font-black">Producto</th>
                  <th className="p-4 font-black">EAN</th>
                  <th className="p-4 font-black">Marca</th>
                  <th className="p-4 font-black">Categoría</th>
                  {isAdminOrGuardian && <th className="p-4 font-black text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((item) => (
                  <tr key={item.ean} className="hover:bg-vuttik-gray/20 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-vuttik-gray flex items-center justify-center text-vuttik-navy overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-vuttik-navy text-sm md:text-base">{item.name}</p>
                          {item.description && <p className="text-xs text-vuttik-text-muted truncate max-w-xs">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-vuttik-navy font-bold">{item.ean}</td>
                    <td className="p-4 text-sm text-gray-600 font-medium">{item.brand || '-'}</td>
                    <td className="p-4">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-vuttik-gray text-vuttik-navy text-xs font-bold">
                          <Tag size={12} />
                          {item.category}
                        </span>
                      ) : '-'}
                    </td>
                    {isAdminOrGuardian && (
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-gray-400 hover:text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-vuttik-navy">
                  {isEditing ? 'Editar Producto EAN' : 'Añadir Producto EAN'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-vuttik-gray rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">Código EAN *</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formData.ean}
                    onChange={e => setFormData({...formData, ean: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue disabled:opacity-50"
                    placeholder="Ej. 7460001000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue"
                    placeholder="Ej. Refresco Cola 2L"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue"
                      placeholder="Ej. Coca Cola"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">Categoría</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue"
                      placeholder="Ej. Bebidas"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue min-h-[80px] resize-none"
                    placeholder="Breve descripción del producto..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-vuttik-text-muted uppercase mb-1">URL de Imagen (Opcional)</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="w-full bg-vuttik-gray rounded-xl px-4 py-3 text-sm font-bold outline-none border border-transparent focus:border-vuttik-blue"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-sm bg-gray-100 text-vuttik-navy hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-vuttik-blue text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={16} />
                    )}
                    {isEditing ? 'Guardar Cambios' : 'Añadir a BD'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

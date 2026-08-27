import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Loader2, Search, Edit2, Trash2, X, Check, Server, FileJson, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TABLES = [
  { source: 'sqlite', name: 'vuttik_users', label: 'Usuarios (SQLite)' },
  { source: 'sqlite', name: 'vuttik_business_profiles', label: 'Perfiles Negocio (SQLite)' },
  { source: 'sqlite', name: 'vuttik_business_requests', label: 'Peticiones POS (SQLite)' },
  { source: 'sqlite', name: 'vuttik_products', label: 'Productos Market (SQLite)' },
  { source: 'sqlite', name: 'vuttik_subscription_plans', label: 'Planes (SQLite)' },
  { source: 'json', name: 'owners', label: 'POS Owners (JSON)' },
  { source: 'json', name: 'businesses', label: 'POS Businesses (JSON)' },
];

export default function DatabaseExplorer() {
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [editingRow, setEditingRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.getMegaGuardianDB(activeTable.source, activeTable.name);
      setData(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTable]);

  const handleEdit = (row: any) => {
    setEditingRow(row);
    setEditForm({ ...row });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const id = editForm.uid || editForm.id;
      if (!id) throw new Error('No se encontró ID o UID en el registro.');
      
      await api.updateMegaGuardianDB(activeTable.source, activeTable.name, id, editForm);
      setEditingRow(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await api.deleteMegaGuardianDB(activeTable.source, activeTable.name, id);
      setDeletingId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Explorador de Base de Datos</h2>
          <p className="text-slate-500 font-bold text-sm mt-1">Acceso directo a SQLite y db.json</p>
        </div>
        
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm border border-red-100 shadow-sm">
          <AlertTriangle size={18} />
          Modo Peligro: Modificaciones directas
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm overflow-y-auto shrink-0 flex flex-col gap-2">
          {TABLES.map(table => (
            <button
              key={table.name}
              onClick={() => setActiveTable(table)}
              className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${
                activeTable.name === table.name
                  ? 'bg-vuttik-blue text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {table.source === 'sqlite' ? <Server size={18} /> : <FileJson size={18} />}
              <span className="font-bold text-sm truncate">{table.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar en todos los campos..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-vuttik-blue transition-all font-bold text-sm"
              />
            </div>
            
            <div className="text-slate-500 text-sm font-bold">
              {filteredData.length} registros
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-vuttik-blue" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-red-500 font-bold">
                {error}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                No hay datos para mostrar
              </div>
            ) : (
              <div className="inline-block min-w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-black text-slate-700">Acciones</th>
                      {columns.map(col => (
                        <th key={col} className="px-4 py-3 font-black text-slate-700">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, i) => {
                      const rowId = row.uid || row.id;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(row)}
                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingId(rowId)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                          {columns.map(col => (
                            <td key={col} className="px-4 py-2 text-slate-600 font-mono text-[11px] max-w-[200px] truncate">
                              {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-xl font-black text-slate-900">Editar Registro</h3>
                <button onClick={() => setEditingRow(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-4 space-y-5 flex-1 custom-scrollbar">
                {Object.keys(editForm).map(key => {
                  if (key === 'id' || key === 'uid') {
                    return (
                      <div key={key}>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{key} (Solo Lectura)</label>
                        <input
                          type="text"
                          value={String(editForm[key] ?? '')}
                          disabled
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-mono text-sm"
                        />
                      </div>
                    );
                  }
                  
                  const isObject = typeof editForm[key] === 'object' && editForm[key] !== null;
                  const displayValue = isObject ? JSON.stringify(editForm[key], null, 2) : (editForm[key] ?? '');
                  
                  return (
                    <div key={key}>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{key}</label>
                      {isObject || String(displayValue).length > 50 ? (
                        <textarea
                          value={displayValue}
                          onChange={e => {
                            let val: any = e.target.value;
                            if (isObject) {
                              try { val = JSON.parse(val); } catch (e) {}
                            }
                            setEditForm({ ...editForm, [key]: val });
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 focus:ring-2 focus:ring-vuttik-blue/20 focus:border-vuttik-blue rounded-xl text-slate-900 font-mono text-sm min-h-[100px] transition-all outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(displayValue)}
                          onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 focus:ring-2 focus:ring-vuttik-blue/20 focus:border-vuttik-blue rounded-xl text-slate-900 font-mono text-sm transition-all outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end gap-3 mt-6 shrink-0 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setEditingRow(null)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-colors text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-6 py-3.5 bg-vuttik-blue hover:bg-blue-600 text-white font-black rounded-xl transition-colors flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl border border-red-100 shadow-2xl p-8 w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">¿Eliminar Registro?</h3>
              <p className="text-slate-500 font-medium mb-8">
                Esta acción es irreversible y podría causar inconsistencias en la base de datos si eliminas dependencias.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-colors text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Eliminar Permanentemente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

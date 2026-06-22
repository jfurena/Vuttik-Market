import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Wallet, Calendar, Tag, Trash2, AlertCircle, ArrowRightLeft, Info } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClickableDate from '../components/ClickableDate';

export default function Expenses() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  
  const [newExpense, setNewExpense] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Otros',
    pagado_desde_caja: false,
    fecha: new Date().toLocaleDateString('en-CA')
  });

  const [newTransfer, setNewTransfer] = useState({
    origen: 'Caja',
    destino: 'Banco',
    monto: ''
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getExpenses();
      setExpenses(Array.isArray(data) ? data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) : []);
    } catch (error) {
      console.error("Error loading expenses:", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      let locationMetadata = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
        });
        locationMetadata = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        console.warn("Could not retrieve GPS metadata for expense register:", err);
      }

      await ApiService.addExpense({
        ...newExpense,
        monto: parseFloat(newExpense.monto),
        usuario_id: profile.id,
        usuario_nombre: profile.nombre
      }, locationMetadata);
      setShowAddModal(false);
      setNewExpense({ 
        descripcion: '', 
        monto: '', 
        categoria: 'Otros', 
        pagado_desde_caja: false,
        fecha: new Date().toLocaleDateString('en-CA')
      });
      loadExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await ApiService.transferFunds({
        ...newTransfer,
        monto: parseFloat(newTransfer.monto),
        usuario_id: profile.id
      });
      setShowTransferModal(false);
      setNewTransfer({ origen: 'Caja', destino: 'Banco', monto: '' });
      // Reload something if needed, but transfers don't show in expenses list directly right now
    } catch (error) {
      console.error("Error transferring funds:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gastos y Pagos</h1>
          <p className="text-gray-500 font-medium">Registra aquí cualquier dinero que salga del negocio.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex-1 sm:flex-none bg-blue-100 text-blue-700 px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-200 transition-all shadow-sm"
          >
            <ArrowRightLeft className="h-5 w-5" />
            TRANSFERIR
          </button>
          <button 
            id="add-expense-btn"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <Plus className="h-5 w-5" />
            REGISTRAR GASTO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-4 rounded-2xl text-red-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Gastos</p>
            <p className="text-2xl font-black text-gray-900">
              {formatCurrency(expenses.reduce((acc, curr) => acc + curr.monto, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Descripción</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg text-gray-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        <ClickableDate date={expense.fecha} />
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-gray-900">{expense.descripcion}</span>
                      {expense.pagado_desde_caja && (
                        <span className="w-fit bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider">
                          SACADO DE CAJA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">
                      {expense.categoria}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-red-600">
                      -{formatCurrency(expense.monto)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => setViewingExpense(expense)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium">
                    No hay gastos registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl space-y-6"
            >
              <div className="text-center">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Transferir Fondos</h3>
                <p className="text-gray-500 font-medium font-sans">Mueve dinero entre cuentas</p>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Origen</label>
                    <select 
                      value={newTransfer.origen}
                      onChange={e => setNewTransfer({...newTransfer, origen: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold appearance-none"
                    >
                      <option value="Caja">Caja</option>
                      <option value="Banco">Banco</option>
                      <option value="Inversion Externa">Inversión Externa (Dueño)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Destino</label>
                    <select 
                      value={newTransfer.destino}
                      onChange={e => setNewTransfer({...newTransfer, destino: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold appearance-none"
                    >
                      <option value="Banco">Banco</option>
                      <option value="Caja">Caja</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto a transferir (RD$)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newTransfer.monto}
                    onChange={e => setNewTransfer({...newTransfer, monto: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all font-sans"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    TRANSFERIR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl space-y-6"
            >
              <div className="text-center">
                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Tag className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Registrar Gasto</h3>
                <p className="text-gray-500 font-medium font-sans">Ingresa los detalles del egreso</p>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción del Gasto</label>
                  <input 
                    required
                    type="text"
                    value={newExpense.descripcion}
                    onChange={e => setNewExpense({...newExpense, descripcion: e.target.value})}
                    placeholder="Ej. Pago de Salario - Juan"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Fecha del Gasto</label>
                  <input 
                    required
                    type="date"
                    value={newExpense.fecha}
                    onChange={e => setNewExpense({...newExpense, fecha: e.target.value})}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto (RD$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newExpense.monto}
                      onChange={e => setNewExpense({...newExpense, monto: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                    <select 
                      value={newExpense.categoria}
                      onChange={e => setNewExpense({...newExpense, categoria: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold appearance-none"
                    >
                      <option value="Salario">Salario</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-red-50/50 rounded-2xl border-2 border-dashed border-red-100">
                  <input 
                    type="checkbox"
                    id="paid-from-caja"
                    checked={newExpense.pagado_desde_caja}
                    onChange={e => setNewExpense({...newExpense, pagado_desde_caja: e.target.checked})}
                    className="h-5 w-5 rounded border-red-200 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="paid-from-caja" className="flex-1 text-xs font-black text-red-700 uppercase cursor-pointer">
                    ¿Se pagó con dinero de caja?
                    <span className="block font-medium normal-case text-[10px] text-red-500">Esto restará el dinero del turno actual automáticamente</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all font-sans"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    GUARDAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Expense Modal */}
      <AnimatePresence>
        {viewingExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="text-center">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Info className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Detalle del Registro</h3>
                <p className="text-gray-500 font-medium text-sm mt-1">{viewingExpense.id}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</span>
                    <span className="text-sm font-bold text-gray-900"><ClickableDate date={viewingExpense.fecha} /></span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Descripción</span>
                    <span className="text-sm font-black text-gray-900 text-right ml-4">{viewingExpense.descripcion}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Categoría</span>
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-bold uppercase">{viewingExpense.categoria}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Monto</span>
                    <span className="text-lg font-black text-red-600">{formatCurrency(viewingExpense.monto)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fuente de Pago</span>
                    <span className="text-sm font-bold text-gray-900">{viewingExpense.pagado_desde_caja ? 'Dinero de Caja' : (viewingExpense.fuente_pago || 'No especificado')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Procesado por</span>
                    <span className="text-sm font-bold text-gray-900">{viewingExpense.usuario_nombre || 'Desconocido'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setViewingExpense(null)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all shadow-lg"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

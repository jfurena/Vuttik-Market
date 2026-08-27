import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Wallet, Calendar, Tag, Trash2, AlertCircle, ArrowRightLeft, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Calendar states
  const initToday = new Date();
  const [filterDate, setFilterDate] = useState<string>('todos');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonthView, setCurrentMonthView] = useState<Date>(new Date());

  const handlePrevMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (tempStartDate && !tempEndDate) {
      if (date >= tempStartDate) {
        setTempEndDate(date);
      } else {
        setTempStartDate(date);
        setTempEndDate(null);
      }
    }
  };

  const applyPreset = (preset: string) => {
    const todayVal = new Date();
    setFilterDate(preset);
    
    if (preset === 'todos') {
      setStartDate(null);
      setEndDate(null);
      setTempStartDate(null);
      setTempEndDate(null);
    } else if (preset === 'hoy') {
      const d = new Date(todayVal);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'ayer') {
      const d = new Date(todayVal);
      d.setDate(todayVal.getDate() - 1);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'semana') {
      const start = new Date(todayVal);
      start.setDate(todayVal.getDate() - 6);
      setStartDate(start);
      setEndDate(todayVal);
      setTempStartDate(start);
      setTempEndDate(todayVal);
    } else if (preset === 'mes_30') {
      const start = new Date(todayVal);
      start.setDate(todayVal.getDate() - 29);
      setStartDate(start);
      setEndDate(todayVal);
      setTempStartDate(start);
      setTempEndDate(todayVal);
    } else if (preset === 'mes') {
      const start = new Date(todayVal.getFullYear(), todayVal.getMonth(), 1);
      const end = new Date(todayVal.getFullYear(), todayVal.getMonth() + 1, 0);
      setStartDate(start);
      setEndDate(end);
      setTempStartDate(start);
      setTempEndDate(end);
    } else if (preset === 'mes_anterior') {
      const start = new Date(todayVal.getFullYear(), todayVal.getMonth() - 1, 1);
      const end = new Date(todayVal.getFullYear(), todayVal.getMonth(), 0);
      setStartDate(start);
      setEndDate(end);
      setTempStartDate(start);
      setTempEndDate(end);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    interface DayItem {
      date: Date;
      isCurrentMonth: boolean;
    }
    const days: DayItem[] = [];
    
    const prevMonthIndex = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevMonthYear, prevMonthIndex, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remaining = 42 - days.length;
    const nextMonthIndex = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(nextMonthYear, nextMonthIndex, i),
        isCurrentMonth: false
      });
    }
    return days;
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filterDate === 'todos') return true;
    if (startDate || endDate) {
      // Parse expense date which is normally YYYY-MM-DD or ISO
      // Wait, expense.fecha is usually ISO string from DB, e.g. "2026-06-29T12:00:00Z"
      const expenseTime = new Date(expense.fecha).getTime();
      const startOfDay = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy.getTime();
      };
      const endOfDay = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(23, 59, 59, 999);
        return copy.getTime();
      };

      if (startDate && endDate) {
        if (expenseTime < startOfDay(startDate) || expenseTime > endOfDay(endDate)) return false;
      } else if (startDate) {
        if (expenseTime < startOfDay(startDate)) return false;
      } else if (endDate) {
        if (expenseTime > endOfDay(endDate)) return false;
      }
    }
    return true;
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
    <div className="space-y-8 pb-20">
      {/* HEADER COMPACTO */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 p-6 sm:p-8 text-white shadow-xl shadow-red-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wallet className="w-48 h-48 transform rotate-12 translate-x-12 -translate-y-4" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">Gastos y Pagos</h1>
            <p className="text-red-100 font-medium text-sm max-w-sm leading-relaxed">Controla el flujo de salida de dinero de tu negocio.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setShowTransferModal(true)}
              className="flex-1 sm:flex-none bg-white/10 backdrop-blur-md text-white border border-white/20 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/20 transition-all shadow-md text-sm"
            >
              <ArrowRightLeft className="h-4 w-4" />
              TRANSFERIR
            </button>
            <button 
              id="add-expense-btn"
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none bg-white text-red-600 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/10 text-sm"
            >
              <Plus className="h-4 w-4" />
              REGISTRAR GASTO
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="bg-white/20 p-3 rounded-xl text-white backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-100 uppercase tracking-wider mb-0.5">Total Gastos (Periodo)</p>
              <p className="text-3xl font-black text-white drop-shadow-sm font-mono tracking-tight">
                {formatCurrency(filteredExpenses.reduce((acc, curr) => acc + curr.monto, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS Y CALENDARIO */}
      <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative">
        <h3 className="font-black text-gray-800 text-lg">Historial de Gastos</h3>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-100 text-xs font-bold rounded-xl py-2 px-4 text-gray-750 outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center gap-2 transition-all shadow-sm"
          >
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span>
              {filterDate === 'todos' && 'Cualquier fecha'}
              {filterDate === 'hoy' && 'Hoy'}
              {filterDate === 'ayer' && 'Ayer'}
              {filterDate === 'semana' && 'Últimos 7 días'}
              {filterDate === 'mes_30' && 'Últimos 30 días'}
              {filterDate === 'mes' && 'Este mes'}
              {filterDate === 'mes_anterior' && 'Mes anterior'}
              {filterDate === 'personalizado' && startDate && endDate && (
                `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
              )}
              {filterDate === 'personalizado' && startDate && !endDate && (
                `Desde ${format(startDate, 'dd/MM/yyyy')}...`
              )}
            </span>
          </button>

          <AnimatePresence>
            {isCalendarOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsCalendarOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-[540px] max-w-[92vw] sm:max-w-none bg-white border border-gray-150 rounded-[2rem] shadow-2xl p-5 z-[110] flex flex-col md:flex-row gap-5 font-sans divide-y md:divide-y-0 md:divide-x divide-gray-100"
                >
                  <div className="w-full md:w-44 shrink-0 flex flex-col gap-1 pb-4 md:pb-0 md:pr-4">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2.5 mb-2 block">Atajos</span>
                    {[
                      { id: 'todos', label: 'Cualquier fecha' },
                      { id: 'hoy', label: 'Hoy' },
                      { id: 'ayer', label: 'Ayer' },
                      { id: 'semana', label: 'Últimos 7 días' },
                      { id: 'mes_30', label: 'Últimos 30 días' },
                      { id: 'mes', label: 'Este mes' },
                      { id: 'mes_anterior', label: 'Mes anterior' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          applyPreset(p.id);
                          if (p.id !== 'personalizado') {
                            setIsCalendarOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full text-left py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                          filterDate === p.id 
                            ? "bg-blue-50 text-blue-700" 
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <span>{p.label}</span>
                        {filterDate === p.id && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 pt-4 md:pt-0 md:pl-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </button>
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                        {format(currentMonthView, 'MMMM yyyy', { locale: es })}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 lg:tracking-wider pb-1 border-b border-gray-50">
                      {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => (
                        <div key={day} className="py-1">{day}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 select-none">
                      {getDaysInMonth(currentMonthView).map(({ date, isCurrentMonth }, idx) => {
                        const isSelectedStart = tempStartDate && date.toDateString() === tempStartDate.toDateString();
                        const isSelectedEnd = tempEndDate && date.toDateString() === tempEndDate.toDateString();
                        const isInRange = tempStartDate && tempEndDate && date > tempStartDate && date < tempEndDate;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDayClick(date)}
                            className={cn(
                              "h-8 text-center text-xs font-bold transition-all relative flex items-center justify-center rounded-lg",
                              !isCurrentMonth ? "text-gray-200 pointer-events-none" : "text-gray-700",
                              isInRange && "bg-blue-50/70 text-blue-800 rounded-none",
                              isSelectedStart && "bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 z-10 font-black shadow-md shadow-blue-500/10",
                              isSelectedEnd && "bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 z-10 font-black shadow-md shadow-blue-500/10",
                              !isSelectedStart && !isSelectedEnd && !isInRange && isCurrentMonth && "hover:bg-gray-100"
                            )}
                          >
                            <span>{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Rango: {tempStartDate ? (
                          <span className="text-blue-700 font-black">
                            {format(tempStartDate, 'dd/MM/yyyy')} {tempEndDate ? `al ${format(tempEndDate, 'dd/MM/yyyy')}` : '...'}
                          </span>
                        ) : (
                          'Selecciona fechas'
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            applyPreset('todos');
                            setIsCalendarOpen(false);
                          }}
                          className="px-2.5 py-1.5 text-red-500 hover:bg-red-50 font-black rounded-lg text-[9px] uppercase tracking-wider"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (tempStartDate) {
                              setStartDate(tempStartDate);
                              setEndDate(tempEndDate || tempStartDate);
                              setFilterDate('personalizado');
                            }
                            setIsCalendarOpen(false);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shadow-sm transition-all"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-500"></div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Descripción</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Monto</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="group bg-white hover:bg-gray-50/80 transition-all rounded-2xl shadow-sm hover:shadow-md">
                  <td className="px-6 py-5 rounded-l-2xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-50/50 group-hover:bg-red-100/80 p-2.5 rounded-xl text-red-400 transition-colors">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        <ClickableDate date={expense.fecha} />
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-black text-gray-900 line-clamp-2 leading-snug">{expense.descripcion}</span>
                      {expense.pagado_desde_caja && (
                        <span className="w-fit bg-red-100/50 text-red-600 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest border border-red-100">
                          SACADO DE CAJA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-gray-100/80 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200/50">
                      {expense.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-base font-black text-red-600 tracking-tight">
                      -{formatCurrency(expense.monto)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right rounded-r-2xl">
                    <button 
                      onClick={() => setViewingExpense(expense)}
                      className="px-4 py-2 bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-transparent hover:border-red-100"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-gray-50 p-4 rounded-full">
                        <Wallet className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium">No hay gastos registrados aún.</p>
                    </div>
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

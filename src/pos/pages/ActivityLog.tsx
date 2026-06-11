import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { cn } from '../lib/utils';
import { ShoppingBag, Truck, Lock, Activity, User, Search, Calendar, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLogItem {
  id: string;
  fecha: Date;
  usuario_id: string;
  usuario_nombre: string;
  accion: string;
  detalles: string;
  modulo: string;
}

const getModuloIcon = (modulo: string) => {
  switch (modulo) {
    case 'Ventas': return <ShoppingBag className="h-5 w-5" />;
    case 'Inventario': return <Truck className="h-5 w-5" />;
    case 'Seguridad': return <Lock className="h-5 w-5" />;
    case 'Gastos': return <ShoppingBag className="h-5 w-5 text-red-500" />;
    default: return <Activity className="h-5 w-5" />;
  }
};

const getAccionColor = (accion: string) => {
  if (accion.includes('Eliminación')) return 'text-red-600 bg-red-50';
  if (accion.includes('Creación')) return 'text-emerald-600 bg-emerald-50';
  if (accion.includes('Edición')) return 'text-amber-600 bg-amber-50';
  if (accion.includes('Inicio')) return 'text-blue-600 bg-blue-50';
  if (accion.includes('Venta')) return 'text-purple-600 bg-purple-50';
  return 'text-gray-600 bg-gray-50';
};

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Calendar States for CryptoQuant Filter
  const [filterDate, setFilterDate] = useState('todos');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonthView, setCurrentMonthView] = useState<Date>(new Date());

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getActivityLog();
      setLogs(data);
    } catch (error) {
      console.error("Error loading activity log:", error);
    } finally {
      setLoading(false);
    }
  };

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
    const days = [];
    
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.usuario_nombre.toLowerCase().includes(search.toLowerCase()) ||
      log.accion.toLowerCase().includes(search.toLowerCase()) ||
      log.modulo.toLowerCase().includes(search.toLowerCase()) ||
      log.detalles.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (startDate || endDate) {
      const logDate = new Date(log.fecha);
      logDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bitácora de Auditoría</h1>
          <p className="text-gray-500 font-medium">Historial completo de acciones realizadas por cada usuario.</p>
        </div>

        {/* Dynamic Calendar Filter (CryptoQuant Style) */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-150 shadow-sm">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-black text-gray-700 rounded-xl transition-all"
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
          </div>

          <AnimatePresence>
            {isCalendarOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsCalendarOpen(false)} />
                
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-[540px] max-w-[92vw] sm:max-w-none bg-white border border-gray-150 rounded-[2rem] shadow-2xl p-5 z-[110] flex flex-col md:flex-row gap-5 divide-y md:divide-y-0 md:divide-x divide-gray-100"
                >
                  {/* Presets */}
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

                  {/* Calendar Grid */}
                  <div className="flex-1 pt-4 md:pt-0 md:pl-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 px-2 text-gray-450 hover:bg-gray-100 hover:text-gray-901 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>PREV</span>
                      </button>
                      <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                        {format(currentMonthView, 'MMMM yyyy', { locale: es })}
                      </span>
                      <button
                        onClick={handleNextMonth}
                        className="p-1 px-2 text-gray-450 hover:bg-gray-100 hover:text-gray-901 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all"
                      >
                        <span>SIG</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
                        <span key={day} className="text-[9px] font-black text-gray-400 py-1">{day}</span>
                      ))}
                      
                      {getDaysInMonth(currentMonthView).map(({ date, isCurrentMonth }, i) => {
                        const isSelectedStart = startDate && format(date, 'yyyyMMdd') === format(startDate, 'yyyyMMdd');
                        const isSelectedEnd = endDate && format(date, 'yyyyMMdd') === format(endDate, 'yyyyMMdd');
                        const isInRange = startDate && endDate && date >= startDate && date <= endDate;
                        const isToday = format(date, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd');

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setFilterDate('personalizado');
                              handleDayClick(date);
                            }}
                            className={cn(
                              "text-xs py-2 w-full rounded-xl flex items-center justify-center font-bold transition-all p-1 relative",
                              !isCurrentMonth && "text-gray-300",
                              isCurrentMonth && "text-gray-750",
                              isToday && "border-2 border-dashed border-gray-200",
                              isSelectedStart && "bg-blue-600 text-white rounded-l-xl rounded-r-none z-10",
                              isSelectedEnd && "bg-blue-600 text-white rounded-r-xl rounded-l-none z-10",
                              isInRange && "bg-blue-50/70",
                              isInRange && !isSelectedStart && !isSelectedEnd && "text-blue-800 rounded-none"
                            )}
                          >
                            <span>{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (tempStartDate && tempEndDate) {
                            setStartDate(tempStartDate);
                            setEndDate(tempEndDate);
                            setFilterDate('personalizado');
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={!tempStartDate || !tempEndDate}
                        className="flex-1 py-2 text-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-50 disabled:text-gray-350 cursor-pointer text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all"
                      >
                        Filtrar Rango
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input 
          type="text" 
          placeholder="Buscar por usuario, acción o detalle..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Cargando registros...</span>
        </div>
      ) : (
        <div id="audit-log-view" className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acción</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Módulo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">
                          {format(new Date(log.fecha), 'P', { locale: es })}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {format(new Date(log.fecha), 'p', { locale: es })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{log.usuario_nombre}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        getAccionColor(log.accion)
                      )}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-gray-500">
                        {getModuloIcon(log.modulo)}
                        <span className="text-xs font-bold">{log.modulo}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors"
                      >
                        Mostrar más
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-300">
                        <Activity className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-black uppercase tracking-tighter">No hay registros de actividad</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setSelectedLog(null)}
            />
            <div className="fixed inset-0 pointer-events-none z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="pointer-events-auto w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h3 className="text-xl font-black tracking-tight text-gray-900">Detalles de Auditoría</h3>
                  <button onClick={() => setSelectedLog(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha y Hora</p>
                      <p className="font-bold text-gray-900">{format(new Date(selectedLog.fecha), "PPP 'a las' p", { locale: es })}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      getAccionColor(selectedLog.accion)
                    )}>
                      {selectedLog.accion}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuario</p>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                          <User className="h-3 w-3" />
                        </div>
                        <p className="font-bold text-gray-700">{selectedLog.usuario_nombre}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Módulo</p>
                      <p className="font-bold text-gray-700">{selectedLog.modulo}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descripción Detallada</p>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm font-medium text-gray-700 leading-relaxed">
                      {selectedLog.detalles}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button onClick={() => setSelectedLog(null)} className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

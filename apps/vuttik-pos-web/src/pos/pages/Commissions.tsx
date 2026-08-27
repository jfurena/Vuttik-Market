import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Commission } from '../types';
import { HandCoins, Wallet, ArrowDownToLine, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Commissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = async () => {
    try {
      const data = await ApiService.getCommissions();
      setCommissions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Commissions] Fetch error:', err);
      setError('No se pudieron cargar las comisiones: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const pendingCommissions = commissions.filter(c => c.estado === 'pendiente');
  const paidCommissions = commissions.filter(c => c.estado === 'retirada');
  const pendingTotal = pendingCommissions.reduce((sum, c) => sum + c.monto, 0);
  const allTimeTotal = commissions.reduce((sum, c) => sum + c.monto, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
  };

  const handleWithdraw = async () => {
    if (pendingTotal <= 0) return;
    setWithdrawing(true);
    setError(null);
    try {
      await ApiService.withdrawCommissions();
      await fetchCommissions();
      alert('¡Comisiones retiradas exitosamente! El monto se descontará del cuadre de tu turno.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al retirar comisiones.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando tus comisiones...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Comisiones</h1>
          <p className="text-gray-500 font-medium">Aquí puedes ver el dinero que has ganado por la venta de productos con incentivos.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-3xl text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6 opacity-90">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-100">Saldo Pendiente</p>
                <p className="text-sm font-medium">Listo para retirar hoy</p>
              </div>
            </div>
            
            <h2 className="text-6xl font-black font-mono tracking-tighter mb-8">{formatCurrency(pendingTotal)}</h2>
            
            <button 
              onClick={handleWithdraw}
              disabled={pendingTotal <= 0 || withdrawing}
              className="w-full bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <ArrowDownToLine className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
              {withdrawing ? 'Procesando...' : 'Retirar Efectivo de Caja'}
            </button>
            <p className="text-center text-[10px] mt-4 font-bold text-emerald-100 uppercase tracking-wider">
              El monto retirado se descontará de lo esperado en tu cuadre actual.
            </p>
          </div>
          
          <HandCoins className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-[0.07] rotate-12" />
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total Histórico Generado</p>
              <h3 className="text-4xl font-black text-gray-900 font-mono tracking-tighter">{formatCurrency(allTimeTotal)}</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Ventas c/ Comisión</p>
              <p className="text-xl font-black text-gray-800">{commissions.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Ya Retirado</p>
              <p className="text-xl font-black text-emerald-600">{formatCurrency(allTimeTotal - pendingTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-lg text-gray-900">Historial de Comisiones</h3>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
              <Clock className="h-3 w-3" /> Pendientes: {pendingCommissions.length}
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-50">
          {commissions.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-medium">Aún no has generado ninguna comisión. ¡Sigue vendiendo!</div>
          ) : (
            commissions.slice().reverse().map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    c.estado === 'pendiente' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                  )}>
                    {c.estado === 'pendiente' ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900 leading-tight">{c.product_nombre}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{format(new Date(c.fecha), "d MMM, yyyy • h:mm a")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg text-gray-900 font-mono">+{formatCurrency(c.monto)}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Comisión: {c.porcentaje}%</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

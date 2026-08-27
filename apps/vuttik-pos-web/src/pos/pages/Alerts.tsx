import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Mail, Send, Save, AlertTriangle } from 'lucide-react';
import { ApiService } from '../services/api';

/**
 * Configuración de alertas por correo.
 *
 * Pensada para el dueño que no está en el local: el POS registra todo, pero sin
 * avisos hay que entrar a mirarlo para enterarse de un descuadre. Aquí decide de
 * qué quiere que le avisen y a partir de qué importe.
 */

interface AlertDef {
  clave: string;
  titulo: string;
  descripcion: string;
  critica?: boolean;
}

const ALERTAS: AlertDef[] = [
  {
    clave: 'cash_discrepancy',
    titulo: 'Descuadre en el cierre de caja',
    descripcion: 'El efectivo contado no coincide con lo esperado. Es la señal más directa de que falta dinero.',
    critica: true,
  },
  {
    clave: 'sale_cancelled',
    titulo: 'Venta cancelada',
    descripcion: 'Cobrar y luego anular es una vía habitual de sustracción.',
    critica: true,
  },
  {
    clave: 'sale_refunded',
    titulo: 'Venta reembolsada',
    descripcion: 'Devolución de dinero al cliente, con el motivo declarado.',
    critica: true,
  },
  {
    clave: 'funds_withdrawn',
    titulo: 'Retiro o transferencia de fondos',
    descripcion: 'Salida de efectivo de la caja o movimiento entre cuentas.',
    critica: true,
  },
  {
    clave: 'product_deleted',
    titulo: 'Producto eliminado',
    descripcion: 'Puede generar mucho ruido si gestionas el inventario a menudo.',
  },
  {
    clave: 'stock_adjusted',
    titulo: 'Ajuste de inventario',
    descripcion: 'Cambios manuales de existencias. Suele ser rutinario.',
  },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});
  const [alertEmail, setAlertEmail] = useState('');
  const [minAmount, setMinAmount] = useState<number>(100);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await ApiService.getAlertSettings();
      setAlerts(data.alerts || {});
      setAlertEmail(data.alertEmail || '');
      setMinAmount(data.minAmount ?? 100);
      setAviso(null);
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'No se pudo cargar la configuración' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      await ApiService.saveAlertSettings({ alerts, alertEmail: alertEmail.trim() || null, minAmount });
      setAviso({ tipo: 'ok', texto: 'Configuración guardada.' });
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      await ApiService.sendTestAlert();
      setAviso({
        tipo: 'ok',
        texto: 'Alerta de prueba enviada. Si no llega en unos minutos, revisa la carpeta de spam.',
      });
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'No se pudo enviar la prueba' });
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-gray-500">Cargando configuración…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-red-50 p-3">
          <Bell className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas por correo</h1>
          <p className="text-sm text-gray-500">
            Recibe un aviso cuando ocurra algo que pueda significar una pérdida de dinero,
            sin tener que entrar a revisar.
          </p>
        </div>
      </header>

      {aviso && (
        <p className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${
          aviso.tipo === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
        }`}>
          {aviso.texto}
        </p>
      )}

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">Qué quieres que te avisemos</h2>
        <div className="space-y-1">
          {ALERTAS.map((a) => (
            <label
              key={a.clave}
              className="flex cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={!!alerts[a.clave]}
                onChange={(e) => setAlerts({ ...alerts, [a.clave]: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{a.titulo}</span>
                  {a.critica && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                      Recomendada
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500">{a.descripcion}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">Ajustes</h2>

        <label className="mb-4 block">
          <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Mail className="h-4 w-4" /> Correo para las alertas
          </span>
          <input
            type="email"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            placeholder="Dejar vacío para usar el correo de tu cuenta"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Útil si quieres que también le lleguen a un socio o a tu contable.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Importe mínimo para avisar</span>
          <input
            type="number"
            min="0"
            value={minAmount}
            onChange={(e) => setMinAmount(Number(e.target.value))}
            className="w-40 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Por debajo de este importe no se envía nada. Evita que un descuadre de céntimos
            por redondeo genere correos: si recibes avisos triviales acabarás ignorándolos,
            y entonces se pierden los que sí importan.
          </span>
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          onClick={probar}
          disabled={enviando}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {enviando ? 'Enviando…' : 'Enviarme una prueba'}
        </button>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Solo tú, como dueño, puedes cambiar estos ajustes. Un empleado no puede desactivar
          los avisos sobre su propia actividad.
        </span>
      </p>
    </div>
  );
}

/**
 * Alertas por correo para el dueño ausente.
 *
 * El POS registra todo, pero hasta ahora había que entrar a mirarlo. Un dueño
 * que vive en otro país no se entera de un descuadre de caja hasta que revisa,
 * que puede ser semanas después. Esto convierte los eventos críticos en un aviso
 * que llega solo.
 *
 * Solo se avisa de lo que puede indicar una pérdida de dinero. Un correo por
 * cada venta sería ruido que el dueño acabaría ignorando, y entonces las alertas
 * que sí importan se pierden entre las demás.
 */
import nodemailer from 'nodemailer';
import { get } from './db.js';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.vuttik.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
});
/** Ajustes por defecto. El dueño puede desactivar cualquiera desde el negocio. */
export const DEFAULT_ALERT_SETTINGS = {
    cash_discrepancy: true,
    sale_cancelled: true,
    sale_refunded: true,
    funds_withdrawn: true,
    product_deleted: false,
    stock_adjusted: false,
};
const TITLES = {
    cash_discrepancy: 'Descuadre en el cierre de caja',
    sale_cancelled: 'Venta cancelada',
    sale_refunded: 'Venta reembolsada',
    funds_withdrawn: 'Retiro de fondos',
    product_deleted: 'Producto eliminado',
    stock_adjusted: 'Ajuste de inventario',
};
/**
 * Importe por debajo del cual no se avisa, para que un descuadre de céntimos por
 * redondeo no genere correos. Configurable por negocio.
 */
const DEFAULT_MIN_AMOUNT = 100;
/** Evita repetir el mismo aviso si una acción se reintenta. */
const recientes = new Map();
const VENTANA_ANTIRREPETICION_MS = 60 * 1000;
function esDuplicado(clave) {
    const ahora = Date.now();
    for (const [k, t] of recientes) {
        if (ahora - t > VENTANA_ANTIRREPETICION_MS)
            recientes.delete(k);
    }
    if (recientes.has(clave))
        return true;
    recientes.set(clave, ahora);
    return false;
}
/** Localiza el correo del dueño: primero en db.json, luego en SQLite. */
async function correoDelDueno(db, biz) {
    const propio = (biz.settings?.alert_email || '').trim();
    if (propio)
        return propio;
    const owner = (db.owners || []).find((o) => o.id === biz.owner_id);
    if (owner?.correo)
        return owner.correo;
    try {
        const fila = await get('SELECT email FROM vuttik_users WHERE uid = ?', [biz.owner_id]);
        // Las cuentas sintéticas de negocio no son buzones reales.
        if (fila?.email && !fila.email.endsWith('@business.local'))
            return fila.email;
    }
    catch {
        // Sin base de datos disponible no hay a quién avisar.
    }
    return null;
}
const dinero = (n) => 'RD$' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });
function plantilla(titulo, negocio, filas, nota) {
    const cuerpo = filas
        .map(([k, v]) => `<tr><td style="padding:8px 0;color:#6b7280;">${k}</td>
       <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${v}</td></tr>`)
        .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <div style="background:#dc2626;padding:20px 24px;">
      <p style="margin:0;color:#fff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Alerta de Vuttik POS</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:20px;">${titulo}</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#374151;">Negocio: <strong>${negocio}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${cuerpo}</table>
      ${nota ? `<p style="margin:20px 0 0;padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:13px;">${nota}</p>` : ''}
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        Revisa el detalle en <a href="https://pos.vuttik.com" style="color:#2563eb;">pos.vuttik.com</a>.
      </p>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;">
      Recibes este aviso porque eres el dueño de este negocio.
      Puedes desactivar alertas concretas desde la configuración del POS.
    </div>
  </div>
</body></html>`;
}
/**
 * Envía la alerta si procede. Nunca lanza: un fallo de correo no debe tumbar la
 * operación del POS que lo originó.
 */
export async function enviarAlerta(db, biz, tipo, datos) {
    try {
        const ajustes = { ...DEFAULT_ALERT_SETTINGS, ...(biz.settings?.alerts || {}) };
        if (!ajustes[tipo])
            return;
        const minimo = Number(biz.settings?.alert_min_amount ?? DEFAULT_MIN_AMOUNT);
        if (typeof datos.monto === 'number' && Math.abs(datos.monto) < minimo)
            return;
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
            return;
        const destino = await correoDelDueno(db, biz);
        if (!destino)
            return;
        const clave = `${biz.id}:${tipo}:${datos.monto ?? ''}:${datos.detalle ?? ''}`;
        if (esDuplicado(clave))
            return;
        const filas = datos.filas || [];
        if (datos.usuario)
            filas.unshift(['Usuario', datos.usuario]);
        if (typeof datos.monto === 'number')
            filas.push(['Importe', dinero(datos.monto)]);
        filas.push(['Fecha', new Date().toLocaleString('es-DO')]);
        await transporter.sendMail({
            from: `"Vuttik POS" <${process.env.SMTP_USER}>`,
            to: destino,
            subject: `[${biz.nombre}] ${TITLES[tipo]}`,
            html: plantilla(TITLES[tipo], biz.nombre || 'Negocio', filas, datos.detalle),
        });
    }
    catch (err) {
        console.error('[alerts] no se pudo enviar la alerta:', err?.message);
    }
}

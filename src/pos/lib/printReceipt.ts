import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './utils';

// SEC-002 FIX: Sanitize all user-generated data before injecting into HTML.
// Without this, a product named '<script>alert(1)</script>' would execute JS in the print window (XSS).
const escHtml = (str: any): string =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const printReceipt = (sale: any, businessInfo: any = {}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Calculate totals and ITBIS breakdowns
  const items = sale.items || [];
  // DAT-003 FIX: server stores `cantidad`, but older records may use `quantity` — support both
  const totalItemsCount = items.reduce((acc: number, item: any) => acc + (item.cantidad ?? item.quantity ?? 1), 0);

  // Default business details
  const storeName = businessInfo.name || 'SUPERMERCADO VUTTIK';
  const storeAddress = businessInfo.address || 'Av. Winston Churchill #1052, Santo Domingo, R.D.';
  const storeRnc = businessInfo.rnc || '131-00234-5';
  const storePhone = businessInfo.phone || '809-567-8901';
  const terminalNum = businessInfo.terminal || '01';

  // Subtotal and tax items separation
  // If the sale already has the pre-computed tax details, use them; otherwise, compute based on default 18%
  const hasTax = sale.impuesto > 0 || sale.itbis > 0 || (sale.items && sale.items.some((i: any) => i.itbis_gravado));
  let subtotalExento = 0;
  let subtotalGravado = 0;
  let totalItbis = sale.impuesto || sale.itbis || 0;

  if (hasTax && totalItbis === 0) {
    // Fallback if tax is enabled but totalItbis is zero, compute 18%
    subtotalGravado = sale.subtotal;
    totalItbis = subtotalGravado * 0.18;
  } else if (totalItbis > 0) {
    subtotalGravado = Number((totalItbis / 0.18).toFixed(2));
    subtotalExento = Math.max(0, sale.subtotal - subtotalGravado);
  } else {
    subtotalExento = sale.subtotal;
  }

  // Dominican Republic NCF details
  const showNcf = sale.ncf || (sale.tipo_comprobante && sale.tipo_comprobante !== 'Sin Comprobante');
  const ncfLabel = sale.tipo_comprobante || 'Factura de Consumo';
  const ncfCode = sale.ncf || `B01${Math.floor(100000000 + Math.random() * 900000000)}`;

  const html = `
    <html>
      <head>
        <title>Ticket Supermercado #${sale.codigo_recibo || sale.id}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; width: 80mm; }
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; 
            padding: 4mm 2mm; 
            margin: auto;
            font-size: 11px;
            color: #000;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: bold; }
          .double-bold { font-weight: 900; font-size: 13px; }
          .border-top { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; }
          .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 6px; padding-bottom: 6px; }
          .border-double { border-bottom: 3px double #000; margin-bottom: 6px; padding-bottom: 3px; }
          .header { margin-bottom: 15px; }
          .meta-info { font-size: 11px; margin-bottom: 12px; }
          .meta-row { display: flex; justify-content: space-between; }
          
          .items-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .items-table th { font-weight: bold; font-size: 11px; padding-bottom: 4px; border-bottom: 1px dashed #000; }
          .items-table td { padding: 3px 0; vertical-align: top; }
          
          .item-desc-row { font-weight: bold; text-transform: uppercase; word-break: break-all; }
          .item-calc-row { padding-left: 10px; color: #444; font-size: 10.5px; display: flex; justify-content: space-between; }
          
          .totals-section { margin-top: 10px; font-size: 11px; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-highlight { font-size: 14px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin-top: 4px; }
          
          .payments-section { padding: 4px 0; margin-top: 4px; font-size: 11px; }
          .payments-row { display: flex; justify-content: space-between; }
          
          .barcode-area { margin: 20px 0 10px; text-align: center; }
          .barcode-bars { font-family: monospace; font-size: 13px; letter-spacing: -1.5px; font-weight: bold; line-height: 0.9; margin-bottom: 2px; }
          
          .footer { margin-top: 18px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
          .footer p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <!-- STORE HEADER -->
        <div class="header text-center">
          <div class="bold double-bold">${escHtml(storeName)}</div>
          <div style="font-size: 10px; margin-top: 2px;">RNC: ${escHtml(storeRnc)}</div>
          <div style="font-size: 10px;">${escHtml(storeAddress)}</div>
          <div style="font-size: 10px;">TEL: ${escHtml(storePhone)}</div>
          <div class="border-top" style="font-size: 9px; letter-spacing: 0.5px;">REGISTRO DE VENTA AUTORIZADO</div>
        </div>

        <!-- TICKET AND NCF METADATA -->
        <div class="meta-info border-top border-bottom">
          <div class="meta-row">
            <span>TICKET:</span>
            <span class="bold">#${escHtml(sale.codigo_recibo || sale.id?.slice(-8))}</span>
          </div>
          <div class="meta-row">
            <span>FECHA:</span>
            <span>${format(new Date(sale.fecha || Date.now()), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
          </div>
          <div class="meta-row">
            <span>CAJERO:</span>
            <span class="bold">${escHtml((sale.usuario_nombre || 'General').toUpperCase())}</span>
          </div>
          <div class="meta-row">
            <span>CAJA / TERM:</span>
            <span>BOX-${terminalNum}</span>
          </div>
          
          ${sale.cliente ? `
            <div class="border-top" style="margin-top: 4px; padding-top: 4px;">
              <div class="meta-row"><span>CLIENTE:</span><span class="bold">${escHtml(sale.cliente.toUpperCase())}</span></div>
              ${sale.cliente_rnc ? `<div class="meta-row"><span>RNC CLIENTE:</span><span>${escHtml(sale.cliente_rnc)}</span></div>` : ''}
            </div>
          ` : `
            <div class="border-top" style="margin-top: 4px; padding-top: 4px;">
              <div class="meta-row"><span>CLIENTE:</span><span>Consumidor Final</span></div>
            </div>
          `}

          ${showNcf ? `
            <div class="border-top" style="margin-top: 4px; padding-top: 4px; font-size: 10.5px;">
              <div class="meta-row"><span class="bold">TIPO COMP.:</span><span>${escHtml(ncfLabel.toUpperCase())}</span></div>
              <div class="meta-row"><span class="bold">COMP. NCF:</span><span class="bold font-mono">${escHtml(ncfCode)}</span></div>
            </div>
          ` : ''}
        </div>

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 75%;">DESCRIPCION / CANT</th>
              <th class="text-right" style="width: 25%;">VALOR (RD$)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => {
              // DAT-003 FIX: server saves `cantidad`, older records may have `quantity`
              const itemQty = item.cantidad ?? item.quantity ?? 1;
              const itemTotal = (itemQty * item.precio_venta);
              const isGravado = item.itbis_gravado || (hasTax && item.precio_venta > 0);
              const taxIndicator = isGravado ? 'G18' : 'E';
              const sku = escHtml(item.codigo_barra || item.producto_id?.slice(-6) || 'FACTUR');
              
              return `
                <tr>
                  <td colspan="2" style="padding-bottom: 4px;">
                    <div class="item-desc-row">${sku} ${escHtml(item.nombre)}</div>
                    <div class="item-calc-row">
                      <span>&nbsp;&nbsp;${itemQty} ${escHtml(item.unidad_venta || 'Uds')} x ${formatCurrency(item.precio_venta)}</span>
                      <span>(${taxIndicator})&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${formatCurrency(itemTotal)}</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- TOTALS BREAKDOWN -->
        <div class="totals-section border-top">
          <div class="totals-row">
            <span>SUBTOTAL BRUTO:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          
          ${totalItbis > 0 ? `
            <div class="totals-row">
              <span>GRAVADO (ITBIS 18%):</span>
              <span>${formatCurrency(subtotalGravado)}</span>
            </div>
            <div class="totals-row">
              <span>EXENTO (ITBIS 0%):</span>
              <span>${formatCurrency(subtotalExento)}</span>
            </div>
            <div class="totals-row">
              <span>ITBIS COBRADO (18%):</span>
              <span>${formatCurrency(totalItbis)}</span>
            </div>
          ` : `
            <div class="totals-row">
              <span>ITBIS COBRADO (0%):</span>
              <span>RD$0.00</span>
            </div>
          `}

          ${sale.descuento > 0 ? `
            <div class="totals-row bold text-red-650">
              <span>DESCUENTO APLICADO:</span>
              <span>-${formatCurrency(sale.descuento)}</span>
            </div>
          ` : ''}

          <div class="totals-row total-highlight">
            <span>TOTAL A PAGAR:</span>
            <span>${formatCurrency(sale.total)}</span>
          </div>
        </div>

        <!-- PAYMENT AND CHANGE DETAILS -->
        <div class="payments-section">
          <div class="payments-row">
            <span>METODO DE PAGO:</span>
            <span class="bold">${(sale.metodo_pago || 'EFECTIVO').toUpperCase()}</span>
          </div>
          ${sale.metodo_pago === 'Tarjeta' ? `
            <div class="payments-row" style="font-size: 10px; color: #444; border-top: 1px dotted #ccc; margin-top: 4px; padding-top: 4px;">
              <span>SISTEMA TARJETA:</span>
              <span class="bold">VERIFONE EMV</span>
            </div>
            ${sale.tarjeta_verifone ? `
              <div class="payments-row" style="font-size: 10px; color: #444;">
                <span>DATAFONO:</span>
                <span>${sale.tarjeta_verifone}</span>
              </div>
            ` : ''}
            ${sale.tarjeta_aprobacion ? `
              <div class="payments-row" style="font-size: 10px; color: #000; font-weight: bold;">
                <span>NUM. APROBACION:</span>
                <span>#${sale.tarjeta_aprobacion}</span>
              </div>
            ` : ''}
          ` : `
            <div class="payments-row">
              <span>MONTO RECIBIDO:</span>
              <span class="bold">${formatCurrency(sale.monto_recibido || sale.total)}</span>
            </div>
            <div class="payments-row">
              <span>SU CAMBIO EN RD$:</span>
              <span class="bold" style="font-size: 12px;">${formatCurrency(sale.cambio || 0)}</span>
            </div>
          `}
        </div>

        <!-- CASHIER LOG AND TOTAL ITEMS -->
        <div class="border-top" style="font-size: 10px; padding-top: 4px;">
          <div class="meta-row">
            <span>CANTIDAD ARTÍCULOS:</span>
            <span class="bold">${totalItemsCount}</span>
          </div>
          <div class="meta-row">
            <span>ITB = ITBIS  (G) = GRAVADO (E) = EXENTO</span>
          </div>
        </div>

        <!-- BARCODE GRAPHICAL (CSS BASED) -->
        <div class="barcode-area">
          <div class="barcode-bars">
            ||||||||||||||||||||||||||||||||||||||||||
            || ||| | ||| | |||| | ||| | |||| | || |||
            || ||| | ||| | |||| | ||| | |||| | || |||
            ||||||||||||||||||||||||||||||||||||||||||
          </div>
          <div style="font-size: 10px; font-family: 'Courier New', monospace; font-weight: bold;">
            *${sale.codigo_recibo || sale.id}*
          </div>
        </div>

        <!-- MUNICIPAL / BUSINESS FOOOTER -->
        <div class="footer text-center">
          <p class="bold">*** GRACIAS POR PREFERIRNOS ***</p>
          <p>CONSERVE ESTE TICKET PARA DEVOLUCIÓN O RECLAMOS</p>
          <p>COMPROBANTES ELECTRÓNICOS EN LÍNEA</p>
          <p style="margin-top: 8px; font-size: 8.5px; opacity: 0.7;">Facturación POS Homologada v2.4.9</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

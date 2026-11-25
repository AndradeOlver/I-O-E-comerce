import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import { DemoSession, logoutToAccess, requireZoneRole } from '../auth/demoSession';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  POS_PAYMENT_LABELS,
  cancelOrder,
  emitSimulatedRejection,
  formatPen,
  formatTimeShort,
  getDailySummary,
  loadPosState,
  recordPaymentOrAbono,
  resetPosDay,
  roundMoney,
  subscribePosEvents,
  updateOrderBilling,
} from './posStore';
import {
  PosBroadcastEvent,
  PosConsoleApi,
  PosOrder,
  PosPaymentMethod,
  PosReceiptType,
  PosStoreState,
} from './posTypes';

interface CajeroLocalState {
  queueTab: 'pendientes' | 'cobradas';
  selectedOrderId: string | null;
  selectedMethod: PosPaymentMethod;
  cashReceivedStr: string;
  incomingNotif: { orderId: string; total: number; itemsCount: number } | null;
  billingError: string;
  paymentError: string;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
  isArqueoOpen: boolean;
}

const activeSession = requireZoneRole('cajero', '/pos-cajero.html');
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let storeState: PosStoreState = loadPosState();

const local: CajeroLocalState = {
  queueTab: 'pendientes',
  selectedOrderId:
    storeState.orders.find((o) => o.status === 'pendiente_cobro')?.id ??
    storeState.orders[0]?.id ??
    null,
  selectedMethod: 'efectivo',
  cashReceivedStr: '',
  incomingNotif: null,
  billingError: '',
  paymentError: '',
  feedback: null,
  isArqueoOpen: false,
};

const root = document.getElementById('pos-cajero-root');
if (!root) {
  throw new Error('No se encontró #pos-cajero-root');
}

function playBeep(): void {
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Sin audio disponible en este navegador
  }
}

function getSelectedOrder(): PosOrder | null {
  if (local.selectedOrderId) {
    const found = storeState.orders.find((o) => o.id === local.selectedOrderId);
    if (found) return found;
  }
  const firstPending = storeState.orders.find((o) => o.status === 'pendiente_cobro');
  if (firstPending) {
    local.selectedOrderId = firstPending.id;
    return firstPending;
  }
  const first = storeState.orders[0] ?? null;
  local.selectedOrderId = first?.id ?? null;
  return first;
}

function renderStaticShell(): void {
  root!.innerHTML = `
    <header class="pos-topbar pos-no-print">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Caja y Cobro</h1>
        <span class="pos-topbar-staff">Turno: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
        <span id="cajero-topbar-counter" class="pos-counter-badge pos-num">0 pendientes</span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-xl-flex">
          <span><span class="pos-kbd">F2</span> Siguiente</span>
          <span><span class="pos-kbd">F4</span> Cobrar</span>
          <span><span class="pos-kbd">F6</span> Arqueo</span>
          <span><span class="pos-kbd">F7</span> Imprimir</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        <button type="button" id="btn-open-arqueo" class="pos-topbar-btn">
          Arqueo (F6)
        </button>
        <button type="button" id="btn-pos-logout" class="pos-topbar-btn">
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="pos-shell">
      <div id="cajero-notif-slot" class="pos-no-print"></div>
      <div id="cajero-feedback-slot" class="pos-no-print"></div>

      <div class="pos-cajero-grid">
        <section id="cajero-queue-slot" class="pos-panel pos-no-print"></section>
        <section id="cajero-center-slot" class="pos-panel"></section>
        <section id="cajero-summary-slot" class="pos-panel pos-no-print"></section>
      </div>
    </main>

    <div id="cajero-modal-slot"></div>
  `;

  bindBrandLogo(root!);
}

function renderTopCounter(): void {
  const el = document.getElementById('cajero-topbar-counter');
  if (!el) return;
  const count = storeState.orders.filter((o) => o.status === 'pendiente_cobro').length;
  el.textContent = `${count} pendiente${count === 1 ? '' : 's'}`;
}

function renderNotif(): void {
  const slot = document.getElementById('cajero-notif-slot');
  if (!slot) return;
  if (!local.incomingNotif) {
    slot.innerHTML = '';
    return;
  }
  const n = local.incomingNotif;
  slot.innerHTML = `
    <div class="pos-notif-banner">
      <div>
        <span class="pos-status-chip is-partial me-2">Nueva orden del vendedor</span>
        <strong class="pos-num">${escapeHtml(n.orderId)}</strong>
        <span class="ms-2">${n.itemsCount} prenda${n.itemsCount === 1 ? '' : 's'} · Total <strong class="pos-num">${formatPen(n.total)}</strong></span>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="pos-btn-md pos-btn-primary" id="btn-attend-notif">
          Atender ahora
        </button>
        <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-dismiss-notif">
          Ocultar
        </button>
      </div>
    </div>
  `;
}

function renderFeedback(): void {
  const slot = document.getElementById('cajero-feedback-slot');
  if (!slot) return;
  if (!local.feedback) {
    slot.innerHTML = '';
    return;
  }
  const kindClass =
    local.feedback.kind === 'ok'
      ? 'is-ok'
      : local.feedback.kind === 'warn'
        ? 'is-warn'
        : 'is-err';
  slot.innerHTML = `
    <div class="pos-banner ${kindClass}">
      <span>${escapeHtml(local.feedback.text)}</span>
      <button type="button" class="btn-close btn-sm" id="btn-close-cajero-feedback" aria-label="Cerrar aviso"></button>
    </div>
  `;
}

function renderQueue(): void {
  const slot = document.getElementById('cajero-queue-slot');
  if (!slot) return;

  const pendientes = storeState.orders.filter((o) => o.status === 'pendiente_cobro');
  const cobradas = storeState.orders.filter((o) => o.status === 'cobrado');
  const list = local.queueTab === 'pendientes' ? pendientes : cobradas;
  const selected = getSelectedOrder();

  slot.innerHTML = `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Órdenes en Caja</h2>
    </div>
    <div class="pos-panel-body">
      <div class="pos-seg-group mb-2">
        <button
          type="button"
          class="pos-seg-btn pos-num ${local.queueTab === 'pendientes' ? 'is-active' : ''}"
          data-queue-tab="pendientes"
        >
          Pendientes (${pendientes.length})
        </button>
        <button
          type="button"
          class="pos-seg-btn pos-num ${local.queueTab === 'cobradas' ? 'is-active' : ''}"
          data-queue-tab="cobradas"
        >
          Cobradas (${cobradas.length})
        </button>
      </div>

      <div class="d-flex flex-column gap-2" style="max-height: 540px; overflow-y: auto;">
        ${
          list.length === 0
            ? `<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">
                ${local.queueTab === 'pendientes' ? 'Sin órdenes pendientes de cobro.' : 'Sin ventas cobradas hoy.'}
              </div>`
            : list
                .map((o) => {
                  const isActive = selected?.id === o.id;
                  return `
                    <button
                      type="button"
                      class="pos-queue-card ${isActive ? 'is-active' : ''}"
                      data-select-order="${escapeHtml(o.id)}"
                    >
                      <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold pos-num">${escapeHtml(o.id)}</span>
                        <span class="small pos-text-muted pos-num">${formatTimeShort(o.creadoEn)}</span>
                      </div>
                      <div class="small text-truncate">${escapeHtml(o.clienteReferencia)}</div>
                      <div class="d-flex justify-content-between align-items-center mt-1">
                        <span class="small pos-text-muted pos-num">${o.items.reduce((a, i) => a + i.cantidad, 0)} prendas</span>
                        <span class="fw-bold pos-num">${formatPen(o.total)}</span>
                      </div>
                      ${
                        o.status === 'pendiente_cobro' && o.montoPagado > 0
                          ? `<div class="small pos-text-warn fw-semibold pos-num">Abonado ${formatPen(o.montoPagado)} · Falta ${formatPen(o.saldoPendiente)}</div>`
                          : ''
                      }
                      ${
                        o.status === 'cobrado'
                          ? `<div class="small pos-text-ok fw-semibold pos-num">${escapeHtml(o.numeroComprobante ?? '')}</div>`
                          : ''
                      }
                    </button>
                  `;
                })
                .join('')
        }
      </div>
    </div>
  `;
}

function renderReceiptView(order: PosOrder): string {
  const isFactura = order.tipoComprobante === 'factura';
  return `
    <div class="pos-panel-header pos-no-print">
      <h2 class="pos-panel-title pos-display">Comprobante · ${escapeHtml(order.numeroComprobante ?? order.id)}</h2>
      <button type="button" class="pos-btn-md pos-btn-primary" id="btn-print-receipt">
        Imprimir (F7)
      </button>
    </div>
    <div class="pos-panel-body">
      <div class="pos-receipt-box pos-print-only-target">
        <div class="pos-receipt-header">
          <div class="fw-bold fs-5">I&amp;O MODA RETAIL S.A.C.</div>
          <div class="small pos-text-muted">RUC: 20609988771 · Tienda Lima Centro</div>
          <div class="fw-bold mt-2">${isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}</div>
          <div class="fw-bold fs-6 pos-num">${escapeHtml(order.numeroComprobante ?? '')}</div>
        </div>

        <div class="row g-1 small mb-2">
          <div class="col-6"><strong>Orden:</strong> ${escapeHtml(order.id)}</div>
          <div class="col-6 text-end pos-num"><strong>Fecha:</strong> ${new Date(order.cobradoEn ?? order.creadoEn).toLocaleString('es-PE')}</div>
          <div class="col-6"><strong>Vendedor:</strong> ${escapeHtml(order.vendedorNombre)}</div>
          <div class="col-6 text-end"><strong>Cajero:</strong> ${escapeHtml(order.cajeroNombre ?? currentSession.displayName)}</div>
          <div class="col-12">
            <strong>Cliente:</strong> ${escapeHtml(order.clienteRazonSocial || 'Cliente Varios')}
            ${order.clienteDoc ? ` (${isFactura ? 'RUC' : 'DNI'}: ${escapeHtml(order.clienteDoc)})` : ''}
          </div>
        </div>

        <table class="table table-sm mb-2">
          <thead>
            <tr>
              <th>Prenda / SKU</th>
              <th class="text-center">Cant.</th>
              <th class="text-end">P. Unit</th>
              <th class="text-end">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (it) => `
              <tr>
                <td>
                  <div>${escapeHtml(it.nombre)} (${escapeHtml(it.talla)} · ${escapeHtml(it.color)})</div>
                  <div class="small text-muted pos-sku-code">${escapeHtml(it.sku)}</div>
                </td>
                <td class="text-center pos-num">${it.cantidad}</td>
                <td class="text-end pos-num">${formatPen(it.precio_unitario)}</td>
                <td class="text-end pos-num">${formatPen(it.subtotal)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="border-top pt-2 small pos-num">
          <div class="d-flex justify-content-between">
            <span>Subtotal</span>
            <span>${formatPen(order.subtotalBruto)}</span>
          </div>
          ${
            order.descuentoMonto > 0
              ? `<div class="d-flex justify-content-between pos-text-err">
                  <span>Descuento (${order.descuentoPct}%)</span>
                  <span>- ${formatPen(order.descuentoMonto)}</span>
                </div>`
              : ''
          }
          <div class="d-flex justify-content-between">
            <span>Op. Gravada</span>
            <span>${formatPen(order.opGravada)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>IGV (18%)</span>
            <span>${formatPen(order.igv)}</span>
          </div>
          <div class="d-flex justify-content-between fw-bold fs-6 border-top mt-1 pt-1">
            <span>TOTAL PAGADO</span>
            <span>${formatPen(order.total)}</span>
          </div>
          ${
            order.vuelto > 0
              ? `<div class="d-flex justify-content-between fw-semibold pos-text-ok">
                  <span>Vuelto entregado</span>
                  <span>${formatPen(order.vuelto)}</span>
                </div>`
              : ''
          }
        </div>

        <div class="border-top mt-2 pt-2 small">
          <div class="fw-semibold mb-1">Detalle de cobros / abonos registrados:</div>
          ${order.pagos
            .map(
              (p) => `
            <div class="d-flex justify-content-between pos-text-muted pos-num">
              <span>${escapeHtml(POS_PAYMENT_LABELS[p.metodo])} · ${escapeHtml(p.referencia)}</span>
              <span>${formatPen(p.monto)}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="border-top mt-2 pt-2 text-center small pos-text-muted">
          Cambios de talla o modelo dentro de los 7 días calendario con etiqueta intacta y comprobante (RN-VEN-05).
        </div>
      </div>
    </div>
  `;
}

function renderCenter(): void {
  const slot = document.getElementById('cajero-center-slot');
  if (!slot) return;

  const order = getSelectedOrder();
  if (!order) {
    slot.innerHTML = `
      <div class="pos-panel-header"><h2 class="pos-panel-title pos-display">Pasarela de Cobro</h2></div>
      <div class="pos-panel-body text-center py-5">
        <div class="fw-bold mb-1">Sin órdenes pendientes</div>
        <div class="small pos-text-muted">
          Las órdenes enviadas desde el mostrador del vendedor aparecerán aquí.
        </div>
      </div>
    `;
    return;
  }

  if (order.status === 'cobrado') {
    slot.innerHTML = renderReceiptView(order);
    return;
  }

  if (order.status === 'cancelado') {
    slot.innerHTML = `
      <div class="pos-panel-header"><h2 class="pos-panel-title pos-display">Orden ${escapeHtml(order.id)} · Cancelada</h2></div>
      <div class="pos-panel-body">
        <div class="pos-banner is-warn mb-0">
          <span>Esta orden fue cancelada (${escapeHtml(order.motivoCancelacion ?? 'sin motivo')}).</span>
        </div>
      </div>
    `;
    return;
  }

  const cashReceived = Number(local.cashReceivedStr);
  const vueltoPreview =
    local.selectedMethod === 'efectivo' && Number.isFinite(cashReceived) && cashReceived > order.saldoPendiente
      ? roundMoney(cashReceived - order.saldoPendiente)
      : 0;

  slot.innerHTML = `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Cobro ${escapeHtml(order.id)} · ${escapeHtml(order.clienteReferencia)}</h2>
      <button type="button" class="pos-btn-md pos-btn-danger" id="btn-cancel-order">
        Cancelar orden
      </button>
    </div>
    <div class="pos-panel-body">
      <div class="table-responsive mb-2">
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th>SKU / Prenda</th>
              <th class="text-center">Cant.</th>
              <th class="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (it) => `
              <tr>
                <td>
                  <span class="pos-sku-code me-1">${escapeHtml(it.sku)}</span>
                  <span class="fw-semibold">${escapeHtml(it.nombre)}</span>
                  <span class="small pos-text-muted">(${escapeHtml(it.talla)} · ${escapeHtml(it.color)})</span>
                </td>
                <td class="text-center pos-num">${it.cantidad}</td>
                <td class="text-end fw-semibold pos-num">${formatPen(it.subtotal)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="pos-subbox pos-subbox--muted mb-3 pos-num">
        <div class="d-flex justify-content-between small">
          <span>Op. Gravada + IGV (18%)</span>
          <span>${formatPen(order.opGravada)} + ${formatPen(order.igv)}</span>
        </div>
        ${
          order.descuentoMonto > 0
            ? `<div class="d-flex justify-content-between small pos-text-err">
                <span>Descuento (${order.descuentoPct}%)</span>
                <span>- ${formatPen(order.descuentoMonto)}</span>
              </div>`
            : ''
        }
        <div class="d-flex justify-content-between fw-bold fs-5">
          <span>Total de la orden</span>
          <span>${formatPen(order.total)}</span>
        </div>
        ${
          order.montoPagado > 0
            ? `<div class="d-flex justify-content-between small pos-text-warn fw-semibold mt-1">
                <span>Abonado a cuenta</span>
                <span>${formatPen(order.montoPagado)}</span>
              </div>
              <div class="d-flex justify-content-between fw-bold pos-text-err">
                <span>Saldo pendiente por cobrar</span>
                <span>${formatPen(order.saldoPendiente)}</span>
              </div>`
            : ''
        }
      </div>

      <div class="mb-3">
        <div class="small fw-bold text-uppercase pos-text-muted mb-1">1. Tipo de Comprobante</div>
        <div class="pos-seg-group mb-2">
          <button
            type="button"
            class="pos-seg-btn ${order.tipoComprobante === 'boleta' ? 'is-active' : ''}"
            data-receipt-type="boleta"
          >
            Boleta (DNI / Varios)
          </button>
          <button
            type="button"
            class="pos-seg-btn ${order.tipoComprobante === 'factura' ? 'is-active' : ''}"
            data-receipt-type="factura"
          >
            Factura (RUC 11 dígitos)
          </button>
        </div>
        <div class="row g-2">
          <div class="col-5">
            <input
              id="cajero-doc-input"
              type="text"
              class="form-control form-control-sm pos-num"
              maxlength="${order.tipoComprobante === 'factura' ? '11' : '8'}"
              placeholder="${order.tipoComprobante === 'factura' ? 'RUC (11 dígitos)' : 'DNI (8 dígitos u opcional)'}"
              value="${escapeHtml(order.clienteDoc)}"
            />
          </div>
          <div class="col-7">
            <input
              id="cajero-razon-input"
              type="text"
              class="form-control form-control-sm"
              placeholder="${order.tipoComprobante === 'factura' ? 'Razón social obligatoria' : 'Nombre del cliente / Varios'}"
              value="${escapeHtml(order.clienteRazonSocial)}"
            />
          </div>
        </div>
        ${local.billingError ? `<div class="pos-inline-error">${escapeHtml(local.billingError)}</div>` : ''}
      </div>

      <div class="mb-3">
        <div class="small fw-bold text-uppercase pos-text-muted mb-1">2. Método de Pago</div>
        <div class="pos-method-grid">
          ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
            .map(
              (m) => `
            <button
              type="button"
              class="pos-method-btn ${local.selectedMethod === m ? 'is-active' : ''}"
              data-pay-method="${m}"
            >
              ${escapeHtml(POS_PAYMENT_LABELS[m])}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      ${
        local.selectedMethod === 'efectivo'
          ? `
        <div class="pos-subbox pos-subbox--muted mb-3">
          <div class="row g-2 align-items-center mb-2">
            <div class="col-5">
              <label for="cajero-efectivo-input" class="form-label small fw-semibold mb-0">
                Efectivo recibido (S/)
              </label>
            </div>
            <div class="col-7">
              <input
                id="cajero-efectivo-input"
                type="number"
                min="0"
                step="0.10"
                class="form-control pos-num fw-bold"
                placeholder="${order.saldoPendiente.toFixed(2)}"
                value="${escapeHtml(local.cashReceivedStr)}"
              />
            </div>
          </div>
          <div class="d-flex justify-content-between small fw-semibold mb-2 pos-num">
            <span>Vuelto calculado:</span>
            <span class="pos-text-ok" data-vuelto-preview>${formatPen(vueltoPreview)}</span>
          </div>
          ${local.paymentError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.paymentError)}</div>` : ''}
          <button type="button" id="btn-pay-efectivo" class="pos-btn-lg pos-btn-success w-100">
            Registrar Cobro en Efectivo (F4) · ${formatPen(order.saldoPendiente)}
          </button>
        </div>
      `
          : `
        <div class="pos-subbox pos-subbox--muted mb-3">
          <div class="row g-2 align-items-center mb-2">
            <div class="col-5">
              <label for="cajero-ref-input" class="form-label small fw-semibold mb-0">
                N.° de operación (opcional)
              </label>
            </div>
            <div class="col-7">
              <input
                id="cajero-ref-input"
                type="text"
                maxlength="40"
                class="form-control form-control-sm"
                placeholder="Código de voucher o yapeo"
              />
            </div>
          </div>
          ${local.paymentError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.paymentError)}</div>` : ''}
          <button type="button" id="btn-pay-digital" class="pos-btn-lg pos-btn-success w-100">
            Registrar Cobro (${escapeHtml(POS_PAYMENT_LABELS[local.selectedMethod])}) · ${formatPen(order.saldoPendiente)}
          </button>
        </div>
      `
      }

      ${
        order.pagos.length > 0
          ? `
        <div class="pos-subbox mb-3">
          <div class="small fw-bold mb-1">Abonos previos en esta orden:</div>
          ${order.pagos
            .map(
              (p) => `
            <div class="d-flex justify-content-between small pos-num">
              <span>${escapeHtml(POS_PAYMENT_LABELS[p.metodo])} · ${escapeHtml(p.referencia)}</span>
              <span class="fw-semibold">${formatPen(p.monto)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    </div>
  `;
}

function renderSummary(): void {
  const slot = document.getElementById('cajero-summary-slot');
  if (!slot) return;

  const summary = getDailySummary(storeState);

  slot.innerHTML = `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Ventas del Día</h2>
    </div>
    <div class="pos-panel-body d-flex flex-column gap-2">
      <div class="pos-kpi-card">
        <div class="pos-kpi-label">Cobrado hoy (caja + digital)</div>
        <div class="pos-kpi-value pos-text-ok pos-num">${formatPen(summary.totalCobrado)}</div>
        <div class="small pos-text-muted pos-num">${summary.cantidadVentas} comprobante${summary.cantidadVentas === 1 ? '' : 's'} emitido${summary.cantidadVentas === 1 ? '' : 's'}</div>
      </div>

      <div class="pos-kpi-card">
        <div class="pos-kpi-label">Pendiente de cobro</div>
        <div class="pos-kpi-value pos-text-warn pos-num">${formatPen(summary.totalPendiente)}</div>
        <div class="small pos-text-muted pos-num">${summary.cantidadPendientes} orden${summary.cantidadPendientes === 1 ? '' : 'es'} en cola</div>
      </div>

      <div class="pos-subbox">
        <div class="small fw-bold text-uppercase pos-text-muted mb-1">Por método de pago</div>
        ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
          .map(
            (m) => `
          <div class="d-flex justify-content-between small py-1 border-bottom pos-num">
            <span>${escapeHtml(POS_PAYMENT_LABELS[m])}</span>
            <span class="fw-bold">${formatPen(summary.porMetodo[m])}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="pos-subbox pos-subbox--muted pos-num">
        <div class="d-flex justify-content-between small pos-text-muted">
          <span>IGV acumulado (18%)</span>
          <span class="fw-bold">${formatPen(summary.igvTotal)}</span>
        </div>
      </div>

      <button type="button" id="btn-summary-arqueo" class="pos-btn-lg pos-btn-primary w-100 mt-1">
        Ver / Imprimir Arqueo (F6)
      </button>
    </div>
  `;
}

function renderArqueoModal(): void {
  const slot = document.getElementById('cajero-modal-slot');
  if (!slot) return;

  if (!local.isArqueoOpen) {
    slot.innerHTML = '';
    return;
  }

  const summary = getDailySummary(storeState);
  const cobradas = storeState.orders.filter((o) => o.status === 'cobrado');

  slot.innerHTML = `
    <div class="pos-modal-backdrop">
      <div class="pos-modal-card pos-print-only-target">
        <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
          <div>
            <h2 class="h4 pos-display mb-0">Arqueo y Cuadre de Caja · I&amp;O</h2>
            <div class="small pos-text-muted pos-num">Jornada: ${escapeHtml(storeState.dayKey)} · Cajero: ${escapeHtml(currentSession.displayName)}</div>
          </div>
          <div class="d-flex gap-2 pos-no-print">
            <button type="button" class="pos-btn-md pos-btn-primary" id="btn-print-arqueo">
              Imprimir Arqueo
            </button>
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-arqueo">
              Cerrar (Esc)
            </button>
          </div>
        </div>

        <div class="row g-2 mb-3 pos-num">
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Cobrado Hoy</div>
              <div class="fw-bold fs-6 pos-text-ok">${formatPen(summary.totalCobrado)}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Efectivo Cobrado</div>
              <div class="fw-bold fs-6">${formatPen(summary.porMetodo.efectivo)}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">IGV Acumulado</div>
              <div class="fw-bold fs-6">${formatPen(summary.igvTotal)}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Pendiente</div>
              <div class="fw-bold fs-6 pos-text-warn">${formatPen(summary.totalPendiente)}</div>
            </div>
          </div>
        </div>

        <div class="d-flex justify-content-end mb-3 pos-no-print">
          <button type="button" class="pos-btn-md pos-btn-danger" id="btn-reset-day">
            Reiniciar jornada
          </button>
        </div>

        <h3 class="h6 fw-bold">Comprobantes emitidos (${cobradas.length})</h3>
        <div class="table-responsive mb-3">
          <table class="table table-sm small pos-num">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Orden</th>
                <th>Cliente</th>
                <th class="text-end">IGV</th>
                <th class="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                cobradas.length === 0
                  ? '<tr><td colspan="5" class="text-center text-muted">Sin comprobantes emitidos.</td></tr>'
                  : cobradas
                      .map(
                        (o) => `
                    <tr>
                      <td class="fw-bold">${escapeHtml(o.numeroComprobante ?? '')}</td>
                      <td>${escapeHtml(o.id)}</td>
                      <td>${escapeHtml(o.clienteRazonSocial || 'Cliente Varios')}</td>
                      <td class="text-end">${formatPen(o.igv)}</td>
                      <td class="text-end fw-bold">${formatPen(o.total)}</td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        <h3 class="h6 fw-bold">Movimientos de caja (${storeState.movimientosCaja.length})</h3>
        <div class="table-responsive">
          <table class="table table-sm small pos-num">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Orden</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Referencia</th>
                <th class="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${
                storeState.movimientosCaja.length === 0
                  ? '<tr><td colspan="6" class="text-center text-muted">Sin movimientos registrados.</td></tr>'
                  : storeState.movimientosCaja
                      .map(
                        (m) => `
                    <tr>
                      <td>${formatTimeShort(m.fecha)}</td>
                      <td>${escapeHtml(m.orderId)}</td>
                      <td>${m.tipo === 'ingreso_venta' ? 'Venta cerrada' : 'Abono a cuenta'}</td>
                      <td>${escapeHtml(POS_PAYMENT_LABELS[m.metodo])}</td>
                      <td><code>${escapeHtml(m.referencia)}</code></td>
                      <td class="text-end fw-bold">${formatPen(m.monto)}</td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderAllDynamic(): void {
  renderTopCounter();
  renderNotif();
  renderFeedback();
  renderQueue();
  renderCenter();
  renderSummary();
  renderArqueoModal();
}

function routeOrderError(error: string): void {
  if (error.includes('RN-TRI-02') || error.includes('DNI') || error.includes('RUC') || error.includes('Razón Social')) {
    local.billingError = error;
    local.paymentError = '';
  } else {
    local.paymentError = error;
    local.billingError = '';
  }
}

function handleCashPayment(): void {
  const order = getSelectedOrder();
  if (!order || order.status !== 'pendiente_cobro') return;

  const parsed = Number(local.cashReceivedStr);
  const amount =
    local.cashReceivedStr.trim() === '' || Number.isNaN(parsed) ? order.saldoPendiente : parsed;

  const res = recordPaymentOrAbono({
    orderId: order.id,
    monto: amount,
    metodo: 'efectivo',
    tipo: 'pago',
    cajeroNombre: currentSession.displayName,
  });

  if (!res.ok) {
    routeOrderError(res.error);
    renderAllDynamic();
    return;
  }

  storeState = loadPosState();
  local.cashReceivedStr = '';
  local.billingError = '';
  local.paymentError = '';
  local.feedback = {
    kind: 'ok',
    text: res.settled
      ? `Cobro registrado · ${res.order.numeroComprobante}.${res.order.vuelto > 0 ? ` Vuelto: ${formatPen(res.order.vuelto)}.` : ''}`
      : `Abono registrado. Saldo pendiente: ${formatPen(res.order.saldoPendiente)}.`,
  };
  renderAllDynamic();
}

function buildConsoleApi(): PosConsoleApi {
  const resolveTargetOrderId = (ordenId?: string): string | null => {
    if (ordenId) return ordenId;
    const current = getSelectedOrder();
    if (current && current.status === 'pendiente_cobro') return current.id;
    const firstPending = storeState.orders.find((o) => o.status === 'pendiente_cobro');
    return firstPending?.id ?? null;
  };

  const api: PosConsoleApi = {
    ayuda() {
      console.info(
        [
          '=== I&O POS · Simulador de Cobros y Abonos por Consola ===',
          'posPago.estado() -> Ver orden activa, pendientes y cuadre del día',
          "posPago.pagar(monto?, metodo?, ordenId?) -> Simula pago (ej. posPago.pagar(119.90, 'yape_plin'))",
          "posPago.abonar(monto, metodo?, ordenId?, nota?) -> Simula abono parcial a cuenta",
          "posPago.simularRechazo(motivo?, ordenId?) -> Simula rechazo de pasarela",
          'posPago.fondoCaja(monto) -> Ajusta el fondo inicial de gaveta',
          'posPago.reiniciarDia() -> Reinicia el estado POS de pruebas',
          "Métodos válidos: 'efectivo' | 'tarjeta' | 'yape_plin' | 'transferencia'",
        ].join('\n')
      );
    },

    estado() {
      storeState = loadPosState();
      const summary = getDailySummary(storeState);
      const selected = getSelectedOrder();
      const snapshot = {
        ordenSeleccionada: selected
          ? {
              id: selected.id,
              status: selected.status,
              total: selected.total,
              montoPagado: selected.montoPagado,
              saldoPendiente: selected.saldoPendiente,
            }
          : null,
        pendientes: storeState.orders
          .filter((o) => o.status === 'pendiente_cobro')
          .map((o) => ({ id: o.id, total: o.total, saldoPendiente: o.saldoPendiente })),
        resumenDia: summary,
      };
      console.table(snapshot.pendientes);
      return snapshot;
    },

    pagar(monto, metodo, ordenId) {
      storeState = loadPosState();
      const targetId = resolveTargetOrderId(ordenId);
      if (!targetId) {
        const err = { ok: false, error: 'No hay ninguna orden pendiente de cobro.' };
        console.warn(err.error);
        return err;
      }
      const order = storeState.orders.find((o) => o.id === targetId);
      const effectiveAmount = typeof monto === 'number' ? monto : (order?.saldoPendiente ?? 0);
      const effectiveMethod: PosPaymentMethod = metodo ?? local.selectedMethod;

      const res = recordPaymentOrAbono({
        orderId: targetId,
        monto: effectiveAmount,
        metodo: effectiveMethod,
        tipo: 'pago',
        nota: 'Registro interno',
        cajeroNombre: currentSession.displayName,
      });

      if (!res.ok) {
        local.feedback = { kind: 'err', text: res.error };
        renderAllDynamic();
        console.error(res.error);
        return res;
      }

      storeState = loadPosState();
      local.selectedOrderId = res.order.id;
      local.selectedMethod = effectiveMethod;
      local.incomingNotif = null;
      local.feedback = {
        kind: 'ok',
        text: res.settled
          ? `Cobro registrado (${POS_PAYMENT_LABELS[effectiveMethod]}). Comprobante emitido: ${res.order.numeroComprobante}.`
          : `Abono registrado de ${formatPen(effectiveAmount)}. Saldo pendiente: ${formatPen(res.order.saldoPendiente)}.`,
      };
      renderAllDynamic();
      return {
        ok: true,
        orderId: res.order.id,
        settled: res.settled,
        numeroComprobante: res.order.numeroComprobante ?? null,
        saldoPendiente: res.order.saldoPendiente,
      };
    },

    abonar(monto, metodo, ordenId, nota) {
      storeState = loadPosState();
      const targetId = resolveTargetOrderId(ordenId);
      if (!targetId) {
        const err = { ok: false, error: 'No hay ninguna orden pendiente para abonar.' };
        console.warn(err.error);
        return err;
      }
      const effectiveMethod: PosPaymentMethod = metodo ?? local.selectedMethod;
      const res = recordPaymentOrAbono({
        orderId: targetId,
        monto,
        metodo: effectiveMethod,
        tipo: 'abono_cuenta',
        nota: nota ?? 'Abono registrado',
        cajeroNombre: currentSession.displayName,
      });

      if (!res.ok) {
        local.feedback = { kind: 'err', text: res.error };
        renderAllDynamic();
        console.error(res.error);
        return res;
      }

      storeState = loadPosState();
      local.selectedOrderId = res.order.id;
      local.selectedMethod = effectiveMethod;
      local.feedback = {
        kind: 'ok',
        text: res.settled
          ? `Abono completó la orden ${res.order.id}. Comprobante: ${res.order.numeroComprobante}.`
          : `Abono de ${formatPen(monto)} registrado en ${res.order.id}. Falta ${formatPen(res.order.saldoPendiente)}.`,
      };
      renderAllDynamic();
      return {
        ok: true,
        orderId: res.order.id,
        settled: res.settled,
        montoPagado: res.order.montoPagado,
        saldoPendiente: res.order.saldoPendiente,
      };
    },

    simularRechazo(motivo = 'Operación rechazada por la pasarela', ordenId) {
      const targetId = resolveTargetOrderId(ordenId) ?? 'ORD-SIN-SELECCION';
      emitSimulatedRejection(targetId, motivo);
      local.feedback = {
        kind: 'err',
        text: `Operación rechazada en ${targetId}: ${motivo}. Puedes reintentar con otro método.`,
      };
      renderAllDynamic();
      return { ok: false, orderId: targetId, motivo };
    },

    reiniciarDia() {
      storeState = resetPosDay();
      local.selectedOrderId = null;
      local.incomingNotif = null;
      local.cashReceivedStr = '';
      local.feedback = { kind: 'warn', text: 'Jornada POS reiniciada.' };
      renderAllDynamic();
      return { ok: true, message: 'Estado POS reiniciado' };
    },
  };

  return api;
}

function handleIncomingBroadcast(event: PosBroadcastEvent): void {
  const prevPendingIds = new Set(
    storeState.orders.filter((o) => o.status === 'pendiente_cobro').map((o) => o.id)
  );
  storeState = loadPosState();

  if (event.type === 'ORDER_CREATED') {
    const newOrder = storeState.orders.find((o) => o.id === event.orderId);
    if (newOrder) {
      local.incomingNotif = {
        orderId: newOrder.id,
        total: newOrder.total,
        itemsCount: newOrder.items.reduce((a, i) => a + i.cantidad, 0),
      };
      if (!local.selectedOrderId) {
        local.selectedOrderId = newOrder.id;
      }
      playBeep();
    }
  } else if (event.type === 'STATE_SYNC') {
    const newlyArrived = storeState.orders.find(
      (o) => o.status === 'pendiente_cobro' && !prevPendingIds.has(o.id)
    );
    if (newlyArrived) {
      local.incomingNotif = {
        orderId: newlyArrived.id,
        total: newlyArrived.total,
        itemsCount: newlyArrived.items.reduce((a, i) => a + i.cantidad, 0),
      };
      playBeep();
    }
  }

  renderAllDynamic();
}

function bindEvents(): void {
  document.getElementById('btn-pos-logout')?.addEventListener('click', () => {
    logoutToAccess();
  });

  document.getElementById('btn-open-arqueo')?.addEventListener('click', () => {
    local.isArqueoOpen = true;
    renderArqueoModal();
  });

  root!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('#btn-attend-notif') && local.incomingNotif) {
      local.queueTab = 'pendientes';
      local.selectedOrderId = local.incomingNotif.orderId;
      local.incomingNotif = null;
      renderAllDynamic();
      return;
    }

    if (target.closest('#btn-dismiss-notif')) {
      local.incomingNotif = null;
      renderNotif();
      return;
    }

    if (target.closest('#btn-close-cajero-feedback')) {
      local.feedback = null;
      renderFeedback();
      return;
    }

    const tabBtn = target.closest<HTMLElement>('[data-queue-tab]');
    if (tabBtn?.dataset.queueTab) {
      local.queueTab = tabBtn.dataset.queueTab as 'pendientes' | 'cobradas';
      renderQueue();
      return;
    }

    const orderBtn = target.closest<HTMLElement>('[data-select-order]');
    if (orderBtn?.dataset.selectOrder) {
      local.selectedOrderId = orderBtn.dataset.selectOrder;
      local.cashReceivedStr = '';
      local.billingError = '';
      local.paymentError = '';
      renderQueue();
      renderCenter();
      return;
    }

    const receiptBtn = target.closest<HTMLElement>('[data-receipt-type]');
    if (receiptBtn?.dataset.receiptType) {
      const order = getSelectedOrder();
      if (order && order.status === 'pendiente_cobro') {
        updateOrderBilling(order.id, {
          tipoComprobante: receiptBtn.dataset.receiptType as PosReceiptType,
          clienteDoc: order.clienteDoc,
          clienteRazonSocial: order.clienteRazonSocial,
        });
        storeState = loadPosState();
        local.billingError = '';
        renderCenter();
      }
      return;
    }

    const methodBtn = target.closest<HTMLElement>('[data-pay-method]');
    if (methodBtn?.dataset.payMethod) {
      local.selectedMethod = methodBtn.dataset.payMethod as PosPaymentMethod;
      local.paymentError = '';
      renderCenter();
      return;
    }

    if (target.closest('#btn-pay-efectivo')) {
      handleCashPayment();
      return;
    }

    if (target.closest('#btn-pay-digital')) {
      const order = getSelectedOrder();
      if (!order || order.status !== 'pendiente_cobro') return;
      const refInput = document.getElementById('cajero-ref-input') as HTMLInputElement | null;
      const nota = refInput?.value.trim() || undefined;
      const res = recordPaymentOrAbono({
        orderId: order.id,
        monto: order.saldoPendiente,
        metodo: local.selectedMethod,
        tipo: 'pago',
        nota,
        cajeroNombre: currentSession.displayName,
      });
      if (!res.ok) {
        routeOrderError(res.error);
        renderCenter();
        return;
      }
      storeState = loadPosState();
      local.selectedOrderId = res.order.id;
      local.incomingNotif = null;
      local.billingError = '';
      local.paymentError = '';
      local.feedback = {
        kind: 'ok',
        text: `Cobro registrado · ${res.order.numeroComprobante}.`,
      };
      renderAllDynamic();
      return;
    }

    if (target.closest('#btn-cancel-order')) {
      const order = getSelectedOrder();
      if (order && order.status === 'pendiente_cobro') {
        const res = cancelOrder(order.id, 'Cancelada en caja por el colaborador');
        if (res.ok) {
          storeState = loadPosState();
          local.selectedOrderId =
            storeState.orders.find((o) => o.status === 'pendiente_cobro')?.id ?? null;
          local.feedback = { kind: 'warn', text: `Orden ${order.id} cancelada.` };
          renderAllDynamic();
        }
      }
      return;
    }

    if (target.closest('#btn-print-receipt') || target.closest('#btn-print-arqueo')) {
      window.print();
      return;
    }

    if (target.closest('#btn-summary-arqueo')) {
      local.isArqueoOpen = true;
      renderArqueoModal();
      return;
    }

    if (target.closest('#btn-close-arqueo')) {
      local.isArqueoOpen = false;
      renderArqueoModal();
      return;
    }

    if (target.closest('#btn-reset-day')) {
      storeState = resetPosDay();
      local.selectedOrderId = null;
      local.incomingNotif = null;
      local.isArqueoOpen = false;
      local.feedback = { kind: 'warn', text: 'Jornada POS reiniciada.' };
      renderAllDynamic();
    }
  });

  root!.addEventListener('input', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (!target) return;

    if (target.id === 'cajero-doc-input' || target.id === 'cajero-razon-input') {
      const order = getSelectedOrder();
      if (!order || order.status !== 'pendiente_cobro') return;
      const docEl = document.getElementById('cajero-doc-input') as HTMLInputElement | null;
      const razonEl = document.getElementById('cajero-razon-input') as HTMLInputElement | null;
      updateOrderBilling(order.id, {
        tipoComprobante: order.tipoComprobante,
        clienteDoc: docEl?.value ?? order.clienteDoc,
        clienteRazonSocial: razonEl?.value ?? order.clienteRazonSocial,
      });
      storeState = loadPosState();
      if (local.billingError) {
        local.billingError = '';
        target.closest('.mb-3')?.querySelector('.pos-inline-error')?.remove();
      }
      return;
    }

    if (target.id === 'cajero-efectivo-input') {
      local.cashReceivedStr = target.value;
      const order = getSelectedOrder();
      if (order) {
        const cashReceived = Number(local.cashReceivedStr);
        const vuelto =
          Number.isFinite(cashReceived) && cashReceived > order.saldoPendiente
            ? roundMoney(cashReceived - order.saldoPendiente)
            : 0;
        const vueltoEl = root!.querySelector('[data-vuelto-preview]');
        if (vueltoEl) {
          vueltoEl.textContent = formatPen(vuelto);
        }
      }
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      const firstPending = storeState.orders.find((o) => o.status === 'pendiente_cobro');
      if (firstPending) {
        local.queueTab = 'pendientes';
        local.selectedOrderId = firstPending.id;
        local.incomingNotif = null;
        renderAllDynamic();
      }
    } else if (ev.key === 'F4') {
      ev.preventDefault();
      if (local.selectedMethod === 'efectivo') {
        handleCashPayment();
      }
    } else if (ev.key === 'F6') {
      ev.preventDefault();
      local.isArqueoOpen = !local.isArqueoOpen;
      renderArqueoModal();
    } else if (ev.key === 'F7') {
      ev.preventDefault();
      const selected = getSelectedOrder();
      if (selected?.status === 'cobrado' || local.isArqueoOpen) {
        window.print();
      }
    } else if (ev.key === 'Escape') {
      if (local.isArqueoOpen || local.feedback || local.incomingNotif) {
        local.isArqueoOpen = false;
        local.feedback = null;
        local.incomingNotif = null;
        renderAllDynamic();
      }
    }
  });

  subscribePosEvents(handleIncomingBroadcast);
}

if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
  const consoleApi = buildConsoleApi();
  window.posPago = consoleApi;
  window.ioPos = consoleApi;
}

renderStaticShell();
bindEvents();
renderAllDynamic();

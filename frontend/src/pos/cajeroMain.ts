import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import { DemoSession, logoutToAccess, requireAnyZoneRole } from '../auth/demoSession';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  POS_PAYMENT_LABELS,
  cancelOrder,
  createAllyDebt,
  emitSimulatedRejection,
  formatPen,
  formatTimeShort,
  getDailySummary,
  getPosUiMode,
  loadPosState,
  recordAllyDebtPayment,
  recordPaymentOrAbono,
  resetPosDay,
  roundMoney,
  setPosUiMode,
  subscribePosEvents,
  subscribePosMode,
  updateOrderBilling,
} from './posStore';
import {
  PosAllyDebt,
  PosAllyDebtType,
  PosBroadcastEvent,
  PosConsoleApi,
  PosOrder,
  PosPaymentMethod,
  PosReceiptType,
  PosStoreState,
  PosUiMode,
} from './posTypes';

interface CajeroLocalState {
  uiMode: PosUiMode;
  queueTab: 'pendientes' | 'cobradas' | 'aliados';
  selectedOrderId: string | null;
  selectedAllyId: string | null;
  selectedMethod: PosPaymentMethod;
  allyMethod: PosPaymentMethod;
  cashReceivedStr: string;
  incomingNotif: { orderId: string; total: number; itemsCount: number } | null;
  billingError: string;
  paymentError: string;
  allyError: string;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
  isArqueoOpen: boolean;
  isAllyModalOpen: boolean;
}

const activeSession = requireAnyZoneRole(
  ['cajero', 'vendedor', 'administrador'],
  '/pos-cajero.html'
);
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let storeState: PosStoreState = loadPosState();

const local: CajeroLocalState = {
  uiMode: getPosUiMode(),
  queueTab: 'pendientes',
  selectedOrderId:
    storeState.orders.find((o) => o.status === 'pendiente_cobro')?.id ??
    storeState.orders[0]?.id ??
    null,
  selectedAllyId: storeState.allyDebts[0]?.id ?? null,
  selectedMethod: 'efectivo',
  allyMethod: 'transferencia',
  cashReceivedStr: '',
  incomingNotif: null,
  billingError: '',
  paymentError: '',
  allyError: '',
  feedback: null,
  isArqueoOpen: false,
  isAllyModalOpen: false,
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
        <nav class="pos-nav-tabs" aria-label="Áreas del punto de venta">
          <a href="/pos-vendedor.html" class="pos-nav-tab">
            Mostrador (Productos)
          </a>
          <a href="/pos-cajero.html" class="pos-nav-tab is-active" aria-current="page">
            Caja y Cobros
            <span id="cajero-topbar-counter" class="pos-counter-badge pos-num d-none">0</span>
          </a>
        </nav>
        <span class="pos-topbar-staff">Turno: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
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
      <div id="cajero-practice-slot" class="pos-no-print"></div>

      <div class="pos-cajero-grid">
        <section id="cajero-queue-slot" class="pos-panel pos-no-print"></section>
        <section id="cajero-center-slot" class="pos-panel"></section>
        <section id="cajero-summary-slot" class="pos-panel pos-no-print"></section>
      </div>
    </main>

    <div id="cajero-modal-slot"></div>
    <div id="cajero-ally-modal-slot" class="pos-no-print"></div>
  `;

  bindBrandLogo(root!);
}

function renderTopCounter(): void {
  const el = document.getElementById('cajero-topbar-counter');
  if (!el) return;
  const count = storeState.orders.filter((o) => o.status === 'pendiente_cobro').length;
  if (count > 0) {
    el.textContent = String(count);
    el.classList.remove('d-none');
  } else {
    el.textContent = '0';
    el.classList.add('d-none');
  }
}

function renderPracticeBar(): void {
  const slot = document.getElementById('cajero-practice-slot');
  if (!slot) return;
  if (local.uiMode !== 'practica') {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="pos-practice-bar">
      <div>
        <strong>Modo Práctica activo:</strong>
        <span>Comandos en consola: <code>IO_POS.ayuda()</code> · <code>IO_POS.pagar()</code> · <code>IO_POS.abonar(100)</code> · <code>IO_POS.simularRechazo()</code> · <code>IO_POS.reiniciarDia()</code></span>
      </div>
      <span class="pos-text-muted">Volver a modo real: <code>IO_POS.modo('operacion')</code></span>
    </div>
  `;
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

function getSelectedAlly(): PosAllyDebt | null {
  if (local.selectedAllyId) {
    const found = storeState.allyDebts.find((d) => d.id === local.selectedAllyId);
    if (found) return found;
  }
  const first = storeState.allyDebts[0] ?? null;
  local.selectedAllyId = first?.id ?? null;
  return first;
}

function getAllyDaysRemaining(debt: PosAllyDebt): number {
  const due = new Date(debt.fechaVencimiento).getTime();
  const diff = due - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function renderQueue(): void {
  const slot = document.getElementById('cajero-queue-slot');
  if (!slot) return;

  const pendientes = storeState.orders.filter((o) => o.status === 'pendiente_cobro');
  const cobradas = storeState.orders.filter((o) => o.status === 'cobrado');
  const aliadosPendientes = storeState.allyDebts.filter((d) => d.status === 'pendiente');
  const list = local.queueTab === 'pendientes' ? pendientes : cobradas;
  const selected = getSelectedOrder();
  const selectedAlly = getSelectedAlly();

  slot.innerHTML = `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Órdenes y Cuentas</h2>
    </div>
    <div class="pos-panel-body">
      <div class="pos-seg-group pos-seg-group--3 mb-2">
        <button
          type="button"
          class="pos-seg-btn pos-num ${local.queueTab === 'pendientes' ? 'is-active' : ''}"
          data-queue-tab="pendientes"
        >
          Pend. (${pendientes.length})
        </button>
        <button
          type="button"
          class="pos-seg-btn pos-num ${local.queueTab === 'cobradas' ? 'is-active' : ''}"
          data-queue-tab="cobradas"
        >
          Cobr. (${cobradas.length})
        </button>
        <button
          type="button"
          class="pos-seg-btn pos-num ${local.queueTab === 'aliados' ? 'is-active' : ''}"
          data-queue-tab="aliados"
        >
          Aliados (${aliadosPendientes.length})
        </button>
      </div>

      ${
        local.queueTab === 'aliados'
          ? `
            <button type="button" id="btn-open-ally-modal" class="pos-btn-md pos-btn-primary w-100 mb-2">
              + Registrar préstamo / crédito
            </button>
            <div class="d-flex flex-column gap-2" style="max-height: 500px; overflow-y: auto;">
              ${
                storeState.allyDebts.length === 0
                  ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">Sin cuentas de negocios aliados.</div>'
                  : storeState.allyDebts
                      .map((d) => {
                        const isActive = selectedAlly?.id === d.id;
                        const days = getAllyDaysRemaining(d);
                        let badge = '<span class="pos-status-chip is-paid">Liquidado</span>';
                        if (d.status === 'pendiente') {
                          badge =
                            days < 0
                              ? `<span class="pos-stock-badge pos-stock-zero pos-num">Vencido ${Math.abs(days)}d</span>`
                              : `<span class="pos-status-chip is-pending pos-num">Vence en ${days}d</span>`;
                        }
                        return `
                          <button
                            type="button"
                            class="pos-queue-card ${isActive ? 'is-active' : ''}"
                            data-select-ally="${escapeHtml(d.id)}"
                          >
                            <div class="d-flex justify-content-between align-items-center gap-1">
                              <span class="fw-bold pos-num">${escapeHtml(d.id)}</span>
                              ${badge}
                            </div>
                            <div class="small fw-semibold text-truncate">${escapeHtml(d.negocioNombre)}</div>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                              <span class="small pos-text-muted">${d.tipo === 'consignacion' ? 'Consignación 7d' : 'Crédito'}</span>
                              <span class="fw-bold pos-num">${formatPen(d.saldoPendiente)}</span>
                            </div>
                          </button>
                        `;
                      })
                      .join('')
              }
            </div>
          `
          : `
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
          `
      }
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

function renderAllyDetail(debt: PosAllyDebt): string {
  const days = getAllyDaysRemaining(debt);
  const isOverdue = debt.status === 'pendiente' && days < 0;

  return `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Cuenta Aliado · ${escapeHtml(debt.id)}</h2>
      <span class="pos-status-chip ${debt.status === 'pagado' ? 'is-paid' : isOverdue ? 'is-partial' : 'is-pending'}">
        ${debt.status === 'pagado' ? 'Liquidada' : isOverdue ? `Vencida (${Math.abs(days)} días)` : `Vence en ${days} días`}
      </span>
    </div>
    <div class="pos-panel-body">
      ${
        isOverdue && debt.tipo === 'consignacion'
          ? `<div class="pos-banner is-warn mb-3">
              <span>Plazo máximo de consignación de 7 días vencido (RN-PRE-02). Corresponde liquidación o devolución inmediata.</span>
            </div>`
          : ''
      }

      <div class="pos-subbox mb-3">
        <div class="fw-bold fs-6 mb-1">${escapeHtml(debt.negocioNombre)}</div>
        <div class="row g-1 small">
          <div class="col-6"><strong>RUC:</strong> <span class="pos-num">${escapeHtml(debt.ruc)}</span></div>
          <div class="col-6"><strong>Tipo:</strong> ${debt.tipo === 'consignacion' ? 'Préstamo en Consignación' : 'Crédito Comercial'}</div>
          <div class="col-12"><strong>Contacto:</strong> ${escapeHtml(debt.contacto)}</div>
          <div class="col-6"><strong>Emisión:</strong> <span class="pos-num">${new Date(debt.fechaEmision).toLocaleDateString('es-PE')}</span></div>
          <div class="col-6"><strong>Vencimiento:</strong> <span class="pos-num">${new Date(debt.fechaVencimiento).toLocaleDateString('es-PE')}</span></div>
          <div class="col-12"><strong>Autorizado por:</strong> ${escapeHtml(debt.autorizadoPor)}</div>
          <div class="col-12 mt-1"><strong>Prendas:</strong> ${escapeHtml(debt.descripcionPrendas)}</div>
        </div>
      </div>

      <div class="pos-subbox pos-subbox--muted mb-3 pos-num">
        <div class="d-flex justify-content-between small">
          <span>Monto total</span>
          <span>${formatPen(debt.montoTotal)}</span>
        </div>
        <div class="d-flex justify-content-between small pos-text-ok">
          <span>Abonado a la fecha</span>
          <span>${formatPen(debt.montoPagado)}</span>
        </div>
        <div class="d-flex justify-content-between fw-bold fs-5 border-top mt-1 pt-1">
          <span>Saldo pendiente</span>
          <span class="${debt.saldoPendiente > 0 ? 'pos-text-err' : 'pos-text-ok'}">${formatPen(debt.saldoPendiente)}</span>
        </div>
      </div>

      ${
        debt.status === 'pendiente'
          ? `
            <div class="mb-3">
              <div class="small fw-bold text-uppercase pos-text-muted mb-1">Registrar Abono o Liquidación</div>
              <div class="pos-method-grid mb-2">
                ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
                  .map(
                    (m) => `
                    <button
                      type="button"
                      class="pos-method-btn ${local.allyMethod === m ? 'is-active' : ''}"
                      data-ally-method="${m}"
                    >
                      ${escapeHtml(POS_PAYMENT_LABELS[m])}
                    </button>
                  `
                  )
                  .join('')}
              </div>
              <div class="row g-2 mb-2">
                <div class="col-5">
                  <label for="ally-pay-amount" class="form-label small fw-semibold mb-1">Monto (S/)</label>
                  <input
                    id="ally-pay-amount"
                    type="number"
                    min="0.10"
                    step="0.10"
                    max="${debt.saldoPendiente.toFixed(2)}"
                    value="${debt.saldoPendiente.toFixed(2)}"
                    class="form-control form-control-sm pos-num fw-bold"
                  />
                </div>
                <div class="col-7">
                  <label for="ally-pay-note" class="form-label small fw-semibold mb-1">N.° operación / nota</label>
                  <input
                    id="ally-pay-note"
                    type="text"
                    maxlength="60"
                    placeholder="Ej. Operación bancaria o abono parcial"
                    class="form-control form-control-sm"
                  />
                </div>
              </div>
              ${local.allyError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.allyError)}</div>` : ''}
              <button type="button" id="btn-pay-ally" class="pos-btn-lg pos-btn-success w-100">
                Registrar abono / liquidar (${escapeHtml(POS_PAYMENT_LABELS[local.allyMethod])})
              </button>
            </div>
          `
          : ''
      }

      ${
        debt.pagos.length > 0
          ? `
            <div class="pos-subbox">
              <div class="small fw-bold mb-1">Historial de abonos (${debt.pagos.length})</div>
              ${debt.pagos
                .map(
                  (p) => `
                  <div class="d-flex justify-content-between small py-1 border-bottom pos-num">
                    <span>${new Date(p.fecha).toLocaleDateString('es-PE')} · ${escapeHtml(POS_PAYMENT_LABELS[p.metodo])} · <code>${escapeHtml(p.referencia)}</code></span>
                    <span class="fw-bold pos-text-ok">${formatPen(p.monto)}</span>
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

function renderCenter(): void {
  const slot = document.getElementById('cajero-center-slot');
  if (!slot) return;

  if (local.queueTab === 'aliados') {
    const ally = getSelectedAlly();
    if (!ally) {
      slot.innerHTML = `
        <div class="pos-panel-header"><h2 class="pos-panel-title pos-display">Cuentas de Negocios Aliados</h2></div>
        <div class="pos-panel-body text-center py-5">
          <div class="fw-bold mb-1">Sin cuentas registradas</div>
          <div class="small pos-text-muted">Registra un préstamo en consignación o venta a crédito desde el panel izquierdo.</div>
        </div>
      `;
      return;
    }
    slot.innerHTML = renderAllyDetail(ally);
    return;
  }

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
            ${
              local.uiMode === 'practica'
                ? `Simular llegada de pago (${escapeHtml(POS_PAYMENT_LABELS[local.selectedMethod])}) · ${formatPen(order.saldoPendiente)}`
                : `Confirmar cobro recibido (${escapeHtml(POS_PAYMENT_LABELS[local.selectedMethod])}) · ${formatPen(order.saldoPendiente)}`
            }
          </button>
          ${
            local.uiMode === 'practica'
              ? `<button type="button" id="btn-sim-reject-digital" class="pos-btn-md pos-btn-danger w-100 mt-2">
                  Simular rechazo de pasarela
                </button>`
              : ''
          }
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

      <div class="pos-kpi-card">
        <div class="pos-kpi-label">Cuentas Aliados por cobrar</div>
        <div class="pos-kpi-value pos-text-err pos-num">${formatPen(summary.totalDeudaAliados)}</div>
        <div class="small pos-text-muted pos-num">${summary.cantidadDeudasAliados} negocio${summary.cantidadDeudasAliados === 1 ? '' : 's'} con saldo</div>
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

        ${
          local.uiMode === 'practica'
            ? `<div class="d-flex justify-content-end mb-3 pos-no-print">
                <button type="button" class="pos-btn-md pos-btn-danger" id="btn-reset-day">
                  Reiniciar jornada de prueba
                </button>
              </div>`
            : ''
        }

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
                      <td>${m.tipo === 'ingreso_venta' ? 'Venta cerrada' : m.tipo === 'abono_aliado' ? 'Abono aliado' : 'Abono a cuenta'}</td>
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

function renderAllyModal(): void {
  const slot = document.getElementById('cajero-ally-modal-slot');
  if (!slot) return;

  if (!local.isAllyModalOpen) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="pos-modal-backdrop" id="ally-modal-backdrop">
      <div class="pos-modal-card" style="max-width: 560px;" role="dialog" aria-modal="true" aria-labelledby="ally-modal-title">
        <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
          <h2 id="ally-modal-title" class="h5 pos-display mb-0">Registrar Préstamo o Crédito a Aliado</h2>
          <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-ally-modal">Cerrar</button>
        </div>
        <form id="form-new-ally-debt" class="d-flex flex-column gap-2">
          <div>
            <label for="ally-name" class="form-label small fw-semibold mb-1">Negocio aliado / Razón social *</label>
            <input id="ally-name" type="text" class="form-control form-control-sm" required placeholder="Ej. Boutique San Isidro S.A.C." />
          </div>
          <div class="row g-2">
            <div class="col-5">
              <label for="ally-ruc" class="form-label small fw-semibold mb-1">RUC (11 dígitos) *</label>
              <input id="ally-ruc" type="text" maxlength="11" class="form-control form-control-sm pos-num" required placeholder="20601234567" />
            </div>
            <div class="col-7">
              <label for="ally-contact" class="form-label small fw-semibold mb-1">Contacto / Teléfono</label>
              <input id="ally-contact" type="text" class="form-control form-control-sm" placeholder="Nombre y celular" />
            </div>
          </div>
          <div class="row g-2">
            <div class="col-7">
              <label for="ally-type" class="form-label small fw-semibold mb-1">Modalidad</label>
              <select id="ally-type" class="form-select form-select-sm">
                <option value="consignacion">Préstamo en Consignación (máx. 7 días · RN-PRE-02)</option>
                <option value="credito">Venta a Crédito Comercial</option>
              </select>
            </div>
            <div class="col-5">
              <label for="ally-days" class="form-label small fw-semibold mb-1">Plazo (días)</label>
              <input id="ally-days" type="number" min="1" max="60" value="7" class="form-control form-control-sm pos-num" />
            </div>
          </div>
          <div>
            <label for="ally-items" class="form-label small fw-semibold mb-1">Prendas entregadas *</label>
            <input id="ally-items" type="text" class="form-control form-control-sm" required placeholder="Ej. 4× Polo Pima, 2× Casaca Bomber" />
          </div>
          <div>
            <label for="ally-total" class="form-label small fw-semibold mb-1">Monto total (S/) *</label>
            <input id="ally-total" type="number" min="1" step="0.10" class="form-control form-control-sm pos-num" required placeholder="350.00" />
          </div>
          ${local.allyError ? `<div class="pos-inline-error">${escapeHtml(local.allyError)}</div>` : ''}
          <div class="d-flex justify-content-end gap-2 mt-2">
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-cancel-ally-modal">Cancelar</button>
            <button type="submit" class="pos-btn-md pos-btn-primary">Guardar cuenta</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderAllDynamic(): void {
  renderTopCounter();
  renderNotif();
  renderFeedback();
  renderPracticeBar();
  renderQueue();
  renderCenter();
  renderSummary();
  renderArqueoModal();
  renderAllyModal();
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
    modo(nuevoModo) {
      if (!nuevoModo) return local.uiMode;
      const next = setPosUiMode(nuevoModo);
      local.uiMode = next;
      renderAllDynamic();
      console.info(`[I&O POS] Modo cambiado a: ${next}`);
      return next;
    },

    ayuda() {
      console.info(
        [
          '=== I&O POS · Comandos de Consola ===',
          "IO_POS.modo('practica')  -> Activa botones y guías de práctica",
          "IO_POS.modo('operacion') -> Vuelve al modo operativo limpio (100% real)",
          'IO_POS.estado()          -> Ver orden activa, pendientes y cuadre del día',
          "IO_POS.pagar(monto?, metodo?, ordenId?) -> Simula pago (ej. IO_POS.pagar(119.90, 'yape_plin'))",
          'IO_POS.abonar(monto, metodo?, ordenId?, nota?) -> Simula abono parcial a cuenta',
          'IO_POS.simularRechazo(motivo?, ordenId?) -> Simula rechazo de pasarela',
          'IO_POS.reiniciarDia()    -> Reinicia el estado POS de pruebas',
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
      local.queueTab = tabBtn.dataset.queueTab as 'pendientes' | 'cobradas' | 'aliados';
      local.allyError = '';
      renderQueue();
      renderCenter();
      return;
    }

    if (target.closest('#btn-open-ally-modal')) {
      local.isAllyModalOpen = true;
      local.allyError = '';
      renderAllyModal();
      return;
    }

    if (
      target.id === 'ally-modal-backdrop' ||
      target.closest('#btn-close-ally-modal') ||
      target.closest('#btn-cancel-ally-modal')
    ) {
      local.isAllyModalOpen = false;
      local.allyError = '';
      renderAllyModal();
      return;
    }

    const allyBtn = target.closest<HTMLElement>('[data-select-ally]');
    if (allyBtn?.dataset.selectAlly) {
      local.selectedAllyId = allyBtn.dataset.selectAlly;
      local.allyError = '';
      renderQueue();
      renderCenter();
      return;
    }

    const allyMethodBtn = target.closest<HTMLElement>('[data-ally-method]');
    if (allyMethodBtn?.dataset.allyMethod) {
      local.allyMethod = allyMethodBtn.dataset.allyMethod as PosPaymentMethod;
      local.allyError = '';
      renderCenter();
      return;
    }

    if (target.closest('#btn-pay-ally')) {
      const ally = getSelectedAlly();
      if (!ally) return;
      const amountEl = document.getElementById('ally-pay-amount') as HTMLInputElement | null;
      const noteEl = document.getElementById('ally-pay-note') as HTMLInputElement | null;
      const res = recordAllyDebtPayment({
        debtId: ally.id,
        monto: Number(amountEl?.value ?? 0),
        metodo: local.allyMethod,
        nota: noteEl?.value ?? '',
      });
      if (!res.ok) {
        local.allyError = res.error;
        renderCenter();
        return;
      }
      storeState = loadPosState();
      local.allyError = '';
      local.feedback = {
        kind: 'ok',
        text: res.settled
          ? `Cuenta ${res.debt.id} (${res.debt.negocioNombre}) liquidada por completo.`
          : `Abono registrado en ${res.debt.id}. Saldo restante: ${formatPen(res.debt.saldoPendiente)}.`,
      };
      renderAllDynamic();
      return;
    }

    if (target.closest('#btn-sim-reject-digital')) {
      const order = getSelectedOrder();
      if (order && order.status === 'pendiente_cobro') {
        emitSimulatedRejection(
          order.id,
          `Pago rechazado por pasarela (${POS_PAYMENT_LABELS[local.selectedMethod]}).`
        );
        local.paymentError =
          'Pasarela simuló un rechazo. Puedes reintentar o cambiar el método de pago.';
        renderCenter();
      }
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
      local.selectedAllyId = storeState.allyDebts[0]?.id ?? null;
      local.incomingNotif = null;
      local.isArqueoOpen = false;
      local.feedback = { kind: 'warn', text: 'Jornada POS reiniciada.' };
      renderAllDynamic();
    }
  });

  root!.addEventListener('submit', (ev) => {
    const form = ev.target as HTMLFormElement | null;
    if (form?.id !== 'form-new-ally-debt') return;
    ev.preventDefault();

    const nameEl = document.getElementById('ally-name') as HTMLInputElement | null;
    const rucEl = document.getElementById('ally-ruc') as HTMLInputElement | null;
    const contactEl = document.getElementById('ally-contact') as HTMLInputElement | null;
    const typeEl = document.getElementById('ally-type') as HTMLSelectElement | null;
    const daysEl = document.getElementById('ally-days') as HTMLInputElement | null;
    const itemsEl = document.getElementById('ally-items') as HTMLInputElement | null;
    const totalEl = document.getElementById('ally-total') as HTMLInputElement | null;

    const res = createAllyDebt({
      negocioNombre: nameEl?.value ?? '',
      ruc: rucEl?.value ?? '',
      contacto: contactEl?.value ?? '',
      tipo: (typeEl?.value as PosAllyDebtType) ?? 'consignacion',
      diasPlazo: Number(daysEl?.value ?? 7),
      descripcionPrendas: itemsEl?.value ?? '',
      montoTotal: Number(totalEl?.value ?? 0),
      autorizadoPor: currentSession.displayName,
    });

    if (!res.ok) {
      local.allyError = res.error;
      renderAllyModal();
      return;
    }

    storeState = loadPosState();
    local.isAllyModalOpen = false;
    local.allyError = '';
    local.queueTab = 'aliados';
    local.selectedAllyId = res.debt.id;
    local.feedback = {
      kind: 'ok',
      text: `Cuenta ${res.debt.id} registrada para ${res.debt.negocioNombre}.`,
    };
    renderAllDynamic();
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
  subscribePosMode((mode) => {
    local.uiMode = mode;
    renderAllDynamic();
  });
}

const consoleApi = buildConsoleApi();
window.IO_POS = consoleApi;
window.posPago = consoleApi;
window.ioPos = consoleApi;

renderStaticShell();
bindEvents();
renderAllDynamic();

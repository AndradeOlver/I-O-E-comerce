import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import '../styles/almacen.css';
import { DemoSession, logoutToAccess, requireAnyZoneRole } from '../auth/demoSession';
import {
  formatPen,
  getInventoryList,
  getPosUiMode,
  loadPosState,
  setPosUiMode,
  subscribePosMode,
} from '../pos/posStore';
import { PosUiMode } from '../pos/posTypes';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  approvePurchaseOrder,
  closeWarehouseLoan,
  confirmDispatchPaymentSim,
  createWarehouseLoan,
  generateDispatchGuide,
  loadWarehouseState,
  receivePurchaseOrder,
  recordDeliveryAttempt,
  registerSupplier,
  resetWarehouseState,
  subscribeWarehouseEvents,
  verifyDispatchSku,
  verifyNextDispatchItem,
} from './almacenStore';
import {
  PurchaseOrder,
  WarehouseConsoleApi,
  WarehouseDispatch,
  WarehouseLoan,
  WarehousePrintDoc,
  WarehouseStoreState,
  WarehouseTab,
} from './almacenTypes';

interface AlmacenLocalState {
  uiMode: PosUiMode;
  activeTab: WarehouseTab;
  searchQuery: string;
  selectedDispatchId: string | null;
  selectedPurchaseId: string | null;
  selectedLoanId: string | null;
  isLoanModalOpen: boolean;
  isSupplierModalOpen: boolean;
  isAuditModalOpen: boolean;
  printDoc: WarehousePrintDoc | null;
  modalError: string;
  actionError: string;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
}

const activeSession = requireAnyZoneRole(['almacenero', 'administrador'], '/almacen.html');
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let whState: WarehouseStoreState = loadWarehouseState();
let posState = loadPosState();

const local: AlmacenLocalState = {
  uiMode: getPosUiMode(),
  activeTab: 'despachos',
  searchQuery: '',
  selectedDispatchId: whState.dispatches[0]?.id ?? null,
  selectedPurchaseId: whState.purchases[0]?.id ?? null,
  selectedLoanId: whState.loans[0]?.id ?? null,
  isLoanModalOpen: false,
  isSupplierModalOpen: false,
  isAuditModalOpen: false,
  printDoc: null,
  modalError: '',
  actionError: '',
  feedback: null,
};

const root = document.getElementById('almacen-root');
if (!root) {
  throw new Error('No se encontró #almacen-root');
}

function playBeep(freq = 920, duration = 0.08): void {
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Sin audio disponible
  }
}

function getDaysRemaining(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function renderStaticShell(): void {
  root!.innerHTML = `
    <header class="pos-topbar pos-no-print">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Gestión de Almacén</h1>
        <span class="pos-topbar-staff">Almacén: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-xl-flex">
          <span><span class="pos-kbd">F2</span> Buscar</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        ${
          currentSession.role === 'administrador'
            ? '<a href="/admin.html" class="pos-topbar-btn text-decoration-none">Dirección</a>'
            : ''
        }
        <button type="button" id="btn-open-audit" class="pos-topbar-btn">Bitácora</button>
        <button type="button" id="btn-almacen-logout" class="pos-topbar-btn">Cerrar sesión</button>
      </div>
    </header>

    <main class="pos-shell pos-no-print">
      <div id="alm-feedback-slot"></div>
      <div id="alm-practice-slot"></div>
      <div id="alm-pulse-slot"></div>

      <div class="pos-panel mb-2">
        <div class="pos-panel-body py-2">
          <div class="row g-2 align-items-center">
            <div class="col-12 col-md-7">
              <input
                id="alm-search-input"
                type="search"
                class="form-control"
                placeholder="Buscar por SKU, pedido, guía, proveedor o tienda aliada (F2)..."
                autocomplete="off"
              />
            </div>
            <div class="col-12 col-md-5 d-flex justify-content-md-end gap-2 flex-wrap" id="alm-top-actions"></div>
          </div>
        </div>
      </div>

      <div id="alm-workspace-slot"></div>
    </main>

    <div id="alm-modal-slot" class="pos-no-print"></div>
    <div id="alm-print-slot"></div>
  `;

  bindBrandLogo(root!);
}

function renderFeedback(): void {
  const slot = document.getElementById('alm-feedback-slot');
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
      <button type="button" class="btn-close btn-sm" id="btn-close-alm-feedback" aria-label="Cerrar aviso"></button>
    </div>
  `;
}

function renderPracticeBar(): void {
  const slot = document.getElementById('alm-practice-slot');
  if (!slot) return;
  if (local.uiMode !== 'practica') {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="pos-practice-bar">
      <div>
        <strong>Modo Práctica activo:</strong>
        <span>Comandos: <code>IO_ALMACEN.aprobarCompra()</code> · <code>IO_ALMACEN.simularPagoDespacho()</code> · <code>IO_ALMACEN.escanearSiguiente()</code> · <code>IO_ALMACEN.modo('operacion')</code></span>
      </div>
      <div class="d-flex gap-2">
        ${
          local.activeTab === 'despachos'
            ? '<button type="button" id="btn-sim-scan-dispatch" class="pos-btn-md pos-btn-primary">Simular escaneo SKU (F3)</button>'
            : ''
        }
        <button type="button" id="btn-reset-almacen" class="pos-btn-md pos-btn-secondary">Reiniciar almacén</button>
      </div>
    </div>
  `;
}

function renderPulseStrip(): void {
  const slot = document.getElementById('alm-pulse-slot');
  if (!slot) return;

  const readyToPack = whState.dispatches.filter(
    (d) => d.status === 'listo_empaque' || d.status === 'esperando_pago'
  ).length;
  const approvedPurchases = whState.purchases.filter((p) => p.status === 'aprobada').length;
  const pendingApproval = whState.purchases.filter((p) => p.status === 'pendiente_aprobacion').length;
  const activeLoans = whState.loans.filter((l) => l.status === 'en_consignacion');
  const overdueLoans = activeLoans.filter((l) => getDaysRemaining(l.fechaLimite) < 0).length;

  slot.innerHTML = `
    <div class="alm-pulse-strip">
      <button type="button" class="alm-pulse-btn ${local.activeTab === 'despachos' ? 'is-active' : ''}" data-nav-tab="despachos">
        <div>
          <div class="alm-pulse-label">Despachos (M03)</div>
          <div class="alm-pulse-sub">Por empacar / validar</div>
        </div>
        <div class="alm-pulse-count pos-num ${readyToPack > 0 ? 'is-warn' : ''}">${readyToPack}</div>
      </button>
      <button type="button" class="alm-pulse-btn ${local.activeTab === 'compras' ? 'is-active' : ''}" data-nav-tab="compras">
        <div>
          <div class="alm-pulse-label">Recepción de Compras (M04)</div>
          <div class="alm-pulse-sub">${approvedPurchases} aprobada(s) · ${pendingApproval} pendiente(s) Admin</div>
        </div>
        <div class="alm-pulse-count pos-num">${approvedPurchases}</div>
      </button>
      <button type="button" class="alm-pulse-btn ${local.activeTab === 'prestamos' ? 'is-active' : ''}" data-nav-tab="prestamos">
        <div>
          <div class="alm-pulse-label">Préstamos (M06)</div>
          <div class="alm-pulse-sub">${overdueLoans > 0 ? `${overdueLoans} plazo vencido` : 'En consignación'}</div>
        </div>
        <div class="alm-pulse-count pos-num ${overdueLoans > 0 ? 'is-err' : ''}">${activeLoans.length}</div>
      </button>
    </div>
  `;
}

function renderTopActions(): void {
  const slot = document.getElementById('alm-top-actions');
  if (!slot) return;

  if (local.activeTab === 'compras') {
    slot.innerHTML = `
      <span class="small pos-text-muted">Solo se recepcionan órdenes aprobadas previamente por el Administrador (RN-COM-03).</span>
      <button type="button" id="btn-open-supplier-modal" class="pos-btn-md pos-btn-secondary">
        + Registrar proveedor
      </button>
    `;
  } else if (local.activeTab === 'prestamos') {
    slot.innerHTML = `
      <button type="button" id="btn-open-loan-modal" class="pos-btn-md pos-btn-primary">
        + Nuevo préstamo / consignación
      </button>
    `;
  } else {
    slot.innerHTML = '<span class="small pos-text-muted">Solo pedidos con pago confirmado pasan a empaque (RN-ECO-01).</span>';
  }
}

function matchesSearch(haystack: string[]): boolean {
  const q = local.searchQuery.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => h.toLowerCase().includes(q));
}

function getDispatchStatusBadge(d: WarehouseDispatch): string {
  switch (d.status) {
    case 'esperando_pago':
      return '<span class="pos-stock-badge pos-stock-zero">Pago pendiente</span>';
    case 'listo_empaque':
      return '<span class="pos-status-chip is-pending">Listo para empaque</span>';
    case 'despachado':
      return '<span class="pos-status-chip is-partial">En ruta (Courier)</span>';
    case 'intento_1_fallido':
      return '<span class="pos-stock-badge pos-stock-low">Intento 1 fallido</span>';
    case 'entregado':
      return '<span class="pos-status-chip is-paid">Entregado</span>';
    case 'devuelto_almacen':
      return '<span class="pos-status-chip is-cancelled">Devuelto a almacén</span>';
  }
}

function renderDispatchesView(slot: HTMLElement): void {
  const filtered = whState.dispatches.filter((d) =>
    matchesSearch([
      d.id,
      d.pedidoRef,
      d.clienteNombre,
      d.trackingCode ?? '',
      ...d.items.map((i) => `${i.sku} ${i.nombre}`),
    ])
  );
  const selected =
    filtered.find((d) => d.id === local.selectedDispatchId) ?? filtered[0] ?? null;
  if (selected) local.selectedDispatchId = selected.id;

  slot.innerHTML = `
    <div class="alm-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Cola de Despachos</h2>
          <span class="small pos-text-muted pos-num">${filtered.length} pedidos</span>
        </div>
        <div class="pos-panel-body">
          <div class="alm-queue-list">
            ${
              filtered.length === 0
                ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">Sin pedidos coincidentes.</div>'
                : filtered
                    .map(
                      (d) => `
                  <button type="button" class="pos-queue-card ${selected?.id === d.id ? 'is-active' : ''}" data-select-dispatch="${escapeHtml(d.id)}">
                    <div class="d-flex justify-content-between align-items-center gap-1">
                      <span class="fw-bold pos-num">${escapeHtml(d.pedidoRef)}</span>
                      ${getDispatchStatusBadge(d)}
                    </div>
                    <div class="small fw-semibold">${escapeHtml(d.clienteNombre)} · ${escapeHtml(d.distrito)}</div>
                    <div class="d-flex justify-content-between small pos-text-muted pos-num">
                      <span>${d.items.reduce((a, i) => a + i.cantidad, 0)} prendas</span>
                      <span>${d.envioGratis ? 'Envío gratis' : `Flete ${formatPen(d.flete)}`}</span>
                    </div>
                  </button>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </section>

      <section class="pos-panel alm-detail-sticky">
        ${
          !selected
            ? '<div class="pos-panel-body p-4 text-center pos-text-muted">Selecciona un pedido para gestionar el empaque y envío.</div>'
            : renderDispatchDetail(selected)
        }
      </section>
    </div>
  `;
}

function renderDispatchDetail(d: WarehouseDispatch): string {
  const pendingItems = d.items.filter((i) => !i.verificado).length;

  return `
    <div class="pos-panel-header">
      <div>
        <h2 class="pos-panel-title pos-display">${escapeHtml(d.pedidoRef)} · ${escapeHtml(d.clienteNombre)}</h2>
        <div class="small pos-text-muted">${escapeHtml(d.canal)} · DNI ${escapeHtml(d.clienteDni)}</div>
      </div>
      ${getDispatchStatusBadge(d)}
    </div>
    <div class="pos-panel-body">
      <div class="pos-subbox mb-3">
        <div class="row g-1 small">
          <div class="col-12"><strong>Destino:</strong> ${escapeHtml(d.direccion)} (${escapeHtml(d.distrito)})</div>
          <div class="col-6"><strong>Subtotal:</strong> <span class="pos-num">${formatPen(d.subtotal)}</span></div>
          <div class="col-6"><strong>Flete (RN-ENV-04):</strong> ${d.envioGratis ? '<span class="pos-text-ok fw-semibold">Gratis (&gt; S/ 150)</span>' : `<span class="pos-num">${formatPen(d.flete)}</span>`}</div>
          ${
            d.trackingCode
              ? `<div class="col-12 mt-1"><strong>Tracking (RN-ENV-01):</strong> <code class="pos-sku-code">${escapeHtml(d.trackingCode)}</code> · ${escapeHtml(d.courier ?? '')}</div>`
              : ''
          }
        </div>
      </div>

      ${
        !d.pagoConfirmado
          ? `
            <div class="pos-banner is-err mb-3">
              <span>Bloqueado para picking/packing: el pago aún no ha sido confirmado (RN-ECO-01).</span>
              ${
                local.uiMode === 'practica'
                  ? `<button type="button" class="pos-btn-md pos-btn-primary" data-sim-pay-dispatch="${escapeHtml(d.id)}">Simular pago confirmado</button>`
                  : ''
              }
            </div>
          `
          : ''
      }

      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="small fw-bold text-uppercase pos-text-muted">Verificación física de prendas</span>
          <span class="small pos-num ${pendingItems === 0 ? 'pos-text-ok fw-semibold' : 'pos-text-warn fw-semibold'}">
            ${pendingItems === 0 ? 'Todo verificado' : `${pendingItems} pendiente(s)`}
          </span>
        </div>

        ${
          d.status === 'listo_empaque'
            ? `
              <div class="input-group input-group-sm mb-2">
                <input
                  id="alm-dispatch-sku-scan"
                  type="text"
                  class="form-control"
                  placeholder="Escanear o escribir SKU y presionar Enter..."
                  autocomplete="off"
                />
                <button type="button" id="btn-verify-dispatch-sku" class="pos-btn-md pos-btn-secondary">
                  Verificar SKU
                </button>
              </div>
            `
            : ''
        }

        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>SKU / Prenda</th>
                <th class="text-center">Cant.</th>
                <th class="text-end">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${d.items
                .map(
                  (it) => `
                <tr>
                  <td>
                    <span class="pos-sku-code me-1">${escapeHtml(it.sku)}</span>
                    <span class="fw-semibold">${escapeHtml(it.nombre)}</span>
                    <span class="small pos-text-muted">(${escapeHtml(it.talla)} · ${escapeHtml(it.color)})</span>
                  </td>
                  <td class="text-center fw-bold pos-num">${it.cantidad}</td>
                  <td class="text-end">
                    ${
                      it.verificado
                        ? '<span class="pos-verify-chip is-verified">Verificado</span>'
                        : d.pagoConfirmado && d.status === 'listo_empaque'
                          ? `<button type="button" class="pos-variant-pill" data-manual-verify-sku="${escapeHtml(it.sku)}">✓ Confirmar</button>`
                          : '<span class="pos-verify-chip is-unverified">Pendiente</span>'
                    }
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${local.actionError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.actionError)}</div>` : ''}

      ${
        d.status === 'listo_empaque'
          ? `
            <div class="pos-subbox pos-subbox--muted">
              <div class="row g-2 align-items-end">
                <div class="col-12 col-sm-6">
                  <label for="alm-courier-select" class="form-label small fw-semibold mb-1">Courier asignado</label>
                  <select id="alm-courier-select" class="form-select form-select-sm">
                    <option value="Olva / Urbano Express">Olva / Urbano Express</option>
                    <option value="Shalom Empresarial">Shalom Empresarial</option>
                    <option value="Reparto Propio Lima">Reparto Propio Lima</option>
                  </select>
                </div>
                <div class="col-12 col-sm-6">
                  <button type="button" id="btn-generate-guide" class="pos-btn-lg pos-btn-primary w-100">
                    Generar Guía de Envío (A4)
                  </button>
                </div>
              </div>
            </div>
          `
          : ''
      }

      ${
        d.status === 'despachado' || d.status === 'intento_1_fallido'
          ? `
            <div class="pos-subbox pos-subbox--muted mb-3">
              <div class="small fw-bold mb-2">Registrar entrega o intento (${d.intentos.length}/2 · RN-ENV-02 / RN-ENV-03)</div>
              <div class="row g-2 mb-2">
                <div class="col-7">
                  <input id="alm-rec-nombre" type="text" class="form-control form-control-sm" placeholder="Nombre y firma quien recibe" />
                </div>
                <div class="col-5">
                  <input id="alm-rec-dni" type="text" maxlength="8" class="form-control form-control-sm pos-num" placeholder="DNI (8 dígitos)" />
                </div>
                <div class="col-12">
                  <input id="alm-rec-obs" type="text" class="form-control form-control-sm" placeholder="Observación (opcional o motivo de ausencia)" />
                </div>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <button type="button" id="btn-attempt-ok" class="pos-btn-md pos-btn-success flex-grow-1">
                  Confirmar entrega (Firma + DNI)
                </button>
                <button type="button" id="btn-attempt-fail" class="pos-btn-md pos-btn-warn">
                  Registrar intento fallido
                </button>
              </div>
            </div>
          `
          : ''
      }

      ${
        d.intentos.length > 0
          ? `
            <div class="pos-subbox mb-3">
              <div class="small fw-bold mb-1">Historial de intentos de entrega</div>
              ${d.intentos
                .map(
                  (att) => `
                <div class="small py-1 border-bottom">
                  <strong>Intento ${att.numero}:</strong>
                  ${att.resultado === 'entregado' ? `Entregado a ${escapeHtml(att.receptorNombre ?? '')} (DNI ${escapeHtml(att.receptorDni ?? '')})` : `Fallido (${escapeHtml(att.observacion ?? '')})`}
                </div>
              `
                )
                .join('')}
            </div>
          `
          : ''
      }

      ${
        d.trackingCode
          ? `<button type="button" class="pos-btn-md pos-btn-secondary w-100" data-print-doc="guia:${escapeHtml(d.id)}">
              Vista previa / Imprimir Guía en Hoja A4
            </button>`
          : ''
      }
    </div>
  `;
}

function getPurchaseStatusBadge(p: PurchaseOrder): string {
  switch (p.status) {
    case 'pendiente_aprobacion':
      return '<span class="pos-status-chip is-pending">Pendiente Admin</span>';
    case 'aprobada':
      return '<span class="pos-status-chip is-partial">Aprobada · Por recibir</span>';
    case 'rechazada':
      return '<span class="pos-status-chip is-cancelled">Rechazada</span>';
    case 'recibida_conforme':
      return '<span class="pos-status-chip is-paid">Recibida conforme</span>';
    case 'bloqueada_inconformidad':
      return '<span class="pos-stock-badge pos-stock-zero">Pago bloqueado (RN-COM-04)</span>';
  }
}

function renderPurchasesView(slot: HTMLElement): void {
  const filtered = whState.purchases.filter((p) =>
    matchesSearch([
      p.id,
      p.proveedorNombre,
      p.proveedorRuc,
      p.guiaRemision ?? '',
      ...p.items.map((i) => `${i.sku} ${i.nombre}`),
    ])
  );
  const selected =
    filtered.find((p) => p.id === local.selectedPurchaseId) ?? filtered[0] ?? null;
  if (selected) local.selectedPurchaseId = selected.id;

  slot.innerHTML = `
    <div class="alm-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Órdenes de Compra</h2>
          <span class="small pos-text-muted pos-num">${filtered.length} órdenes</span>
        </div>
        <div class="pos-panel-body">
          <div class="alm-queue-list">
            ${
              filtered.length === 0
                ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">Sin órdenes coincidentes.</div>'
                : filtered
                    .map(
                      (p) => `
                  <button type="button" class="pos-queue-card ${selected?.id === p.id ? 'is-active' : ''}" data-select-purchase="${escapeHtml(p.id)}">
                    <div class="d-flex justify-content-between align-items-center gap-1">
                      <span class="fw-bold pos-num">${escapeHtml(p.id)}</span>
                      ${getPurchaseStatusBadge(p)}
                    </div>
                    <div class="small fw-semibold text-truncate">${escapeHtml(p.proveedorNombre)}</div>
                    <div class="d-flex justify-content-between small pos-text-muted pos-num">
                      <span>${p.items.reduce((a, i) => a + i.cantidadSolicitada, 0)} u.</span>
                      <span>${formatPen(p.totalEstimado)}</span>
                    </div>
                  </button>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </section>

      <section class="pos-panel alm-detail-sticky">
        ${
          !selected
            ? '<div class="pos-panel-body p-4 text-center pos-text-muted">Selecciona una orden de compra para revisar o recepcionar.</div>'
            : renderPurchaseDetail(selected)
        }
      </section>
    </div>
  `;
}

function renderPurchaseDetail(p: PurchaseOrder): string {
  return `
    <div class="pos-panel-header">
      <div>
        <h2 class="pos-panel-title pos-display">${escapeHtml(p.id)} · ${escapeHtml(p.proveedorNombre)}</h2>
        <div class="small pos-text-muted pos-num">RUC ${escapeHtml(p.proveedorRuc)} · Solicitado por ${escapeHtml(p.solicitadoPor)}</div>
      </div>
      ${getPurchaseStatusBadge(p)}
    </div>
    <div class="pos-panel-body">
      ${
        p.status === 'pendiente_aprobacion'
          ? `
            <div class="pos-banner is-warn mb-3">
              <span>Esperando aprobación del <strong>Administrador</strong> desde el Dashboard antes de autorizar ingreso físico.</span>
              ${
                local.uiMode === 'practica'
                  ? `<button type="button" class="pos-btn-md pos-btn-primary" data-sim-approve-purchase="${escapeHtml(p.id)}">Simular aprobación Admin</button>`
                  : ''
              }
            </div>
          `
          : ''
      }

      ${
        p.status === 'bloqueada_inconformidad'
          ? `
            <div class="pos-banner is-err mb-3">
              <span><strong>Pago bloqueado (RN-COM-04):</strong> ${escapeHtml(p.notaInconformidad ?? 'Inconformidad física')}</span>
            </div>
          `
          : ''
      }

      <div class="pos-subbox mb-3 small">
        <div class="row g-1">
          <div class="col-6"><strong>Aprobado por:</strong> ${escapeHtml(p.aprobadoPor ?? 'Pendiente')}</div>
          <div class="col-6"><strong>Guía Remisión:</strong> <span class="pos-num">${escapeHtml(p.guiaRemision ?? 'Sin registrar')}</span></div>
        </div>
      </div>

      <div class="table-responsive mb-3">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>SKU / Prenda</th>
              <th class="text-center">Solic.</th>
              <th class="text-center">Recibido</th>
              <th class="text-center">Dañado</th>
            </tr>
          </thead>
          <tbody>
            ${p.items
              .map(
                (it) => `
              <tr>
                <td>
                  <span class="pos-sku-code me-1">${escapeHtml(it.sku)}</span>
                  <span class="fw-semibold">${escapeHtml(it.nombre)}</span>
                  <span class="small pos-text-muted">(${escapeHtml(it.talla)} · ${escapeHtml(it.color)})</span>
                </td>
                <td class="text-center fw-bold pos-num">${it.cantidadSolicitada}</td>
                <td class="text-center pos-num">
                  ${
                    p.status === 'aprobada'
                      ? `<input type="number" min="0" class="form-control form-control-sm text-center pos-num" style="width:72px;margin:auto;" data-rec-sku="${escapeHtml(it.sku)}" value="${it.cantidadSolicitada}" />`
                      : it.cantidadRecibida
                  }
                </td>
                <td class="text-center pos-num">
                  ${
                    p.status === 'aprobada'
                      ? `<input type="number" min="0" class="form-control form-control-sm text-center pos-num" style="width:72px;margin:auto;" data-dan-sku="${escapeHtml(it.sku)}" value="0" />`
                      : it.cantidadDanada
                  }
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      ${local.actionError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.actionError)}</div>` : ''}

      ${
        p.status === 'aprobada'
          ? `
            <div class="pos-subbox pos-subbox--muted">
              <div class="small fw-bold mb-2">Control de calidad contra Guía de Remisión (RN-COM-03 / RN-COM-04)</div>
              <div class="row g-2 mb-2">
                <div class="col-5">
                  <input id="alm-guia-remision" type="text" class="form-control form-control-sm pos-num" placeholder="N.° Guía (ej. T001-00412)" />
                </div>
                <div class="col-7">
                  <input id="alm-compra-inconf" type="text" class="form-control form-control-sm" placeholder="Observación solo si hay faltantes o fallas..." />
                </div>
              </div>
              <button type="button" id="btn-receive-purchase" class="pos-btn-lg pos-btn-success w-100">
                Registrar recepción física
              </button>
            </div>
          `
          : ''
      }

      ${
        p.status === 'recibida_conforme' || p.status === 'bloqueada_inconformidad'
          ? `<button type="button" class="pos-btn-md pos-btn-secondary w-100" data-print-doc="acta_compra:${escapeHtml(p.id)}">
              Vista previa / Imprimir Acta de Recepción (Hoja A4)
            </button>`
          : ''
      }
    </div>
  `;
}

function renderLoansView(slot: HTMLElement): void {
  const filtered = whState.loans.filter((l) =>
    matchesSearch([
      l.id,
      l.constanciaCodigo,
      l.tiendaAliada,
      l.ruc,
      ...l.items.map((i) => `${i.sku} ${i.nombre}`),
    ])
  );
  const selected =
    filtered.find((l) => l.id === local.selectedLoanId) ?? filtered[0] ?? null;
  if (selected) local.selectedLoanId = selected.id;

  slot.innerHTML = `
    <div class="alm-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Préstamos en Consignación</h2>
          <span class="small pos-text-muted pos-num">${filtered.length} registros</span>
        </div>
        <div class="pos-panel-body">
          <div class="alm-queue-list">
            ${
              filtered.length === 0
                ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">Sin préstamos coincidentes.</div>'
                : filtered
                    .map((l) => {
                      const days = getDaysRemaining(l.fechaLimite);
                      let badge = '<span class="pos-status-chip is-paid">Cerrado</span>';
                      if (l.status === 'en_consignacion') {
                        badge =
                          days < 0
                            ? `<span class="pos-stock-badge pos-stock-zero pos-num">Vencido ${Math.abs(days)}d</span>`
                            : `<span class="pos-status-chip is-pending pos-num">Quedan ${days}d</span>`;
                      } else if (l.status === 'liquidado_caja') {
                        badge = '<span class="pos-status-chip is-partial">En Caja (Aliados)</span>';
                      }
                      return `
                        <button type="button" class="pos-queue-card ${selected?.id === l.id ? 'is-active' : ''}" data-select-loan="${escapeHtml(l.id)}">
                          <div class="d-flex justify-content-between align-items-center gap-1">
                            <span class="fw-bold pos-num">${escapeHtml(l.constanciaCodigo)}</span>
                            ${badge}
                          </div>
                          <div class="small fw-semibold text-truncate">${escapeHtml(l.tiendaAliada)}</div>
                          <div class="d-flex justify-content-between small pos-text-muted pos-num">
                            <span>${l.items.reduce((a, i) => a + i.cantidad, 0)} prendas</span>
                            <span>${formatPen(l.montoTotal)}</span>
                          </div>
                        </button>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      </section>

      <section class="pos-panel alm-detail-sticky">
        ${
          !selected
            ? '<div class="pos-panel-body p-4 text-center pos-text-muted">Selecciona un préstamo para emitir constancia o registrar cierre.</div>'
            : renderLoanDetail(selected)
        }
      </section>
    </div>
  `;
}

function renderLoanDetail(l: WarehouseLoan): string {
  const days = getDaysRemaining(l.fechaLimite);
  const isOverdue = l.status === 'en_consignacion' && days < 0;

  return `
    <div class="pos-panel-header">
      <div>
        <h2 class="pos-panel-title pos-display">${escapeHtml(l.constanciaCodigo)} · ${escapeHtml(l.tiendaAliada)}</h2>
        <div class="small pos-text-muted pos-num">RUC ${escapeHtml(l.ruc)} · ${escapeHtml(l.contacto)}</div>
      </div>
      <span class="pos-status-chip ${l.status === 'devuelto' ? 'is-paid' : l.status === 'liquidado_caja' ? 'is-partial' : isOverdue ? 'is-partial' : 'is-pending'}">
        ${l.status === 'devuelto' ? 'Devuelto' : l.status === 'liquidado_caja' ? 'Liquidado en Caja' : isOverdue ? `Vencido (${Math.abs(days)}d)` : `En consignación (${days}d)`}
      </span>
    </div>
    <div class="pos-panel-body">
      ${
        isOverdue
          ? '<div class="pos-banner is-warn mb-3"><span>Plazo máximo de 7 días vencido (RN-PRE-02). Registra la devolución física o liquida el saldo hacia Caja.</span></div>'
          : ''
      }

      <div class="pos-subbox mb-3 small">
        <div class="row g-1">
          <div class="col-6"><strong>Emisión:</strong> <span class="pos-num">${new Date(l.fechaEmision).toLocaleDateString('es-PE')}</span></div>
          <div class="col-6"><strong>Fecha límite (7d):</strong> <span class="pos-num">${new Date(l.fechaLimite).toLocaleDateString('es-PE')}</span></div>
          <div class="col-12"><strong>Autorización:</strong> ${escapeHtml(l.autorizadoPor)}</div>
          ${l.observacion ? `<div class="col-12"><strong>Motivo:</strong> ${escapeHtml(l.observacion)}</div>` : ''}
        </div>
      </div>

      <div class="table-responsive mb-3">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>SKU / Prenda</th>
              <th class="text-center">Cant.</th>
              <th class="text-end">Valor Ref.</th>
            </tr>
          </thead>
          <tbody>
            ${l.items
              .map(
                (it) => `
              <tr>
                <td>
                  <span class="pos-sku-code me-1">${escapeHtml(it.sku)}</span>
                  <span class="fw-semibold">${escapeHtml(it.nombre)}</span>
                  <span class="small pos-text-muted">(${escapeHtml(it.talla)} · ${escapeHtml(it.color)})</span>
                </td>
                <td class="text-center fw-bold pos-num">${it.cantidad}</td>
                <td class="text-end pos-num">${formatPen(it.precioReferencia * it.cantidad)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      ${local.actionError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.actionError)}</div>` : ''}

      <div class="d-flex flex-column gap-2">
        <button type="button" class="pos-btn-md pos-btn-secondary w-100" data-print-doc="constancia_prestamo:${escapeHtml(l.id)}">
          Vista previa / Imprimir Constancia Formal (Hoja A4)
        </button>

        ${
          l.status === 'en_consignacion'
            ? `
              <div class="pos-subbox pos-subbox--muted mt-1">
                <label for="alm-loan-close-note" class="form-label small fw-semibold mb-1">Nota de cierre (devolución o venta en tienda aliada)</label>
                <input id="alm-loan-close-note" type="text" class="form-control form-control-sm mb-2" placeholder="Ej. Prendas devueltas en perfecto estado / Vendidas en feria" />
                <div class="d-flex gap-2 flex-wrap">
                  <button type="button" id="btn-loan-return" class="pos-btn-md pos-btn-success flex-grow-1">
                    Registrar devolución (RN-PRE-04)
                  </button>
                  <button type="button" id="btn-loan-liquidate" class="pos-btn-md pos-btn-primary flex-grow-1">
                    Liquidar a Caja → Aliados (RN-PRE-05)
                  </button>
                </div>
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;
}

function renderWorkspace(): void {
  const slot = document.getElementById('alm-workspace-slot');
  if (!slot) return;

  if (local.activeTab === 'despachos') {
    renderDispatchesView(slot);
  } else if (local.activeTab === 'compras') {
    renderPurchasesView(slot);
  } else {
    renderLoansView(slot);
  }
}

function renderModals(): void {
  const slot = document.getElementById('alm-modal-slot');
  if (!slot) return;

  if (local.isLoanModalOpen) {
    const inv = getInventoryList(posState).filter((i) => i.stock > 0);
    slot.innerHTML = `
      <div class="pos-modal-backdrop" id="alm-modal-backdrop">
        <div class="pos-modal-card" style="max-width:580px;" role="dialog" aria-modal="true">
          <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h2 class="h5 pos-display mb-0">Nuevo Préstamo en Consignación (M06)</h2>
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-alm-modal">Cerrar</button>
          </div>
          <form id="form-new-loan" class="d-flex flex-column gap-2">
            <div>
              <label for="loan-tienda" class="form-label small fw-semibold mb-1">Tienda aliada / Razón social *</label>
              <input id="loan-tienda" type="text" class="form-control form-control-sm" required placeholder="Ej. Boutique San Isidro S.A.C." />
            </div>
            <div class="row g-2">
              <div class="col-5">
                <label for="loan-ruc" class="form-label small fw-semibold mb-1">RUC (11 dígitos) *</label>
                <input id="loan-ruc" type="text" maxlength="11" class="form-control form-control-sm pos-num" required placeholder="20601234567" />
              </div>
              <div class="col-7">
                <label for="loan-contacto" class="form-label small fw-semibold mb-1">Contacto / Teléfono</label>
                <input id="loan-contacto" type="text" class="form-control form-control-sm" placeholder="Nombre y celular" />
              </div>
            </div>
            <div class="row g-2">
              <div class="col-8">
                <label for="loan-sku" class="form-label small fw-semibold mb-1">Prenda (SKU) *</label>
                <select id="loan-sku" class="form-select form-select-sm">
                  ${inv
                    .map(
                      (i) =>
                        `<option value="${escapeHtml(i.sku)}">${escapeHtml(i.sku)} · ${escapeHtml(i.nombre)} (${escapeHtml(i.talla)} / ${escapeHtml(i.color)}) [Disp: ${i.stock}]</option>`
                    )
                    .join('')}
                </select>
              </div>
              <div class="col-4">
                <label for="loan-qty" class="form-label small fw-semibold mb-1">Cant. *</label>
                <input id="loan-qty" type="number" min="1" value="2" class="form-control form-control-sm pos-num" required />
              </div>
            </div>
            <div class="row g-2 align-items-center">
              <div class="col-4">
                <label for="loan-days" class="form-label small fw-semibold mb-1">Plazo (1–7 días · RN-PRE-02)</label>
                <input id="loan-days" type="number" min="1" max="7" value="7" class="form-control form-control-sm pos-num" required />
              </div>
              <div class="col-8">
                <div class="pos-subbox pos-subbox--muted mt-3">
                  <div class="form-check mb-0">
                    <input class="form-check-input" type="checkbox" id="loan-gerente-ok" />
                    <label class="form-check-label small fw-semibold" for="loan-gerente-ok">
                      ¿Gerente / Dueño disponible? (Si no se marca, el Almacenero emite Constancia Formal · RN-PRE-01)
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label for="loan-obs" class="form-label small fw-semibold mb-1">Observación</label>
              <input id="loan-obs" type="text" class="form-control form-control-sm" placeholder="Motivo del préstamo o evento" />
            </div>
            ${local.modalError ? `<div class="pos-inline-error">${escapeHtml(local.modalError)}</div>` : ''}
            <div class="d-flex justify-content-end gap-2 mt-2">
              <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-cancel-alm-modal">Cancelar</button>
              <button type="submit" class="pos-btn-md pos-btn-primary">Emitir Constancia y Descontar Stock</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (local.isSupplierModalOpen) {
    slot.innerHTML = `
      <div class="pos-modal-backdrop" id="alm-modal-backdrop">
        <div class="pos-modal-card" style="max-width:520px;" role="dialog" aria-modal="true">
          <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h2 class="h5 pos-display mb-0">Registrar Proveedor (M04)</h2>
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-alm-modal">Cerrar</button>
          </div>
          <p class="small pos-text-muted mb-2">
            El proveedor quedará en estado <strong>Pendiente de validación</strong> hasta ser habilitado por Dirección en el Dashboard.
          </p>
          <form id="form-new-supplier" class="d-flex flex-column gap-2">
            <div class="row g-2">
              <div class="col-5">
                <label for="sup-ruc" class="form-label small fw-semibold mb-1">RUC (11 dígitos) *</label>
                <input id="sup-ruc" type="text" maxlength="11" class="form-control form-control-sm pos-num" required placeholder="20601984512" />
              </div>
              <div class="col-7">
                <label for="sup-razon" class="form-label small fw-semibold mb-1">Razón social *</label>
                <input id="sup-razon" type="text" class="form-control form-control-sm" required placeholder="Ej. Tejidos Lima Sur SAC" />
              </div>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <label for="sup-contacto" class="form-label small fw-semibold mb-1">Contacto</label>
                <input id="sup-contacto" type="text" class="form-control form-control-sm" placeholder="Nombre del asesor" />
              </div>
              <div class="col-6">
                <label for="sup-telefono" class="form-label small fw-semibold mb-1">Teléfono</label>
                <input id="sup-telefono" type="text" class="form-control form-control-sm pos-num" placeholder="987654321" />
              </div>
            </div>
            <div>
              <label for="sup-rubro" class="form-label small fw-semibold mb-1">Rubro / Especialidad</label>
              <input id="sup-rubro" type="text" class="form-control form-control-sm" placeholder="Ej. Algodón Pima, sastrería, calzado" />
            </div>
            ${local.modalError ? `<div class="pos-inline-error">${escapeHtml(local.modalError)}</div>` : ''}
            <div class="d-flex justify-content-end gap-2 mt-2">
              <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-cancel-alm-modal">Cancelar</button>
              <button type="submit" class="pos-btn-md pos-btn-primary">Enviar a validación de Dirección</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (local.isAuditModalOpen) {
    slot.innerHTML = `
      <div class="pos-modal-backdrop" id="alm-modal-backdrop">
        <div class="pos-modal-card" style="max-width:780px;" role="dialog" aria-modal="true">
          <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h2 class="h5 pos-display mb-0">Bitácora de Auditoría de Almacén (RN-SEG-03)</h2>
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-alm-modal">Cerrar</button>
          </div>
          <div class="table-responsive" style="max-height:420px;">
            <table class="table table-sm small pos-num mb-0">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Usuario</th>
                  <th>Módulo</th>
                  <th>Regla</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                ${whState.auditLog
                  .map(
                    (a) => `
                  <tr>
                    <td>${new Date(a.fecha).toLocaleString('es-PE')}</td>
                    <td>${escapeHtml(a.usuario)}</td>
                    <td>${escapeHtml(a.modulo)}</td>
                    <td><code>${escapeHtml(a.regla)}</code></td>
                    <td>${escapeHtml(a.detalle)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    return;
  }

  slot.innerHTML = '';
}

function renderPrintModal(): void {
  const slot = document.getElementById('alm-print-slot');
  if (!slot) return;
  if (!local.printDoc) {
    slot.innerHTML = '';
    return;
  }

  let docTitle = '';
  let docCode = '';
  let metaHtml = '';
  let rowsHtml = '';
  let footerNote = '';
  let sigLeft = '';
  let sigRight = '';

  if (local.printDoc.kind === 'guia') {
    const d = whState.dispatches.find((x) => x.id === local.printDoc?.id);
    if (!d) {
      slot.innerHTML = '';
      return;
    }
    docTitle = 'GUÍA DE ENVÍO COURIER (A4)';
    docCode = d.trackingCode ?? d.id;
    metaHtml = `
      <div><strong>Pedido:</strong> ${escapeHtml(d.pedidoRef)}</div>
      <div><strong>Courier:</strong> ${escapeHtml(d.courier ?? 'Olva / Urbano')}</div>
      <div><strong>Destinatario:</strong> ${escapeHtml(d.clienteNombre)} (DNI ${escapeHtml(d.clienteDni)})</div>
      <div><strong>Distrito:</strong> ${escapeHtml(d.distrito)}</div>
      <div style="grid-column: 1 / -1;"><strong>Dirección:</strong> ${escapeHtml(d.direccion)}</div>
    `;
    rowsHtml = d.items
      .map(
        (i) => `
      <tr>
        <td class="pos-num">${escapeHtml(i.sku)}</td>
        <td>${escapeHtml(i.nombre)}</td>
        <td>${escapeHtml(i.talla)} · ${escapeHtml(i.color)}</td>
        <td class="text-center pos-num">${i.cantidad}</td>
      </tr>
    `
      )
      .join('');
    footerNote = `Flete: ${d.envioGratis ? 'Envío gratuito (> S/ 150 · RN-ENV-04)' : formatPen(d.flete)}. Máximo 2 intentos de entrega con DNI y firma (RN-ENV-02 / RN-ENV-03).`;
    sigLeft = `Despachado por Almacén (${escapeHtml(currentSession.displayName)})`;
    sigRight = 'Firma y DNI del Receptor';
  } else if (local.printDoc.kind === 'constancia_prestamo') {
    const l = whState.loans.find((x) => x.id === local.printDoc?.id);
    if (!l) {
      slot.innerHTML = '';
      return;
    }
    docTitle = 'CONSTANCIA FORMAL DE PRÉSTAMO EN CONSIGNACIÓN';
    docCode = l.constanciaCodigo;
    metaHtml = `
      <div><strong>Tienda Aliada:</strong> ${escapeHtml(l.tiendaAliada)}</div>
      <div><strong>RUC:</strong> ${escapeHtml(l.ruc)}</div>
      <div><strong>Emisión:</strong> ${new Date(l.fechaEmision).toLocaleDateString('es-PE')}</div>
      <div><strong>Vencimiento (máx. 7d):</strong> ${new Date(l.fechaLimite).toLocaleDateString('es-PE')}</div>
      <div style="grid-column: 1 / -1;"><strong>Autorizado por:</strong> ${escapeHtml(l.autorizadoPor)}</div>
    `;
    rowsHtml = l.items
      .map(
        (i) => `
      <tr>
        <td class="pos-num">${escapeHtml(i.sku)}</td>
        <td>${escapeHtml(i.nombre)}</td>
        <td>${escapeHtml(i.talla)} · ${escapeHtml(i.color)}</td>
        <td class="text-center pos-num">${i.cantidad}</td>
      </tr>
    `
      )
      .join('');
    footerNote = `Monto referencial en consignación: ${formatPen(l.montoTotal)}. Emitida conforme a RN-PRE-01 y RN-PRE-02 (plazo máximo 7 días calendario).`;
    sigLeft = `Almacenero Emisor (${escapeHtml(currentSession.displayName)})`;
    sigRight = `Representante ${escapeHtml(l.tiendaAliada)}`;
  } else {
    const p = whState.purchases.find((x) => x.id === local.printDoc?.id);
    if (!p) {
      slot.innerHTML = '';
      return;
    }
    docTitle =
      p.status === 'bloqueada_inconformidad'
        ? 'ACTA DE INCONFORMIDAD Y BLOQUEO DE PAGO'
        : 'ACTA DE RECEPCIÓN CONFORME DE MERCADERÍA';
    docCode = p.id;
    metaHtml = `
      <div><strong>Proveedor:</strong> ${escapeHtml(p.proveedorNombre)}</div>
      <div><strong>RUC:</strong> ${escapeHtml(p.proveedorRuc)}</div>
      <div><strong>Guía Remisión:</strong> ${escapeHtml(p.guiaRemision ?? '-')}</div>
      <div><strong>Aprobado por:</strong> ${escapeHtml(p.aprobadoPor ?? '-')}</div>
    `;
    rowsHtml = p.items
      .map(
        (i) => `
      <tr>
        <td class="pos-num">${escapeHtml(i.sku)}</td>
        <td>${escapeHtml(i.nombre)} (${escapeHtml(i.talla)} · ${escapeHtml(i.color)})</td>
        <td class="text-center pos-num">Solic: ${i.cantidadSolicitada} / Rec: ${i.cantidadRecibida}</td>
        <td class="text-center pos-num">Dañado: ${i.cantidadDanada}</td>
      </tr>
    `
      )
      .join('');
    footerNote =
      p.status === 'bloqueada_inconformidad'
        ? `PAGO BLOQUEADO (RN-COM-04): ${p.notaInconformidad ?? ''}`
        : 'Recepción validada físicamente contra Guía de Remisión (RN-COM-03). Stock actualizado.';
    sigLeft = `Almacenero Receptor (${escapeHtml(currentSession.displayName)})`;
    sigRight = 'Transportista / Proveedor';
  }

  slot.innerHTML = `
    <div class="alm-doc-backdrop" id="alm-print-backdrop">
      <div class="alm-doc-toolbar pos-no-print">
        <span class="fw-semibold">Vista previa de impresión · Formato Hoja A4</span>
        <div class="d-flex gap-2">
          <button type="button" id="btn-alm-do-print" class="pos-btn-md pos-btn-primary">Imprimir Hoja A4</button>
          <button type="button" id="btn-alm-close-print" class="pos-btn-md pos-btn-secondary">Cerrar (Esc)</button>
        </div>
      </div>

      <article class="alm-a4-sheet">
        <div>
          <header class="alm-a4-header">
            <div>
              <div class="alm-a4-brand">I&amp;O MODA RETAIL S.A.C.</div>
              <div style="font-size: 9pt; color: #574c46;">RUC: 20609988771 · Almacén Central Lima</div>
            </div>
            <div class="alm-a4-doc-box">
              <div style="font-size: 8.5pt; font-weight: 700;">${escapeHtml(docTitle)}</div>
              <div class="pos-num" style="font-size: 12pt; font-weight: 800; margin-top: 2px;">${escapeHtml(docCode)}</div>
            </div>
          </header>

          <div class="alm-a4-grid">${metaHtml}</div>

          <table class="alm-a4-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Prenda</th>
                <th>Variante / Detalle</th>
                <th class="text-center">Cantidad</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div style="border: 1px solid #d6cec2; background: #faf7f2; padding: 8px 10px; font-size: 9pt;">
            ${escapeHtml(footerNote)}
          </div>
        </div>

        <footer class="alm-a4-signatures">
          <div class="alm-a4-sig-line">${sigLeft}</div>
          <div class="alm-a4-sig-line">${sigRight}</div>
        </footer>
      </article>
    </div>
  `;
}

function renderAll(): void {
  renderFeedback();
  renderPracticeBar();
  renderPulseStrip();
  renderTopActions();
  renderWorkspace();
  renderModals();
  renderPrintModal();
}

function bindEvents(): void {
  const searchInput = document.getElementById('alm-search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    local.searchQuery = searchInput.value;
    renderWorkspace();
  });

  document.getElementById('btn-almacen-logout')?.addEventListener('click', () => {
    logoutToAccess();
  });

  document.getElementById('btn-open-audit')?.addEventListener('click', () => {
    local.isAuditModalOpen = true;
    renderModals();
  });

  root!.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (target?.id === 'alm-dispatch-sku-scan' && ev.key === 'Enter') {
      ev.preventDefault();
      if (!local.selectedDispatchId) return;
      const res = verifyDispatchSku(local.selectedDispatchId, target.value);
      if (!res.ok) {
        local.actionError = res.error;
        renderWorkspace();
        return;
      }
      whState = loadWarehouseState();
      local.actionError = '';
      playBeep(960, 0.08);
      local.feedback = { kind: 'ok', text: `SKU ${res.sku} verificado para empaque.` };
      renderAll();
    }
  });

  root!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('#btn-close-alm-feedback')) {
      local.feedback = null;
      renderFeedback();
      return;
    }

    const navBtn = target.closest<HTMLElement>('[data-nav-tab]');
    if (navBtn?.dataset.navTab) {
      local.activeTab = navBtn.dataset.navTab as WarehouseTab;
      local.actionError = '';
      renderAll();
      return;
    }

    const selDisp = target.closest<HTMLElement>('[data-select-dispatch]');
    if (selDisp?.dataset.selectDispatch) {
      local.selectedDispatchId = selDisp.dataset.selectDispatch;
      local.actionError = '';
      renderWorkspace();
      return;
    }

    const selPur = target.closest<HTMLElement>('[data-select-purchase]');
    if (selPur?.dataset.selectPurchase) {
      local.selectedPurchaseId = selPur.dataset.selectPurchase;
      local.actionError = '';
      renderWorkspace();
      return;
    }

    const selLoan = target.closest<HTMLElement>('[data-select-loan]');
    if (selLoan?.dataset.selectLoan) {
      local.selectedLoanId = selLoan.dataset.selectLoan;
      local.actionError = '';
      renderWorkspace();
      return;
    }

    if (target.closest('#btn-verify-dispatch-sku')) {
      const inp = document.getElementById('alm-dispatch-sku-scan') as HTMLInputElement | null;
      if (inp && local.selectedDispatchId) {
        const res = verifyDispatchSku(local.selectedDispatchId, inp.value);
        if (!res.ok) {
          local.actionError = res.error;
          renderWorkspace();
          return;
        }
        whState = loadWarehouseState();
        local.actionError = '';
        playBeep(960, 0.08);
        local.feedback = { kind: 'ok', text: `SKU ${res.sku} verificado.` };
        renderAll();
      }
      return;
    }

    const manVer = target.closest<HTMLElement>('[data-manual-verify-sku]');
    if (manVer?.dataset.manualVerifySku && local.selectedDispatchId) {
      const res = verifyDispatchSku(local.selectedDispatchId, manVer.dataset.manualVerifySku);
      if (res.ok) {
        whState = loadWarehouseState();
        local.actionError = '';
        renderAll();
      } else {
        local.actionError = res.error;
        renderWorkspace();
      }
      return;
    }

    if (target.closest('#btn-sim-scan-dispatch') && local.selectedDispatchId) {
      const res = verifyNextDispatchItem(local.selectedDispatchId);
      if (res.ok) {
        whState = loadWarehouseState();
        local.actionError = '';
        playBeep(960, 0.08);
        local.feedback = { kind: 'ok', text: `Escáner verificó SKU ${res.sku}.` };
        renderAll();
      } else {
        local.feedback = { kind: 'warn', text: res.error };
        renderFeedback();
      }
      return;
    }

    const simPayBtn = target.closest<HTMLElement>('[data-sim-pay-dispatch]');
    if (simPayBtn?.dataset.simPayDispatch) {
      const res = confirmDispatchPaymentSim(simPayBtn.dataset.simPayDispatch, currentSession.displayName);
      if (res.ok) {
        whState = loadWarehouseState();
        local.actionError = '';
        local.feedback = { kind: 'ok', text: `Pago confirmado para ${res.dispatch.pedidoRef}.` };
        renderAll();
      }
      return;
    }

    if (target.closest('#btn-generate-guide') && local.selectedDispatchId) {
      const courierEl = document.getElementById('alm-courier-select') as HTMLSelectElement | null;
      const res = generateDispatchGuide(
        local.selectedDispatchId,
        courierEl?.value ?? 'Olva / Urbano Express',
        currentSession.displayName
      );
      if (!res.ok) {
        local.actionError = res.error;
        renderWorkspace();
        return;
      }
      whState = loadWarehouseState();
      local.actionError = '';
      local.feedback = {
        kind: 'ok',
        text: `Guía ${res.dispatch.trackingCode} generada para ${res.dispatch.pedidoRef}.`,
      };
      renderAll();
      return;
    }

    if (target.closest('#btn-attempt-ok') && local.selectedDispatchId) {
      const nom = (document.getElementById('alm-rec-nombre') as HTMLInputElement | null)?.value ?? '';
      const dni = (document.getElementById('alm-rec-dni') as HTMLInputElement | null)?.value ?? '';
      const obs = (document.getElementById('alm-rec-obs') as HTMLInputElement | null)?.value ?? '';
      const res = recordDeliveryAttempt({
        dispatchId: local.selectedDispatchId,
        resultado: 'entregado',
        receptorNombre: nom,
        receptorDni: dni,
        observacion: obs,
        usuario: currentSession.displayName,
      });
      if (!res.ok) {
        local.actionError = res.error;
        renderWorkspace();
        return;
      }
      whState = loadWarehouseState();
      local.actionError = '';
      local.feedback = { kind: 'ok', text: `Entrega confirmada para ${res.dispatch.pedidoRef}.` };
      renderAll();
      return;
    }

    if (target.closest('#btn-attempt-fail') && local.selectedDispatchId) {
      const obs = (document.getElementById('alm-rec-obs') as HTMLInputElement | null)?.value ?? '';
      const res = recordDeliveryAttempt({
        dispatchId: local.selectedDispatchId,
        resultado: 'fallido',
        observacion: obs,
        usuario: currentSession.displayName,
      });
      if (!res.ok) {
        local.actionError = res.error;
        renderWorkspace();
        return;
      }
      whState = loadWarehouseState();
      local.actionError = '';
      local.feedback = {
        kind: 'warn',
        text:
          res.dispatch.status === 'devuelto_almacen'
            ? `Segundo intento fallido: ${res.dispatch.pedidoRef} retornado a almacén (RN-ENV-03).`
            : `Intento 1 fallido registrado en ${res.dispatch.pedidoRef}.`,
      };
      renderAll();
      return;
    }

    const simAppPur = target.closest<HTMLElement>('[data-sim-approve-purchase]');
    if (simAppPur?.dataset.simApprovePurchase) {
      const res = approvePurchaseOrder(simAppPur.dataset.simApprovePurchase);
      if (res.ok) {
        whState = loadWarehouseState();
        local.actionError = '';
        local.feedback = {
          kind: 'ok',
          text: `Orden ${res.purchase.id} aprobada por Administrador.`,
        };
        renderAll();
      }
      return;
    }

    if (target.closest('#btn-receive-purchase') && local.selectedPurchaseId) {
      const guia = (document.getElementById('alm-guia-remision') as HTMLInputElement | null)?.value ?? '';
      const nota = (document.getElementById('alm-compra-inconf') as HTMLInputElement | null)?.value ?? '';
      const recInputs = Array.from(root!.querySelectorAll<HTMLInputElement>('[data-rec-sku]'));
      const itemsResult = recInputs.map((inp) => {
        const sku = inp.dataset.recSku ?? '';
        const danEl = root!.querySelector<HTMLInputElement>(`[data-dan-sku="${sku}"]`);
        return {
          sku,
          cantidadRecibida: Number(inp.value ?? 0),
          cantidadDanada: Number(danEl?.value ?? 0),
        };
      });

      const res = receivePurchaseOrder({
        purchaseId: local.selectedPurchaseId,
        guiaRemision: guia,
        itemsResult,
        notaInconformidad: nota,
        usuario: currentSession.displayName,
      });
      if (!res.ok) {
        local.actionError = res.error;
        renderWorkspace();
        return;
      }
      whState = loadWarehouseState();
      posState = loadPosState();
      local.actionError = '';
      local.feedback = {
        kind: res.purchase.pagoBloqueado ? 'warn' : 'ok',
        text: res.purchase.pagoBloqueado
          ? `Recepción ${res.purchase.id} bloqueada para pago por inconformidad (RN-COM-04).`
          : `Recepción conforme de ${res.purchase.id}. Stock incrementado.`,
      };
      renderAll();
      return;
    }

    if (target.closest('#btn-loan-return') && local.selectedLoanId) {
      const nota = (document.getElementById('alm-loan-close-note') as HTMLInputElement | null)?.value ?? '';
      const res = closeWarehouseLoan({
        loanId: local.selectedLoanId,
        resolution: 'devuelto',
        nota,
        usuario: currentSession.displayName,
      });
      if (res.ok) {
        whState = loadWarehouseState();
        posState = loadPosState();
        local.feedback = { kind: 'ok', text: `Devolución registrada para ${res.loan.constanciaCodigo}. Stock reingresado.` };
        renderAll();
      } else {
        local.actionError = res.error;
        renderWorkspace();
      }
      return;
    }

    if (target.closest('#btn-loan-liquidate') && local.selectedLoanId) {
      const nota = (document.getElementById('alm-loan-close-note') as HTMLInputElement | null)?.value ?? '';
      const res = closeWarehouseLoan({
        loanId: local.selectedLoanId,
        resolution: 'liquidado_caja',
        nota,
        usuario: currentSession.displayName,
      });
      if (res.ok) {
        whState = loadWarehouseState();
        local.feedback = {
          kind: 'ok',
          text: `${res.loan.constanciaCodigo} liquidado y enviado a Caja → Aliados (${res.loan.allyDebtId ?? ''}).`,
        };
        renderAll();
      } else {
        local.actionError = res.error;
        renderWorkspace();
      }
      return;
    }

    if (target.closest('#btn-open-loan-modal')) {
      local.isLoanModalOpen = true;
      local.modalError = '';
      renderModals();
      return;
    }

    if (target.closest('#btn-open-supplier-modal')) {
      local.isSupplierModalOpen = true;
      local.modalError = '';
      renderModals();
      return;
    }

    if (
      target.id === 'alm-modal-backdrop' ||
      target.closest('#btn-close-alm-modal') ||
      target.closest('#btn-cancel-alm-modal')
    ) {
      local.isLoanModalOpen = false;
      local.isSupplierModalOpen = false;
      local.isAuditModalOpen = false;
      local.modalError = '';
      renderModals();
      return;
    }

    const printBtn = target.closest<HTMLElement>('[data-print-doc]');
    if (printBtn?.dataset.printDoc) {
      const [kind, id] = printBtn.dataset.printDoc.split(':');
      if (kind && id) {
        local.printDoc = { kind: kind as WarehousePrintDoc['kind'], id };
        renderPrintModal();
      }
      return;
    }

    if (target.closest('#btn-alm-do-print')) {
      window.print();
      return;
    }

    if (target.id === 'alm-print-backdrop' || target.closest('#btn-alm-close-print')) {
      local.printDoc = null;
      renderPrintModal();
      return;
    }

    if (target.closest('#btn-reset-almacen')) {
      whState = resetWarehouseState();
      local.selectedDispatchId = whState.dispatches[0]?.id ?? null;
      local.selectedPurchaseId = whState.purchases[0]?.id ?? null;
      local.selectedLoanId = whState.loans[0]?.id ?? null;
      local.feedback = { kind: 'warn', text: 'Estado de Almacén reiniciado.' };
      renderAll();
    }
  });

  root!.addEventListener('submit', (ev) => {
    const form = ev.target as HTMLFormElement | null;
    if (!form) return;

    if (form.id === 'form-new-loan') {
      ev.preventDefault();
      const tienda = (document.getElementById('loan-tienda') as HTMLInputElement | null)?.value ?? '';
      const ruc = (document.getElementById('loan-ruc') as HTMLInputElement | null)?.value ?? '';
      const contacto = (document.getElementById('loan-contacto') as HTMLInputElement | null)?.value ?? '';
      const sku = (document.getElementById('loan-sku') as HTMLSelectElement | null)?.value ?? '';
      const qty = Number((document.getElementById('loan-qty') as HTMLInputElement | null)?.value ?? 0);
      const days = Number((document.getElementById('loan-days') as HTMLInputElement | null)?.value ?? 7);
      const gerenteOk = Boolean((document.getElementById('loan-gerente-ok') as HTMLInputElement | null)?.checked);
      const obs = (document.getElementById('loan-obs') as HTMLInputElement | null)?.value ?? '';

      const res = createWarehouseLoan({
        tiendaAliada: tienda,
        ruc,
        contacto,
        diasPlazo: days,
        gerenteDisponible: gerenteOk,
        sku,
        cantidad: qty,
        observacion: obs,
        usuario: currentSession.displayName,
      });
      if (!res.ok) {
        local.modalError = res.error;
        renderModals();
        return;
      }
      whState = loadWarehouseState();
      posState = loadPosState();
      local.isLoanModalOpen = false;
      local.modalError = '';
      local.activeTab = 'prestamos';
      local.selectedLoanId = res.loan.id;
      local.feedback = {
        kind: 'ok',
        text: `Constancia ${res.loan.constanciaCodigo} emitida. Stock descontado.`,
      };
      renderAll();
      return;
    }

    if (form.id === 'form-new-supplier') {
      ev.preventDefault();
      const ruc = (document.getElementById('sup-ruc') as HTMLInputElement | null)?.value ?? '';
      const razonSocial = (document.getElementById('sup-razon') as HTMLInputElement | null)?.value ?? '';
      const contacto = (document.getElementById('sup-contacto') as HTMLInputElement | null)?.value ?? '';
      const telefono = (document.getElementById('sup-telefono') as HTMLInputElement | null)?.value ?? '';
      const rubro = (document.getElementById('sup-rubro') as HTMLInputElement | null)?.value ?? '';

      const res = registerSupplier({
        ruc,
        razonSocial,
        contacto,
        telefono,
        rubro,
        usuario: currentSession.displayName,
      });
      if (!res.ok) {
        local.modalError = res.error;
        renderModals();
        return;
      }
      whState = loadWarehouseState();
      local.isSupplierModalOpen = false;
      local.modalError = '';
      local.feedback = {
        kind: 'ok',
        text: `Proveedor ${res.supplier.razonSocial} registrado y enviado a validación de Dirección.`,
      };
      renderAll();
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (ev.key === 'F3' && local.uiMode === 'practica' && local.activeTab === 'despachos' && local.selectedDispatchId) {
      ev.preventDefault();
      const res = verifyNextDispatchItem(local.selectedDispatchId);
      if (res.ok) {
        whState = loadWarehouseState();
        playBeep(960, 0.08);
        local.feedback = { kind: 'ok', text: `Escáner verificó SKU ${res.sku}.` };
        renderAll();
      }
    } else if (ev.key === 'Escape') {
      if (local.printDoc) {
        local.printDoc = null;
        renderPrintModal();
      } else if (local.isLoanModalOpen || local.isSupplierModalOpen || local.isAuditModalOpen) {
        local.isLoanModalOpen = false;
        local.isSupplierModalOpen = false;
        local.isAuditModalOpen = false;
        renderModals();
      } else if (local.feedback) {
        local.feedback = null;
        renderFeedback();
      }
    }
  });

  subscribeWarehouseEvents(() => {
    whState = loadWarehouseState();
    renderAll();
  });
  subscribePosMode((mode) => {
    local.uiMode = mode;
    renderAll();
  });
}

function buildConsoleApi(): WarehouseConsoleApi {
  return {
    modo(nuevoModo) {
      if (!nuevoModo) return local.uiMode;
      const next = setPosUiMode(nuevoModo);
      local.uiMode = next;
      renderAll();
      console.info(`[I&O Almacén] Modo cambiado a: ${next}`);
      return next;
    },
    ayuda() {
      console.info(
        [
          '=== I&O Almacén · Comandos de Consola ===',
          "IO_ALMACEN.modo('practica')         -> Activa simuladores y barra guía",
          "IO_ALMACEN.modo('operacion')        -> Vuelve al modo operativo limpio (100% real)",
          'IO_ALMACEN.aprobarCompra(id?)       -> Simula aprobación del Administrador',
          'IO_ALMACEN.simularPagoDespacho(id?) -> Simula pago confirmado en un pedido bloqueado',
          'IO_ALMACEN.escanearSiguiente(id?)   -> Simula escaneo de la siguiente prenda',
          'IO_ALMACEN.reiniciarAlmacen()       -> Reinicia datos de prueba de almacén',
        ].join('\n')
      );
    },
    estado() {
      whState = loadWarehouseState();
      return {
        modo: local.uiMode,
        despachos: whState.dispatches.length,
        compras: whState.purchases.length,
        prestamos: whState.loans.length,
      };
    },
    aprobarCompra(purchaseId, adminNombre) {
      const targetId =
        purchaseId ??
        whState.purchases.find((p) => p.status === 'pendiente_aprobacion')?.id;
      if (!targetId) return { ok: false, error: 'No hay compras pendientes de aprobación.' };
      const res = approvePurchaseOrder(targetId, adminNombre);
      if (res.ok) {
        whState = loadWarehouseState();
        renderAll();
      }
      return res;
    },
    simularPagoDespacho(dispatchId) {
      const targetId =
        dispatchId ?? whState.dispatches.find((d) => !d.pagoConfirmado)?.id;
      if (!targetId) return { ok: false, error: 'No hay despachos esperando pago.' };
      const res = confirmDispatchPaymentSim(targetId, currentSession.displayName);
      if (res.ok) {
        whState = loadWarehouseState();
        renderAll();
      }
      return res;
    },
    escanearSiguiente(dispatchId) {
      const targetId = dispatchId ?? local.selectedDispatchId;
      if (!targetId) return { ok: false, error: 'Sin despacho seleccionado.' };
      const res = verifyNextDispatchItem(targetId);
      if (res.ok) {
        whState = loadWarehouseState();
        renderAll();
      }
      return res;
    },
    reiniciarAlmacen() {
      whState = resetWarehouseState();
      renderAll();
      return { ok: true, message: 'Almacén reiniciado' };
    },
  };
}

window.IO_ALMACEN = buildConsoleApi();

renderStaticShell();
bindEvents();
renderAll();

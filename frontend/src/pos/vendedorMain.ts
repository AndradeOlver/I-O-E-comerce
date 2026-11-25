import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import { DemoSession, logoutToAccess, requireZoneRole } from '../auth/demoSession';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  calculateOrderTotals,
  createAndSendOrder,
  findAlternativesForSku,
  formatPen,
  formatTimeShort,
  getInventoryList,
  loadPosState,
  subscribePosEvents,
} from './posStore';
import { PosInventoryItem, PosStoreState } from './posTypes';

interface DraftLine {
  sku: string;
  cantidad: number;
}

interface VendedorLocalState {
  searchQuery: string;
  filterTalla: string;
  filterColor: string;
  onlyInStock: boolean;
  draftItems: DraftLine[];
  clienteReferencia: string;
  descuentoPct: number;
  descuentoAutorizado: boolean;
  alternativesForSku: string | null;
  discountError: string;
  orderError: string;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
}

const local: VendedorLocalState = {
  searchQuery: '',
  filterTalla: '',
  filterColor: '',
  onlyInStock: false,
  draftItems: [],
  clienteReferencia: '',
  descuentoPct: 0,
  descuentoAutorizado: false,
  alternativesForSku: null,
  discountError: '',
  orderError: '',
  feedback: null,
};

const activeSession = requireZoneRole('vendedor', '/pos-vendedor.html');
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let storeState: PosStoreState = loadPosState();

const root = document.getElementById('pos-vendedor-root');
if (!root) {
  throw new Error('No se encontró #pos-vendedor-root');
}

function getStockBadgeHtml(stock: number, stockMinimo: number): string {
  if (stock <= 0) {
    return '<span class="pos-stock-badge pos-stock-zero pos-num">Agotado · 0</span>';
  }
  if (stock <= stockMinimo) {
    return `<span class="pos-stock-badge pos-stock-low pos-num">Bajo · ${stock}</span>`;
  }
  return `<span class="pos-stock-badge pos-stock-ok pos-num">Normal · ${stock}</span>`;
}

function getFilteredInventory(): PosInventoryItem[] {
  const all = getInventoryList(storeState);
  const q = local.searchQuery.trim().toLowerCase();
  return all.filter((item) => {
    if (local.onlyInStock && item.stock <= 0) return false;
    if (local.filterTalla && item.talla !== local.filterTalla) return false;
    if (local.filterColor && item.color !== local.filterColor) return false;
    if (!q) return true;
    return (
      item.sku.toLowerCase().includes(q) ||
      item.nombre.toLowerCase().includes(q) ||
      item.marca.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q) ||
      item.talla.toLowerCase().includes(q)
    );
  });
}

function renderStaticShell(): void {
  const all = getInventoryList(storeState);
  const tallas = Array.from(new Set(all.map((i) => i.talla)));
  const colores = Array.from(new Set(all.map((i) => i.color))).sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  root!.innerHTML = `
    <header class="pos-topbar">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Mostrador Vendedor</h1>
        <span class="pos-topbar-staff">Turno: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
        <span id="pos-pending-counter" class="pos-counter-badge pos-num">0 en caja</span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-lg-flex">
          <span><span class="pos-kbd">F2</span> Buscar</span>
          <span><span class="pos-kbd">F4</span> Enviar</span>
          <span><span class="pos-kbd">F8</span> Limpiar</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        <button type="button" id="btn-pos-logout" class="pos-topbar-btn">
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="pos-shell">
      <div id="pos-vendedor-feedback"></div>

      <div class="pos-vendedor-grid">
        <section class="pos-panel">
          <div class="pos-panel-header">
            <h2 class="pos-panel-title pos-display">Consulta de Prendas</h2>
            <span id="pos-results-count" class="pos-text-muted fw-normal pos-num"></span>
          </div>
          <div class="pos-panel-body">
            <div class="row g-2 mb-2">
              <div class="col-12 col-md-5">
                <input
                  id="pos-search-input"
                  type="search"
                  class="form-control"
                  placeholder="SKU, prenda o marca (F2)..."
                  autocomplete="off"
                />
              </div>
              <div class="col-6 col-md-2">
                <select id="pos-filter-talla" class="form-select">
                  <option value="">Talla: Todas</option>
                  ${tallas.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
                </select>
              </div>
              <div class="col-6 col-md-3">
                <select id="pos-filter-color" class="form-select">
                  <option value="">Color: Todos</option>
                  ${colores.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
              <div class="col-12 col-md-2 d-flex align-items-center">
                <div class="form-check mb-0">
                  <input class="form-check-input" type="checkbox" id="pos-only-stock" />
                  <label class="form-check-label small fw-semibold" for="pos-only-stock">
                    Solo con stock
                  </label>
                </div>
              </div>
            </div>

            <div id="pos-alternatives-container"></div>
            <div id="pos-results-container"></div>
          </div>
        </section>

        <section class="pos-panel pos-order-sticky">
          <div class="pos-panel-header">
            <h2 class="pos-panel-title pos-display">Orden en Curso</h2>
            <button type="button" id="btn-clear-draft" class="pos-btn-md pos-btn-secondary">
              Limpiar (F8)
            </button>
          </div>
          <div class="pos-panel-body">
            <div class="mb-2">
              <label for="pos-cliente-ref" class="form-label small fw-semibold mb-1">
                Referencia del cliente (opcional)
              </label>
              <input
                id="pos-cliente-ref"
                type="text"
                class="form-control form-control-sm"
                placeholder="Ej. Cliente mostrador / Sr. Pérez"
                autocomplete="off"
              />
            </div>

            <div id="pos-draft-items" class="d-flex flex-column gap-2 mb-3"></div>

            <div class="border-top pt-2 mb-2">
              <div class="row g-2 align-items-center">
                <div class="col-5">
                  <label for="pos-descuento-pct" class="form-label small fw-semibold mb-0">
                    Descuento % (máx. 10%)
                  </label>
                </div>
                <div class="col-7">
                  <input
                    id="pos-descuento-pct"
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value="0"
                    class="form-control form-control-sm pos-num"
                  />
                </div>
              </div>
              <div id="pos-discount-auth-wrap" class="form-check mt-2 d-none">
                <input class="form-check-input" type="checkbox" id="pos-descuento-auth" />
                <label class="form-check-label small fw-semibold pos-text-err" for="pos-descuento-auth">
                  Descuento autorizado por Dueño / Administrador (RN-VEN-03)
                </label>
              </div>
              <div id="pos-discount-error"></div>
            </div>

            <div id="pos-draft-totals" class="border-top pt-2 mb-3"></div>
            <div id="pos-order-error" class="mb-2"></div>

            <button
              type="button"
              id="btn-send-to-caja"
              class="pos-btn-lg pos-btn-primary w-100"
            >
              Enviar a Caja (F4)
            </button>
          </div>
        </section>
      </div>

      <section class="pos-panel pos-sent-strip">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Órdenes Enviadas Hoy</h2>
          <span id="pos-sent-count" class="pos-text-muted fw-normal pos-num"></span>
        </div>
        <div id="pos-sent-strip" class="pos-panel-body"></div>
      </section>
    </main>
  `;

  bindBrandLogo(root!);
}

function renderFeedback(): void {
  const el = document.getElementById('pos-vendedor-feedback');
  if (!el) return;
  if (!local.feedback) {
    el.innerHTML = '';
    return;
  }
  const kindClass =
    local.feedback.kind === 'ok'
      ? 'is-ok'
      : local.feedback.kind === 'warn'
        ? 'is-warn'
        : 'is-err';
  el.innerHTML = `
    <div class="pos-banner ${kindClass}">
      <span>${escapeHtml(local.feedback.text)}</span>
      <button type="button" class="btn-close btn-sm" id="btn-close-feedback" aria-label="Cerrar aviso"></button>
    </div>
  `;
}

function renderInlineErrors(): void {
  const discountEl = document.getElementById('pos-discount-error');
  if (discountEl) {
    discountEl.innerHTML = local.discountError
      ? `<div class="pos-inline-error">${escapeHtml(local.discountError)}</div>`
      : '';
  }

  const orderEl = document.getElementById('pos-order-error');
  if (orderEl) {
    orderEl.innerHTML = local.orderError
      ? `<div class="pos-inline-error">${escapeHtml(local.orderError)}</div>`
      : '';
  }
}

function renderTopCounter(): void {
  const counter = document.getElementById('pos-pending-counter');
  if (!counter) return;
  const pendingCount = storeState.orders.filter((o) => o.status === 'pendiente_cobro').length;
  counter.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} en caja`;
}

function renderAlternatives(): void {
  const container = document.getElementById('pos-alternatives-container');
  if (!container) return;

  if (!local.alternativesForSku) {
    container.innerHTML = '';
    return;
  }

  const all = getInventoryList(storeState);
  const original = all.find((i) => i.sku === local.alternativesForSku);
  const alternatives = findAlternativesForSku(local.alternativesForSku, storeState);

  container.innerHTML = `
    <div class="pos-alt-box">
      <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
        <div>
          <span class="fw-bold">
            Prenda agotada: ${escapeHtml(original ? `${original.nombre} (${original.talla} · ${original.color})` : local.alternativesForSku)}
          </span>
          <div class="small pos-text-muted">
            Alternativas disponibles en tienda (RN-VEN-02):
          </div>
        </div>
        <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-alternatives">
          Cerrar alternativas
        </button>
      </div>
      ${
        alternatives.length === 0
          ? '<div class="small fw-semibold pos-text-err">Sin alternativas con stock disponible en esta categoría.</div>'
          : `<div class="d-flex flex-column gap-1">
              ${alternatives
                .map(
                  ({ motivo, item }) => `
                  <div class="pos-alt-item">
                    <div>
                      <span class="pos-status-chip is-cancelled me-1">${escapeHtml(motivo)}</span>
                      <span class="pos-sku-code me-1">${escapeHtml(item.sku)}</span>
                      <span class="fw-semibold">${escapeHtml(item.nombre)}</span>
                      <span class="pos-text-muted small">
                        · Talla <strong>${escapeHtml(item.talla)}</strong>
                        · ${escapeHtml(item.color)}
                      </span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      ${getStockBadgeHtml(item.stock, item.stock_minimo)}
                      <span class="fw-bold pos-num">${formatPen(item.precio_venta)}</span>
                      <button
                        type="button"
                        class="pos-btn-md pos-btn-primary"
                        data-add-sku="${escapeHtml(item.sku)}"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>`
      }
    </div>
  `;
}

function renderResults(): void {
  const container = document.getElementById('pos-results-container');
  const countEl = document.getElementById('pos-results-count');
  if (!container || !countEl) return;

  const items = getFilteredInventory();
  countEl.textContent = `${items.length} SKU${items.length === 1 ? '' : 's'}`;

  if (items.length === 0) {
    container.innerHTML =
      '<div class="pos-subbox p-4 text-center pos-text-muted">Sin prendas coincidentes para este filtro.</div>';
    return;
  }

  container.innerHTML = `
    <div class="pos-table-wrap">
      <table class="pos-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Prenda</th>
            <th>Talla</th>
            <th>Color</th>
            <th class="text-end">Precio</th>
            <th>Stock</th>
            <th class="text-end">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const inDraft = local.draftItems.find((d) => d.sku === item.sku)?.cantidad ?? 0;
              const remaining = Math.max(0, item.stock - inDraft);
              const isZero = item.stock <= 0;
              return `
                <tr class="${isZero ? 'pos-row-agotado' : ''}">
                  <td><span class="pos-sku-code">${escapeHtml(item.sku)}</span></td>
                  <td>
                    <div class="fw-semibold">${escapeHtml(item.nombre)}</div>
                    <div class="small pos-text-muted">${escapeHtml(item.marca)}</div>
                  </td>
                  <td><span class="fw-bold">${escapeHtml(item.talla)}</span></td>
                  <td>
                    <span class="pos-color-dot" style="background-color:${escapeHtml(item.colorHex)}"></span>
                    <span>${escapeHtml(item.color)}</span>
                  </td>
                  <td class="text-end fw-bold pos-num">${formatPen(item.precio_venta)}</td>
                  <td>${getStockBadgeHtml(item.stock, item.stock_minimo)}</td>
                  <td class="text-end">
                    ${
                      isZero
                        ? `<button type="button" class="pos-btn-md pos-btn-warn" data-show-alt="${escapeHtml(item.sku)}">Ver alternativas</button>`
                        : `<button type="button" class="pos-btn-md pos-btn-primary" data-add-sku="${escapeHtml(item.sku)}" ${remaining <= 0 ? 'disabled' : ''}>${inDraft > 0 ? `+1 (${inDraft})` : '+ Agregar'}</button>`
                    }
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDraft(): void {
  const itemsEl = document.getElementById('pos-draft-items');
  const totalsEl = document.getElementById('pos-draft-totals');
  const sendBtn = document.getElementById('btn-send-to-caja') as HTMLButtonElement | null;
  const authWrap = document.getElementById('pos-discount-auth-wrap');
  if (!itemsEl || !totalsEl || !sendBtn || !authWrap) return;

  if (local.descuentoPct > 0) {
    authWrap.classList.remove('d-none');
  } else {
    authWrap.classList.add('d-none');
  }

  const all = getInventoryList(storeState);
  const bySku = new Map(all.map((i) => [i.sku, i]));

  if (local.draftItems.length === 0) {
    itemsEl.innerHTML =
      '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small">Agrega prendas desde la lista izquierda para armar la orden.</div>';
    totalsEl.innerHTML = `
      <div class="d-flex justify-content-between fw-bold fs-5 pos-num">
        <span>Total</span>
        <span>S/ 0.00</span>
      </div>
    `;
    sendBtn.disabled = true;
    return;
  }

  const calcItems: { precio_unitario: number; cantidad: number }[] = [];
  itemsEl.innerHTML = local.draftItems
    .map((line) => {
      const item = bySku.get(line.sku);
      if (!item) return '';
      calcItems.push({ precio_unitario: item.precio_venta, cantidad: line.cantidad });
      const lineTotal = item.precio_venta * line.cantidad;
      const canInc = line.cantidad < item.stock;
      return `
        <div class="pos-order-line">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-semibold">${escapeHtml(item.nombre)}</div>
              <div class="small pos-text-muted">
                <span class="pos-sku-code">${escapeHtml(item.sku)}</span>
                · Talla ${escapeHtml(item.talla)} · ${escapeHtml(item.color)}
              </div>
            </div>
            <button type="button" class="pos-btn-md pos-btn-danger" data-remove-sku="${escapeHtml(item.sku)}" aria-label="Quitar ${escapeHtml(item.nombre)}">
              &times;
            </button>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-1">
              <button type="button" class="pos-qty-btn" data-dec-sku="${escapeHtml(item.sku)}">-</button>
              <span class="px-2 fw-bold pos-num">${line.cantidad}</span>
              <button type="button" class="pos-qty-btn" data-inc-sku="${escapeHtml(item.sku)}" ${canInc ? '' : 'disabled'}>+</button>
              <span class="small pos-text-muted ms-1 pos-num">(disp: ${item.stock})</span>
            </div>
            <span class="fw-bold pos-num">${formatPen(lineTotal)}</span>
          </div>
        </div>
      `;
    })
    .join('');

  const totals = calculateOrderTotals(calcItems, local.descuentoPct);
  totalsEl.innerHTML = `
    <div class="d-flex justify-content-between small pos-text-muted pos-num">
      <span>Subtotal</span>
      <span>${formatPen(totals.subtotalBruto)}</span>
    </div>
    ${
      totals.descuentoMonto > 0
        ? `<div class="d-flex justify-content-between small pos-text-err pos-num">
            <span>Descuento (${local.descuentoPct}%)</span>
            <span>- ${formatPen(totals.descuentoMonto)}</span>
          </div>`
        : ''
    }
    <div class="d-flex justify-content-between small pos-text-muted pos-num">
      <span>Op. Gravada + IGV (18%)</span>
      <span>${formatPen(totals.opGravada)} + ${formatPen(totals.igv)}</span>
    </div>
    <div class="d-flex justify-content-between fw-bold fs-5 mt-1 pos-num">
      <span>Total a cobrar</span>
      <span>${formatPen(totals.total)}</span>
    </div>
  `;

  sendBtn.disabled = false;
}

function renderSentOrders(): void {
  const strip = document.getElementById('pos-sent-strip');
  const countEl = document.getElementById('pos-sent-count');
  if (!strip || !countEl) return;

  countEl.textContent = `${storeState.orders.length} orden${storeState.orders.length === 1 ? '' : 'es'}`;

  if (storeState.orders.length === 0) {
    strip.innerHTML =
      '<div class="small pos-text-muted">Sin órdenes enviadas en esta jornada.</div>';
    return;
  }

  strip.innerHTML = `
    <div class="row g-2">
      ${storeState.orders
        .slice(0, 8)
        .map((order) => {
          let badge = '<span class="pos-status-chip is-pending">Pendiente en caja</span>';
          if (order.status === 'pendiente_cobro' && order.montoPagado > 0) {
            badge = `<span class="pos-status-chip is-partial pos-num">Abonado ${formatPen(order.montoPagado)} · Saldo ${formatPen(order.saldoPendiente)}</span>`;
          } else if (order.status === 'cobrado') {
            badge = `<span class="pos-status-chip is-paid pos-num">Cobrada · ${escapeHtml(order.numeroComprobante ?? '')}</span>`;
          } else if (order.status === 'cancelado') {
            badge = '<span class="pos-status-chip is-cancelled">Cancelada</span>';
          }
          return `
            <div class="col-12 col-md-6 col-xl-3">
              <div class="pos-sent-chip">
                <div>
                  <span class="fw-bold pos-num">${escapeHtml(order.id)}</span>
                  <span class="pos-text-muted ms-1 pos-num">${formatTimeShort(order.creadoEn)}</span>
                  <div class="text-truncate" style="max-width:170px;">${escapeHtml(order.clienteReferencia)}</div>
                </div>
                <div class="text-end">
                  <div class="fw-bold pos-num">${formatPen(order.total)}</div>
                  ${badge}
                </div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderDynamic(): void {
  renderFeedback();
  renderInlineErrors();
  renderTopCounter();
  renderAlternatives();
  renderResults();
  renderDraft();
  renderSentOrders();
}

function addSkuToDraft(sku: string): void {
  const all = getInventoryList(storeState);
  const item = all.find((i) => i.sku === sku);
  if (!item) return;

  if (item.stock <= 0) {
    local.alternativesForSku = sku;
    local.feedback = {
      kind: 'warn',
      text: `${sku} tiene stock 0. Selecciona una alternativa disponible o cierra si el cliente no acepta.`,
    };
    renderDynamic();
    return;
  }

  const existing = local.draftItems.find((d) => d.sku === sku);
  if (existing) {
    if (existing.cantidad >= item.stock) {
      local.orderError = `Stock máximo alcanzado para ${sku} (${item.stock} disponibles).`;
      renderDynamic();
      return;
    }
    existing.cantidad += 1;
  } else {
    local.draftItems.push({ sku, cantidad: 1 });
  }

  local.alternativesForSku = null;
  local.orderError = '';
  local.feedback = null;
  renderDynamic();
}

function clearDraft(): void {
  local.draftItems = [];
  local.clienteReferencia = '';
  local.descuentoPct = 0;
  local.descuentoAutorizado = false;
  local.alternativesForSku = null;
  local.discountError = '';
  local.orderError = '';

  const refInput = document.getElementById('pos-cliente-ref') as HTMLInputElement | null;
  const descInput = document.getElementById('pos-descuento-pct') as HTMLInputElement | null;
  const authInput = document.getElementById('pos-descuento-auth') as HTMLInputElement | null;
  if (refInput) refInput.value = '';
  if (descInput) descInput.value = '0';
  if (authInput) authInput.checked = false;
}

function handleSendOrder(): void {
  const result = createAndSendOrder({
    vendedorNombre: currentSession.displayName,
    clienteReferencia: local.clienteReferencia,
    items: local.draftItems,
    descuentoPct: local.descuentoPct,
    descuentoAutorizado: local.descuentoAutorizado,
  });

  if (!result.ok) {
    if (result.error.includes('RN-VEN-03')) {
      local.discountError = result.error;
      local.orderError = '';
    } else {
      local.orderError = result.error;
      local.discountError = '';
    }
    renderDynamic();
    return;
  }

  storeState = loadPosState();
  clearDraft();
  local.feedback = {
    kind: 'ok',
    text: `Orden ${result.order.id} enviada a caja · ${formatPen(result.order.total)}.`,
  };
  renderDynamic();
  (document.getElementById('pos-search-input') as HTMLInputElement | null)?.focus();
}

function bindEvents(): void {
  const searchInput = document.getElementById('pos-search-input') as HTMLInputElement;
  const tallaSelect = document.getElementById('pos-filter-talla') as HTMLSelectElement;
  const colorSelect = document.getElementById('pos-filter-color') as HTMLSelectElement;
  const onlyStockCheck = document.getElementById('pos-only-stock') as HTMLInputElement;
  const refInput = document.getElementById('pos-cliente-ref') as HTMLInputElement;
  const descInput = document.getElementById('pos-descuento-pct') as HTMLInputElement;
  const authInput = document.getElementById('pos-descuento-auth') as HTMLInputElement;

  searchInput.addEventListener('input', () => {
    local.searchQuery = searchInput.value;
    renderResults();
  });

  tallaSelect.addEventListener('change', () => {
    local.filterTalla = tallaSelect.value;
    renderResults();
  });

  colorSelect.addEventListener('change', () => {
    local.filterColor = colorSelect.value;
    renderResults();
  });

  onlyStockCheck.addEventListener('change', () => {
    local.onlyInStock = onlyStockCheck.checked;
    renderResults();
  });

  refInput.addEventListener('input', () => {
    local.clienteReferencia = refInput.value;
  });

  descInput.addEventListener('input', () => {
    const raw = Number(descInput.value);
    if (Number.isNaN(raw) || raw < 0) {
      local.descuentoPct = 0;
      descInput.value = '0';
      local.discountError = '';
    } else if (raw > 10) {
      local.descuentoPct = 10;
      descInput.value = '10';
      local.discountError = 'El descuento máximo en tienda es 10% (RN-VEN-03). Se ajustó al tope.';
    } else {
      local.descuentoPct = raw;
      local.discountError = '';
    }
    renderInlineErrors();
    renderDraft();
  });

  authInput.addEventListener('change', () => {
    local.descuentoAutorizado = authInput.checked;
    if (local.descuentoAutorizado) {
      local.discountError = '';
      renderInlineErrors();
    }
  });

  document.getElementById('btn-pos-logout')?.addEventListener('click', () => {
    logoutToAccess();
  });

  document.getElementById('btn-clear-draft')?.addEventListener('click', () => {
    clearDraft();
    local.feedback = null;
    renderDynamic();
  });

  document.getElementById('btn-send-to-caja')?.addEventListener('click', handleSendOrder);

  root!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const addBtn = target.closest<HTMLElement>('[data-add-sku]');
    if (addBtn?.dataset.addSku) {
      addSkuToDraft(addBtn.dataset.addSku);
      return;
    }

    const altBtn = target.closest<HTMLElement>('[data-show-alt]');
    if (altBtn?.dataset.showAlt) {
      local.alternativesForSku = altBtn.dataset.showAlt;
      renderAlternatives();
      return;
    }

    if (target.closest('#btn-close-alternatives')) {
      local.alternativesForSku = null;
      renderAlternatives();
      return;
    }

    if (target.closest('#btn-close-feedback')) {
      local.feedback = null;
      renderFeedback();
      return;
    }

    const incBtn = target.closest<HTMLElement>('[data-inc-sku]');
    if (incBtn?.dataset.incSku) {
      addSkuToDraft(incBtn.dataset.incSku);
      return;
    }

    const decBtn = target.closest<HTMLElement>('[data-dec-sku]');
    if (decBtn?.dataset.decSku) {
      const sku = decBtn.dataset.decSku;
      const line = local.draftItems.find((d) => d.sku === sku);
      if (line) {
        line.cantidad -= 1;
        if (line.cantidad <= 0) {
          local.draftItems = local.draftItems.filter((d) => d.sku !== sku);
        }
        renderDynamic();
      }
      return;
    }

    const remBtn = target.closest<HTMLElement>('[data-remove-sku]');
    if (remBtn?.dataset.removeSku) {
      const sku = remBtn.dataset.removeSku;
      local.draftItems = local.draftItems.filter((d) => d.sku !== sku);
      renderDynamic();
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (ev.key === 'F4') {
      ev.preventDefault();
      if (local.draftItems.length > 0) {
        handleSendOrder();
      }
    } else if (ev.key === 'F8') {
      ev.preventDefault();
      clearDraft();
      local.feedback = null;
      renderDynamic();
    } else if (ev.key === 'Escape') {
      if (local.alternativesForSku || local.feedback) {
        local.alternativesForSku = null;
        local.feedback = null;
        renderDynamic();
      }
    }
  });

  subscribePosEvents(() => {
    storeState = loadPosState();
    renderDynamic();
  });
}

renderStaticShell();
bindEvents();
renderDynamic();
(document.getElementById('pos-search-input') as HTMLInputElement | null)?.focus();

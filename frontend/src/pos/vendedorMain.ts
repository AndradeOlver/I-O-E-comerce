import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import { DemoSession, logoutToAccess, requireAnyZoneRole } from '../auth/demoSession';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  POS_PAYMENT_LABELS,
  calculateOrderTotals,
  cancelOrder,
  createAndSendOrder,
  emitSimulatedRejection,
  findAlternativesForSku,
  formatPen,
  formatTimeShort,
  getDailySummary,
  getInventoryList,
  loadPosState,
  pickRandomAvailableItem,
  recordPaymentOrAbono,
  resetPosDay,
  roundMoney,
  subscribePosEvents,
  updateOrderBilling,
} from './posStore';
import {
  PosInventoryItem,
  PosOrder,
  PosPaymentMethod,
  PosReceiptType,
  PosStoreState,
} from './posTypes';

interface DraftLine {
  sku: string;
  cantidad: number;
  verificado: boolean;
  origen: 'catalogo' | 'escaner';
}

interface ProductGroupEntry {
  groupId: string;
  nombre: string;
  marca: string;
  variants: PosInventoryItem[];
}

interface VendedorLocalState {
  searchQuery: string;
  filterTalla: string;
  filterColor: string;
  onlyInStock: boolean;
  selectedSkuByGroup: Record<string, string>;
  draftItems: DraftLine[];
  clienteReferencia: string;
  descuentoPct: number;
  descuentoAutorizado: boolean;
  tipoComprobante: PosReceiptType;
  clienteDoc: string;
  clienteRazonSocial: string;
  selectedMethod: PosPaymentMethod;
  cashReceivedStr: string;
  activeWaitingOrderId: string | null;
  lastCompletedOrderId: string | null;
  isCajaModalOpen: boolean;
  cajaTab: 'pendientes' | 'cobradas';
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
  selectedSkuByGroup: {},
  draftItems: [],
  clienteReferencia: '',
  descuentoPct: 0,
  descuentoAutorizado: false,
  tipoComprobante: 'boleta',
  clienteDoc: '',
  clienteRazonSocial: '',
  selectedMethod: 'efectivo',
  cashReceivedStr: '',
  activeWaitingOrderId: null,
  lastCompletedOrderId: null,
  isCajaModalOpen: false,
  cajaTab: 'pendientes',
  alternativesForSku: null,
  discountError: '',
  orderError: '',
  feedback: null,
};

const activeSession = requireAnyZoneRole(
  ['vendedor', 'cajero', 'administrador'],
  '/pos-vendedor.html'
);
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let storeState: PosStoreState = loadPosState();

const root = document.getElementById('pos-vendedor-root');
if (!root) {
  throw new Error('No se encontró #pos-vendedor-root');
}

function playBeep(freq = 880, duration = 0.1): void {
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
    // Sin audio disponible en este navegador
  }
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

function groupFilteredProducts(items: PosInventoryItem[]): ProductGroupEntry[] {
  const map = new Map<string, ProductGroupEntry>();
  for (const item of items) {
    let entry = map.get(item.groupId);
    if (!entry) {
      entry = {
        groupId: item.groupId,
        nombre: item.nombre,
        marca: item.marca,
        variants: [],
      };
      map.set(item.groupId, entry);
    }
    entry.variants.push(item);
  }
  return Array.from(map.values());
}

function resolveActiveVariant(group: ProductGroupEntry): PosInventoryItem {
  const q = local.searchQuery.trim().toLowerCase();
  if (q) {
    const exactSku = group.variants.find((v) => v.sku.toLowerCase() === q);
    if (exactSku) return exactSku;
    const partialSku = group.variants.find((v) => v.sku.toLowerCase().includes(q));
    if (partialSku) return partialSku;
  }

  const chosenSku = local.selectedSkuByGroup[group.groupId];
  if (chosenSku) {
    const found = group.variants.find((v) => v.sku === chosenSku);
    if (found) return found;
  }

  return group.variants.find((v) => v.stock > 0) ?? group.variants[0];
}

function renderThumbHtml(item: PosInventoryItem): string {
  const slot = IMAGE_SLOTS[item.imageSlotKey];
  const imgSrc = slot?.src?.trim() ?? '';
  const tint = escapeHtml(item.colorHex);

  const fallbackHtml = `
    <div
      class="pos-thumb-logo-fallback ${imgSrc ? 'd-none' : ''}"
      style="--garment-tint: ${tint}"
      data-pos-thumb-fallback
    >
      <img
        src="/img/brand/logo-io.png"
        alt="Logo I&O"
        class="pos-thumb-logo-img"
        data-pos-fallback-logo
      />
      <span class="pos-thumb-logo-monogram" data-pos-fallback-monogram hidden>I&amp;O</span>
    </div>
  `;

  if (!imgSrc) {
    return `<div class="pos-product-thumb">${fallbackHtml}</div>`;
  }

  return `
    <div class="pos-product-thumb">
      <img
        src="${escapeHtml(imgSrc)}"
        alt="${escapeHtml(item.alt_text || item.nombre)}"
        class="pos-product-thumb-img"
        loading="lazy"
        data-pos-thumb-img
      />
      ${fallbackHtml}
    </div>
  `;
}

function bindThumbFallbacks(scope: ParentNode): void {
  scope.querySelectorAll<HTMLImageElement>('img[data-pos-thumb-img]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        img.classList.add('d-none');
        const fallback = img.parentElement?.querySelector<HTMLElement>('[data-pos-thumb-fallback]');
        if (fallback) {
          fallback.classList.remove('d-none');
        }
      },
      { once: true }
    );
  });

  scope.querySelectorAll<HTMLImageElement>('img[data-pos-fallback-logo]').forEach((logoImg) => {
    logoImg.addEventListener(
      'error',
      () => {
        logoImg.classList.add('d-none');
        const monogram = logoImg.parentElement?.querySelector<HTMLElement>(
          '[data-pos-fallback-monogram]'
        );
        if (monogram) {
          monogram.hidden = false;
        }
      },
      { once: true }
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
    <header class="pos-topbar pos-no-print">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Mostrador I&amp;O</h1>
        <span class="pos-topbar-staff">Turno: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-xl-flex">
          <span><span class="pos-kbd">F2</span> Buscar</span>
          <span><span class="pos-kbd">F3</span> Escanear</span>
          <span><span class="pos-kbd">F4</span> Confirmar</span>
          <span><span class="pos-kbd">F6</span> Caja</span>
          <span><span class="pos-kbd">F8</span> Limpiar</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        <button type="button" id="btn-open-caja-modal" class="pos-topbar-btn">
          Caja
          <span id="pos-caja-btn-badge" class="pos-counter-badge pos-num d-none">0</span>
        </button>
        <button type="button" id="btn-pos-logout" class="pos-topbar-btn">
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="pos-shell">
      <div id="pos-vendedor-feedback" class="pos-no-print"></div>

      <div class="pos-vendedor-grid">
        <section class="pos-panel pos-no-print">
          <div class="pos-panel-header">
            <h2 class="pos-panel-title pos-display">Catálogo en Mostrador</h2>
            <span id="pos-results-count" class="pos-text-muted fw-normal pos-num"></span>
          </div>
          <div class="pos-panel-body">
            <div class="row g-2 mb-2">
              <div class="col-12 col-md-5">
                <input
                  id="pos-search-input"
                  type="search"
                  class="form-control"
                  placeholder="SKU, prenda o marca (F2 · Enter agrega SKU)..."
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

            <div class="pos-scanner-bar mb-2">
              <div class="small">
                <strong>¿Cliente ya trae la prenda?</strong>
                <span class="pos-text-muted">Detecta por SKU en el buscador o simula lectura con escáner.</span>
              </div>
              <button type="button" id="btn-scan-random" class="pos-btn-md pos-btn-primary">
                Escanear prenda (F3)
              </button>
            </div>

            <div id="pos-alternatives-container"></div>
            <div id="pos-results-container"></div>
          </div>
        </section>

        <section id="pos-right-panel" class="pos-panel pos-order-sticky"></section>
      </div>
    </main>

    <div id="pos-caja-modal-slot" class="pos-no-print"></div>
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

function renderTopCounter(): void {
  const badge = document.getElementById('pos-caja-btn-badge');
  if (!badge) return;
  const pendingCount = storeState.orders.filter((o) => o.status === 'pendiente_cobro').length;
  if (pendingCount > 0) {
    badge.textContent = `${pendingCount} pend.`;
    badge.classList.remove('d-none');
  } else {
    badge.textContent = '0';
    badge.classList.add('d-none');
  }
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

  const filteredItems = getFilteredInventory();
  const groups = groupFilteredProducts(filteredItems);
  countEl.textContent = `${groups.length} modelo${groups.length === 1 ? '' : 's'} · ${filteredItems.length} SKU${filteredItems.length === 1 ? '' : 's'}`;

  if (groups.length === 0) {
    container.innerHTML =
      '<div class="pos-subbox p-4 text-center pos-text-muted">Sin prendas coincidentes para este filtro.</div>';
    return;
  }

  container.innerHTML = `
    <div class="pos-table-wrap">
      <table class="pos-table">
        <thead>
          <tr>
            <th>Prenda</th>
            <th>Color</th>
            <th>Talla</th>
            <th class="text-end">Precio</th>
            <th>Stock</th>
            <th class="text-end">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${groups
            .map((group) => {
              const active = resolveActiveVariant(group);
              const inDraft = local.draftItems.find((d) => d.sku === active.sku)?.cantidad ?? 0;
              const remaining = Math.max(0, active.stock - inDraft);
              const isZero = active.stock <= 0;

              // Colores únicos dentro de las variantes filtradas de este modelo
              const uniqueColors: { color: string; colorHex: string; targetSku: string }[] = [];
              const seenColors = new Set<string>();
              for (const v of group.variants) {
                if (!seenColors.has(v.color)) {
                  seenColors.add(v.color);
                  const sameSize = group.variants.find(
                    (cand) => cand.color === v.color && cand.talla === active.talla
                  );
                  const withStock = group.variants.find(
                    (cand) => cand.color === v.color && cand.stock > 0
                  );
                  const target = sameSize ?? withStock ?? v;
                  uniqueColors.push({
                    color: v.color,
                    colorHex: v.colorHex,
                    targetSku: target.sku,
                  });
                }
              }

              // Tallas disponibles para el color activo
              const sizesForActiveColor = group.variants.filter((v) => v.color === active.color);

              return `
                <tr class="${isZero ? 'pos-row-agotado' : ''}">
                  <td>
                    <div class="pos-product-cell">
                      ${renderThumbHtml(active)}
                      <div class="min-w-0">
                        <div class="fw-semibold">${escapeHtml(group.nombre)}</div>
                        <div class="small pos-text-muted">${escapeHtml(group.marca)}</div>
                        <div class="pos-sku-code">${escapeHtml(active.sku)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="pos-variant-group">
                      ${uniqueColors
                        .map(
                          (c) => `
                          <button
                            type="button"
                            class="pos-variant-pill ${c.color === active.color ? 'is-active' : ''}"
                            data-select-group="${escapeHtml(group.groupId)}"
                            data-select-sku="${escapeHtml(c.targetSku)}"
                          >
                            <span class="pos-color-dot me-0" style="background-color:${escapeHtml(c.colorHex)}"></span>
                            <span>${escapeHtml(c.color)}</span>
                          </button>
                        `
                        )
                        .join('')}
                    </div>
                  </td>
                  <td>
                    <div class="pos-variant-group">
                      ${sizesForActiveColor
                        .map(
                          (v) => `
                          <button
                            type="button"
                            class="pos-variant-pill ${v.sku === active.sku ? 'is-active' : ''} ${v.stock <= 0 ? 'is-out' : ''}"
                            data-select-group="${escapeHtml(group.groupId)}"
                            data-select-sku="${escapeHtml(v.sku)}"
                            title="Stock: ${v.stock}"
                          >
                            ${escapeHtml(v.talla)}
                          </button>
                        `
                        )
                        .join('')}
                    </div>
                  </td>
                  <td class="text-end fw-bold pos-num">${formatPen(active.precio_venta)}</td>
                  <td>${getStockBadgeHtml(active.stock, active.stock_minimo)}</td>
                  <td class="text-end">
                    ${
                      isZero
                        ? `<button type="button" class="pos-btn-md pos-btn-warn" data-show-alt="${escapeHtml(active.sku)}">Ver alternativas</button>`
                        : `<button type="button" class="pos-btn-md pos-btn-primary" data-add-sku="${escapeHtml(active.sku)}" ${remaining <= 0 ? 'disabled' : ''}>${inDraft > 0 ? `+1 (${inDraft})` : '+ Agregar'}</button>`
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

  bindThumbFallbacks(container);
}

function renderReceiptView(order: PosOrder): string {
  const isFactura = order.tipoComprobante === 'factura';
  return `
    <div class="pos-panel-header pos-no-print">
      <h2 class="pos-panel-title pos-display">Comprobante · ${escapeHtml(order.numeroComprobante ?? order.id)}</h2>
      <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-new-sale">
        Nueva venta
      </button>
    </div>
    <div class="pos-panel-body">
      <div class="pos-receipt-box pos-print-only-target mb-3">
        <div class="pos-receipt-header">
          <div class="fw-bold fs-5">I&amp;O MODA RETAIL S.A.C.</div>
          <div class="small pos-text-muted">RUC: 20609988771 · Tienda Lima Centro</div>
          <div class="fw-bold mt-2">${isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}</div>
          <div class="fw-bold fs-6 pos-num">${escapeHtml(order.numeroComprobante ?? '')}</div>
        </div>

        <div class="row g-1 small mb-2">
          <div class="col-6"><strong>Orden:</strong> ${escapeHtml(order.id)}</div>
          <div class="col-6 text-end pos-num"><strong>Fecha:</strong> ${new Date(order.cobradoEn ?? order.creadoEn).toLocaleString('es-PE')}</div>
          <div class="col-12"><strong>Atendido por:</strong> ${escapeHtml(order.cajeroNombre ?? order.vendedorNombre)}</div>
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
            <span>Op. Gravada + IGV (18%)</span>
            <span>${formatPen(order.opGravada)} + ${formatPen(order.igv)}</span>
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
          <div class="fw-semibold mb-1">Pago registrado:</div>
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

      <div class="d-flex gap-2 pos-no-print">
        <button type="button" class="pos-btn-lg pos-btn-primary flex-grow-1" id="btn-print-receipt">
          Imprimir comprobante
        </button>
        <button type="button" class="pos-btn-lg pos-btn-secondary" id="btn-new-sale-bottom">
          Nueva venta
        </button>
      </div>
    </div>
  `;
}

function renderWaitingOrderPanel(order: PosOrder): string {
  const method = local.selectedMethod;
  const isCash = method === 'efectivo';
  const cashReceived = Number(local.cashReceivedStr);
  const vueltoPreview =
    isCash && Number.isFinite(cashReceived) && cashReceived > order.saldoPendiente
      ? roundMoney(cashReceived - order.saldoPendiente)
      : 0;

  return `
    <div class="pos-panel-header">
      <h2 class="pos-panel-title pos-display">Cobro en Espera · ${escapeHtml(order.id)}</h2>
      <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-defer-waiting">
        Dejar pendiente
      </button>
    </div>
    <div class="pos-panel-body">
      <div class="pos-waiting-panel mb-3">
        <div class="fw-bold mb-1">
          ${isCash ? 'Cobro en efectivo listo para confirmar' : `Esperando confirmación de ${escapeHtml(POS_PAYMENT_LABELS[method])}`}
        </div>
        <div class="small">
          ${
            isCash
              ? 'Confirma el ingreso del efectivo para emitir el comprobante.'
              : 'La pasarela es externa (RN-SEG-02 PCI-DSS). Usa el botón de simulación cuando llegue el pago o transferencia.'
          }
        </div>
      </div>

      <div class="pos-subbox mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span class="pos-text-muted">Cliente:</span>
          <span class="fw-semibold">${escapeHtml(order.clienteRazonSocial)} (${escapeHtml(order.tipoComprobante.toUpperCase())})</span>
        </div>
        <div class="d-flex justify-content-between small mb-1 pos-num">
          <span class="pos-text-muted">Prendas verificadas:</span>
          <span class="fw-semibold">${order.items.reduce((a, i) => a + i.cantidad, 0)} u.</span>
        </div>
        <div class="d-flex justify-content-between fw-bold fs-5 border-top pt-2 mt-1 pos-num">
          <span>Saldo a cobrar</span>
          <span>${formatPen(order.saldoPendiente)}</span>
        </div>
      </div>

      <div class="mb-3">
        <div class="small fw-semibold mb-1">Cambiar método de pago si es necesario:</div>
        <div class="pos-method-grid">
          ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
            .map(
              (m) => `
              <button
                type="button"
                class="pos-method-btn ${local.selectedMethod === m ? 'is-active' : ''}"
                data-select-method="${m}"
              >
                ${escapeHtml(POS_PAYMENT_LABELS[m])}
              </button>
            `
            )
            .join('')}
        </div>
      </div>

      ${
        isCash
          ? `
            <div class="pos-subbox pos-subbox--muted mb-3">
              <label for="pos-cash-received" class="form-label small fw-semibold mb-1">
                Efectivo recibido (opcional, S/)
              </label>
              <input
                id="pos-cash-received"
                type="number"
                step="0.10"
                min="0"
                class="form-control form-control-sm pos-num"
                placeholder="Ej. ${order.saldoPendiente.toFixed(2)}"
                value="${escapeHtml(local.cashReceivedStr)}"
              />
              <div id="pos-cash-vuelto-preview" class="small fw-semibold pos-text-ok mt-1 pos-num">
                ${vueltoPreview > 0 ? `Vuelto a entregar: ${formatPen(vueltoPreview)}` : ''}
              </div>
            </div>
          `
          : ''
      }

      ${local.orderError ? `<div class="pos-inline-error mb-2">${escapeHtml(local.orderError)}</div>` : ''}

      <div class="d-flex flex-column gap-2">
        ${
          isCash
            ? `<button type="button" id="btn-confirm-waiting-payment" class="pos-btn-lg pos-btn-success w-100">
                Confirmar pago en efectivo
              </button>`
            : `<button type="button" id="btn-confirm-waiting-payment" class="pos-btn-lg pos-btn-success w-100">
                Simular llegada de pago / transferencia
              </button>
              <button type="button" id="btn-sim-reject-waiting" class="pos-btn-md pos-btn-danger w-100">
                Simular rechazo de pasarela
              </button>`
        }
      </div>
    </div>
  `;
}

function renderRightPanel(): void {
  const panel = document.getElementById('pos-right-panel');
  if (!panel) return;

  if (local.lastCompletedOrderId) {
    const completed = storeState.orders.find((o) => o.id === local.lastCompletedOrderId);
    if (completed) {
      panel.innerHTML = renderReceiptView(completed);
      return;
    }
    local.lastCompletedOrderId = null;
  }

  if (local.activeWaitingOrderId) {
    const waiting = storeState.orders.find((o) => o.id === local.activeWaitingOrderId);
    if (waiting && waiting.status === 'pendiente_cobro') {
      panel.innerHTML = renderWaitingOrderPanel(waiting);
      return;
    }
    local.activeWaitingOrderId = null;
  }

  const all = getInventoryList(storeState);
  const bySku = new Map(all.map((i) => [i.sku, i]));
  const unverifiedCount = local.draftItems.filter((d) => !d.verificado).length;

  const calcItems: { precio_unitario: number; cantidad: number }[] = [];
  for (const line of local.draftItems) {
    const item = bySku.get(line.sku);
    if (item) {
      calcItems.push({ precio_unitario: item.precio_venta, cantidad: line.cantidad });
    }
  }
  const totals = calculateOrderTotals(calcItems, local.descuentoPct);
  const cashReceived = Number(local.cashReceivedStr);
  const vueltoPreview =
    local.selectedMethod === 'efectivo' &&
    Number.isFinite(cashReceived) &&
    cashReceived > totals.total
      ? roundMoney(cashReceived - totals.total)
      : 0;

  panel.innerHTML = `
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
          value="${escapeHtml(local.clienteReferencia)}"
          autocomplete="off"
        />
      </div>

      ${
        local.draftItems.length === 0
          ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small mb-3">Agrega prendas desde el catálogo o usa <strong>Escanear prenda (F3)</strong>.</div>'
          : `
            <div class="d-flex flex-column gap-2 mb-2">
              ${local.draftItems
                .map((line) => {
                  const item = bySku.get(line.sku);
                  if (!item) return '';
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
                      <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
                        <div class="d-flex align-items-center gap-1">
                          <button type="button" class="pos-qty-btn" data-dec-sku="${escapeHtml(item.sku)}">-</button>
                          <span class="px-2 fw-bold pos-num">${line.cantidad}</span>
                          <button type="button" class="pos-qty-btn" data-inc-sku="${escapeHtml(item.sku)}" ${canInc ? '' : 'disabled'}>+</button>
                          <span class="small pos-text-muted ms-1 pos-num">(disp: ${item.stock})</span>
                        </div>
                        <span class="fw-bold pos-num">${formatPen(lineTotal)}</span>
                      </div>
                      <div class="d-flex justify-content-between align-items-center pt-1 border-top">
                        ${
                          line.verificado
                            ? `<span class="pos-verify-chip is-verified">${line.origen === 'escaner' ? 'Escaneada' : 'Verificada'}</span>`
                            : `<span class="pos-verify-chip is-unverified">Pendiente verificar</span>`
                        }
                        ${
                          !line.verificado
                            ? `<button type="button" class="pos-variant-pill" data-verify-sku="${escapeHtml(item.sku)}">✓ Verificar manual</button>`
                            : ''
                        }
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            ${
              unverifiedCount > 0
                ? `<div class="pos-subbox pos-subbox--muted d-flex align-items-center justify-content-between gap-2 mb-2">
                    <span class="small fw-semibold pos-text-warn pos-num">Faltan ${unverifiedCount} prenda(s) por verificar</span>
                    <button type="button" id="btn-verify-all" class="pos-btn-md pos-btn-secondary">
                      Verificar todo
                    </button>
                  </div>`
                : ''
            }
          `
      }

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
              value="${local.descuentoPct}"
              class="form-control form-control-sm pos-num"
            />
          </div>
        </div>
        <div id="pos-discount-auth-wrap" class="form-check mt-2 ${local.descuentoPct > 0 ? '' : 'd-none'}">
          <input class="form-check-input" type="checkbox" id="pos-descuento-auth" ${local.descuentoAutorizado ? 'checked' : ''} />
          <label class="form-check-label small fw-semibold pos-text-err" for="pos-descuento-auth">
            Descuento autorizado por Dueño / Administrador (RN-VEN-03)
          </label>
        </div>
        <div id="pos-discount-error">
          ${local.discountError ? `<div class="pos-inline-error">${escapeHtml(local.discountError)}</div>` : ''}
        </div>
      </div>

      <div id="pos-draft-totals" class="border-top pt-2 mb-3">
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
      </div>

      <div class="border-top pt-2 mb-2">
        <div class="small fw-semibold mb-1">Comprobante (RN-TRI-02)</div>
        <div class="pos-seg-group mb-2">
          <button type="button" class="pos-seg-btn ${local.tipoComprobante === 'boleta' ? 'is-active' : ''}" data-receipt-type="boleta">
            Boleta
          </button>
          <button type="button" class="pos-seg-btn ${local.tipoComprobante === 'factura' ? 'is-active' : ''}" data-receipt-type="factura">
            Factura (RUC)
          </button>
        </div>
        <div class="row g-2">
          <div class="col-5">
            <input
              id="pos-cliente-doc"
              type="text"
              class="form-control form-control-sm pos-num"
              placeholder="${local.tipoComprobante === 'factura' ? 'RUC (11 dígitos)' : 'DNI (opcional)'}"
              maxlength="${local.tipoComprobante === 'factura' ? '11' : '8'}"
              value="${escapeHtml(local.clienteDoc)}"
            />
          </div>
          <div class="col-7">
            <input
              id="pos-cliente-razon"
              type="text"
              class="form-control form-control-sm"
              placeholder="${local.tipoComprobante === 'factura' ? 'Razón Social *' : 'Nombre / Cliente Varios'}"
              value="${escapeHtml(local.clienteRazonSocial)}"
            />
          </div>
        </div>
      </div>

      <div class="border-top pt-2 mb-2">
        <div class="small fw-semibold mb-1">Método de pago</div>
        <div class="pos-method-grid mb-2">
          ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
            .map(
              (m) => `
              <button
                type="button"
                class="pos-method-btn ${local.selectedMethod === m ? 'is-active' : ''}"
                data-select-method="${m}"
              >
                ${escapeHtml(POS_PAYMENT_LABELS[m])}
              </button>
            `
            )
            .join('')}
        </div>

        ${
          local.selectedMethod === 'efectivo'
            ? `
              <div class="pos-subbox pos-subbox--muted">
                <label for="pos-cash-received" class="form-label small fw-semibold mb-1">
                  Efectivo recibido (opcional, S/)
                </label>
                <input
                  id="pos-cash-received"
                  type="number"
                  step="0.10"
                  min="0"
                  class="form-control form-control-sm pos-num"
                  placeholder="Ej. ${totals.total.toFixed(2)}"
                  value="${escapeHtml(local.cashReceivedStr)}"
                />
                <div id="pos-cash-vuelto-preview" class="small fw-semibold pos-text-ok mt-1 pos-num">
                  ${vueltoPreview > 0 ? `Vuelto a entregar: ${formatPen(vueltoPreview)}` : ''}
                </div>
              </div>
            `
            : `
              <div class="pos-subbox pos-subbox--muted small pos-text-muted">
                Pasarela externa (sin captura de tarjeta · RN-SEG-02). Al confirmar, el sistema esperará la llegada del pago.
              </div>
            `
        }
      </div>

      <div id="pos-order-error" class="mb-2">
        ${local.orderError ? `<div class="pos-inline-error">${escapeHtml(local.orderError)}</div>` : ''}
      </div>

      <button
        type="button"
        id="btn-confirm-order"
        class="pos-btn-lg ${local.selectedMethod === 'efectivo' ? 'pos-btn-success' : 'pos-btn-primary'} w-100"
        ${local.draftItems.length === 0 ? 'disabled' : ''}
      >
        ${
          local.selectedMethod === 'efectivo'
            ? 'Confirmar pago en efectivo (F4)'
            : 'Confirmar y esperar pago (F4)'
        }
      </button>
    </div>
  `;
}

function renderCajaModal(): void {
  const slot = document.getElementById('pos-caja-modal-slot');
  if (!slot) return;

  if (!local.isCajaModalOpen) {
    slot.innerHTML = '';
    return;
  }

  const summary = getDailySummary(storeState);
  const pendientes = storeState.orders.filter((o) => o.status === 'pendiente_cobro');
  const cobradas = storeState.orders.filter((o) => o.status === 'cobrado');
  const list = local.cajaTab === 'pendientes' ? pendientes : cobradas;

  slot.innerHTML = `
    <div class="pos-modal-backdrop" id="caja-modal-backdrop">
      <div class="pos-modal-card pos-caja-modal-card" role="dialog" aria-modal="true" aria-labelledby="caja-modal-title">
        <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 gap-2 flex-wrap">
          <div>
            <h2 id="caja-modal-title" class="pos-display fs-4 m-0">Caja y Arqueo del Día</h2>
            <div class="small pos-text-muted">Ventas presenciales (Boletas minoristas y Facturas RUC) · Operador: ${escapeHtml(currentSession.displayName)}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <a href="/pos-cajero.html" class="pos-btn-md pos-btn-secondary text-decoration-none">
              Abrir vista Caja completa
            </a>
            <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-caja-modal">
              Cerrar (Esc)
            </button>
          </div>
        </div>

        <div class="row g-2 mb-3 pos-num">
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Cobrado hoy</div>
              <div class="pos-kpi-value pos-text-ok">${formatPen(summary.totalCobrado)}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Pendientes</div>
              <div class="pos-kpi-value pos-text-warn">${summary.cantidadPendientes} · ${formatPen(summary.totalPendiente)}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">Ventas cerradas</div>
              <div class="pos-kpi-value">${summary.cantidadVentas}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="pos-kpi-card">
              <div class="pos-kpi-label">IGV 18%</div>
              <div class="pos-kpi-value">${formatPen(summary.igvTotal)}</div>
            </div>
          </div>
        </div>

        <div class="pos-subbox pos-subbox--muted mb-3">
          <div class="row g-2 small pos-num">
            ${(['efectivo', 'tarjeta', 'yape_plin', 'transferencia'] as PosPaymentMethod[])
              .map(
                (m) => `
                <div class="col-6 col-md-3 d-flex justify-content-between">
                  <span class="pos-text-muted">${escapeHtml(POS_PAYMENT_LABELS[m])}:</span>
                  <strong>${formatPen(summary.porMetodo[m])}</strong>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="pos-seg-group mb-3" style="max-width: 360px;">
          <button type="button" class="pos-seg-btn ${local.cajaTab === 'pendientes' ? 'is-active' : ''}" data-caja-tab="pendientes">
            Pendientes (${pendientes.length})
          </button>
          <button type="button" class="pos-seg-btn ${local.cajaTab === 'cobradas' ? 'is-active' : ''}" data-caja-tab="cobradas">
            Cobradas (${cobradas.length})
          </button>
        </div>

        ${
          list.length === 0
            ? `<div class="pos-subbox p-3 text-center pos-text-muted small mb-3">
                ${local.cajaTab === 'pendientes' ? 'No hay órdenes pendientes de cobro.' : 'Aún no hay ventas cobradas hoy.'}
              </div>`
            : `<div class="table-responsive mb-3" style="max-height: 300px;">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Orden / Comprobante</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Método</th>
                      <th class="text-end">Total</th>
                      <th class="text-end">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list
                      .map((o) => {
                        const methodLabel = o.metodoPagoSolicitado
                          ? POS_PAYMENT_LABELS[o.metodoPagoSolicitado]
                          : o.pagos[0]
                            ? POS_PAYMENT_LABELS[o.pagos[0].metodo]
                            : 'Por definir';
                        return `
                          <tr>
                            <td>
                              <div class="fw-bold pos-num">${escapeHtml(o.numeroComprobante ?? o.id)}</div>
                              <div class="small pos-text-muted">${escapeHtml(o.tipoComprobante.toUpperCase())} · ${o.items.reduce((a, i) => a + i.cantidad, 0)} u.</div>
                            </td>
                            <td class="pos-num small">${formatTimeShort(o.cobradoEn ?? o.creadoEn)}</td>
                            <td>
                              <div class="small fw-semibold">${escapeHtml(o.clienteRazonSocial)}</div>
                              <div class="small pos-text-muted">${escapeHtml(o.clienteReferencia)}</div>
                            </td>
                            <td class="small">${escapeHtml(methodLabel)}</td>
                            <td class="text-end fw-bold pos-num">${formatPen(o.total)}</td>
                            <td class="text-end">
                              ${
                                o.status === 'pendiente_cobro'
                                  ? `<div class="d-inline-flex gap-1">
                                      <button type="button" class="pos-btn-md pos-btn-success" data-caja-settle="${escapeHtml(o.id)}">
                                        Confirmar pago
                                      </button>
                                      <button type="button" class="pos-btn-md pos-btn-secondary" data-caja-resume="${escapeHtml(o.id)}">
                                        Retomar
                                      </button>
                                      <button type="button" class="pos-btn-md pos-btn-danger" data-caja-cancel="${escapeHtml(o.id)}">
                                        Cancelar
                                      </button>
                                    </div>`
                                  : `<button type="button" class="pos-btn-md pos-btn-secondary" data-caja-ticket="${escapeHtml(o.id)}">
                                      Ver ticket
                                    </button>`
                              }
                            </td>
                          </tr>
                        `;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }

        <div class="d-flex justify-content-between align-items-center border-top pt-2 gap-2 flex-wrap">
          <button type="button" class="pos-btn-md pos-btn-danger" id="btn-reset-pos-day">
            Reiniciar jornada demo
          </button>
          <button type="button" class="pos-btn-md pos-btn-primary" id="btn-print-arqueo">
            Imprimir arqueo
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDynamic(): void {
  renderFeedback();
  renderTopCounter();
  renderAlternatives();
  renderResults();
  renderRightPanel();
  renderCajaModal();
}

function addSkuToDraft(sku: string, origen: 'catalogo' | 'escaner' = 'catalogo'): boolean {
  const all = getInventoryList(storeState);
  const item = all.find((i) => i.sku === sku);
  if (!item) return false;

  if (item.stock <= 0) {
    local.alternativesForSku = sku;
    local.feedback = {
      kind: 'warn',
      text: `${sku} tiene stock 0. Selecciona una alternativa disponible.`,
    };
    renderDynamic();
    return false;
  }

  local.activeWaitingOrderId = null;
  local.lastCompletedOrderId = null;

  const existing = local.draftItems.find((d) => d.sku === sku);
  if (existing) {
    if (existing.cantidad >= item.stock) {
      local.orderError = `Stock máximo alcanzado para ${sku} (${item.stock} disponibles).`;
      renderDynamic();
      return false;
    }
    existing.cantidad += 1;
    if (origen === 'escaner') {
      existing.verificado = true;
      existing.origen = 'escaner';
    }
  } else {
    local.draftItems.push({
      sku,
      cantidad: 1,
      verificado: origen === 'escaner',
      origen,
    });
  }

  local.alternativesForSku = null;
  local.orderError = '';
  if (origen === 'catalogo') {
    local.feedback = null;
  }
  renderDynamic();
  return true;
}

function handleScanRandomItem(): void {
  const reserved: Record<string, number> = {};
  for (const d of local.draftItems) {
    reserved[d.sku] = d.cantidad;
  }
  const picked = pickRandomAvailableItem(storeState, reserved);
  if (!picked) {
    local.feedback = {
      kind: 'warn',
      text: 'No hay más prendas con stock disponible para simular escaneo.',
    };
    renderFeedback();
    return;
  }

  const ok = addSkuToDraft(picked.sku, 'escaner');
  if (ok) {
    playBeep(960, 0.09);
    local.feedback = {
      kind: 'ok',
      text: `Escáner detectó: ${picked.sku} · ${picked.nombre} (${picked.talla} · ${picked.color}).`,
    };
    renderFeedback();
  }
}

function clearDraft(): void {
  local.draftItems = [];
  local.clienteReferencia = '';
  local.descuentoPct = 0;
  local.descuentoAutorizado = false;
  local.tipoComprobante = 'boleta';
  local.clienteDoc = '';
  local.clienteRazonSocial = '';
  local.cashReceivedStr = '';
  local.alternativesForSku = null;
  local.discountError = '';
  local.orderError = '';
  local.activeWaitingOrderId = null;
  local.lastCompletedOrderId = null;
}

function handleConfirmDraftOrder(): void {
  if (local.draftItems.length === 0) return;

  const unverified = local.draftItems.filter((d) => !d.verificado);
  if (unverified.length > 0) {
    local.orderError = `Verifica las ${unverified.length} prenda(s) pendiente(s) de forma manual o con escáner antes de confirmar.`;
    renderRightPanel();
    return;
  }

  const created = createAndSendOrder({
    vendedorNombre: currentSession.displayName,
    clienteReferencia: local.clienteReferencia,
    items: local.draftItems.map((d) => ({ sku: d.sku, cantidad: d.cantidad })),
    descuentoPct: local.descuentoPct,
    descuentoAutorizado: local.descuentoAutorizado,
    tipoComprobante: local.tipoComprobante,
    clienteDoc: local.clienteDoc,
    clienteRazonSocial: local.clienteRazonSocial,
    metodoPagoSolicitado: local.selectedMethod,
  });

  if (!created.ok) {
    if (created.error.includes('RN-VEN-03')) {
      local.discountError = created.error;
      local.orderError = '';
    } else {
      local.orderError = created.error;
      local.discountError = '';
    }
    renderRightPanel();
    return;
  }

  if (local.selectedMethod === 'efectivo') {
    const rawCash = Number(local.cashReceivedStr);
    const amountToPay =
      Number.isFinite(rawCash) && rawCash >= created.order.total
        ? roundMoney(rawCash)
        : created.order.total;

    const paid = recordPaymentOrAbono({
      orderId: created.order.id,
      monto: amountToPay,
      metodo: 'efectivo',
      tipo: 'pago',
      cajeroNombre: currentSession.displayName,
    });

    storeState = loadPosState();
    clearDraft();

    if (paid.ok) {
      local.lastCompletedOrderId = paid.order.id;
      local.feedback = {
        kind: 'ok',
        text: `Venta cobrada en efectivo · ${paid.order.numeroComprobante ?? paid.order.id}.`,
      };
    } else {
      local.activeWaitingOrderId = created.order.id;
      local.orderError = paid.error;
    }
    renderDynamic();
    return;
  }

  // Pasarela externa: queda esperando confirmación
  const waitingOrderId = created.order.id;
  storeState = loadPosState();
  clearDraft();
  local.activeWaitingOrderId = waitingOrderId;
  local.feedback = {
    kind: 'warn',
    text: `Orden ${waitingOrderId} confirmada · esperando ${POS_PAYMENT_LABELS[local.selectedMethod]}.`,
  };
  renderDynamic();
}

function handleConfirmWaitingPayment(): void {
  if (!local.activeWaitingOrderId) return;
  const order = storeState.orders.find((o) => o.id === local.activeWaitingOrderId);
  if (!order) return;

  const isCash = local.selectedMethod === 'efectivo';
  const rawCash = Number(local.cashReceivedStr);
  const amountToPay =
    isCash && Number.isFinite(rawCash) && rawCash >= order.saldoPendiente
      ? roundMoney(rawCash)
      : order.saldoPendiente;

  const res = recordPaymentOrAbono({
    orderId: order.id,
    monto: amountToPay,
    metodo: local.selectedMethod,
    tipo: 'pago',
    cajeroNombre: currentSession.displayName,
  });

  if (!res.ok) {
    local.orderError = res.error;
    renderRightPanel();
    return;
  }

  storeState = loadPosState();
  local.activeWaitingOrderId = null;
  local.lastCompletedOrderId = res.order.id;
  local.cashReceivedStr = '';
  local.orderError = '';
  local.feedback = {
    kind: 'ok',
    text: `Pago confirmado (${POS_PAYMENT_LABELS[local.selectedMethod]}) · ${res.order.numeroComprobante ?? res.order.id}.`,
  };
  renderDynamic();
}

function bindEvents(): void {
  const searchInput = document.getElementById('pos-search-input') as HTMLInputElement;
  const tallaSelect = document.getElementById('pos-filter-talla') as HTMLSelectElement;
  const colorSelect = document.getElementById('pos-filter-color') as HTMLSelectElement;
  const onlyStockCheck = document.getElementById('pos-only-stock') as HTMLInputElement;

  searchInput.addEventListener('input', () => {
    local.searchQuery = searchInput.value;
    renderResults();
  });

  searchInput.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return;
    const filtered = getFilteredInventory();
    const exactSku = filtered.find((i) => i.sku.toLowerCase() === q);
    const target = exactSku ?? (filtered.length === 1 ? filtered[0] : null);
    if (target) {
      if (addSkuToDraft(target.sku, 'escaner')) {
        playBeep(960, 0.08);
        local.feedback = {
          kind: 'ok',
          text: `SKU detectado: ${target.sku} · ${target.nombre} (${target.talla} · ${target.color}).`,
        };
        searchInput.value = '';
        local.searchQuery = '';
        renderDynamic();
      }
    }
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

  document.getElementById('btn-pos-logout')?.addEventListener('click', () => {
    logoutToAccess();
  });

  document.getElementById('btn-open-caja-modal')?.addEventListener('click', () => {
    local.isCajaModalOpen = true;
    renderCajaModal();
  });

  document.getElementById('btn-scan-random')?.addEventListener('click', handleScanRandomItem);

  // Inputs dinámicos dentro del panel derecho (delegación sin destruir foco)
  root!.addEventListener('input', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (!target) return;

    if (target.id === 'pos-cliente-ref') {
      local.clienteReferencia = target.value;
      return;
    }

    if (target.id === 'pos-cliente-doc') {
      local.clienteDoc = target.value;
      return;
    }

    if (target.id === 'pos-cliente-razon') {
      local.clienteRazonSocial = target.value;
      return;
    }

    if (target.id === 'pos-cash-received') {
      local.cashReceivedStr = target.value;
      const previewEl = document.getElementById('pos-cash-vuelto-preview');
      if (previewEl) {
        const received = Number(target.value);
        let due = 0;
        if (local.activeWaitingOrderId) {
          const ord = storeState.orders.find((o) => o.id === local.activeWaitingOrderId);
          due = ord?.saldoPendiente ?? 0;
        } else {
          const all = getInventoryList(storeState);
          const bySku = new Map(all.map((i) => [i.sku, i]));
          const lines = local.draftItems
            .map((d) => {
              const it = bySku.get(d.sku);
              return it ? { precio_unitario: it.precio_venta, cantidad: d.cantidad } : null;
            })
            .filter((x): x is { precio_unitario: number; cantidad: number } => x !== null);
          due = calculateOrderTotals(lines, local.descuentoPct).total;
        }
        const vuelto =
          Number.isFinite(received) && received > due ? roundMoney(received - due) : 0;
        previewEl.textContent = vuelto > 0 ? `Vuelto a entregar: ${formatPen(vuelto)}` : '';
      }
      return;
    }

    if (target.id === 'pos-descuento-pct') {
      const raw = Number(target.value);
      if (Number.isNaN(raw) || raw < 0) {
        local.descuentoPct = 0;
        target.value = '0';
        local.discountError = '';
      } else if (raw > 10) {
        local.descuentoPct = 10;
        target.value = '10';
        local.discountError = 'El descuento máximo en tienda es 10% (RN-VEN-03). Se ajustó al tope.';
      } else {
        local.descuentoPct = raw;
        local.discountError = '';
      }
      const authWrap = document.getElementById('pos-discount-auth-wrap');
      if (authWrap) {
        authWrap.classList.toggle('d-none', local.descuentoPct <= 0);
      }
      const errEl = document.getElementById('pos-discount-error');
      if (errEl) {
        errEl.innerHTML = local.discountError
          ? `<div class="pos-inline-error">${escapeHtml(local.discountError)}</div>`
          : '';
      }
      const totalsEl = document.getElementById('pos-draft-totals');
      if (totalsEl) {
        const all = getInventoryList(storeState);
        const bySku = new Map(all.map((i) => [i.sku, i]));
        const lines = local.draftItems
          .map((d) => {
            const it = bySku.get(d.sku);
            return it ? { precio_unitario: it.precio_venta, cantidad: d.cantidad } : null;
          })
          .filter((x): x is { precio_unitario: number; cantidad: number } => x !== null);
        const totals = calculateOrderTotals(lines, local.descuentoPct);
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
      }
    }
  });

  root!.addEventListener('change', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (target?.id === 'pos-descuento-auth') {
      local.descuentoAutorizado = target.checked;
      if (local.descuentoAutorizado) {
        local.discountError = '';
        const errEl = document.getElementById('pos-discount-error');
        if (errEl) errEl.innerHTML = '';
      }
    }
  });

  root!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const variantBtn = target.closest<HTMLElement>('[data-select-group][data-select-sku]');
    if (variantBtn?.dataset.selectGroup && variantBtn.dataset.selectSku) {
      local.selectedSkuByGroup[variantBtn.dataset.selectGroup] = variantBtn.dataset.selectSku;
      renderResults();
      return;
    }

    const addBtn = target.closest<HTMLElement>('[data-add-sku]');
    if (addBtn?.dataset.addSku) {
      addSkuToDraft(addBtn.dataset.addSku, 'catalogo');
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
      addSkuToDraft(incBtn.dataset.incSku, 'catalogo');
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
      return;
    }

    const verifyBtn = target.closest<HTMLElement>('[data-verify-sku]');
    if (verifyBtn?.dataset.verifySku) {
      const line = local.draftItems.find((d) => d.sku === verifyBtn.dataset.verifySku);
      if (line) {
        line.verificado = true;
        local.orderError = '';
        renderRightPanel();
      }
      return;
    }

    if (target.closest('#btn-verify-all')) {
      for (const line of local.draftItems) {
        line.verificado = true;
      }
      local.orderError = '';
      renderRightPanel();
      return;
    }

    const receiptBtn = target.closest<HTMLElement>('[data-receipt-type]');
    if (receiptBtn?.dataset.receiptType) {
      local.tipoComprobante = receiptBtn.dataset.receiptType as PosReceiptType;
      local.orderError = '';
      renderRightPanel();
      return;
    }

    const methodBtn = target.closest<HTMLElement>('[data-select-method]');
    if (methodBtn?.dataset.selectMethod) {
      local.selectedMethod = methodBtn.dataset.selectMethod as PosPaymentMethod;
      local.orderError = '';
      renderRightPanel();
      return;
    }

    if (target.closest('#btn-clear-draft')) {
      clearDraft();
      local.feedback = null;
      renderDynamic();
      return;
    }

    if (target.closest('#btn-confirm-order')) {
      handleConfirmDraftOrder();
      return;
    }

    if (target.closest('#btn-confirm-waiting-payment')) {
      handleConfirmWaitingPayment();
      return;
    }

    if (target.closest('#btn-sim-reject-waiting')) {
      if (local.activeWaitingOrderId) {
        emitSimulatedRejection(
          local.activeWaitingOrderId,
          `Pago rechazado por pasarela (${POS_PAYMENT_LABELS[local.selectedMethod]}).`
        );
        local.orderError =
          'Pasarela simuló un rechazo. Puedes reintentar o cambiar el método de pago.';
        renderRightPanel();
      }
      return;
    }

    if (target.closest('#btn-defer-waiting')) {
      local.activeWaitingOrderId = null;
      local.orderError = '';
      local.feedback = {
        kind: 'warn',
        text: 'Orden guardada en Caja como pendiente de cobro.',
      };
      renderDynamic();
      return;
    }

    if (target.closest('#btn-print-receipt')) {
      window.print();
      return;
    }

    if (target.closest('#btn-new-sale') || target.closest('#btn-new-sale-bottom')) {
      clearDraft();
      local.feedback = null;
      renderDynamic();
      return;
    }

    // Acciones del modal secundario de Caja
    if (target.id === 'caja-modal-backdrop' || target.closest('#btn-close-caja-modal')) {
      local.isCajaModalOpen = false;
      renderCajaModal();
      return;
    }

    const cajaTabBtn = target.closest<HTMLElement>('[data-caja-tab]');
    if (cajaTabBtn?.dataset.cajaTab) {
      local.cajaTab = cajaTabBtn.dataset.cajaTab as 'pendientes' | 'cobradas';
      renderCajaModal();
      return;
    }

    const settleBtn = target.closest<HTMLElement>('[data-caja-settle]');
    if (settleBtn?.dataset.cajaSettle) {
      const ord = storeState.orders.find((o) => o.id === settleBtn.dataset.cajaSettle);
      if (ord) {
        const metodo = ord.metodoPagoSolicitado ?? 'efectivo';
        const res = recordPaymentOrAbono({
          orderId: ord.id,
          monto: ord.saldoPendiente,
          metodo,
          tipo: 'pago',
          cajeroNombre: currentSession.displayName,
        });
        storeState = loadPosState();
        if (res.ok) {
          local.feedback = {
            kind: 'ok',
            text: `Orden ${ord.id} cobrada (${POS_PAYMENT_LABELS[metodo]}) · ${res.order.numeroComprobante ?? ''}.`,
          };
        } else {
          local.feedback = { kind: 'err', text: res.error };
        }
        renderDynamic();
      }
      return;
    }

    const resumeBtn = target.closest<HTMLElement>('[data-caja-resume]');
    if (resumeBtn?.dataset.cajaResume) {
      const ord = storeState.orders.find((o) => o.id === resumeBtn.dataset.cajaResume);
      if (ord && ord.status === 'pendiente_cobro') {
        local.isCajaModalOpen = false;
        local.lastCompletedOrderId = null;
        local.activeWaitingOrderId = ord.id;
        local.selectedMethod = ord.metodoPagoSolicitado ?? 'transferencia';
        local.orderError = '';
        renderDynamic();
      }
      return;
    }

    const cancelBtn = target.closest<HTMLElement>('[data-caja-cancel]');
    if (cancelBtn?.dataset.cajaCancel) {
      const res = cancelOrder(cancelBtn.dataset.cajaCancel, 'Cancelada desde Caja en mostrador');
      storeState = loadPosState();
      if (res.ok) {
        if (local.activeWaitingOrderId === res.order.id) {
          local.activeWaitingOrderId = null;
        }
        local.feedback = { kind: 'warn', text: `Orden ${res.order.id} cancelada.` };
      } else {
        local.feedback = { kind: 'err', text: res.error };
      }
      renderDynamic();
      return;
    }

    const ticketBtn = target.closest<HTMLElement>('[data-caja-ticket]');
    if (ticketBtn?.dataset.cajaTicket) {
      local.isCajaModalOpen = false;
      local.activeWaitingOrderId = null;
      local.lastCompletedOrderId = ticketBtn.dataset.cajaTicket;
      renderDynamic();
      return;
    }

    if (target.closest('#btn-print-arqueo')) {
      window.print();
      return;
    }

    if (target.closest('#btn-reset-pos-day')) {
      if (window.confirm('¿Reiniciar inventario y órdenes del día en la demo?')) {
        storeState = resetPosDay();
        clearDraft();
        local.isCajaModalOpen = false;
        local.feedback = { kind: 'ok', text: 'Jornada POS reiniciada.' };
        renderDynamic();
      }
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (ev.key === 'F3') {
      ev.preventDefault();
      handleScanRandomItem();
    } else if (ev.key === 'F4') {
      ev.preventDefault();
      if (local.activeWaitingOrderId) {
        handleConfirmWaitingPayment();
      } else if (local.draftItems.length > 0) {
        handleConfirmDraftOrder();
      }
    } else if (ev.key === 'F6') {
      ev.preventDefault();
      local.isCajaModalOpen = !local.isCajaModalOpen;
      renderCajaModal();
    } else if (ev.key === 'F8') {
      ev.preventDefault();
      clearDraft();
      local.feedback = null;
      renderDynamic();
    } else if (ev.key === 'Escape') {
      if (local.isCajaModalOpen) {
        local.isCajaModalOpen = false;
        renderCajaModal();
      } else if (local.alternativesForSku || local.feedback) {
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

// Sincronizar cambios de facturación si el usuario cambia a Factura en espera
export function syncBillingFromWaiting(
  orderId: string,
  tipo: PosReceiptType,
  doc: string,
  razon: string
): void {
  updateOrderBilling(orderId, {
    tipoComprobante: tipo,
    clienteDoc: doc,
    clienteRazonSocial: razon,
  });
}

renderStaticShell();
bindEvents();
renderDynamic();
(document.getElementById('pos-search-input') as HTMLInputElement | null)?.focus();

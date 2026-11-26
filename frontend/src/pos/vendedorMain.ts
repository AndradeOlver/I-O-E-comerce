import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import { DemoSession, logoutToAccess, requireAnyZoneRole } from '../auth/demoSession';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml } from '../utils/icons';
import {
  calculateOrderTotals,
  createAndSendOrder,
  findAlternativesForSku,
  formatPen,
  getDailySummary,
  getInventoryList,
  getPosUiMode,
  loadPosState,
  pickRandomAvailableItem,
  resetPosDay,
  setPosUiMode,
  subscribePosEvents,
  subscribePosMode,
} from './posStore';
import {
  PosConsoleApi,
  PosInventoryItem,
  PosReceiptType,
  PosStoreState,
  PosUiMode,
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
  uiMode: PosUiMode;
  searchQuery: string;
  filterTalla: string;
  filterColor: string;
  onlyInStock: boolean;
  selectedSkuByGroup: Record<string, string>;
  draftItems: DraftLine[];
  isOrderDrawerOpen: boolean;
  clienteReferencia: string;
  descuentoPct: number;
  descuentoAutorizado: boolean;
  tipoComprobante: PosReceiptType;
  clienteDoc: string;
  clienteRazonSocial: string;
  alternativesForSku: string | null;
  discountError: string;
  orderError: string;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
}

const local: VendedorLocalState = {
  uiMode: getPosUiMode(),
  searchQuery: '',
  filterTalla: '',
  filterColor: '',
  onlyInStock: false,
  selectedSkuByGroup: {},
  draftItems: [],
  isOrderDrawerOpen: false,
  clienteReferencia: '',
  descuentoPct: 0,
  descuentoAutorizado: false,
  tipoComprobante: 'boleta',
  clienteDoc: '',
  clienteRazonSocial: '',
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
    const colorMatchWithStock = group.variants.find(
      (v) => v.color.toLowerCase().includes(q) && v.stock > 0
    );
    if (colorMatchWithStock) return colorMatchWithStock;
    const colorMatch = group.variants.find((v) => v.color.toLowerCase().includes(q));
    if (colorMatch) return colorMatch;
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

function getDraftTotalsSummary(): { count: number; total: number } {
  const all = getInventoryList(storeState);
  const bySku = new Map(all.map((i) => [i.sku, i]));
  const lines: { precio_unitario: number; cantidad: number }[] = [];
  let count = 0;
  for (const d of local.draftItems) {
    count += d.cantidad;
    const item = bySku.get(d.sku);
    if (item) {
      lines.push({ precio_unitario: item.precio_venta, cantidad: d.cantidad });
    }
  }
  const totals = calculateOrderTotals(lines, local.descuentoPct);
  return { count, total: totals.total };
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
        <nav class="pos-nav-tabs" aria-label="Áreas del punto de venta">
          <a href="/pos-vendedor.html" class="pos-nav-tab is-active" aria-current="page">
            Mostrador (Productos)
          </a>
          <a href="/pos-cajero.html" class="pos-nav-tab">
            Caja y Cobros
            <span id="pos-caja-nav-badge" class="pos-counter-badge pos-num d-none">0</span>
          </a>
        </nav>
        <span class="pos-topbar-staff">Turno: <strong>${escapeHtml(currentSession.displayName)}</strong></span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-xl-flex">
          <span><span class="pos-kbd">F2</span> Buscar</span>
          <span><span class="pos-kbd">F4</span> Orden</span>
          <span><span class="pos-kbd">F8</span> Limpiar</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        <button type="button" id="btn-pos-logout" class="pos-topbar-btn">
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="pos-shell">
      <div id="pos-vendedor-feedback" class="pos-no-print"></div>
      <div id="pos-practice-slot" class="pos-no-print"></div>

      <section class="pos-panel pos-no-print">
        <div class="pos-panel-header">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <h1 class="pos-panel-title pos-display">Catálogo en Mostrador</h1>
            <span id="pos-results-count" class="pos-text-muted fw-normal pos-num"></span>
          </div>
          <button type="button" id="btn-open-order-drawer" class="pos-btn-md pos-btn-primary pos-num">
            Orden en curso (0 · S/ 0.00)
          </button>
        </div>
        <div class="pos-panel-body">
          <div class="row g-2 mb-2">
            <div class="col-12 col-md-5">
              <input
                id="pos-search-input"
                type="search"
                class="form-control"
                placeholder="Buscar prenda, marca o escanear SKU (F2 · Enter agrega)..."
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

          <div id="pos-results-container"></div>
        </div>
      </section>
    </main>

    <div id="pos-order-drawer-slot" class="pos-no-print"></div>
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

function renderPracticeBar(): void {
  const slot = document.getElementById('pos-practice-slot');
  if (!slot) return;
  if (local.uiMode !== 'practica') {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="pos-practice-bar">
      <div>
        <strong>Modo Práctica activo:</strong>
        <span>Comandos en consola: <code>IO_POS.estado()</code> · <code>IO_POS.reiniciarDia()</code> · volver a real con <code>IO_POS.modo('operacion')</code></span>
      </div>
      <button type="button" id="btn-scan-random" class="pos-btn-md pos-btn-primary">
        Escanear prenda al azar (F3)
      </button>
    </div>
  `;
}

function renderTopCounters(): void {
  const navBadge = document.getElementById('pos-caja-nav-badge');
  if (navBadge) {
    const pendingCount = storeState.orders.filter((o) => o.status === 'pendiente_cobro').length;
    if (pendingCount > 0) {
      navBadge.textContent = String(pendingCount);
      navBadge.classList.remove('d-none');
    } else {
      navBadge.textContent = '0';
      navBadge.classList.add('d-none');
    }
  }

  const orderBtn = document.getElementById('btn-open-order-drawer');
  if (orderBtn) {
    const { count, total } = getDraftTotalsSummary();
    orderBtn.textContent = `Orden en curso (${count} · ${formatPen(total)})`;
  }
}

function renderInlineAlternativesHtml(sku: string): string {
  const all = getInventoryList(storeState);
  const original = all.find((i) => i.sku === sku);
  const alternatives = findAlternativesForSku(sku, storeState);

  return `
    <div class="pos-alt-box">
      <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
        <div>
          <span class="fw-bold">
            Prenda agotada: ${escapeHtml(original ? `${original.nombre} (${original.talla} · ${original.color})` : sku)}
          </span>
          <div class="small pos-text-muted">
            Alternativas disponibles en tienda priorizando talla similar (RN-VEN-02):
          </div>
        </div>
        <button type="button" class="pos-btn-md pos-btn-secondary" id="btn-close-alternatives">
          Ocultar alternativas
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

              const sizesForActiveColor = group.variants.filter((v) => v.color === active.color);
              const isAltOpenForRow = isZero && local.alternativesForSku === active.sku;

              const colorSelectorHtml =
                uniqueColors.length >= 5
                  ? `
                    <div class="pos-color-select-wrap">
                      <span class="pos-color-dot me-0" style="background-color:${escapeHtml(active.colorHex)}"></span>
                      <select
                        class="form-select form-select-sm pos-color-select"
                        data-select-color-group="${escapeHtml(group.groupId)}"
                        aria-label="Color de ${escapeHtml(group.nombre)}"
                      >
                        ${uniqueColors
                          .map(
                            (c) => `
                            <option value="${escapeHtml(c.targetSku)}" ${c.color === active.color ? 'selected' : ''}>
                              ${escapeHtml(c.color)}
                            </option>
                          `
                          )
                          .join('')}
                      </select>
                    </div>
                  `
                  : `
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
                  `;

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
                  <td>${colorSelectorHtml}</td>
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
                        ? `<button type="button" class="pos-btn-md pos-btn-warn" data-show-alt="${escapeHtml(active.sku)}">${isAltOpenForRow ? 'Ocultar alternativas' : 'Ver alternativas'}</button>`
                        : `<button type="button" class="pos-btn-md pos-btn-primary" data-add-sku="${escapeHtml(active.sku)}" ${remaining <= 0 ? 'disabled' : ''}>${inDraft > 0 ? `+1 (${inDraft})` : '+ Agregar'}</button>`
                    }
                  </td>
                </tr>
                ${
                  isAltOpenForRow
                    ? `<tr class="pos-alt-row">
                        <td colspan="6">${renderInlineAlternativesHtml(active.sku)}</td>
                      </tr>`
                    : ''
                }
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  bindThumbFallbacks(container);
}

function renderOrderDrawer(): void {
  const slot = document.getElementById('pos-order-drawer-slot');
  if (!slot) return;

  if (!local.isOrderDrawerOpen) {
    slot.innerHTML = '';
    return;
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

  slot.innerHTML = `
    <div class="pos-drawer-backdrop" id="order-drawer-backdrop">
      <aside class="pos-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
        <div class="pos-panel-header">
          <h2 id="order-drawer-title" class="pos-panel-title pos-display">Orden de Compra en Curso</h2>
          <div class="d-flex gap-2">
            <button type="button" id="btn-clear-draft" class="pos-btn-md pos-btn-secondary">
              Limpiar (F8)
            </button>
            <button type="button" id="btn-close-order-drawer" class="pos-btn-md pos-btn-secondary">
              Cerrar (Esc)
            </button>
          </div>
        </div>

        <div class="pos-drawer-body">
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
              ? '<div class="pos-subbox pos-subbox--muted p-3 text-center pos-text-muted small mb-3">Aún no hay prendas en esta orden. Agrégalas desde el catálogo o escanea un SKU.</div>'
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

          <div class="border-top pt-2 mb-2">
            <div class="small fw-semibold mb-1">Comprobante solicitado (RN-TRI-02)</div>
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
        </div>

        <div class="pos-drawer-footer">
          <div id="pos-draft-totals" class="mb-2">
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
              <span>Total orden</span>
              <span>${formatPen(totals.total)}</span>
            </div>
          </div>

          <div id="pos-order-error" class="mb-2">
            ${local.orderError ? `<div class="pos-inline-error">${escapeHtml(local.orderError)}</div>` : ''}
          </div>

          <button
            type="button"
            id="btn-confirm-send-caja"
            class="pos-btn-lg pos-btn-primary w-100"
            ${local.draftItems.length === 0 ? 'disabled' : ''}
          >
            Confirmar y enviar a Caja
          </button>
        </div>
      </aside>
    </div>
  `;
}

function renderDynamic(): void {
  renderFeedback();
  renderPracticeBar();
  renderTopCounters();
  renderResults();
  renderOrderDrawer();
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

  const existing = local.draftItems.find((d) => d.sku === sku);
  if (existing) {
    if (existing.cantidad >= item.stock) {
      local.orderError = `Stock máximo alcanzado para ${sku} (${item.stock} disponibles).`;
      local.feedback = {
        kind: 'warn',
        text: local.orderError,
      };
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
  if (local.uiMode !== 'practica') return;
  const reserved: Record<string, number> = {};
  for (const d of local.draftItems) {
    reserved[d.sku] = d.cantidad;
  }
  const picked = pickRandomAvailableItem(storeState, reserved);
  if (!picked) {
    local.feedback = {
      kind: 'warn',
      text: 'No hay más prendas con stock disponible para escanear.',
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
  local.alternativesForSku = null;
  local.discountError = '';
  local.orderError = '';
}

function handleSendOrderToCaja(): void {
  if (local.draftItems.length === 0) return;

  const unverified = local.draftItems.filter((d) => !d.verificado);
  if (unverified.length > 0) {
    local.orderError = `Verifica las ${unverified.length} prenda(s) pendiente(s) antes de enviar a Caja.`;
    renderOrderDrawer();
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
  });

  if (!created.ok) {
    if (created.error.includes('RN-VEN-03')) {
      local.discountError = created.error;
      local.orderError = '';
    } else {
      local.orderError = created.error;
      local.discountError = '';
    }
    renderOrderDrawer();
    return;
  }

  storeState = loadPosState();
  clearDraft();
  local.isOrderDrawerOpen = false;
  local.feedback = {
    kind: 'ok',
    text: `Orden ${created.order.id} enviada a Caja (${formatPen(created.order.total)}). Puedes seguir atendiendo o ir a "Caja y Cobros" para cobrarla.`,
  };
  renderDynamic();
  (document.getElementById('pos-search-input') as HTMLInputElement | null)?.focus();
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
          text: `SKU agregado: ${target.sku} · ${target.nombre} (${target.talla} · ${target.color}).`,
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

  document.getElementById('btn-open-order-drawer')?.addEventListener('click', () => {
    local.isOrderDrawerOpen = true;
    renderOrderDrawer();
  });

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
            <span>Total orden</span>
            <span>${formatPen(totals.total)}</span>
          </div>
        `;
      }
      renderTopCounters();
    }
  });

  root!.addEventListener('change', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target instanceof HTMLSelectElement && target.dataset.selectColorGroup) {
      local.selectedSkuByGroup[target.dataset.selectColorGroup] = target.value;
      renderResults();
      return;
    }

    if (target instanceof HTMLInputElement && target.id === 'pos-descuento-auth') {
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

    if (target.closest('#btn-scan-random')) {
      handleScanRandomItem();
      return;
    }

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
      const sku = altBtn.dataset.showAlt;
      local.alternativesForSku = local.alternativesForSku === sku ? null : sku;
      renderResults();
      return;
    }

    if (target.closest('#btn-close-alternatives')) {
      local.alternativesForSku = null;
      renderResults();
      return;
    }

    if (target.closest('#btn-close-feedback')) {
      local.feedback = null;
      renderFeedback();
      return;
    }

    if (target.id === 'order-drawer-backdrop' || target.closest('#btn-close-order-drawer')) {
      local.isOrderDrawerOpen = false;
      renderOrderDrawer();
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
        renderOrderDrawer();
      }
      return;
    }

    if (target.closest('#btn-verify-all')) {
      for (const line of local.draftItems) {
        line.verificado = true;
      }
      local.orderError = '';
      renderOrderDrawer();
      return;
    }

    const receiptBtn = target.closest<HTMLElement>('[data-receipt-type]');
    if (receiptBtn?.dataset.receiptType) {
      local.tipoComprobante = receiptBtn.dataset.receiptType as PosReceiptType;
      local.orderError = '';
      renderOrderDrawer();
      return;
    }

    if (target.closest('#btn-clear-draft')) {
      clearDraft();
      local.feedback = null;
      renderDynamic();
      return;
    }

    if (target.closest('#btn-confirm-send-caja')) {
      handleSendOrderToCaja();
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (ev.key === 'F3') {
      if (local.uiMode === 'practica') {
        ev.preventDefault();
        handleScanRandomItem();
      }
    } else if (ev.key === 'F4') {
      ev.preventDefault();
      if (!local.isOrderDrawerOpen) {
        local.isOrderDrawerOpen = true;
        renderOrderDrawer();
      } else if (local.draftItems.length > 0) {
        handleSendOrderToCaja();
      }
    } else if (ev.key === 'F8') {
      ev.preventDefault();
      clearDraft();
      local.feedback = null;
      renderDynamic();
    } else if (ev.key === 'Escape') {
      if (local.isOrderDrawerOpen) {
        local.isOrderDrawerOpen = false;
        renderOrderDrawer();
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

  subscribePosMode((mode) => {
    local.uiMode = mode;
    renderPracticeBar();
  });
}

function buildMostradorConsoleApi(): PosConsoleApi {
  return {
    modo(nuevoModo) {
      if (!nuevoModo) return local.uiMode;
      const next = setPosUiMode(nuevoModo);
      local.uiMode = next;
      renderPracticeBar();
      console.info(`[I&O POS] Modo cambiado a: ${next}`);
      return next;
    },
    ayuda() {
      console.info(
        [
          '=== I&O POS · Comandos de Consola ===',
          "IO_POS.modo('practica')  -> Activa botones y guías de práctica",
          "IO_POS.modo('operacion') -> Vuelve al modo operativo limpio (100% real)",
          'IO_POS.estado()          -> Resumen de pendientes, aliados y arqueo',
          'IO_POS.reiniciarDia()    -> Reinicia inventario y órdenes de prueba',
        ].join('\n')
      );
    },
    estado() {
      storeState = loadPosState();
      return {
        modo: local.uiMode,
        resumenDia: getDailySummary(storeState),
        pendientesCaja: storeState.orders.filter((o) => o.status === 'pendiente_cobro').length,
      };
    },
    pagar() {
      return { ok: false, info: 'El cobro se realiza desde Caja y Cobros (/pos-cajero.html).' };
    },
    abonar() {
      return { ok: false, info: 'Los abonos se registran en Caja y Cobros (/pos-cajero.html).' };
    },
    simularRechazo() {
      return { ok: false, info: 'La simulación de rechazo está en Caja y Cobros (/pos-cajero.html).' };
    },
    reiniciarDia() {
      storeState = resetPosDay();
      clearDraft();
      local.isOrderDrawerOpen = false;
      local.feedback = { kind: 'ok', text: 'Jornada POS reiniciada.' };
      renderDynamic();
      return { ok: true, message: 'Estado POS reiniciado' };
    },
  };
}

const consoleApi = buildMostradorConsoleApi();
window.IO_POS = consoleApi;
window.ioPos = consoleApi;
window.posPago = consoleApi;

renderStaticShell();
bindEvents();
renderDynamic();
(document.getElementById('pos-search-input') as HTMLInputElement | null)?.focus();

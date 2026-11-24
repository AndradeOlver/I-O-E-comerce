import { ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import {
  getUniqueProductColors,
  renderProductVisualContent,
  renderTextureSwatchSvg,
} from './productCatalog';

interface ProductDetailModalOptions {
  product: ProductGroup | null;
  selectedVariantId?: number;
  colorblindMode: boolean;
  detailFeedback: string;
}

export function renderProductDetailModal({
  product,
  selectedVariantId,
  colorblindMode,
  detailFeedback,
}: ProductDetailModalOptions): string {
  if (!product) return '';

  const activeVariant =
    product.variants.find((v) => v.producto_id === selectedVariantId) ??
    product.variants.find((v) => v.stock > 0) ??
    product.variants[0];

  const uniqueColors = getUniqueProductColors(product);
  const variantsForColor = product.variants.filter(
    (v) => v.color === activeVariant.color
  );

  const colorOptionsHtml = colorblindMode
    ? `
      <div class="d-grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(185px, 1fr))" role="group" aria-label="Selector multimodal de colores y texturas">
        ${uniqueColors
          .map((colorOpt) => {
            const isSelected = colorOpt.color === activeVariant.color;
            return `
              <button
                type="button"
                class="io-color-option ${isSelected ? 'is-selected' : ''}"
                data-action="select-color"
                data-group="${escapeHtml(product.groupId)}"
                data-color="${escapeHtml(colorOpt.color)}"
                aria-pressed="${isSelected}"
              >
                ${renderTextureSwatchSvg(
                  colorOpt.colorHex,
                  colorOpt.patternId,
                  `modal-${product.groupId}-${colorOpt.producto_id}`
                )}
                <span class="small" style="line-height: 1.2">
                  <strong class="d-block" style="color: var(--color-ink)">${escapeHtml(colorOpt.color)}</strong>
                  <span style="color: var(--color-ink-muted)">${escapeHtml(colorOpt.color_textura)}</span>
                </span>
              </button>
            `;
          })
          .join('')}
      </div>
    `
    : `
      <div class="d-flex flex-wrap align-items-center gap-2" role="group" aria-label="Colores disponibles">
        ${uniqueColors
          .map((colorOpt) => {
            const isSelected = colorOpt.color === activeVariant.color;
            return `
              <button
                type="button"
                class="io-detail-color-pill ${isSelected ? 'is-selected' : ''}"
                data-action="select-color"
                data-group="${escapeHtml(product.groupId)}"
                data-color="${escapeHtml(colorOpt.color)}"
                aria-pressed="${isSelected}"
              >
                <span class="io-color-circle-fill" style="background-color: ${escapeHtml(colorOpt.colorHex)}" aria-hidden="true"></span>
                <span>${escapeHtml(colorOpt.color)}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;

  const sizeButtonsHtml = variantsForColor
    .map((variant) => {
      const isSelected = variant.producto_id === activeVariant.producto_id;
      const isOut = variant.stock === 0;
      return `
        <button
          type="button"
          class="io-size-btn ${isSelected ? 'is-selected' : ''}"
          data-action="select-size-variant"
          data-group="${escapeHtml(product.groupId)}"
          data-variant-id="${variant.producto_id}"
          aria-pressed="${isSelected}"
          aria-disabled="${isOut}"
        >
          ${escapeHtml(variant.talla)}
        </button>
      `;
    })
    .join('');

  const stockBadgeHtml =
    activeVariant.stock === 0
      ? `<span class="io-detail-stock is-out">${icons.xCircle(15)} Agotado en esta talla</span>`
      : activeVariant.stock <= activeVariant.stock_minimo
        ? `<span class="io-detail-stock is-low">${icons.alertTriangle(15)} ¡Últimas ${activeVariant.stock} unidades!${colorblindMode ? ' · RN-INV-03' : ''}</span>`
        : `<span class="io-detail-stock is-ok">${icons.checkCircle(15)} En stock (${activeVariant.stock} disponibles)</span>`;

  return `
    <div class="io-drawer-backdrop" data-action="close-product-detail" aria-hidden="true"></div>
    <div
      class="io-modal io-product-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-producto"
    >
      <button
        type="button"
        class="io-detail-close-btn"
        data-action="close-product-detail"
        aria-label="Cerrar detalles de ${escapeHtml(product.nombre)}"
      >
        ${icons.x(18)}
      </button>

      <div class="io-detail-grid">
        <div class="io-detail-visual">
          <div class="io-detail-media-box">
            ${renderProductVisualContent(product, activeVariant)}
          </div>
        </div>

        <div class="io-detail-info">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
            <span class="io-eyebrow mb-0">${escapeHtml(product.marca)}</span>
            <span class="io-detail-sku">SKU: ${escapeHtml(activeVariant.sku)}</span>
          </div>

          <h2 id="titulo-detalle-producto" class="io-display io-detail-title">
            ${escapeHtml(product.nombre)}
          </h2>

          <div class="d-flex flex-wrap align-items-baseline gap-3 mb-3">
            <span class="io-detail-price">S/ ${activeVariant.precio_venta.toFixed(2)}</span>
            ${
              product.precio_regular && product.precio_regular > activeVariant.precio_venta
                ? `<del class="io-product-price-old" style="font-size: 1rem">S/ ${product.precio_regular.toFixed(2)}</del>`
                : ''
            }
            ${stockBadgeHtml}
          </div>

          <p class="io-detail-desc">${escapeHtml(product.descripcion)}</p>

          ${
            product.materialDetalle
              ? `
                <div class="io-detail-material">
                  ${icons.sparkles(15)}
                  <span>${escapeHtml(product.materialDetalle)}</span>
                </div>
              `
              : ''
          }

          <div class="mb-3">
            <div class="small fw-semibold mb-2" style="color: var(--color-ink)">
              Color: <span class="fw-normal" style="color: var(--color-ink-muted)">${escapeHtml(activeVariant.color)}${colorblindMode ? ` (${escapeHtml(activeVariant.color_textura)})` : ''}</span>
            </div>
            ${colorOptionsHtml}
          </div>

          <div class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="small fw-semibold" style="color: var(--color-ink)">Selecciona tu talla</span>
              <button
                type="button"
                class="io-link-inline-btn"
                data-action="open-size-guide-from-detail"
              >
                ${icons.ruler(14)}
                <span>Guía de tallas</span>
              </button>
            </div>
            <div class="d-flex flex-wrap gap-2" role="group" aria-label="Tallas disponibles">
              ${sizeButtonsHtml}
            </div>
          </div>

          ${
            detailFeedback
              ? `
                <div class="io-detail-added-banner" role="status" aria-live="polite">
                  <span>${icons.checkCircle(16)} ${escapeHtml(detailFeedback)}</span>
                  <button type="button" class="io-link-inline-btn fw-bold" data-action="open-cart-from-detail">
                    Ver bolsa →
                  </button>
                </div>
              `
              : ''
          }

          <div class="d-flex flex-wrap gap-2 mt-auto">
            <button
              type="button"
              class="io-btn-primary flex-grow-1 py-3"
              data-action="add-to-cart"
              data-group="${escapeHtml(product.groupId)}"
              data-variant-id="${activeVariant.producto_id}"
              ${activeVariant.stock === 0 ? 'disabled aria-disabled="true"' : ''}
            >
              ${icons.bag(18)}
              <span>${activeVariant.stock === 0 ? 'Agotado en esta talla' : `Agregar a la bolsa · S/ ${activeVariant.precio_venta.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

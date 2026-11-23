import {
  CategorySlug,
  ProductGroup,
  ProductVariant,
  TexturePatternId,
} from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderImageSlot } from './imageSlot';

function renderTextureSwatchSvg(
  colorHex: string,
  patternId: TexturePatternId,
  uid: string
): string {
  const pid = `pattern-${patternId}-${uid}`;
  let patternDef = '';

  if (patternId === 'jaspeado') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="${colorHex}"/>
        <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.48)"/>
        <circle cx="5" cy="5" r="0.8" fill="rgba(0,0,0,0.3)"/>
      </pattern>
    `;
  } else if (patternId === 'raya-fina') {
    patternDef = `
      <pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill="${colorHex}"/>
        <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(255,255,255,0.55)" stroke-width="1.4"/>
      </pattern>
    `;
  } else if (patternId === 'diagonal') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="${colorHex}"/>
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.45)" stroke-width="1.6"/>
      </pattern>
    `;
  } else if (patternId === 'punteado') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="${colorHex}"/>
        <circle cx="3" cy="3" r="1.2" fill="rgba(38,30,27,0.55)"/>
      </pattern>
    `;
  } else if (patternId === 'cuadricula') {
    patternDef = `
      <pattern id="${pid}" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="${colorHex}"/>
        <path d="M 7 0 L 0 0 0 7" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      </pattern>
    `;
  }

  return `
    <svg class="io-color-swatch" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      ${patternDef ? `<defs>${patternDef}</defs>` : ''}
      <rect width="28" height="28" fill="${patternId === 'solido' ? colorHex : `url(#${pid})`}"/>
    </svg>
  `;
}

function renderProductCard(
  product: ProductGroup,
  selectedVariantId: number
): string {
  const activeVariant =
    product.variants.find((v) => v.producto_id === selectedVariantId) ??
    product.variants.find((v) => v.stock > 0) ??
    product.variants[0];

  const uniqueColors: ProductVariant[] = [];
  const seenColors = new Set<string>();
  for (const v of product.variants) {
    if (!seenColors.has(v.color)) {
      seenColors.add(v.color);
      uniqueColors.push(v);
    }
  }

  const variantsForColor = product.variants.filter(
    (v) => v.color === activeVariant.color
  );

  const stockBadge =
    activeVariant.stock === 0
      ? `<span class="io-stock-badge is-out">${icons.xCircle(15)}<span>Agotado</span></span>`
      : activeVariant.stock <= activeVariant.stock_minimo
        ? `<span class="io-stock-badge is-low">${icons.alertTriangle(15)}<span>Últimas ${activeVariant.stock}</span></span>`
        : `<span class="io-stock-badge is-ok">${icons.checkCircle(15)}<span>${activeVariant.stock} disp.</span></span>`;

  const colorButtonsHtml = uniqueColors
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
        `${product.groupId}-${colorOpt.producto_id}`
      )}
          <span class="small" style="line-height: 1.2">
            <strong class="d-block" style="color: var(--color-ink)">${escapeHtml(colorOpt.color)}</strong>
            <span style="color: var(--color-ink-muted)">${escapeHtml(colorOpt.color_textura)}</span>
          </span>
        </button>
      `;
    })
    .join('');

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

  return `
    <div class="col-12 col-sm-6 col-lg-4 col-xl-3 io-reveal">
      <article class="io-product-card">
        <div class="io-product-media">
          ${renderImageSlot({
    slotKey: activeVariant.imageSlotKey,
    alt: activeVariant.alt_text,
    aspectRatio: '3 / 4',
  })}
        </div>

        <h3 class="io-product-title">${escapeHtml(product.nombre)}</h3>

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span class="io-product-price">
            S/ ${activeVariant.precio_venta.toFixed(2)}
          </span>
          ${stockBadge}
        </div>

        <div class="mb-3">
          <div class="d-flex flex-column gap-2" role="group" aria-label="Colores para ${escapeHtml(product.nombre)}">
            ${colorButtonsHtml}
          </div>
        </div>

        <div class="mb-3">
          <div class="d-flex flex-wrap gap-2" role="group" aria-label="Tallas para ${escapeHtml(product.nombre)}">
            ${sizeButtonsHtml}
          </div>
        </div>

        <div class="mt-auto pt-2">
          <button
            type="button"
            class="io-btn-primary w-100"
            data-action="add-to-cart"
            data-group="${escapeHtml(product.groupId)}"
            data-variant-id="${activeVariant.producto_id}"
            ${activeVariant.stock === 0 ? 'disabled aria-disabled="true"' : ''}
          >
            ${icons.bag(18)}
            <span>${activeVariant.stock === 0 ? 'Agotado' : 'Agregar'}</span>
          </button>
        </div>
      </article>
    </div>
  `;
}

export function renderProductCatalog(
  products: ProductGroup[],
  totalCatalogCount: number,
  selectedCategory: CategorySlug,
  selectedSize: string,
  sortBy: 'relevancia' | 'precio-asc' | 'precio-desc',
  availableSizes: string[],
  selectedVariants: Record<string, number>
): string {
  if (totalCatalogCount === 0) {
    return `
      <section id="seccion-catalogo" aria-labelledby="heading-catalogo" class="mb-5">
        <div class="io-section-head">
          <h2 id="heading-catalogo" class="io-display io-section-title">Catálogo</h2>
        </div>
        <div class="io-empty io-empty--panel" role="status" aria-live="polite">
          <span class="io-empty-icon">${icons.bag(30)}</span>
          <p class="io-empty-title">Sin productos cargados aún</p>
          <p class="small mb-0">Se mostrarán aquí al conectar la base de datos.</p>
        </div>
      </section>
    `;
  }

  const hasActiveFilters = selectedCategory !== 'todas' || selectedSize !== 'todas';

  const sizeOptionsHtml = availableSizes
    .map(
      (size) =>
        `<option value="${escapeHtml(size)}" ${selectedSize === size ? 'selected' : ''}>Talla ${escapeHtml(size)}</option>`
    )
    .join('');

  const bodyHtml =
    products.length === 0
      ? `
        <div class="io-empty io-empty--panel" role="status" aria-live="polite">
          <span class="io-empty-icon">${icons.search(30)}</span>
          <p class="io-empty-title">Sin resultados</p>
          <p class="small mb-3">Prueba con otra categoría, talla o palabra clave.</p>
          <button type="button" class="io-btn-primary" data-action="reset-filters">
            ${icons.filterX(18)}
            <span>Ver todo</span>
          </button>
        </div>
      `
      : `
        <div class="row g-4 io-product-grid">
          ${products
        .map((product) =>
          renderProductCard(
            product,
            selectedVariants[product.groupId] ??
            product.variants.find((v) => v.stock > 0)?.producto_id ??
            product.variants[0].producto_id
          )
        )
        .join('')}
        </div>
      `;

  return `
    <section id="seccion-catalogo" aria-labelledby="heading-catalogo" class="mb-5">
      <div class="io-filterbar">
        <h2 id="heading-catalogo" class="io-display" style="font-size: 1.6rem; margin: 0">Catálogo <span class="fw-normal" style="color: var(--color-ink-muted)">(${products.length})</span></h2>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <select
            id="filtro-talla"
            aria-label="Filtrar por talla"
            class="form-select"
            style="min-width: 130px"
          >
            <option value="todas" ${selectedSize === 'todas' ? 'selected' : ''}>Tallas: Todas</option>
            ${sizeOptionsHtml}
          </select>

          <select
            id="orden-catalogo"
            aria-label="Ordenar catálogo"
            class="form-select"
            style="min-width: 155px"
          >
            <option value="relevancia" ${sortBy === 'relevancia' ? 'selected' : ''}>Destacados</option>
            <option value="precio-asc" ${sortBy === 'precio-asc' ? 'selected' : ''}>Menor precio</option>
            <option value="precio-desc" ${sortBy === 'precio-desc' ? 'selected' : ''}>Mayor precio</option>
          </select>

          ${hasActiveFilters
      ? `<button type="button" class="io-btn-outline" data-action="reset-filters">
                   ${icons.filterX(16)}
                   <span>Limpiar</span>
                 </button>`
      : ''
    }
        </div>
      </div>

      ${bodyHtml}
    </section>
  `;
}

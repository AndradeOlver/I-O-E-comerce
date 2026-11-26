import { IMAGE_SLOTS } from '../data/imageSlots';
import {
  CategorySlug,
  ProductGroup,
  ProductVariant,
  TexturePatternId,
} from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

export function renderTextureSwatchSvg(
  colorHex: string,
  patternId: TexturePatternId,
  uid: string,
  circular = false
): string {
  const pid = `pattern-${patternId}-${uid}`;
  let patternDef = '';

  if (patternId === 'jaspeado') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="${colorHex}"/>
        <circle cx="2" cy="2" r="1.2" fill="rgba(250,247,242,0.72)"/>
        <circle cx="5" cy="5" r="1.0" fill="rgba(26,21,18,0.68)"/>
      </pattern>
    `;
  } else if (patternId === 'raya-fina') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="${colorHex}"/>
        <line x1="1" y1="0" x2="1" y2="6" stroke="rgba(250,247,242,0.78)" stroke-width="1.6"/>
        <line x1="2.6" y1="0" x2="2.6" y2="6" stroke="rgba(26,21,18,0.55)" stroke-width="1"/>
      </pattern>
    `;
  } else if (patternId === 'diagonal') {
    patternDef = `
      <pattern id="${pid}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="${colorHex}"/>
        <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(250,247,242,0.75)" stroke-width="2"/>
        <line x1="2" y1="0" x2="2" y2="7" stroke="rgba(26,21,18,0.55)" stroke-width="1"/>
      </pattern>
    `;
  } else if (patternId === 'punteado') {
    patternDef = `
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="${colorHex}"/>
        <circle cx="3" cy="3" r="1.5" fill="rgba(26,21,18,0.75)"/>
        <circle cx="3" cy="3" r="0.6" fill="rgba(250,247,242,0.72)"/>
      </pattern>
    `;
  } else if (patternId === 'cuadricula') {
    patternDef = `
      <pattern id="${pid}" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="${colorHex}"/>
        <path d="M 7 0 L 0 0 0 7" fill="none" stroke="rgba(250,247,242,0.76)" stroke-width="1.4"/>
        <path d="M 7 1.4 L 1.4 1.4 1.4 7" fill="none" stroke="rgba(26,21,18,0.5)" stroke-width="0.9"/>
      </pattern>
    `;
  }

  const fillVal = patternId === 'solido' ? colorHex : `url(#${pid})`;

  if (circular) {
    return `
      <svg class="io-circle-pattern-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        ${patternDef ? `<defs>${patternDef}</defs>` : ''}
        <rect width="24" height="24" rx="2" fill="${fillVal}"/>
      </svg>
    `;
  }

  return `
    <svg class="io-color-swatch" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      ${patternDef ? `<defs>${patternDef}</defs>` : ''}
      <rect width="28" height="28" rx="2" fill="${fillVal}"/>
    </svg>
  `;
}

export function renderProductVisualContent(
  product: ProductGroup,
  activeVariant: ProductVariant
): string {
  const slot = IMAGE_SLOTS[activeVariant.imageSlotKey];
  const imgSrc = product.customImageUrl?.trim() || slot?.src?.trim() || '';

  const logoFallbackHtml = `
    <div
      class="io-product-logo-fallback"
      style="--garment-tint: ${escapeHtml(activeVariant.colorHex)}"
      role="img"
      aria-label="Imagen de respaldo con logo institucional I&O para ${escapeHtml(product.nombre)} en tono ${escapeHtml(activeVariant.color)}"
    >
      <div class="io-product-logo-frame">
        <img
          src="/img/brand/logo-io.png"
          alt="Logo I&O"
          class="io-product-fallback-logo"
          data-fallback-logo
        />
        <span class="io-product-fallback-monogram" data-fallback-monogram hidden>I&amp;O</span>
      </div>
      <span class="io-product-tone-chip" aria-hidden="true">
        <span class="io-product-tone-dot" style="background-color: ${escapeHtml(activeVariant.colorHex)}"></span>
        <span>${escapeHtml(activeVariant.color)}</span>
      </span>
    </div>
  `;

  if (!imgSrc) {
    return logoFallbackHtml;
  }

  return `
    <img
      src="${escapeHtml(imgSrc)}"
      alt="${escapeHtml(activeVariant.alt_text)}"
      class="io-product-photo"
      loading="lazy"
      data-product-photo
    />
    <div class="d-none" data-product-fallback-tpl>
      ${logoFallbackHtml}
    </div>
  `;
}

export function getUniqueProductColors(product: ProductGroup): ProductVariant[] {
  const uniqueColors: ProductVariant[] = [];
  const seenColors = new Set<string>();
  for (const v of product.variants) {
    if (!seenColors.has(v.color)) {
      seenColors.add(v.color);
      uniqueColors.push(v);
    }
  }
  return uniqueColors;
}

function renderColorCircleButton(
  product: ProductGroup,
  colorOpt: ProductVariant,
  activeColor: string,
  colorblindMode: boolean,
  isCompactExtra = false
): string {
  const isSelected = colorOpt.color === activeColor;
  const innerVisual = colorblindMode
    ? renderTextureSwatchSvg(
        colorOpt.colorHex,
        colorOpt.patternId,
        `card-${product.groupId}-${colorOpt.producto_id}-${isCompactExtra ? 'x' : 'm'}`,
        true
      )
    : `<span class="io-color-circle-fill" style="background-color: ${escapeHtml(colorOpt.colorHex)}" aria-hidden="true"></span>`;

  return `
    <button
      type="button"
      class="io-color-circle-btn ${isCompactExtra ? 'is-extra' : ''} ${isSelected ? 'is-selected' : ''}"
      data-action="select-color"
      data-group="${escapeHtml(product.groupId)}"
      data-color="${escapeHtml(colorOpt.color)}"
      aria-label="Seleccionar color ${escapeHtml(colorOpt.color)}${colorblindMode ? ` (${escapeHtml(colorOpt.color_textura)})` : ''}"
      aria-pressed="${isSelected}"
      title="${escapeHtml(colorOpt.color)}${colorblindMode ? ` · ${escapeHtml(colorOpt.color_textura)}` : ''}"
    >
      ${innerVisual}
    </button>
  `;
}

export function renderProductCard(
  product: ProductGroup,
  selectedVariantId: number,
  colorblindMode = false,
  isWishlisted = false
): string {
  const activeVariant =
    product.variants.find((v) => v.producto_id === selectedVariantId) ??
    product.variants.find((v) => v.stock > 0) ??
    product.variants[0];

  const uniqueColors = getUniqueProductColors(product);
  const primaryColors = uniqueColors.slice(0, 2);
  const extraColors = uniqueColors.slice(2);

  const badgeText =
    product.badgeLabel ??
    (product.recienLlegado ? 'Nuevo' : product.destacado ? 'Destacado' : '');
  const hasOffer = Boolean(
    product.precio_regular && product.precio_regular > activeVariant.precio_venta
  );
  const discountPct =
    hasOffer && product.precio_regular
      ? Math.round(((product.precio_regular - activeVariant.precio_venta) / product.precio_regular) * 100)
      : 0;

  const daltonismPanelHtml = colorblindMode
    ? `
      <div class="io-daltonism-card-panel" role="status" aria-live="polite">
        <div class="d-flex align-items-center gap-2">
          ${renderTextureSwatchSvg(
            activeVariant.colorHex,
            activeVariant.patternId,
            `readout-${product.groupId}-${activeVariant.producto_id}`
          )}
          <div class="io-daltonism-card-text">
            <strong>${escapeHtml(activeVariant.color)}</strong>
            <span>${escapeHtml(activeVariant.color_textura)} · RN-ACC-02</span>
          </div>
        </div>
        <div class="io-daltonism-stock-line ${activeVariant.stock === 0 ? 'is-out' : activeVariant.stock <= activeVariant.stock_minimo ? 'is-low' : 'is-ok'}">
          ${
            activeVariant.stock === 0
              ? `${icons.xCircle(14)} <span>Agotado en talla ${escapeHtml(activeVariant.talla)}</span>`
              : activeVariant.stock <= activeVariant.stock_minimo
                ? `${icons.alertTriangle(14)} <span>Últimas ${activeVariant.stock} uds (RN-INV-03)</span>`
                : `${icons.checkCircle(14)} <span>Disponible (${activeVariant.stock} uds)</span>`
          }
        </div>
      </div>
    `
    : '';

  const extraColorsHtml =
    extraColors.length > 0
      ? `
        <div class="io-color-more-wrap">
          <span class="io-more-colors-label">+colores</span>
          <div class="io-color-circles-extra" role="group" aria-label="Más colores de ${escapeHtml(product.nombre)}">
            ${extraColors
              .map((c) =>
                renderColorCircleButton(product, c, activeVariant.color, colorblindMode, true)
              )
              .join('')}
          </div>
        </div>
      `
      : '';

  return `
    <div class="col-12 col-sm-6 col-lg-3 io-reveal">
      <article class="io-product-card ${colorblindMode ? 'is-colorblind' : ''}">
        <div class="io-product-media-wrap">
          <button
            type="button"
            class="io-product-media"
            data-action="open-product-detail"
            data-group="${escapeHtml(product.groupId)}"
            aria-label="Ver imagen y detalles de ${escapeHtml(product.nombre)}"
          >
            ${renderProductVisualContent(product, activeVariant)}
          </button>

          ${
            badgeText
              ? `<span class="io-product-floating-badge">${escapeHtml(badgeText)}</span>`
              : ''
          }

          <button
            type="button"
            class="io-product-wish-btn ${isWishlisted ? 'is-active' : ''}"
            data-action="toggle-wishlist-item"
            data-group="${escapeHtml(product.groupId)}"
            aria-label="${isWishlisted ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${escapeHtml(product.nombre)}"
            aria-pressed="${isWishlisted}"
          >
            ${icons.heart(16)}
          </button>
        </div>

        <div class="io-product-body">
          <div class="io-product-meta-row">
            <span class="io-product-brand">${escapeHtml(product.marca)}</span>
            ${
              hasOffer && product.precio_regular
                ? `<span class="io-product-offer-badge">Oferta · -${discountPct}%</span>`
                : ''
            }
          </div>

          <div class="io-product-price-wrap">
            <span class="io-product-price io-num">S/ ${activeVariant.precio_venta.toFixed(2)}</span>
            ${
              hasOffer && product.precio_regular
                ? `<del class="io-product-price-old io-num">S/ ${product.precio_regular.toFixed(2)}</del>`
                : ''
            }
          </div>

          <h3 class="io-product-title">
            <button
              type="button"
              class="io-product-title-btn"
              data-action="open-product-detail"
              data-group="${escapeHtml(product.groupId)}"
            >
              ${escapeHtml(product.nombre)}
            </button>
          </h3>

          <p class="io-product-desc">${escapeHtml(product.descripcion)}</p>
        </div>

        ${
          colorblindMode
            ? daltonismPanelHtml
            : `<div class="io-product-active-tone">Color: <strong>${escapeHtml(activeVariant.color)}</strong></div>`
        }

        <div class="io-product-footer-bar">
          <div class="io-color-box" role="group" aria-label="Selector de colores para ${escapeHtml(product.nombre)}">
            <div class="io-color-circles-main">
              ${primaryColors
                .map((c) =>
                  renderColorCircleButton(product, c, activeVariant.color, colorblindMode, false)
                )
                .join('')}
            </div>
            ${extraColorsHtml}
          </div>

          <button
            type="button"
            class="io-btn-ver-detalles"
            data-action="open-product-detail"
            data-group="${escapeHtml(product.groupId)}"
            aria-label="Ver detalles de ${escapeHtml(product.nombre)}"
          >
            <span>Ver detalles</span>
            ${icons.arrowRight(14)}
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
  selectedVariants: Record<string, number>,
  colorblindMode = false,
  wishlistGroups: Set<string> = new Set(),
  selectedBrand = 'todas'
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
          <p class="small mb-0">Pronto incorporaremos nuevas piezas de estación.</p>
        </div>
      </section>
    `;
  }

  const hasActiveFilters =
    selectedCategory !== 'todas' || selectedSize !== 'todas' || selectedBrand !== 'todas';

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
          <p class="io-empty-title">No encontramos coincidencias</p>
          <p class="small mb-3">Prueba explorando otra categoría, marca, talla o palabra clave.</p>
          <button type="button" class="io-btn-primary" data-action="reset-filters">
            ${icons.filterX(18)}
            <span>Restablecer filtros</span>
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
                  product.variants[0].producto_id,
                colorblindMode,
                wishlistGroups.has(product.groupId)
              )
            )
            .join('')}
        </div>
      `;

  return `
    <section id="seccion-catalogo" aria-labelledby="heading-catalogo" class="mb-5">
      <div class="io-filterbar">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <h2 id="heading-catalogo" class="io-display" style="font-size: 1.65rem; margin: 0">
            Piezas seleccionadas <span class="fw-normal" style="color: var(--color-ink-muted)">(${products.length})</span>
          </h2>
          ${
            selectedBrand !== 'todas'
              ? `
                <button type="button" class="io-cat-chip is-active ms-1" data-action="clear-brand-filter" aria-label="Quitar filtro de marca ${escapeHtml(selectedBrand)}">
                  <span>Marca: ${escapeHtml(selectedBrand)}</span>
                  <span class="ms-2" aria-hidden="true">×</span>
                </button>
              `
              : ''
          }
        </div>

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
            style="min-width: 160px"
          >
            <option value="relevancia" ${sortBy === 'relevancia' ? 'selected' : ''}>Curaduría I&amp;O</option>
            <option value="precio-asc" ${sortBy === 'precio-asc' ? 'selected' : ''}>Menor precio</option>
            <option value="precio-desc" ${sortBy === 'precio-desc' ? 'selected' : ''}>Mayor precio</option>
          </select>

          ${
            hasActiveFilters
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

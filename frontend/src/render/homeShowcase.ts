import { ProductGroup } from '../types/store.types';
import { icons } from '../utils/icons';
import { renderProductCard } from './productCatalog';

interface ShowcaseSectionOptions {
  products: ProductGroup[];
  selectedVariants: Record<string, number>;
  colorblindMode: boolean;
  wishlistGroups?: Set<string>;
}

/**
 * Sección independiente 1: Recién Llegados
 */
export function renderNewArrivalsSection({
  products,
  selectedVariants,
  colorblindMode,
  wishlistGroups = new Set(),
}: ShowcaseSectionOptions): string {
  const arrivals = products.filter((p) => p.recienLlegado);
  const visible = arrivals.length > 0 ? arrivals : products.slice(0, 4);

  if (visible.length === 0) return '';

  return `
    <section
      id="seccion-recien-llegados"
      aria-labelledby="heading-recien-llegados"
      class="io-home-section"
    >
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Nuevos Ingresos · Edición Reciente</span>
          <h2 id="heading-recien-llegados" class="io-display io-section-title">
            Recién Llegados
          </h2>
          <p class="io-section-lead mb-0">
            Las últimas siluetas incorporadas esta semana a nuestro archivo contemporáneo en Lima.
          </p>
        </div>

        <a
          href="#/categoria/todas"
          class="io-btn-outline text-decoration-none"
          data-action="go-category"
          data-category="todas"
        >
          <span>Ver novedades</span>
          ${icons.chevronRight(16)}
        </a>
      </div>

      <div class="row g-4 io-product-grid">
        ${visible
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
    </section>
  `;
}

/**
 * Sección independiente 2: Lo Más Destacado
 */
export function renderFeaturedSection({
  products,
  selectedVariants,
  colorblindMode,
  wishlistGroups = new Set(),
}: ShowcaseSectionOptions): string {
  const featured = products.filter((p) => p.destacado);
  const visible = featured.length > 0 ? featured : products.slice(0, 4);

  if (visible.length === 0) return '';

  return `
    <section
      id="seccion-destacados"
      aria-labelledby="heading-destacados"
      class="io-home-section io-featured-band"
    >
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Favoritos de la Casa · Íconos I&amp;O</span>
          <h2 id="heading-destacados" class="io-display io-section-title">
            Lo Más Destacado
          </h2>
          <p class="io-section-lead mb-0">
            Las piezas más elegidas por su corte impecable, caída textil y versatilidad diaria.
          </p>
        </div>

        <a
          href="#/categoria/todas"
          class="io-btn-outline text-decoration-none"
          data-action="go-category"
          data-category="todas"
        >
          <span>Explorar favoritos</span>
          ${icons.chevronRight(16)}
        </a>
      </div>

      <div class="row g-4 io-product-grid">
        ${visible
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
    </section>
  `;
}

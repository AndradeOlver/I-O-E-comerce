import { HomeShowcaseTab, ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderProductCard } from './productCatalog';

interface HomeShowcaseOptions {
  products: ProductGroup[];
  activeTab: HomeShowcaseTab;
  selectedVariants: Record<string, number>;
  colorblindMode: boolean;
}

export function renderHomeShowcase({
  products,
  activeTab,
  selectedVariants,
  colorblindMode,
}: HomeShowcaseOptions): string {
  const featured = products.filter((p) => p.destacado);
  const arrivals = products.filter((p) => p.recienLlegado);

  const visibleProducts =
    activeTab === 'destacados'
      ? featured.length > 0
        ? featured
        : products.slice(0, 4)
      : arrivals.length > 0
        ? arrivals
        : products.slice(0, 4);

  const cardsHtml =
    visibleProducts.length === 0
      ? `
        <div class="io-empty io-empty--panel" role="status" aria-live="polite">
          <span class="io-empty-icon">${icons.bag(30)}</span>
          <p class="io-empty-title">Sin prendas disponibles en esta selección</p>
          <p class="small mb-0">Pronto sumaremos nuevas piezas de temporada.</p>
        </div>
      `
      : `
        <div class="row g-4 io-product-grid" id="panel-vitrina-${escapeHtml(activeTab)}" role="tabpanel" aria-labelledby="tab-vitrina-${escapeHtml(activeTab)}">
          ${visibleProducts
            .map((product) =>
              renderProductCard(
                product,
                selectedVariants[product.groupId] ??
                  product.variants.find((v) => v.stock > 0)?.producto_id ??
                  product.variants[0].producto_id,
                colorblindMode
              )
            )
            .join('')}
        </div>
      `;

  return `
    <section id="seccion-vitrina" aria-labelledby="heading-vitrina" class="mb-5 pt-2">
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Selección I&amp;O</span>
          <h2 id="heading-vitrina" class="io-display io-section-title">
            ${activeTab === 'destacados' ? 'Productos Destacados' : 'Recién Llegados'}
          </h2>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="io-showcase-tabs" role="tablist" aria-label="Alternar entre destacados y recién llegados">
            <button
              type="button"
              id="tab-vitrina-destacados"
              role="tab"
              aria-selected="${activeTab === 'destacados'}"
              aria-controls="panel-vitrina-destacados"
              class="io-showcase-tab ${activeTab === 'destacados' ? 'is-active' : ''}"
              data-action="switch-showcase-tab"
              data-tab="destacados"
            >
              <span>Destacados</span>
              <span class="io-showcase-count">(${featured.length})</span>
            </button>
            <button
              type="button"
              id="tab-vitrina-recien-llegados"
              role="tab"
              aria-selected="${activeTab === 'recien-llegados'}"
              aria-controls="panel-vitrina-recien-llegados"
              class="io-showcase-tab ${activeTab === 'recien-llegados' ? 'is-active' : ''}"
              data-action="switch-showcase-tab"
              data-tab="recien-llegados"
            >
              <span>Recién llegados</span>
              <span class="io-showcase-count">(${arrivals.length})</span>
            </button>
          </div>

          <a
            href="#/categoria/todas"
            class="io-btn-outline text-decoration-none"
            data-action="go-category"
            data-category="todas"
          >
            <span>Ver catálogo</span>
            ${icons.chevronRight(16)}
          </a>
        </div>
      </div>

      ${cardsHtml}
    </section>
  `;
}

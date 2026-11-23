import { Categoria, CategorySlug, ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderProductCatalog } from './productCatalog';

interface CategoryPageOptions {
  categories: Categoria[];
  currentCategory: Categoria | null;
  selectedCategory: CategorySlug;
  products: ProductGroup[];
  totalCatalogCount: number;
  selectedSize: string;
  sortBy: 'relevancia' | 'precio-asc' | 'precio-desc';
  availableSizes: string[];
  selectedVariants: Record<string, number>;
}

export function renderCategoryPage({
  categories,
  currentCategory,
  selectedCategory,
  products,
  totalCatalogCount,
  selectedSize,
  sortBy,
  availableSizes,
  selectedVariants,
}: CategoryPageOptions): string {
  const pageTitle = currentCategory ? currentCategory.nombre : 'Todas las categorías';

  const chipsHtml = [
    `<a href="#/categoria/todas" class="io-cat-chip ${selectedCategory === 'todas' ? 'is-active' : ''}" data-action="go-category" data-category="todas">Todas</a>`,
    ...categories.map(
      (cat) => `
        <a
          href="#/categoria/${escapeHtml(cat.slug)}"
          class="io-cat-chip ${selectedCategory === cat.slug ? 'is-active' : ''}"
          data-action="go-category"
          data-category="${escapeHtml(cat.slug)}"
        >
          ${escapeHtml(cat.nombre)}
        </a>
      `
    ),
  ].join('');

  return `
    <div class="container-xl py-4">
      <div class="mb-3">
        <a
          href="#/"
          class="io-btn-outline text-decoration-none"
          data-action="go-home"
        >
          ${icons.chevronLeft(18)}
          <span>Volver al inicio</span>
        </a>
      </div>

      <header class="io-section-head flex-column align-items-start">
        <div>
          <span class="io-eyebrow">Tienda</span>
          <h1 class="io-display io-section-title">${escapeHtml(pageTitle)}</h1>
        </div>
        <nav aria-label="Cambiar de categoría" class="d-flex flex-wrap gap-2">
          ${chipsHtml}
        </nav>
      </header>

      ${renderProductCatalog(
        products,
        totalCatalogCount,
        selectedCategory,
        selectedSize,
        sortBy,
        availableSizes,
        selectedVariants
      )}
    </div>
  `;
}

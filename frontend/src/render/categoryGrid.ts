import { Categoria, CategorySlug, ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderImageSlot } from './imageSlot';

export function renderCategoryGrid(
  categories: Categoria[],
  _products: ProductGroup[],
  selectedCategory: CategorySlug
): string {
  const tilesHtml = categories
    .map((cat) => {
      const isActive = selectedCategory === cat.slug;

      return `
        <a
          href="#/categoria/${escapeHtml(cat.slug)}"
          role="listitem"
          class="io-category-tile text-decoration-none ${isActive ? 'is-active' : ''}"
          data-action="go-category"
          data-category="${escapeHtml(cat.slug)}"
        >
          ${renderImageSlot({
            slotKey: cat.imageSlotKey,
            alt: `Categoría ${cat.nombre}`,
            aspectRatio: '1 / 1',
            compact: true,
          })}
          <span class="io-category-tile-title">${escapeHtml(cat.nombre)}</span>
        </a>
      `;
    })
    .join('');

  return `
    <section id="seccion-categorias" aria-labelledby="heading-categorias" class="mb-5">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 id="heading-categorias" class="h4 fw-bold mb-0">Categorías</h2>

        <a
          href="#/categoria/todas"
          class="io-btn-outline text-decoration-none"
          data-action="go-category"
          data-category="todas"
        >
          ${icons.grid(16)}
          <span>Todas</span>
        </a>
      </div>

      <div class="io-category-grid" role="list">
        ${tilesHtml}
      </div>
    </section>
  `;
}

import { Categoria, CategorySlug, ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderImageSlot } from './imageSlot';

export function renderCategoryGrid(
  categories: Categoria[],
  _products: ProductGroup[],
  selectedCategory: CategorySlug
): string {
  const tilesHtml = categories
    .map((cat, idx) => {
      const isActive = selectedCategory === cat.slug;

      return `
        <a
          href="#/categoria/${escapeHtml(cat.slug)}"
          role="listitem"
          class="io-category-tile io-reveal ${isActive ? 'is-active' : ''}"
          style="--i: ${idx}"
          data-action="go-category"
          data-category="${escapeHtml(cat.slug)}"
        >
          <div class="io-category-tile-media">
            ${renderImageSlot({
              slotKey: cat.imageSlotKey,
              alt: `Categoría ${cat.nombre}`,
              aspectRatio: '4 / 5',
              compact: true,
            })}
          </div>
          <div class="io-category-tile-footer">
            <span class="io-category-tile-title">
              ${escapeHtml(cat.nombre)}
              <span class="io-category-tile-arrow" aria-hidden="true">→</span>
            </span>
          </div>
        </a>
      `;
    })
    .join('');

  return `
    <section id="seccion-categorias" aria-labelledby="heading-categorias" class="mb-5">
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Colección</span>
          <h2 id="heading-categorias" class="io-display io-section-title">Categorías</h2>
        </div>

        <a
          href="#/categoria/todas"
          class="io-btn-outline text-decoration-none"
          data-action="go-category"
          data-category="todas"
        >
          <span>Todas</span>
          ${icons.chevronRight(16)}
        </a>
      </div>

      <div class="io-category-grid" role="list">
        ${tilesHtml}
      </div>
    </section>
  `;
}

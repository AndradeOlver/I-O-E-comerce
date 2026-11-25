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
              alt: `${cat.nombre} — ${cat.descripcion}`,
              aspectRatio: '4 / 5',
              compact: true,
            })}
          </div>

          <div class="io-category-tile-footer">
            <div class="io-category-tile-copy">
              <span class="io-category-tile-title">
                ${escapeHtml(cat.nombre)}
              </span>
              ${
                cat.subtitulo
                  ? `<span class="io-category-tile-sub">${escapeHtml(cat.subtitulo)}</span>`
                  : ''
              }
            </div>
            <span class="io-category-tile-arrow" aria-hidden="true">
              ${icons.arrowRight(18)}
            </span>
          </div>
        </a>
      `;
    })
    .join('');

  return `
    <section id="seccion-categorias" aria-labelledby="heading-categorias" class="io-home-section">
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Categorías</span>
          <h2 id="heading-categorias" class="io-display io-section-title">Explorar por categoría</h2>
        </div>

        <a
          href="#/categoria/todas"
          class="io-btn-outline text-decoration-none"
          data-action="go-category"
          data-category="todas"
        >
          <span>Todas</span>
          ${icons.arrowRight(16)}
        </a>
      </div>

      <div class="io-category-grid" role="list">
        ${tilesHtml}
      </div>
    </section>
  `;
}

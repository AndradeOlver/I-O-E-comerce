import { MarcaTienda } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

export function renderBrandsSection(brands: MarcaTienda[]): string {
  if (brands.length === 0) return '';

  const brandItemsHtml = brands
    .map(
      (brand) => `
        <button
          type="button"
          class="io-brand-card"
          data-action="filter-brand"
          data-brand="${escapeHtml(brand.nombre)}"
          aria-label="Ver prendas de la marca ${escapeHtml(brand.nombre)}: ${escapeHtml(brand.especialidad)}"
        >
          <span class="io-brand-monogram" aria-hidden="true">${escapeHtml(brand.monograma)}</span>
          <span class="io-brand-card-body">
            <strong class="io-brand-card-name">${escapeHtml(brand.nombre)}</strong>
            <span class="io-brand-card-spec">${escapeHtml(brand.especialidad)}</span>
          </span>
          <span class="io-brand-card-arrow" aria-hidden="true">${icons.chevronRight(14)}</span>
        </button>
      `
    )
    .join('');

  return `
    <section id="seccion-marcas" aria-labelledby="heading-marcas" class="io-brands-strip">
      <div class="io-brands-strip-head">
        <div>
          <span class="io-eyebrow mb-1">Marcas</span>
          <h2 id="heading-marcas" class="io-display io-brands-strip-title">Nuestras Marcas</h2>
        </div>
        <p class="io-brands-strip-copy mb-0">
          Firmas del catálogo I&amp;O agrupadas por línea textil.
        </p>
      </div>

      <div class="io-brands-grid" role="list" aria-label="Marcas disponibles en I&O">
        ${brandItemsHtml}
      </div>
    </section>
  `;
}

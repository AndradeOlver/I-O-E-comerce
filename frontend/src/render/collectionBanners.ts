import { CollectionBanner } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { hasImageSlotSrc, renderImageSlot } from './imageSlot';

export function renderCollectionBanners(banners: CollectionBanner[]): string {
  if (banners.length === 0) return '';

  const cardsHtml = banners
    .map((banner, idx) => {
      const filterAttrs = [
        `href="#/categoria/${escapeHtml(banner.category)}"`,
        `data-action="go-category"`,
        `data-category="${escapeHtml(banner.category)}"`,
      ];
      if (banner.gender) filterAttrs.push(`data-filter-gender="${escapeHtml(banner.gender)}"`);
      if (banner.ageGroup) filterAttrs.push(`data-filter-age="${escapeHtml(banner.ageGroup)}"`);
      if (banner.onlyOffers) filterAttrs.push(`data-filter-offers="true"`);

      const hasMedia = hasImageSlotSrc(banner.imageSlotKey);
      const mediaHtml = hasMedia
        ? `
          <div class="io-collection-media" aria-hidden="true">
            ${renderImageSlot({
              slotKey: banner.imageSlotKey,
              alt: banner.alt_text,
              aspectRatio: '16 / 10',
              compact: true,
            })}
          </div>
          <div class="io-collection-scrim" aria-hidden="true"></div>
        `
        : '';

      return `
        <article class="io-collection-card ${hasMedia ? '' : 'io-collection-card--typographic'} io-reveal" style="--i: ${idx}">
          ${mediaHtml}
          <div class="io-collection-content">
            <span class="io-collection-eyebrow">${escapeHtml(banner.eyebrow)}</span>
            <h3 class="io-display io-collection-title">${escapeHtml(banner.titulo)}</h3>
            <p class="io-collection-desc">${escapeHtml(banner.descripcion)}</p>
            <a class="io-collection-cta" ${filterAttrs.join(' ')}>
              <span>${escapeHtml(banner.ctaLabel)}</span>
              ${icons.chevronRight(16)}
            </a>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section id="seccion-colecciones" aria-labelledby="heading-colecciones" class="mb-5 pt-2">
      <div class="io-section-head">
        <div>
          <span class="io-eyebrow">Estilos &amp; Públicos</span>
          <h2 id="heading-colecciones" class="io-display io-section-title">Colecciones de Temporada</h2>
        </div>
      </div>

      <div class="io-collection-grid">
        ${cardsHtml}
      </div>
    </section>
  `;
}

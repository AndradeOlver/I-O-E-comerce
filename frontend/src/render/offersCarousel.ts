import { CampanaOferta } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderImageSlot } from './imageSlot';

export function renderOffersCarousel(
  offers: CampanaOferta[],
  activeIndex: number,
  isPaused: boolean,
  colorblindMode = false
): string {
  const validOffers = offers.filter(
    (offer) => offer.activa && offer.aprobada_dueno && offer.stock_consumido < offer.stock_maximo
  );

  if (validOffers.length === 0) return '';

  const safeIndex = ((activeIndex % validOffers.length) + validOffers.length) % validOffers.length;

  const slidesHtml = validOffers
    .map((offer, idx) => {
      const isActive = idx === safeIndex;
      const mainTitle = offer.portadaTexto ?? offer.titulo;
      const italicLine = offer.tituloItalico ?? '';
      const remainingUnits = Math.max(0, offer.stock_maximo - offer.stock_consumido);
      const headingTag = idx === 0 ? 'h1' : 'h2';

      const daltonismMetaHtml = colorblindMode
        ? `
          <div class="io-carousel-a11y-meta">
            ${icons.checkCircle(14)}
            <span>Stock: <strong>${remainingUnits}/${offer.stock_maximo} uds</strong> · Hasta ${escapeHtml(offer.fecha_fin)}</span>
          </div>
        `
        : '';

      return `
        <div
          class="io-carousel-slide ${isActive ? 'is-active' : ''}"
          data-slide-index="${idx}"
          aria-hidden="${!isActive}"
        >
          ${renderImageSlot({
            slotKey: offer.imageSlotKey,
            alt: offer.alt_text,
            aspectRatio: '16 / 7',
            responsivePicture: true,
            ambientBackdrop: true,
          })}

          <div class="io-carousel-scrim" aria-hidden="true"></div>

          <div class="io-carousel-overlay">
            ${
              offer.badgeTexto
                ? `
                  <div class="io-carousel-meta-top">
                    <span class="io-carousel-badge">${escapeHtml(offer.badgeTexto)}</span>
                  </div>
                `
                : ''
            }

            <${headingTag} class="io-carousel-title">
              <span>${escapeHtml(mainTitle)}</span>
              ${italicLine ? `<span class="io-carousel-title-sub">${escapeHtml(italicLine)}</span>` : ''}
            </${headingTag}>

            ${daltonismMetaHtml}

            <div class="io-carousel-actions">
              <a
                href="#/categoria/${escapeHtml(offer.categoriaTarget)}"
                class="io-carousel-cta"
                data-action="go-category"
                data-category="${escapeHtml(offer.categoriaTarget)}"
                ${offer.generoTarget && offer.generoTarget !== 'todos' ? `data-filter-gender="${escapeHtml(offer.generoTarget)}"` : ''}
                aria-label="Ver detalles de ${escapeHtml(offer.titulo)}"
              >
                <span>${escapeHtml(offer.ctaLabel ?? 'Ver detalles')}</span>
                ${icons.arrowRight(16)}
              </a>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const dotsHtml = validOffers
    .map(
      (offer, idx) => `
        <button
          type="button"
          class="io-carousel-dot io-carousel-dot--overlay ${idx === safeIndex ? 'is-active' : ''}"
          data-action="carousel-dot"
          data-index="${idx}"
          aria-label="Mostrar campaña ${idx + 1}: ${escapeHtml(offer.titulo)}"
          ${idx === safeIndex ? 'aria-current="true"' : ''}
        ></button>
      `
    )
    .join('');

  return `
    <section
      aria-roledescription="carrusel"
      aria-label="Campañas editoriales y ofertas vigentes de I&O"
      class="mb-4"
    >
      <div class="io-carousel-shell">
        <div class="io-carousel-stage">
          ${slidesHtml}

          <button
            type="button"
            class="io-carousel-nav-btn is-prev"
            data-action="carousel-prev"
            aria-label="Campaña anterior"
          >
            ${icons.chevronLeft(22)}
          </button>

          <button
            type="button"
            class="io-carousel-nav-btn is-next"
            data-action="carousel-next"
            aria-label="Siguiente campaña"
          >
            ${icons.chevronRight(22)}
          </button>

          <div class="io-carousel-controls-bar" role="group" aria-label="Controles del carrusel">
            <div class="d-flex align-items-center gap-2">
              ${dotsHtml}
            </div>

            <button
              type="button"
              class="io-carousel-pause-btn"
              data-action="carousel-toggle"
              aria-label="${isPaused ? 'Reanudar carrusel automático' : 'Pausar carrusel automático'}"
              aria-pressed="${isPaused}"
            >
              ${isPaused ? icons.play(14) : icons.pause(14)}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

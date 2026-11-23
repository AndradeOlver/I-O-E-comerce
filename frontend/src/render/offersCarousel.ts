import { CampanaOferta } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderImageSlot } from './imageSlot';

export function renderOffersCarousel(
  offers: CampanaOferta[],
  activeIndex: number,
  isPaused: boolean
): string {
  const validOffers = offers.filter(
    (offer) => offer.activa && offer.aprobada_dueno && offer.stock_consumido < offer.stock_maximo
  );

  if (validOffers.length === 0) return '';

  const safeIndex = ((activeIndex % validOffers.length) + validOffers.length) % validOffers.length;

  const slidesHtml = validOffers
    .map((offer, idx) => {
      const isActive = idx === safeIndex;
      const overlayText = offer.portadaTexto ?? offer.titulo;

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
          })}

          <div class="io-carousel-scrim" aria-hidden="true"></div>

          <div class="io-carousel-overlay">
            <h2 class="io-carousel-title">${escapeHtml(overlayText)}</h2>
            <a
              href="#/categoria/${escapeHtml(offer.categoriaTarget)}"
              class="io-carousel-cta"
              data-action="go-category"
              data-category="${escapeHtml(offer.categoriaTarget)}"
            >
              <span>Ver más</span>
              ${icons.chevronRight(18)}
            </a>
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
          aria-label="Mostrar oferta ${idx + 1}: ${escapeHtml(offer.portadaTexto ?? offer.titulo)}"
          ${idx === safeIndex ? 'aria-current="true"' : ''}
        ></button>
      `
    )
    .join('');

  return `
    <section
      aria-roledescription="carrusel"
      aria-label="Ofertas vigentes de I&O"
      class="mb-4"
    >
      <div class="io-carousel-shell">
        <div class="io-carousel-stage">
          ${slidesHtml}

          <button
            type="button"
            class="io-carousel-nav-btn is-prev"
            data-action="carousel-prev"
            aria-label="Oferta anterior"
          >
            ${icons.chevronLeft(22)}
          </button>

          <button
            type="button"
            class="io-carousel-nav-btn is-next"
            data-action="carousel-next"
            aria-label="Siguiente oferta"
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

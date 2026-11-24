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
  const totalFormatted = String(validOffers.length).padStart(2, '0');

  const slidesHtml = validOffers
    .map((offer, idx) => {
      const isActive = idx === safeIndex;
      const mainTitle = offer.portadaTexto ?? offer.titulo;
      const italicLine = offer.tituloItalico ?? '';
      const kicker = offer.kicker ?? 'COLECCIÓN DE TEMPORADA · LIMA';
      const ctaText = offer.ctaLabel ?? 'Descubrir colección';
      const remainingUnits = Math.max(0, offer.stock_maximo - offer.stock_consumido);
      const slideNum = String(idx + 1).padStart(2, '0');

      const daltonismMetaHtml = colorblindMode
        ? `
          <div class="io-carousel-a11y-meta">
            ${icons.checkCircle(14)}
            <span>Stock promocional verificado: <strong>${remainingUnits} de ${offer.stock_maximo} uds</strong> · Vigente hasta ${escapeHtml(offer.fecha_fin)} (RN-MKT-01)</span>
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
            <div class="io-carousel-meta-top">
              <span class="io-carousel-kicker">${escapeHtml(kicker)}</span>
              ${
                offer.badgeTexto
                  ? `<span class="io-carousel-badge">${escapeHtml(offer.badgeTexto)}</span>`
                  : ''
              }
            </div>

            <h2 class="io-carousel-title">
              <span>${escapeHtml(mainTitle)}</span>
              ${italicLine ? `<em class="io-carousel-title-italic">${escapeHtml(italicLine)}</em>` : ''}
            </h2>

            ${
              offer.subtitulo
                ? `<p class="io-carousel-subtitle">${escapeHtml(offer.subtitulo)}</p>`
                : ''
            }

            <div class="io-carousel-price-pill">
              <span class="io-carousel-price-label">Desde</span>
              <strong class="io-carousel-price-now">S/ ${offer.precio_promocional.toFixed(2)}</strong>
              ${
                offer.precio_regular > offer.precio_promocional
                  ? `<del class="io-carousel-price-old">S/ ${offer.precio_regular.toFixed(2)}</del>`
                  : ''
              }
            </div>

            ${daltonismMetaHtml}

            <div class="io-carousel-actions">
              <a
                href="#/categoria/${escapeHtml(offer.categoriaTarget)}"
                class="io-carousel-cta"
                data-action="go-category"
                data-category="${escapeHtml(offer.categoriaTarget)}"
                ${offer.generoTarget && offer.generoTarget !== 'todos' ? `data-filter-gender="${escapeHtml(offer.generoTarget)}"` : ''}
              >
                <span>${escapeHtml(ctaText)}</span>
                ${icons.chevronRight(18)}
              </a>

              <a
                href="#/categoria/todas"
                class="io-carousel-secondary-cta"
                data-action="go-category"
                data-category="todas"
              >
                <span>Explorar todo</span>
              </a>
            </div>

            <span class="io-carousel-index-tag" aria-hidden="true">${slideNum} / ${totalFormatted}</span>
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

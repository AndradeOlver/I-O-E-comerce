import { IMAGE_SLOTS } from '../data/imageSlots';
import { escapeHtml } from '../utils/icons';

/**
 * Marca I&O: contenedor limpio, sin marco ni adornos.
 * Intenta cargar el logo definido en IMAGE_SLOTS['brand-logo'] (SVG y luego PNG).
 * Si ningún archivo existe, muestra el texto simple "I&O".
 */

type LogoStatus = 'pending' | 'ready' | 'missing';

const slot = IMAGE_SLOTS['brand-logo'];
const candidates = [slot?.src, slot?.fallbackSrc]
  .map((value) => value?.trim() ?? '')
  .filter((value) => value.length > 0);

let candidateIndex = 0;
let status: LogoStatus = candidates.length > 0 ? 'pending' : 'missing';

export function getBrandRecommendedPath(): string {
  return slot?.recommendedPath ?? 'public/img/brand/logo-io.svg';
}

/** HTML del logo (imagen + texto de respaldo). Se reutiliza en header y menú móvil. */
export function renderBrandMark(): string {
  const textMark = `<span class="io-brand-text" data-brand-text ${status === 'ready' ? 'hidden' : ''}>I&amp;O</span>`;

  if (status === 'missing') {
    return textMark;
  }

  const currentSrc = candidates[candidateIndex];
  return `
    <img
      src="${escapeHtml(currentSrc)}"
      alt=""
      class="io-brand-logo-img ${status === 'ready' ? '' : 'is-pending'}"
      data-brand-img
    />
    ${textMark}
  `;
}

function applyStatus(scope: ParentNode): void {
  scope.querySelectorAll<HTMLImageElement>('img[data-brand-img]').forEach((img) => {
    if (status === 'ready') {
      img.classList.remove('is-pending');
    } else if (status === 'missing') {
      img.remove();
    }
  });
  scope.querySelectorAll<HTMLElement>('[data-brand-text]').forEach((text) => {
    text.hidden = status === 'ready';
  });
}

/** Conecta los eventos load/error del logo tras cada render. */
export function bindBrandLogo(scope: ParentNode): void {
  const images = scope.querySelectorAll<HTMLImageElement>('img[data-brand-img]');

  const handleLoad = (): void => {
    status = 'ready';
    applyStatus(scope);
  };

  const handleError = (img: HTMLImageElement): void => {
    // Ignora errores de una fuente que ya fue reemplazada por el siguiente candidato
    if (status === 'ready' || img.getAttribute('src') !== candidates[candidateIndex]) return;

    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      const next = candidates[candidateIndex];
      scope.querySelectorAll<HTMLImageElement>('img[data-brand-img]').forEach((el) => {
        el.setAttribute('src', next);
      });
      return;
    }

    status = 'missing';
    applyStatus(scope);
  };

  images.forEach((img) => {
    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', () => handleError(img), { once: true });
  });
}

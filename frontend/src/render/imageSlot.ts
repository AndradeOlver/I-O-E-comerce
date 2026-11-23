import { IMAGE_SLOTS } from '../data/imageSlots';
import { escapeHtml, icons } from '../utils/icons';

interface ImageSlotOptions {
  slotKey: string;
  alt: string;
  aspectRatio: string;
  compact?: boolean;
  responsivePicture?: boolean;
}

export function renderImageSlot({
  slotKey,
  alt,
  aspectRatio,
  compact = false,
  responsivePicture = false,
}: ImageSlotOptions): string {
  const config = IMAGE_SLOTS[slotKey];
  const desktopSrc = config?.src?.trim() ?? '';
  const mobileSrc = config?.mobileSrc?.trim() ?? '';
  const effectiveSrc = desktopSrc || (responsivePicture ? mobileSrc : '');
  const label = compact ? 'Sin imagen' : (config?.slotLabel ?? 'Espacio para imagen');

  const placeholderHtml = `
    <div class="d-flex flex-column align-items-center justify-content-center gap-1" data-slot-fallback>
      ${icons.imagePlus(compact ? 20 : 28)}
      <span class="fw-semibold" style="font-size: ${compact ? '0.8125rem' : '0.875rem'}; color: var(--color-ink)">
        ${escapeHtml(label)}
      </span>
      ${
        !compact && config
          ? `<div class="io-image-slot-meta">
               <div>${escapeHtml(config.dimensions)}</div>
               <code class="io-image-slot-path">${escapeHtml(config.recommendedPath)}</code>
             </div>`
          : ''
      }
    </div>
  `;

  if (!effectiveSrc) {
    return `
      <div class="io-image-slot" style="aspect-ratio: ${aspectRatio}" role="img" aria-label="${escapeHtml(label)}">
        ${placeholderHtml}
      </div>
    `;
  }

  const mediaHtml =
    responsivePicture && mobileSrc
      ? `
        <picture>
          <source media="(max-width: 767.98px)" srcset="${escapeHtml(mobileSrc)}" />
          <img
            src="${escapeHtml(effectiveSrc)}"
            alt="${escapeHtml(alt)}"
            loading="lazy"
            data-slot-img
          />
        </picture>
      `
      : `
        <img
          src="${escapeHtml(effectiveSrc)}"
          alt="${escapeHtml(alt)}"
          loading="lazy"
          data-slot-img
        />
      `;

  return `
    <div class="io-image-slot is-filled" style="aspect-ratio: ${aspectRatio}">
      ${mediaHtml}
      <div class="d-none" data-slot-fallback-hidden>
        ${placeholderHtml}
      </div>
    </div>
  `;
}

import { IMAGE_SLOTS } from '../data/imageSlots';
import { escapeHtml, icons } from '../utils/icons';

interface ImageSlotOptions {
  slotKey: string;
  alt: string;
  aspectRatio: string;
  compact?: boolean;
  responsivePicture?: boolean;
  ambientBackdrop?: boolean;
  customSrc?: string;
}

export function hasImageSlotSrc(
  slotKey: string,
  responsivePicture = false,
  customSrc?: string
): boolean {
  if (customSrc && customSrc.trim().length > 0) return true;
  const config = IMAGE_SLOTS[slotKey];
  const desktopSrc = config?.src?.trim() ?? '';
  const mobileSrc = config?.mobileSrc?.trim() ?? '';
  return Boolean(desktopSrc || (responsivePicture && mobileSrc));
}

export function renderImageSlot({
  slotKey,
  alt,
  aspectRatio,
  compact = false,
  responsivePicture = false,
  ambientBackdrop = false,
  customSrc,
}: ImageSlotOptions): string {
  const config = IMAGE_SLOTS[slotKey];
  const overrideSrc = customSrc?.trim() ?? '';
  const desktopSrc = overrideSrc || (config?.src?.trim() ?? '');
  const mobileSrc = overrideSrc || (config?.mobileSrc?.trim() ?? '');
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

  const ambientHtml = ambientBackdrop
    ? `<img src="${escapeHtml(effectiveSrc)}" alt="" aria-hidden="true" class="io-image-slot-ambient" />`
    : '';

  const mediaHtml =
    responsivePicture && mobileSrc
      ? `
        ${ambientHtml}
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
        ${ambientHtml}
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

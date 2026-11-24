import { ProductGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

export function renderWishlistDrawer(
  isOpen: boolean,
  wishlistedProducts: ProductGroup[] = []
): string {
  if (!isOpen) return '';

  const bodyHtml =
    wishlistedProducts.length === 0
      ? `
        <div class="io-empty my-auto">
          <span class="io-empty-icon">${icons.heart(30)}</span>
          <p class="io-empty-title">Tu lista de deseos está vacía</p>
          <p class="small mb-3">Toca el corazón en tus prendas favoritas para guardarlas aquí.</p>
          <button type="button" class="io-btn-primary" data-action="close-wishlist">
            <span>Seguir explorando</span>
            ${icons.chevronRight(16)}
          </button>
        </div>
      `
      : `
        <div class="p-3 overflow-auto flex-grow-1">
          <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
            ${wishlistedProducts
              .map((p) => {
                const v = p.variants[0];
                return `
                  <li class="io-cart-line d-flex align-items-center justify-content-between gap-2">
                    <div>
                      <span class="io-product-brand mb-0">${escapeHtml(p.marca)}</span>
                      <div class="fw-bold" style="color: var(--color-ink)">${escapeHtml(p.nombre)}</div>
                      <div class="small fw-semibold" style="color: var(--color-primary-espresso)">
                        S/ ${(v?.precio_venta ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        class="io-btn-ver-detalles"
                        data-action="open-product-detail"
                        data-group="${escapeHtml(p.groupId)}"
                      >
                        <span>Ver</span>
                        ${icons.chevronRight(13)}
                      </button>
                      <button
                        type="button"
                        class="io-icon-btn-danger"
                        data-action="toggle-wishlist-item"
                        data-group="${escapeHtml(p.groupId)}"
                        aria-label="Quitar ${escapeHtml(p.nombre)} de favoritos"
                      >
                        ${icons.trash(15)}
                      </button>
                    </div>
                  </li>
                `;
              })
              .join('')}
          </ul>
        </div>
      `;

  return `
    <div class="io-drawer-backdrop" data-action="close-wishlist" aria-hidden="true"></div>
    <aside class="io-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-deseados">
      <div class="io-drawer-head">
        <div class="d-flex align-items-center gap-2">
          ${icons.heart(22)}
          <h2 id="titulo-deseados" class="io-drawer-title">Favoritos</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-wishlist" aria-label="Cerrar favoritos">
          ${icons.x(18)}
          <span>Cerrar</span>
        </button>
      </div>

      ${bodyHtml}
    </aside>
  `;
}

export function renderLoginModal(isOpen: boolean, feedback: string): string {
  if (!isOpen) return '';

  return `
    <div class="io-drawer-backdrop" data-action="close-login" aria-hidden="true"></div>
    <div
      class="io-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-login"
    >
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3" style="border-bottom: 1px solid var(--color-border-subtle)">
        <div class="d-flex align-items-center gap-2">
          ${icons.user(22)}
          <h2 id="titulo-login" class="io-drawer-title">Mi Cuenta</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-login" aria-label="Cerrar inicio de sesión">
          ${icons.x(18)}
        </button>
      </div>

      ${
        feedback
          ? `<div class="io-alert" role="status" aria-live="polite"><span>${escapeHtml(feedback)}</span></div>`
          : ''
      }

      <form id="form-login" class="d-flex flex-column gap-3">
        <div>
          <label for="login-email" class="form-label small fw-semibold mb-1" style="color: var(--color-ink)">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            class="form-control"
            placeholder="cliente@io-moda.pe"
            autocomplete="email"
            required
          />
        </div>

        <div>
          <label for="login-password" class="form-label small fw-semibold mb-1" style="color: var(--color-ink)">Contraseña</label>
          <input
            id="login-password"
            type="password"
            class="form-control"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="io-btn-primary w-100 mt-1">
          <span>Ingresar</span>
          ${icons.chevronRight(16)}
        </button>
      </form>
    </div>
  `;
}

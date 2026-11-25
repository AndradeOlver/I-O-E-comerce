import { DemoSession, formatSessionExpiry, getRoleProfile } from '../auth/demoSession';
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
                      <div class="small fw-semibold io-num" style="color: var(--color-primary-espresso)">
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

export function renderAccountSessionModal(
  isOpen: boolean,
  session: DemoSession | null,
  currentReturnPath = '/index.html'
): string {
  if (!isOpen) return '';

  const encodedNext = encodeURIComponent(currentReturnPath);

  if (!session) {
    return `
      <div class="io-drawer-backdrop" data-action="close-login" aria-hidden="true"></div>
      <aside
        class="io-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-login"
      >
        <div class="io-drawer-head">
          <div class="d-flex align-items-center gap-2">
            ${icons.user(22)}
            <h2 id="titulo-login" class="io-drawer-title">Cuenta</h2>
          </div>
          <button type="button" class="io-btn-outline" data-action="close-login" aria-label="Cerrar panel de cuenta">
            ${icons.x(18)}
            <span>Cerrar</span>
          </button>
        </div>

        <div class="p-3 overflow-auto flex-grow-1 d-flex flex-column gap-3">
          <p class="mb-0" style="color: var(--color-ink); line-height: 1.55">
            Inicia sesión para guardar tus favoritos o crea tu cuenta personal. También puedes seguir navegando en la tienda como visitante.
          </p>

          <div class="d-flex flex-column gap-2 pt-1">
            <a href="/acceso.html?next=${encodedNext}&amp;required=cliente" class="io-btn-primary w-100 text-decoration-none justify-content-center">
              <span>Iniciar sesión</span>
              ${icons.arrowRight(16)}
            </a>
            <a href="/acceso.html?mode=register&amp;next=${encodedNext}" class="io-btn-outline w-100 text-decoration-none justify-content-center">
              <span>Crear cuenta</span>
            </a>
          </div>
        </div>
      </aside>
    `;
  }

  const profile = getRoleProfile(session.role);

  return `
    <div class="io-drawer-backdrop" data-action="close-login" aria-hidden="true"></div>
    <aside
      class="io-drawer-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-login"
    >
      <div class="io-drawer-head">
        <div class="d-flex align-items-center gap-2">
          ${icons.user(22)}
          <h2 id="titulo-login" class="io-drawer-title">Cuenta</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-login" aria-label="Cerrar detalle de cuenta">
          ${icons.x(18)}
          <span>Cerrar</span>
        </button>
      </div>

      <div class="p-3 overflow-auto flex-grow-1 d-flex flex-column gap-3">
        <div class="p-3 rounded" style="background-color: var(--color-surface-white); border: 1px solid var(--color-border-subtle)">
          <div class="fw-bold fs-6" style="color: var(--color-ink)">${escapeHtml(session.displayName)}</div>
          <div class="small mt-1 io-num" style="color: var(--color-ink-muted)">
            ${escapeHtml(profile.label)} · Sesión activa hasta las ${escapeHtml(formatSessionExpiry(session.expiresAt))}
          </div>
        </div>

        <div class="d-flex flex-column gap-2 pt-1">
          <button type="button" class="io-btn-primary w-100" data-action="logout-session">
            ${icons.logOut(17)}
            <span>Cerrar sesión</span>
          </button>
          <a href="/acceso.html?next=${encodedNext}" class="io-btn-outline w-100 text-decoration-none justify-content-center">
            <span>Cambiar de perfil</span>
            ${icons.arrowRight(16)}
          </a>
        </div>
      </div>
    </aside>
  `;
}

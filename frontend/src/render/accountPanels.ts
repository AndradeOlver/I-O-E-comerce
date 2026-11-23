import { escapeHtml, icons } from '../utils/icons';

export function renderWishlistDrawer(isOpen: boolean): string {
  if (!isOpen) return '';

  return `
    <div class="io-drawer-backdrop" data-action="close-wishlist" aria-hidden="true"></div>
    <aside class="io-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-deseados">
      <div class="d-flex justify-content-between align-items-center p-3 border-bottom" style="border-color: var(--color-border-subtle) !important;">
        <div class="d-flex align-items-center gap-2">
          ${icons.heart(20)}
          <h2 id="titulo-deseados" class="h5 fw-bold mb-0" style="color: var(--color-ink)">Deseados</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-wishlist" aria-label="Cerrar deseados">
          ${icons.x(18)}
          <span>Cerrar</span>
        </button>
      </div>

      <div class="p-4 text-center my-auto">
        <div class="mb-2" style="color: var(--color-ink-muted)">${icons.heart(36)}</div>
        <p class="fw-bold mb-1" style="color: var(--color-ink)">Sin favoritos aún</p>
        <p class="small mb-3" style="color: var(--color-ink-muted)">
          Guarda prendas aquí cuando el catálogo esté conectado.
        </p>
        <button type="button" class="io-btn-primary" data-action="close-wishlist">
          Seguir explorando
        </button>
      </div>
    </aside>
  `;
}

export function renderLoginModal(isOpen: boolean, feedback: string): string {
  if (!isOpen) return '';

  return `
    <div class="io-drawer-backdrop" data-action="close-login" aria-hidden="true"></div>
    <div
      class="position-fixed top-50 start-50 translate-middle bg-white rounded-1 border p-4 shadow-lg"
      style="width: min(92vw, 420px); z-index: 1055; border-color: var(--color-border-subtle) !important;"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-login"
    >
      <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style="border-color: var(--color-border-subtle) !important;">
        <div class="d-flex align-items-center gap-2">
          ${icons.user(20)}
          <h2 id="titulo-login" class="h5 fw-bold mb-0" style="color: var(--color-ink)">Iniciar sesión</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-login" aria-label="Cerrar inicio de sesión">
          ${icons.x(18)}
        </button>
      </div>

      ${
        feedback
          ? `<div class="alert alert-secondary py-2 small" role="status" style="background-color: var(--color-surface-subtle); border-color: var(--color-border-subtle); color: var(--color-ink);">${escapeHtml(feedback)}</div>`
          : ''
      }

      <form id="form-login" class="d-flex flex-column gap-3">
        <div>
          <label for="login-email" class="form-label small fw-semibold mb-1" style="color: var(--color-ink)">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            class="form-control"
            style="min-height: 44px; border-color: var(--color-border-strong)"
            placeholder="cliente@ejemplo.pe"
            required
          />
        </div>

        <div>
          <label for="login-password" class="form-label small fw-semibold mb-1" style="color: var(--color-ink)">Contraseña</label>
          <input
            id="login-password"
            type="password"
            class="form-control"
            style="min-height: 44px; border-color: var(--color-border-strong)"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="io-btn-primary w-100 mt-1">
          Ingresar
        </button>
      </form>
    </div>
  `;
}

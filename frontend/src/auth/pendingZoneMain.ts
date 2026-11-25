import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/access.css';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml, icons } from '../utils/icons';
import {
  PENDING_ZONE_CONFIG,
  formatSessionExpiry,
  getRoleProfile,
  isValidPendingZoneKey,
  logoutToAccess,
  requireZoneRole,
} from './demoSession';

const params = new URLSearchParams(window.location.search);
const zonaParam = params.get('zona');

if (!isValidPendingZoneKey(zonaParam)) {
  window.location.replace('/acceso.html?reason=rol');
} else {
  const zoneConfig = PENDING_ZONE_CONFIG[zonaParam];
  const session = requireZoneRole(zoneConfig.role, `/zona-preparacion.html?zona=${zoneConfig.key}`);

  if (session) {
    const root = document.getElementById('pending-zone-root');
    if (!root) {
      throw new Error('No se encontró #pending-zone-root');
    }

    const roleProfile = getRoleProfile(session.role);
    document.title = `I&O · ${zoneConfig.title}`;

    root.innerHTML = `
      <div class="io-pending-page">
        <header class="io-pending-topbar">
          <div class="io-pending-topbar-inner">
            <a href="/index.html" class="io-access-brand-mark text-decoration-none" aria-label="Ir a la tienda I&O">
              ${renderBrandMark()}
            </a>
            <div class="io-pending-session-meta">
              <span>
                <strong>${escapeHtml(session.displayName)}</strong>
                · ${escapeHtml(roleProfile.label)} · hasta ${escapeHtml(formatSessionExpiry(session.expiresAt))}
              </span>
              <button type="button" id="btn-pending-logout" class="io-pending-logout-btn">
                ${icons.logOut(16)}
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <main id="zona-principal" class="io-pending-main">
          <section class="io-pending-card" aria-labelledby="pending-zone-title">
            <p class="io-eyebrow mb-2">${escapeHtml(roleProfile.label)}</p>
            <h1 id="pending-zone-title" class="io-pending-title">
              ${escapeHtml(zoneConfig.title)}
            </h1>

            <p class="mb-4" style="color: var(--color-ink-muted); font-size: 0.98rem;">
              Este espacio aún no está habilitado. Por ahora no cuenta con acciones operativas.
            </p>

            <div class="d-flex flex-wrap gap-2">
              <a href="/acceso.html" class="io-access-submit text-decoration-none" style="width: auto;">
                <span>Cambiar de perfil</span>
                ${icons.arrowRight(16)}
              </a>
              <a href="/index.html" class="io-access-secondary-btn">
                ${icons.arrowLeft(16)}
                <span>Ir a la tienda</span>
              </a>
            </div>
          </section>
        </main>
      </div>
    `;

    bindBrandLogo(root);

    document.getElementById('btn-pending-logout')?.addEventListener('click', logoutToAccess);
  }
}

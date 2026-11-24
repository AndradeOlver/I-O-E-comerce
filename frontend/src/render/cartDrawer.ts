import { CartItem } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

const FREE_SHIPPING_THRESHOLD = 150;
const FLAT_URBAN_SHIPPING = 10;

export function renderCartDrawer(
  isOpen: boolean,
  items: CartItem[],
  secondsRemaining: number,
  optInMarketing: boolean,
  colorblindMode = false
): string {
  if (!isOpen) return '';

  const subtotal = items.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0);
  const qualifiesFreeShipping = subtotal > FREE_SHIPPING_THRESHOLD;
  const shippingCost = items.length === 0 ? 0 : qualifiesFreeShipping ? 0 : FLAT_URBAN_SHIPPING;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal + 0.01);
  const total = subtotal + shippingCost;

  const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const secs = String(secondsRemaining % 60).padStart(2, '0');
  const progressPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const itemsHtml = items
    .map(
      (item) => `
        <li class="io-cart-line">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-bold" style="color: var(--color-ink)">${escapeHtml(item.nombre)}</div>
              <div class="small" style="color: var(--color-ink-muted)">
                ${escapeHtml(item.talla)} · ${escapeHtml(item.color)}${colorblindMode ? ` (${escapeHtml(item.color_textura)})` : ''}
              </div>
            </div>
            <button
              type="button"
              class="io-icon-btn-danger"
              data-action="cart-remove"
              data-producto-id="${item.producto_id}"
              aria-label="Quitar ${escapeHtml(item.nombre)}"
            >
              ${icons.trash(16)}
            </button>
          </div>

          <div class="d-flex justify-content-between align-items-center">
            <div class="d-inline-flex align-items-center gap-2">
              <button
                type="button"
                class="io-size-btn"
                data-action="cart-qty"
                data-producto-id="${item.producto_id}"
                data-delta="-1"
                aria-label="Disminuir cantidad"
              >
                ${icons.minus(16)}
              </button>
              <span class="fw-bold px-2" style="color: var(--color-ink)">${item.cantidad}</span>
              <button
                type="button"
                class="io-size-btn"
                data-action="cart-qty"
                data-producto-id="${item.producto_id}"
                data-delta="1"
                aria-label="Aumentar cantidad"
                ${item.cantidad >= item.maxStock ? 'disabled' : ''}
              >
                ${icons.plus(16)}
              </button>
            </div>

            <strong style="color: var(--color-primary-espresso)">
              S/ ${(item.precio_venta * item.cantidad).toFixed(2)}
            </strong>
          </div>
        </li>
      `
    )
    .join('');

  return `
    <div class="io-drawer-backdrop" data-action="close-cart" aria-hidden="true"></div>
    <aside class="io-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-bolsa">
      <div class="io-drawer-head">
        <div class="d-flex align-items-center gap-2">
          ${icons.bag(22)}
          <h2 id="titulo-bolsa" class="io-drawer-title">Bolsa</h2>
        </div>
        <button type="button" class="io-btn-outline" data-action="close-cart" aria-label="Cerrar bolsa">
          ${icons.x(18)}
          <span>Cerrar</span>
        </button>
      </div>

      <div class="p-3 overflow-auto flex-grow-1">
        ${
          items.length > 0
            ? `
              <div class="io-reserve-box">
                <div class="d-flex align-items-center justify-content-between small fw-bold mb-2">
                  <span class="d-inline-flex align-items-center gap-1" style="color: var(--color-ink)">
                    ${icons.clock(15)} Reserva de prendas
                  </span>
                  <span
                    class="badge"
                    role="timer"
                    data-cart-timer
                    style="background-color: var(--color-primary-espresso); color: #faf7f2"
                  >${mins}:${secs} min</span>
                </div>
                <div class="progress" style="height: 6px" role="progressbar" aria-label="Progreso hacia el envío gratis" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-bar io-progress-fill" style="width: ${progressPct}%; background-color: var(--color-accent-terracotta)"></div>
                </div>
                <div class="small mt-2" style="color: var(--color-ink-muted)" role="status" aria-live="polite">
                  ${
                    qualifiesFreeShipping
                      ? `✓ ¡Tienes envío de cortesía incluido!${colorblindMode ? ' (RN-ENV-04)' : ''}`
                      : `Agrega S/ ${remainingForFree.toFixed(2)} más para envío gratis${colorblindMode ? ' (RN-ENV-04)' : ''}.`
                  }
                </div>
              </div>

              <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
                ${itemsHtml}
              </ul>
            `
            : `
              <div class="io-empty">
                <span class="io-empty-icon">${icons.bag(30)}</span>
                <p class="io-empty-title">Tu bolsa está vacía</p>
                <p class="small mb-3">Explora las colecciones y agrega tus prendas favoritas.</p>
                <button type="button" class="io-btn-primary" data-action="close-cart">
                  <span>Seguir explorando</span>
                  ${icons.chevronRight(16)}
                </button>
              </div>
            `
        }
      </div>

      ${
        items.length > 0
          ? `
            <div class="io-cart-summary">
              <div class="d-flex justify-content-between mb-1 small" style="color: var(--color-ink-muted)">
                <span>Subtotal:</span>
                <span>S/ ${subtotal.toFixed(2)}</span>
              </div>
              <div class="d-flex justify-content-between mb-2 small" style="color: var(--color-ink-muted)">
                <span>Envío urbano:</span>
                <span>${shippingCost === 0 ? '<strong style="color: var(--color-success-ok)">GRATIS</strong>' : `S/ ${shippingCost.toFixed(2)}`}</span>
              </div>
              <div class="d-flex justify-content-between mb-3 h5 fw-bold" style="color: var(--color-ink)">
                <span>Total:</span>
                <span style="color: var(--color-primary-espresso)">S/ ${total.toFixed(2)}</span>
              </div>

              <div class="form-check mb-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="opt-in-marketing"
                  ${optInMarketing ? 'checked' : ''}
                />
                <label class="form-check-label small" for="opt-in-marketing" style="color: var(--color-ink-muted)">
                  Deseo recibir preventas, lanzamientos y novedades exclusivas de I&amp;O${colorblindMode ? ' (Consentimiento explícito RN-MKT-03)' : ''}.
                </label>
              </div>

              <button
                type="button"
                class="io-btn-primary w-100 py-3"
                data-action="cart-checkout"
                data-total="${total.toFixed(2)}"
              >
                <span>Proceder al pago seguro</span>
                ${icons.chevronRight(18)}
              </button>
            </div>
          `
          : ''
      }
    </aside>
  `;
}

import { CartItem } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

const FREE_SHIPPING_THRESHOLD = 150;
const FLAT_URBAN_SHIPPING = 10;

export function renderCartDrawer(
  isOpen: boolean,
  items: CartItem[],
  secondsRemaining: number,
  optInMarketing: boolean
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
        <li class="p-3 border rounded-1 bg-white" style="border-color: var(--color-border-subtle) !important;">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-bold" style="color: var(--color-ink)">${escapeHtml(item.nombre)}</div>
              <div class="small" style="color: var(--color-ink-muted)">
                ${escapeHtml(item.talla)} · ${escapeHtml(item.color)}
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              style="min-width: 44px; min-height: 44px; border-radius: var(--radius-sm)"
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
      <div class="d-flex justify-content-between align-items-center p-3 border-bottom" style="border-color: var(--color-border-subtle) !important;">
        <div class="d-flex align-items-center gap-2">
          ${icons.bag(20)}
          <h2 id="titulo-bolsa" class="h5 fw-bold mb-0" style="color: var(--color-ink)">Bolsa</h2>
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
              <div
                class="p-2 mb-3 rounded-1 border"
                style="background-color: var(--color-surface-subtle); border-color: var(--color-border-subtle) !important;"
                role="status"
                aria-live="polite"
              >
                <div class="d-flex align-items-center justify-content-between small fw-bold mb-1">
                  <span class="d-inline-flex align-items-center gap-1" style="color: var(--color-ink)">
                    ${icons.clock(15)} Reserva de prendas
                  </span>
                  <span class="badge" style="background-color: var(--color-primary-espresso); color: #faf7f2">${mins}:${secs} min</span>
                </div>
                <div class="progress" style="height: 6px; background-color: var(--color-border-subtle)" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-bar" style="width: ${progressPct}%; background-color: var(--color-accent-terracotta)"></div>
                </div>
                <div class="small mt-1" style="color: var(--color-ink-muted)">
                  ${
                    qualifiesFreeShipping
                      ? '✓ ¡Tienes envío gratis incluido!'
                      : `Agrega S/ ${remainingForFree.toFixed(2)} más para envío gratis (RN-ENV-04).`
                  }
                </div>
              </div>

              <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
                ${itemsHtml}
              </ul>
            `
            : `
              <div class="text-center py-5">
                <div class="mb-2" style="color: var(--color-ink-muted)">${icons.bag(40)}</div>
                <p class="fw-bold mb-1" style="color: var(--color-ink)">Tu bolsa está vacía</p>
                <p class="small" style="color: var(--color-ink-muted)">
                  Explora las colecciones y agrega tus prendas favoritas.
                </p>
              </div>
            `
        }
      </div>

      ${
        items.length > 0
          ? `
            <div class="p-3 border-top" style="border-color: var(--color-border-subtle) !important; background-color: var(--color-surface-card)">
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
                  id="cart-optin-marketing"
                  data-action="toggle-optin"
                  ${optInMarketing ? 'checked' : ''}
                />
                <label class="form-check-label small" for="cart-optin-marketing" style="color: var(--color-ink-muted)">
                  Acepto recibir novedades y promociones exclusivas de I&O (Consentimiento explícito RN-MKT-03).
                </label>
              </div>

              <button
                type="button"
                class="io-btn-primary w-100 py-3"
                data-action="checkout-start"
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

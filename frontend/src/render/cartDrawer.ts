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
        <li class="p-3 border rounded-3 bg-white">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-bold">${escapeHtml(item.nombre)}</div>
              <div class="small" style="color: var(--color-ink-muted)">
                ${escapeHtml(item.talla)} · ${escapeHtml(item.color)}
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              style="min-width: 44px; min-height: 44px"
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
              <span class="fw-bold px-2">${item.cantidad}</span>
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

            <strong style="color: var(--color-primary-navy)">
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
      <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
        <div class="d-flex align-items-center gap-2">
          ${icons.bag(20)}
          <h2 id="titulo-bolsa" class="h5 fw-bold mb-0">Bolsa</h2>
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
                class="p-2 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
                style="background-color: var(--color-primary-navy); color: #ffffff"
                aria-live="polite"
              >
                <span class="small d-inline-flex align-items-center gap-2">
                  ${icons.clock(16)}
                  <span>Reserva</span>
                </span>
                <strong style="color: var(--color-accent-gold)">${mins}:${secs}</strong>
              </div>

              <div class="p-3 rounded-3 border mb-3 bg-light">
                <div class="d-flex align-items-center gap-2 small fw-semibold mb-2">
                  ${icons.truck(16)}
                  ${
                    qualifiesFreeShipping
                      ? `<span style="color: var(--color-success-ok)">Envío gratis activo</span>`
                      : `<span>Faltan <strong>S/ ${remainingForFree.toFixed(2)}</strong> para envío gratis</span>`
                  }
                </div>
                <div class="progress" style="height: 8px" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
                  <div
                    class="progress-bar"
                    style="width: ${progressPct}%; background-color: ${
                      qualifiesFreeShipping ? 'var(--color-success-ok)' : 'var(--color-primary-navy)'
                    }"
                  ></div>
                </div>
              </div>
              <ul class="list-unstyled d-flex flex-column gap-3 mb-0">${itemsHtml}</ul>
            `
            : `
              <div class="text-center py-5">
                <div class="mb-2" style="color: var(--color-ink-muted)">${icons.bag(36)}</div>
                <p class="fw-bold mb-3">Bolsa vacía</p>
                <button type="button" class="io-btn-primary" data-action="close-cart">Seguir viendo</button>
              </div>
            `
        }
      </div>

      ${
        items.length > 0
          ? `
            <div class="p-3 border-top bg-light">
              <div class="d-flex justify-content-between small mb-1">
                <span>Subtotal (IGV inc.)</span>
                <span>S/ ${subtotal.toFixed(2)}</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span>Envío Lima</span>
                <span>${shippingCost === 0 ? 'Gratis' : `S/ ${shippingCost.toFixed(2)}`}</span>
              </div>
              <div class="d-flex justify-content-between fw-bold fs-5 mb-3">
                <span>Total</span>
                <span>S/ ${total.toFixed(2)}</span>
              </div>

              <div class="form-check mb-3">
                <input
                  id="opt-in-marketing"
                  class="form-check-input"
                  type="checkbox"
                  ${optInMarketing ? 'checked' : ''}
                />
                <label for="opt-in-marketing" class="form-check-label small">
                  Recibir ofertas por correo (opcional)
                </label>
              </div>

              <div class="d-flex gap-2">
                <button type="button" class="io-btn-outline" data-action="cart-clear">Vaciar</button>
                <button
                  type="button"
                  class="io-btn-gold flex-grow-1"
                  data-action="cart-checkout"
                  data-total="${total.toFixed(2)}"
                >
                  Ir a pagar
                </button>
              </div>
            </div>
          `
          : ''
      }
    </aside>
  `;
}

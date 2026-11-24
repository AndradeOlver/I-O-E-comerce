import { Categoria } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

export type FooterInfoTopic =
  | 'cambios'
  | 'guia-tallas'
  | 'faq'
  | 'terminos'
  | 'privacidad'
  | 'reclamaciones';

const FOOTER_TOPIC_CONTENT: Record<
  FooterInfoTopic,
  { eyebrow: string; title: string; bodyHtml: string }
> = {
  cambios: {
    eyebrow: 'Atención al Cliente',
    title: 'Cambios y Devoluciones',
    bodyHtml: `
      <p class="small mb-2">Puedes solicitar cambios de talla o color hasta <strong>15 días calendario</strong> después de recibir tu pedido, presentando tu Boleta o Factura electrónica y la prenda con etiquetas intactas.</p>
      <ul class="small ps-3 mb-0">
        <li class="mb-1">Cambios presenciales sin costo en nuestra tienda física en Lima.</li>
        <li class="mb-1">Cancelaciones online disponibles antes de que el pedido pase a estado <em>En envío</em> (RN-ECO-05).</li>
        <li>Reembolsos procesados con Nota de Crédito correlativa (RN-TRI-03).</li>
      </ul>
    `,
  },
  'guia-tallas': {
    eyebrow: 'Atención al Cliente',
    title: 'Guía de Tallas I&O',
    bodyHtml: `
      <p class="small mb-2">Nuestras prendas siguen horma peruana estándar. Si dudas entre dos tallas en corte oversize, elige la menor.</p>
      <div class="table-responsive">
        <table class="table table-sm small mb-0">
          <thead>
            <tr><th>Talla</th><th>Pecho (cm)</th><th>Cintura (cm)</th><th>Pantalón</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>S</strong></td><td>88 – 94</td><td>72 – 78</td><td>28 – 30</td></tr>
            <tr><td><strong>M</strong></td><td>95 – 101</td><td>79 – 85</td><td>30 – 32</td></tr>
            <tr><td><strong>L</strong></td><td>102 – 109</td><td>86 – 93</td><td>32 – 34</td></tr>
          </tbody>
        </table>
      </div>
    `,
  },
  faq: {
    eyebrow: 'Atención al Cliente',
    title: 'Preguntas Frecuentes',
    bodyHtml: `
      <dl class="small mb-0">
        <dt class="fw-semibold">¿Cuál es el costo de envío en Lima?</dt>
        <dd class="mb-2">El envío urbano es <strong>GRATIS</strong> en compras mayores a S/ 150.00 (RN-ENV-04). Realizamos hasta 2 intentos de entrega con validación de DNI.</dd>
        <dt class="fw-semibold">¿Cuánto tiempo se reserva mi bolsa?</dt>
        <dd class="mb-2">Al agregar una prenda, reservamos el stock por <strong>15 minutos</strong> (RN-ECO-03) para evitar quiebres de inventario durante tu pago.</dd>
        <dt class="fw-semibold">¿Los precios incluyen IGV?</dt>
        <dd class="mb-0">Sí, todos los precios publicados incluyen el 18% de IGV (RN-TRI-01) y emitimos Boleta o Factura electrónica.</dd>
      </dl>
    `,
  },
  terminos: {
    eyebrow: 'Marco Legal',
    title: 'Términos y Condiciones',
    bodyHtml: `
      <p class="small mb-2">Operado por <strong>I&amp;O · Lima, Perú</strong> (RUC: <strong>10458796321</strong>). Todas las promociones indican vigencia y stock máximo disponible conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571).</p>
      <p class="small mb-0">Los pagos con tarjeta o billeteras digitales se procesan mediante pasarelas externas certificadas PCI-DSS; I&amp;O nunca almacena datos de tarjeta ni CVV (RN-SEG-02).</p>
    `,
  },
  privacidad: {
    eyebrow: 'Marco Legal · Ley N° 29733',
    title: 'Política de Privacidad',
    bodyHtml: `
      <p class="small mb-2">Protegemos tus datos personales conforme a la <strong>Ley N° 29733 (Ley de Protección de Datos Personales del Perú)</strong>.</p>
      <p class="small mb-0">El envío de novedades o promociones requiere tu consentimiento <em>opt-in</em> explícito y voluntario (RN-MKT-03), sin casillas pre-marcadas. Puedes ejercer tus derechos ARCO escribiendo a <code>privacidad@io-moda.pe</code>.</p>
    `,
  },
  reclamaciones: {
    eyebrow: 'INDECOPI · Ley N° 29571',
    title: 'Libro de Reclamaciones Virtual',
    bodyHtml: `
      <p class="small mb-2">Conforme al Código de Protección y Defensa del Consumidor, ponemos a tu disposición nuestro <strong>Libro de Reclamaciones Virtual</strong>.</p>
      <ul class="small ps-3 mb-2">
        <li><strong>Proveedor:</strong> Comercializadora Retail I&amp;O · Lima, Perú</li>
        <li><strong>RUC:</strong> 10458796321</li>
        <li><strong>Plazo de atención:</strong> Máximo 15 días hábiles desde el registro.</li>
      </ul>
      <p class="small mb-0">El formulario con generación de hoja de reclamación correlativa se habilitará en línea al conectar el backend de atención.</p>
    `,
  },
};

export function renderFooter(
  categories: Categoria[],
  colorblindMode = false
): string {
  const categoryLinksHtml = categories
    .map(
      (cat) => `
        <li>
          <a
            href="#/categoria/${escapeHtml(cat.slug)}"
            class="io-footer-link"
            data-action="go-category"
            data-category="${escapeHtml(cat.slug)}"
          >
            ${escapeHtml(cat.nombre)}
          </a>
        </li>
      `
    )
    .join('');

  return `
    <footer class="io-footer" role="contentinfo">
      <div class="container-xl">
        <div class="io-footer-grid">
          <div class="io-footer-col">
            <strong class="io-footer-brand d-block mb-2">I&amp;O · Lima, Perú</strong>
            <p class="io-footer-copy mb-3">
              Moda contemporánea en algodón pima peruano y básicos minerales para hombre, mujer y niños. Tienda física en Lima y envíos omnicanal a todo el Perú.
            </p>
            <div class="d-flex flex-wrap gap-2" aria-label="Redes sociales de I&O">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                class="io-footer-social-btn"
                aria-label="Instagram de I&O"
              >
                ${icons.instagram(18)}
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                class="io-footer-social-btn"
                aria-label="TikTok de I&O"
              >
                ${icons.tiktok(18)}
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                class="io-footer-social-btn"
                aria-label="Facebook de I&O"
              >
                ${icons.facebook(18)}
              </a>
              <a
                href="https://wa.me/51999111222?text=Hola%20I%26O%2C%20necesito%20ayuda%20con%20un%20pedido"
                target="_blank"
                rel="noopener noreferrer"
                class="io-footer-social-btn"
                aria-label="WhatsApp de I&O"
              >
                ${icons.whatsapp(18)}
              </a>
            </div>
          </div>

          <div class="io-footer-col">
            <h2 class="io-footer-heading">Categorías</h2>
            <ul class="io-footer-list io-footer-list--cats">
              ${categoryLinksHtml}
            </ul>
          </div>

          <div class="io-footer-col">
            <h2 class="io-footer-heading">Atención al Cliente</h2>
            <ul class="io-footer-list">
              <li>
                <button type="button" class="io-footer-link" data-action="open-footer-info" data-topic="cambios">
                  Cambios y devoluciones
                </button>
              </li>
              <li>
                <button type="button" class="io-footer-link" data-action="open-footer-info" data-topic="guia-tallas">
                  Guía de tallas
                </button>
              </li>
              <li>
                <button type="button" class="io-footer-link" data-action="open-footer-info" data-topic="faq">
                  Preguntas frecuentes
                </button>
              </li>
              <li>
                <a
                  href="https://wa.me/51999111222?text=Hola%20I%26O%2C%20quisiera%20consultar%20por%20una%20prenda"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="io-footer-link io-footer-link--whatsapp"
                >
                  ${icons.whatsapp(16)}
                  <span>Contacto por WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="io-footer-col">
            <h2 class="io-footer-heading">Legal y Consumidor</h2>
            <ul class="io-footer-list mb-3">
              <li>
                <button type="button" class="io-footer-link" data-action="open-footer-info" data-topic="terminos">
                  Términos y condiciones
                </button>
              </li>
              <li>
                <button type="button" class="io-footer-link" data-action="open-footer-info" data-topic="privacidad">
                  Política de privacidad
                </button>
              </li>
            </ul>

            <div class="io-a11y-zone-card mb-2" role="region" aria-label="Zona de accesibilidad visual">
              <div class="d-flex align-items-center justify-content-between gap-2">
                <span class="d-inline-flex align-items-center gap-2">
                  <span class="io-reclamaciones-icon" aria-hidden="true">${icons.eye(18)}</span>
                  <span>
                    <strong class="d-block" style="font-size: 0.85rem">Modo Daltonismo</strong>
                    <span class="io-reclamaciones-sub">Texturas y tramas en colores</span>
                  </span>
                </span>
                <button
                  type="button"
                  id="switch-daltonismo-footer"
                  role="switch"
                  aria-checked="${colorblindMode}"
                  class="io-a11y-pill ${colorblindMode ? 'is-active' : ''}"
                  data-action="toggle-colorblind-mode"
                >
                  ${colorblindMode ? 'Activo' : 'Activar'}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="io-reclamaciones-card"
              data-action="open-footer-info"
              data-topic="reclamaciones"
              aria-label="Abrir información del Libro de Reclamaciones Virtual"
            >
              <span class="io-reclamaciones-icon" aria-hidden="true">${icons.bookOpen(22)}</span>
              <span class="text-start">
                <strong class="d-block">Libro de Reclamaciones</strong>
                <span class="io-reclamaciones-sub">INDECOPI · Ley N° 29571</span>
              </span>
            </button>
          </div>
        </div>

        <div class="io-footer-bottom">
          <strong class="io-footer-bottom-brand">I&amp;O · Lima, Perú</strong>
          <span class="io-footer-meta">
            ${
              colorblindMode
                ? 'Modo Daltonismo Activo (RN-ACC-01 a RN-ACC-06) · Precios con IGV 18% (RN-TRI-01) · RUC: 10458796321'
                : 'Todos los precios incluyen IGV · Atelier &amp; Tienda Oficial Lima · RUC 10458796321'
            }
          </span>
        </div>
      </div>
    </footer>
  `;
}

export function renderFooterInfoModal(topic: FooterInfoTopic | null): string {
  if (!topic) return '';
  const content = FOOTER_TOPIC_CONTENT[topic];

  return `
    <div class="io-drawer-backdrop" data-action="close-footer-info" aria-hidden="true"></div>
    <div class="io-modal-wrap" role="presentation">
      <div
        class="io-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-footer-info"
      >
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <span class="io-eyebrow">${escapeHtml(content.eyebrow)}</span>
            <h2 id="titulo-modal-footer-info" class="io-display mb-0" style="font-size: 1.75rem">
              ${escapeHtml(content.title)}
            </h2>
          </div>
          <button
            type="button"
            class="io-btn-outline"
            style="min-width: 44px; padding: 0.4rem"
            data-action="close-footer-info"
            aria-label="Cerrar ventana informativa"
          >
            ${icons.x(18)}
          </button>
        </div>

        <div class="mb-4" style="color: var(--color-ink)">
          ${content.bodyHtml}
        </div>

        <div class="d-flex justify-content-end">
          <button type="button" class="io-btn-primary" data-action="close-footer-info">
            Entendido
          </button>
        </div>
      </div>
    </div>
  `;
}

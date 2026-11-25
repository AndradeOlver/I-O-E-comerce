import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/access.css';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { escapeHtml, icons } from '../utils/icons';
import {
  AccessRedirectReason,
  DEMO_ROLE_PROFILES,
  DemoRole,
  DemoSession,
  clearDemoSession,
  createClientDemoSession,
  formatSessionExpiry,
  getActiveDemoSession,
  getRequiredRoleForPath,
  getRoleProfile,
  isValidDemoRole,
  resolvePostLoginDestination,
  sanitizeNextPath,
  startDemoSession,
} from './demoSession';

type AccessMode = 'login' | 'register';

interface BannerState {
  kind: 'info' | 'warn' | 'error' | 'success';
  text: string;
}

interface RegisterFields {
  name: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
}

interface RegisterErrors {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
}

const rootEl = document.getElementById('acceso-root');
if (!rootEl) {
  throw new Error('No se encontró #acceso-root');
}
const root: HTMLElement = rootEl;

const searchParams = new URLSearchParams(window.location.search);
const rawNext = searchParams.get('next');
const safeNext = sanitizeNextPath(rawNext);
const reasonParam = searchParams.get('reason') as AccessRedirectReason | null;
const modeParam = searchParams.get('mode');
const requiredParam = searchParams.get('required');
const requiredRoleFromQuery: DemoRole | null = isValidDemoRole(requiredParam)
  ? requiredParam
  : safeNext
    ? getRequiredRoleForPath(safeNext)
    : null;

const initialSessionCheck = getActiveDemoSession();
const initialRole: DemoRole = requiredRoleFromQuery ?? 'cliente';
const initialProfile = getRoleProfile(initialRole);

function buildInitialBanner(): BannerState | null {
  if (reasonParam === 'rol' && requiredRoleFromQuery) {
    const reqProfile = getRoleProfile(requiredRoleFromQuery);
    return {
      kind: 'warn',
      text: `Para entrar a ${reqProfile.area} necesitas el perfil ${reqProfile.label}. Selecciónalo abajo para continuar.`,
    };
  }
  if (reasonParam === 'sin_sesion') {
    if (requiredRoleFromQuery) {
      const reqProfile = getRoleProfile(requiredRoleFromQuery);
      return {
        kind: 'info',
        text: `Inicia sesión con el perfil ${reqProfile.label} para entrar a ${reqProfile.area}.`,
      };
    }
    return {
      kind: 'info',
      text: 'Elige tu perfil para entrar a tu espacio en I&O.',
    };
  }
  if (reasonParam === 'expirada' || initialSessionCheck.expired) {
    return {
      kind: 'warn',
      text: 'Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.',
    };
  }
  if (reasonParam === 'logout') {
    return {
      kind: 'success',
      text: 'Sesión cerrada.',
    };
  }
  return null;
}

const state: {
  mode: AccessMode;
  selectedRole: DemoRole;
  displayName: string;
  displayNameEdited: boolean;
  loginError: string;
  register: RegisterFields;
  registerErrors: RegisterErrors;
  submitting: boolean;
  successMessage: string;
  banner: BannerState | null;
  activeSession: DemoSession | null;
} = {
  mode: modeParam === 'register' ? 'register' : 'login',
  selectedRole: initialRole,
  displayName: initialProfile.defaultName,
  displayNameEdited: false,
  loginError: '',
  register: {
    name: '',
    email: '',
    phone: '',
    marketingOptIn: false,
  },
  registerErrors: {},
  submitting: false,
  successMessage: '',
  banner: buildInitialBanner(),
  activeSession: initialSessionCheck.session,
};

function renderRoleOption(roleProfile: (typeof DEMO_ROLE_PROFILES)[number]): string {
  const checked = state.selectedRole === roleProfile.role;
  const inputId = `role-opt-${roleProfile.role}`;

  return `
    <div class="io-role-card-wrap">
      <input
        type="radio"
        id="${escapeHtml(inputId)}"
        name="demo-role"
        value="${escapeHtml(roleProfile.role)}"
        class="io-role-radio"
        ${checked ? 'checked' : ''}
        ${state.submitting ? 'disabled' : ''}
      />
      <label for="${escapeHtml(inputId)}" class="io-role-option">
        <span class="io-role-option-top">
          <span class="io-role-title-row">
            <span class="io-role-check" aria-hidden="true">${icons.checkCircle(14)}</span>
            <span class="io-role-name">${escapeHtml(roleProfile.label)}</span>
          </span>
        </span>
        <span class="io-role-area">${escapeHtml(roleProfile.area)}</span>
        <span class="io-role-desc">${escapeHtml(roleProfile.description)}</span>
      </label>
    </div>
  `;
}

function renderBannerHtml(): string {
  if (state.successMessage) {
    return `
      <div class="io-access-banner io-access-banner--success" role="status" aria-live="polite">
        <span class="io-access-banner-icon" aria-hidden="true">${icons.checkCircle(18)}</span>
        <div class="flex-grow-1">${escapeHtml(state.successMessage)}</div>
      </div>
    `;
  }

  if (state.banner) {
    const iconHtml =
      state.banner.kind === 'error'
        ? icons.xCircle(18)
        : state.banner.kind === 'warn'
          ? icons.alertTriangle(18)
          : state.banner.kind === 'success'
            ? icons.checkCircle(18)
            : icons.info(18);

    const liveRole = state.banner.kind === 'error' ? 'role="alert"' : 'role="status" aria-live="polite"';

    return `
      <div class="io-access-banner io-access-banner--${state.banner.kind}" ${liveRole}>
        <span class="io-access-banner-icon" aria-hidden="true">${iconHtml}</span>
        <div class="flex-grow-1">${escapeHtml(state.banner.text)}</div>
      </div>
    `;
  }

  if (state.activeSession) {
    const activeProfile = getRoleProfile(state.activeSession.role);
    return `
      <div class="io-access-banner io-access-banner--info" role="status" aria-live="polite">
        <span class="io-access-banner-icon" aria-hidden="true">${icons.info(18)}</span>
        <div class="flex-grow-1">
          <div>
            Sesión activa como <strong>${escapeHtml(state.activeSession.displayName)}</strong>
            (${escapeHtml(activeProfile.label)} · hasta las ${escapeHtml(formatSessionExpiry(state.activeSession.expiresAt))}).
          </div>
          <div class="io-access-banner-actions">
            <a href="${escapeHtml(activeProfile.destination)}" class="io-access-secondary-btn">
              <span>Ir a ${escapeHtml(activeProfile.area)}</span>
              ${icons.chevronRight(15)}
            </a>
            <button type="button" class="io-access-secondary-btn" data-action="clear-existing-session">
              ${icons.logOut(15)}
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function renderLoginPanel(): string {
  const storeProfiles = DEMO_ROLE_PROFILES.filter((p) => p.group === 'tienda');
  const teamProfiles = DEMO_ROLE_PROFILES.filter((p) => p.group === 'equipo');
  const selectedProfile = getRoleProfile(state.selectedRole);
  const hasNameError = state.loginError.length > 0;

  return `
    <div
      id="panel-login"
      role="tabpanel"
      aria-labelledby="tab-login"
    >
      <form id="form-demo-login" novalidate>
        <fieldset class="io-role-fieldset">
          <legend class="io-field-label mb-1">
            Selecciona tu perfil
          </legend>
          <p class="io-field-hint mt-0 mb-2">
            Cada perfil abre su espacio de trabajo o compra correspondiente.
          </p>

          <p class="io-role-group-label">Comprador</p>
          <div class="io-role-grid">
            ${storeProfiles.map(renderRoleOption).join('')}
          </div>

          <p class="io-role-group-label">Equipo de tienda y gestión</p>
          <div class="io-role-grid">
            ${teamProfiles.map(renderRoleOption).join('')}
          </div>
        </fieldset>

        <div class="io-field-group">
          <label for="demo-display-name" class="io-field-label">
            Nombre para mostrar
          </label>
          <input
            id="demo-display-name"
            name="displayName"
            type="text"
            class="form-control io-form-input ${hasNameError ? 'is-invalid' : ''}"
            value="${escapeHtml(state.displayName)}"
            maxlength="60"
            autocomplete="name"
            aria-invalid="${hasNameError}"
            aria-describedby="${hasNameError ? 'demo-name-error demo-name-hint' : 'demo-name-hint'}"
            ${state.submitting ? 'disabled' : ''}
            required
          />
          <div id="demo-name-hint" class="io-field-hint">
            Aparecerá en la barra superior de tu sesión (mínimo 2 caracteres).
          </div>
          ${
            hasNameError
              ? `
                <div id="demo-name-error" class="io-field-error" role="alert">
                  ${icons.alertTriangle(15)}
                  <span>${escapeHtml(state.loginError)}</span>
                </div>
              `
              : ''
          }
        </div>

        <button
          type="submit"
          class="io-access-submit"
          ${state.submitting ? 'disabled aria-busy="true"' : ''}
        >
          ${
            state.submitting
              ? `<span class="io-access-spinner" aria-hidden="true"></span><span>Abriendo ${escapeHtml(selectedProfile.area)}...</span>`
              : `<span>Entrar como ${escapeHtml(selectedProfile.label)}</span>${icons.chevronRight(17)}`
          }
        </button>
      </form>
    </div>
  `;
}

function renderRegisterPanel(): string {
  const { name, email, phone, marketingOptIn } = state.register;
  const errs = state.registerErrors;

  return `
    <div
      id="panel-register"
      role="tabpanel"
      aria-labelledby="tab-register"
    >
      <p class="io-field-hint mt-0 mb-3">
        Crea tu cuenta personal de cliente para guardar tus favoritos y continuar tus compras en I&amp;O.
      </p>

      ${
        errs.summary
          ? `
            <div class="io-access-banner io-access-banner--error" role="alert">
              <span class="io-access-banner-icon" aria-hidden="true">${icons.alertTriangle(18)}</span>
              <div class="flex-grow-1">${escapeHtml(errs.summary)}</div>
            </div>
          `
          : ''
      }

      <form id="form-demo-register" novalidate>
        <div class="io-field-group">
          <label for="reg-name" class="io-field-label">
            Nombre y apellido <span aria-hidden="true">*</span>
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            class="form-control io-form-input ${errs.name ? 'is-invalid' : ''}"
            value="${escapeHtml(name)}"
            placeholder="Ej. Andrea Paredes"
            maxlength="60"
            autocomplete="name"
            aria-required="true"
            aria-invalid="${Boolean(errs.name)}"
            aria-describedby="${errs.name ? 'reg-name-error' : 'reg-name-hint'}"
            ${state.submitting ? 'disabled' : ''}
            required
          />
          <div id="reg-name-hint" class="io-field-hint">
            Nombre con el que te identificaremos en la tienda.
          </div>
          ${
            errs.name
              ? `
                <div id="reg-name-error" class="io-field-error" role="alert">
                  ${icons.alertTriangle(15)}
                  <span>${escapeHtml(errs.name)}</span>
                </div>
              `
              : ''
          }
        </div>

        <div class="io-field-group">
          <label for="reg-email" class="io-field-label">
            Correo electrónico <span aria-hidden="true">*</span>
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            class="form-control io-form-input ${errs.email ? 'is-invalid' : ''}"
            value="${escapeHtml(email)}"
            placeholder="nombre@correo.com"
            autocomplete="email"
            aria-required="true"
            aria-invalid="${Boolean(errs.email)}"
            aria-describedby="${errs.email ? 'reg-email-error' : 'reg-email-hint'}"
            ${state.submitting ? 'disabled' : ''}
            required
          />
          <div id="reg-email-hint" class="io-field-hint">
            Usa el formato nombre@dominio.com.
          </div>
          ${
            errs.email
              ? `
                <div id="reg-email-error" class="io-field-error" role="alert">
                  ${icons.alertTriangle(15)}
                  <span>${escapeHtml(errs.email)}</span>
                </div>
              `
              : ''
          }
        </div>

        <div class="io-field-group">
          <label for="reg-phone" class="io-field-label">
            Teléfono de contacto (opcional)
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            inputmode="numeric"
            class="form-control io-form-input ${errs.phone ? 'is-invalid' : ''}"
            value="${escapeHtml(phone)}"
            placeholder="Ej. 987654321"
            maxlength="12"
            autocomplete="tel"
            aria-invalid="${Boolean(errs.phone)}"
            aria-describedby="${errs.phone ? 'reg-phone-error' : 'reg-phone-hint'}"
            ${state.submitting ? 'disabled' : ''}
          />
          <div id="reg-phone-hint" class="io-field-hint">
            Si lo ingresas, escribe entre 7 y 9 dígitos sin espacios.
          </div>
          ${
            errs.phone
              ? `
                <div id="reg-phone-error" class="io-field-error" role="alert">
                  ${icons.alertTriangle(15)}
                  <span>${escapeHtml(errs.phone)}</span>
                </div>
              `
              : ''
          }
        </div>

        <div class="io-optin-row">
          <input
            id="reg-marketing-optin"
            name="marketingOptIn"
            type="checkbox"
            class="form-check-input"
            ${marketingOptIn ? 'checked' : ''}
            ${state.submitting ? 'disabled' : ''}
          />
          <label for="reg-marketing-optin" class="io-optin-label">
            Deseo recibir novedades de colecciones y promociones de I&amp;O por correo electrónico (opcional).
          </label>
        </div>

        <button
          type="submit"
          class="io-access-submit"
          ${state.submitting ? 'disabled aria-busy="true"' : ''}
        >
          ${
            state.submitting
              ? '<span class="io-access-spinner" aria-hidden="true"></span><span>Creando tu cuenta...</span>'
              : `<span>Crear cuenta y entrar a la tienda</span>${icons.chevronRight(17)}`
          }
        </button>
      </form>
    </div>
  `;
}

function render(): void {
  const isLogin = state.mode === 'login';

  root.innerHTML = `
    <div class="io-access-layout">
      <aside class="io-access-brand-pane" aria-label="Información de I&O">
        <div class="io-access-brand-top">
          <div class="io-access-brand-row">
            <a href="/index.html" class="io-access-brand-mark text-decoration-none" aria-label="Volver a la tienda I&O">
              ${renderBrandMark()}
            </a>
          </div>

          <h1 class="io-access-headline">Acceso a I&amp;O</h1>
          <p class="io-access-lead">
            Ingresa con tu cuenta de cliente o accede con tu perfil de trabajo para gestionar tu área.
          </p>

          <div class="io-access-zones-summary">
            <p class="io-access-zones-kicker">Espacios del sistema</p>
            <ul class="io-access-zones-list">
              ${DEMO_ROLE_PROFILES.map(
                (p) => `
                  <li>
                    <span><strong>${escapeHtml(p.label)}</strong></span>
                    <span class="io-access-zone-state">${escapeHtml(p.area)}</span>
                  </li>
                `
              ).join('')}
            </ul>
          </div>
        </div>

        <div class="io-access-brand-foot">
          <a href="/index.html" class="text-decoration-none d-inline-flex align-items-center gap-2" style="color: var(--color-header-text)">
            ${icons.arrowLeft(15)}
            <span>Volver al catálogo sin iniciar sesión</span>
          </a>
        </div>
      </aside>

      <main id="acceso-principal" class="io-access-work-pane">
        <section class="io-access-card" aria-labelledby="acceso-card-title">
          <div class="io-access-card-head">
            <h2 id="acceso-card-title" class="io-access-card-title">
              ${isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p class="io-access-card-subtitle">
              ${
                isLogin
                  ? 'Elige tu perfil para continuar a tu espacio.'
                  : 'Regístrate como cliente de I&O.'
              }
            </p>
          </div>

          <div class="io-access-tablist" role="tablist" aria-label="Modos de acceso">
            <button
              id="tab-login"
              type="button"
              role="tab"
              class="io-access-tab"
              aria-selected="${isLogin}"
              aria-controls="panel-login"
              tabindex="${isLogin ? '0' : '-1'}"
              data-action="switch-mode"
              data-mode="login"
            >
              <span class="io-access-tab-marker" aria-hidden="true"></span>
              <span>Ingresar</span>
            </button>
            <button
              id="tab-register"
              type="button"
              role="tab"
              class="io-access-tab"
              aria-selected="${!isLogin}"
              aria-controls="panel-register"
              tabindex="${!isLogin ? '0' : '-1'}"
              data-action="switch-mode"
              data-mode="register"
            >
              <span class="io-access-tab-marker" aria-hidden="true"></span>
              <span>Crear cuenta</span>
            </button>
          </div>

          ${renderBannerHtml()}

          ${isLogin ? renderLoginPanel() : renderRegisterPanel()}
        </section>
      </main>
    </div>
  `;

  bindBrandLogo(root);
}

function validateRegister(): RegisterErrors {
  const errs: RegisterErrors = {};
  const cleanName = state.register.name.replace(/\s+/g, ' ').trim();
  const cleanEmail = state.register.email.trim();
  const cleanPhone = state.register.phone.trim();

  if (cleanName.length < 3 || cleanName.split(' ').length < 2) {
    errs.name = 'Ingresa tu nombre y apellido (al menos dos palabras, mínimo 3 caracteres).';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    errs.email = 'Ingresa un correo válido con formato nombre@dominio.com.';
  }

  if (cleanPhone.length > 0 && !/^\d{7,9}$/.test(cleanPhone)) {
    errs.phone = 'Escribe solo entre 7 y 9 dígitos numéricos, o deja el campo vacío.';
  }

  const count = Object.keys(errs).length;
  if (count > 0) {
    errs.summary =
      count === 1
        ? 'Revisa el campo marcado antes de continuar.'
        : `Revisa los ${count} campos marcados antes de continuar.`;
  }

  return errs;
}

function focusFirstRegisterError(errs: RegisterErrors): void {
  const firstId = errs.name ? 'reg-name' : errs.email ? 'reg-email' : errs.phone ? 'reg-phone' : null;
  if (firstId) {
    document.getElementById(firstId)?.focus();
  }
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  if (!target || state.submitting) return;

  const action = target.dataset.action;
  if (action === 'switch-mode') {
    const nextMode = target.dataset.mode as AccessMode | undefined;
    if (nextMode && nextMode !== state.mode) {
      state.mode = nextMode;
      state.loginError = '';
      state.registerErrors = {};
      render();
    }
  } else if (action === 'clear-existing-session') {
    clearDemoSession();
    state.activeSession = null;
    state.banner = {
      kind: 'success',
      text: 'Sesión cerrada.',
    };
    render();
  }
});

root.addEventListener('keydown', (event) => {
  const tab = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[role="tab"]');
  if (!tab) return;

  if (
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    event.key === 'Home' ||
    event.key === 'End'
  ) {
    event.preventDefault();
    const nextMode: AccessMode =
      event.key === 'Home'
        ? 'login'
        : event.key === 'End'
          ? 'register'
          : state.mode === 'login'
            ? 'register'
            : 'login';
    state.mode = nextMode;
    render();
    const nextTabId = nextMode === 'login' ? 'tab-login' : 'tab-register';
    document.getElementById(nextTabId)?.focus();
  }
});

root.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;

  if (target.name === 'demo-role' && isValidDemoRole(target.value)) {
    state.selectedRole = target.value;
    state.loginError = '';
    if (!state.displayNameEdited) {
      state.displayName = getRoleProfile(state.selectedRole).defaultName;
    }
    render();
    const radio = document.getElementById(`role-opt-${state.selectedRole}`);
    radio?.focus();
  } else if (target.id === 'reg-marketing-optin') {
    state.register.marketingOptIn = target.checked;
  }
});

root.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;

  if (target.id === 'demo-display-name') {
    state.displayName = target.value;
    state.displayNameEdited = true;
    if (state.loginError && target.value.trim().length >= 2) {
      state.loginError = '';
      target.classList.remove('is-invalid');
      target.setAttribute('aria-invalid', 'false');
      document.getElementById('demo-name-error')?.remove();
    }
  } else if (target.id === 'reg-name') {
    state.register.name = target.value;
  } else if (target.id === 'reg-email') {
    state.register.email = target.value;
  } else if (target.id === 'reg-phone') {
    state.register.phone = target.value;
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (!form || state.submitting) return;
  event.preventDefault();

  if (form.id === 'form-demo-login') {
    const cleanName = state.displayName.replace(/\s+/g, ' ').trim();
    if (cleanName.length < 2) {
      state.loginError = 'Escribe un nombre de al menos 2 caracteres.';
      render();
      document.getElementById('demo-display-name')?.focus();
      return;
    }

    state.submitting = true;
    const profile = getRoleProfile(state.selectedRole);
    state.successMessage = `Sesión iniciada. Abriendo ${profile.area}.`;
    render();

    startDemoSession(state.selectedRole, cleanName);
    const destination = resolvePostLoginDestination(state.selectedRole, safeNext);
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 200);
  } else if (form.id === 'form-demo-register') {
    const errs = validateRegister();
    if (Object.keys(errs).length > 0) {
      state.registerErrors = errs;
      render();
      focusFirstRegisterError(errs);
      return;
    }

    state.registerErrors = {};
    state.submitting = true;
    state.successMessage = 'Cuenta creada. Abriendo tienda.';
    render();

    createClientDemoSession(state.register.name);
    const destination = resolvePostLoginDestination('cliente', safeNext);
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 200);
  }
});

render();

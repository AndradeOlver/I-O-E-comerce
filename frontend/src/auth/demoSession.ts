export const DEMO_SESSION_STORAGE_KEY = 'io_demo_session_v1';
export const DEMO_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type DemoRole =
  | 'cliente'
  | 'vendedor'
  | 'cajero'
  | 'administrador'
  | 'almacenero'
  | 'community_manager'
  | 'respaldo';

export type PendingZoneKey = 'administracion' | 'almacen' | 'marketing' | 'operaciones';

export type AccessRedirectReason = 'sin_sesion' | 'expirada' | 'rol' | 'logout';

export interface DemoSession {
  role: DemoRole;
  displayName: string;
  expiresAt: number;
}

export interface RoleProfileConfig {
  role: DemoRole;
  label: string;
  area: string;
  defaultName: string;
  destination: string;
  group: 'tienda' | 'equipo';
  description: string;
}

export interface PendingZoneConfig {
  key: PendingZoneKey;
  role: DemoRole;
  title: string;
}

export const DEMO_ROLE_PROFILES: readonly RoleProfileConfig[] = [
  {
    role: 'cliente',
    label: 'Cliente',
    area: 'Tienda online',
    defaultName: 'Valeria Mendoza',
    destination: '/index.html',
    group: 'tienda',
    description: 'Catálogo, favoritos y bolsa de compras.',
  },
  {
    role: 'vendedor',
    label: 'Vendedor',
    area: 'Mostrador de ventas',
    defaultName: 'Camila Torres',
    destination: '/pos-vendedor.html',
    group: 'equipo',
    description: 'Catálogo por modelo, escáner en mostrador, cobro integrado y caja.',
  },
  {
    role: 'cajero',
    label: 'Cajero',
    area: 'Caja y cobro',
    defaultName: 'Diego Salazar',
    destination: '/pos-cajero.html',
    group: 'equipo',
    description: 'Cobro en mostrador, comprobantes y arqueo diario.',
  },
  {
    role: 'administrador',
    label: 'Administrador',
    area: 'Dirección y finanzas',
    defaultName: 'Lucía Benavides',
    destination: '/admin.html',
    group: 'equipo',
    description: 'Indicadores de negocio, planilla y supervisión general.',
  },
  {
    role: 'almacenero',
    label: 'Almacenero',
    area: 'Almacén y envíos',
    defaultName: 'Mateo Quispe',
    destination: '/almacen.html',
    group: 'equipo',
    description: 'Despacho courier, compras a proveedores y préstamos.',
  },
  {
    role: 'community_manager',
    label: 'Community Manager',
    area: 'Marketing y catálogo',
    defaultName: 'Sofía Ríos',
    destination: '/marketing.html',
    group: 'equipo',
    description: 'Portada web, colecciones, recién llegados y campañas promocionales.',
  },
  {
    role: 'respaldo',
    label: 'Operador general',
    area: 'Coordinación interna',
    defaultName: 'Andrea Navarro',
    destination: '/zona-preparacion.html?zona=operaciones',
    group: 'equipo',
    description: 'Acceso general para coordinación y soporte operativo.',
  },
] as const;

export const PENDING_ZONE_CONFIG: Record<PendingZoneKey, PendingZoneConfig> = {
  administracion: {
    key: 'administracion',
    role: 'administrador',
    title: 'Dirección y Finanzas',
  },
  almacen: {
    key: 'almacen',
    role: 'almacenero',
    title: 'Almacén y Envíos',
  },
  marketing: {
    key: 'marketing',
    role: 'community_manager',
    title: 'Marketing y Catálogo',
  },
  operaciones: {
    key: 'operaciones',
    role: 'respaldo',
    title: 'Coordinación Interna',
  },
};

const VALID_ROLES = new Set<DemoRole>(DEMO_ROLE_PROFILES.map((p) => p.role));
const VALID_PENDING_ZONES = new Set<PendingZoneKey>(
  Object.keys(PENDING_ZONE_CONFIG) as PendingZoneKey[]
);

export function isValidDemoRole(value: unknown): value is DemoRole {
  return typeof value === 'string' && VALID_ROLES.has(value as DemoRole);
}

export function isValidPendingZoneKey(value: unknown): value is PendingZoneKey {
  return typeof value === 'string' && VALID_PENDING_ZONES.has(value as PendingZoneKey);
}

export function getRoleProfile(role: DemoRole): RoleProfileConfig {
  return (
    DEMO_ROLE_PROFILES.find((profile) => profile.role === role) ??
    DEMO_ROLE_PROFILES[DEMO_ROLE_PROFILES.length - 1]
  );
}

function normalizeDisplayName(rawName: string | undefined, fallback: string): string {
  const cleaned = (rawName ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return cleaned.length >= 2 ? cleaned : fallback;
}

export function getActiveDemoSession(): { session: DemoSession | null; expired: boolean } {
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) {
      return { session: null, expired: false };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return { session: null, expired: false };
    }

    const candidate = parsed as Partial<DemoSession>;
    if (
      !isValidDemoRole(candidate.role) ||
      typeof candidate.displayName !== 'string' ||
      candidate.displayName.trim().length < 2 ||
      typeof candidate.expiresAt !== 'number' ||
      !Number.isFinite(candidate.expiresAt)
    ) {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return { session: null, expired: false };
    }

    if (candidate.expiresAt <= Date.now()) {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return { session: null, expired: true };
    }

    return {
      session: {
        role: candidate.role,
        displayName: candidate.displayName.trim().slice(0, 60),
        expiresAt: candidate.expiresAt,
      },
      expired: false,
    };
  } catch {
    try {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    } catch {

    }
    return { session: null, expired: false };
  }
}

function persistSession(session: DemoSession): DemoSession {
  const minimalSession: DemoSession = {
    role: session.role,
    displayName: session.displayName,
    expiresAt: session.expiresAt,
  };
  try {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(minimalSession));
  } catch {

  }
  return minimalSession;
}

export function startDemoSession(role: DemoRole, customName?: string): DemoSession {
  const profile = getRoleProfile(role);
  const displayName = normalizeDisplayName(customName, profile.defaultName);
  return persistSession({
    role: profile.role,
    displayName,
    expiresAt: Date.now() + DEMO_SESSION_TTL_MS,
  });
}

export function createClientDemoSession(displayName: string): DemoSession {
  const clientProfile = getRoleProfile('cliente');
  return persistSession({
    role: 'cliente',
    displayName: normalizeDisplayName(displayName, clientProfile.defaultName),
    expiresAt: Date.now() + DEMO_SESSION_TTL_MS,
  });
}

export function clearDemoSession(): void {
  try {
    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  } catch {

  }
}

export function logoutToAccess(): void {
  window.sessionStorage.removeItem('io_api_token_v1');
  clearDemoSession();
  window.location.assign('/acceso.html?reason=logout');
}

export function sanitizeNextPath(rawNext: string | null): string | null {
  if (!rawNext) return null;
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  try {
    const url = new URL(trimmed, 'http://localhost');
    if (url.origin !== 'http://localhost') return null;

    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const safeHash =
      pathname === '/index.html' && /^#\/[a-z0-9\-/]*$/i.test(url.hash) ? url.hash : '';

    if (
      pathname === '/index.html' ||
      pathname === '/pos-vendedor.html' ||
      pathname === '/pos-cajero.html' ||
      pathname === '/almacen.html' ||
      pathname === '/marketing.html' ||
      pathname === '/admin.html'
    ) {
      return `${pathname}${safeHash}`;
    }

    if (pathname === '/zona-preparacion.html') {
      const zona = url.searchParams.get('zona');
      if (isValidPendingZoneKey(zona)) {
        return `/zona-preparacion.html?zona=${zona}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getRequiredRoleForPath(path: string): DemoRole | null {
  const safePath = sanitizeNextPath(path);
  if (!safePath) return null;

  const pathname = safePath.split('#')[0];
  if (pathname === '/index.html') return 'cliente';
  if (pathname === '/pos-vendedor.html') return 'vendedor';
  if (pathname === '/pos-cajero.html') return 'cajero';
  if (pathname === '/almacen.html') return 'almacenero';
  if (pathname === '/marketing.html') return 'community_manager';
  if (pathname === '/admin.html') return 'administrador';

  if (pathname.startsWith('/zona-preparacion.html')) {
    const url = new URL(pathname, 'http://localhost');
    const zona = url.searchParams.get('zona');
    if (isValidPendingZoneKey(zona)) {
      return PENDING_ZONE_CONFIG[zona].role;
    }
  }

  return null;
}

export function canRoleAccessPath(role: DemoRole, path: string): boolean {
  const safePath = sanitizeNextPath(path);
  if (!safePath) return false;
  const pathname = safePath.split('#')[0];
  if (role === 'administrador') {
    return (
      pathname === '/admin.html' ||
      pathname === '/pos-vendedor.html' ||
      pathname === '/pos-cajero.html' ||
      pathname === '/almacen.html' ||
      pathname === '/marketing.html'
    );
  }
  if (pathname === '/pos-vendedor.html' || pathname === '/pos-cajero.html') {
    return role === 'vendedor' || role === 'cajero';
  }
  return getRequiredRoleForPath(safePath) === role;
}

export function resolvePostLoginDestination(role: DemoRole, rawNext: string | null): string {
  const safeNext = sanitizeNextPath(rawNext);
  if (safeNext && canRoleAccessPath(role, safeNext)) {
    return safeNext;
  }
  return getRoleProfile(role).destination;
}

export function requireAnyZoneRole(
  allowedRoles: DemoRole[],
  currentPathOverride?: string
): DemoSession | null {
  const { session, expired } = getActiveDemoSession();
  if (session && allowedRoles.includes(session.role)) {
    return session;
  }

  const primaryRole = allowedRoles[0] ?? 'vendedor';
  const fallbackPath = getRoleProfile(primaryRole).destination;
  const rawCurrent =
    currentPathOverride ?? `${window.location.pathname}${window.location.search}`;
  const safeNext = sanitizeNextPath(rawCurrent) ?? fallbackPath;
  const reason: AccessRedirectReason = expired
    ? 'expirada'
    : session
      ? 'rol'
      : 'sin_sesion';

  const params = new URLSearchParams({
    next: safeNext,
    reason,
    required: primaryRole,
  });

  window.location.replace(`/acceso.html?${params.toString()}`);
  return null;
}

export function requireZoneRole(
  expectedRole: DemoRole,
  currentPathOverride?: string
): DemoSession | null {
  return requireAnyZoneRole([expectedRole], currentPathOverride);
}

export function formatSessionExpiry(expiresAt: number): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

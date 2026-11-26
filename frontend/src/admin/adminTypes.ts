import {
  PurchaseOrder,
  WarehouseDispatch,
  WarehouseLoan,
  WarehouseSupplier,
} from '../almacen/almacenTypes';
import { MarketingCampaign } from '../marketing/marketingTypes';
import { PosAllyDebt, PosInventoryItem, PosOrder } from '../pos/posTypes';
import { ProductGroup } from '../types/store.types';

export type AdminTab = 'mesa_control' | 'analitica' | 'altas';

export type AdminAreaGroup =
  | 'Ventas y Caja'
  | 'Compras e Inventario'
  | 'Almacén, Envíos y Préstamos'
  | 'Marketing y Catálogo'
  | 'Finanzas y Planilla';

export const ADMIN_AREA_GROUPS: readonly AdminAreaGroup[] = [
  'Ventas y Caja',
  'Compras e Inventario',
  'Almacén, Envíos y Préstamos',
  'Marketing y Catálogo',
  'Finanzas y Planilla',
] as const;

export type AdminDecisionSeverity = 'bloqueante' | 'atencion' | 'observacion';

export type AdminDecisionKind =
  | 'campana_mkt'
  | 'editorial_m05'
  | 'compra_oc'
  | 'proveedor_m04'
  | 'planilla_m07'
  | 'prestamo_m06'
  | 'inconformidad_m04'
  | 'despacho_m03'
  | 'stock_critico_m04'
  | 'anulacion_m01'
  | 'aliado_m01';

export type AdminDecisionFilter = 'todos' | AdminDecisionSeverity | 'resueltos';

export type AdminDecisionMeta =
  | { kind: 'campana_mkt'; campaign: MarketingCampaign }
  | { kind: 'editorial_m05'; products: ProductGroup[] }
  | { kind: 'compra_oc'; purchase: PurchaseOrder }
  | { kind: 'proveedor_m04'; supplier: WarehouseSupplier }
  | { kind: 'planilla_m07'; payroll: AdminPayrollPeriod }
  | { kind: 'prestamo_m06'; loan: WarehouseLoan; diasRestantes: number }
  | { kind: 'inconformidad_m04'; purchase: PurchaseOrder }
  | { kind: 'despacho_m03'; dispatch: WarehouseDispatch }
  | { kind: 'stock_critico_m04'; items: PosInventoryItem[] }
  | { kind: 'anulacion_m01'; order: PosOrder }
  | { kind: 'aliado_m01'; debt: PosAllyDebt };

export interface AdminDecisionItem {
  id: string;
  kind: AdminDecisionKind;
  severity: AdminDecisionSeverity;
  areaGroup: AdminAreaGroup;
  area: string;
  ruleCode: string;
  titulo: string;
  resumen: string;
  impactoTexto: string;
  plazoTexto: string;
  timestamp: string;
  sourceId: string;
  moduleHref: string;
  moduleLabel: string;
  acknowledged: boolean;
  meta: AdminDecisionMeta;
}

export interface AdminPayrollEmployee {
  id: string;
  rolCodigo: 'TN01' | 'TN02' | 'TN03' | 'TN04' | 'TN05';
  nombre: string;
  cargo: string;
  sueldoBase: number;
  comision: number;
  descuento: number;
  neto: number;
}

export interface AdminPayrollPeriod {
  id: string;
  periodoLabel: string;
  fechaLimite: string;
  estado: 'pendiente_cierre' | 'pagada';
  totalNeto: number;
  empleados: AdminPayrollEmployee[];
  pagadoEn?: string;
  pagadoPor?: string;
  referenciaBanco?: string;
}

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  area: string;
  ruleCode: string;
  detail: string;
}

export interface AdminStoreState {
  version: 1;
  saldoBancarioBase: number;
  metaDiariaVentas: number;
  acknowledgedIds: Record<string, string>;
  payroll: AdminPayrollPeriod;
  auditLog: AdminAuditEntry[];
  lastRefreshedAt: string;
}

export interface AdminPulseMetrics {
  tiendaCobrado: number;
  webPagado: number;
  totalOmnicanal: number;
  metaDiaria: number;
  porcentajeMeta: number;
  pendienteCobroPos: number;
  liquidezEfectiva: number;
  compromisosInmediatos: number;
  coberturaOk: boolean;
  margenLiquidez: number;
  skusCriticosCount: number;
  skusAgotadosCount: number;
  prestamosActivosCount: number;
  capitalConsignacion: number;
}

export interface AdminCategoryAnalytic {
  slug: string;
  nombre: string;
  modelosCount: number;
  stockTotal: number;
  skusCriticos: number;
  valorInventario: number;
}

export interface AdminAnalyticsData {
  canalBreakdown: {
    tiendaCobrado: number;
    webPagado: number;
    pendientePos: number;
  };
  categorias: AdminCategoryAnalytic[];
  campanasActivas: {
    id: string;
    titulo: string;
    descuento: number;
    consumido: number;
    maximo: number;
    porcentaje: number;
  }[];
  proveedoresResumen: {
    aprobados: number;
    pendientes: number;
    rechazados: number;
  };
  consignacionesResumen: {
    activas: number;
    devueltas: number;
    liquidadas: number;
    capitalActivo: number;
  };
}

export interface AdminSnapshot {
  pulse: AdminPulseMetrics;
  decisions: AdminDecisionItem[];
  analytics: AdminAnalyticsData;
  suppliers: WarehouseSupplier[];
  unifiedAudit: AdminAuditEntry[];
  lastRefreshedAt: string;
}

export interface AdminConsoleApi {
  estado: () => AdminSnapshot['pulse'] & {
    bloqueantes: number;
    atencion: number;
    observacion: number;
    planillaEstado: AdminPayrollPeriod['estado'];
  };
  ajustarLiquidez: (monto: number) => { ok: boolean; liquidezBase: number };
  reiniciar: () => void;
}

declare global {
  interface Window {
    IO_ADMIN?: AdminConsoleApi;
  }
}

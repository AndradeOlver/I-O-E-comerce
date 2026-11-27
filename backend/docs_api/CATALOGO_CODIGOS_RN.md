# 📜 Catálogo de Códigos de Reglas de Negocio (`CATALOGO_CODIGOS_RN.md`)

> **Sistema:** Sistema Omnicanal I&O (`backend/docs_api/`)  
> **Contratos Vinculados:** [`openapi.yaml`](./openapi.yaml) · [`MATRIZ_RBAC_ENDPOINTS.md`](./MATRIZ_RBAC_ENDPOINTS.md)  
> **Fuentes de Verdad:** `03_Reglas_de_Negocio_IO.md` (`49` reglas `RN-*` en 10 dominios), `03_Requerimientos_y_Reglas_Accesibles_IO.md` (`RN-ACC-01..06`), `DB/esquemas/01_esquema_io_sqlserver*.sql` y `frontend/docs_ui/VERIFICACION_FRONTEND_R1.md`.  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**

---

## 1. Formato Estándar de Respuesta de Error (`error.middleware.ts`)

Toda violación de regla de negocio (`BusinessRuleError`), validación `Zod` o restricción de SQL Server (`sqlErrorMapper.ts`) devuelve una estructura JSON uniforme pensada para alertas *Poka-Yoke* y regiones `aria-live="polite"` / `role="alert"` en las vistas del comprador (`AN01`):

```json
{
  "ok": false,
  "ruleCode": "RN-PRE-02",
  "error": "CONSIGNMENT_MAX_TERM_EXCEEDED",
  "message": "El plazo máximo de consignación es de 7 días calendario.",
  "field": "fecha_vencimiento",
  "timestamp": "2026-11-26T22:05:00-05:00"
}
```

---

## 2. Mapeo de Errores Nativos SQL Server (`sqlErrorMapper.ts`)

| Código SQL | Origen T-SQL | `HTTP` | `ruleCode` / Error | Uso en `backend/src/shared/errors/sqlErrorMapper.ts` |
|:---:|---|:---:|---|---|
| **547** | `CHECK` / `FOREIGN KEY` | `422` | Según constraint (`CK_ProductoVariante_Stock`, `CK_PedidoCliente_Descuento`, `CK_Prestamo_PlazoMax`, `CK_Producto_NinosEdadObligatoria`) | Traduce violaciones de integridad de dominio a mensajes legibles por campo. |
| **2627 / 2601** | `UNIQUE` / Índice Único Filtrado | `409` | `DUPLICATE_RESOURCE` / `UX_Prestamo_Constancia` / `UX_Categoria_Slug` | Evita duplicidad de SKU, constancias de préstamo, RUC/DNI o comprobantes. |
| **50000** | `RAISERROR` / `THROW` en Triggers | `409` / `422` | `RN-FIN-05` (`TR_Planilla_BloqueoRetroactivo`), `RN-SEG-03` (`TR_AuditLog_Inmutable`) | Preserva inmutabilidad retroactiva de planillas cerradas y bitácora. |
| **515** | `NOT NULL` | `400` | `MISSING_REQUIRED_FIELD` | Respaldo ante campos obligatorios omitidos tras validación `Zod`. |
| **1205** | Deadlock (`UPDLOCK, ROWLOCK`) | `503` | `CONCURRENCY_RETRY` | Solicita reintento seguro en concurrencia alta de stock (`RN-VEN-06`, `RN-ECO-03`). |

---

## 3. Catálogo de las 49 Reglas Operativas (`RN-*`)

### 3.1 Ventas en Tienda (`RN-VEN`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-VEN-01` | `409` | `POS_STOCK_UNAVAILABLE` | Stock `> 0` por `variante_id` (`SKU`) antes de cobrar | Stock insuficiente para el SKU seleccionado en tienda. |
| `RN-VEN-02` | `200/409` | `ALTERNATIVE_SKU_SUGGESTED` | `GET /api/pos/inventario/{sku}/alternativas` | Sin stock exacto; se sugieren variantes alternativas disponibles. |
| `RN-VEN-03` | `422/403` | `DISCOUNT_LIMIT_OR_AUTH` | `CK_PedidoCliente_Descuento` (`<= 10%`) + auth `TN01` si `> 0%` | El descuento especial requiere autorización de Administrador y no puede superar el 10%. |
| `RN-VEN-04` | `422` | `RECEIPT_AND_MOVEMENT_REQUIRED` | Transacción atómica `ComprobantePago` + `MovimientoFinanciero` | Toda venta concluida exige comprobante emitido y asiento de ingreso en caja. |
| `RN-VEN-05` | `422` | `EXCHANGE_WINDOW_EXPIRED` | Ventana de cambio **7 días calendario** (reconciliar `footer.ts` 15d → 7d) | Los cambios proceden dentro de los 7 días calendario con comprobante y etiqueta intacta. |
| `RN-VEN-06` | `409` | `NEGATIVE_STOCK_FORBIDDEN` | `CK_ProductoVariante_Stock` (`stock >= 0`) + `WHERE stock >= @qty` | Operación bloqueada: no se permite venta con stock cero ni stock negativo. |
| `RN-VEN-07` | `422` | `WHOLESALE_RUC_REQUIRED` | RUC válido (11 dígitos) + lista mayorista aprobada | Las ventas corporativas o al por mayor requieren RUC válido y tarifa mayorista aprobada. |

### 3.2 Venta Online / E-commerce (`RN-ECO`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-ECO-01` | `409` | `PAYMENT_CONFIRMATION_REQUIRED` | Compuerta `estado = 'En preparacion'` solo tras pago aprobado | No se puede iniciar el picking ni despacho sin confirmación de pago. |
| `RN-ECO-02` | `402/409` | `PAYMENT_RETRIES_EXCEEDED` | Máximo `3` reintentos de pasarela antes de cancelar pedido | Pago rechazado; superó el máximo de 3 reintentos permitidos. |
| `RN-ECO-03` | `409` | `CART_RESERVATION_EXPIRED` | Reserva temporal `15 min` + job `releaseExpiredCarts.job.ts` | La reserva de tu bolsa expiró tras 15 minutos; verifica disponibilidad. |
| `RN-ECO-04` | `422` | `INVALID_ORDER_STATE_TRANSITION` | Máquina de 6 estados (`Pendiente de pago`..`Cancelado`) | Transición de estado no permitida para el pedido online. |
| `RN-ECO-05` | `409` | `CANCELLATION_BEFORE_SHIPPING_ONLY` | Solo cancelable antes de estado `"En envío"` | Solo puedes cancelar y solicitar reembolso antes de que el pedido pase a "En envío". |
| `RN-ECO-06` | `400` | `SHIPPING_DATA_INCOMPLETE` | DNI/RUC, nombres, teléfono y dirección con referencia obligatorios | Completa DNI/RUC, nombres, teléfono y dirección con referencia para el despacho. |

### 3.3 Inventario y Stock (`RN-INV`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-INV-01` | `403/422` | `SKU_STOCK_PROJECTION_POLICY` | Stock por `SKU`; DTO público `AN01` oculta cifras exactas | Stock gestionado por SKU; el catálogo público solo muestra disponibilidad binaria. |
| `RN-INV-02` | `422` | `STOCK_MOVEMENT_UNLINKED` | Todo ajuste exige `PedidoCliente`, `PedidoProveedor` o `Prestamo` | Todo movimiento de stock debe estar vinculado a un pedido o préstamo autorizado. |
| `RN-INV-03` | `200` | `LOW_STOCK_ALERT_TRIGGERED` | `IX_ProductoVariante_StockBajo` (`stock <= 5`) | Alerta automática: el SKU alcanzó el umbral mínimo de 5 unidades. |
| `RN-INV-04` | `422` | `DEFECTIVE_STOCK_SEPARATION` | Registro de merma justificada y retiro de sala vendible | La prenda defectuosa debe registrarse como merma y separarse del stock vendible. |
| `RN-INV-05` | `422` | `MONTHLY_AUDIT_DISCREPANCY` | Cierre mensual físico con informe de diferencias a `TN01` | Se detectó descuadre en auditoría física; requiere informe técnico al Administrador. |

### 3.4 Compras y Proveedores (`RN-COM`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-COM-01` | `403/422` | `PURCHASE_ORDER_APPROVAL_REQUIRED` | Aprobación exclusiva `TN01` tras evaluación de cotizaciones | La orden de compra requiere aprobación explícita del Administrador. |
| `RN-COM-02` | `409` | `QUOTATION_REOPEN_REQUIRED` | Reapertura de cotización rechazada (`POST .../reabrir`) | La orden fue rechazada; reabre y actualiza la cotización antes de reenviar. |
| `RN-COM-03` | `422` | `REMISSION_GUIDE_REQUIRED` | `guia_remision` ($\ge 4$ chars) + conformidad física en almacén | Ingresa la Guía de Remisión y certifica conformidad física antes de cargar stock. |
| `RN-COM-04` | `409` | `SUPPLIER_PAYMENT_BLOCKED` | `pago_bloqueado = 1` + acta de reclamo por inconformidad | Pago bloqueado por inconformidad en el lote recibido; se generó acta de reclamo. |
| `RN-COM-05` | `422` | `SUPPLIER_PAYMENT_INVALID` | Liquidación exclusiva `TN01` con egreso en `MovimientoFinanciero` | El pago al proveedor requiere orden conforme no bloqueada y registro de egreso. |

### 3.5 Envíos y Courier (`RN-ENV`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-ENV-01` | `422` | `SHIPPING_GUIDE_REQUIRED` | `GuiaEnvio` con `codigo_tracking` único antes de salida | No puede salir a reparto sin Guía de Envío y código de seguimiento único. |
| `RN-ENV-02` | `422` | `DELIVERY_PROOF_REQUIRED` | Firma/código + DNI receptor (`8` dígitos); `TN04` / `TN02` / `TN01` | Consigna el nombre y DNI de 8 dígitos (o código digital) del receptor. |
| `RN-ENV-03` | `409` | `MAX_DELIVERY_ATTEMPTS_REACHED` | Máximo `2` intentos antes de pasar a `devuelto_almacen` | Segundo intento fallido: el paquete retorna automáticamente a almacén. |
| `RN-ENV-04` | `422` | `SHIPPING_FEE_POLICY` | Flete transparente; gratis urbano `> S/ 150.00` (unificar `S/ 10` vs `S/ 12` en `.env`) | Envío gratuito aplicado en compras urbanas mayores a S/ 150.00. |

### 3.6 Marketing y Catálogo Digital (`RN-MKT`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-MKT-01` | `422` | `CAMPAIGN_VALIDITY_OR_STOCK_EXCEEDED` | Vigencia temporal + stock máximo INDECOPI + baja en `0` | La campaña exige vigencia y stock máximo; se oculta automáticamente al llegar a cero. |
| `RN-MKT-02` | `422` | `CATALOG_FIDELITY_REQUIRED` | Fotos, guía de tallas en cm y `alt_text` textil obligatorio | Completa descripción fiel, guía de tallas y texto alternativo de la prenda. |
| `RN-MKT-03` | `422` | `EXPLICIT_OPT_IN_REQUIRED` | `opt_in_marketing = 0` por defecto; prohibido pre-marcar (Ley 29733) | El envío promocional requiere consentimiento explícito sin casillas pre-marcadas. |
| `RN-MKT-04` | `403` | `CAMPAIGN_OWNER_APPROVAL_REQUIRED` | `aprobada_dueno = 1` exclusiva de `TN01` antes de publicar | Toda campaña u oferta promocional requiere aprobación del Administrador. |

### 3.7 Préstamos y Consignación (`RN-PRE`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-PRE-01` | `422` | `CONSIGNMENT_CERTIFICATE_REQUIRED` | Si `gerente_disponible = false`, `TN04` emite `UX_Prestamo_Constancia` + `AuditLog` | En ausencia del gerente, el Almacenero emite la Constancia Formal de Préstamo. |
| `RN-PRE-02` | `422` | `CONSIGNMENT_MAX_TERM_EXCEEDED` | `CK_Prestamo_PlazoMax` (`1` a `7` días calendario) | El plazo máximo de consignación es de 7 días calendario. |
| `RN-PRE-03` | `409` | `CONSIGNMENT_STOCK_DEDUCTED` | Estado `"En Consignación"` + descuento de stock en `ProductoVariante` | Stock descontado y asignado en estado "En Consignación" con responsable. |
| `RN-PRE-04` | `422` | `CONSIGNMENT_CLOSURE_INVALID` | Devolución intacta o liquidación hacia Caja (`PosAllyDebt`) | Cierra la consignación registrando devolución física o liquidación en Caja. |
| `RN-PRE-05` | `422` | `CONSIGNMENT_DAMAGE_WHOLESALE_FEE` | Prendas dañadas se facturan al precio mayorista pactado | Las prendas devueltas con deterioro se facturan al precio mayorista pactado. |

### 3.8 Finanzas y Nómina (`RN-FIN`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-FIN-01` | `422` | `PAYROLL_CALCULATION_INVALID` | Días laborados + comisiones validadas + deducciones con `decimal.js` | El cálculo de planilla debe reflejar días laborados, comisiones y descuentos de ley. |
| `RN-FIN-02` | `409` | `INSUFFICIENT_BANK_LIQUIDITY` | Verificación de `saldo_bancario >= total_planilla` previo al pago | Liquidez bancaria insuficiente para ejecutar el pago de planilla. |
| `RN-FIN-03` | `422` | `PAYROLL_SIGNED_SLIP_REQUIRED` | Pago directo + emisión y constancia de boleta firmada | El pago de haberes requiere emisión de boleta y constancia de recepción. |
| `RN-FIN-04` | `500/422` | `PAYROLL_EXPENSE_ENTRY_REQUIRED` | Asiento inmediato de egreso en `dbo.MovimientoFinanciero` | Todo pago de nómina registra inmediatamente su comprobante de egreso. |
| `RN-FIN-05` | `409` | `IMMUTABLE_FINANCIAL_RECORD` | `TR_Planilla_BloqueoRetroactivo`: prohíbe alterar cierres sin auditoría | Registro histórico bloqueado: no puede modificarse retroactivamente sin auditoría. |

### 3.9 Tributario y Comprobantes (`RN-TRI`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-TRI-01` | `422` | `CORRELATIVE_AND_IGV_REQUIRED` | Series `B001`/`F001` correlativas + `IGV 18%` con `decimal.js` | Comprobante emitido con numeración correlativa y desglose exacto del IGV (18%). |
| `RN-TRI-02` | `422` | `DOCUMENT_ID_TAX_VALIDATION` | Boleta (DNI 8 dígitos o menor cuantía) / Factura (RUC 11 + Razón Social) | Para emitir Factura es obligatorio ingresar RUC válido (11 dígitos) y Razón Social. |
| `RN-TRI-03` | `403/422` | `CREDIT_NOTE_ADMIN_ONLY` | Anulación de orden `cobrado` exige Nota de Crédito + motivo + `TN01` | La anulación de una venta cobrada requiere Nota de Crédito autorizada por Administrador. |
| `RN-TRI-04` | `200` | `RECEIPT_ARCHIVE_RETENTION` | Conservación digital e historial de comprobantes en BD | Comprobante archivado en historial digital para consulta y auditoría tributaria. |

### 3.10 Seguridad, Roles y Privacidad (`RN-SEG`)
| `ruleCode` | `HTTP` | `error` | Validación / Constraint | Mensaje Base UI (*Poka-Yoke*) |
|---|:---:|---|---|---|
| `RN-SEG-01` | `401/403` | `RBAC_FORBIDDEN` | `auth.middleware.ts` + `rbac.middleware.ts` (`TN01`–`TN05`, `AN01`) | No tienes permisos suficientes para ejecutar esta operación. |
| `RN-SEG-02` | `400` | `PCI_DSS_RAW_CARD_REJECTED` | Rechazo explícito si llegan campos `pan`/`cardNumber`/`cvv` en DTOs | Por seguridad PCI-DSS, el sistema no acepta ni almacena datos crudos de tarjeta. |
| `RN-SEG-03` | `500/422` | `AUDIT_LOG_ATOMIC_REQUIRED` | `auditService.log(tx, ...)` en la misma transacción + `TR_AuditLog_Inmutable` | Toda operación crítica queda registrada con usuario, fecha y hora inmutable. |
| `RN-SEG-04` | `422` | `PERSONAL_DATA_PROTECTION` | Cifrado en reposo/tránsito y confidencialidad Ley N° 29733 | Tus datos personales están protegidos conforme a la Ley N° 29733. |

---

## 4. Reglas de Accesibilidad Universal (`RN-ACC-01..06` · Solo Comprador `AN01`)

> Conforme a la decisión de alcance por audiencia (`24/11/2026`), las reglas `RN-ACC-01` a `RN-ACC-06` aplican **exclusivamente** a las vistas del comprador (`index.html`), manteniendo la excepción aprobada del modo activable **Daltonismo y Lectura Ampliada**. Las respuestas del backend colaboran devolviendo `message` claros en español y `field` exacto para regiones `aria-live`.

| Código | Alcance Backend / API | Alcance Frontend (`index.html` vs Internas) |
|---|---|---|
| `RN-ACC-01` | Mensajes de error legibles sin depender de códigos de color. | Contraste Espresso & Piedra AA/AAA + `prefers-contrast: more` (`19.56:1`) solo en `body.io-storefront`. |
| `RN-ACC-02` | `ProductoVariante` expone siempre `color` textual + `color_textura` (6 tramas). | Nombre textual siempre visible; texturas SVG activas en Modo Daltonismo (`AN01`). |
| `RN-ACC-03` | Campo `field` en errores JSON para enfocar el control inválido. | Operabilidad por teclado, `:focus-visible` doble, botones $\ge 44\times44\text{ px}$ (`AN01`) / atajos `F2`–`F8` (POS). |
| `RN-ACC-04` | `alt_text` obligatorio en productos/campañas; textos cortos para `aria-live`. | `aria-live` y estructura semántica solo en páginas del comprador (`AN01`) y acceso. |
| `RN-ACC-05` | Paginación y payloads predecibles para zoom 200% sin desbordes. | Escalado fluido en `rem` y `prefers-reduced-motion: reduce` global. |
| `RN-ACC-06` | `opt_in_marketing = 0` por defecto y confirmaciones explícitas en endpoints críticos. | Prevención de errores *Poka-Yoke* sin patrones oscuros ni casillas pre-marcadas. |

# 🛡️ Matriz RBAC de Endpoints (`MATRIZ_RBAC_ENDPOINTS.md`)

> **Sistema:** Sistema Omnicanal I&O (`backend/docs_api/`)  
> **Contrato Vinculado:** [`openapi.yaml`](./openapi.yaml) (correspondencia 1:1 de las 72 operaciones REST en 65 rutas)  
> **Base Normativa:** `RN-SEG-01` (Mínimo Privilegio), `CK_Empleado_RolRBAC` (`DB/esquemas/01_esquema_io_sqlserver_variantes.sql`), `frontend/src/auth/demoSession.ts`  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**

---

## 1. Catálogo de Roles y Perfiles

| Código | `dbo.Empleado.rol_rbac` | `DemoRole` en `frontend/` | Vistas HTML Asociadas | Alcance de Autoridad |
|---|---|---|---|---|
| **TN01** | `Administrador` | `administrador` | `admin.html` (+ `pos-vendedor.html`, `pos-cajero.html`, `almacen.html`, `marketing.html`) | Control total: aprobaciones (`RN-COM-01`, `RN-MKT-04`), reapertura OC (`RN-COM-02`), descuentos POS `> 0%` (`RN-VEN-03`), Notas de Crédito (`RN-TRI-03`), alta de modelos, pago a proveedores (`RN-COM-05`), planilla (`RN-FIN-*`) y auditoría global. |
| **TN02** | `Vendedor` | `vendedor` | `pos-vendedor.html` *(+ lectura cruzada en `pos-cajero.html` en demo)* | Consulta de inventario SKU, sugeridor de alternativas (`RN-VEN-02`), creación de órdenes POS, y confirmación de entregas `M03` (`RN-ENV-02`). |
| **TN03** | `Community Manager` | `community_manager` | `marketing.html` | Gestión editorial (`Recién llegados`), uploads, slides Hero, colecciones curadas, propuestas/edición/pausa de campañas (`RN-MKT-01..03`) y consulta acotada de inventario/auditoría `M05`. |
| **TN04** | `Almacenero` | `almacenero` | `almacen.html` | Despachos, verificación SKU, emisión de `GuiaEnvio` e intentos `M03` (`RN-ENV-01..03`), postulación de proveedores, solicitudes OC y recepción conforme/reclamo `M04` (`RN-COM-03`/`04`), mermas (`RN-INV-04`), y **préstamos con emisión de Constancia Formal en ausencia del gerente (`RN-PRE-01`)**. |
| **TN05** | `Cajero` | `cajero` | `pos-cajero.html` *(+ lectura cruzada en `pos-vendedor.html` en demo)* | Cobros y abonos POS, actualización de datos de Boleta/Factura, cancelación de órdenes pendientes, arqueo diario y cobro/abonos de cuentas Aliados (`M06` → `M01`). |
| **AN01** | *(Externo — `dbo.RegistroCliente`)* | `cliente` | `index.html`, `acceso.html` | Compra omnicanal web: catálogo público sin cifras de stock, reserva de carrito 15 min, checkout 3 pasos, seguimiento de pedidos propios y cancelación previa a `"En envío"` (`RN-ECO-05`), más consulta de su propia boleta/perfil. |
| **PUB** | *(Sin JWT — Invitado)* | invitado | `index.html`, `acceso.html` | Salud del sistema, configuración pública de tienda, login/registro, catálogo público (sin stock numérico), reserva temporal anónima de carrito y feed público de marketing. |
| *(Demo)* | *(Excluido de `CK_Empleado_RolRBAC`)* | `respaldo` | `zona-preparacion.html?zona=operaciones` | **Solo prototipo frontend (`demoSession.ts:95`).** Carece de credenciales de producción en `dbo.Empleado` y `pendingZoneMain.ts:61` confirma que no tiene acciones operativas. Limitado estrictamente a `GET /api/health` y `GET /api/auth/me` (`403` en todo `M01`–`M08`). |

---

## 2. Reglas Especiales de Control Dual y Reconciliación `frontend/` ↔ `RN-*`

1. **`RN-PRE-01` (Delegación de Consignación al Almacenero):** En `POST /api/prestamos`, cuando `gerente_disponible = true`, autoriza `TN01` Administrador (o presencia verificada); cuando **`gerente_disponible = false`**, **`TN04` Almacenero** queda explícitamente facultado para autorizar la salida emitiendo un `numero_constancia_formal` único (`CONST-PRE-XXX`), registrado atómicamente en `dbo.AuditLog` (`RN-SEG-03`).
2. **`RN-VEN-03` (Descuento Especial POS `> 0%` hasta `10%`):** `TN02` Vendedor puede crear órdenes POS con `descuento_pct = 0`. Si `0 < descuento_pct <= 10`, el servidor exige autorización explícita de `TN01` Administrador (`autorizacion_admin_id` / token elevado) y bloquea con `422` cualquier valor `> 10%` (`CK_PedidoCliente_Descuento`).
3. **`RN-COM-01`, `RN-COM-02` y `RN-MKT-04` (Aprobaciones Exclusivas de Gerencia):** `TN04` Almacenero puede registrar proveedores candidatos y borradores de compra (`POST /api/compras/proveedores`, `POST /api/compras/ordenes`), y `TN03` Community Manager puede proponer campañas (`POST/PUT /api/marketing/campanas`). Sin embargo, **únicamente `TN01` Administrador** puede aprobar/rechazar proveedores, aprobar/rechazar/reabrir órdenes de compra (`RN-COM-02`), pagar a proveedores (`RN-COM-05`) y aprobar/rechazar campañas (`aprobada_dueno = 1`, `RN-MKT-04`).
4. **`RN-TRI-03` (Anulación Post-Venta con Nota de Crédito):** `TN05` Cajero puede cancelar órdenes en estado `pendiente_cobro` (`POST /api/pos/ordenes/:id/cancelar`). Una vez emitido el comprobante y cobrada la orden (`cobrado`), **únicamente `TN01` Administrador** puede emitir la Nota de Crédito (`POST /api/pos/ordenes/:id/nota-credito`) con `motivo_anulacion`, restitución de stock y asiento `Egreso`.
5. **`RN-ENV-02` y `RN-ENV-03` (Reconciliación `almacen.html` vs `03_Reglas_de_Negocio_IO.md`):** El documento RUP (`03_Reglas_de_Negocio_IO.md:121`) asigna la validación de entrega al `Vendedor` (`TN02`), mientras que el frontend implementado (`almacen.html`) la ejecuta desde `Almacenero` (`TN04`). Para mantener coherencia operativa sin romper el frontend ni la regla, `POST /api/envios/despachos/:id/intentos` permite **`TN04` Almacenero + `TN02` Vendedor + `TN01` Administrador**.
6. **Nota de Compatibilidad por Acceso Cruzado `pos-*` (`demoSession.ts:322-324`):** En el frontend actual, tanto `vendedor` como `cajero` pueden navegar entre `pos-vendedor.html` y `pos-cajero.html`. En la API de producción se respeta la visibilidad de lectura compartida (`GET /api/pos/ordenes`, `GET /api/pos/inventario/:sku/alternativas`), pero se aplica **separación estricta de escritura por `RN-SEG-01`**: `TN02` Vendedor crea órdenes (`POST /api/pos/ordenes`); `TN05` Cajero cobra, actualiza comprobantes, cancela órdenes pendientes, realiza arqueo y gestiona cobros Aliados (`TN01` supervisa todo).

---

## 3. Matriz Completa Endpoint × Rol (72 Operaciones de `openapi.yaml`)

Leyenda:
- **`✅`** = Acceso permitido
- **`🔒`** = Permitido bajo condición de dominio (propiedad de recurso `AN01`, firma HMAC de webhook, aprobación `TN01` en descuento `>0%`, constancia `RN-PRE-01` cuando `gerente_disponible=false`, o alcance acotado al módulo del rol)
- **`👁️`** = Solo lectura / compatibilidad de consulta cruzada (`pos-*` o `M02` desde Marketing)
- **`❌`** = Denegado (`401 Unauthorized` si falta JWT, `403 Forbidden` si rol insuficiente)

### 3.1 Health, Config, Auth y Catálogo (10 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/health` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Salud del servicio |
| `GET` | `/api/config/empresa` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Razón Social, RUC, flete S/10, 7 días |
| `POST` | `/api/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | `RN-SEG-01`, `RN-SEG-04` |
| `POST` | `/api/auth/register` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Registro externo `AN01` (`opt_in=0`) |
| `GET` | `/api/auth/me` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Perfil de sesión activa |
| `POST` | `/api/auth/logout` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Cierre de sesión |
| `GET` | `/api/catalogo/productos` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | DTO público **sin stock numérico** (`RN-INV-01`) |
| `GET` | `/api/catalogo/taxonomia` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 6 marcas, 8 categorías, 30 subcategorías |
| `GET` | `/api/catalogo/inventario` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Stock numérico exacto `TN01`–`TN05` |
| `POST` | `/api/catalogo/modelos` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Alta persistente de modelos desde `admin.html` |

### 3.2 Módulo `M01` — Ventas en Tienda POS & Cuentas Aliados (12 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/pos/inventario/{sku}/alternativas` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | 👁️ | ❌ | `RN-VEN-02` + compatibilidad lectura `pos-*` |
| `GET` | `/api/pos/ordenes` | ❌ | ❌ | ✅ | 👁️ | ❌ | ❌ | ✅ | ❌ | Cola POS compartida en lectura (`pos-*`) |
| `POST` | `/api/pos/ordenes` | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | `TN02` crea; desc. `>0%` requiere auth `TN01` (`RN-VEN-03`) |
| `PATCH` | `/api/pos/ordenes/{id}/comprobante` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | `RN-TRI-02` Boleta/Factura |
| `POST` | `/api/pos/ordenes/{id}/pagos` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | `RN-VEN-04`, `RN-VEN-06`, `RN-TRI-01` |
| `POST` | `/api/pos/ordenes/{id}/cancelar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Solo órdenes `pendiente_cobro` |
| `POST` | `/api/pos/ordenes/{id}/nota-credito` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **`RN-TRI-03` exclusivo `TN01` Admin** |
| `GET` | `/api/pos/comprobantes/{id}` | ❌ | 🔒 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | `RN-TRI-04` (`AN01` solo propios) |
| `GET` | `/api/pos/arqueo` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Arqueo diario de caja |
| `GET` | `/api/pos/aliados` | ❌ | ❌ | ✅ | ❌ | ❌ | 👁️ | ✅ | ❌ | Cuentas Aliados (`TN04` consulta enlace `M06`) |
| `POST` | `/api/pos/aliados` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Alta manual de deuda en Caja |
| `POST` | `/api/pos/aliados/{id}/abonos` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | Abono / liquidación de deuda Aliado |

### 3.3 Módulo `M02` — Venta Online E-commerce (7 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `POST` | `/api/ecommerce/carrito/reservar` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Reserva 15 min (`RN-ECO-03`) y flete `S/ 10` |
| `POST` | `/api/ecommerce/pedidos` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Checkout 3 pasos (`RN-ECO-06`) |
| `GET` | `/api/ecommerce/pedidos/{id}` | ❌ | 🔒 | ✅ | ❌ | 👁️ | 👁️ | ❌ | ❌ | `AN01` solo propios; `TN03`/`TN04` lectura operativa |
| `GET` | `/api/ecommerce/mis-pedidos` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Historial propio del cliente `AN01` |
| `POST` | `/api/ecommerce/pedidos/{id}/pagar` | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Tokenizado PCI-DSS (`RN-ECO-02`, `RN-SEG-02`) |
| `POST` | `/api/ecommerce/webhooks/pasarela` | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Firma criptográfica HMAC de pasarela (`RN-SEG-02`) |
| `POST` | `/api/ecommerce/pedidos/{id}/cancelar` | ❌ | 🔒 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `RN-ECO-05` antes de `"En envío"` (`AN01` propio) |

### 3.4 Módulo `M03` — Envíos y Courier (4 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/envios/despachos` | ❌ | ❌ | ✅ | 👁️ | ❌ | ✅ | ❌ | ❌ | Cola de despachos `M03` |
| `POST` | `/api/envios/despachos/{id}/verificar-sku` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Picking post-pago (`RN-ECO-01`) |
| `POST` | `/api/envios/despachos/{id}/guia` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Emisión `GuiaEnvio` (`RN-ENV-01`) |
| `POST` | `/api/envios/despachos/{id}/intentos` | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | `RN-ENV-02`/`03`: reconcilia `almacen.html` (`TN04`) y RUP (`TN02`) |

### 3.5 Módulo `M04` — Compras y Proveedores (12 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/compras/alertas-stock` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Stock `<= 5` unidades (`RN-INV-03`) |
| `GET` | `/api/compras/proveedores` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Proveedores aprobados y candidatos |
| `POST` | `/api/compras/proveedores` | ❌ | ❌ | ✅ | ❌ | ❌ | 🔒 | ❌ | ❌ | `TN04` postula (`pendiente_validacion`); `auto_approve` solo `TN01` |
| `PATCH` | `/api/compras/proveedores/{id}/aprobar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Aprobación exclusiva `TN01` (`RN-COM-01`) |
| `PATCH` | `/api/compras/proveedores/{id}/rechazar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Rechazo exclusivo `TN01` |
| `GET` | `/api/compras/ordenes` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Órdenes de compra `PedidoProveedor` |
| `POST` | `/api/compras/ordenes` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Solicitud/cotización en `pendiente_aprobacion` |
| `PATCH` | `/api/compras/ordenes/{id}/aprobar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Aprobación exclusiva `TN01` (`RN-COM-01`) |
| `PATCH` | `/api/compras/ordenes/{id}/rechazar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Rechazo exclusivo `TN01` (`RN-COM-02`) |
| `PATCH` | `/api/compras/ordenes/{id}/reabrir` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Reapertura de cotización (`RN-COM-02`) |
| `POST` | `/api/compras/ordenes/{id}/recepcion` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | Conformidad Guía Remisión / reclamo (`RN-COM-03`/`04`) |
| `POST` | `/api/compras/ordenes/{id}/pagar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Pago proveedor (`RN-COM-05`), bloqueado si hay reclamo |

### 3.6 Módulo `M05` — Marketing y Catálogo Web (14 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/marketing/publico` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Feed público sin `stock_maximo`/`stock_consumido` |
| `GET` | `/api/marketing/editorial` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Cola `Recién llegados` y fichas |
| `PUT` | `/api/marketing/editorial/{groupId}` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `RN-MKT-02` / `RN-ACC-04` `alt_text` |
| `POST` | `/api/marketing/uploads` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Carga de imágenes Hero/Catálogo |
| `GET` | `/api/marketing/hero` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Gestión de slides Hero |
| `PUT` | `/api/marketing/hero/{id}` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Edición de slide Hero |
| `GET` | `/api/marketing/colecciones` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Colecciones curadas |
| `PUT` | `/api/marketing/colecciones/{id}` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Edición de colección |
| `GET` | `/api/marketing/campanas` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Incluye cuotas `stock_maximo`/`stock_consumido` |
| `POST` | `/api/marketing/campanas` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Propuesta campaña (`RN-MKT-01`, `RN-MKT-03`) |
| `PUT` | `/api/marketing/campanas/{id}` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Edición de campaña |
| `PATCH` | `/api/marketing/campanas/{id}/aprobar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **Exclusivo `TN01` (`RN-MKT-04`)** |
| `PATCH` | `/api/marketing/campanas/{id}/rechazar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **Exclusivo `TN01` (`RN-MKT-04`)** |
| `PATCH` | `/api/marketing/campanas/{id}/pausar` | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Pausa/reactivación operativa |

### 3.7 Módulo `M06` — Préstamos y Consignación (3 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/prestamos` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | 👁️ | ❌ | Semáforo de préstamos `<= 7 días` |
| `POST` | `/api/prestamos` | ❌ | ❌ | ✅ | ❌ | ❌ | 🔒 | ❌ | ❌ | `TN04` emite **Constancia Formal (`RN-PRE-01`)** si `gerente_disponible=false` |
| `POST` | `/api/prestamos/{id}/cerrar` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | `devuelto` (`RN-PRE-04`), `liquidado_caja`, `deterioro_mayorista` (`RN-PRE-05`) |

### 3.8 Módulos `M07` (Finanzas y Planilla) y `M08` (Mesa de Control y Auditoría) (10 operaciones)
| Método | Ruta (`openapi.yaml`) | PUB | AN01 | TN01 Admin | TN02 Vend. | TN03 CM | TN04 Alm. | TN05 Cajero | Demo `respaldo` | Regla / Nota |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GET` | `/api/finanzas/planillas/actual` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Planilla + liquidez bancaria (`RN-FIN-02`) |
| `POST` | `/api/finanzas/planillas/calcular` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Cálculo mensual (`RN-FIN-01`) |
| `POST` | `/api/finanzas/planillas/{periodo}/cerrar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Cierre inmutable (`RN-FIN-04`, `RN-FIN-05`) |
| `GET` | `/api/finanzas/planillas/{periodo}/boletas/{empleadoId}` | ❌ | ❌ | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | ❌ | Boleta individual (`TN02`–`TN05` solo su propia boleta) |
| `PATCH` | `/api/finanzas/planillas/{periodo}/boletas/{empleadoId}/firmar` | ❌ | ❌ | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | ❌ | Firma de boleta (`RN-FIN-03`, empleado propio o Admin) |
| `GET` | `/api/finanzas/movimientos` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Libro `MovimientoFinanciero` |
| `GET` | `/api/dashboard/snapshot` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Pulso KPI + cola de decisiones 5 áreas |
| `POST` | `/api/dashboard/decisiones/{id}/revisar` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Marcar decisión revisada (`AuditLog`) |
| `GET` | `/api/dashboard/analitica` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Analítica multicanal y valuación |
| `GET` | `/api/dashboard/auditoria` | ❌ | ❌ | ✅ | ❌ | 🔒 | 🔒 | ❌ | ❌ | `TN01` global; `TN03` solo `M05`; `TN04` solo `M03/M04/M06` |

---

## 4. Matriz de Visibilidad de Datos Sensibles por Audiencia

| Dato / Entidad | `PUB` / `AN01` Cliente | `TN02` / `TN05` POS | `TN03` Marketing | `TN04` Almacén | `TN01` Administrador | Regla Sustentadora |
|---|---|---|---|---|---|---|
| **Stock numérico (`ProductoVariante.stock`)** | ❌ **Oculto** *(solo `disponible: boolean`)* | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | `RN-INV-01`, Regla `24/11/2026` IHC |
| **Cuota campaña (`stock_maximo`, `stock_consumido`)** | ❌ **Oculto** *(solo `vigente: boolean`)* | ❌ Oculto *(solo precio promo vigente)* | ✅ Visible | ❌ | ✅ Visible | `RN-MKT-01`, Regla `24/11/2026` IHC |
| **Costo compra (`precio_compra`, `costo_unitario`)** | ❌ | ❌ | ❌ | ✅ | ✅ | `RN-COM-01`, `RN-SEG-01` |
| **Planilla y sueldos (`dbo.Planilla`)** | ❌ | 🔒 Solo propia boleta | 🔒 Solo propia boleta | 🔒 Solo propia boleta | ✅ Completa | `RN-FIN-01..05`, `RN-SEG-04` |
| **Bitácora (`dbo.AuditLog`)** | ❌ | ❌ | 🔒 Subconjunto `M05` | 🔒 Subconjunto `M03/M04/M06` | ✅ Global (`M01`–`M08`) | `RN-SEG-03` |
| **Datos de tarjeta (`PAN` / `CVV`)** | ❌ **Nunca almacenado ni recibido** | ❌ | ❌ | ❌ | ❌ | `RN-SEG-02` (PCI-DSS) |

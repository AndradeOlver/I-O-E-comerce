# ⚙️ Backend – Sistema Omnicanal I&O (`1.3 backend/`)

> **Estado Actual:** ✅ **Stack Aprobado: Node.js + Express (TypeScript)** — Aprobado el `20/11/2026` en [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md)  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Fuentes de Verdad:**  
> * Reglas y procesos RUP: `../documentos/Model Soft Proyecto/Informacion del negocio/03_Reglas_de_Negocio_IO.md`  
> * Requisitos priorizados: `../documentos/Interaccion Humano Com Proyecto/Informacion_IHC/03_Requerimientos_y_Reglas_Accesibles_IO.md`

---

## 📂 Organización de esta Carpeta

```text
backend/
├── docs_api/      <-- Mapeo de contratos REST/OpenAPI, matriz RBAC (5 roles) y catálogo de 42 reglas a validar
├── .gitkeep
└── README.md      <-- Este documento orientativo
```

---

## 🧩 Los 7 Módulos de Negocio (+ Analítica KPI) a Exponer

El servidor implementará la lógica transaccional y APIs de los **7 Casos de Uso del Negocio (`CUN01`–`CUN07`)** más la capa transversal de tablero e identidad:

1. **Módulo `M01` – Ventas en Tienda (`CUN01`):** Consulta instantánea por SKU (`Producto` + talla + color), sugeridor de prendas/tallas alternativas (`RN-VEN-02`), cálculo de IGV `18%`, emisión correlativa de Boletas/Facturas/Notas de Crédito (`RN-TRI-01` a `RN-TRI-03`) y control de descuentos máx. `10%` (`RN-VEN-03`).
2. **Módulo `M02` – Venta Online E-commerce (`CUN02`):** Reserva temporal de stock en carrito por `15 minutos` (`RN-ECO-03`), gestión de máquina de 6 estados del pedido (`RN-ECO-04`), integración con webhooks de pasarela externa (Yape/Culqi/Niubiz) con hasta `3 reintentos` (`RN-ECO-02`) y cancelación previa a `"En envío"` (`RN-ECO-05`).
3. **Módulo `M03` – Envíos y Courier (`CUN03`):** Desbloqueo de empaque solo tras pago aprobado (`RN-ECO-01`), cálculo de flete urbano y exoneración `> S/ 150` (`RN-ENV-04`), emisión de `GuiaEnvio` con código de seguimiento único (`RN-ENV-01`) y control de hasta `2 intentos` de entrega con firma/DNI (`RN-ENV-02`, `RN-ENV-03`).
4. **Módulo `M04` – Compras de Mercadería e Inventario (`CUN04`):** Alerta automática cuando cualquier SKU cae a `<= 5 unidades` (`RN-INV-03`), flujo de cotizaciones y aprobación de `PedidoProveedor` (`RN-COM-01`, `RN-COM-02`), ingreso a stock condicionado a conformidad física con Guía de Remisión (`RN-COM-03`) y bloqueo de pago ante reclamos (`RN-COM-04`).
5. **Módulo `M05` – Marketing y Catálogo (`CUN05`):** Gestión de campañas con vigencia y stock límite obligatorio (INDECOPI Ley 29571, `RN-MKT-01`), ocultamiento/baja automática al llegar stock a `0`, visto bueno del Dueño (`RN-MKT-04`) y registro de consentimiento *opt-in* (Ley 29733, `RN-MKT-03`).
6. **Módulo `M06` – Préstamos y Consignación (`CUN06`):** Control de salidas a `Otra Tienda` con plazo máximo de `30 días` (`RN-PRE-02`), transición de stock a `"En Consignación"` (`RN-PRE-03`), **regla crítica `RN-PRE-01` (autorización delegada al Almacenero para emitir Constancia Formal de Préstamo en ausencia del Gerente)**, devolución o liquidación/facturación por merma (`RN-PRE-04`, `RN-PRE-05`).
7. **Módulo `M07` – Pago de Planilla y Finanzas (`CUN07`):** Cálculo automático de haberes, comisiones y deducciones (`RN-FIN-01`), verificación previa de liquidez bancaria (`RN-FIN-02`), generación de boleta y asiento en `MovimientoFinanciero` (`RN-FIN-04`) e inmutabilidad de cierres históricos (`RN-FIN-05`).
8. **Módulo `M08` – Autenticación, Auditoría y Endpoints KPI:** Emisión de métricas agregadas para el Dashboard gerencial y registro forense inmutable de operaciones críticas (`RN-SEG-03`).

---

## 🛡️ Seguridad RBAC (5 Roles) y Las 42 Reglas de Negocio a Validar

### Control de Acceso Basado en Roles (`RN-SEG-01`)
* **`TN01` Administrador / Dueño:** Control total (aprobación de compras `RN-COM-01`, descuentos `> 10%` o especiales `RN-VEN-03`, anulaciones/Notas de Crédito `RN-TRI-03`, planilla `RN-FIN-*`, auditoría `RN-PRE-01` y reportes financieros).
* **`TN02` Vendedor:** Consulta de inventario por SKU, registro de pre-venta en tienda y consulta de alternativas (`RN-VEN-02`).
* **`TN03` Community Manager:** Administración de catálogo, campañas con *opt-in* (`RN-MKT-01` a `04`) y consulta de pedidos web.
* **`TN04` Almacenero:** Recepción conforme de compras (`RN-COM-03`), *picking/packing*, emisión de `GuiaEnvio` (`RN-ENV-01`), gestión de mermas (`RN-INV-04`) y **emisión de Constancia Formal de Préstamo en ausencia del gerente (`RN-PRE-01`)**.
* **`TN05` Cajero:** Registro de cobros presenciales, arqueo de caja y emisión de Boletas/Facturas (`RN-VEN-04`, `RN-TRI-01`, `RN-TRI-02`).
* *(Además del perfil externo **`AN01` Cliente** para compra web, historial y cancelación previa al envío).*

### Garantías Técnicas Obligatorias en Servidor
* **Cero Stock Negativo (`RN-VEN-06`, `RN-INV-02`):** Transacciones atómicas ACID en base de datos para impedir *race conditions* entre ventas simultáneas en tienda física y E-commerce.
* **Cero Custodia de Tarjetas (`RN-SEG-02` — PCI-DSS):** Prohibido recibir, procesar o guardar PAN o CVV en el backend; únicamente *tokens* efímeros y webhooks firmados de la pasarela externa.
* **Protección de Datos y Trazabilidad (`RN-SEG-03`, `RN-SEG-04`):** Hashing seguro de contraseñas (`bcrypt`/`Argon2`), cifrado de datos personales conforme a la **Ley N° 29733** y bitácora inmutable (*Audit Log*: usuario, rol, timestamp, entidad, acción) en toda operación sensible.

---

## ⚖️ Stack Tecnológico Aprobado

Decisión registrada en la Sección 2.2 de [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md) (`20/11/2026`):
* **Opción A:** **Node.js + Express (TypeScript)** *(✅ Aprobado)*.
* **Opción B:** Python + FastAPI o Django *(⬜ Descartada)*.
* **Opción C:** Java Spring Boot / C# ASP.NET Core *(⬜ Descartada)*.

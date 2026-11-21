# 🗄️ Base de Datos – Sistema Omnicanal I&O (`1.4 DB/`)

> **Estado Actual:** ✅ **Motor Aprobado: Microsoft SQL Server (T-SQL)** — Esquema DDL ([01_esquema_io_sqlserver.sql](esquemas/01_esquema_io_sqlserver.sql)) y semillas ([01_datos_iniciales_io.sql](seeds/01_datos_iniciales_io.sql)) generados.  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Fuente de Verdad del Modelo de Datos:** `../documentos/Model Soft Proyecto/Informacion del negocio/02_MAN_IO.md` (v2.1 aprobado)

---

## 📂 Organización de esta Carpeta

```text
DB/
├── esquemas/      <-- Futuros scripts DDL, migraciones, índices, constraints CHECK y herencia
├── seeds/         <-- Futuros datos iniciales de prueba (categorías, SKUs, roles RBAC, parámetros)
├── .gitkeep
└── README.md      <-- Este documento orientativo
```

---

## 🧱 Diccionario de las 12 Entidades Aprobadas de I&O (`EN01` – `EN12`)

Toda implementación relacional futura deberá respetar estrictamente las **12 entidades aprobadas en el MAN v2.1**, incluyendo la **jerarquía de herencia en `Pedido` y `DetallePedido`**, así como el atributo **`stock` directamente sobre `Producto`** (diferenciado por SKU `talla` + `color`):

| Código | Entidad | Tipo / Herencia | Atributos Conceptuales Aprobados (`02_MAN_IO.md`) | Relaciones y Reglas Críticas |
|:---:|---|---|---|--|
| **EN01** | **`Producto`** | Entidad Principal | `id`, `nombre`, `descripcion`, `marca`, `talla`, `color`, `precioCompra`, `precioVenta`, `stock` | Pertenece a `Categoria`. El **`stock`** es atributo intrínseco por SKU (talla + color, `RN-INV-01`). Requiere `CHECK (stock >= 0)` (`RN-VEN-06`) y alerta cuando `stock <= 5` (`RN-INV-03`). |
| **EN02** | **`Categoria`** | Entidad Principal | `id`, `nombre`, `descripcion` | Clasifica prendas (polos, pantalones, vestidos, casacas, conjuntos, accesorios) y soporta campañas (`CUN05`). |
| **EN03** | **`Pedido`** | **Superclase / Generalización** | `id`, `fecha`, `estado`, `total` | Base común de transacciones comerciales. Se asocia con `DetallePedido` y `MovimientoFinanciero`. |
| **EN03.1** | **`PedidoCliente`** | **Subclase de `Pedido`** | *(Hereda `Pedido`)* + `direccionEnvio`, `modalidadEntrega` | Vinculado a `RegistroCliente`, `ComprobantePago` y `GuiaEnvio`. Controla los 6 estados de `RN-ECO-04`. |
| **EN03.2** | **`PedidoProveedor`** | **Subclase de `Pedido`** | *(Hereda `Pedido`)* + `fechaEntregaPactada`, `condicionesPago` | Vinculado a `RegistroProveedor`. Requiere aprobación del Dueño (`RN-COM-01`) y conformidad física previa al ingreso de stock (`RN-COM-03`). |
| **EN04** | **`DetallePedido`** | **Superclase / Generalización** | `id`, `cantidad`, `precioUnitario`, `subtotal` | Línea individual asociada a `Pedido` y `Producto` (`RN-INV-02`). |
| **EN04.1** | **`DetallePedidoCliente`** | **Subclase de `DetallePedido`** | *(Hereda `DetallePedido`)* | Detalle de prendas vendidas en tienda (`CUN01`) u online (`CUN02`). |
| **EN04.2** | **`DetallePedidoProveedor`** | **Subclase de `DetallePedido`** | *(Hereda `DetallePedido`)* | Detalle de prendas solicitadas en abastecimiento textil (`CUN04`). |
| **EN05** | **`ComprobantePago`** | Entidad Principal | `id`, `numero`, `tipo`, `fecha`, `igv`, `total` | Asociado a `PedidoCliente`. Garantiza numeración correlativa (`RN-TRI-01`), Boleta/Factura/Nota de Crédito (`RN-TRI-02`, `RN-TRI-03`) e IGV `18%`. |
| **EN06** | **`RegistroCliente`** | Entidad Principal | `id`, `dniRuc`, `nombres`, `telefono`, `email`, `direccion` | Asociado a `PedidoCliente`. Resguardado bajo Ley N° 29733 (`RN-SEG-04`) y campo explícito de consentimiento *opt-in* (`RN-MKT-03`). |
| **EN07** | **`RegistroProveedor`** | Entidad Principal | `id`, `ruc`, `razonSocial`, `contacto`, `telefono` | Asociado a `PedidoProveedor` para abastecimiento de talleres textiles (`CUN04`). |
| **EN08** | **`GuiaEnvio`** | Entidad Principal | `id`, `codigoSeguimiento`, `direccionDestino`, `estadoEnvio` | Asociada a `PedidoCliente`. Soporta tracking único (`RN-ENV-01`) y hasta 2 intentos de entrega (`RN-ENV-03`). |
| **EN09** | **`PrestamoProductos`** | Entidad Principal | `id`, `fechaSalida`, `plazoDias`, `estado` | Asociada a `Producto`. Soporta plazo máx. de 7 días (`RN-PRE-02`), estado *"En Consignación"* (`RN-PRE-03`) y trazabilidad de la **Constancia Formal emitida por el Almacenero en ausencia del gerente (`RN-PRE-01`)**. |
| **EN10** | **`Empleado`** | Entidad Principal | `id`, `dni`, `nombres`, `cargo`, `sueldoBase` | Asociado a `Planilla`. Mapea los roles internos (`TN01`–`TN05`) para RBAC (`RN-SEG-01`). |
| **EN11** | **`Planilla`** | Entidad Principal | `id`, `periodo`, `sueldoNeto`, `bonificaciones`, `descuentos` | Asociada a `Empleado` y `MovimientoFinanciero`. Soporta cálculo mensual (`RN-FIN-01`), verificación de liquidez (`RN-FIN-02`) y bloqueo retroactivo (`RN-FIN-05`). |
| **EN12** | **`MovimientoFinanciero`** | Entidad Principal | `id`, `fecha`, `tipo`, `concepto`, `monto` | Libro de ingresos/egresos vinculado a `Pedido` y `Planilla` (`RN-VEN-04`, `RN-FIN-04`). |

---

## 🛠️ Lineamientos Físicos en Microsoft SQL Server (T-SQL)

1. **Estrategia de Herencia (`Pedido` y `DetallePedido`):** *Class Table Inheritance* (tablas padre `Pedido` / `DetallePedido` + tablas hijas con FK compartida) garantizando integridad referencial para `MovimientoFinanciero`.
2. **Soporte Transversal de Seguridad y Reglas:**
   * Tabla/entidad operativa auxiliar para **Bitácora de Auditoría Inmutable (*Audit Log*)** (`RN-SEG-03`: usuario, rol, acción, fecha/hora, detalle de Constancia `RN-PRE-01` o anulación `RN-TRI-03`).
   * **Prohibición PCI-DSS (`RN-SEG-02`):** Ninguna columna almacenará PAN completo ni CVV de tarjetas; únicamente identificador/referencia tokenizada de la pasarela.
   * **Concurrencia ACID (`RN-VEN-06`):** Transacciones con bloqueo pesimista o aislamiento serializable al descontar `Producto.stock`.

---

## ⚖️ Motor de Base de Datos Aprobado

Decisión registrada en la Sección 2.3 de [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md) (`20/11/2026`):
* **Opción A:** PostgreSQL *(⬜ Descartada)*.
* **Opción B:** MySQL / MariaDB (motor InnoDB) *(⬜ Descartada)*.
* **Opción C:** **Microsoft SQL Server (T-SQL)** *(✅ Aprobado — DDL y seeds en `esquemas/` y `seeds/`)*.

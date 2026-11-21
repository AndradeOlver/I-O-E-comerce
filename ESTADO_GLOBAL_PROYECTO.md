# 🌐 Estado Global del Proyecto: Sistema Omnicanal I&O

> **Empresa de Estudio:** Comercializadora Retail de Moda **I&O** (Tienda física + E-commerce omnicanal en Lima, Perú)  
> **Autores del Proyecto General y del Desarrollo (`frontend/`, `backend/`, `DB/`):**  
> 1. **ANDRADE CHIRINOS, Olver Daniel** (`N00401718`)  
> 2. **RAZURI PAREDES, Josue Daniel** (`N00421512`)  
> **Fase Global Actual:** `02. Stacks Tecnológicos Aprobados — Listo para Contratos y Desarrollo (React + Vite / Node.js + Express / SQL Server)`  
> **Última Actualización:** `21/11/2026` (Inicialización del repositorio raíz en GitHub `AndradeOlver/I-O-E-comerce` privado, aislando `documentos/` y `.agents/`)

---

## 🧭 1. Resumen del Ecosistema I&O

Este tablero maestro conecta la **documentación académica UPN** (en `documentos/`) con la **futura arquitectura de software** (`frontend/`, `backend/`, `DB/`):

| ID | Componente / Carpeta | Curso / Capa | Responsables / Equipo | Estado Git | Estado Actual | Documento de Control Local |
|:---:|---|---|---|---|:---:|---|
| **1.1.1** | `documentos/Model Soft Proyecto/` | Curso MOANSO (`ISOF1301`) — RUP / UML 2.5 | 5 integrantes: Andrade, Arias, Medina, Razuri, Restan | `.git` independiente (`origin/main` → `MoAnSo_G2.git`, ramas `dev-*`) | 🟡 **Artefactos base (`01`–`05`) aprobados; Líneas Amarillas 🟨 y Word en seguimiento** | [ESTADO_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/documentos/Model%20Soft%20Proyecto/ESTADO_PROYECTO.md) |
| **1.1.2** | `documentos/Interaccion Humano Com Proyecto/` | Curso IHC — UX/UI, Design Sprint, WCAG 2.1 AA y Rúbrica RE3 (v1.5) | **2 integrantes exclusivos:** Olver Andrade (`N00401718`) y Josue Razuri (`N00421512`) | `.git` independiente local (`master`, sin commits aún) | ⚠️ **Falta revisión humana** (6 archivos fuente `Informacion_IHC/` y 2 `.docx` compilados) | [ESTADO_PROYECTO_IHC.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/documentos/Interaccion%20Humano%20Com%20Proyecto/ESTADO_PROYECTO_IHC.md) |
| **1.2** | `frontend/` | Capa de Presentación, UI POS/Web, Dashboard y Accesibilidad Nativa WCAG 2.1 AA | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | ✅ **Stack aprobado: React + Vite (TypeScript)** (incluye `docs_ui/`) | [frontend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/frontend/README.md) |
| **1.3** | `backend/` | Capa de Lógica de Negocio, APIs, RBAC (5 roles) y 42 Reglas | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | ✅ **Stack aprobado: Node.js + Express (TypeScript)** (incluye `docs_api/`) | [backend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/backend/README.md) |
| **1.4** | `DB/` | Capa de Persistencia (12 Entidades aprobadas con herencia) | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | ✅ **Microsoft SQL Server — DDL y seeds generados** (`esquemas/01_esquema_io_sqlserver.sql`, `seeds/01_datos_iniciales_io.sql`) | [DB/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/DB/README.md) |

---

## ⚖️ 2. Mesa de Decisión de Stacks Tecnológicos (Aprobados)

> [!NOTE]
> **STACKS APROBADOS:** Los 3 stacks (`frontend/`, `backend/`, `DB/`) fueron definidos el `20/11/2026`. Se habilita el diseño de contratos (`docs_ui/`, `docs_api/`, `esquemas/`) y la implementación progresiva de los módulos `M01`–`M08`.

### 2.1. Elección de Stack – `1.2 frontend/`
| Opción | Stack Tecnológico Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **HTML5 Semántico + CSS3 (*Design Tokens*) + JavaScript Vanilla ES6+ + Bootstrap 5.3** | Alineación directa con el prototipo evaluado en IHC (`SUS 88.5`, Bootstrap 5.3), cero configuración de empaquetado, control directo de ARIA/WCAG 2.1 AA. | Requiere disciplina modular manual conforme crecen las vistas POS, Dashboard y E-commerce. | ⬜ Descartada |
| **Opción B** | **React + Vite + TypeScript** | Componentes reutilizables (Selector Daltonismo, Tokens WCAG, POS), tipado estricto para modelos de SKU y estados del pedido, curva de aprendizaje directa e integración limpia con API Express. | Requiere manejo básico de ecosistema Node/npm y configuración de rutas en cliente. | ✅ Aprobado |
| **Opción C** | **Angular / Vue 3 + TypeScript** | Arquitectura fuertemente estructurada desde el inicio, reactividad integrada para carrito y dashboard KPI en tiempo real. | Curva más rígida en Angular o menor ecosistema corporativo local según preferencia del equipo. | ⬜ Descartada |

* **Decisión Aprobada Frontend:** `✅ Opción B — React + Vite + TypeScript` *(Aprobado el 20/11/2026 por Olver Andrade)*

---

### 2.2. Elección de Stack – `1.3 backend/`
| Opción | Stack Tecnológico Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **Node.js + Express (TypeScript)** | Unifica lenguaje con Frontend TS/JS, excelente manejo asíncrono de webhooks de pasarela (Culqi/Niubiz/Yape) y arquitectura modular limpia para los 7 CUNs. | Requiere validación estricta de transacciones y tipos numéricos decimales para IGV 18% y planilla. | ✅ Aprobado |
| **Opción B** | **Python + FastAPI o Django** | Desarrollo ágil, OpenAPI/Swagger automático (FastAPI) o admin/ORM maduro (Django), facilidad para generar reportes PDF/XML y compatibilidad con scripts Python ya usados en el proyecto. | Requiere mantener dos ecosistemas lingüísticos si el frontend es JS/TS. | ⬜ Descartada |
| **Opción C** | **Java Spring Boot / C# ASP.NET Core** | Tipado robusto de nivel empresarial, excelente soporte para transacciones ACID serializables y arquitectura orientada a objetos alineada con herencia UML. | Mayor consumo de recursos en VPS económico y mayor verbosidad de arranque. | ⬜ Descartada |

* **Decisión Aprobada Backend:** `✅ Opción A — Node.js + Express (TypeScript)` *(Aprobado el 20/11/2026 por Olver Andrade)*

---

### 2.3. Elección de Motor de Base de Datos – `1.4 DB/`
| Opción | Motor Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **PostgreSQL** | Máxima robustez ACID y aislamiento serializable (`RN-VEN-06`), restricciones `CHECK`, soporte nativo para JSONB en bitácoras de auditoría (`RN-SEG-03`) y excelente modelado relacional para la herencia `Pedido`/`DetallePedido`. | Requiere administración básica del servicio en VPS o nube. | ⬜ Descartada |
| **Opción B** | **MySQL / MariaDB** | Ampliamente soportado en hostings compartidos y VPS económicos, motor InnoDB con transacciones ACID y alta familiaridad académica. | Menor riqueza en tipos/constraints avanzados y particionamiento frente a PostgreSQL. | ⬜ Descartada |
| **Opción C** | **Microsoft SQL Server** | Integración empresarial robusta (T-SQL), transacciones ACID serializables (`RN-VEN-06`), restricciones `CHECK`, triggers de auditoría y modelado relacional sólido para herencia `Pedido`/`DetallePedido`. | Mayor consumo de RAM en despliegue; usar edición Express/Developer en desarrollo. | ✅ Aprobado |

* **Decisión Aprobada DB:** `✅ Opción C — Microsoft SQL Server` *(Aprobado el 20/11/2026 por Olver Andrade)*

---

## 🧩 3. Mapa de Módulos del Sistema I&O a Construir (`M01` – `M08`)

Una vez elegidos los stacks, los **8 módulos** integrarán de forma trazable los **7 Casos de Uso del Negocio (`CUN01`–`CUN07`)**, las **12 Entidades (`EN01`–`EN12`)**, las **42 Reglas Operativas**, los **10 RF de IHC** y las **6 Reglas de Accesibilidad (`RN-ACC`)**:

| Código | Módulo del Sistema I&O | CUN / Base IHC | Reglas y Capacidades Clave a Implementar | Impacto en Capas | Estado |
|:---:|---|---|---|---|---|
| **M01** | **Venta en Tienda (POS)** | `CUN01` / `RF02` / `DD-04` | Consulta SKU en vivo, **sugerencia automática de alternativas (`RN-VEN-02`)**, tope de descuento 10% (`RN-VEN-03`), Boleta (DNI) / Factura (RUC) con **IGV 18% (`RN-TRI-01`)**, bloqueo de stock cero (`RN-VEN-06`) y atajos de teclado `F2`–`F8`. | `frontend/` POS + `backend/` Ventas/SUNAT + `DB/` `PedidoCliente`, `ComprobantePago`, `MovimientoFinanciero` | ⏳ Esperando stack |
| **M02** | **Venta Online E-commerce** | `CUN02` / `RF01`, `RF03` / `DD-01`, `DD-03` | Catálogo SKU (talla + color), **carrito con reserva temporal 15 min (`RN-ECO-03`)**, checkout en 3 pasos, **pasarela tokenizada PCI-DSS (`RN-SEG-02`) con hasta 3 reintentos (`RN-ECO-02`)** y máquina de 6 estados (`RN-ECO-04`). | `frontend/` Tienda Web + `backend/` Carrito/Checkout/Webhook + `DB/` `Producto`, `RegistroCliente`, `PedidoCliente` | ⏳ Esperando stack |
| **M03** | **Envíos y Courier** | `CUN03` / `RF05` | Lista de *picking/packing* solo tras pago confirmado (`RN-ECO-01`), generación en 1 clic de **Guía de Envío con tracking único (`RN-ENV-01`)**, cálculo de flete transparente y **envío gratis > S/ 150 (`RN-ENV-04`)**, y registro de hasta **2 intentos con firma/DNI (`RN-ENV-02`, `RN-ENV-03`)**. | `frontend/` Panel Almacén + `backend/` Logística + `DB/` `GuiaEnvio`, `PedidoCliente` | ⏳ Esperando stack |
| **M04** | **Compra de Mercadería** | `CUN04` / `RF07` | **Alerta automática de stock $\le 5$ unidades por SKU (`RN-INV-03`)**, evaluación de cotizaciones, emisión de `PedidoProveedor` (`RN-COM-01`), control de calidad físico contra Guía de Remisión (`RN-COM-03`) y bloqueo de pago por inconformidad (`RN-COM-04`). | `frontend/` Compras/Almacén + `backend/` Abastecimiento + `DB/` `RegistroProveedor`, `PedidoProveedor`, `DetallePedidoProveedor` | ⏳ Esperando stack |
| **M05** | **Marketing y Catálogo** | `CUN05` / `RF08` | Publicación de ofertas con **vigencia temporal y stock máximo obligatorio INDECOPI (`RN-MKT-01`, Ley 29571)**, **baja automática al llegar el stock a 0**, aprobación del Dueño (`RN-MKT-04`) y captura **opt-in explícita sin casillas pre-marcadas (`RN-MKT-03`, Ley 29733)**. | `frontend/` Admin MKT + `backend/` Campañas/Catálogo + `DB/` `Producto`, `Categoria`, `RegistroCliente` | ⏳ Esperando stack |
| **M06** | **Préstamo de Productos** | `CUN06` / `RF04` / `DD-02` | Consignación a tiendas aliadas con **plazo máximo de 30 días (`RN-PRE-02`)**, conmutador *Poka-Yoke* *"¿Gerente disponible?"* para **emisión de Constancia Formal de Préstamo por el Almacenero en ausencia del gerente (`RN-PRE-01`)**, estado *"En Consignación"* (`RN-PRE-03`) y devolución o liquidación/facturación por merma (`RN-PRE-04`, `RN-PRE-05`). | `frontend/` Módulo Préstamos + `backend/` Consignaciones + Audit Log + `DB/` `PrestamoProductos`, `Producto`, `MovimientoFinanciero` | ⏳ Esperando stack |
| **M07** | **Pago de Planilla y Finanzas** | `CUN07` / `RF09` | Cálculo mensual de haberes, comisiones y descuentos (`RN-FIN-01`), **verificación previa de liquidez bancaria (`RN-FIN-02`)**, pago directo con boleta firmada (`RN-FIN-03`), registro inmediato en `MovimientoFinanciero` (`RN-FIN-04`) e inmutabilidad retroactiva (`RN-FIN-05`). | `frontend/` Módulo Finanzas + `backend/` Planilla/Auditoría + `DB/` `Empleado`, `Planilla`, `MovimientoFinanciero` | ⏳ Esperando stack |
| **M08** | **Dashboard Interactivo y Accesibilidad WCAG 2.1 AA** | `IHC 7.8` & `C3.3` / `RF06`, `RF10` | KPIs en tiempo real con gráficos **Okabe-Ito (*colorblind-safe*)**, tablas equivalentes para lector de pantalla y **Accesibilidad Nativa Permanente WCAG 2.1 AA** (sin barras flotantes): contraste AA/AAA (`prefers-contrast: more`), **Etiquetas + Texturas para Daltonismo (`RN-ACC-02`)**, escalado `rem` hasta `200%` (`RN-ACC-05`), foco `3px` y botones $\ge 44\times44\text{ px}$ (`RN-ACC-03`). | `frontend/` Transversal + `backend/` Endpoints Agregados KPI + `DB/` Consultas / Índices | ⏳ Esperando stack |

---

## 📋 4. Próximos Pasos Inmediatos

1. **Validar Documentación Académica en `documentos/`:**
   * Completar las revisiones humanas pendientes en `documentos/Model Soft Proyecto/` (Líneas Amarillas 🟨) y `documentos/Interaccion Humano Com Proyecto/` (`Informacion_IHC/` y `.docx` RE3).
2. **Definir los Stacks Tecnológicos (Sesión Olver & Josue):**
   * Seleccionar Opción A, B o C para `frontend/`, `backend/` y `DB/` en la **Sección 2** de este archivo.
3. **Diseñar Contratos Antes de Programar:**
   * Documentar tokens UI y wireframes en `frontend/docs_ui/`, contratos REST/RBAC en `backend/docs_api/` y scripts DDL/seeds en `DB/esquemas/` y `DB/seeds/` antes de generar código aplicativo.

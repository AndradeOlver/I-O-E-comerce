# 🌐 Estado Global del Proyecto: Sistema Omnicanal I&O

> **Empresa de Estudio:** Comercializadora Retail de Moda **I&O** (Tienda física + E-commerce omnicanal en Lima, Perú)  
> **Autores del Proyecto General y del Desarrollo (`frontend/`, `backend/`, `DB/`):**  
> 1. **ANDRADE CHIRINOS, Olver Daniel** (`N00401718`)  
> 2. **RAZURI PAREDES, Josue Daniel** (`N00421512`)  
> **Fase Global Actual:** `03. Desarrollo Frontend Iniciado — Migración visual completa a Espresso & Piedra (Propuesta 5) bajo Vite + TypeScript + HTML5 Semántico + CSS3 puro + Bootstrap 5.3 (WCAG 2.1 AA solo en páginas del comprador)`  
> **Última Actualización:** `25/11/2026` (Implementada ventana operativa de **Gestión de Almacén** `almacen.html` para `TN04` cubriendo `M03` Despachos/Courier, `M04` Compras con aprobación del Administrador y `M06` Préstamos en Consignación conectados a Caja → Aliados, con impresión en Hoja A4 y modo práctica por consola `IO_ALMACEN.modo(...)`)

---

## 🧭 1. Resumen del Ecosistema I&O

Este tablero maestro conecta la **documentación académica UPN** (en `documentos/`) con la **arquitectura de software** (`frontend/`, `backend/`, `DB/`):

| ID | Componente / Carpeta | Curso / Capa | Responsables / Equipo | Estado Git | Estado Actual | Documento de Control Local |
|:---:|---|---|---|---|:---:|---|
| **1.1.1** | `documentos/Model Soft Proyecto/` | Curso MOANSO (`ISOF1301`) — RUP / UML 2.5 | 5 integrantes: Andrade, Arias, Medina, Razuri, Restan | `.git` independiente (`origin/main` → `MoAnSo_G2.git`, ramas `dev-*`) | 🟡 **Artefactos base (`01`–`05`) aprobados; Líneas Amarillas 🟨 y Word en seguimiento** | [ESTADO_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/documentos/Model%20Soft%20Proyecto/ESTADO_PROYECTO.md) |
| **1.1.2** | `documentos/Interaccion Humano Com Proyecto/` | Curso IHC — UX/UI, Design Sprint, WCAG 2.1 AA y Rúbrica RE3 (v1.5) | **2 integrantes exclusivos:** Olver Andrade (`N00401718`) y Josue Razuri (`N00421512`) | `.git` independiente (`origin/main` → `IHC_G3.git`, ramas `dev-*`) | ⚠️ **Falta revisión humana** (`03_Requerimientos...` modificado el 24/11 por alcance de audiencia + `7.1.5` POS, y `02_Bases...`/`04_UX...` ajustados en MVP-05/Vista 06 del dashboard; 2 `.docx` recompilados y pendientes) | [ESTADO_PROYECTO_IHC.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/documentos/Interaccion%20Humano%20Com%20Proyecto/ESTADO_PROYECTO_IHC.md) |
| **1.2** | `frontend/` | Capa de Presentación, UI POS/Web, Dashboard y Accesibilidad Nativa WCAG 2.1 AA (solo comprador `AN01`) | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | 🟢 **En desarrollo activo: Estética Espresso & Piedra v2.5 (tienda con Modo Daltonismo y Lectura Ampliada activable por excepción aprobada, panel lateral de cuenta, entrada compartida en `acceso.html`, POS Vendedor/Cajero `M01` y zonas en preparación alineados a Espresso & Piedra)** | [frontend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/frontend/README.md) |
| **1.3** | `backend/` | Capa de Lógica de Negocio, APIs, RBAC (5 roles) y 42 Reglas | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | ✅ **Stack y arquitectura aprobados: Node.js + Express (TS) — Monolito Modular + `mssql` + `Zod` (Fases 0–3)** | [backend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/backend/README.md) |
| **1.4** | `DB/` | Capa de Persistencia (12 Entidades aprobadas con herencia) | **Exclusivo:** Olver Andrade & Josue Razuri | `.git` raíz (`origin/main` → `I-O-E-comerce.git` privado; ignora `documentos/` y `.agents/`) | ✅ **Microsoft SQL Server — DDL, extensión de taxonomía (8 categorías, `dbo.Subcategoria`, género/edad, `vw_OfertasActivas`) y seeds generados** (`esquemas/01_esquema_io_sqlserver.sql`, `esquemas/02_extension_catalogo_taxonomia.sql`, `seeds/01_datos_iniciales_io.sql`); DER MOANSO `06_Modelo_Datos_ER_IO.md` sincronizado con la extensión el 24/11/2026 | [DB/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/DB/README.md) |

---

## ⚖️ 2. Mesa de Decisión de Stacks Tecnológicos (Aprobados)

> [!NOTE]
> **STACKS APROBADOS:** Los 3 stacks (`frontend/`, `backend/`, `DB/`) fueron definidos el `20/11/2026`. Se habilita el diseño de contratos (`docs_ui/`, `docs_api/`, `esquemas/`) y la implementación progresiva de los módulos `M01`–`M08`.

### 2.1. Elección de Stack – `1.2 frontend/`
| Opción | Stack Tecnológico Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **Vite + TypeScript + HTML5 Semántico + CSS3 puro (*Design Tokens*) + Bootstrap 5.3** | Alineación directa con el prototipo evaluado en IHC (`SUS 88.5`, Bootstrap 5.3), cero sobrecarga de framework virtual DOM, control directo de ARIA/WCAG 2.1 AA, grillas *Mobile-First* y tipado estricto con TypeScript. | Requiere organización modular manual en `src/render/` conforme crecen las vistas POS, Dashboard y E-commerce. | ✅ Aprobado |
| **Opción B** | **React + Vite + TypeScript + Bootstrap 5.3** | Componentes reutilizables (Selector Daltonismo y Tokens WCAG exclusivos para la tienda del comprador/visitante, y vistas POS), tipado estricto e integración con API Express. | Descartada por preferencia del equipo por CSS3 puro + Bootstrap 5.3 sin React. | ⬜ Descartada |
| **Opción C** | **Angular / Vue 3 + TypeScript** | Arquitectura fuertemente estructurada desde el inicio, reactividad integrada para carrito y dashboard KPI en tiempo real. | Curva más rígida en Angular o menor ecosistema corporativo local según preferencia del equipo. | ⬜ Descartada |

* **Decisión Aprobada Frontend:** `✅ Opción A — Vite + TypeScript + HTML5 Semántico + CSS3 puro (*Design Tokens*) + Bootstrap 5.3` *(Actualizado el 22/11/2026 por Olver Andrade)*

---

### 2.2. Elección de Stack – `1.3 backend/`
| Opción | Stack Tecnológico Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **Node.js + Express (TypeScript)** | Unifica lenguaje con Frontend TS/JS, excelente manejo asíncrono de webhooks de pasarela (Culqi/Niubiz/Yape) y arquitectura modular limpia para los 7 CUNs. | Requiere validación estricta de transacciones y tipos numéricos decimales para IGV 18% y planilla. | ✅ Aprobado |
| **Opción B** | **Python + FastAPI o Django** | Desarrollo ágil, OpenAPI/Swagger automático (FastAPI) o admin/ORM maduro (Django), facilidad para generar reportes PDF/XML y compatibilidad con scripts Python ya usados en el proyecto. | Requiere mantener dos ecosistemas lingüísticos si el frontend es JS/TS. | ⬜ Descartada |
| **Opción C** | **Java Spring Boot / C# ASP.NET Core** | Tipado robusto de nivel empresarial, excelente soporte para transacciones ACID serializables y arquitectura orientada a objetos alineada con herencia UML. | Mayor consumo de recursos en VPS económico y mayor verbosidad de arranque. | ⬜ Descartada |

* **Decisión Aprobada Backend:** `✅ Opción A — Node.js + Express (TypeScript)` con arquitectura **Monolito Modular por Dominio (*Feature-Sliced*: `Routes → Controller → Service → Repository`) + `mssql` parametrizado (sin ORM pesado) + `Zod` + `decimal.js`**, construcción incremental en **4 fases (`Fase 0` a `Fase 3`)** *(Aprobado el 20/11/2026 – Arquitectura formalizada el 22/11/2026 por Olver Andrade en [backend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/backend/README.md) y [.agents/skills/arquitectura-backend-io/SKILL.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/.agents/skills/arquitectura-backend-io/SKILL.md))*

---

### 2.3. Elección de Motor de Base de Datos – `1.4 DB/`
| Opción | Motor Propuesto | Ventajas Principales para I&O | Consideraciones / Trade-offs | Estado |
|:---:|---|---|---|:---:|
| **Opción A** | **PostgreSQL** | Máxima robustez ACID y aislamiento serializable (`RN-VEN-06`), restricciones `CHECK`, soporte nativo para JSONB en bitácoras de auditoría (`RN-SEG-03`) y excelente modelado relacional para la herencia `Pedido`/`DetallePedido`. | Requiere administración básica del servicio en VPS o nube. | ⬜ Descartada |
| **Opción B** | **MySQL / MariaDB** | Ampliamente soportado en hostings compartidos y VPS económicos, motor InnoDB con transacciones ACID y alta familiaridad académica. | Menor riqueza en tipos/constraints avanzados y particionamiento frente a PostgreSQL. | ⬜ Descartada |
| **Opción C** | **Microsoft SQL Server** | Integración empresarial robusta (T-SQL), transacciones ACID serializables (`RN-VEN-06`), restricciones `CHECK`, triggers de auditoría y modelado relacional sólido para herencia `Pedido`/`DetallePedido`. | Mayor consumo de RAM en despliegue; usar edición Express/Developer en desarrollo. | ✅ Aprobado |

* **Decisión Aprobada DB:** `✅ Opción C — Microsoft SQL Server` *(Aprobado el 20/11/2026 por Olver Andrade)*

---

### 2.4. Decisión de alcance de inclusión por audiencia (`24/11/2026` · revisión grupal en `main`)

| Audiencia | Superficie | Tratamiento de inclusión / `RN-ACC-01..06` |
|---|---|---|
| **Comprador final (`AN01`)** | Tienda web, catálogo, bolsa, checkout, ofertas y cuenta | **Aplica íntegramente**: contraste AA/AAA, `Modo Daltonismo` con Nombre Textual + Textura, `aria-live`, foco visible, `rem` hasta 200%, *opt-in* y prevención de errores. |
| **Colaboradores (`TN01`–`TN05`)** | POS `M01`, almacén/envíos `M03`, compras `M04`, marketing `M05`, préstamos `M06`, planilla `M07`, dashboard operativo | **No aplica**: sin Modo Daltonismo, tramas, alto contraste alternativo ni anuncios inclusivos. Atajos `F2`–`F8` y botones grandes se justifican por rapidez y prevención de errores, no por accesibilidad. |

> Esta decisión modifica el alcance redactado originalmente en `RF06`/`RNF01` del documento IHC (`03_Requerimientos_y_Reglas_Accesibles_IO.md`, ahora en `⚠️ Falta revisión` hasta validación humana) y se refleja en `03_Requerimientos...` (incluido RF10), `02_Bases...` (MVP-05), `04_UX...` (Vista 06/DD-04), `README.md`, `contenido_informe_ihc.py`, `compilar_medicion_re3.py`, ambos `.docx`, `ESTADO_PROYECTO_IHC.md` e `inicio.txt`. **No cambia el stack aprobado** (`frontend/`: Vite + TS + HTML5 + CSS3 + Bootstrap 5.3).

#### Excepción aprobada (`24/11/2026`) — Modo Daltonismo y Lectura Ampliada activable (`index.html`)

- **Modo separado y activable (desactivado por defecto):** en la tienda del comprador (`index.html`), las texturas SVG del selector de color (`RN-ACC-02`), el contraste extremo negro/amarillo (`#000000` / `#FFFF00`), la letra ampliada, los anuncios detallados y los subrayados gruesos se concentran en el modo activable **Daltonismo y Lectura Ampliada** mediante el interruptor visible en la franja superior y en el pie de página.
- **Estado estándar por defecto:** mantiene el contraste de la paleta oficial **Espresso & Piedra**, el foco visible terracota/espresso, la operación completa por teclado, objetivos táctiles cómodos (`>= 44 px`) y el **nombre textual visible del color**, sin mostrar texturas SVG ni reglas de contraste extremo por defecto.
- **Preferencias del sistema y entrada compartida:** `prefers-reduced-motion: reduce` aplica en todo el sitio; `prefers-contrast: more` queda reservado exclusivamente a la tienda del comprador (`body.io-storefront`). `acceso.html` opera como entrada compartida (misma casa Espresso & Piedra, copia sobria, sin modo daltonismo ni contraste extremo del SO) y las vistas internas de colaboradores (`pos-vendedor.html`, `pos-cajero.html`, `zona-preparacion.html`) mantienen Espresso & Piedra, foco visible y atajos `F2`–`F8` sin modo daltonismo, texturas ni anuncios `aria-live`.

---

## 🧩 3. Mapa de Módulos del Sistema I&O a Construir (`M01` – `M08`)

Con los stacks aprobados, los **8 módulos** integrarán de forma trazable los **7 Casos de Uso del Negocio (`CUN01`–`CUN07`)**, las **12 Entidades (`EN01`–`EN12`)**, las **42 Reglas Operativas**, los **10 RF de IHC** y las **6 Reglas de Accesibilidad (`RN-ACC`, vigentes solo en páginas del comprador `AN01`)**:

| Código | Módulo del Sistema I&O | CUN / Base IHC | Reglas y Capacidades Clave a Implementar | Impacto en Capas | Estado |
|:---:|---|---|---|---|---|
| **M01** | **Venta en Tienda (POS)** | `CUN01` / `RF02` / `DD-04` | Consulta SKU en vivo, **sugerencia automática de alternativas (`RN-VEN-02`)**, tope de descuento 10% (`RN-VEN-03`), Boleta (DNI) / Factura (RUC) con **IGV 18% (`RN-TRI-01`)**, bloqueo de stock cero (`RN-VEN-06`) y atajos de teclado `F2`–`F8`. | `frontend/` POS + `backend/` Ventas/SUNAT + `DB/` `PedidoCliente`, `ComprobantePago`, `MovimientoFinanciero` | 🟡 **Frontend POS Mostrador y Caja operativos** (Mostrador full-width con catálogo agrupado, respaldo logo I&O y drawer de orden; navegación visible `Mostrador`/`Caja` con sesión compartida; pestaña `Aliados / Créditos` en Caja `RN-PRE-02`; modos `operacion`/`practica` por consola `IO_POS.modo(...)`); BD lista; backend pendiente |
| **M02** | **Venta Online E-commerce** | `CUN02` / `RF01`, `RF03` / `DD-01`, `DD-03` | Catálogo SKU (talla + color), **carrito con reserva temporal 15 min (`RN-ECO-03`)**, checkout en 3 pasos, **pasarela tokenizada PCI-DSS (`RN-SEG-02`) con hasta 3 reintentos (`RN-ECO-02`)** y máquina de 6 estados (`RN-ECO-04`). | `frontend/` Tienda Web + `backend/` Carrito/Checkout/Webhook + `DB/` `Producto`, `RegistroCliente`, `PedidoCliente` | 🟡 Frontend Vista 01 (catálogo + bolsa 15 min) lista; falta checkout y backend |
| **M03** | **Envíos y Courier** | `CUN03` / `RF05` | Lista de *picking/packing* solo tras pago confirmado (`RN-ECO-01`), generación en 1 clic de **Guía de Envío con tracking único (`RN-ENV-01`)**, cálculo de flete transparente y **envío gratis > S/ 150 (`RN-ENV-04`)**, y registro de hasta **2 intentos con firma/DNI (`RN-ENV-02`, `RN-ENV-03`)**. | `frontend/` Panel Almacén + `backend/` Logística + `DB/` `GuiaEnvio`, `PedidoCliente` | 🟡 **Frontend operativo en `almacen.html`** (verificación por SKU, bloqueo sin pago, guía A4 y 2 intentos); BD lista; backend pendiente |
| **M04** | **Compra de Mercadería** | `CUN04` / `RF07` | **Alerta automática de stock $\le 5$ unidades por SKU (`RN-INV-03`)**, evaluación de cotizaciones, emisión de `PedidoProveedor` (`RN-COM-01`), control de calidad físico contra Guía de Remisión (`RN-COM-03`) y bloqueo de pago por inconformidad (`RN-COM-04`). | `frontend/` Compras/Almacén + `backend/` Abastecimiento + `DB/` `RegistroProveedor`, `PedidoProveedor`, `DetallePedidoProveedor` | 🟡 **Frontend operativo en `almacen.html`** (alertas ≤ 5, solicitudes con aprobación del Admin, recepción física y acta A4); BD lista; backend pendiente |
| **M05** | **Marketing y Catálogo** | `CUN05` / `RF08` | Publicación de ofertas con **vigencia temporal y stock máximo obligatorio INDECOPI (`RN-MKT-01`, Ley 29571)**, **baja automática al llegar el stock a 0**, aprobación del Dueño (`RN-MKT-04`) y captura **opt-in explícita sin casillas pre-marcadas (`RN-MKT-03`, Ley 29733)**. | `frontend/` Admin MKT + `backend/` Campañas/Catálogo + `DB/` `Producto`, `Categoria`, `RegistroCliente` | 📋 BD lista; contratos UI/API pendientes |
| **M06** | **Préstamo de Productos** | `CUN06` / `RF04` / `DD-02` | Consignación a tiendas aliadas con **plazo máximo de 7 días (`RN-PRE-02`)**, conmutador *Poka-Yoke* *"¿Gerente disponible?"* para **emisión de Constancia Formal de Préstamo por el Almacenero en ausencia del gerente (`RN-PRE-01`)**, estado *"En Consignación"* (`RN-PRE-03`) y devolución o liquidación/facturación por merma (`RN-PRE-04`, `RN-PRE-05`). | `frontend/` Módulo Préstamos + `backend/` Consignaciones + Audit Log + `DB/` `PrestamoProductos`, `Producto`, `MovimientoFinanciero` | 🟡 **Frontend operativo en `almacen.html`** (constancia A4 `RN-PRE-01`, plazo 7d, devolución y liquidación directa a Caja → Aliados); BD lista; backend pendiente |
| **M07** | **Pago de Planilla y Finanzas** | `CUN07` / `RF09` | Cálculo mensual de haberes, comisiones y descuentos (`RN-FIN-01`), **verificación previa de liquidez bancaria (`RN-FIN-02`)**, pago directo con boleta firmada (`RN-FIN-03`), registro inmediato en `MovimientoFinanciero` (`RN-FIN-04`) e inmutabilidad retroactiva (`RN-FIN-05`). | `frontend/` Módulo Finanzas + `backend/` Planilla/Auditoría + `DB/` `Empleado`, `Planilla`, `MovimientoFinanciero` | 📋 BD lista; contratos UI/API pendientes |
| **M08** | **Dashboard Interactivo y Accesibilidad WCAG 2.1 AA** | `IHC 7.8` & `C3.3` / `RF06`, `RF10` | KPIs operativos en tiempo real para el Dueño (`TN01`) **sin componentes de inclusión** (sin tramas, sin anuncios `aria-live`, sin Modo Daltonismo). El bloque de **Accesibilidad Nativa Permanente WCAG 2.1 AA** (contraste AA/AAA con `prefers-contrast: more`, Etiquetas + Texturas `RN-ACC-02`, escalado `rem` hasta `200%` `RN-ACC-05`, foco `3px` y botones $\ge 44\times44\text{ px}$ `RN-ACC-03`) aplica **exclusivamente a las páginas del comprador (`AN01`)**, no al dashboard interno. | `frontend/` Transversal + `backend/` Endpoints Agregados KPI + `DB/` Consultas / Índices | 📋 BD lista; contratos UI/API pendientes |

---

## 📋 4. Próximos Pasos Inmediatos

1. **Validar Documentación Académica en `documentos/`:**
   * Completar las revisiones humanas pendientes en `documentos/Model Soft Proyecto/` (Líneas Amarillas 🟨) y `documentos/Interaccion Humano Com Proyecto/` (`Informacion_IHC/` y `.docx` RE3).
2. **Stacks Tecnológicos Aprobados (`✅ Completado el 20/11/2026`):**
   * Frontend: `Vite + TypeScript + HTML5 Semántico + CSS3 puro + Bootstrap 5.3` · Backend: `Node.js + Express (TypeScript)` · BD: `Microsoft SQL Server (T-SQL)`.
3. **Diseñar Contratos e Iniciar Implementación (`M01`–`M08`):**
   * Documentar tokens UI y wireframes en `frontend/docs_ui/`, contratos REST/RBAC en `backend/docs_api/` y validar los scripts DDL/seeds ya generados en `DB/esquemas/` y `DB/seeds/` antes de codificar los módulos.
   * **Siguiente ventana a construir (`M01` POS):** usar el concepto registrado en el IHC `7.1.5` (terminal rápida para Vendedor/Cajero, alternativas por SKU, cobro y comprobante, simulación de pagos/abonos desde consola por ser proyecto estudiantil, **sin ningún componente de inclusión**). Aún no existe código de colaborador en `frontend/src/`.
4. **Coordinación de escritura documental (acuerdo 24/11/2026):** un solo agente escribe `.md` por pasada. El agente de código implementa `frontend/` y reporta; el agente documental actualiza `ESTADO_GLOBAL_PROYECTO.md`, `inicio.txt` y los tableros/requerimientos de `documentos/` para evitar pérdida de cambios o contradicción entre tableros.

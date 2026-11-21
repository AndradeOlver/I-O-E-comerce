# 🤖 Directivas Globales de Agente – Proyecto Raíz I&O

> **Aplicación:** Reglas obligatorias para cualquier modelo, asistente o subagente que opere en el workspace raíz de la empresa retail **I&O** (`I&O E-Comerce/`).  
> **Tablero Maestro (Fuente de Verdad Global):** [ESTADO_GLOBAL_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/ESTADO_GLOBAL_PROYECTO.md)  
> **Autores Exclusivos del Proyecto General y del Desarrollo (`frontend/`, `backend/`, `DB/`):**  
> 1. **ANDRADE CHIRINOS, Olver Daniel** (`N00401718`)  
> 2. **RAZURI PAREDES, Josue Daniel** (`N00421512`)

---

## 🚨 REGLAS GLOBALES DE OBLIGATORIO CUMPLIMIENTO

### 1. Mapa de Fuentes de Verdad del Ecosistema I&O
Toda decisión arquitectónica o funcional debe consultar la fuente autorizada según su dominio:

| Dominio | Ubicación Exacta en el Workspace | Contenido Autorizado |
|---|---|---|
| **Procesos de Negocio y Modelado RUP/UML** | `documentos/Model Soft Proyecto/Informacion del negocio/` (y `ESTADO_PROYECTO.md`) | **7 Casos de Uso de Negocio (`CUN01`–`CUN07`)**, **12 Entidades aprobadas con herencia (`EN01`–`EN12`)**, **42 Reglas de Negocio (`RN-*`)**, Glosario (45 términos), ECUN y Ficha YAML. |
| **UX/UI, Accesibilidad WCAG 2.1 AA y RE3** | `documentos/Interaccion Humano Com Proyecto/Informacion_IHC/` (y `ESTADO_PROYECTO_IHC.md`) | **5 Hallazgos (`H01`–`H05`)**, **10 RF priorizados**, **10 Historias de Usuario**, **48 Reglas (42 I&O + 6 `RN-ACC-01` a `RN-ACC-06`)**, 6 User Personas, Guía de Estilos (`#0F2043`, `#FFC000`, `#F8FAFC`), Design Sprint (`SUS 88.5`, `SEQ 6.4`, `Éxito 96.4%`) y Rúbrica RE3 (`C3.1`, `C3.2`, `C3.3`). |
| **Capa de Presentación (`frontend/`)** | `frontend/` y `frontend/docs_ui/` | Prototipos de interfaz, Guía de Estilos WCAG 2.1 AA/AAA, vistas POS/E-commerce/Almacén/Préstamos y Dashboard Okabe-Ito (**Stack aprobado:** `React + Vite + TypeScript + Bootstrap 5.3`). |
| **Capa de Lógica y API (`backend/`)** | `backend/` y `backend/docs_api/` | Contratos de API, control RBAC (5 roles), validación de las 42 reglas de negocio, integraciones tokenizadas PCI-DSS y auditoría (**Stack aprobado:** `Node.js + Express (TypeScript)`). |
| **Capa de Persistencia (`DB/`)** | `DB/`, `DB/esquemas/` y `DB/seeds/` | Diccionario físico de las 12 entidades con herencia (`Pedido`/`DetallePedido`), restricciones ACID y datos de prueba (**Motor aprobado:** `Microsoft SQL Server (T-SQL)`). |

---

### 2. Aislamiento Estricto de Equipos y Repositorios Git

1. **Separación de Autoría e Integrantes:**
   * En `documentos/Model Soft Proyecto/` (Curso Modelamiento y Análisis de Software – MOANSO) participan **5 integrantes**: **Andrade** (`N00401718`), **Arias** (`N00400132`), **Medina** (`N00428453`), **Razuri** (`N00421512`) y **Restan** (`N00435514`).
   * En `documentos/Interaccion Humano Com Proyecto/` (Curso IHC) y en **todo el desarrollo técnico (`frontend/`, `backend/`, `DB/`) y gobernanza de este proyecto raíz** participan **ÚNICAMENTE 2 integrantes**:
     * **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)**
     * **RAZURI PAREDES, Josue Daniel (`N00421512`)**
   * Queda prohibido atribuir autoría del proyecto general, del curso IHC o del futuro código fuente a terceros fuera de Olver Andrade y Josue Razuri.

2. **Aislamiento de Repositorios `.git`:**
   * Los dos directorios dentro de `documentos/` poseen **repositorios `.git` independientes** (`documentos/Model Soft Proyecto/.git` conectado a `MoAnSo_G2.git`, y `documentos/Interaccion Humano Com Proyecto/.git` conectado a `IHC_G3.git`).
   * **Prohibido tocar, mover, eliminar o fusionar** los `.git` internos de `documentos/`.
   * Todo comando `git` destinado a cualquiera de los dos cursos **debe ejecutarse explícitamente dentro de la subcarpeta correspondiente** (mediante `cd` o `git -C "<subcarpeta>"`).
   * El archivo `.gitignore` de la raíz ignora explícitamente `documentos/` para garantizar que el repositorio Git de la raíz (`I-O-E-comerce.git`, destinado exclusivamente a `frontend/`, `backend/` y `DB/`) jamás interfiera con los repositorios académicos.

---

### 3. Regla de Respeto a los Stacks Tecnológicos Aprobados
* Los stacks oficiales aprobados el `20/11/2026` en `ESTADO_GLOBAL_PROYECTO.md` son:
  * **`frontend/`:** `React + Vite + TypeScript + Bootstrap 5.3` (HTML5 Semántico / CSS3).
  * **`backend/`:** `Node.js + Express (TypeScript)`.
  * **`DB/`:** `Microsoft SQL Server (T-SQL)`.
* **NO introducir** frameworks, lenguajes o motores distintos (ej. Angular, Vue, Python/Django, Java, PostgreSQL, MySQL) sin aprobación explícita previa de Olver y Josue registrada en `ESTADO_GLOBAL_PROYECTO.md`.

---

### 4. Sincronización Documentación ↔ Código
Con los stacks tecnológicos aprobados en la Mesa de Decisión, toda implementación en `frontend/`, `backend/` y `DB/` deberá respetar sin excepción:
1. **Los 7 Procesos de Negocio (`CUN01`–`CUN07`):** Venta en Tienda, Venta Online, Envíos, Compra de Mercadería, Marketing, Préstamo de Productos y Pago de Planilla (más el Módulo transversal `M08` de Dashboard y Accesibilidad).
2. **Las 12 Entidades Aprobadas (`EN01`–`EN12`):**
   * Herencia obligatoria en **`Pedido`** (`PedidoCliente`, `PedidoProveedor`) y **`DetallePedido`** (`DetallePedidoCliente`, `DetallePedidoProveedor`).
   * El **`stock`** se modela como atributo intrínseco de **`Producto`** diferenciado por SKU (`talla` + `color`), prohibiendo stock negativo (`RN-VEN-06`).
3. **Las 42 Reglas de Negocio Operativas (`RN-*`):**
   * Destacando **`RN-PRE-01`**: en ausencia o indisponibilidad del Dueño/Gerente, el **Almacenero** queda facultado para autorizar el préstamo a otra tienda emitiendo una **Constancia Formal de Préstamo (Consignación)** registrada en auditoría (`RN-SEG-03`), con plazo máximo de 30 días (`RN-PRE-02`).
   * Control estricto de umbral de alerta de stock $\le 5$ unidades (`RN-INV-03`), reserva de carrito 15 min y 3 reintentos de pago (`RN-ECO-02`, `RN-ECO-03`), descuento máximo en tienda 10% (`RN-VEN-03`), envío gratuito urbano $> \text{S/ } 150$ (`RN-ENV-04`), IGV `18%` y correlatividad Boleta/Factura (`RN-TRI-01`, `RN-TRI-02`), vigencia/stock máximo INDECOPI y baja automática en stock 0 (`RN-MKT-01`), consentimiento *opt-in* explícito (`RN-MKT-03`), verificación de liquidez bancaria antes de planilla (`RN-FIN-02`), control **RBAC para los 5 roles internos** (`TN01`–`TN05`: Administrador, Vendedor, Community Manager, Almacenero, Cajero) y **cero almacenamiento local de PAN/CVV** (`RN-SEG-02` PCI-DSS).
4. **Las 6 Reglas de Accesibilidad Universal WCAG 2.1 Nivel AA (`RN-ACC-01` a `RN-ACC-06`):**
   * Contraste mínimo `4.5:1` (y soporte nativo `prefers-contrast: more` AAA `19.56:1` sin barras flotantes), selector multimodal de colores (**Nombre Textual + Trama/Textura**) para daltonismo, operabilidad 100% por teclado (`Tab`, `F2`–`F8`), objetivos táctiles $\ge 44\times44\text{ px}$ ($48\times48\text{ px}$ en POS/Almacén), compatibilidad WAI-ARIA/`aria-live` con lectores de pantalla, escalado fluido en `rem` hasta `200%` sin scroll horizontal y prevención de errores *Poka-Yoke* sin patrones oscuros.

---

### 5. Actualización Obligatoria en Cada Sesión
* **En el proyecto raíz:** Cada vez que se apruebe un stack, se cree o actualice documentación técnica (`docs_ui/`, `docs_api/`, `esquemas/`, `seeds/`) o se avance en los módulos `M01`–`M08`, el agente **DEBE actualizar `ESTADO_GLOBAL_PROYECTO.md`** (fecha, tabla del ecosistema, mesa de decisión o avance de módulos) y mantener vigente `inicio.txt`.
* **En los sub-repositorios académicos:** Respetar adicionalmente las reglas locales de `documentos/Model Soft Proyecto/AGENTS.md` (`ESTADO_PROYECTO.md`) y `documentos/Interaccion Humano Com Proyecto/AGENTS.md` (`ESTADO_PROYECTO_IHC.md`).

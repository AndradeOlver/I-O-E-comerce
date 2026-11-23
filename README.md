# 🛍️ Proyecto Raíz: Sistema Omnicanal I&O (Documentación UPN + Arquitectura Técnica)

> **Empresa de Estudio:** Comercializadora Retail de Moda **I&O** (Tienda física + E-commerce omnicanal en Lima, Perú)  
> **Autores del Proyecto General y del Desarrollo (`frontend/`, `backend/`, `DB/`):**  
> * **ANDRADE CHIRINOS, Olver Daniel** (`N00401718`)  
> * **RAZURI PAREDES, Josue Daniel** (`N00421512`)

---

## 🎯 Propósito del Workspace Unificado

Esta carpeta raíz centraliza en un solo lugar dos dimensiones complementarias del proyecto **I&O**:
1. **Documentación Académica e Ingeniería Previa (`documentos/`):** Dos cursos oficiales de la Universidad Privada del Norte (UPN, ciclo 2026-2) que definen la lógica del negocio, el modelado RUP/UML, la investigación UX/UI, los estándares de accesibilidad **WCAG 2.1 Nivel AA** y la medición de competencia **RE3**.
2. **Arquitectura de Construcción del Software (`frontend/`, `backend/`, `DB/`):** Esqueleto modular con stacks aprobados en [ESTADO_GLOBAL_PROYECTO.md](ESTADO_GLOBAL_PROYECTO.md): **Vite + TypeScript + HTML5 Semántico + CSS3 puro + Bootstrap 5.3** (`frontend/`), **Node.js + Express (TypeScript)** (`backend/`) y **Microsoft SQL Server** (`DB/`).

---

## 🌳 Estructura General del Proyecto

```text
I&O E-Comerce/                                      <-- Raíz del Proyecto Unificado
│
├── documentos/                                     <-- Documentación UPN (Ignorada por .gitignore raíz)
│   ├── Model Soft Proyecto/                        <-- Curso MOANSO (RUP/UML) — Repo .git propio (5 integrantes)
│   └── Interaccion Humano Com Proyecto/            <-- Curso IHC (UX/UI/WCAG/RE3) — Repo .git propio (2 integrantes)
│
├── frontend/                                       <-- Capa de Presentación, E-commerce, POS, Dashboard y WCAG Nativo
│   ├── docs_ui/                                    <-- Guía de Estilos WCAG 2.1 AA, tokens y mapa de vistas
│   └── README.md
│
├── backend/                                        <-- Capa de Lógica, APIs REST, RBAC (5 roles) y 42 Reglas
│   ├── docs_api/                                   <-- Contratos de endpoints, RBAC y validaciones
│   └── README.md
│
├── DB/                                             <-- Capa de Persistencia (12 Entidades aprobadas con herencia)
│   ├── esquemas/                                   <-- Futuros scripts DDL y migraciones
│   ├── seeds/                                      <-- Futuros datos iniciales de prueba
│   └── README.md
│
├── .gitignore                                      <-- Protege documentos/ frente a un futuro Git de código raíz
├── AGENTS.md                                       <-- Directivas globales para agentes IA en este workspace
├── ESTADO_GLOBAL_PROYECTO.md                       <-- Tablero maestro y Mesa de Decisión de Stacks
├── README.md                                       <-- Manual general del proyecto y gestión segura de Git
└── inicio.txt                                      <-- Prompt corto para retomar sesiones futuras
```

---

## 🔐 Gestión Segura de Repositorios Git Independientes

Dentro de `documentos/` coexisten **dos repositorios Git totalmente independientes** con distintos equipos e historiales. Para evitar colisiones o commits cruzados:

### 1. Regla de Oro de Aislamiento
* El `.gitignore` de la raíz excluye explícitamente `documentos/` (`Model Soft Proyecto/` e `Interaccion Humano Com Proyecto/`).
* Nunca ejecutes `git add` o `git commit` desde la raíz esperando actualizar alguno de los cursos académicos.
* Cada repositorio académico se gestiona **únicamente dentro de su propia carpeta**.

### 2. Operar Git en MOANSO (`documentos/Model Soft Proyecto/`)
* **Participantes (5):** Andrade (`dev-olver`), Arias (`dev-sebastian`), Medina (`dev-christopher`), Razuri (`dev-josue`) y Restan (`dev-kevin`).
* **Remoto:** `https://github.com/AndradeOlver/MoAnSo_G2.git`
```powershell
cd "documentos/Model Soft Proyecto"
git status
git checkout dev-olver   # o dev-josue según corresponda
git add .
git commit -m "docs: actualizacion de artefactos MOANSO"
git push origin dev-olver
```

### 3. Operar Git en IHC (`documentos/Interaccion Humano Com Proyecto/`)
* **Participantes Exclusivos (2):** Olver Daniel Andrade Chirinos (`N00401718`) y Josue Daniel Razuri Paredes (`N00421512`).
```powershell
cd "documentos/Interaccion Humano Com Proyecto"
git status
git add .
git commit -m "docs: actualizacion de informes y artefactos IHC RE3"
```

### 4. Repositorio de Implementación Técnica (Raíz — `I-O-E-comerce.git`)
* Con los stacks ya aprobados en `ESTADO_GLOBAL_PROYECTO.md` (`Vite + TypeScript + HTML5 Semántico + CSS3 puro + Bootstrap 5.3` / `Node.js + Express` / `Microsoft SQL Server`), el repositorio Git de la raíz (`AndradeOlver/I-O-E-comerce`) versiona exclusivamente código y arquitectura técnica en `frontend/`, `backend/` y `DB/`. Gracias al `.gitignore` raíz, nunca interfiere con `documentos/`.

---

## 📚 Enlaces Clave del Proyecto

* **Tablero Global y Elección de Stack:** [ESTADO_GLOBAL_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/ESTADO_GLOBAL_PROYECTO.md)
* **Directivas de Agentes IA:** [AGENTS.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/AGENTS.md)
* **Arquitectura Frontend:** [frontend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/frontend/README.md)
* **Arquitectura Backend:** [backend/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/backend/README.md)
* **Arquitectura de Base de Datos:** [DB/README.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/DB/README.md)

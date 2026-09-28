# 🤖 Reglas de Comportamiento del Agente (Agent Rules)

Este archivo define la estructura, estándares y pautas operativas obligatorias para cualquier IA o asistente que trabaje en el repositorio de **Tablero (Firefox WebExtension)**.

---

## 🏛️ 1. Contexto del Proyecto

* **Nombre:** Tablero (Tablero-Menu-Ayarachi-Firefox).
* **Autor:** Héctor Daniel Ayarachi Fuentes.
* **Propósito:** Tablero de inicio y nueva pestaña (*New Tab Page*) altamente personalizable para Firefox, con notas enriquecidas, widgets integrados, atajos/tiles dinámicos, fondos generativos y temas premium.
* **Arquitectura:** WebExtension Manifest V3 nativa, JavaScript Vanilla (ES Modules), CSS3 moderno y cero pasos de transpilación/empaquetado.

---

## 📂 2. Estructura de Directorios Obligatoria

```text
Tablero-Menu-Ayarachi-Firefox/
├── .agents/
│   ├── rules/
│   │   ├── AGENTS.md        # Reglas operativas y estándares para el agente
│   │   ├── git_commits.md   # Reglas para mensajes de confirmación de git
│   │   ├── gitnexus.md      # Reglas operativas para GitNexus (inteligencia de código)
│   │   └── tablero_rules.md # Pautas técnicas, rendimiento y estándares de Tablero
│   ├── skills/              # Skills de workspace (gitnexus-*)
│   └── mcp_config.json      # Configuración de servidores MCP (gitnexus)
├── .claude/
│   └── skills/              # Skills compatibles para Claude Code / runners externos
├── .gitnexus/               # Grafo de conocimiento e inteligencia de código (run.cjs)
├── .gitnexusignore          # Exclusiones de indexación para GitNexus
├── .gitignore               # Configuración de exclusiones para Git
├── css/                     # Estilos modulares (variables, layout, panels, tiles, weather)
├── doodle/                  # Motor generativo CSS-Doodle (css-doodle.min.js)
├── json/                    # Datos estáticos y configuraciones (temas, degradados, doodles)
├── lib/                     # Librerías de soporte (DOMPurify)
├── menubar/                 # Núcleo de la aplicación
│   ├── app.js               # Orquestador principal (Layered Loading)
│   ├── background.js        # Script de fondo de la extensión WebExtension
│   ├── background-manager.js # Gestor de fondos de pantalla, gradientes y doodles
│   ├── components/          # Modales, menú contextual, papelera, UI general
│   ├── core/                # Configuración, baldosas/tiles, carpetas y utilidades
│   ├── lib/                 # Librerías internas (idb-keyval, drag-drop)
│   ├── settings/            # Paneles de ajustes, temas premium, editor CSS
│   ├── system/              # Respaldos, worker de archivos e integración de marcadores
│   └── zero-flash.js        # Pintado instantáneo anti-parpadeo
├── notas/                   # Módulo independiente de notas enriquecidas
├── utils/                   # Clima (Open-Meteo), buscador multivariable y degradados
├── widgets/                 # Sistema de widgets (reloj, calendario, pomodoro, citas, tareas)
├── index.html               # Documento principal de la nueva pestaña
├── manifest.json            # Manifiesto de la extensión de Firefox (MV3)
└── AGENTS.md                # Guía de cabecera y estatus de GitNexus
```

---

## ⚡ 3. Directrices de Rendimiento y Arquitectura

1. **Rendimiento de Carga (Sub-50ms):**
   - La nueva pestaña debe abrirse al instante. Respeta el esquema *Layered Loading* en `menubar/app.js`:
     * **Fase 0:** Claves visuales críticas para renderizar tiles y fondo de inmediato.
     * **Fase 1:** Widgets e interactividad.
     * **Fase 2:** Paneles de configuración y tareas secundarias en segundo plano.
2. **Zero-Flash:**
   - Mantener intacta la lógica de pre-pintado en `zero-flash.js` e `instant-bg.js` para asegurar que el navegador nunca muestre un destello blanco al abrir una pestaña.
3. **Persistencia Dual:**
   - `chrome.storage.local`: Configuraciones, notas y metadatos rápidos.
   - `idb-keyval` (IndexedDB): Wallpapers e imágenes pesadas en base64/blob.
4. **Cumplimiento MV3 de Firefox:**
   - Cumplir rigurosamente con la CSP: sin scripts en línea, sin `eval()`.
   - Toda entrada de usuario inyectada en el DOM debe ser sanitizada con `DOMPurify.sanitize()`.

---

## 🕸️ 4. Protocolo Obligatorio con GitNexus

Antes de realizar cambios en lógica compartida:
1. **Inspeccionar contexto:** `node .gitnexus/run.cjs context "<simbolo>"` o `npx gitnexus context "<simbolo>"`.
2. **Medir impacto (*Blast Radius*):** `node .gitnexus/run.cjs impact "<simbolo>" --direction upstream --repo .`.
3. **Validar antes de commit:** `node .gitnexus/run.cjs detect-changes --scope all --repo .`.

---

## 🏷️ 5. Control de Versiones (Commits)

* **Idioma Obligatorio:** Todos los mensajes de commit generados o propuestos deben redactarse exclusivamente en **español**.
* **Estándar Conventional Commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`.

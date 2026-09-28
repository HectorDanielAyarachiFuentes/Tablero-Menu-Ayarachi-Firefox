# Reglas de Desarrollo: Tablero (Firefox WebExtension)

Este documento define las directrices y estándares obligatorios para el desarrollo, mantenimiento y refactorización de la extensión de Firefox **Tablero** (Firefox New Tab Dashboard & Notes).

---

## 🏛️ 1. Arquitectura y Tecnologías del Proyecto

* **Tipo de Proyecto:** WebExtension Manifest V3 compatible con Firefox (`gecko: id: "tablero-hector@ayarachi.com"`).
* **Tecnologías Core:** HTML5 semántico, JavaScript Vanilla moderno (ES6 Modules), CSS3 Vanilla con variables y glassmorphism.
* **Sin Dependencias de Compilación:** Todo el código se ejecuta directamente en el navegador sin bundler (no webpack/vite/rollup) para garantizar transparencia, depuración inmediata y compatibilidad nativa.

### Estructura de Módulos
* `index.html`: Punto de entrada de la nueva pestaña (DOM base, capas de fondo, tablero de enlaces, barra de búsqueda y docks).
* `manifest.json`: Configuración de permisos, CSP, scripts de fondo y recursos web accesibles.
* `menubar/`:
  * `app.js`: Orquestador principal, coordinación de fases de carga (*Layered Loading*).
  * `background.js`: Background script de la extensión (WebExtension worker/event page).
  * `background-manager.js`: Control de fondos (imágenes, degradados, fondos dinámicos y CSS-Doodle).
  * `zero-flash.js` / `instant-bg.js`: Scripts de pintado ultrarrápido para eliminar parpadeos en blanco al abrir pestaña.
  * `core/`: Configuración (`config.js`), gestión de cuadrícula y enlaces (`tiles.js`), carpetas (`carpetas.js`) y utilidades DOM/almacenamiento (`utils.js`).
  * `components/`: Modales (`modal.js`), menú contextual (`context-menu.js`), papelera (`trash.js`) e interfaz general (`ui.js`).
  * `settings/`: Panel de configuración (`settings.js`), subpaneles (`settings-panels.js`), editor CSS en vivo (`editor.js`) y catálogo de temas (`themes-premium.js`, `doodles.js`).
  * `system/`: Respaldo y restauración (`file-system.js`), worker de archivos (`file-worker.js`), integración con marcadores (`navegadores.js`).
  * `lib/`: Motor drag & drop táctil/ratón (`enhanced-drag-drop.js`), persistencia binaria (`idb-keyval.js`).
* `notas/`: Aplicación independiente e integrada de notas enriquecidas (`notas.html`, `notas.js`, `notas.css`).
* `widgets/`: Sistema modular de widgets (`widget-manager.js`, `calendar.js`, `pomodoro.js`, `quotes.js`, `todo.js`, `widgets.css`).
* `utils/`: Proveedores de datos y servicios (clima Open-Meteo `tiempo.js`, buscador multivariable `search.js`, degradados `gradients.js`).
* `css/`: Sistema de diseño con variables CSS (`variables.css`), animaciones, layout, paneles y temas.

---

## ⚡ 2. Principios de Rendimiento y Experiencia de Usuario

1. **Carga Progresiva Estratificada (*Layered Loading*):**
   - **Fase 0 (Crítica / Sub-50ms):** Cargar únicamente las claves visuales esenciales (`tiles`, `panelBg`, `accentColor`, `bgData`, etc.). No bloquear el primer frame con datos secundarios.
   - **Fase 1 (Interactiva):** Inicializar widgets visibles, reloj, saludo, barra de búsqueda y enlaces.
   - **Fase 2 (Diferida):** Cargar editores de temas, paneles de configuración ocultos, caché de doodles y peticiones asíncronas de red.
2. **Preservación de *Zero-Flash*:**
   - Nunca alterar `zero-flash.js` o `instant-bg.js` de forma que introduzca bloqueos síncronos o retrasos en el renderizado inicial del fondo.
3. **Manejo Dual de Almacenamiento:**
   - Usar `storageGet` y `storageSet` (`chrome.storage.local` / `browser.storage.local`) para configuraciones, enlaces, notas y metadatos ligeros.
   - Usar `idb-keyval` (IndexedDB) para recursos binarios pesados (imágenes personalizadas en base64/blob, wallpapers de alta resolución).

---

## 🔒 3. Seguridad y Cumplimiento con Políticas de Extensiones (MV3)

1. **Compatibilidad Estricta con CSP de Firefox:**
   - **Prohibido terminantemente** el uso de `eval()`, `new Function()`, o inyección de scripts mediante `javascript:` URLs.
   - Todo listener o interactividad debe vincularse mediante `addEventListener` en JS, nunca como atributo inline en HTML (`onclick="..."`).
2. **Sanitización de Datos de Usuario:**
   - Cualquier inyección de contenido HTML generado dinámicamente o proveniente de notas del usuario debe pasar obligatoriamente por `DOMPurify.sanitize()` antes de asignarse a `innerHTML`.

---

## 📐 4. Estándares de Código y Calidad

1. **JSDoc en la Línea 1:**
   Todo archivo JavaScript nuevo o modificado debe comenzar en la primera línea con un bloque JSDoc describiendo su propósito, dependencias y exportaciones principales.
2. **Modularidad ES6 Pura:**
   Exportar funciones y clases de forma explícita. No contaminar el objeto global `window` a menos que sea un punto de integración documentado.
3. **Manejo Seguro de Errores en APIs Externas:**
   Llamadas de red (como el clima en `utils/tiempo.js`) deben estar encapsuladas en bloques `try/catch` con fallback silencioso para que una falla de conexión o rate limit nunca rompa la interfaz de la pestaña.
4. **Diseño Responsivo y Temas Visuales:**
   Los componentes deben utilizar las variables de `css/variables.css` para respetar automáticamente la paleta seleccionada (modo oscuro, temas premium, acentos dinámicos).

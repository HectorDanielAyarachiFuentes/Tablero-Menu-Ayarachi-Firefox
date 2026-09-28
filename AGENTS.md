# 🦊 Tablero — Tablero de Inicio & Nueva Pestaña para Firefox

Este archivo define la arquitectura técnica, estándares de desarrollo y pautas de integración para agentes de IA que operen en el repositorio **Tablero-Menu-Ayarachi-Firefox**.

---

## 🏛️ 1. Arquitectura del Proyecto

**Tablero** es una extensión de Firefox (WebExtension Manifest V3) diseñada como una página de nueva pestaña (`chrome_url_overrides.newtab`) rápida, modular y visualmente rica.

### Estructura Principal
* `index.html`: Punto de entrada del DOM (capas de fondo, contenedor de tiles, barra de búsqueda, reloj y barras laterales).
* `manifest.json`: Definición MV3 con compatibilidad Gecko (`id: "tablero-hector@ayarachi.com"`, permisos de storage, bookmarks, theme y CSP estricta).
* `menubar/`:
  * `app.js`: Orquestador central de inicialización por capas (*Layered Loading*).
  * `background.js`: Script de fondo de la extensión.
  * `background-manager.js`: Motor de fondos (wallpapers, degradados y doodles dinámicos).
  * `zero-flash.js` / `instant-bg.js`: Scripts de pintado instantáneo para eliminar destellos en blanco al abrir pestaña.
  * `core/`:
    * `config.js`: Claves de configuración, temas base y opciones predeterminadas.
    * `tiles.js`: Renderizado y gestión de la cuadrícula de atajos/baldosas.
    * `carpetas.js`: Agrupación y gestión de carpetas de atajos.
    * `utils.js`: Helpers del DOM y abstracción de `storageGet` / `storageSet`.
  * `components/`: Modales (`modal.js`), menú contextual (`context-menu.js`), papelera (`trash.js`) e interfaz general (`ui.js`).
  * `settings/`: Paneles de configuración (`settings.js`), editor CSS en vivo (`editor.js`) y catálogo de temas (`themes-premium.js`).
  * `system/`: Respaldo y restauración (`file-system.js`), worker de archivos (`file-worker.js`), integración con marcadores (`navegadores.js`).
  * `lib/`: Motor de arrastre táctil/ratón (`enhanced-drag-drop.js`) y almacenamiento binario (`idb-keyval.js`).
* `notas/`: Subsistema independiente y completo para notas enriquecidas (`notas.html`, `notas.js`, `notas.css`).
* `widgets/`: Módulos de productividad flotantes/dockeables (`widget-manager.js`, `calendar.js`, `pomodoro.js`, `quotes.js`, `todo.js`).
* `utils/`: Servicios auxiliares (clima con Open-Meteo `tiempo.js`, búsqueda web con múltiples motores `search.js`, degradados `gradients.js`).
* `css/`: Hoja de estilos desacoplada (`variables.css`, `layout.css`, `tiles.css`, `panels.css`, `themes-premium.css`).

---

## ⚡ 2. Reglas Obligatorias de Desarrollo

1. **JSDoc en la primera línea:**
   Todo archivo JavaScript nuevo o modificado **debe** incluir un bloque JSDoc en la línea 1 resumiendo su función, dependencias y exportaciones.
2. **Preservar el Esquema Layered Loading y Zero-Flash:**
   - La Fase 0 en `menubar/app.js` solo debe consultar claves visuales críticas (`tiles`, `panelBg`, `accentColor`, `bgData`, etc.) para renderizar en menos de 50ms.
   - No añadir lecturas pesadas síncronas o llamadas a APIs externas en el flujo de arranque visual.
3. **Seguridad y CSP en Firefox MV3:**
   - Prohibido `eval()`, `new Function()` o scripts inline en HTML.
   - Cualquier contenido HTML inyectado de notas o entradas de usuario debe ser sanitizado con `DOMPurify.sanitize()`.
4. **Almacenamiento Dual:**
   - Usar `storageGet` / `storageSet` para configuraciones y notas.
   - Usar `idb-keyval` (IndexedDB) para wallpapers y blobs pesados.
5. **Idioma de Commits:**
   - Todos los mensajes de commit generados deben estar redactados en **español** siguiendo *Conventional Commits* (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`).

---

## 🧠 3. Integración y Flujo de Trabajo con GitNexus

GitNexus genera y mantiene un grafo de conocimiento de código e impacto dentro del repositorio (`.gitnexus/`). Todos los agentes deben utilizar los siguientes comandos para investigar y validar cambios antes de aplicar modificaciones complejas:

### A. Búsqueda y Exploración Conceptual
Antes de implementar una nueva característica o modificar una existente, consulta el grafo:
```bash
node .gitnexus/run.cjs query "<concepto o flujo a buscar>" --repo .
```
*(o alternativamente: `npx gitnexus query "<concepto>"`)*

### B. Análisis 360° de Símbolos (`context`)
Para inspeccionar quién llama a una función/clase y qué dependencias utiliza:
```bash
node .gitnexus/run.cjs context "<NombreDelSimbolo>" --repo .
```

### C. Análisis de Radio de Impacto (`impact` / Blast Radius)
**CRÍTICO:** Antes de modificar o eliminar métodos en módulos compartidos (`core/tiles.js`, `core/config.js`, `app.js`, `widgets/js/widget-manager.js`), ejecuta el análisis de impacto para no generar regresiones:
```bash
node .gitnexus/run.cjs impact "<NombreDelSimbolo>" --direction upstream --repo .
```

### D. Trazabilidad de Flujo (`trace`)
Para comprender el camino de ejecución entre dos partes del código:
```bash
npx gitnexus trace "<SimboloOrigen>" "<SimboloDestino>"
```

### E. Detección de Cambios e Impacto en Git (`detect-changes`)
Tras realizar modificaciones en código, verifica qué flujos y símbolos se ven afectados antes de dar por completada la tarea o hacer commit:
```bash
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

### F. Re-indexación tras cambios estructurales
Si se añaden nuevos archivos o se realizan refactorizaciones mayores:
```bash
node .gitnexus/run.cjs analyze --index-only
```

---

## 🚀 4. Protocolo de Ejecución para Agentes
1. **Entender:** Usa `context` y `query` para mapear dependencias.
2. **Planificar:** Evalúa el radio de impacto con `impact`.
3. **Implementar:** Aplica código siguiendo las reglas arquitectónicas y estéticas.
4. **Validar:** Comprueba consistencia con `detect-changes` y verifica en el navegador.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Tablero-Menu-Ayarachi-Firefox** (600 symbols, 1916 relationships, 49 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/Tablero-Menu-Ayarachi-Firefox/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Tablero-Menu-Ayarachi-Firefox/clusters` | All functional areas |
| `gitnexus://repo/Tablero-Menu-Ayarachi-Firefox/processes` | All execution flows |
| `gitnexus://repo/Tablero-Menu-Ayarachi-Firefox/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

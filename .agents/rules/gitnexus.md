# 🕸️ GitNexus Workspace Rule — Inteligencia de Código y Control de Arquitectura

Este archivo define las directivas y pautas operativas obligatorias para el uso de **GitNexus** en el repositorio de **Tablero (Firefox WebExtension)**.

---

## 📌 1. Misión y Alcance de GitNexus en el Repositorio

GitNexus actúa como el **Cerebro Técnico y Arquitectural** del proyecto, indexando y mapeando el grafo de dependencias entre todos los módulos de la extensión (`menubar/`, `widgets/`, `notas/`, `utils/`, `css/`).

Su función principal es:
1. **Control de Interconexión Modular:** Proteger la cohesión entre el orquestador (`menubar/app.js`), los módulos de datos (`core/config.js`, `core/tiles.js`), el subsistema de notas (`notas/notas.js`) y el gestor de widgets (`widgets/js/widget-manager.js`).
2. **Protección del Pipeline de Inicio (*Zero-Flash & Layered Loading*):** Garantizar que ninguna refactorización o cambio en el ciclo de vida altere las claves críticas de la Fase 0 o retrase la carga de la nueva pestaña.
3. **Análisis de Impacto Previo (*Blast Radius*):** Evaluar el impacto estructural de cambios en funciones compartidas, listeners de almacenamiento o APIs del navegador antes de editar.

---

## 🛡️ 2. Reglas Operativas Obligatorias (Guardarraíles)

### ✅ Obligatorio (Always Do):
1. **Análisis de Impacto Antes de Editar:**
   - Antes de modificar cualquier función, clase o método en módulos compartidos (`core/tiles.js`, `core/config.js`, `app.js`, `widgets/js/widget-manager.js`, etc.), ejecutar:
     ```powershell
     node .gitnexus/run.cjs impact "<nombreSimbolo>" --direction upstream --repo .
     ```
     *(o mediante MCP: `gitnexus_impact` / `npx gitnexus impact "<nombreSimbolo>" --direction upstream`)*
   - Revisar los llamadores (*callers*), flujos afectados y nivel de riesgo (*risk*).
2. **Detección de Cambios en el Grafo Antes de Confirmar (Commit):**
   - Antes de proponer o realizar un commit de código:
     ```powershell
     node .gitnexus/run.cjs detect-changes --scope all --repo .
     ```
   - Si se analiza contra la rama principal:
     ```powershell
     node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .
     ```
3. **Exploración Asistida por Grafo:**
   - Para explorar conceptos o arquitectura de una mecánica:
     ```powershell
     node .gitnexus/run.cjs query "<concepto>" --repo .
     ```
   - Para inspeccionar un símbolo o función específica:
     ```powershell
     node .gitnexus/run.cjs context "<nombreSimbolo>" --repo .
     ```

### ❌ Prohibido (Never Do):
1. **Nunca editar funciones o módulos centrales a ciegas** sin previo análisis de impacto.
2. **Nunca renombrar símbolos mediante búsqueda y reemplazo masivo de texto (*find-and-replace*)** sin verificar el grafo de llamadas.
3. **Nunca confirmar cambios (commit) sin verificar `detect-changes`**.
4. **Nunca ignorar advertencias de riesgo alto** o asumir que `risk: UNKNOWN` significa bajo riesgo.

---

## 🔄 3. Mantenimiento y Actualización del Índice

Si se incorporan nuevos módulos, archivos o cambios estructurales mayores:

* **Reindexar de forma rápida (solo índice):**
  ```powershell
  node .gitnexus/run.cjs analyze --index-only
  ```
* **Consultar estado actual del grafo:**
  ```powershell
  node .gitnexus/run.cjs status
  ```

---

## 🛠️ 4. Guía Rápida de Skills y Tareas de GitNexus

| Tarea Requerida | Skill de Referencia | Comando / Flujo |
| :--- | :--- | :--- |
| **Comprender arquitectura / "¿Cómo funciona X?"** | `.agents/skills/gitnexus-exploring/SKILL.md` | `node .gitnexus/run.cjs context "<simbolo>"` |
| **Radio de impacto / "¿Qué se rompe si toco X?"** | `.agents/skills/gitnexus-impact-analysis/SKILL.md` | `node .gitnexus/run.cjs impact "<simbolo>" --direction upstream` |
| **Diagnosticar fallas / "¿Por qué falla la función?"** | `.agents/skills/gitnexus-debugging/SKILL.md` | Rastreo de flujo y ejecución de pruebas |
| **Refactorizar / modularizar scripts** | `.agents/skills/gitnexus-refactoring/SKILL.md` | `node .gitnexus/run.cjs detect-changes --scope all` |
| **Referencia completa de comandos CLI** | `.agents/skills/gitnexus-cli/SKILL.md` | `node .gitnexus/run.cjs --help` |

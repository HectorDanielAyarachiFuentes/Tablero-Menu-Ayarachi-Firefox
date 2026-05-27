/**
 * Sistema de Widgets - Manager Aislado
 * Gestiona la carga y visualización de widgets dentro de widgets.html
 */
import { PomodoroWidget } from './pomodoro.js';
import { TodoWidget } from './todo.js';
import { CalendarWidget } from './calendar.js';
import { QuotesWidget } from './quotes.js';

class WidgetsManager {
    constructor() {
        this.container = document.getElementById('widgets-container');
    }

    init() {
        this.loadWidgets();
    }

    loadWidgets() {
        // Pomodoro
        const pomoEl = this.createWidgetContainer('pomodoro-widget');
        new PomodoroWidget(pomoEl);

        // To-Do
        const todoEl = this.createWidgetContainer('todo-widget');
        new TodoWidget(todoEl);

        // Calendario
        const calEl = this.createWidgetContainer('calendar-widget');
        new CalendarWidget(calEl);

        // Frases
        const quoteEl = this.createWidgetContainer('quotes-widget');
        new QuotesWidget(quoteEl);
    }

    createWidgetContainer(id) {
        const widget = document.createElement('div');
        widget.className = 'widget-card';
        widget.id = id;
        this.container.appendChild(widget);
        return widget;
    }
}

// Inicializar automáticamente
const manager = new WidgetsManager();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => manager.init());
} else {
    manager.init();
}

// Sincronizar variables CSS dinámicas desde el documento padre
function syncStyles() {
    if (window.parent && window.parent !== window) {
        const parentStyles = window.parent.document.documentElement.style.cssText;
        document.documentElement.style.cssText = parentStyles;
        // Fuerza el fondo transparente en el iframe para que no copie el fondo del index.html
        document.documentElement.style.setProperty('background', 'transparent', 'important');
        document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    }
}
// Ejecutar inmediatamente y cuando haya cambios en el padre
syncStyles();
if (window.parent && window.parent !== window) {
    const observer = new MutationObserver(syncStyles);
    observer.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['style'] });
}

/**
 * Sistema de Widgets - Manager Principal
 * Gestiona la carga y visualización de la barra lateral de widgets
 */
import { $, setHTML, setSVG } from '../core/utils.js';
import { PomodoroWidget } from './pomodoro.js';
import { TodoWidget } from './todo.js';
import { CalendarWidget } from './calendar.js';
import { QuotesWidget } from './quotes.js';

class WidgetsManager {
    constructor() {
        this.sidebar = null;
        this.toggleBtn = null;
        this.isOpen = false;
        this.widgets = [];
        this.widgetsLoaded = false;
    }

    init() {
        // Crear elementos UI
        this.createSidebar();
        this.createToggleButton();

        // NO cargar widgets aquí para mejorar rendimiento inicial
        // this.loadWidgets(); -> Se mueve a toggleSidebar

        // Event Listeners
        this.toggleBtn.addEventListener('click', () => this.toggleSidebar());

        // Cerrar al hacer clic fuera (en móviles o desktop)
        document.addEventListener('click', (e) => {
            // Ignorar si el elemento clickeado ya no está en el DOM (re-renderizado de widget)
            if (!document.body.contains(e.target)) return;

            if (this.isOpen &&
                !this.sidebar.contains(e.target) &&
                !this.toggleBtn.contains(e.target)) {
                this.closeSidebar();
            }
        });
    }

    createSidebar() {
        this.sidebar = document.createElement('aside');
        this.sidebar.className = 'widgets-sidebar';
        setHTML(this.sidebar, `
            <div class="widgets-header">
                <h2>Widgets</h2>
            </div>
            <div id="widgets-container"></div>
        `);
        document.body.appendChild(this.sidebar);
    }

    createToggleButton() {
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.id = 'widgets-toggle-btn';
        this.toggleBtn.title = "Abrir Widgets";
        setSVG(this.toggleBtn, `
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="2"></rect>
                <rect x="14" y="3" width="7" height="7" rx="2"></rect>
                <rect x="14" y="14" width="7" height="7" rx="2"></rect>
                <rect x="3" y="14" width="7" height="7" rx="2"></rect>
            </svg>
        `);
        document.body.appendChild(this.toggleBtn);
    }

    toggleSidebar() {
        if (!this.widgetsLoaded) {
            this.loadWidgets();
            this.widgetsLoaded = true;
        }

        this.isOpen = !this.isOpen;
        this.sidebar.classList.toggle('open', this.isOpen);
        this.toggleBtn.classList.toggle('active', this.isOpen);
    }

    closeSidebar() {
        this.isOpen = false;
        this.sidebar.classList.remove('open');
        this.toggleBtn.classList.remove('active');
    }

    loadWidgets() {
        const container = this.sidebar.querySelector('#widgets-container');

        // Pomodoro
        const pomoEl = this.createWidgetContainer(container, 'pomodoro-widget');
        new PomodoroWidget(pomoEl);

        // To-Do
        const todoEl = this.createWidgetContainer(container, 'todo-widget');
        new TodoWidget(todoEl);

        // Calendario
        const calEl = this.createWidgetContainer(container, 'calendar-widget');
        new CalendarWidget(calEl);

        // Frases
        const quoteEl = this.createWidgetContainer(container, 'quotes-widget');
        new QuotesWidget(quoteEl);
    }

    createWidgetContainer(container, id) {
        const widget = document.createElement('div');
        widget.className = 'widget-card';
        widget.id = id;
        container.appendChild(widget);
        return widget;
    }
}

export const widgetsManager = new WidgetsManager();

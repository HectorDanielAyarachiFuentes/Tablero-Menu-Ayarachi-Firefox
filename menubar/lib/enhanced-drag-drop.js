/**
 * Sistema Mejorado de Drag & Drop
 * Proporciona feedback visual avanzado, animaciones suaves y funcionalidades mejoradas
 */
import { $, $$ } from './utils.js';

class EnhancedDragDrop {
    constructor() {
        this.draggedElement = null;
        this.ghostElement = null;
        this.dropIndicator = null;
        this.dragHelper = null;
        this.dragOverlay = null;
        this.undoStack = [];
        this.maxUndoStack = 10;
    }

    /**
     * Inicializa el sistema mejorado de drag & drop
     */
    init() {
        this.createDropIndicator();
        this.createDragHelper();
    }

    /**
     * Crea el indicador de posición de inserción
     */
    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        this.dropIndicator.hidden = true;
        document.body.appendChild(this.dropIndicator);
    }

    /**
     * Crea el mensaje de ayuda durante drag
     */
    createDragHelper() {
        this.dragHelper = document.createElement('div');
        this.dragHelper.className = 'drag-helper';
        this.dragHelper.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"></path>
            </svg>
            <span>Arrastra para reordenar • Suelta en carpeta para mover</span>
        `;
        this.dragHelper.hidden = true;
        document.body.appendChild(this.dragHelper);
    }

    /**
     * Maneja el inicio del drag con efectos mejorados
     */
    onDragStart(e, tile) {
        this.draggedElement = tile;

        // Añadir clase de inicio de drag
        tile.classList.add('drag-starting');
        setTimeout(() => tile.classList.remove('drag-starting'), 300);

        // Crear ghost element
        this.createGhostElement(tile);

        // Crear overlay
        this.createDragOverlay();

        // Mostrar helper
        this.dragHelper.hidden = false;

        // Añadir clase al contenedor
        $('#tiles').classList.add('dragging-active');

        // Configurar dataTransfer
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.dataset.idx);

        // Aplicar clase dragging después de un pequeño delay
        setTimeout(() => {
            if (this.draggedElement) {
                this.draggedElement.classList.add('dragging');
            }
        }, 50);
    }

    /**
     * Crea un elemento ghost para seguir el cursor
     */
    createGhostElement(tile) {
        this.ghostElement = tile.cloneNode(true);
        this.ghostElement.classList.add('drag-ghost');
        this.ghostElement.style.position = 'fixed';
        this.ghostElement.style.pointerEvents = 'none';
        this.ghostElement.style.zIndex = '9999';
        this.ghostElement.style.width = `${tile.offsetWidth}px`;
        this.ghostElement.style.height = `${tile.offsetHeight}px`;
        document.body.appendChild(this.ghostElement);

        // Ocultar el ghost inicial (el navegador usa su propio)
        this.ghostElement.style.display = 'none';
    }

    /**
     * Crea un overlay semi-transparente
     */
    createDragOverlay() {
        this.dragOverlay = document.createElement('div');
        this.dragOverlay.className = 'drag-overlay';
        document.body.appendChild(this.dragOverlay);
    }

    /**
     * Maneja el drag over con indicadores visuales
     */
    onDragOver(e, targetTile, isFolder) {
        e.preventDefault();

        if (!targetTile || targetTile === this.draggedElement) {
            this.hideDropIndicator();
            return;
        }

        // Limpiar clases anteriores
        $$('.tile.drag-over, .tile.drag-over-folder').forEach(t => {
            if (t !== targetTile) {
                t.classList.remove('drag-over', 'drag-over-folder');
            }
        });

        // Aplicar clase según el tipo
        if (isFolder) {
            targetTile.classList.add('drag-over-folder');
            this.hideDropIndicator();
        } else {
            targetTile.classList.add('drag-over');
            this.showDropIndicator(targetTile, e);
        }
    }

    /**
     * Muestra el indicador de posición de inserción
     */
    showDropIndicator(targetTile, e) {
        const rect = targetTile.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const isAfter = e.clientX > midpoint;

        this.dropIndicator.hidden = false;
        this.dropIndicator.style.left = isAfter ?
            `${rect.right - 2}px` :
            `${rect.left - 2}px`;
        this.dropIndicator.style.top = `${rect.top}px`;
        this.dropIndicator.style.height = `${rect.height}px`;
    }

    /**
     * Oculta el indicador de posición
     */
    hideDropIndicator() {
        if (this.dropIndicator) {
            this.dropIndicator.hidden = true;
        }
    }

    /**
     * Maneja el drag leave
     */
    onDragLeave(e, tile) {
        tile?.classList.remove('drag-over', 'drag-over-folder');
    }

    /**
     * Maneja el drop con animaciones
     */
    onDrop(e, dropTarget, onDropCallback) {
        e.preventDefault();

        if (!this.draggedElement || !dropTarget) return;

        const isFolder = dropTarget.classList.contains('drag-over-folder');

        // Crear efecto de ripple
        this.createRippleEffect(e);

        // Si es una carpeta, crear efecto de partículas
        if (isFolder) {
            this.createFolderParticles(dropTarget);
            this.draggedElement.classList.add('entering-folder');
        } else {
            // Animación de landing
            setTimeout(() => {
                if (dropTarget && !dropTarget.classList.contains('dragging')) {
                    dropTarget.classList.add('drop-landing');
                    setTimeout(() => dropTarget.classList.remove('drop-landing'), 400);
                }
            }, 50);
        }

        // Guardar estado para undo
        this.saveUndoState();

        // Ejecutar callback de drop
        if (onDropCallback) {
            onDropCallback();
        }
    }

    /**
     * Crea efecto de ripple al soltar
     */
    createRippleEffect(e) {
        const ripple = document.createElement('div');
        ripple.className = 'drop-ripple';
        ripple.style.left = `${e.clientX - 100}px`;
        ripple.style.top = `${e.clientY - 100}px`;
        document.body.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Crea efecto de partículas al soltar en carpeta
     */
    createFolderParticles(folder) {
        const rect = folder.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'folder-particle';

            const angle = (i / 12) * Math.PI * 2;
            const distance = 50 + Math.random() * 30;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }

    /**
     * Maneja el fin del drag
     */
    onDragEnd() {
        // Limpiar clases
        $$('.tile').forEach(t => {
            t.classList.remove('dragging', 'drag-over', 'drag-over-folder', 'shifting');
        });

        $('#tiles')?.classList.remove('dragging-active');

        // Limpiar elementos temporales
        this.hideDropIndicator();

        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }

        if (this.dragOverlay) {
            this.dragOverlay.remove();
            this.dragOverlay = null;
        }

        if (this.dragHelper) {
            this.dragHelper.hidden = true;
        }

        this.draggedElement = null;
    }

    /**
     * Guarda el estado actual para undo
     */
    saveUndoState() {
        // Esta función será implementada por el módulo que use EnhancedDragDrop
        // para guardar el estado específico de los tiles
    }

    /**
     * Muestra notificación de undo
     */
    showUndoNotification(onUndo) {
        const notification = document.createElement('div');
        notification.className = 'undo-notification';
        notification.innerHTML = `
            <span>Elemento movido</span>
            <button>Deshacer</button>
        `;

        const button = notification.querySelector('button');
        button.addEventListener('click', () => {
            if (onUndo) onUndo();
            notification.remove();
        });

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Limpieza al destruir
     */
    destroy() {
        if (this.dropIndicator) this.dropIndicator.remove();
        if (this.dragHelper) this.dragHelper.remove();
        if (this.ghostElement) this.ghostElement.remove();
        if (this.dragOverlay) this.dragOverlay.remove();
    }
}

// Exportar instancia singleton
export const enhancedDragDrop = new EnhancedDragDrop();

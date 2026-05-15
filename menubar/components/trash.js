/**
 * Gestiona la funcionalidad de la papelera de reciclaje.
 * Se encarga de renderizar los elementos eliminados y manejar su restauración o eliminación permanente.
 */
import { $, $$, setSVG } from '../core/utils.js';
import { trash, tiles, saveAndRender } from '../core/tiles.js';

export function renderTrash() {
    const trashListEl = $('#trash-list');
    if (!trashListEl) return;

    const emptyTrashBtn = $('#emptyTrashBtn');
    if (emptyTrashBtn) {
        emptyTrashBtn.disabled = trash.length === 0;
    }

    trashListEl.textContent = '';
    trash.forEach((item, index) => {
        const trashItemEl = document.createElement('div');
        trashItemEl.className = 'trash-item';

        let iconSrc = 'icons/icon16.png';
        if (item.type === 'note') {
            iconSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z'%3E%3C/path%3E%3Cpolyline points='15 3 15 8 20 8'%3E%3C/polyline%3E%3C/svg%3E";
        } else if (item.customIcon) {
            iconSrc = item.customIcon;
        } else if (item.url && (item.url.startsWith('http:') || item.url.startsWith('https:'))) {
            try {
                iconSrc = `https://www.google.com/s2/favicons?sz=32&domain=${new URL(item.url).hostname}`;
            } catch (e) { /* URL inválida, se usa el ícono por defecto */ }
        }

        const info = document.createElement('div');
        info.className = 'trash-item-info';
        const img = document.createElement('img');
        img.src = iconSrc;
        img.alt = '';
        img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
        const name = document.createElement('span');
        name.textContent = item.name;
        info.appendChild(img);
        info.appendChild(name);

        const actions = document.createElement('div');
        actions.className = 'trash-actions';
        
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-btn';
        restoreBtn.dataset.idx = index;
        restoreBtn.title = 'Restaurar';
        setSVG(restoreBtn, '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>');
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-perm-btn';
        deleteBtn.dataset.idx = index;
        deleteBtn.title = 'Eliminar permanentemente';
        setSVG(deleteBtn, '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>');

        actions.appendChild(restoreBtn);
        actions.appendChild(deleteBtn);
        
        trashItemEl.appendChild(info);
        trashItemEl.appendChild(actions);
        trashListEl.appendChild(trashItemEl);
    });

    $$('.restore-btn').forEach(btn => btn.addEventListener('click', handleRestoreTrash));
    $$('.delete-perm-btn').forEach(btn => btn.addEventListener('click', handleDeletePermanent));
}

function handleRestoreTrash(e) {
    const index = parseInt(e.currentTarget.dataset.idx, 10);
    const itemToRestore = trash.splice(index, 1)[0];
    delete itemToRestore.deletedAt;
    tiles.unshift(itemToRestore);
    saveAndRender();
}

function handleDeletePermanent(e) {
    const index = parseInt(e.currentTarget.dataset.idx, 10);
    if (confirm(`¿Estás seguro de que quieres eliminar "${trash[index].name}" permanentemente? Esta acción no se puede deshacer.`)) {
        trash.splice(index, 1);
        saveAndRender();
    }
}
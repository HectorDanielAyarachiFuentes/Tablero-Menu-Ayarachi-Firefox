import { $, $$, setHTML } from '../menubar/core/utils.js';
import { tiles, trash, saveAndRender } from '../menubar/core/tiles.js';
import { openModal } from '../menubar/components/modal.js';
import { toggleNotesPanel } from '../menubar/components/ui.js';

let isInitialized = false;

export async function initNotesComponent() {
    if (isInitialized) return;
    
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'notas/notas.css';
    document.head.appendChild(link);
    
    // Load HTML
    const response = await fetch('notas/notas.html');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    Array.from(doc.body.children).forEach(child => document.body.appendChild(child));
    
    // Bind events
    $('#addNote')?.addEventListener('click', () => openModal(null, 'note'));
    $('#closeNotes')?.addEventListener('click', () => toggleNotesPanel(false));
    
    isInitialized = true;
    renderNotes();
}

export function renderNotes() {
    const notesListEl = $('#notes-list');
    if (!notesListEl) return;

    const allNotes = tiles.map((tile, index) => ({ ...tile, originalIndex: index }))
                         .filter(tile => tile.type === 'note');

    notesListEl.textContent = '';

    if (allNotes.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-notes';
        
        // Crear SVG manualmente para evitar innerHTML
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '14 2 14 8 20 8');
        
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '16'); line1.setAttribute('y1', '13'); line1.setAttribute('x2', '8'); line1.setAttribute('y2', '13');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '16'); line2.setAttribute('y1', '17'); line2.setAttribute('x2', '8'); line2.setAttribute('y2', '17');
        
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line3.setAttribute('points', '10 9 9 9 8 9');
        
        svg.appendChild(path);
        svg.appendChild(polyline);
        svg.appendChild(line1);
        svg.appendChild(line2);
        svg.appendChild(line3);
        
        emptyDiv.appendChild(svg);
        
        const emptySpan = document.createElement('span');
        emptySpan.textContent = 'Tus notas aparecerán aquí.';
        emptyDiv.appendChild(emptySpan);
        notesListEl.appendChild(emptyDiv);
        return;
    }

    allNotes.forEach((note, i) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        noteEl.dataset.idx = note.originalIndex;
        noteEl.style.setProperty('--animation-delay', `${i * 60}ms`);

        const header = document.createElement('div');
        header.className = 'note-item-header';
        const title = document.createElement('span');
        title.className = 'note-item-title';
        title.textContent = note.name;
        header.appendChild(title);

        const content = document.createElement('div');
        content.className = 'note-item-content';
        setHTML(content, note.content || ''); 

        const actions = document.createElement('div');
        actions.className = 'note-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'note-edit-btn';
        editBtn.title = 'Editar nota';
        
        const editSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        editSvg.setAttribute('width', '24'); editSvg.setAttribute('height', '24'); editSvg.setAttribute('viewBox', '0 0 24 24');
        editSvg.setAttribute('fill', 'none'); editSvg.setAttribute('stroke', 'currentColor'); editSvg.setAttribute('stroke-width', '2');
        editSvg.setAttribute('stroke-linecap', 'round'); editSvg.setAttribute('stroke-linejoin', 'round');
        
        const editPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        editPath1.setAttribute('d', 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7');
        const editPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        editPath2.setAttribute('d', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z');
        editSvg.appendChild(editPath1); editSvg.appendChild(editPath2);
        editBtn.appendChild(editSvg);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-delete-btn';
        deleteBtn.title = 'Eliminar nota';
        
        const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        deleteSvg.setAttribute('width', '24'); deleteSvg.setAttribute('height', '24'); deleteSvg.setAttribute('viewBox', '0 0 24 24');
        deleteSvg.setAttribute('fill', 'none'); deleteSvg.setAttribute('stroke', 'currentColor'); deleteSvg.setAttribute('stroke-width', '2');
        deleteSvg.setAttribute('stroke-linecap', 'round'); deleteSvg.setAttribute('stroke-linejoin', 'round');
        
        const deletePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        deletePolyline.setAttribute('points', '3 6 5 6 21 6');
        const deletePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        deletePath.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');
        deleteSvg.appendChild(deletePolyline); deleteSvg.appendChild(deletePath);
        deleteBtn.appendChild(deleteSvg);

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        noteEl.appendChild(header);
        noteEl.appendChild(content);
        noteEl.appendChild(actions);

        noteEl.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openModal(note.originalIndex);
            }
        });

        noteEl.querySelector('.note-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(note.originalIndex);
        });

        noteEl.querySelector('.note-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`¿Estás seguro de que quieres enviar la nota "${note.name}" a la papelera?`)) {
                const itemToTrash = tiles.splice(note.originalIndex, 1)[0];
                itemToTrash.deletedAt = new Date().toISOString();
                trash.unshift(itemToTrash);
                saveAndRender();
            }
        });

        notesListEl.appendChild(noteEl);
    });
}

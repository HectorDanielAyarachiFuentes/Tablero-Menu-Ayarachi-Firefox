/**
 * Gestiona la selección y renderizado de los Doodles en la configuración.
 */
import { $, $$ } from '../core/utils.js';
import { saveAndSyncSetting } from '../core/utils.js';
import { DOODLES_LIST } from './doodles-list.js';

export const DOODLES = DOODLES_LIST;

export function loadDoodles() {
  return DOODLES_LIST;
}

export function initDoodleSettings(activeDoodleId) {
  const doodleList = $('#doodle-list');
  if (!doodleList) return;
  doodleList.textContent = '';

  DOODLES_LIST.forEach(doodle => {
    const button = document.createElement('button');
    button.className = 'doodle-item';
    button.dataset.doodleId = doodle.id;

    const preview = document.createElement('div');
    preview.className = `doodle-item-preview ${doodle.id}`;
    if (doodle.id === 'none') preview.classList.add('none');

    if (doodle.template) {
      const cssDoodle = document.createElement('css-doodle');
      cssDoodle.textContent = doodle.template;
      preview.appendChild(cssDoodle);
    }

    const name = document.createElement('span');
    name.className = 'doodle-item-name';
    name.textContent = doodle.name;

    button.appendChild(preview);
    button.appendChild(name);

    button.addEventListener('click', async () => {
      // Actualizar el cache de localStorage inmediatamente para nuevas pestañas
      try {
        const cacheStr = localStorage.getItem('zero_flash_cache');
        const cache = cacheStr ? JSON.parse(cacheStr) : {};
        cache.doodle = doodle.id;
        // Buscar el template del doodle
        const doodleData = DOODLES_LIST.find(d => d.id === doodle.id);
        if (doodleData && doodleData.template) {
          cache.doodleTemplate = doodleData.template;
        }
        localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
      } catch (e) { /* ignorar */ }

      await saveAndSyncSetting({
        doodle: doodle.id,
        syncFirefoxTheme: false
      });
      window.dispatchEvent(new CustomEvent('background-changed'));
      const syncToggle = $('#syncFirefoxThemeToggle');
      if (syncToggle) syncToggle.checked = false;
    });

    const doodleElement = button.querySelector('css-doodle');
    if (doodleElement) {
      setTimeout(() => { if (doodleElement.pause) doodleElement.pause(); }, 100);
    }

    button.addEventListener('mouseenter', () => {
      const doodleElement = button.querySelector('css-doodle');
      if (doodleElement && doodleElement.resume) doodleElement.resume();
    });
    button.addEventListener('mouseleave', () => {
      const doodleElement = button.querySelector('css-doodle');
      if (doodleElement && doodleElement.pause) doodleElement.pause();
    });

    doodleList.appendChild(button);
  });

  updateDoodleSelectionUI(activeDoodleId);
}

export function updateDoodleSelectionUI(doodleId) {
  const doodlePreviewContainer = $('#doodle-preview');
  if (!doodlePreviewContainer) return;

  $$('#doodle-list .doodle-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.doodleId === doodleId);
  });

  const doodle = DOODLES_LIST.find(d => d.id === doodleId);
  doodlePreviewContainer.textContent = '';
  if (doodle && doodle.id !== 'none' && doodle.template) {
    const cssDoodle = document.createElement('css-doodle');
    cssDoodle.textContent = doodle.template;
    doodlePreviewContainer.appendChild(cssDoodle);
  } else {
    const span = document.createElement('span');
    span.className = 'placeholder-text';
    span.textContent = 'Selecciona un doodle para verlo aquí';
    doodlePreviewContainer.appendChild(span);
  }
}
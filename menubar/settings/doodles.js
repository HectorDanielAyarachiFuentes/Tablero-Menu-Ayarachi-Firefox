/**
 * Gestiona la selección, caché Zero-Flash y renderizado de vistas previas de Doodles.
 */
import { $, $$, saveAndSyncSetting, setSVG, ensureCssDoodleLoaded } from '../core/utils.js';
import { DOODLES_LIST } from './doodles-list.js';

export const DOODLES = DOODLES_LIST;

export function loadDoodles() {
  return DOODLES_LIST;
}

/**
 * Adapta una plantilla @grid de pantalla completa (vw/vh) para que encaje
 * proporcionalmente dentro de miniaturas o del visor previo de ajustes.
 */
function adaptTemplateForPreview(template, isLarge = false) {
  if (!template) return '';
  let adapted = template
    .replace(/\b100vw\b/g, '100%')
    .replace(/\b100vh\b/g, '100%')
    .replace(/\b150vmax\b/g, '150%')
    .replace(/\b115vh\b/g, isLarge ? '220px' : '125px')
    .replace(/@size:\s*@r\(([^)]+)\)vw/g, '@size: @r($1)%')
    .replace(/\bvw\b/g, '%');

  if (!isLarge) {
    adapted = adapted
      .replace(/font-size:\s*@r\(30px,\s*60px\)/g, 'font-size: @r(12px, 20px)')
      .replace(/font-size:\s*@r\(14px,\s*22px\)/g, 'font-size: @r(9px, 13px)')
      .replace(/translateY\(-40px\)/g, 'translateY(-12px)')
      .replace(/translateY\(40px\)/g, 'translateY(12px)')
      .replace(/@size:\s*100%\s+4px/g, '@size: 140% 2px')
      .replace(/@size:\s*150%\s+@r\(40px,\s*120px\)/g, '@size: 150% @r(18px, 44px)')
      .replace(/blur\(40px\)/g, 'blur(14px)')
      .replace(/blur\(8px\)/g, 'blur(3px)');
  }
  return adapted;
}

function extractDoodleColorFromTemplate(template) {
  if (!template) return null;
  const match = template.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))/);
  return match ? match[1] : null;
}

export async function initDoodleSettings(activeDoodleId) {
  const doodleList = $('#doodle-list');
  if (!doodleList) return;
  doodleList.textContent = '';

  const doodleReady = await ensureCssDoodleLoaded();

  DOODLES_LIST.forEach(doodle => {
    const button = document.createElement('button');
    button.className = 'doodle-item';
    button.type = 'button';
    button.dataset.doodleId = doodle.id;

    const preview = document.createElement('div');
    preview.className = `doodle-item-preview ${doodle.id}`;

    if (doodle.id === 'none') {
      preview.classList.add('none');
      setSVG(preview, '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"></line></svg>');
    } else if (doodle.template && doodleReady) {
      const cssDoodle = document.createElement('css-doodle');
      cssDoodle.textContent = adaptTemplateForPreview(doodle.template, false);
      preview.appendChild(cssDoodle);
    }

    const name = document.createElement('span');
    name.className = 'doodle-item-name';
    name.textContent = doodle.name;

    button.appendChild(preview);
    button.appendChild(name);

    button.addEventListener('click', async () => {
      try {
        const cacheStr = localStorage.getItem('zero_flash_cache');
        const cache = cacheStr ? JSON.parse(cacheStr) : {};
        cache.doodle = doodle.id;
        cache.syncFirefoxTheme = false;
        if (doodle.id === 'none') {
          delete cache.doodleTemplate;
          delete cache.doodleColor;
        } else {
          const doodleData = DOODLES_LIST.find(d => d.id === doodle.id);
          if (doodleData && doodleData.template) {
            cache.doodleTemplate = doodleData.template;
            const extractedColor = extractDoodleColorFromTemplate(doodleData.template);
            if (extractedColor) {
              cache.doodleColor = extractedColor;
            } else {
              delete cache.doodleColor;
            }
          }
        }
        localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
      } catch (e) { /* ignorar */ }

      await saveAndSyncSetting({
        doodle: doodle.id,
        syncFirefoxTheme: false
      });
      await updateDoodleSelectionUI(doodle.id);
      window.dispatchEvent(new CustomEvent('background-changed'));
      const syncToggle = $('#syncFirefoxThemeToggle');
      if (syncToggle) syncToggle.checked = false;
    });

    if (doodle.template && doodleReady) {
      // Permitir que la animación se asiente antes de pausar para mostrar una miniatura viva en reposo
      setTimeout(() => {
        const doodleElement = button.querySelector('css-doodle');
        if (doodleElement && !button.matches(':hover') && doodleElement.pause) {
          doodleElement.pause();
        }
      }, 450);

      button.addEventListener('mouseenter', () => {
        const doodleElement = button.querySelector('css-doodle');
        if (doodleElement && doodleElement.resume) doodleElement.resume();
      });
      button.addEventListener('mouseleave', () => {
        const doodleElement = button.querySelector('css-doodle');
        if (doodleElement && doodleElement.pause) doodleElement.pause();
      });
    }

    doodleList.appendChild(button);
  });

  await updateDoodleSelectionUI(activeDoodleId);
}

export async function updateDoodleSelectionUI(doodleId) {
  const doodlePreviewContainer = $('#doodle-preview');
  if (!doodlePreviewContainer) return;

  $$('#doodle-list .doodle-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.doodleId === doodleId);
  });

  const doodle = DOODLES_LIST.find(d => d.id === doodleId);
  doodlePreviewContainer.textContent = '';
  if (doodle && doodle.id !== 'none' && doodle.template) {
    const ready = await ensureCssDoodleLoaded();
    if (!ready) return;
    const cssDoodle = document.createElement('css-doodle');
    cssDoodle.textContent = adaptTemplateForPreview(doodle.template, true);
    doodlePreviewContainer.appendChild(cssDoodle);
  } else {
    const span = document.createElement('span');
    span.className = 'placeholder-text';
    span.textContent = 'Selecciona un doodle para verlo aquí';
    doodlePreviewContainer.appendChild(span);
  }
}
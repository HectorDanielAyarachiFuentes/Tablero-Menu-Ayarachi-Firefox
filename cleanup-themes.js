/**
 * Script de limpieza para resetear temas premium
 * Ejecuta esto en la consola del navegador para limpiar la configuración
 */

// Limpiar configuración de temas premium
chrome.storage.local.remove([
    'activePremiumTheme',
    'autoThemeMode',
    'dayThemeId',
    'nightThemeId'
], () => {
    console.log('✅ Configuración de temas premium limpiada');
    console.log('🔄 Recarga la página para ver los cambios');
});

// También limpiar del sync storage
chrome.storage.sync.remove([
    'activePremiumTheme',
    'autoThemeMode',
    'dayThemeId',
    'nightThemeId'
], () => {
    console.log('✅ Configuración sync de temas premium limpiada');
});

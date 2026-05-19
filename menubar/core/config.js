/**
 * Archivo de configuración central.
 * Define constantes utilizadas en toda la aplicación, como las claves de almacenamiento y las URLs de APIs.
 */
export const STORAGE_KEYS = [
  'tiles',
  'engine',
  'theme',
  'bgData',
  'bgUrl',
  'userName',
  'weatherCity',
  'gradient',
  'panelBg',
  'panelOpacity',
  'panelBlur',
  'panelRadius',
  'randomBg',
  'trash',
  'autoSync',
  'doodle',
  'greetingColor',
  'nameColor',
  'clockColor',
  'dateColor',
  'activePremiumTheme',
  'premiumThemeData',
  'bgType',
  'bgDisplayMode',
  'use12HourFormat',
  'showSeconds',
  'greetingPreference',
  'customGreetings',
  'showSearch',
  'showWeather',
  'showDate',
  'enableLoadAnimations',
  'greetingFont',
  'dateFont',
  'panelTextColor',
  'panelTextSecondaryColor',
  'panelShadowEnabled',
  'panelShadowColor',
  'panelShadowBlur'
];

export const API_URLS = {
  GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast'
};
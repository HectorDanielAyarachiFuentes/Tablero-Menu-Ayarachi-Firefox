/**
 * Gestiona la obtención y renderizado de la información del clima.
 * Puede obtener el clima por geolocalización o por una ciudad especificada por el usuario.
 */
import { $, storageGet, storageSet, saveAndSyncSetting } from '../menubar/core/utils.js';
import { showSettingError } from '../menubar/components/ui.js';
import { API_URLS } from '../menubar/core/config.js';

export const WeatherManager = {
    init() {
        // Adjuntar listeners una sola vez
        $('#weatherCity').addEventListener('change', this.handleCityChange);
        
        const weatherEl = $('#weather');
        weatherEl.addEventListener('click', this.handleWidgetClick);
        
        // Cerrar si se hace clic fuera del widget
        document.addEventListener('click', (e) => {
            if (!weatherEl.contains(e.target)) {
                weatherEl.classList.remove('open', 'summary-open');
            }
        });

        // Carga inicial
        this.fetchAndRender();
    },
    async fetchAndRender() {
        const weatherEl = $('#weather');
        const customCity = (await storageGet(['weatherCity'])).weatherCity;
        
        const cachedWeather = await storageGet(['weather']);
        // Use cache if it exists, is less than 30 mins old, matches the city setting,
        // and has sunrise/sunset data (invalidate old caches without that info)
        const hasSunData = cachedWeather.weather?.data?.daily?.sunrise;
        if (cachedWeather.weather && hasSunData && (Date.now() - cachedWeather.weather.timestamp < 1800000) && cachedWeather.weather.city === (customCity || 'auto')) {
            render(cachedWeather.weather.data);
            return;
        }


        try {
            const weatherData = customCity ? await fetchWeatherByCity(customCity) : await fetchWeatherByCoords();
            render(weatherData);
            storageSet({ weather: { data: weatherData, timestamp: Date.now(), city: customCity || 'auto' } });
        } catch (error) {
            console.error("WeatherManager Error:", error);
            weatherEl.textContent = '';
            const errSpan = document.createElement('span');
            errSpan.textContent = error.message;
            weatherEl.appendChild(errSpan);
            weatherEl.classList.add('loaded');
        }
    },
    handleCityChange(e) {
        const city = e.target.value.trim();
        // Si el campo está vacío, lo guardamos y dejamos que la geolocalización actúe.
        if (!city) {
            saveAndSyncSetting({ weatherCity: '' });
            WeatherManager.fetchAndRender();
            return;
        }
        // Validamos que la ciudad tenga al menos 2 caracteres y un formato válido.
        if (city.length < 2 || !/^[a-zA-ZáéíóúñÑ\s.,'-]+$/.test(city)) {
            showSettingError('Nombre de ciudad inválido');
            return;
        }
        // Guardamos la configuración y luego intentamos obtener el clima.
        saveAndSyncSetting({ weatherCity: city }).then(() => {
            WeatherManager.fetchAndRender().catch(err => {
                if (err.message === 'Ciudad no encontrada.') showSettingError('Ciudad no encontrada.');
            });
        });
    },
    handleWidgetClick(e) {
        // Evitar que el clic en el banner de alerta modifique el estado del widget
        if (e.target.closest('.weather-alert-banner')) return;

        const weatherEl = $('#weather');
        
        if (weatherEl.classList.contains('open')) {
            // Tercer clic (o clic estando full open): Cerrar completamente
            weatherEl.classList.remove('open', 'summary-open');
        } else if (weatherEl.classList.contains('summary-open')) {
            // Segundo clic (desde summary): Abrir full
            weatherEl.classList.add('open');
            weatherEl.classList.remove('summary-open');
        } else {
            // Primer clic (desde cerrado): Abrir summary
            weatherEl.classList.add('summary-open');
        }
    }
};

async function apiFetch(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error en la petición: ${response.statusText}`);
    }
    return response.json();
}

async function fetchWeatherByCity(city) {
    const geoUrl = `${API_URLS.GEOCODING}?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const geoData = await apiFetch(geoUrl);

    if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Ciudad no encontrada.');
    }
    const { latitude, longitude, name } = geoData.results[0];
    const weatherData = await fetchWeather(latitude, longitude);
    weatherData.latitude = latitude;
    weatherData.longitude = longitude;
    weatherData.city_name = name; // Add city name to data
    return weatherData;
}

async function fetchWeatherByCoords() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Geolocalización no soportada.'));
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const weatherData = await fetchWeather(latitude, longitude);
                    weatherData.latitude = latitude;
                    weatherData.longitude = longitude;
                    resolve(weatherData);
                } catch (error) {
                    reject(new Error('No se pudo obtener el clima.'));
                }
            },
            (err) => {
                console.error("Geolocation error:", err);
                reject(new Error('Permiso de ubicación denegado.'));
            }
        );
    });
}

function fetchWeather(lat, lon) {
    const weatherUrl = `${API_URLS.WEATHER}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=6`;
    return apiFetch(weatherUrl);
}

/**
 * Calcula la fase lunar para una fecha dada.
 * Retorna un objeto con: name (nombre), emoji (emoji), illumination (0-1), age (días).
 */
function getMoonPhase(date = new Date()) {
    // Edad de la luna en días (ciclo sinódico ≈ 29.53 días)
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const synodicMonth = 29.530588853;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceKnown = (date - knownNewMoon) / msPerDay;
    const age = ((daysSinceKnown % synodicMonth) + synodicMonth) % synodicMonth;
    const illumination = (1 - Math.cos((2 * Math.PI * age) / synodicMonth)) / 2;

    let name, icon;
    if (age < 1.85)        { name = 'Luna Nueva';        icon = 'moon-new-moon'; }
    else if (age < 7.38)   { name = 'Creciente';         icon = 'moon-waxing-crescent'; }
    else if (age < 9.22)   { name = 'Cuarto Creciente';  icon = 'moon-first-quarter'; }
    else if (age < 14.77)  { name = 'Gibosa Creciente';  icon = 'moon-waxing-gibbous'; }
    else if (age < 16.61)  { name = 'Luna Llena';        icon = 'moon-full-moon'; }
    else if (age < 22.15)  { name = 'Gibosa Menguante';  icon = 'moon-waning-gibbous'; }
    else if (age < 23.99)  { name = 'Cuarto Menguante';  icon = 'moon-last-quarter'; }
    else if (age < 27.68)  { name = 'Menguante';         icon = 'moon-waning-crescent'; }
    else                   { name = 'Luna Nueva';        icon = 'moon-new-moon'; }

    return { name, icon, illumination: Math.round(illumination * 100), age: Math.round(age) };
}

/**
 * Determina si actualmente es de día basándose en sunrise/sunset reales.
 * Retorna true si es de día, false si es de noche.
 */
function getIsDay(sunriseISO, sunsetISO) {
    const now = Date.now();
    const sunrise = new Date(sunriseISO).getTime();
    const sunset = new Date(sunsetISO).getTime();
    return now >= sunrise && now < sunset;
}

/**
 * Formatea una hora ISO a HH:MM local.
 */
function formatTime(isoString) {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function render(data) {
    if (!data || !data.current || !data.hourly || !data.daily) return;


        // --- Sol y Luna (calculados primero para usarlos en getInterpretation) ---
        const todaySunrise = data.daily.sunrise ? data.daily.sunrise[0] : null;
        const todaySunset  = data.daily.sunset  ? data.daily.sunset[0]  : null;
        const isDay = todaySunrise && todaySunset ? getIsDay(todaySunrise, todaySunset) : (new Date().getHours() >= 6 && new Date().getHours() < 20);
        const moonPhase = getMoonPhase(new Date());

        // Current weather
        const temp = Math.round(data.current.temperature_2m);
        const humidity = data.current.relative_humidity_2m;
        const wind = data.current.wind_speed_10m.toFixed(1);
        const { description, icon } = getInterpretation(data.current.weather_code, isDay);
        const weatherEl = $('#weather');

        // Determinar si hay alerta basada en condiciones reales
        let alertData = null;
        const code = data.current.weather_code;
        const wSpeed = data.current.wind_speed_10m;
        
        // Códigos WMO de tormentas, granizo, lluvias y nevadas severas, o viento extremo >= 50km/h
        const isExtremeWeather = [99, 96, 95, 86, 82, 75, 67, 66, 65].includes(code) || wSpeed >= 50;
        
        if (isExtremeWeather) {
            alertData = {
                type: 'danger',
                message: 'Aviso Meteorológico: Condiciones climáticas activas o significativas en tu región. Revisa el enlace oficial de abajo para obtener el pronóstico en tiempo real y detallado de tu localidad.'
            };
        }

        if (alertData) {
            weatherEl.classList.add('alert-active');
        } else {
            weatherEl.classList.remove('alert-active');
        }

        // Marcar en el widget si es de día o noche para estilos
        weatherEl.classList.toggle('is-daytime', isDay);
        weatherEl.classList.toggle('is-nighttime', !isDay);

        // Hourly forecast (next 5 hours)
        const now = new Date();
        const currentHourIndex = data.hourly.time.findIndex(t => new Date(t) > now);
        weatherEl.textContent = '';

        const summary = document.createElement('div');
        summary.className = 'weather-summary';

        const details = document.createElement('div');
        details.className = 'weather-details';

        // Ícono y datos de temp/ciudad/extra (sin sky-icon separado: el ícono de clima
        // ya muestra luna de noche con las variantes 01n/02n/etc. de OWM)
        const tempSpan = document.createElement('span');
        tempSpan.className = 'weather-temp';
        tempSpan.textContent = `${temp}°C`;
        details.appendChild(tempSpan);

        if (data.city_name) {
            const citySpan = document.createElement('span');
            citySpan.className = 'weather-city';
            citySpan.textContent = data.city_name;
            details.appendChild(citySpan);
        }

        const extraSpan = document.createElement('span');
        extraSpan.className = 'weather-extra';

        const humSpan = document.createElement('span');
        humSpan.className = 'weather-humidity';
        
        const humEmoji = document.createElement('span');
        humEmoji.className = 'weather-emoji';
        humEmoji.textContent = '💧';
        humSpan.appendChild(humEmoji);
        
        humSpan.appendChild(document.createTextNode(`${humidity}%`));
        extraSpan.appendChild(humSpan);

        const dividerSpan = document.createElement('span');
        dividerSpan.className = 'weather-divider';
        dividerSpan.textContent = ' • ';
        extraSpan.appendChild(dividerSpan);

        const windSpan = document.createElement('span');
        windSpan.className = 'weather-wind';
        
        const windEmoji = document.createElement('span');
        windEmoji.className = 'weather-emoji';
        windEmoji.textContent = '💨';
        windSpan.appendChild(windEmoji);
        
        windSpan.appendChild(document.createTextNode(`${Math.round(wind)}`));
        
        const windUnit = document.createElement('span');
        windUnit.className = 'weather-unit';
        windUnit.textContent = ' km/h';
        windSpan.appendChild(windUnit);
        
        extraSpan.appendChild(windSpan);

        details.appendChild(extraSpan);

        // Banner de alerta meteorológica (si hay condiciones extremas)
        if (alertData) {
            const alertBanner = document.createElement('div');
            alertBanner.className = 'weather-alert-banner';
            const alertIcon = document.createElement('span');
            alertIcon.className = 'alert-banner-icon';
            alertIcon.textContent = '⚠️';
            alertBanner.appendChild(alertIcon);
            const alertText = document.createElement('span');
            alertText.textContent = 'Alerta';
            alertBanner.appendChild(alertText);
            alertBanner.title = alertData.message;
            alertBanner.addEventListener('click', (ev) => {
                ev.stopPropagation();
                showWeatherAlertModal(alertData, data.city_name, data.latitude, data.longitude);
            });
            details.appendChild(alertBanner);
        }

        // El weather-icon ya muestra luna/nubes+luna de noche — no necesitamos sky-icon separado
        summary.appendChild(details);



        const iconImg = document.createElement('img');
        iconImg.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${icon}.svg`;
        iconImg.alt = description;
        iconImg.className = 'weather-icon';
        summary.appendChild(iconImg);

        const expanded = document.createElement('div');
        expanded.className = 'weather-expanded';

        // --- Panel Sol/Luna en modo expandido ---
        if (todaySunrise && todaySunset) {
            const sunMoonPanel = document.createElement('div');
            sunMoonPanel.className = 'sun-moon-panel';

            const nowMs = Date.now();
            let startMs, endMs, leftLabel, rightLabel, leftTimeMs, rightTimeMs, isNightArc;
            
            const sunrise0 = new Date(data.daily.sunrise[0]).getTime();
            const sunset0  = new Date(data.daily.sunset[0]).getTime();
            
            if (isDay) {
                // Es de día: El arco muestra el progreso del sol de Amanecer a Atardecer
                startMs = sunrise0;
                endMs = sunset0;
                leftLabel = 'Amanecer';
                rightLabel = 'Atardecer';
                leftTimeMs = sunrise0;
                rightTimeMs = sunset0;
                isNightArc = false;
            } else {
                // Es de noche: El arco muestra el progreso de la luna de Atardecer a Amanecer
                isNightArc = true;
                leftLabel = 'Atardecer';
                rightLabel = 'Amanecer';
                
                if (nowMs < sunrise0) {
                    // Madrugada (ej: 2 AM). La noche empezó ayer en el sunset.
                    startMs = sunset0 - (24 * 60 * 60 * 1000);
                    endMs = sunrise0;
                    leftTimeMs = startMs;
                    rightTimeMs = sunrise0;
                } else {
                    // Noche (ej: 10 PM). La noche empezó hoy en el sunset, termina mañana al sunrise.
                    const sunrise1 = new Date(data.daily.sunrise[1]).getTime();
                    startMs = sunset0;
                    endMs = sunrise1;
                    leftTimeMs = sunset0;
                    rightTimeMs = sunrise1;
                }
            }
            
            const arcProgress = Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100));
            const leftIcon = isNightArc ? '🌇' : '🌅';
            const rightIcon = isNightArc ? '🌅' : '🌇';

            sunMoonPanel.innerHTML = `
<div class="sun-moon-row">
  <div class="sun-info">
    <span class="sun-icon-sm" style="font-size: 24px;">${leftIcon}</span>
    <div><div class="sun-label">${leftLabel}</div><div class="sun-time">${formatTime(leftTimeMs)}</div></div>
  </div>
  <div class="day-arc-wrap">
    <div class="day-arc-track">
      <div class="day-arc-fill" style="width:${arcProgress}%"></div>
      <div class="day-arc-cursor" style="left:${arcProgress}%">
        <img src="https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${isDay ? 'clear-day' : moonPhase.icon}.svg" style="width:20px;height:20px; transform:translate(-50%, -50%);" />
      </div>
    </div>
    <div class="day-arc-labels">
      <img src="https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/clear-day.svg" style="width:16px;height:16px;" />
      <span>${isDay ? 'Día' : 'Noche'}</span>
      <img src="https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/clear-night.svg" style="width:16px;height:16px;" />
    </div>
  </div>
  <div class="sun-info">
    <span class="sun-icon-sm" style="font-size: 24px;">${rightIcon}</span>
    <div><div class="sun-label">${rightLabel}</div><div class="sun-time">${formatTime(rightTimeMs)}</div></div>
  </div>
</div>
<div class="moon-phase-row" style="display: flex; align-items: center; justify-content: center; width: 100%; margin-top: 10px;">
  <img src="https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${moonPhase.icon}.svg" style="width:36px;height:36px;margin-right:12px;" />
  <div class="moon-phase-info" style="text-align: left;">
    <div class="moon-phase-name">${moonPhase.name}</div>
    <div class="moon-phase-sub">${moonPhase.illumination}% iluminada · día ${moonPhase.age}</div>
  </div>
</div>`;
            expanded.appendChild(sunMoonPanel);
        }

        const hourlyDiv = document.createElement('div');
        hourlyDiv.className = 'forecast-hourly';
        
        // Render hourly
        for (let i = 0; i < 5; i++) {
            const hourIndex = currentHourIndex + i;
            const hourTime = new Date(data.hourly.time[hourIndex]);
            const hourTemp = Math.round(data.hourly.temperature_2m[hourIndex]);
            const { icon: hourIcon } = getInterpretation(data.hourly.weather_code[hourIndex], isDay);

            const hDiv = document.createElement('div');
            const hTime = document.createElement('div');
            hTime.className = 'forecast-time';
            hTime.textContent = `${String(hourTime.getHours()).padStart(2, '0')}:00`;
            hDiv.appendChild(hTime);

            const hImg = document.createElement('img');
            hImg.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${hourIcon}.svg`;
            hImg.alt = '';
            hDiv.appendChild(hImg);

            const hTemp = document.createElement('div');
            hTemp.className = 'forecast-temp';
            hTemp.textContent = `${hourTemp}°`;
            hDiv.appendChild(hTemp);

            hourlyDiv.appendChild(hDiv);
        }

        const dailyDiv = document.createElement('div');
        dailyDiv.className = 'forecast-daily';

        // Render daily
        for (let i = 1; i < 6; i++) {
            const dayDate = new Date(data.daily.time[i]);
            const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(dayDate);
            const { icon: dayIcon } = getInterpretation(data.daily.weather_code[i]); // daily siempre usa día
            const tempMax = Math.round(data.daily.temperature_2m_max[i]);
            const tempMin = Math.round(data.daily.temperature_2m_min[i]);

            const dDiv = document.createElement('div');
            const dName = document.createElement('div');
            dName.className = 'forecast-day';
            dName.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            dDiv.appendChild(dName);

            const dImg = document.createElement('img');
            dImg.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${dayIcon}.svg`;
            dImg.alt = '';
            dDiv.appendChild(dImg);

            const dTemp = document.createElement('div');
            dTemp.className = 'forecast-temp-range';
            dTemp.textContent = `${tempMax}°/${tempMin}°`;
            dDiv.appendChild(dTemp);

            dailyDiv.appendChild(dDiv);
        }

        expanded.appendChild(hourlyDiv);
        expanded.appendChild(dailyDiv);

        weatherEl.appendChild(summary);
        weatherEl.appendChild(expanded);

        requestAnimationFrame(() => {
            weatherEl.classList.add('loaded');
        });
}

function getInterpretation(code, isDay = true) {
    const interpretations = {
        0: { description: 'Despejado', icon: isDay ? 'clear-day' : 'clear-night' },
        1: { description: 'Principalmente despejado', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night' },
        2: { description: 'Parcialmente nublado', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night' },
        3: { description: 'Nublado', icon: isDay ? 'overcast-day' : 'overcast-night' },
        45: { description: 'Niebla', icon: isDay ? 'fog-day' : 'fog-night' },
        48: { description: 'Niebla densa', icon: isDay ? 'fog-day' : 'fog-night' },
        51: { description: 'Llovizna ligera', icon: 'drizzle' },
        53: { description: 'Llovizna', icon: 'drizzle' },
        55: { description: 'Llovizna densa', icon: 'drizzle' },
        56: { description: 'Llovizna helada', icon: 'sleet' },
        57: { description: 'Llovizna helada densa', icon: 'sleet' },
        61: { description: 'Lluvia ligera', icon: 'rain' },
        63: { description: 'Lluvia', icon: 'rain' },
        65: { description: 'Lluvia intensa', icon: 'extreme-rain' },
        66: { description: 'Lluvia helada', icon: 'sleet' },
        67: { description: 'Lluvia helada intensa', icon: 'sleet' },
        71: { description: 'Nieve ligera', icon: 'snow' },
        73: { description: 'Nieve', icon: 'snow' },
        75: { description: 'Nieve intensa', icon: 'extreme-snow' },
        77: { description: 'Granos de nieve', icon: 'hail' },
        80: { description: 'Chubascos ligeros', icon: 'drizzle' },
        81: { description: 'Chubascos', icon: 'rain' },
        82: { description: 'Chubascos violentos', icon: 'extreme-rain' },
        85: { description: 'Chubascos de nieve', icon: 'snow' },
        86: { description: 'Chubascos de nieve intensos', icon: 'extreme-snow' },
        95: { description: 'Tormenta', icon: 'thunderstorms' },
        96: { description: 'Tormenta con granizo', icon: 'thunderstorms-rain' },
        99: { description: 'Tormenta con granizo intenso', icon: 'thunderstorms-extreme-rain' }
    };
    return interpretations[code] || { description: 'Clima desconocido', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night' };
}

function showWeatherAlertModal(alertData, cityName = '', lat = null, lon = null) {
    // Si ya existe un modal de alerta, lo eliminamos
    const existing = document.querySelector('.weather-alert-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'weather-alert-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'weather-alert-modal';

    // Construir enlace de clima según la ciudad o coordenadas
    let weatherLink = 'https://www.google.com/search?q=clima';
    if (cityName) {
        weatherLink = `https://www.google.com/search?q=clima+${encodeURIComponent(cityName)}`;
    } else if (lat && lon) {
        weatherLink = `https://www.windy.com/?${lat},${lon},11`;
    }

    modal.textContent = '';
    
    // Header
    const header = document.createElement('header');
    header.className = 'alert-modal-header';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'alert-modal-icon';
    iconSpan.textContent = '⚠️';
    header.appendChild(iconSpan);
    
    const titleH4 = document.createElement('h4');
    titleH4.textContent = 'Alerta Meteorológica Oficial';
    header.appendChild(titleH4);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    
    modal.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'alert-modal-body';
    
    const alertMsg = document.createElement('p');
    alertMsg.className = 'alert-msg';
    alertMsg.textContent = alertData.message;
    body.appendChild(alertMsg);
    
    // Recommendations
    const recsDiv = document.createElement('div');
    recsDiv.className = 'alert-recommendations';
    
    const recsH5 = document.createElement('h5');
    recsH5.textContent = 'Recomendaciones de Seguridad:';
    recsDiv.appendChild(recsH5);
    
    const recsUl = document.createElement('ul');
    const items = [
        'Permanezca en interiores, en una zona segura de su hogar.',
        'Asegure objetos sueltos que puedan ser arrastrados por el viento.',
        'Desconecte electrodomésticos para protegerlos de variaciones eléctricas.',
        'Evite circular por la vía pública o estacionar bajo árboles/cables.'
    ];
    items.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        recsUl.appendChild(li);
    });
    recsDiv.appendChild(recsUl);
    body.appendChild(recsDiv);
    
    // More info
    const moreInfoDiv = document.createElement('div');
    moreInfoDiv.className = 'alert-more-info';
    
    const moreInfoText = document.createElement('p');
    moreInfoText.className = 'alert-more-info-text';
    moreInfoText.textContent = 'Verifica este enlace del clima para tener más información. ¡Espero que estés bien! 😉';
    moreInfoDiv.appendChild(moreInfoText);
    
    const linkBtn = document.createElement('a');
    linkBtn.href = weatherLink;
    linkBtn.target = '_blank';
    linkBtn.rel = 'noopener noreferrer';
    linkBtn.className = 'alert-link-btn';
    
    const linkText = document.createElement('span');
    linkText.textContent = `🌍 Ver clima de ${cityName || 'mi ubicación'}`;
    linkBtn.appendChild(linkText);
    
    moreInfoDiv.appendChild(linkBtn);
    body.appendChild(moreInfoDiv);
    
    modal.appendChild(body);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}
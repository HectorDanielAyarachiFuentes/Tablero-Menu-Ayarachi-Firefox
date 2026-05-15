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
        $('#weather').addEventListener('click', this.handleWidgetClick);

        // Carga inicial
        this.fetchAndRender();
    },
    async fetchAndRender() {
        const weatherEl = $('#weather');
        const customCity = (await storageGet(['weatherCity'])).weatherCity;
        
        const cachedWeather = await storageGet(['weather']);
        // Use cache if it exists, is less than 30 mins old, and matches the city setting
        if (cachedWeather.weather && (Date.now() - cachedWeather.weather.timestamp < 1800000) && cachedWeather.weather.city === (customCity || 'auto')) {
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
        if (e.target.closest('.weather-summary')) {
            $('#weather').classList.toggle('open');
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
    const weatherUrl = `${API_URLS.WEATHER}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=6`;
    return apiFetch(weatherUrl);
}

function render(data) {
    if (!data || !data.current || !data.hourly || !data.daily) return;

        // Current weather
        const temp = Math.round(data.current.temperature_2m);
        const humidity = data.current.relative_humidity_2m;
        const wind = data.current.wind_speed_10m.toFixed(1);
        const { description, icon } = getInterpretation(data.current.weather_code);
        const cityName = data.city_name ? `<span>${data.city_name}</span>` : '';
        const weatherEl = $('#weather');

        // Hourly forecast (next 5 hours)
        const now = new Date();
        const currentHourIndex = data.hourly.time.findIndex(t => new Date(t) > now);
        weatherEl.textContent = '';

        const summary = document.createElement('div');
        summary.className = 'weather-summary';

        const details = document.createElement('div');
        details.className = 'weather-details';

        const tempSpan = document.createElement('span');
        tempSpan.className = 'weather-temp';
        tempSpan.textContent = `${temp}°C`;
        details.appendChild(tempSpan);

        if (data.city_name) {
            const citySpan = document.createElement('span');
            citySpan.textContent = data.city_name;
            details.appendChild(citySpan);
        }

        const extraSpan = document.createElement('span');
        extraSpan.className = 'weather-extra';
        extraSpan.textContent = `H: ${humidity}% • V: ${wind} km/h`;
        details.appendChild(extraSpan);

        summary.appendChild(details);

        const iconImg = document.createElement('img');
        iconImg.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        iconImg.alt = description;
        iconImg.className = 'weather-icon';
        summary.appendChild(iconImg);

        const expanded = document.createElement('div');
        expanded.className = 'weather-expanded';

        const hourlyDiv = document.createElement('div');
        hourlyDiv.className = 'forecast-hourly';
        
        // Render hourly
        for (let i = 0; i < 5; i++) {
            const hourIndex = currentHourIndex + i;
            const hourTime = new Date(data.hourly.time[hourIndex]);
            const hourTemp = Math.round(data.hourly.temperature_2m[hourIndex]);
            const { icon: hourIcon } = getInterpretation(data.hourly.weather_code[hourIndex]);

            const hDiv = document.createElement('div');
            const hTime = document.createElement('div');
            hTime.className = 'forecast-time';
            hTime.textContent = `${String(hourTime.getHours()).padStart(2, '0')}:00`;
            hDiv.appendChild(hTime);

            const hImg = document.createElement('img');
            hImg.src = `https://openweathermap.org/img/wn/${hourIcon}.png`;
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
            const { icon: dayIcon } = getInterpretation(data.daily.weather_code[i]);
            const tempMax = Math.round(data.daily.temperature_2m_max[i]);
            const tempMin = Math.round(data.daily.temperature_2m_min[i]);

            const dDiv = document.createElement('div');
            const dName = document.createElement('div');
            dName.className = 'forecast-day';
            dName.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            dDiv.appendChild(dName);

            const dImg = document.createElement('img');
            dImg.src = `https://openweathermap.org/img/wn/${dayIcon}.png`;
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
}

function getInterpretation(code) {
    const interpretations = {
        0: { description: 'Despejado', icon: '01d' },
        1: { description: 'Principalmente despejado', icon: '02d' },
        2: { description: 'Parcialmente nublado', icon: '03d' },
        3: { description: 'Nublado', icon: '04d' },
        45: { description: 'Niebla', icon: '50d' },
        48: { description: 'Niebla densa', icon: '50d' },
        51: { description: 'Llovizna ligera', icon: '09d' },
        53: { description: 'Llovizna', icon: '09d' },
        55: { description: 'Llovizna densa', icon: '09d' },
        56: { description: 'Llovizna helada', icon: '09d' },
        57: { description: 'Llovizna helada densa', icon: '09d' },
        61: { description: 'Lluvia ligera', icon: '10d' },
        63: { description: 'Lluvia', icon: '10d' },
        65: { description: 'Lluvia intensa', icon: '10d' },
        66: { description: 'Lluvia helada', icon: '13d' },
        67: { description: 'Lluvia helada intensa', icon: '13d' },
        71: { description: 'Nieve ligera', icon: '13d' },
        73: { description: 'Nieve', icon: '13d' },
        75: { description: 'Nieve intensa', icon: '13d' },
        77: { description: 'Granos de nieve', icon: '13d' },
        80: { description: 'Chubascos ligeros', icon: '09d' },
        81: { description: 'Chubascos', icon: '09d' },
        82: { description: 'Chubascos violentos', icon: '09d' },
        85: { description: 'Chubascos de nieve', icon: '13d' },
        86: { description: 'Chubascos de nieve intensos', icon: '13d' },
        95: { description: 'Tormenta', icon: '11d' },
        96: { description: 'Tormenta con granizo', icon: '11d' },
        99: { description: 'Tormenta con granizo intenso', icon: '11d' }
    };
    return interpretations[code] || { description: 'Clima desconocido', icon: '50d' };
}
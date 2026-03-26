// ============================================================
// STATE
// ============================================================

const state = {
  unit: 'metric',
  currentLocation: null,
  savedLocations: [],
  weather: null,
  forecast: null,
  airPollution: null,
};

// ============================================================
// HELPERS
// ============================================================

function convertTemp(celsius, unit) {
  return unit === 'imperial' ? celsius * 9 / 5 + 32 : celsius;
}

function tempLabel(celsius, unit) {
  const val = Math.round(convertTemp(celsius, unit));
  return `${val}${unit === 'imperial' ? '°F' : '°C'}`;
}

function mpsToDisplay(mps, unit) {
  if (unit === 'imperial') return `${Math.round(mps * 2.237)} mph`;
  return `${Math.round(mps * 3.6)} km/h`;
}

function degToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatTime(unixSeconds, tzOffset) {
  const d = new Date((unixSeconds + tzOffset) * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDay(unixSeconds, tzOffset) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date((unixSeconds + tzOffset) * 1000);
  return days[d.getUTCDay()];
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ============================================================
// STARTUP
// ============================================================

function init() {
  state.unit = localStorage.getItem('owm_unit') || 'metric';
  try {
    state.savedLocations = JSON.parse(localStorage.getItem('owm_saved') || '[]');
  } catch {
    state.savedLocations = [];
  }

  updateUnitToggle();
  renderSavedBar();

  if (state.savedLocations.length > 0) {
    const loc = state.savedLocations[0];
    loadLocation(loc.lat, loc.lon, loc.name, loc.country);
  } else {
    showState('empty');
  }

  bindEvents();
}

// ============================================================
// EVENT BINDING
// ============================================================

function bindEvents() {
  const searchInput = document.getElementById('search-input');

  const handleSearch = debounce(async (query) => {
    if (query.length < 2) { hideDropdown(); return; }
    try {
      const results = await searchCities(query);
      renderDropdown(results);
    } catch {
      hideDropdown();
    }
  }, 300);

  searchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideDropdown(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) hideDropdown();
  });

  document.getElementById('unit-toggle').addEventListener('click', () => {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('owm_unit', state.unit);
    updateUnitToggle();
    if (state.weather) reRenderUnits();
  });

  document.getElementById('locate-btn').addEventListener('click', handleGeolocate);
  document.getElementById('save-location-btn').addEventListener('click', saveCurrentLocation);

  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (state.forecast) renderForecastChart(state.forecast, btn.dataset.chart, state.unit);
    });
  });
}

// ============================================================
// SEARCH DROPDOWN
// ============================================================

function renderDropdown(results) {
  const list = document.getElementById('search-results');
  list.innerHTML = '';

  if (!results || results.length === 0) { hideDropdown(); return; }

  results.forEach(r => {
    const li = document.createElement('li');
    const label = r.state ? `${r.name}, ${r.state}, ${r.country}` : `${r.name}, ${r.country}`;
    li.textContent = label;
    li.addEventListener('click', () => {
      document.getElementById('search-input').value = '';
      hideDropdown();
      loadLocation(r.lat, r.lon, r.name, r.country);
    });
    list.appendChild(li);
  });

  list.classList.remove('hidden');
}

function hideDropdown() {
  document.getElementById('search-results').classList.add('hidden');
}

// ============================================================
// LOAD LOCATION
// ============================================================

async function loadLocation(lat, lon, name, country) {
  state.currentLocation = { lat, lon, name, country };
  showState('loading');

  try {
    const [weather, forecast, airPollution] = await getAllWeatherData(lat, lon);
    state.weather = weather;
    state.forecast = forecast;
    state.airPollution = airPollution;

    renderAll();
    showState('main');
    updateSaveButton();
  } catch (err) {
    showError(err);
    showState('error');
  }
}

function renderAll() {
  renderHero(state.weather);
  renderCards(state.weather, state.forecast);
  renderSuggestion(state.weather, state.forecast);
  renderCompass(state.weather.wind.deg || 0, state.weather.wind.speed);
  renderSunArc(state.weather.sys.sunrise, state.weather.sys.sunset, state.weather.dt, state.weather.timezone);
  renderAirQuality(state.airPollution);
  renderHourlyTimeline(state.forecast);
  renderForecastChart(state.forecast, getCurrentChartType(), state.unit);
  renderForecastStrip(state.forecast, state.weather.timezone);
  renderBackground(state.weather.weather[0].main);
}

function reRenderUnits() {
  renderHero(state.weather);
  renderCards(state.weather, state.forecast);
  renderCompass(state.weather.wind.deg || 0, state.weather.wind.speed);
  renderHourlyTimeline(state.forecast);
  renderForecastChart(state.forecast, getCurrentChartType(), state.unit);
  renderForecastStrip(state.forecast, state.weather.timezone);
}

// ============================================================
// UI STATE MANAGEMENT
// ============================================================

function showState(which) {
  document.getElementById('main-content').classList.toggle('hidden', which !== 'main');
  document.getElementById('empty-state').classList.toggle('hidden', which !== 'empty');
  document.getElementById('loading-state').classList.toggle('hidden', which !== 'loading');
  document.getElementById('error-state').classList.toggle('hidden', which !== 'error');
}

function showError(err) {
  let msg = 'Something went wrong. Please try again.';
  if (!err.status && err.message && err.message.toLowerCase().includes('fetch')) {
    msg = 'Unable to reach weather service. Check your connection.';
  } else if (err.status === 401) {
    msg = 'Invalid API key. Please check config.js.';
  } else if (err.status === 404) {
    msg = 'Location not found.';
  } else if (err.status === 429) {
    msg = 'Too many requests. Please wait a moment.';
  }
  document.getElementById('error-message').textContent = msg;
}

function updateUnitToggle() {
  document.getElementById('unit-toggle').textContent = state.unit === 'metric' ? '°F' : '°C';
}

// ============================================================
// GEOLOCATION
// ============================================================

function handleGeolocate() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const results = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (results && results.length > 0) {
          const r = results[0];
          loadLocation(r.lat, r.lon, r.name, r.country);
        } else {
          showToast('Could not identify your location.');
        }
      } catch {
        showToast('Unable to determine your location.');
      }
    },
    () => showToast('Location access denied.')
  );
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============================================================
// SAVED LOCATIONS
// ============================================================

function saveCurrentLocation() {
  if (!state.currentLocation) return;
  const { lat, lon, name, country } = state.currentLocation;
  const alreadySaved = state.savedLocations.some(l =>
    parseFloat(l.lat).toFixed(2) === parseFloat(lat).toFixed(2) &&
    parseFloat(l.lon).toFixed(2) === parseFloat(lon).toFixed(2)
  );
  if (alreadySaved) return;
  if (state.savedLocations.length >= CONFIG.MAX_SAVED) {
    showToast('Maximum 5 saved locations. Remove one first.');
    return;
  }
  state.savedLocations.push({ lat, lon, name, country });
  localStorage.setItem('owm_saved', JSON.stringify(state.savedLocations));
  renderSavedBar();
  updateSaveButton();
}

function removeLocation(index) {
  state.savedLocations.splice(index, 1);
  localStorage.setItem('owm_saved', JSON.stringify(state.savedLocations));
  renderSavedBar();
  updateSaveButton();
}

function updateSaveButton() {
  const btn = document.getElementById('save-location-btn');
  if (!state.currentLocation) return;
  const saved = state.savedLocations.some(l =>
    parseFloat(l.lat).toFixed(2) === parseFloat(state.currentLocation.lat).toFixed(2) &&
    parseFloat(l.lon).toFixed(2) === parseFloat(state.currentLocation.lon).toFixed(2)
  );
  btn.innerHTML = saved ? '&#9733; Saved' : '&#9733; Save';
  btn.disabled = saved;
}

function renderSavedBar() {
  const bar = document.getElementById('saved-bar');
  bar.innerHTML = '';
  state.savedLocations.forEach((loc, i) => {
    const chip = document.createElement('div');
    chip.className = 'saved-chip';

    const label = document.createElement('span');
    label.textContent = `${loc.name}, ${loc.country}`;
    label.addEventListener('click', () => loadLocation(loc.lat, loc.lon, loc.name, loc.country));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.title = 'Remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeLocation(i); });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    bar.appendChild(chip);
  });
}

// ============================================================
// RENDER: HERO
// ============================================================

function renderHero(weather) {
  document.getElementById('location-name').textContent = `${weather.name}, ${weather.sys.country}`;
  document.getElementById('weather-desc').textContent = capitalise(weather.weather[0].description);
  document.getElementById('current-temp').textContent = tempLabel(weather.main.temp, state.unit);
  document.getElementById('feels-like').textContent = `Feels like ${tempLabel(weather.main.feels_like, state.unit)}`;
  document.getElementById('high-low').textContent =
    `H: ${tempLabel(weather.main.temp_max, state.unit)}  ·  L: ${tempLabel(weather.main.temp_min, state.unit)}`;

  const icon = document.getElementById('weather-icon');
  icon.src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
  icon.alt = weather.weather[0].description;

  document.getElementById('last-updated').textContent = `Updated ${formatTime(weather.dt, weather.timezone)}`;
}

// ============================================================
// RENDER: DETAIL CARDS
// ============================================================

function renderCards(weather, forecast) {
  document.getElementById('val-humidity').textContent = `${weather.main.humidity}%`;

  const windSpeed = mpsToDisplay(weather.wind.speed, state.unit);
  const windDir = degToCompass(weather.wind.deg || 0);
  document.getElementById('val-wind').textContent = `${windSpeed} ${windDir}`;
  document.getElementById('val-gust').textContent = weather.wind.gust
    ? `Gusts: ${mpsToDisplay(weather.wind.gust, state.unit)}`
    : '';

  document.getElementById('val-pressure').textContent = `${weather.main.pressure} hPa`;
  document.getElementById('val-pressure-trend').textContent = getPressureTrend(forecast);

  const visKm = Math.min((weather.visibility || 10000) / 1000, 10);
  document.getElementById('val-visibility').textContent = state.unit === 'imperial'
    ? `${(visKm * 0.621).toFixed(1)} mi`
    : `${visKm.toFixed(1)} km`;

  document.getElementById('val-clouds').textContent = `${weather.clouds.all}%`;
}

function getPressureTrend(forecast) {
  if (!forecast || forecast.list.length < 3) return '→ Stable';
  const p0 = forecast.list[0].main.pressure;
  const p2 = forecast.list[2].main.pressure;
  const diff = p2 - p0;
  if (diff > 1) return '↑ Rising';
  if (diff < -1) return '↓ Falling';
  return '→ Stable';
}

// ============================================================
// RENDER: SUGGESTION
// ============================================================

function renderSuggestion(weather, forecast) {
  const main = weather.weather[0].main.toLowerCase();
  const temp = weather.main.temp;
  const wind = weather.wind.speed;
  const clouds = weather.clouds.all;

  let emoji = '🌡️', text = 'Mild conditions — enjoy your day!';

  if (main.includes('rain') || main.includes('drizzle')) {
    emoji = '☔'; text = "Don't forget your umbrella!";
  } else if (main.includes('snow')) {
    emoji = '🧥'; text = "Bundle up — it's snowing!";
  } else if (main.includes('thunderstorm')) {
    emoji = '⚡'; text = 'Stay indoors if possible.';
  } else if (temp >= 35) {
    emoji = '🕶️'; text = 'Heat advisory — stay hydrated and wear sunscreen.';
  } else if (temp >= 28) {
    emoji = '☀️'; text = 'Warm day! Apply sunscreen before heading out.';
  } else if (temp <= 0) {
    emoji = '🧤'; text = 'Freezing! Wear gloves and a heavy coat.';
  } else if (temp <= 10) {
    emoji = '🧣'; text = 'Chilly — grab a jacket.';
  } else if (wind >= 10) {
    emoji = '🌬️'; text = 'Very windy today — secure loose items.';
  } else if (clouds <= 20) {
    emoji = '🌤️'; text = 'Clear skies — great day to be outside!';
  }

  document.getElementById('suggestion-icon').textContent = emoji;
  document.getElementById('suggestion-text').textContent = text;

  // Best hour to go outside (next 12 hours)
  const now = Date.now() / 1000;
  const next12 = forecast.list.filter(e => e.dt > now && e.dt <= now + 12 * 3600);
  let bestScore = -1, bestEntry = null;

  next12.forEach(e => {
    let score = 0;
    const m = e.weather[0].main.toLowerCase();
    if (!m.includes('rain') && !m.includes('snow') && !m.includes('thunder')) score += 2;
    const t = e.main.temp;
    if (t >= 18 && t <= 26) score += 1;
    if (e.clouds.all < 50) score += 1;
    if (e.wind.speed < 5) score += 1;
    if (score > bestScore) { bestScore = score; bestEntry = e; }
  });

  const bestHourEl = document.getElementById('best-hour');
  if (bestEntry) {
    const time = formatTime(bestEntry.dt, weather.timezone);
    const cond = capitalise(bestEntry.weather[0].description);
    bestHourEl.textContent = `Best time today: ${time} (${cond})`;
  } else {
    bestHourEl.textContent = '';
  }
}

// ============================================================
// RENDER: WIND COMPASS
// ============================================================

function renderCompass(windDeg, windSpeed) {
  const svg = document.getElementById('compass-svg');
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';

  const mk = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  // Background circle
  svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 90, stroke: '#334155', 'stroke-width': 2, fill: 'rgba(30,41,59,0.8)' }));
  svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 68, stroke: '#1e3a52', 'stroke-width': 1, fill: 'none', 'stroke-dasharray': '4 4' }));

  // Tick marks at 8 points
  for (let i = 0; i < 8; i++) {
    const rad = (i * 45 - 90) * Math.PI / 180;
    const x1 = 100 + 78 * Math.cos(rad);
    const y1 = 100 + 78 * Math.sin(rad);
    const x2 = 100 + 90 * Math.cos(rad);
    const y2 = 100 + 90 * Math.sin(rad);
    svg.appendChild(mk('line', { x1, y1, x2, y2, stroke: '#475569', 'stroke-width': 2 }));
  }

  // Cardinal labels
  [{ l: 'N', x: 100, y: 14 }, { l: 'E', x: 186, y: 104 }, { l: 'S', x: 100, y: 193 }, { l: 'W', x: 14, y: 104 }]
    .forEach(({ l, x, y }) => {
      const t = mk('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#94a3b8', 'font-size': 13, 'font-weight': 'bold' });
      t.textContent = l;
      svg.appendChild(t);
    });

  // Arrow group (rotated to wind direction)
  const g = mk('g', { transform: `rotate(${windDeg}, 100, 100)` });

  // Arrow pointing up (toward N) = wind blowing FROM that direction
  g.appendChild(mk('polygon', { points: '100,28 93,62 100,54 107,62', fill: '#38bdf8' }));
  g.appendChild(mk('line', { x1: 100, y1: 54, x2: 100, y2: 146, stroke: '#64748b', 'stroke-width': 2 }));
  g.appendChild(mk('polygon', { points: '100,172 93,138 100,146 107,138', fill: '#475569' }));

  svg.appendChild(g);

  // Center dot on top
  svg.appendChild(mk('circle', { cx: 100, cy: 100, r: 5, fill: '#38bdf8' }));

  const dir = degToCompass(windDeg);
  const speed = mpsToDisplay(windSpeed, state.unit);
  document.getElementById('compass-label').textContent = `${dir} at ${speed}`;
}

// ============================================================
// RENDER: SUNRISE / SUNSET ARC
// ============================================================

function renderSunArc(sunrise, sunset, currentTime, timezone) {
  const svg = document.getElementById('sun-arc-svg');
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';

  const mk = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  const cx = 150, cy = 140, rx = 120, ry = 90;
  const startX = cx - rx, endX = cx + rx;

  // Dashed arc path
  svg.appendChild(mk('path', {
    d: `M ${startX} ${cy} A ${rx} ${ry} 0 0 1 ${endX} ${cy}`,
    stroke: '#334155', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '6 4',
  }));

  // Gradient arc overlay (dawn to dusk colors)
  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'arcGrad');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
  [['0%', '#f97316'], ['50%', '#fbbf24'], ['100%', '#f97316']].forEach(([offset, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    stop.setAttribute('stop-opacity', '0.3');
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  svg.appendChild(mk('path', {
    d: `M ${startX} ${cy} A ${rx} ${ry} 0 0 1 ${endX} ${cy}`,
    stroke: 'url(#arcGrad)', 'stroke-width': 3, fill: 'none',
  }));

  // Horizon line
  svg.appendChild(mk('line', { x1: startX - 10, y1: cy, x2: endX + 10, y2: cy, stroke: '#475569', 'stroke-width': 1 }));

  // Sun position
  const totalDay = sunset - sunrise;
  let progress = (currentTime - sunrise) / totalDay;
  const beforeSunrise = currentTime < sunrise;
  const afterSunset = currentTime > sunset;
  progress = Math.max(0, Math.min(1, progress));

  const angle = Math.PI - progress * Math.PI;
  const sunX = cx + rx * Math.cos(angle);
  const sunY = cy - ry * Math.sin(angle);
  const opacity = (beforeSunrise || afterSunset) ? '0.3' : '1';
  const sunColor = (beforeSunrise || afterSunset) ? '#64748b' : '#fbbf24';

  svg.appendChild(mk('circle', { cx: sunX, cy: sunY, r: 14, fill: 'rgba(251,191,36,0.15)', opacity }));
  svg.appendChild(mk('circle', { cx: sunX, cy: sunY, r: 8, fill: sunColor, opacity }));

  // Labels
  const riseLabel = document.createElementNS(NS, 'text');
  riseLabel.setAttribute('x', startX); riseLabel.setAttribute('y', cy + 20);
  riseLabel.setAttribute('text-anchor', 'middle'); riseLabel.setAttribute('fill', '#94a3b8'); riseLabel.setAttribute('font-size', '11');
  riseLabel.textContent = 'Rise';
  svg.appendChild(riseLabel);

  const setLabel = document.createElementNS(NS, 'text');
  setLabel.setAttribute('x', endX); setLabel.setAttribute('y', cy + 20);
  setLabel.setAttribute('text-anchor', 'middle'); setLabel.setAttribute('fill', '#94a3b8'); setLabel.setAttribute('font-size', '11');
  setLabel.textContent = 'Set';
  svg.appendChild(setLabel);

  document.getElementById('sunrise-time').textContent = formatTime(sunrise, timezone);
  document.getElementById('sunset-time').textContent = formatTime(sunset, timezone);
}

// ============================================================
// RENDER: AIR QUALITY
// ============================================================

function renderAirQuality(airPollution) {
  const aqi = airPollution.list[0].main.aqi;
  const comp = airPollution.list[0].components;

  const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  const colors = ['', '#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444'];

  const scoreEl = document.getElementById('aqi-score');
  scoreEl.textContent = aqi;
  scoreEl.style.color = colors[aqi];

  const labelEl = document.getElementById('aqi-label');
  labelEl.textContent = labels[aqi];
  labelEl.style.color = colors[aqi];

  const fill = document.getElementById('aqi-fill');
  fill.style.width = `${(aqi / 5) * 100}%`;
  fill.style.background = colors[aqi];

  const pollutants = [
    { label: 'CO', value: comp.co },
    { label: 'NO₂', value: comp.no2 },
    { label: 'O₃', value: comp.o3 },
    { label: 'SO₂', value: comp.so2 },
    { label: 'PM2.5', value: comp.pm2_5 },
    { label: 'PM10', value: comp.pm10 },
  ];

  const grid = document.getElementById('pollutants-grid');
  grid.innerHTML = '';
  pollutants.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pollutant-card';
    card.innerHTML = `
      <div class="pollutant-label">${p.label}</div>
      <div class="pollutant-value">${p.value.toFixed(1)}</div>
      <div class="pollutant-unit">µg/m³</div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// RENDER: HOURLY TIMELINE
// ============================================================

function renderHourlyTimeline(forecast) {
  const container = document.getElementById('hourly-timeline');
  container.innerHTML = '';

  const now = Date.now() / 1000;
  const entries = forecast.list.slice(0, 12);
  const tz = forecast.city.timezone;

  let closestIdx = 0, minDiff = Infinity;
  entries.forEach((e, i) => {
    const diff = Math.abs(e.dt - now);
    if (diff < minDiff) { minDiff = diff; closestIdx = i; }
  });

  entries.forEach((e, i) => {
    const card = document.createElement('div');
    card.className = 'hourly-card' + (i === closestIdx ? ' hourly-current' : '');

    const time = formatTime(e.dt, tz);
    const temp = tempLabel(e.main.temp, state.unit);
    const icon = e.weather[0].icon;
    const desc = e.weather[0].description;

    card.innerHTML = `
      <div class="hourly-time">${time}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" class="hourly-icon" />
      <div class="hourly-temp">${temp}</div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// RENDER: 5-DAY FORECAST STRIP
// ============================================================

function renderForecastStrip(forecast, timezone) {
  const strip = document.getElementById('forecast-strip');
  strip.innerHTML = '';

  // Group by local calendar date
  const byDay = {};
  forecast.list.forEach(e => {
    const d = new Date((e.dt + timezone) * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e);
  });

  Object.values(byDay).slice(0, 5).forEach(entries => {
    const temps = entries.map(e => e.main.temp);
    const high = Math.max(...temps);
    const low = Math.min(...temps);
    const maxPop = Math.max(...entries.map(e => e.pop || 0));

    const noonEntry = entries.find(e => {
      const h = new Date((e.dt + timezone) * 1000).getUTCHours();
      return h >= 11 && h <= 13;
    }) || entries[Math.floor(entries.length / 2)];

    const dayName = formatDay(entries[0].dt, timezone);
    const icon = noonEntry.weather[0].icon;
    const desc = noonEntry.weather[0].description;

    const card = document.createElement('div');
    card.className = 'forecast-day';
    card.innerHTML = `
      <div class="forecast-day-name">${dayName}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" class="forecast-icon" />
      <div class="forecast-temps">
        <span class="forecast-high">${tempLabel(high, state.unit)}</span>
        <span class="forecast-low">${tempLabel(low, state.unit)}</span>
      </div>
      <div class="forecast-pop">${Math.round(maxPop * 100)}% 💧</div>
    `;
    strip.appendChild(card);
  });
}

// ============================================================
// RENDER: ANIMATED BACKGROUND
// ============================================================

let lightningTimer = null;

function renderBackground(weatherMain) {
  const bg = document.getElementById('bg-animation');
  // Particles go in the overlay so they fall OVER the cards
  const overlay = document.getElementById('weather-overlay');

  // Clear previous
  if (lightningTimer) { clearTimeout(lightningTimer); lightningTimer = null; }
  bg.innerHTML = '';
  overlay.innerHTML = '';
  ['bg-clear','bg-cloudy','bg-rain','bg-storm','bg-snow','bg-fog','bg-default']
    .forEach(c => bg.classList.remove(c));

  const main = weatherMain.toLowerCase();

  if (main === 'clear') {
    bg.classList.add('bg-clear');
    injectSunRays(bg);
  } else if (main === 'clouds') {
    bg.classList.add('bg-cloudy');
    injectClouds(bg);
  } else if (main === 'rain' || main === 'drizzle') {
    bg.classList.add('bg-rain');
    injectRain(overlay, 80, false);
    injectRainSplashes(bg);
  } else if (main === 'thunderstorm') {
    bg.classList.add('bg-storm');
    injectRain(overlay, 120, true);
    scheduleLightning(bg, overlay);
  } else if (main === 'snow') {
    bg.classList.add('bg-snow');
    injectSnow(overlay);
  } else if (['mist','fog','haze','smoke','dust','sand','ash','squall','tornado'].includes(main)) {
    bg.classList.add('bg-fog');
  } else {
    bg.classList.add('bg-default');
  }
}

function injectSunRays(bg) {
  // Radial sun glow in top-right
  const sun = document.createElement('div');
  sun.className = 'sun-glow';
  bg.appendChild(sun);
  // Rotating ray burst
  const rays = document.createElement('div');
  rays.className = 'sun-rays';
  bg.appendChild(rays);
}

function injectRain(container, count, heavy) {
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('span');
    drop.className = heavy ? 'rain-drop rain-heavy' : 'rain-drop';
    drop.style.left = `${Math.random() * 105}%`;
    const dur = heavy ? (0.25 + Math.random() * 0.25) : (0.55 + Math.random() * 0.55);
    drop.style.animationDuration = `${dur}s`;
    drop.style.animationDelay = `${-(Math.random() * 2)}s`;
    drop.style.opacity = heavy ? (0.6 + Math.random() * 0.3) : (0.35 + Math.random() * 0.3);
    drop.style.height = heavy ? `${18 + Math.random() * 14}px` : `${12 + Math.random() * 12}px`;
    container.appendChild(drop);
  }
}

function injectRainSplashes(bg) {
  // Subtle dark overlay at the bottom to suggest wet ground
  const puddle = document.createElement('div');
  puddle.className = 'rain-ground';
  bg.appendChild(puddle);
}

function injectSnow(container) {
  for (let i = 0; i < 60; i++) {
    const flake = document.createElement('span');
    flake.className = 'snow-flake';
    flake.style.left = `${Math.random() * 100}%`;
    const size = 3 + Math.random() * 5;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.opacity = 0.4 + Math.random() * 0.5;
    flake.style.animationDuration = `${4 + Math.random() * 5}s`;
    flake.style.animationDelay = `${-(Math.random() * 8)}s`;
    container.appendChild(flake);
  }
}

function injectClouds(bg) {
  [
    { w: 320, h: 90,  top: '5%',  dur: 50, delay: 0 },
    { w: 240, h: 70,  top: '18%', dur: 70, delay: -22 },
    { w: 280, h: 80,  top: '32%', dur: 60, delay: -38 },
    { w: 200, h: 60,  top: '48%', dur: 80, delay: -55 },
  ].forEach(s => {
    const cloud = document.createElement('div');
    cloud.className = 'cloud-shape';
    cloud.style.width = `${s.w}px`;
    cloud.style.height = `${s.h}px`;
    cloud.style.top = s.top;
    cloud.style.animationDuration = `${s.dur}s`;
    cloud.style.animationDelay = `${s.delay}s`;
    bg.appendChild(cloud);
  });
}

function scheduleLightning(bg, overlay) {
  function flash() {
    // Full-screen white flash
    const flashEl = document.createElement('div');
    flashEl.className = 'lightning-flash';
    overlay.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 180);

    // Optional second flicker
    setTimeout(() => {
      const flashEl2 = document.createElement('div');
      flashEl2.className = 'lightning-flash lightning-flicker';
      overlay.appendChild(flashEl2);
      setTimeout(() => flashEl2.remove(), 80);
    }, 100);

    lightningTimer = setTimeout(flash, 6000 + Math.random() * 8000);
  }
  lightningTimer = setTimeout(flash, 2000 + Math.random() * 3000);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', init);

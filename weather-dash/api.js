// ============================================================
// CACHE HELPERS
// ============================================================

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CONFIG.CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

function cacheKey(endpoint, lat, lon) {
  return `owm_${endpoint}_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
}

// ============================================================
// FETCH HELPER
// ============================================================

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ============================================================
// API FUNCTIONS
// ============================================================

async function searchCities(query) {
  const url = `${CONFIG.BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

async function reverseGeocode(lat, lon) {
  const url = `${CONFIG.BASE_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

async function getCurrentWeather(lat, lon) {
  const key = cacheKey('weather', lat, lon);
  const cached = getCached(key);
  if (cached) return cached;
  const url = `${CONFIG.BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.API_KEY}`;
  const data = await apiFetch(url);
  setCache(key, data);
  return data;
}

async function getForecast(lat, lon) {
  const key = cacheKey('forecast', lat, lon);
  const cached = getCached(key);
  if (cached) return cached;
  const url = `${CONFIG.BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.API_KEY}`;
  const data = await apiFetch(url);
  setCache(key, data);
  return data;
}

async function getAirPollution(lat, lon) {
  const key = cacheKey('air', lat, lon);
  const cached = getCached(key);
  if (cached) return cached;
  const url = `${CONFIG.BASE_URL}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
  const data = await apiFetch(url);
  setCache(key, data);
  return data;
}

async function getAllWeatherData(lat, lon) {
  return Promise.all([
    getCurrentWeather(lat, lon),
    getForecast(lat, lon),
    getAirPollution(lat, lon),
  ]);
}

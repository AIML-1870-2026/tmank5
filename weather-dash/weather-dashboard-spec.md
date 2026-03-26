# Weather Dashboard — Implementation Spec

## Overview
Build a fully client-side weather dashboard using vanilla HTML, CSS, and JavaScript. No build step required — opening `index.html` in a browser should be sufficient. Charts are rendered with Chart.js loaded via CDN.

**API:** OpenWeatherMap (free tier)
**API Key:** `e17d8ae223532d107b0dffcfb08c56e2`
**Base URL:** `https://api.openweathermap.org`

---

## File Structure

```
weather-dashboard/
├── index.html      # App shell, layout, CDN script tags
├── style.css       # All styles, CSS variables, animations
├── config.js       # API key and base URL constants
├── api.js          # All fetch functions + localStorage caching
├── charts.js       # Chart.js chart creation and update logic
└── app.js          # DOM wiring, state management, event handlers
```

---

## API Endpoints

All requests must append `&appid={API_KEY}` and `&units=metric` (convert to imperial in JS when needed).

### 1. Geocoding — City Search
```
GET /geo/1.0/direct?q={cityName}&limit=5&appid={API_KEY}
```
Returns array of `{ name, lat, lon, country, state }`. Use for autocomplete.

### 2. Current Weather
```
GET /data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={API_KEY}
```
Key fields used:
- `name`, `sys.country` — display name
- `main.temp`, `main.feels_like`, `main.temp_min`, `main.temp_max`
- `main.humidity`, `main.pressure`
- `visibility` (metres)
- `wind.speed` (m/s), `wind.deg`, `wind.gust`
- `clouds.all` (%)
- `weather[0].main`, `weather[0].description`, `weather[0].icon`
- `sys.sunrise`, `sys.sunset` (Unix timestamps)
- `rain["1h"]`, `snow["1h"]` (optional fields)
- `dt` (current Unix timestamp)
- `timezone` (offset in seconds from UTC)

### 3. 5-Day / 3-Hour Forecast
```
GET /data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={API_KEY}
```
Returns `list[]` of up to 40 items (5 days × 8 per day), each with same shape as current weather plus `pop` (precipitation probability 0–1) and `dt_txt`.

### 4. Air Pollution
```
GET /data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}
```
Key fields:
- `list[0].main.aqi` — integer 1–5 (1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor)
- `list[0].components` — `co`, `no`, `no2`, `o3`, `so2`, `pm2_5`, `pm10`, `nh3`

---

## Caching Strategy

Use `localStorage` to cache API responses. Cache key format: `owm_{endpoint}_{lat}_{lon}`. Store `{ data, timestamp }`. Consider cache fresh if `Date.now() - timestamp < 10 * 60 * 1000` (10 minutes). On cache hit, skip the fetch. Geocoding results are not cached (they're fast and infrequent).

---

## Application State

Maintain a single global state object in `app.js`:

```js
const state = {
  unit: 'metric',         // 'metric' | 'imperial'
  currentLocation: null,  // { name, lat, lon, country }
  savedLocations: [],     // array of location objects (max 5)
  weather: null,          // current weather response
  forecast: null,         // forecast response
  airPollution: null,     // air pollution response
};
```

Persist `unit` and `savedLocations` to `localStorage` on change. Load them on startup.

---

## index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weather Dashboard</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- Animated background layer -->
  <div id="bg-animation" class="bg-animation"></div>

  <div class="app-container">

    <!-- HEADER -->
    <header class="header">
      <div class="logo">&#9729; Weather</div>
      <div class="search-wrapper">
        <input id="search-input" type="text" placeholder="Search city..." autocomplete="off" />
        <ul id="search-results" class="search-results hidden"></ul>
      </div>
      <div class="header-controls">
        <button id="locate-btn" title="Use my location">&#8982;</button>
        <button id="unit-toggle">°F</button>
      </div>
    </header>

    <!-- SAVED LOCATIONS BAR -->
    <div id="saved-bar" class="saved-bar"></div>

    <!-- MAIN CONTENT (hidden until a location is loaded) -->
    <main id="main-content" class="main-content hidden">

      <!-- HERO: Current Weather -->
      <section class="hero-section">
        <div class="hero-left">
          <div id="location-name" class="location-name"></div>
          <div id="weather-desc" class="weather-desc"></div>
          <div class="hero-temp-row">
            <img id="weather-icon" src="" alt="" class="hero-icon" />
            <span id="current-temp" class="current-temp"></span>
          </div>
          <div id="feels-like" class="feels-like"></div>
          <div id="high-low" class="high-low"></div>
        </div>
        <div class="hero-right">
          <button id="save-location-btn" class="save-btn">&#9733; Save</button>
          <div id="last-updated" class="last-updated"></div>
        </div>
      </section>

      <!-- DETAIL CARDS ROW -->
      <section class="cards-grid">
        <div class="card" id="card-humidity">
          <div class="card-icon">&#128167;</div>
          <div class="card-label">Humidity</div>
          <div class="card-value" id="val-humidity"></div>
        </div>
        <div class="card" id="card-wind">
          <div class="card-icon">&#127788;</div>
          <div class="card-label">Wind</div>
          <div class="card-value" id="val-wind"></div>
          <div class="card-sub" id="val-gust"></div>
        </div>
        <div class="card" id="card-pressure">
          <div class="card-icon">&#9654;</div>
          <div class="card-label">Pressure</div>
          <div class="card-value" id="val-pressure"></div>
          <div class="card-sub" id="val-pressure-trend"></div>
        </div>
        <div class="card" id="card-visibility">
          <div class="card-icon">&#128065;</div>
          <div class="card-label">Visibility</div>
          <div class="card-value" id="val-visibility"></div>
        </div>
        <div class="card" id="card-clouds">
          <div class="card-icon">&#9729;</div>
          <div class="card-label">Cloud Cover</div>
          <div class="card-value" id="val-clouds"></div>
        </div>
      </section>

      <!-- SUGGESTION + COMPASS ROW -->
      <section class="mid-row">
        <!-- Outfit/Activity Suggestion -->
        <div class="panel suggestion-panel">
          <h3>&#128214; Recommendation</h3>
          <div id="suggestion-icon" class="suggestion-icon"></div>
          <div id="suggestion-text" class="suggestion-text"></div>
          <div id="best-hour" class="best-hour"></div>
        </div>

        <!-- Wind Compass -->
        <div class="panel compass-panel">
          <h3>&#127759; Wind Direction</h3>
          <svg id="compass-svg" viewBox="0 0 200 200" class="compass-svg">
            <!-- Compass rose drawn by JS -->
          </svg>
          <div id="compass-label" class="compass-label"></div>
        </div>

        <!-- Sunrise / Sunset -->
        <div class="panel sun-panel">
          <h3>&#9728; Astronomy</h3>
          <svg id="sun-arc-svg" viewBox="0 0 300 160" class="sun-arc-svg">
            <!-- Arc drawn by JS -->
          </svg>
          <div class="sun-times">
            <span>&#127765; <span id="sunrise-time"></span></span>
            <span>&#127761; <span id="sunset-time"></span></span>
          </div>
        </div>
      </section>

      <!-- AIR QUALITY -->
      <section class="panel aqi-panel">
        <h3>&#127807; Air Quality</h3>
        <div class="aqi-main">
          <div id="aqi-score" class="aqi-score"></div>
          <div id="aqi-label" class="aqi-label"></div>
          <div id="aqi-bar" class="aqi-bar"><div id="aqi-fill" class="aqi-fill"></div></div>
        </div>
        <div id="pollutants-grid" class="pollutants-grid"></div>
      </section>

      <!-- HOURLY TIMELINE (scrollable icon strip) -->
      <section class="panel">
        <h3>&#9203; Hourly Timeline</h3>
        <div id="hourly-timeline" class="hourly-timeline"></div>
      </section>

      <!-- CHARTS -->
      <section class="panel charts-panel">
        <h3>&#128200; 24-Hour Forecast</h3>
        <div class="chart-tabs">
          <button class="chart-tab active" data-chart="temp">Temperature</button>
          <button class="chart-tab" data-chart="precip">Precipitation %</button>
        </div>
        <div class="chart-container">
          <canvas id="forecast-chart"></canvas>
        </div>
      </section>

      <!-- 5-DAY FORECAST -->
      <section class="panel">
        <h3>&#128197; 5-Day Forecast</h3>
        <div id="forecast-strip" class="forecast-strip"></div>
      </section>

    </main>

    <!-- EMPTY STATE -->
    <div id="empty-state" class="empty-state">
      <div class="empty-icon">&#127752;</div>
      <p>Search for a city to get started</p>
    </div>

    <!-- LOADING STATE -->
    <div id="loading-state" class="loading-state hidden">
      <div class="spinner"></div>
      <p>Fetching weather data...</p>
    </div>

    <!-- ERROR STATE -->
    <div id="error-state" class="error-state hidden">
      <div>&#9888;</div>
      <p id="error-message"></p>
    </div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script src="config.js"></script>
  <script src="api.js"></script>
  <script src="charts.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

---

## config.js

```js
const CONFIG = {
  API_KEY: 'e17d8ae223532d107b0dffcfb08c56e2',
  BASE_URL: 'https://api.openweathermap.org',
  CACHE_TTL_MS: 10 * 60 * 1000,
  MAX_SAVED: 5,
};
```

---

## api.js — Full Specification

### Cache helpers
```js
function getCached(key) { ... }     // returns parsed data or null if expired/missing
function setCache(key, data) { ... } // stores { data, timestamp } in localStorage
function cacheKey(endpoint, lat, lon) { return `owm_${endpoint}_${lat}_${lon}`; }
```

### Fetch functions (all return parsed JSON, throw on non-2xx)
```js
async function searchCities(query)               // GET /geo/1.0/direct
async function getCurrentWeather(lat, lon)       // GET /data/2.5/weather, with cache
async function getForecast(lat, lon)             // GET /data/2.5/forecast, with cache
async function getAirPollution(lat, lon)         // GET /data/2.5/air_pollution, with cache
async function getAllWeatherData(lat, lon)        // runs all 3 in parallel via Promise.all
```

Always fetch with `units=metric`. Unit conversion (to °F, mph) happens in the display layer, never in the API layer.

---

## app.js — Full Specification

### Startup
1. Load `state.unit` and `state.savedLocations` from `localStorage`
2. Render the saved locations bar
3. Set unit toggle button label
4. If `savedLocations[0]` exists, auto-load the first saved location

### Search
- On input (debounced 300ms): call `searchCities(query)`, render dropdown with results
- On result click: set `state.currentLocation`, hide dropdown, call `loadLocation(lat, lon, name, country)`
- On Escape key: hide dropdown

### `loadLocation(lat, lon, name, country)`
1. Show loading state, hide main content and error
2. Call `getAllWeatherData(lat, lon)`
3. Store results in `state.weather`, `state.forecast`, `state.airPollution`
4. Call all render functions
5. Show main content, hide loading
6. On error: show error state with message

### Unit Toggle
- Toggle `state.unit` between `'metric'` and `'imperial'`
- Persist to `localStorage`
- Re-render all temperature/wind displays without re-fetching
- Update button label to show the unit you'd switch TO (showing "°F" means you're currently in °C)

### Geolocation
- On locate button click: call `navigator.geolocation.getCurrentPosition`
- On success: reverse geocode via `/geo/1.0/reverse?lat=&lon=&limit=1&appid=` then call `loadLocation`
- On failure: show error toast

### Save Location
- `state.savedLocations` max 5 items; if already saved, button shows "★ Saved" (disabled)
- On save: push to array, persist, re-render saved bar
- Each saved location chip has an `×` remove button

---

## Rendering Functions

### `renderHero(weather)`
- Location: `{name}, {sys.country}`
- Icon: `https://openweathermap.org/img/wn/{icon}@2x.png`
- Temp: convert if imperial (`°C` → `°F` = `temp * 9/5 + 32`)
- Feels like, high/low, description (capitalize first letter)
- Last updated: format `dt` as local time using `timezone` offset

### `renderCards(weather)`
- Humidity: `{humidity}%`
- Wind: convert m/s → km/h (metric) or mph (imperial). Show `{speed} km/h {direction}` where direction is a compass label (N, NE, E, SE, S, SW, W, NW) derived from `wind.deg`
- Gust: show if present
- Pressure: `{pressure} hPa` + trend arrow (see Pressure Trend below)
- Visibility: convert metres → km (metric) or miles (imperial), cap display at 10 km / 6 mi
- Cloud cover: `{clouds.all}%`

### Pressure Trend
The current weather endpoint only gives a single pressure reading. Use the first 3 forecast entries to determine trend:
- Get pressure values from `forecast.list[0]`, `[1]`, `[2]`
- If rising by >1 hPa: show `↑ Rising`
- If falling by >1 hPa: show `↓ Falling`
- Otherwise: show `→ Stable`

### `renderSuggestion(weather, forecast)`
Compute a text suggestion and emoji using these heuristics (check in order, use first match):

| Condition | Emoji | Text |
|-----------|-------|------|
| `rain` or `drizzle` in `weather.main` (case-insensitive) | ☔ | "Don't forget your umbrella!" |
| `snow` in `weather.main` | 🧥 | "Bundle up — it's snowing!" |
| `thunderstorm` in `weather.main` | ⚡ | "Stay indoors if possible." |
| `temp >= 35` (metric) | 🕶️ | "Heat advisory — stay hydrated and wear sunscreen." |
| `temp >= 28` | ☀️ | "Warm day! Apply sunscreen before heading out." |
| `temp <= 0` | 🧤 | "Freezing! Wear gloves and a heavy coat." |
| `temp <= 10` | 🧣 | "Chilly — grab a jacket." |
| `wind.speed >= 10` m/s | 🌬️ | "Very windy today — secure loose items." |
| `clouds.all <= 20` and no rain | 🌤️ | "Clear skies — great day to be outside!" |
| default | 🌡️ | "Mild conditions — enjoy your day!" |

**Best hour to go outside** — scan `forecast.list` for entries within the next 12 hours. Score each entry: +2 if no rain/snow, +1 if temp between 18–26°C, +1 if clouds < 50%, +1 if wind < 5 m/s. Pick the highest score. Display as: `"Best time today: {time} ({condition})"`.

### `renderCompass(windDeg, windSpeed)`
Draw into `#compass-svg` using SVG elements created via `document.createElementNS`:
- Outer circle (stroke only)
- Cardinal labels: N, E, S, W at correct positions
- Arrow: a triangle rotated `windDeg` degrees pointing in the wind direction. Use `transform="rotate({deg}, 100, 100)"` on a centered arrow polygon.
- Center dot
- Label below: `{direction} at {speed} km/h`

### `renderSunArc(sunrise, sunset, currentTime, timezone)`
All timestamps are Unix seconds. Convert to local time using `timezone` offset (seconds).
Draw into `#sun-arc-svg`:
- A semicircular arc path from left (sunrise) to right (sunset), stroke only
- A filled circle on the arc representing current sun position (interpolate 0–1 based on how far through the day we are)
- If before sunrise or after sunset, place dot at left or right end and make it dimmer

### `renderAirQuality(airPollution)`
- AQI 1→5 maps to: Good (green), Fair (yellow-green), Moderate (yellow), Poor (orange), Very Poor (red)
- Fill `#aqi-fill` width to `(aqi/5) * 100%` with the appropriate color
- Render pollutants grid: `CO`, `NO₂`, `O₃`, `SO₂`, `PM2.5`, `PM10` — each as a small labeled card with its value in µg/m³

### `renderHourlyTimeline(forecast)`
Take the first 12 entries from `forecast.list` (covers 36 hours at 3h intervals). For each:
- Render a horizontally scrollable card with: time (HH:MM), OWM icon, temp value
- Style the card with a subtle background. Highlight the current closest entry.

### `renderForecastStrip(forecast)`
Group `forecast.list` by calendar date (using local time + timezone offset). For each day (skip today if time is past midday, or include today):
- Show: weekday name, OWM icon (use noon entry if available, else first of day), high temp (max of all entries that day), low temp (min of all entries that day), precipitation probability (max `pop` that day, formatted as `{n}%`)

### `renderBackground(weatherMain)`
Map `weather.main` to a CSS class on `#bg-animation`:

| `weather.main` | class |
|----------------|-------|
| `Clear` | `bg-clear` |
| `Clouds` | `bg-cloudy` |
| `Rain`, `Drizzle` | `bg-rain` |
| `Thunderstorm` | `bg-storm` |
| `Snow` | `bg-snow` |
| `Mist`, `Fog`, `Haze` | `bg-fog` |
| default | `bg-default` |

---

## charts.js — Full Specification

Manage a single Chart.js instance stored in a module-level variable (`let chartInstance = null`). On update, call `chartInstance.destroy()` before creating a new one.

### `renderForecastChart(forecast, type, unit)`
- `type`: `'temp'` or `'precip'`
- Take first 8 entries from `forecast.list` (24 hours)
- Labels: format `dt_txt` as `HH:MM`

**Temperature chart:**
- Dataset: `main.temp` values (convert if imperial)
- Chart type: `'line'`
- Smooth: `tension: 0.4`
- Fill: gradient from top color to transparent (use `createLinearGradient`)
- Y-axis label: `°C` or `°F`
- Point radius: 4, hover radius: 6

**Precipitation chart:**
- Dataset: `pop * 100` (convert to percentage)
- Chart type: `'bar'`
- Bar color: `rgba(99, 179, 237, 0.7)`
- Y-axis: 0–100, label: `Probability (%)`

Chart global defaults: no legend, responsive, `maintainAspectRatio: false`, tooltip callbacks to append unit.

Chart tab buttons toggle between the two chart types, re-calling `renderForecastChart` with the new type.

---

## style.css — Key Requirements

### CSS Variables
```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #38bdf8;
  --accent-hover: #0ea5e9;
  --border: #334155;
  --radius: 16px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}
```

Dark theme by default. No light mode needed.

### Layout
- `body`: dark background, `font-family: system-ui, sans-serif`
- `.app-container`: `max-width: 1100px`, centered, padding `1rem`
- `.header`: flexbox, space-between, sticky top, blur backdrop
- `.cards-grid`: CSS grid, `repeat(auto-fit, minmax(160px, 1fr))`
- `.mid-row`: CSS grid, 3 columns on desktop, 1 column on mobile (< 768px)
- `.panel`: card styling — `background: var(--bg-card)`, `border-radius: var(--radius)`, `padding: 1.5rem`, `box-shadow: var(--shadow)`
- `.forecast-strip`: flexbox, gap, wrap on mobile
- `.hourly-timeline`: horizontal flexbox, `overflow-x: auto`, hide scrollbar on webkit

### Responsive
All grid layouts collapse to single column at `max-width: 768px`.

### Animated Backgrounds

All animations use `::before` / `::after` pseudo-elements or child `<span>` elements injected by JS on the `#bg-animation` div. The div is `position: fixed`, full viewport, `z-index: -1`, `pointer-events: none`.

**`bg-clear`:** Radial gradient from warm blue center. Optional: subtle slow-rotating sun ray conic gradient overlay, opacity 0.15, animation `spin 20s linear infinite`.

**`bg-cloudy`:** Dark grey gradient. 3 animated cloud shapes (ellipses using `border-radius`) that drift left-to-right slowly (`translateX` keyframes, 30–50s duration, staggered delays).

**`bg-rain`:** Dark blue-grey gradient. 40 rain drop `<span>` elements (1px wide, 10–20px tall, white, opacity 0.4) injected by JS with random `left` positions and `animation-delay`s. Keyframe: `translateY(-100vh)` → `translateY(110vh)` in 0.6–1.2s, `linear`, `infinite`.

**`bg-storm`:** Near-black gradient. Same rain drops but faster and more opaque. Every 8–15 seconds trigger a brief `flash` animation (white overlay fades in and out in 0.1s) to simulate lightning.

**`bg-snow`:** Dark slate gradient. 30 snowflake `<span>` elements (3–6px, white circles, opacity 0.6) that fall slowly (3–6s) with a gentle left-right sway (sine wave via `translateX` in keyframe).

**`bg-fog`:** Muted grey-blue gradient. Two large blurred ellipses that slowly pulse in opacity (0.3 → 0.6 → 0.3 over 6s).

**`bg-default`:** Static dark gradient, no animation.

When calling `renderBackground`, first clear all injected elements and remove all `bg-*` classes, then add the new class and inject any needed elements.

---

## Helper Utilities (in app.js or a utils section)

```js
function convertTemp(celsius, unit)         // returns number
function tempLabel(celsius, unit)           // returns "{value}°C" or "{value}°F"
function mpsToDisplay(mps, unit)            // m/s → "X km/h" or "X mph"
function degToCompass(deg)                  // 0–360 → "N", "NE", "E", etc. (16-point or 8-point)
function formatTime(unixSeconds, tzOffset)  // returns "HH:MM" string in local time
function formatDay(unixSeconds, tzOffset)   // returns "Mon", "Tue", etc.
function capitalise(str)                    // capitalises first letter
function debounce(fn, ms)                   // standard debounce
```

---

## Error Handling

- Network error: show `#error-state` with "Unable to reach weather service. Check your connection."
- 401: "Invalid API key. Please check config.js."
- 404: "Location not found."
- 429: "Too many requests. Please wait a moment."
- Geolocation denied: show inline toast below the locate button: "Location access denied."
- Empty search: do not call API

---

## Accessibility

- All interactive elements have `:focus-visible` outline in `var(--accent)`
- Icon-only buttons have `title` attributes
- `<img>` elements for weather icons have descriptive `alt` text
- Color is never the sole indicator of state (AQI label text always shown alongside color)

---

## What NOT to do

- Do not use `eval`, `innerHTML` with unsanitised user input, or `document.write`
- Do not store the API key in a cookie or send it server-side
- Do not import any additional libraries beyond Chart.js
- Do not add a backend, server, or build step of any kind
- Do not add TypeScript, JSX, or module bundler configuration
- Do not add a `.gitignore` or `README.md`

---

## Verification Checklist

After implementation, verify the following work end to end:

1. Open `index.html` directly in a browser (file:// protocol) — page loads, empty state shown
2. Type a city name → dropdown appears with up to 5 results
3. Click a result → loading spinner → all panels populate
4. Hero shows: location, condition, temp, feels like, high/low, icon, last updated time
5. Cards show: humidity, wind with direction label, pressure with trend, visibility, clouds
6. Compass SVG arrow points in the correct wind direction
7. Sunrise/sunset arc shows a dot in the correct position relative to current time
8. Suggestion card shows a relevant emoji and text; best hour shows a time
9. AQI panel shows the score (1–5), label, colored bar, and pollutant grid
10. Hourly timeline scrolls horizontally and shows 12 entries
11. 24h temperature chart renders as a smooth line with gradient fill
12. Click "Precipitation %" tab → chart switches to bar chart
13. 5-day forecast strip shows 5 days with icons, high, low, rain probability
14. Click "°F" toggle → all temperatures and wind speeds convert; label changes to "°C"
15. Click "★ Save" → location appears in saved bar; survives page refresh
16. Click `×` on saved location chip → removed from bar and localStorage
17. Click the locate button → browser asks for permission → loads local weather on allow
18. Open DevTools Network tab: confirm API calls hit `api.openweathermap.org`, all return 200
19. Reload within 10 minutes → no new API calls (cache hit for weather/forecast/air quality)
20. Background animation matches the current weather condition

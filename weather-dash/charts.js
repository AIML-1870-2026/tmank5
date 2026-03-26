let chartInstance = null;
let currentChartType = 'temp';

function renderForecastChart(forecast, type, unit) {
  currentChartType = type;

  const canvas = document.getElementById('forecast-chart');
  const ctx = canvas.getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const entries = forecast.list.slice(0, 8);
  const labels = entries.map(e => e.dt_txt.slice(11, 16));

  if (type === 'temp') {
    const temps = entries.map(e => {
      const t = e.main.temp;
      return unit === 'imperial' ? Math.round(t * 9 / 5 + 32) : Math.round(t);
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

    const unitLabel = unit === 'imperial' ? '°F' : '°C';

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: temps,
          borderColor: '#38bdf8',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw}${unitLabel}`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              color: '#94a3b8',
              callback: v => `${v}${unitLabel}`,
            },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
        },
      },
    });
  } else {
    const pops = entries.map(e => Math.round((e.pop || 0) * 100));

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: pops,
          backgroundColor: 'rgba(99, 179, 237, 0.7)',
          borderColor: 'rgba(99, 179, 237, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: '#94a3b8',
              callback: v => `${v}%`,
            },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
        },
      },
    });
  }
}

function getCurrentChartType() {
  return currentChartType;
}

const Starfield = (() => {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let mouseX = 0;
  let mouseY = 0;
  const STAR_COUNT = 150;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const parallaxX = (mouseX - canvas.width / 2) * 0.02;
    const parallaxY = (mouseY - canvas.height / 2) * 0.02;

    // Batch stars by quantized alpha (10 buckets) to reduce fillStyle changes
    const buckets = new Array(10);
    for (let i = 0; i < 10; i++) buckets[i] = [];

    for (const star of stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
      const alpha = twinkle * star.opacity;
      const bucket = Math.min(9, (alpha * 10) | 0);
      buckets[bucket].push(star);
    }

    for (let b = 0; b < 10; b++) {
      const group = buckets[b];
      if (group.length === 0) continue;
      const alphaVal = ((b + 0.5) / 10).toFixed(2);
      ctx.fillStyle = `rgba(255,255,255,${alphaVal})`;

      ctx.beginPath();
      for (const star of group) {
        const px = star.x + parallaxX * star.speed;
        const py = star.y + parallaxY * star.speed;
        ctx.moveTo(px + star.size, py);
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function init() {
    resize();
    createStars();
    window.addEventListener('resize', () => {
      resize();
      createStars();
    });
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  return { init, draw };
})();

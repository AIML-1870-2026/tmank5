const Particles = (() => {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let active = false;

  function burst(hex, count = 40) {
    const rgb = ColorMixer.hexToRgb(hex);
    particles = [];
    active = true;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        life: 1,
        decay: Math.random() * 0.015 + 0.008,
        r: Math.max(0, Math.min(255, rgb.r + ((Math.random() * 40 - 20) | 0))),
        g: Math.max(0, Math.min(255, rgb.g + ((Math.random() * 40 - 20) | 0))),
        b: Math.max(0, Math.min(255, rgb.b + ((Math.random() * 40 - 20) | 0))),
      });
    }
  }

  function update() {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= p.decay;

      const radius = p.size * p.life;
      if (radius < 0.3) continue;

      // Draw a soft glow without shadowBlur — two circles (outer faint, inner bright)
      ctx.globalAlpha = p.life * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
      ctx.fill();

      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (alive === 0) {
      active = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return { burst, update };
})();

// --- Mix animation overlay ---
const MixAnimation = (() => {
  const overlay = document.getElementById('mixOverlay');
  const canvas = document.getElementById('mixCanvas');
  const ctx = canvas.getContext('2d');
  let animating = false;
  let startTime = 0;
  const DURATION = 2000;
  let colorA, colorB, colorResult;
  let onComplete = null;

  function play(hexA, hexB, hexResult, callback) {
    colorA = ColorMixer.hexToRgb(hexA);
    colorB = ColorMixer.hexToRgb(hexB);
    colorResult = ColorMixer.hexToRgb(hexResult);
    onComplete = callback;
    animating = true;
    startTime = performance.now();
    overlay.classList.add('active');
  }

  function update(time) {
    if (!animating) return;

    const elapsed = time - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const orbitRadius = 80 * (1 - t * t);
    const angle = t * Math.PI * 6;
    const blobSize = 25 + t * 15;

    const ax = cx + Math.cos(angle) * orbitRadius;
    const ay = cy + Math.sin(angle) * orbitRadius;
    const bx = cx + Math.cos(angle + Math.PI) * orbitRadius;
    const by = cy + Math.sin(angle + Math.PI) * orbitRadius;

    // Simplified trails — just 3 instead of 5, no per-trail alpha string
    ctx.globalAlpha = 0.15;
    for (let i = 1; i <= 3; i++) {
      const trailAngle = angle - i * 0.2;
      const trailR = orbitRadius * (1 + i * 0.02);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(trailAngle) * trailR, cy + Math.sin(trailAngle) * trailR, blobSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${colorA.r}, ${colorA.g}, ${colorA.b})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(trailAngle + Math.PI) * trailR, cy + Math.sin(trailAngle + Math.PI) * trailR, blobSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${colorB.r}, ${colorB.g}, ${colorB.b})`;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Blob A
    const gradA = ctx.createRadialGradient(ax, ay, 0, ax, ay, blobSize);
    gradA.addColorStop(0, `rgba(${colorA.r}, ${colorA.g}, ${colorA.b}, 0.9)`);
    gradA.addColorStop(1, `rgba(${colorA.r}, ${colorA.g}, ${colorA.b}, 0)`);
    ctx.beginPath();
    ctx.arc(ax, ay, blobSize, 0, Math.PI * 2);
    ctx.fillStyle = gradA;
    ctx.fill();

    // Blob B
    const gradB = ctx.createRadialGradient(bx, by, 0, bx, by, blobSize);
    gradB.addColorStop(0, `rgba(${colorB.r}, ${colorB.g}, ${colorB.b}, 0.9)`);
    gradB.addColorStop(1, `rgba(${colorB.r}, ${colorB.g}, ${colorB.b}, 0)`);
    ctx.beginPath();
    ctx.arc(bx, by, blobSize, 0, Math.PI * 2);
    ctx.fillStyle = gradB;
    ctx.fill();

    // Merged result
    if (t > 0.5) {
      const mergeT = (t - 0.5) * 2;
      const mergeSize = mergeT * 60;
      const gradR = ctx.createRadialGradient(cx, cy, 0, cx, cy, mergeSize);
      gradR.addColorStop(0, `rgba(${colorResult.r}, ${colorResult.g}, ${colorResult.b}, ${mergeT * 0.9})`);
      gradR.addColorStop(1, `rgba(${colorResult.r}, ${colorResult.g}, ${colorResult.b}, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, mergeSize, 0, Math.PI * 2);
      ctx.fillStyle = gradR;
      ctx.fill();
    }

    if (t >= 1) {
      animating = false;
      overlay.classList.remove('active');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (onComplete) onComplete();
    }
  }

  return { play, update };
})();

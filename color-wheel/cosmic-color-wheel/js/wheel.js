const ColorWheel = (() => {
  const canvas = document.getElementById('colorWheel');
  const ctx = canvas.getContext('2d');
  const size = 400;
  const center = size / 2;
  const outerRadius = 180;
  const innerRadius = 100;
  let rotation = 0;
  let glowHue = 0;
  let markerA = null;
  let markerB = null;
  let highlightLine = null;
  let reducedMotion = false;

  // Offscreen canvas for the static color ring
  const wheelBuffer = document.createElement('canvas');
  wheelBuffer.width = size;
  wheelBuffer.height = size;

  function checkReducedMotion() {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function renderWheelBuffer() {
    const bCtx = wheelBuffer.getContext('2d');
    bCtx.clearRect(0, 0, size, size);
    bCtx.save();
    bCtx.translate(center, center);

    for (let angle = 0; angle < 360; angle += 1) {
      const startRad = (angle - 0.5) * Math.PI / 180;
      const endRad = (angle + 1.5) * Math.PI / 180;
      bCtx.beginPath();
      bCtx.arc(0, 0, outerRadius, startRad, endRad);
      bCtx.arc(0, 0, innerRadius, endRad, startRad, true);
      bCtx.closePath();
      bCtx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      bCtx.fill();
    }

    const innerGrad = bCtx.createRadialGradient(0, 0, 0, 0, 0, innerRadius - 2);
    innerGrad.addColorStop(0, 'white');
    innerGrad.addColorStop(1, 'transparent');
    bCtx.beginPath();
    bCtx.arc(0, 0, innerRadius - 2, 0, Math.PI * 2);
    bCtx.fillStyle = innerGrad;
    bCtx.fill();

    bCtx.restore();
  }

  function drawWheel() {
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotation);
    ctx.drawImage(wheelBuffer, -center, -center);
    ctx.restore();

    // Nebula glow
    if (!reducedMotion) {
      const glowGrad = ctx.createRadialGradient(center, center, outerRadius - 10, center, center, outerRadius + 40);
      glowGrad.addColorStop(0, `hsla(${glowHue}, 70%, 50%, 0.12)`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(center, center, outerRadius + 40, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // Relationship highlight line
    if (highlightLine) {
      const pos = getPositionForHue(highlightLine.hue);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#ffffffcc';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Draw a small diamond at the end for non-color identification
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = highlightLine.hex;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
      ctx.restore();
    }

    // Draw markers with distinct shapes + letters
    drawMarkerA();
    drawMarkerB();
  }

  // Marker A: circle with letter "A"
  function drawMarkerA() {
    if (!markerA) return;
    const pos = getMarkerPos(markerA);

    // White outline circle (visible on any color)
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Letter A
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', pos.x, pos.y + 1);
  }

  // Marker B: square with letter "B"
  function drawMarkerB() {
    if (!markerB) return;
    const pos = getMarkerPos(markerB);

    // White outline square (distinct shape from A)
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-12, -12, 24, 24);

    // Letter B
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', 0, 1);
    ctx.restore();
  }

  function getMarkerPos(marker) {
    const angleRad = (marker.angle + rotation * 180 / Math.PI) * Math.PI / 180;
    return {
      x: center + Math.cos(angleRad) * marker.dist,
      y: center + Math.sin(angleRad) * marker.dist,
    };
  }

  function getPositionForHue(hue) {
    const angleRad = (hue + rotation * 180 / Math.PI) * Math.PI / 180;
    const midR = (outerRadius + innerRadius) / 2;
    return {
      x: center + Math.cos(angleRad) * midR,
      y: center + Math.sin(angleRad) * midR,
    };
  }

  function update() {
    if (!reducedMotion) {
      rotation += 0.0002;
      glowHue = (glowHue + 0.05) % 360;
    }
    drawWheel();
  }

  function getColorAtPosition(x, y) {
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > outerRadius + 5 || dist < 10) return null;

    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    angle -= rotation * 180 / Math.PI;
    angle = ((angle % 360) + 360) % 360;

    let saturation, lightness;
    if (dist >= innerRadius) {
      saturation = 1;
      lightness = 0.5;
    } else {
      saturation = dist / innerRadius;
      lightness = 0.5 + (1 - saturation) * 0.3;
    }

    const rgb = ColorMixer.hslToRgb(angle, saturation, lightness);
    const hex = ColorMixer.rgbToHex(rgb.r, rgb.g, rgb.b);

    return { hex, angle, dist: Math.min(dist, outerRadius) };
  }

  // Keyboard: adjust hue by a given delta for the active marker
  function adjustHue(slot, delta) {
    const marker = slot === 'A' ? markerA : markerB;
    if (!marker) {
      // Place at 0° on the ring if no marker yet
      const newMarker = { angle: delta < 0 ? 360 + delta : delta, dist: (outerRadius + innerRadius) / 2 };
      if (slot === 'A') markerA = newMarker; else markerB = newMarker;
    } else {
      marker.angle = ((marker.angle + delta) % 360 + 360) % 360;
    }
    const m = slot === 'A' ? markerA : markerB;
    const saturation = m.dist >= innerRadius ? 1 : m.dist / innerRadius;
    const lightness = m.dist >= innerRadius ? 0.5 : 0.5 + (1 - saturation) * 0.3;
    const rgb = ColorMixer.hslToRgb(m.angle, saturation, lightness);
    return ColorMixer.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function setMarker(slot, angle, dist) {
    if (slot === 'A') {
      markerA = { angle, dist };
    } else {
      markerB = { angle, dist };
    }
  }

  function setHighlightLine(hue, hex) {
    highlightLine = hue !== null ? { hue, hex } : null;
  }

  function init() {
    checkReducedMotion();
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', checkReducedMotion);
    renderWheelBuffer();
    drawWheel();
  }

  return { init, update, getColorAtPosition, setMarker, setHighlightLine, adjustHue, canvas };
})();

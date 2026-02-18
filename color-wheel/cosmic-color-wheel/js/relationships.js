const Relationships = (() => {
  function getRelationships(hex) {
    const rgb = ColorMixer.hexToRgb(hex);
    const hsl = ColorMixer.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    function hueToHex(hue) {
      const c = ColorMixer.hslToRgb(((hue % 360) + 360) % 360, s, l);
      return ColorMixer.rgbToHex(c.r, c.g, c.b);
    }

    return [
      { name: 'Complementary', hex: hueToHex(h + 180), hue: (h + 180) % 360 },
      { name: 'Triadic 1', hex: hueToHex(h + 120), hue: (h + 120) % 360 },
      { name: 'Triadic 2', hex: hueToHex(h + 240), hue: (h + 240) % 360 },
      { name: 'Analogous 1', hex: hueToHex(h + 30), hue: (h + 30) % 360 },
      { name: 'Analogous 2', hex: hueToHex(h - 30), hue: ((h - 30) + 360) % 360 },
      { name: 'Split-Comp 1', hex: hueToHex(h + 150), hue: (h + 150) % 360 },
      { name: 'Split-Comp 2', hex: hueToHex(h + 210), hue: (h + 210) % 360 },
    ];
  }

  function render(hex) {
    const grid = document.getElementById('relGrid');
    grid.innerHTML = '';
    const rels = getRelationships(hex);

    rels.forEach((rel) => {
      const item = document.createElement('div');
      item.className = 'rel-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${rel.name}: ${rel.hex}`);
      item.innerHTML = `
        <div class="rel-swatch" style="background:${rel.hex}; color:${rel.hex};"></div>
        <span class="rel-name">${rel.name}</span>
        <span class="rel-hex">${rel.hex}</span>
      `;

      function showHighlight() {
        ColorWheel.setHighlightLine(rel.hue, rel.hex);
      }
      function hideHighlight() {
        ColorWheel.setHighlightLine(null, null);
      }

      item.addEventListener('mouseenter', showHighlight);
      item.addEventListener('mouseleave', hideHighlight);
      item.addEventListener('focus', showHighlight);
      item.addEventListener('blur', hideHighlight);
      grid.appendChild(item);
    });
  }

  const explanations = {
    'Complementary': 'Opposite on the wheel \u2014 creates maximum contrast and visual tension. Great for making elements pop.',
    'Triadic': 'Three colors equally spaced (120\u00B0 apart). Creates vibrant, balanced palettes even at low saturation.',
    'Analogous': 'Neighboring colors (30\u00B0 apart). Creates harmonious, serene designs that feel natural.',
    'Split-Complementary': 'Like complementary but gentler \u2014 uses the two colors adjacent to the complement for softer contrast.',
  };

  return { getRelationships, render, explanations };
})();

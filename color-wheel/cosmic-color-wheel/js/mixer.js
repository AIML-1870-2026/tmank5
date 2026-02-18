const ColorMixer = (() => {
  // --- Conversion utilities ---

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, l };
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
    return {
      c: (1 - r - k) / (1 - k),
      m: (1 - g - k) / (1 - k),
      y: (1 - b - k) / (1 - k),
      k,
    };
  }

  function cmykToRgb(c, m, y, k) {
    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k)),
    };
  }

  // RYB <-> RGB using cubic interpolation (Gosset & Chen method)
  function rgbToRyb(r, g, b) {
    let w = Math.min(r, g, b);
    r -= w; g -= w; b -= w;
    const mg = Math.max(r, g, b);
    let y = Math.min(r, g);
    r -= y; g -= y;
    if (b > 0 && g > 0) { b /= 2; g /= 2; }
    y += g; b += g;
    const my = Math.max(r, y, b);
    if (my > 0) {
      const n = mg / my;
      r *= n; y *= n; b *= n;
    }
    r += w; y += w; b += w;
    return { r, y, b };
  }

  function rybToRgb(r, y, b) {
    let w = Math.min(r, y, b);
    r -= w; y -= w; b -= w;
    const my = Math.max(r, y, b);
    let g = Math.min(y, b);
    y -= g; b -= g;
    if (b > 0 && g > 0) { b *= 2; g *= 2; }
    r += y; g += y;
    const mg = Math.max(r, g, b);
    if (mg > 0) {
      const n = my / mg;
      r *= n; g *= n; b *= n;
    }
    r += w; g += w; b += w;
    return {
      r: Math.round(Math.max(0, Math.min(255, r))),
      g: Math.round(Math.max(0, Math.min(255, g))),
      b: Math.round(Math.max(0, Math.min(255, b))),
    };
  }

  // --- Mixing ---

  function mixRGB(c1, c2) {
    return {
      r: Math.round((c1.r + c2.r) / 2),
      g: Math.round((c1.g + c2.g) / 2),
      b: Math.round((c1.b + c2.b) / 2),
    };
  }

  function mixRYB(c1, c2) {
    const ryb1 = rgbToRyb(c1.r, c1.g, c1.b);
    const ryb2 = rgbToRyb(c2.r, c2.g, c2.b);
    const mixed = {
      r: (ryb1.r + ryb2.r) / 2,
      y: (ryb1.y + ryb2.y) / 2,
      b: (ryb1.b + ryb2.b) / 2,
    };
    return rybToRgb(mixed.r, mixed.y, mixed.b);
  }

  function mixCMYK(c1, c2) {
    const cmyk1 = rgbToCmyk(c1.r, c1.g, c1.b);
    const cmyk2 = rgbToCmyk(c2.r, c2.g, c2.b);
    return cmykToRgb(
      (cmyk1.c + cmyk2.c) / 2,
      (cmyk1.m + cmyk2.m) / 2,
      (cmyk1.y + cmyk2.y) / 2,
      (cmyk1.k + cmyk2.k) / 2
    );
  }

  function mix(hex1, hex2, model) {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    let result;
    switch (model) {
      case 'ryb': result = mixRYB(c1, c2); break;
      case 'cmyk': result = mixCMYK(c1, c2); break;
      default: result = mixRGB(c1, c2);
    }
    return rgbToHex(result.r, result.g, result.b);
  }

  function getColorInfo(hex) {
    const rgb = hexToRgb(hex);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return {
      hex,
      rgb,
      cmyk,
      hsl,
      rgbStr: `(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      cmykStr: `(${Math.round(cmyk.c * 100)}%, ${Math.round(cmyk.m * 100)}%, ${Math.round(cmyk.y * 100)}%, ${Math.round(cmyk.k * 100)}%)`,
    };
  }

  return {
    hexToRgb, rgbToHex, rgbToHsl, hslToRgb,
    rgbToCmyk, cmykToRgb, rgbToRyb, rybToRgb,
    mix, getColorInfo,
  };
})();

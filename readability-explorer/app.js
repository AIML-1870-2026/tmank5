/* ═══════════════════════════════════════════════════════
   READABILITY EXPLORER — Application Logic
   Vanilla JS, no dependencies
═══════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════
   STATE
════════════════════════════════════ */
const state = {
  text:   { r: 224, g: 224, b: 224 },
  bg:     { r: 18,  g: 18,  b: 18  },
  fontSize:      16,
  fontFamily:    'Georgia, serif',
  fontWeight:    400,
  lineHeight:    1.5,
  letterSpacing: 0,
  columnWidth:   600,
  textAlign:     'left',
  textCase:      'default',
  sampleType:    'lorem',
  customText:    '',
  vision:        'none',
  environment:   'none',
  aids: {
    bionic:       false,
    lineFocus:    false,
    wordSpacing:  false,
    ruler:        false,
    readingMask:  false,
  },
  compareMode:   false,
  snapshot:      null,
};

const history   = [];
const MAX_HISTORY = 10;
let rulerDragging = false;
let rulerY        = 200;

/* ════════════════════════════════════
   SAMPLE TEXTS
════════════════════════════════════ */
const SAMPLES = {
  lorem: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.`,

  pangram: `The quick brown fox jumps over the lazy dog.\n\nPack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow. Waltz, bad nymph, for quick jigs vex.\n\nCrazily jump the quick jive fox with bovine oxen daze. Crazy Fredrick bought many very exquisite opal jewels. We promptly judged antique ivory buckles for the next prize.`,

  news: `Scientists Announce Breakthrough in Renewable Energy Storage\n\nResearchers at the Institute of Advanced Materials have developed a new type of solid-state battery that could revolutionize the storage of renewable energy. The technology, which uses a novel lithium-ceramic composite, offers three times the energy density of current lithium-ion batteries while maintaining stability across a temperature range of -40°C to 120°C.\n\n"This represents a fundamental shift in what's possible," said Dr. Elena Marchetti, the project's lead researcher. "We're no longer constrained by the traditional trade-off between energy density and safety." The team believes the technology could reach commercial production within five years, potentially accelerating the global transition away from fossil fuels.\n\nThe breakthrough comes at a critical moment, as energy storage remains one of the primary obstacles to widespread adoption of wind and solar power. Current grid-scale storage solutions are expensive and degrade quickly, limiting their practical deployment.`,

  technical: `/**\n * Calculates the WCAG 2.1 relative luminance of an sRGB color.\n * @param {number} r - Red channel (0-255)\n * @param {number} g - Green channel (0-255)\n * @param {number} b - Blue channel (0-255)\n * @returns {number} Relative luminance (0-1)\n */\nfunction getRelativeLuminance(r, g, b) {\n  const toLinear = (c) => {\n    const s = c / 255;\n    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);\n  };\n  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);\n}\n\n// Usage: contrast ratio between two colors\nconst L1 = getRelativeLuminance(0, 0, 0);\nconst L2 = getRelativeLuminance(255, 255, 255);\nconst ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);\nconsole.log(\`Contrast ratio: \${ratio.toFixed(2)}:1\`); // 21.00:1`,

  legal: `LIMITATION OF LIABILITY. IN NO EVENT SHALL THE LICENSOR, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (i) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (ii) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE, INCLUDING WITHOUT LIMITATION, ANY DEFAMATORY, OFFENSIVE, OR ILLEGAL CONDUCT OF OTHER USERS OR THIRD PARTIES; (iii) ANY CONTENT OBTAINED FROM THE SERVICE; AND (iv) UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE) OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.\n\nThe foregoing does not affect any warranties which cannot be excluded or limited under applicable law.`,

  childrens: `The Little Cloud's Journey\n\nOne morning, a small white cloud floated above a meadow full of yellow flowers. The cloud was very fluffy and very curious.\n\n"Where do you come from?" asked a bluebird, perched on a branch below.\n\n"From the sea," said the cloud proudly. "I am made of tiny drops of water that flew up into the sky."\n\nThe bluebird tilted her head. "And where are you going?"\n\nThe cloud thought for a moment. "Wherever the wind takes me. Today, perhaps I will make rain for those flowers."\n\nAnd with that, the little cloud drifted westward, growing darker and heavier, until — plip, plop, plip — the first drops fell, and the meadow drank deeply.`,

  custom: '',
};

/* ════════════════════════════════════
   COLOR PRESETS
════════════════════════════════════ */
const PRESETS = {
  accessibility: [
    { name: 'Black on White',     text: '#000000', bg: '#FFFFFF' },
    { name: 'White on Black',     text: '#FFFFFF', bg: '#000000' },
    { name: 'High Contrast Yellow', text: '#FFFF00', bg: '#000000' },
    { name: 'WCAG AA Min',        text: '#767676', bg: '#FFFFFF' },
  ],
  editorial: [
    { name: 'Newspaper',          text: '#1A1A1A', bg: '#F5F0E8' },
    { name: 'Sepia Book',         text: '#3B2A1A', bg: '#F0E6D0' },
    { name: 'Blueprint',          text: '#FFFFFF', bg: '#003366' },
    { name: 'Chalkboard',         text: '#F5F0C0', bg: '#1A3A1A' },
  ],
  modern: [
    { name: 'Dark Mode',          text: '#E0E0E0', bg: '#121212' },
    { name: 'GitHub Light',       text: '#24292F', bg: '#FFFFFF' },
    { name: 'VS Code Dark',       text: '#D4D4D4', bg: '#1E1E1E' },
    { name: 'Solarized Light',    text: '#657B83', bg: '#FDF6E3' },
    { name: 'Solarized Dark',     text: '#839496', bg: '#002B36' },
  ],
  bad: [
    { name: 'Low Contrast Gray',  text: '#AAAAAA', bg: '#FFFFFF', warn: 'Fails WCAG — contrast too low' },
    { name: 'Vibrating Colors',   text: '#FF0000', bg: '#00FF00', warn: 'Chromatic aberration — difficult for everyone' },
    { name: 'Invisible Text',     text: '#FEFEFE', bg: '#FFFFFF', warn: 'Nearly invisible — extreme failure' },
  ],
};

/* ════════════════════════════════════
   WEIGHT NAMES
════════════════════════════════════ */
const WEIGHT_NAMES = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};

/* ════════════════════════════════════
   LINE HEIGHT NAMES
════════════════════════════════════ */
function lineHeightName(v) {
  if (v <= 1.0)  return 'Tight';
  if (v <= 1.3)  return 'Snug';
  if (v <= 1.6)  return 'Normal';
  if (v <= 1.9)  return 'Relaxed';
  if (v <= 2.3)  return 'Airy';
  return 'Very Airy';
}

/* ════════════════════════════════════
   LETTER SPACING NAMES
════════════════════════════════════ */
function letterSpacingName(v) {
  if (v < -0.05)  return 'Very Tight';
  if (v < 0.01)   return 'Tight';
  if (v < 0.05)   return 'Normal';
  if (v < 0.15)   return 'Wide';
  return 'Very Wide';
}

/* ════════════════════════════════════
   COLOR MATH
════════════════════════════════════ */
function toLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(L1, L2) {
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function wcagLevel(ratio, isLargeText = false) {
  if (ratio >= 7)   return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3.0 && isLargeText) return 'AA Large';
  return 'Fail';
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const clamped = Math.max(0, Math.min(255, Math.round(v)));
    return clamped.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

/* ════════════════════════════════════
   APCA (simplified approximation)
   Based on APCA-W3 public algorithm outline
════════════════════════════════════ */
function apcaScore(textR, textG, textB, bgR, bgG, bgB) {
  const Ys = relativeLuminance(textR, textG, textB);
  const Yb = relativeLuminance(bgR, bgG, bgB);

  const Ntx = 0.57, Nbg = 0.56, Rtx = 0.62, Rbg = 0.65;
  const scale = 1.14;
  const loC   = 0.1;
  const offset = 0.027;

  let Lc;
  if (Yb >= Ys) {
    // Dark text on light bg
    const Sapc = (Math.pow(Yb, Nbg) - Math.pow(Ys, Ntx)) * scale;
    Lc = Sapc < loC ? 0 : Sapc - offset;
  } else {
    // Light text on dark bg
    const Sapc = (Math.pow(Yb, Rbg) - Math.pow(Ys, Rtx)) * scale;
    Lc = Sapc > -loC ? 0 : Sapc + offset;
  }
  return Math.round(Lc * 100);
}

/* ════════════════════════════════════
   CPL ESTIMATION
════════════════════════════════════ */
function estimateCPL(columnWidth, fontSize, fontFamily) {
  // Rough character width approximation based on font category
  let avgCharWidth = 0.5; // em units
  if (fontFamily.includes('Mono') || fontFamily.includes('Courier') || fontFamily.includes('Fira')) {
    avgCharWidth = 0.6;
  } else if (fontFamily.includes('Condensed') || fontFamily.includes('Narrow')) {
    avgCharWidth = 0.4;
  }
  return Math.round(columnWidth / (fontSize * avgCharWidth));
}

/* ════════════════════════════════════
   COMPOSITE SCORES
════════════════════════════════════ */
function readabilityScore(contrastR, cpl, lineH, fSize) {
  // Contrast: 40% weight — ideal is 7+ (AAA), min pass is 4.5
  const contrastScore = Math.min(100, (contrastR / 21) * 100) * 0.4;

  // CPL: 20% — ideal 45–75
  let cplScore = 0;
  if (cpl >= 45 && cpl <= 75) cplScore = 100;
  else if (cpl < 45) cplScore = Math.max(0, 100 - (45 - cpl) * 3);
  else cplScore = Math.max(0, 100 - (cpl - 75) * 2);
  const cplWeighted = cplScore * 0.2;

  // Line height: 20% — ideal 1.4–1.8
  let lhScore = 0;
  if (lineH >= 1.4 && lineH <= 1.8) lhScore = 100;
  else if (lineH < 1.4) lhScore = Math.max(0, 100 - (1.4 - lineH) * 200);
  else lhScore = Math.max(0, 100 - (lineH - 1.8) * 80);
  const lhWeighted = lhScore * 0.2;

  // Font size: 20% — ideal 14–24px
  let fsScore = 0;
  if (fSize >= 14 && fSize <= 24) fsScore = 100;
  else if (fSize < 14) fsScore = Math.max(0, 100 - (14 - fSize) * 12);
  else fsScore = Math.max(0, 100 - (fSize - 24) * 4);
  const fsWeighted = fsScore * 0.2;

  return Math.round(contrastScore + cplWeighted + lhWeighted + fsWeighted);
}

function opticalClarityIndex(fontSize, fontWeight, letterSpacing) {
  // Font size: optimal 12–22px → score 0–4
  let sizeScore = 0;
  if (fontSize >= 12 && fontSize <= 22) sizeScore = 4;
  else if (fontSize >= 9 && fontSize < 12) sizeScore = 2 + (fontSize - 9) / 3 * 2;
  else if (fontSize > 22 && fontSize <= 36) sizeScore = 4 - (fontSize - 22) / 14 * 1.5;
  else sizeScore = Math.max(0, 2 - Math.abs(fontSize - 15) * 0.1);

  // Weight: optimal 300–600 → score 0–3
  let weightScore = 0;
  if (fontWeight >= 300 && fontWeight <= 600) weightScore = 3;
  else if (fontWeight < 300) weightScore = fontWeight / 300 * 3;
  else weightScore = Math.max(0, 3 - (fontWeight - 600) / 300 * 2);

  // Letter spacing: optimal -0.02–0.08em → score 0–3
  let lsScore = 0;
  if (letterSpacing >= -0.02 && letterSpacing <= 0.08) lsScore = 3;
  else lsScore = Math.max(0, 3 - Math.abs(letterSpacing - 0.03) * 15);

  return Math.min(10, Math.round((sizeScore + weightScore + lsScore) * 10) / 10);
}

/* ════════════════════════════════════
   DOM REFS
════════════════════════════════════ */
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

const els = {
  textR:    $('text-r'),   textG:   $('text-g'),   textB:   $('text-b'),
  textRNum: $('text-r-num'), textGNum: $('text-g-num'), textBNum: $('text-b-num'),
  textHex:  $('text-hex'), textSwatch: $('text-color-swatch'),
  bgR:      $('bg-r'),     bgG:     $('bg-g'),     bgB:     $('bg-b'),
  bgRNum:   $('bg-r-num'), bgGNum:  $('bg-g-num'), bgBNum:  $('bg-b-num'),
  bgHex:    $('bg-hex'),   bgSwatch: $('bg-color-swatch'),
  swapBtn:  $('swap-colors'),

  fontSize:      $('font-size'),      fontSizeDisplay:  $('font-size-display'),
  fontFamily:    $('font-family'),
  fontWeight:    $('font-weight'),    fontWeightDisplay: $('font-weight-display'),
  lineHeight:    $('line-height'),    lineHeightDisplay: $('line-height-display'),
  letterSpacing: $('letter-spacing'), letterSpacingDisplay: $('letter-spacing-display'),
  columnWidth:   $('column-width'),   columnWidthDisplay: $('column-width-display'),

  contrastRatio:  $('contrast-ratio'),   wcagBadge:     $('wcag-badge'),
  contrastBar:    $('contrast-bar'),     textLuminance: $('text-luminance'),
  bgLuminance:    $('bg-luminance'),     cplValue:      $('cpl-value'),
  cplNote:        $('cpl-note'),         cplBar:        $('cpl-bar'),
  readabilityScore: $('readability-score'), readabilityBar: $('readability-bar'),
  ociValue:       $('oci-value'),        ociBar:        $('oci-bar'),
  apcaValue:      $('apca-value'),       apcaBar:       $('apca-bar'),
  metricsLive:    $('metrics-live'),

  canvasContent:  $('canvas-content'),  canvasText: $('canvas-text'),
  canvasNormal:   $('canvas-normal'),   canvasComparison: $('canvas-comparison'),

  sampleType:   $('sample-text-type'), customTextArea: $('custom-text'),
  customGroup:  $('custom-text-group'),

  envSimulation:  $('env-simulation'),  envOverlay:    $('env-overlay'),
  glaucomaOverlay: $('glaucoma-overlay'),

  lineFocusOverlay: $('line-focus-overlay'),
  rulerLine:        $('ruler-line'),
  readingMaskTop:   $('reading-mask-top'),
  readingMaskBottom:$('reading-mask-bottom'),

  compareToggle:    $('compare-toggle'),
  saveSnapshot:     $('save-snapshot'),
  snapshotStatus:   $('snapshot-status'),
  compareCanvasCurrent: $('compare-canvas-current'),
  compareCanvasSnapshot: $('compare-canvas-snapshot'),
  compareMetricsCurrent: $('compare-metrics-current'),
  compareMetricsSnapshot: $('compare-metrics-snapshot'),

  copyCss:      $('copy-css'),
  shareLink:    $('share-link'),
  exportReport: $('export-report'),
  exportFeedback: $('export-feedback'),

  historyStrip: $('history-strip'),
};

/* ════════════════════════════════════
   UPDATE FUNCTIONS
════════════════════════════════════ */

function updateColorFromRgb(which) {
  const r = parseInt(which === 'text' ? els.textR.value : els.bgR.value);
  const g = parseInt(which === 'text' ? els.textG.value : els.bgG.value);
  const b = parseInt(which === 'text' ? els.textB.value : els.bgB.value);

  if (which === 'text') {
    state.text = { r, g, b };
    els.textRNum.value = r; els.textGNum.value = g; els.textBNum.value = b;
    els.textHex.value  = rgbToHex(r, g, b);
    els.textSwatch.style.background = `rgb(${r},${g},${b})`;
  } else {
    state.bg = { r, g, b };
    els.bgRNum.value = r; els.bgGNum.value = g; els.bgBNum.value = b;
    els.bgHex.value  = rgbToHex(r, g, b);
    els.bgSwatch.style.background = `rgb(${r},${g},${b})`;
  }
  applyAll();
}

function setColor(which, r, g, b) {
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));

  if (which === 'text') {
    state.text = { r, g, b };
    els.textR.value = r; els.textG.value = g; els.textB.value = b;
    els.textRNum.value = r; els.textGNum.value = g; els.textBNum.value = b;
    els.textHex.value = rgbToHex(r, g, b);
    els.textSwatch.style.background = `rgb(${r},${g},${b})`;
  } else {
    state.bg = { r, g, b };
    els.bgR.value = r; els.bgG.value = g; els.bgB.value = b;
    els.bgRNum.value = r; els.bgGNum.value = g; els.bgBNum.value = b;
    els.bgHex.value = rgbToHex(r, g, b);
    els.bgSwatch.style.background = `rgb(${r},${g},${b})`;
  }
}

function applyAll() {
  const { text, bg, fontSize, fontFamily, fontWeight, lineHeight, letterSpacing, columnWidth, textAlign } = state;

  // Apply to canvas
  const content = els.canvasContent;
  content.style.color           = `rgb(${text.r},${text.g},${text.b})`;
  content.style.backgroundColor = `rgb(${bg.r},${bg.g},${bg.b})`;
  content.style.fontSize        = `${fontSize}px`;
  content.style.fontFamily      = fontFamily;
  content.style.fontWeight      = fontWeight;
  content.style.lineHeight      = lineHeight;
  content.style.letterSpacing   = `${letterSpacing}em`;
  content.style.maxWidth        = `${columnWidth}px`;
  content.style.width           = `${columnWidth}px`;
  content.style.textAlign       = textAlign;
  content.style.wordSpacing     = state.aids.wordSpacing ? '0.5em' : '';

  // Update metrics
  updateMetrics();

  // Update comparison if active
  if (state.compareMode) updateComparisonCurrent();
}

function updateMetrics() {
  const { text, bg, fontSize, fontFamily, lineHeight, columnWidth } = state;
  const Ltext = relativeLuminance(text.r, text.g, text.b);
  const Lbg   = relativeLuminance(bg.r, bg.g, bg.b);
  const ratio  = contrastRatio(Ltext, Lbg);
  const isLarge = fontSize >= 18 || (fontSize >= 14 && state.fontWeight >= 700);
  const level  = wcagLevel(ratio, isLarge);
  const cpl    = estimateCPL(columnWidth, fontSize, fontFamily);
  const rs     = readabilityScore(ratio, cpl, lineHeight, fontSize);
  const oci    = opticalClarityIndex(fontSize, state.fontWeight, state.letterSpacing);
  const apca   = apcaScore(text.r, text.g, text.b, bg.r, bg.g, bg.b);

  // Contrast ratio
  animateMetric(els.contrastRatio, `${ratio.toFixed(2)}:1`);
  const barPct = Math.min(100, (ratio / 21) * 100);
  els.contrastBar.style.width = `${barPct}%`;

  // Color the bar by level
  els.contrastBar.className = 'metric-bar ' + (ratio >= 7 ? 'bar-good' : ratio >= 4.5 ? 'bar-warn' : 'bar-bad');
  els.contrastRatio.className = 'metric-value ' + (ratio >= 7 ? 'metric-good' : ratio >= 4.5 ? 'metric-warn' : 'metric-bad');

  // WCAG badge
  els.wcagBadge.textContent = level;
  els.wcagBadge.className = 'metric-badge ' + (
    level === 'AAA'      ? 'badge-aaa'      :
    level === 'AA'       ? 'badge-aa'       :
    level === 'AA Large' ? 'badge-aa-large' : 'badge-fail'
  );

  // Luminance
  els.textLuminance.textContent = Ltext.toFixed(3);
  els.bgLuminance.textContent   = Lbg.toFixed(3);

  // CPL
  animateMetric(els.cplValue, `~${cpl} CPL`);
  const cplOk = cpl >= 45 && cpl <= 75;
  const cplNear = (cpl >= 35 && cpl < 45) || (cpl > 75 && cpl <= 90);
  els.cplValue.className = 'metric-value ' + (cplOk ? 'metric-good' : cplNear ? 'metric-warn' : 'metric-bad');
  els.cplNote.textContent = cplOk ? '✓ Ideal range' : cpl < 45 ? '↑ Lines too short' : '↓ Lines too long';
  els.cplBar.style.width = `${Math.min(100, (cpl / 100) * 100)}%`;
  els.cplBar.className = 'metric-bar ' + (cplOk ? 'bar-good' : cplNear ? 'bar-warn' : 'bar-bad');

  // Readability
  animateMetric(els.readabilityScore, rs);
  els.readabilityScore.className = 'metric-value ' + (rs >= 75 ? 'metric-good' : rs >= 50 ? 'metric-warn' : 'metric-bad');
  els.readabilityBar.style.width = `${rs}%`;
  els.readabilityBar.className = 'metric-bar ' + (rs >= 75 ? 'bar-good' : rs >= 50 ? 'bar-warn' : 'bar-bad');

  // OCI
  animateMetric(els.ociValue, oci.toFixed(1));
  els.ociValue.className = 'metric-value ' + (oci >= 7 ? 'metric-good' : oci >= 5 ? 'metric-warn' : 'metric-bad');
  els.ociBar.style.width = `${oci * 10}%`;
  els.ociBar.className = 'metric-bar ' + (oci >= 7 ? 'bar-good' : oci >= 5 ? 'bar-warn' : 'bar-bad');

  // APCA
  const apcaAbs = Math.abs(apca);
  animateMetric(els.apcaValue, apca);
  els.apcaValue.className = 'metric-value ' + (apcaAbs >= 75 ? 'metric-good' : apcaAbs >= 45 ? 'metric-warn' : 'metric-bad');
  els.apcaBar.style.width = `${Math.min(100, apcaAbs / 1.06)}%`;
  els.apcaBar.className = 'metric-bar ' + (apcaAbs >= 75 ? 'bar-good' : apcaAbs >= 45 ? 'bar-warn' : 'bar-bad');

  // Screen reader announcement
  els.metricsLive.textContent = `Contrast ${ratio.toFixed(2)} to 1, WCAG ${level}, readability score ${rs} out of 100`;
}

let metricAnimTimeout = {};
function animateMetric(el, val) {
  const strVal = String(val);
  if (el.textContent === strVal) return;
  el.textContent = strVal;
  el.classList.remove('changed');
  void el.offsetWidth; // reflow
  el.classList.add('changed');
}

/* ════════════════════════════════════
   TEXT CONTENT
════════════════════════════════════ */
function getTextContent() {
  const type = state.sampleType;
  let text = type === 'custom' ? (state.customText || 'Enter your custom text in the panel.') : (SAMPLES[type] || SAMPLES.lorem);
  return text;
}

function applyTextCase(text) {
  switch (state.textCase) {
    case 'upper':      return text.toUpperCase();
    case 'lower':      return text.toLowerCase();
    case 'title':      return text.replace(/\b\w/g, c => c.toUpperCase());
    case 'small-caps': return text; // handled via CSS font-variant
    default:           return text;
  }
}

function renderText() {
  const raw  = applyTextCase(getTextContent());
  const lines = raw.split('\n').filter(l => l.trim() !== '');

  if (state.aids.bionic) {
    els.canvasText.innerHTML = lines.map(line =>
      `<p>${applyBionic(line)}</p>`
    ).join('');
  } else {
    els.canvasText.innerHTML = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
  }

  // Small caps CSS
  els.canvasText.style.fontVariant = state.textCase === 'small-caps' ? 'small-caps' : '';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applyBionic(line) {
  return line.split(' ').map(word => {
    if (word.length <= 1) return escapeHtml(word);
    const mid = Math.ceil(word.length / 2);
    return `<b class="bionic-bold">${escapeHtml(word.slice(0, mid))}</b>${escapeHtml(word.slice(mid))}`;
  }).join(' ');
}

/* ════════════════════════════════════
   VISION SIMULATION
════════════════════════════════════ */
function applyVision(mode) {
  const canvas = els.canvasContent;
  // Remove all vision classes
  canvas.classList.remove(
    'vision-protanopia', 'vision-deuteranopia', 'vision-tritanopia',
    'vision-achromatopsia', 'vision-low-contrast', 'vision-blur',
    'vision-cataracts'
  );
  els.glaucomaOverlay.classList.add('hidden');

  if (mode !== 'none') {
    if (mode === 'glaucoma') {
      els.glaucomaOverlay.classList.remove('hidden');
    } else {
      canvas.classList.add(`vision-${mode}`);
    }
  }
}

/* ════════════════════════════════════
   ENVIRONMENTAL SIMULATION
════════════════════════════════════ */
function applyEnvironment(mode) {
  const overlay = els.envOverlay;
  overlay.className = 'env-overlay';
  if (mode !== 'none') {
    overlay.classList.add(`env-${mode}`);
  }
}

/* ════════════════════════════════════
   HISTORY
════════════════════════════════════ */
function saveHistory() {
  const snap = {
    text: { ...state.text },
    bg:   { ...state.bg },
    fontSize:      state.fontSize,
    fontFamily:    state.fontFamily,
    fontWeight:    state.fontWeight,
    lineHeight:    state.lineHeight,
    letterSpacing: state.letterSpacing,
    columnWidth:   state.columnWidth,
    textAlign:     state.textAlign,
  };
  // Avoid duplicating identical consecutive entries
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (JSON.stringify(last) === JSON.stringify(snap)) return;
  }
  history.push(snap);
  if (history.length > MAX_HISTORY) history.shift();
  renderHistory();
}

function renderHistory() {
  els.historyStrip.innerHTML = '';
  history.slice().reverse().forEach((snap, i) => {
    const btn = document.createElement('button');
    btn.className = 'history-thumb';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `History state ${history.length - i}: text ${rgbToHex(snap.text.r,snap.text.g,snap.text.b)} on ${rgbToHex(snap.bg.r,snap.bg.g,snap.bg.b)}`);
    btn.style.background = `rgb(${snap.bg.r},${snap.bg.g},${snap.bg.b})`;
    btn.style.borderColor = `rgb(${snap.text.r},${snap.text.g},${snap.text.b})`;
    const span = document.createElement('span');
    span.className = 'thumb-text';
    span.textContent = 'Aa';
    span.style.color = `rgb(${snap.text.r},${snap.text.g},${snap.text.b})`;
    btn.appendChild(span);
    btn.addEventListener('click', () => restoreHistory(history.length - 1 - i));
    els.historyStrip.appendChild(btn);
  });
}

function restoreHistory(idx) {
  const snap = history[idx];
  if (!snap) return;
  setColor('text', snap.text.r, snap.text.g, snap.text.b);
  setColor('bg',   snap.bg.r,   snap.bg.g,   snap.bg.b);
  state.fontSize      = snap.fontSize;
  state.fontFamily    = snap.fontFamily;
  state.fontWeight    = snap.fontWeight;
  state.lineHeight    = snap.lineHeight;
  state.letterSpacing = snap.letterSpacing;
  state.columnWidth   = snap.columnWidth;
  state.textAlign     = snap.textAlign;

  els.fontSize.value      = snap.fontSize;
  els.fontFamily.value    = snap.fontFamily;
  els.fontWeight.value    = snap.fontWeight;
  els.lineHeight.value    = snap.lineHeight;
  els.letterSpacing.value = snap.letterSpacing;
  els.columnWidth.value   = snap.columnWidth;

  updateSliderDisplays();
  applyAll();
  renderText();
}

function updateSliderDisplays() {
  const fs = state.fontSize;
  els.fontSizeDisplay.textContent      = `${fs}px / ${Math.round(fs * 0.75)}pt`;
  els.fontWeightDisplay.textContent    = `${state.fontWeight} — ${WEIGHT_NAMES[state.fontWeight] || ''}`;
  els.lineHeightDisplay.textContent    = `${Number(state.lineHeight).toFixed(1)} — ${lineHeightName(state.lineHeight)}`;
  els.letterSpacingDisplay.textContent = `${Number(state.letterSpacing).toFixed(2)}em — ${letterSpacingName(state.letterSpacing)}`;
  const cpl = estimateCPL(state.columnWidth, state.fontSize, state.fontFamily);
  els.columnWidthDisplay.textContent   = `${state.columnWidth}px — ~${cpl} CPL`;
}

/* ════════════════════════════════════
   COMPARISON MODE
════════════════════════════════════ */
function updateComparisonCurrent() {
  const { text, bg, fontSize, fontFamily, fontWeight, lineHeight, letterSpacing, columnWidth, textAlign } = state;
  const c = els.compareCanvasCurrent;
  c.style.color           = `rgb(${text.r},${text.g},${text.b})`;
  c.style.backgroundColor = `rgb(${bg.r},${bg.g},${bg.b})`;
  c.style.fontSize        = `${fontSize}px`;
  c.style.fontFamily      = fontFamily;
  c.style.fontWeight      = fontWeight;
  c.style.lineHeight      = lineHeight;
  c.style.letterSpacing   = `${letterSpacing}em`;
  c.style.textAlign       = textAlign;
  c.innerHTML             = els.canvasText.innerHTML;
  renderCompareMetrics('current', text, bg, fontSize, fontFamily, lineHeight, columnWidth, fontWeight, letterSpacing);
}

function updateComparisonSnapshot(snap) {
  if (!snap) return;
  const c = els.compareCanvasSnapshot;
  c.style.color           = `rgb(${snap.text.r},${snap.text.g},${snap.text.b})`;
  c.style.backgroundColor = `rgb(${snap.bg.r},${snap.bg.g},${snap.bg.b})`;
  c.style.fontSize        = `${snap.fontSize}px`;
  c.style.fontFamily      = snap.fontFamily;
  c.style.fontWeight      = snap.fontWeight;
  c.style.lineHeight      = snap.lineHeight;
  c.style.letterSpacing   = `${snap.letterSpacing}em`;
  c.style.textAlign       = snap.textAlign;
  c.innerHTML             = els.canvasText.innerHTML;
  renderCompareMetrics('snapshot', snap.text, snap.bg, snap.fontSize, snap.fontFamily, snap.lineHeight, snap.columnWidth, snap.fontWeight, snap.letterSpacing);
}

function renderCompareMetrics(which, text, bg, fontSize, fontFamily, lineHeight, colWidth, fontWeight, letterSpacing) {
  const Ltext = relativeLuminance(text.r, text.g, text.b);
  const Lbg   = relativeLuminance(bg.r, bg.g, bg.b);
  const ratio = contrastRatio(Ltext, Lbg);
  const level = wcagLevel(ratio, fontSize >= 18);
  const cpl   = estimateCPL(colWidth || 600, fontSize, fontFamily);
  const rs    = readabilityScore(ratio, cpl, lineHeight, fontSize);
  const oci   = opticalClarityIndex(fontSize, fontWeight, letterSpacing);

  const el = which === 'current' ? els.compareMetricsCurrent : els.compareMetricsSnapshot;
  el.innerHTML = `
    <div class="cmp-metric">
      <div class="cmp-metric-label">CONTRAST</div>
      <div class="cmp-metric-value">${ratio.toFixed(2)}:1 ${level}</div>
    </div>
    <div class="cmp-metric">
      <div class="cmp-metric-label">READABILITY</div>
      <div class="cmp-metric-value">${rs}/100</div>
    </div>
    <div class="cmp-metric">
      <div class="cmp-metric-label">CPL</div>
      <div class="cmp-metric-value">~${cpl}</div>
    </div>
    <div class="cmp-metric">
      <div class="cmp-metric-label">OPTICAL CLARITY</div>
      <div class="cmp-metric-value">${oci.toFixed(1)}/10</div>
    </div>`;
}

/* ════════════════════════════════════
   EXPORT & SHARE
════════════════════════════════════ */
function generateCss() {
  return `/* Readability Explorer — Exported Settings */
color: ${rgbToHex(state.text.r, state.text.g, state.text.b)};
background-color: ${rgbToHex(state.bg.r, state.bg.g, state.bg.b)};
font-family: ${state.fontFamily};
font-size: ${state.fontSize}px;
font-weight: ${state.fontWeight};
line-height: ${state.lineHeight};
letter-spacing: ${state.letterSpacing}em;
text-align: ${state.textAlign};
max-width: ${state.columnWidth}px;`;
}

function showFeedback(msg) {
  els.exportFeedback.textContent = msg;
  setTimeout(() => { els.exportFeedback.textContent = ''; }, 3000);
}

function encodeStateToUrl() {
  const params = new URLSearchParams({
    tr: state.text.r, tg: state.text.g, tb: state.text.b,
    br: state.bg.r,   bg: state.bg.g,   bb: state.bg.b,
    fs: state.fontSize,
    ff: state.fontFamily,
    fw: state.fontWeight,
    lh: state.lineHeight,
    ls: state.letterSpacing,
    cw: state.columnWidth,
    ta: state.textAlign,
    st: state.sampleType,
  });
  return `${location.href.split('?')[0]}?${params.toString()}`;
}

function loadStateFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has('tr')) return;
  setColor('text', +params.get('tr'), +params.get('tg'), +params.get('tb'));
  setColor('bg',   +params.get('br'), +params.get('bg'), +params.get('bb'));
  state.fontSize      = +params.get('fs') || 16;
  state.fontFamily    = params.get('ff')  || 'Georgia, serif';
  state.fontWeight    = +params.get('fw') || 400;
  state.lineHeight    = +params.get('lh') || 1.5;
  state.letterSpacing = +params.get('ls') || 0;
  state.columnWidth   = +params.get('cw') || 600;
  state.textAlign     = params.get('ta')  || 'left';
  state.sampleType    = params.get('st')  || 'lorem';

  els.fontSize.value      = state.fontSize;
  els.fontWeight.value    = state.fontWeight;
  els.lineHeight.value    = state.lineHeight;
  els.letterSpacing.value = state.letterSpacing;
  els.columnWidth.value   = state.columnWidth;
  // Font family match
  [...els.fontFamily.options].forEach(o => { if (o.value === state.fontFamily) o.selected = true; });
  els.sampleType.value = state.sampleType;

  updateSliderDisplays();
  updateAlignButtons();
}

function generateReport() {
  const Ltext = relativeLuminance(state.text.r, state.text.g, state.text.b);
  const Lbg   = relativeLuminance(state.bg.r, state.bg.g, state.bg.b);
  const ratio = contrastRatio(Ltext, Lbg);
  const level = wcagLevel(ratio, state.fontSize >= 18);
  const cpl   = estimateCPL(state.columnWidth, state.fontSize, state.fontFamily);
  const rs    = readabilityScore(ratio, cpl, state.lineHeight, state.fontSize);
  const oci   = opticalClarityIndex(state.fontSize, state.fontWeight, state.letterSpacing);
  const apca  = apcaScore(state.text.r, state.text.g, state.text.b, state.bg.r, state.bg.g, state.bg.b);
  const textHex = rgbToHex(state.text.r, state.text.g, state.text.b);
  const bgHex   = rgbToHex(state.bg.r, state.bg.g, state.bg.b);

  const reportHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Readability Explorer — Report</title>
<style>
  body { font-family: 'IBM Plex Mono', monospace; background: #0d0d0d; color: #e8e4dc; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 18px; letter-spacing: 0.1em; color: #C8A84B; border-bottom: 1px solid #333; padding-bottom: 12px; }
  h2 { font-size: 11px; letter-spacing: 0.14em; color: #888; margin: 28px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { background: #161616; border: 1px solid #2a2a2a; padding: 12px; }
  .card-label { font-size: 8px; letter-spacing: 0.12em; color: #555; margin-bottom: 4px; }
  .card-value { font-size: 22px; font-weight: 600; }
  .preview { padding: 32px 40px; margin: 16px 0; box-shadow: 0 2px 20px rgba(0,0,0,0.5); }
  .css-block { background: #161616; border: 1px solid #2a2a2a; padding: 16px; font-size: 12px; line-height: 1.6; white-space: pre; overflow-x: auto; }
  .good { color: #4CAF82; } .warn { color: #D4A017; } .bad { color: #C0392B; }
  .badge { display: inline-block; padding: 2px 8px; font-size: 9px; border-radius: 2px; font-weight: 600; }
  .badge-aaa { background: rgba(76,175,130,0.25); color: #2ECC71; border: 1px solid rgba(76,175,130,0.5); }
  .badge-aa  { background: rgba(76,175,130,0.15); color: #4CAF82; border: 1px solid rgba(76,175,130,0.35); }
  .badge-fail{ background: rgba(192,57,43,0.25);  color: #E74C3C; border: 1px solid rgba(192,57,43,0.4); }
  footer { margin-top: 40px; font-size: 9px; color: #444; letter-spacing: 0.1em; }
</style></head><body>
<h1>READABILITY EXPLORER — REPORT</h1>
<p style="font-size:9px;color:#555;letter-spacing:0.08em;">Generated ${new Date().toLocaleString()}</p>

<h2>TEXT PREVIEW</h2>
<div class="preview" style="color:${textHex};background-color:${bgHex};font-family:${state.fontFamily};font-size:${state.fontSize}px;font-weight:${state.fontWeight};line-height:${state.lineHeight};letter-spacing:${state.letterSpacing}em;text-align:${state.textAlign};max-width:${state.columnWidth}px;">
  The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
</div>

<h2>METRICS</h2>
<div class="grid">
  <div class="card">
    <div class="card-label">WCAG CONTRAST RATIO</div>
    <div class="card-value ${ratio >= 7 ? 'good' : ratio >= 4.5 ? 'warn' : 'bad'}">${ratio.toFixed(2)}:1</div>
    <span class="badge ${level === 'AAA' ? 'badge-aaa' : level.startsWith('AA') ? 'badge-aa' : 'badge-fail'}">${level}</span>
  </div>
  <div class="card">
    <div class="card-label">READABILITY SCORE</div>
    <div class="card-value ${rs >= 75 ? 'good' : rs >= 50 ? 'warn' : 'bad'}">${rs}<span style="font-size:12px">/100</span></div>
  </div>
  <div class="card">
    <div class="card-label">CHARS PER LINE (EST.)</div>
    <div class="card-value ${(cpl>=45&&cpl<=75)?'good':(cpl>=35&&cpl<=90)?'warn':'bad'}">~${cpl} CPL</div>
  </div>
  <div class="card">
    <div class="card-label">OPTICAL CLARITY INDEX</div>
    <div class="card-value ${oci >= 7 ? 'good' : oci >= 5 ? 'warn' : 'bad'}">${oci.toFixed(1)}<span style="font-size:12px">/10</span></div>
  </div>
  <div class="card">
    <div class="card-label">APCA SCORE</div>
    <div class="card-value">${apca} Lc</div>
  </div>
  <div class="card">
    <div class="card-label">TEXT LUMINANCE / BG LUMINANCE</div>
    <div class="card-value" style="font-size:14px">${Ltext.toFixed(3)} / ${Lbg.toFixed(3)}</div>
  </div>
</div>

<h2>SETTINGS</h2>
<div class="grid">
  <div class="card"><div class="card-label">TEXT COLOR</div><div class="card-value" style="font-size:16px">${textHex}</div></div>
  <div class="card"><div class="card-label">BACKGROUND</div><div class="card-value" style="font-size:16px">${bgHex}</div></div>
  <div class="card"><div class="card-label">FONT FAMILY</div><div class="card-value" style="font-size:13px">${state.fontFamily.split(',')[0]}</div></div>
  <div class="card"><div class="card-label">FONT SIZE / WEIGHT</div><div class="card-value" style="font-size:14px">${state.fontSize}px / ${state.fontWeight}</div></div>
  <div class="card"><div class="card-label">LINE HEIGHT</div><div class="card-value" style="font-size:16px">${state.lineHeight}</div></div>
  <div class="card"><div class="card-label">LETTER SPACING</div><div class="card-value" style="font-size:16px">${state.letterSpacing}em</div></div>
</div>

<h2>CSS SNIPPET</h2>
<div class="css-block">${generateCss()}</div>

<footer>READABILITY EXPLORER · Typography & Contrast Lab</footer>
</body></html>`;

  const blob = new Blob([reportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'readability-report.html'; a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════
   READABILITY AIDS
════════════════════════════════════ */
function updateLineFocus(e) {
  if (!state.aids.lineFocus) return;
  const canvas = els.canvasContent;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  els.lineFocusOverlay.style.top = `${y - state.fontSize * state.lineHeight / 2}px`;
}

function updateReadingMask(e) {
  if (!state.aids.readingMask) return;
  const canvas = els.canvasContent;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const lineH = state.fontSize * state.lineHeight;
  const windowH = lineH * 3;
  const topOfWindow = y - windowH / 2;
  const bottomOfWindow = y + windowH / 2;
  els.readingMaskTop.style.height    = `${Math.max(0, topOfWindow)}px`;
  els.readingMaskBottom.style.top    = `${bottomOfWindow}px`;
  els.readingMaskBottom.style.height = `${Math.max(0, rect.height - bottomOfWindow)}px`;
}

/* Ruler drag */
function initRuler() {
  const ruler = els.rulerLine;
  ruler.style.top = `${rulerY}px`;

  ruler.addEventListener('mousedown', e => {
    rulerDragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!rulerDragging) return;
    const area = els.canvasContent.getBoundingClientRect();
    rulerY = Math.max(0, Math.min(area.height, e.clientY - area.top));
    ruler.style.top = `${rulerY}px`;
  });
  document.addEventListener('mouseup', () => { rulerDragging = false; });
}

/* ════════════════════════════════════
   COLLAPSIBLE SECTIONS
════════════════════════════════════ */
function initSectionToggles() {
  document.querySelectorAll('.section-header[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bodyId = btn.dataset.toggle;
      const body = document.getElementById(bodyId);
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
      body.classList.toggle('collapsed', expanded);
    });
  });
}

/* ════════════════════════════════════
   COLOR PRESETS — Build
════════════════════════════════════ */
function buildPresets() {
  Object.entries(PRESETS).forEach(([category, presets]) => {
    const container = $(`preset-${category}`);
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'preset-chip';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('tabindex', '0');
      btn.title = p.warn || p.name;
      btn.setAttribute('aria-label', `Apply preset: ${p.name}`);

      const swatch = document.createElement('div');
      swatch.className = 'chip-swatch';
      swatch.style.background = `linear-gradient(90deg, ${p.text} 50%, ${p.bg} 50%)`;

      const label = document.createElement('span');
      label.textContent = p.name;

      btn.appendChild(swatch);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        const tc = hexToRgb(p.text);
        const bc = hexToRgb(p.bg);
        if (!tc || !bc) return;
        setColor('text', tc.r, tc.g, tc.b);
        setColor('bg',   bc.r, bc.g, bc.b);
        saveHistory();
        applyAll();
      });
      container.appendChild(btn);
    });
  });
}

/* ════════════════════════════════════
   ALIGN BUTTONS
════════════════════════════════════ */
function updateAlignButtons() {
  document.querySelectorAll('.align-btn').forEach(btn => {
    const active = btn.dataset.align === state.textAlign;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });
}

/* ════════════════════════════════════
   EVENT WIRING
════════════════════════════════════ */
function wireEvents() {
  // ── Color sliders / number inputs ──
  ['text', 'bg'].forEach(which => {
    ['r','g','b'].forEach(ch => {
      const slider = $(`${which}-${ch}`);
      const num    = $(`${which}-${ch}-num`);
      slider.addEventListener('input', () => {
        num.value = slider.value;
        updateColorFromRgb(which);
      });
      num.addEventListener('input', () => {
        const v = Math.max(0, Math.min(255, parseInt(num.value) || 0));
        slider.value = v;
        num.value = v;
        updateColorFromRgb(which);
      });
    });
    // Hex input
    const hexEl = which === 'text' ? els.textHex : els.bgHex;
    hexEl.addEventListener('change', () => {
      const hex = hexEl.value.startsWith('#') ? hexEl.value : `#${hexEl.value}`;
      const rgb = hexToRgb(hex);
      if (rgb) {
        setColor(which, rgb.r, rgb.g, rgb.b);
        applyAll();
        saveHistory();
      } else {
        // Restore
        const { r, g, b } = which === 'text' ? state.text : state.bg;
        hexEl.value = rgbToHex(r, g, b);
      }
    });
  });

  // Swap
  els.swapBtn.addEventListener('click', () => {
    const { text, bg } = state;
    setColor('text', bg.r, bg.g, bg.b);
    setColor('bg', text.r, text.g, text.b);
    saveHistory();
    applyAll();
  });

  // ── Typography sliders ──
  els.fontSize.addEventListener('input', () => {
    state.fontSize = +els.fontSize.value;
    els.fontSizeDisplay.textContent = `${state.fontSize}px / ${Math.round(state.fontSize * 0.75)}pt`;
    applyAll(); updateSliderDisplays();
  });
  els.fontSize.addEventListener('change', saveHistory);

  // Size presets
  document.querySelectorAll('.size-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = +btn.dataset.size;
      state.fontSize = size;
      els.fontSize.value = size;
      els.fontSizeDisplay.textContent = `${size}px / ${Math.round(size * 0.75)}pt`;
      applyAll(); updateSliderDisplays(); saveHistory();
    });
  });

  els.fontFamily.addEventListener('change', () => {
    state.fontFamily = els.fontFamily.value;
    applyAll(); updateSliderDisplays(); saveHistory();
  });

  els.fontWeight.addEventListener('input', () => {
    state.fontWeight = +els.fontWeight.value;
    els.fontWeightDisplay.textContent = `${state.fontWeight} — ${WEIGHT_NAMES[state.fontWeight] || ''}`;
    applyAll();
  });
  els.fontWeight.addEventListener('change', saveHistory);

  els.lineHeight.addEventListener('input', () => {
    state.lineHeight = +els.lineHeight.value;
    els.lineHeightDisplay.textContent = `${Number(state.lineHeight).toFixed(1)} — ${lineHeightName(state.lineHeight)}`;
    applyAll();
  });
  els.lineHeight.addEventListener('change', saveHistory);

  els.letterSpacing.addEventListener('input', () => {
    state.letterSpacing = +els.letterSpacing.value;
    els.letterSpacingDisplay.textContent = `${Number(state.letterSpacing).toFixed(2)}em — ${letterSpacingName(state.letterSpacing)}`;
    applyAll();
  });
  els.letterSpacing.addEventListener('change', saveHistory);

  els.columnWidth.addEventListener('input', () => {
    state.columnWidth = +els.columnWidth.value;
    const cpl = estimateCPL(state.columnWidth, state.fontSize, state.fontFamily);
    els.columnWidthDisplay.textContent = `${state.columnWidth}px — ~${cpl} CPL`;
    applyAll();
  });
  els.columnWidth.addEventListener('change', saveHistory);

  // Text alignment
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.textAlign = btn.dataset.align;
      updateAlignButtons();
      applyAll(); saveHistory();
    });
  });

  // ── Vision simulation ──
  document.querySelectorAll('.vision-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vision-btn').forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      state.vision = btn.dataset.vision;
      applyVision(state.vision);
    });
  });

  // ── Sample text ──
  els.sampleType.addEventListener('change', () => {
    state.sampleType = els.sampleType.value;
    els.customGroup.style.display = state.sampleType === 'custom' ? 'block' : 'none';
    renderText();
  });
  els.customTextArea.addEventListener('input', () => {
    state.customText = els.customTextArea.value;
    renderText();
  });

  // Case buttons
  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.case-btn').forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      state.textCase = btn.dataset.case;
      renderText();
    });
  });

  // ── Readability aids ──
  $('aid-bionic').addEventListener('change', e => {
    state.aids.bionic = e.target.checked;
    renderText();
  });
  $('aid-line-focus').addEventListener('change', e => {
    state.aids.lineFocus = e.target.checked;
    els.lineFocusOverlay.classList.toggle('hidden', !e.target.checked);
  });
  $('aid-word-spacing').addEventListener('change', e => {
    state.aids.wordSpacing = e.target.checked;
    applyAll();
  });
  $('aid-ruler').addEventListener('change', e => {
    state.aids.ruler = e.target.checked;
    els.rulerLine.classList.toggle('hidden', !e.target.checked);
  });
  $('aid-reading-mask').addEventListener('change', e => {
    state.aids.readingMask = e.target.checked;
    els.readingMaskTop.classList.toggle('hidden', !e.target.checked);
    els.readingMaskBottom.classList.toggle('hidden', !e.target.checked);
    if (!e.target.checked) {
      els.readingMaskTop.style.height = '0';
      els.readingMaskBottom.style.height = '0';
    }
  });

  // Mouse tracking for line focus & reading mask
  document.addEventListener('mousemove', e => {
    updateLineFocus(e);
    updateReadingMask(e);
  });

  // ── Environment ──
  els.envSimulation.addEventListener('change', () => {
    state.environment = els.envSimulation.value;
    applyEnvironment(state.environment);
  });

  // ── Comparison mode ──
  els.compareToggle.addEventListener('change', e => {
    state.compareMode = e.target.checked;
    els.canvasNormal.classList.toggle('hidden', e.target.checked);
    els.canvasComparison.classList.toggle('hidden', !e.target.checked);
    if (e.target.checked) {
      updateComparisonCurrent();
      updateComparisonSnapshot(state.snapshot);
    }
  });

  els.saveSnapshot.addEventListener('click', () => {
    state.snapshot = {
      text: { ...state.text }, bg: { ...state.bg },
      fontSize: state.fontSize, fontFamily: state.fontFamily,
      fontWeight: state.fontWeight, lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing, columnWidth: state.columnWidth,
      textAlign: state.textAlign,
    };
    const textHex = rgbToHex(state.text.r, state.text.g, state.text.b);
    const bgHex   = rgbToHex(state.bg.r,   state.bg.g,   state.bg.b);
    els.snapshotStatus.textContent = `Snapshot saved: ${textHex} on ${bgHex}, ${state.fontSize}px`;
    if (state.compareMode) updateComparisonSnapshot(state.snapshot);
  });

  // ── Export ──
  els.copyCss.addEventListener('click', () => {
    navigator.clipboard.writeText(generateCss()).then(() => {
      showFeedback('✓ CSS copied to clipboard');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = generateCss();
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      showFeedback('✓ CSS copied to clipboard');
    });
  });

  els.shareLink.addEventListener('click', () => {
    const url = encodeStateToUrl();
    navigator.clipboard.writeText(url).then(() => {
      showFeedback('✓ Share link copied to clipboard');
    }).catch(() => {
      prompt('Copy this URL to share your settings:', url);
    });
  });

  els.exportReport.addEventListener('click', generateReport);
}

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
function init() {
  // Initial swatches
  els.textSwatch.style.background = `rgb(${state.text.r},${state.text.g},${state.text.b})`;
  els.bgSwatch.style.background   = `rgb(${state.bg.r},${state.bg.g},${state.bg.b})`;

  initSectionToggles();
  buildPresets();
  initRuler();

  // Load URL state if present
  loadStateFromUrl();

  // Initial render
  updateSliderDisplays();
  renderText();
  applyAll();
  saveHistory();

  // Wire all interactive elements
  wireEvents();
}

document.addEventListener('DOMContentLoaded', init);

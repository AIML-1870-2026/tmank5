(() => {
  // --- State ---
  let colorModel = 'rgb';
  let colorA = '#ff3366';
  let colorB = '#3366ff';
  let activeSlot = 'A';
  let resultHex = null;

  // --- DOM refs ---
  const swatchA = document.getElementById('swatchA');
  const swatchB = document.getElementById('swatchB');
  const hexA = document.getElementById('hexA');
  const hexB = document.getElementById('hexB');
  const slotA = document.getElementById('slotA');
  const slotB = document.getElementById('slotB');
  const mixBtn = document.getElementById('mixBtn');
  const resultSwatch = document.getElementById('resultSwatch');
  const resultHexEl = document.getElementById('resultHex');
  const resultRgbEl = document.getElementById('resultRgb');
  const resultCmykEl = document.getElementById('resultCmyk');
  const modelBtns = document.querySelectorAll('.model-btn');
  const modelDescription = document.getElementById('modelDescription');
  const learnBtn = document.getElementById('learnBtn');
  const learnPanel = document.getElementById('learnPanel');
  const learnContent = document.getElementById('learnContent');
  const wheelCanvas = ColorWheel.canvas;
  const wheelInstructions = document.getElementById('wheelInstructions');
  const srAnnounce = document.getElementById('srAnnounce');
  const mixOverlay = document.getElementById('mixOverlay');

  const modelDescriptions = {
    rgb: 'RGB \u2014 Additive light mixing used in screens and digital design. Colors get brighter as you combine them.',
    ryb: 'RYB \u2014 Subtractive pigment mixing used in traditional painting. This is the model most art students learn first.',
    cmyk: 'CMYK \u2014 Subtractive ink mixing used in print design. Colors darken as you layer more ink.',
  };

  // --- Screen reader announce ---
  function announce(msg) {
    srAnnounce.textContent = '';
    requestAnimationFrame(() => { srAnnounce.textContent = msg; });
  }

  // --- Init ---
  function init() {
    Starfield.init();
    ColorWheel.init();
    updateSlotUI();
    Relationships.render(colorA);
    updateLearnContent();

    const rgbA = ColorMixer.hexToRgb(colorA);
    const hslA = ColorMixer.rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
    ColorWheel.setMarker('A', hslA.h, 140);
    const rgbB = ColorMixer.hexToRgb(colorB);
    const hslB = ColorMixer.rgbToHsl(rgbB.r, rgbB.g, rgbB.b);
    ColorWheel.setMarker('B', hslB.h, 140);

    requestAnimationFrame(loop);
  }

  // --- Animation loop ---
  function loop(time) {
    Starfield.draw(time);
    ColorWheel.update(time);
    Particles.update();
    MixAnimation.update(time);
    requestAnimationFrame(loop);
  }

  // --- Slot UI ---
  function updateSlotUI() {
    swatchA.style.background = colorA;
    swatchB.style.background = colorB;
    hexA.textContent = colorA;
    hexB.textContent = colorB;
    slotA.classList.toggle('active', activeSlot === 'A');
    slotB.classList.toggle('active', activeSlot === 'B');
    slotA.setAttribute('aria-pressed', activeSlot === 'A');
    slotB.setAttribute('aria-pressed', activeSlot === 'B');
    wheelInstructions.innerHTML = `Click the wheel to pick <strong>Color ${activeSlot}</strong>`;
  }

  // --- Wheel click handler ---
  wheelCanvas.addEventListener('click', (e) => {
    const rect = wheelCanvas.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const result = ColorWheel.getColorAtPosition(x, y);
    if (!result) return;

    applyColorPick(result);
  });

  function applyColorPick(result) {
    if (activeSlot === 'A') {
      colorA = result.hex;
      ColorWheel.setMarker('A', result.angle, result.dist);
      announce(`Color A set to ${result.hex}`);
      activeSlot = 'B';
    } else {
      colorB = result.hex;
      ColorWheel.setMarker('B', result.angle, result.dist);
      announce(`Color B set to ${result.hex}`);
      activeSlot = 'A';
    }

    updateSlotUI();
    Relationships.render(activeSlot === 'B' ? colorA : colorB);
  }

  // --- Keyboard navigation on the wheel ---
  wheelCanvas.addEventListener('keydown', (e) => {
    const HUE_STEP = 5;
    let delta = 0;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = HUE_STEP;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -HUE_STEP;
        break;
      case 'Enter':
      case ' ':
        // Toggle active slot
        activeSlot = activeSlot === 'A' ? 'B' : 'A';
        updateSlotUI();
        announce(`Now picking Color ${activeSlot}`);
        e.preventDefault();
        return;
      default:
        return;
    }

    e.preventDefault();
    const hex = ColorWheel.adjustHue(activeSlot, delta);
    if (activeSlot === 'A') {
      colorA = hex;
    } else {
      colorB = hex;
    }
    updateSlotUI();
    Relationships.render(activeSlot === 'A' ? colorA : colorB);
    announce(`Color ${activeSlot}: ${hex}`);
  });

  // --- Slot click to select ---
  slotA.addEventListener('click', () => {
    activeSlot = 'A';
    updateSlotUI();
    Relationships.render(colorA);
    announce('Selecting Color A');
  });

  slotB.addEventListener('click', () => {
    activeSlot = 'B';
    updateSlotUI();
    Relationships.render(colorB);
    announce('Selecting Color B');
  });

  // --- Mix button ---
  mixBtn.addEventListener('click', () => {
    resultHex = ColorMixer.mix(colorA, colorB, colorModel);
    mixOverlay.setAttribute('aria-hidden', 'false');

    MixAnimation.play(colorA, colorB, resultHex, () => {
      mixOverlay.setAttribute('aria-hidden', 'true');
      resultSwatch.style.background = resultHex;
      resultSwatch.classList.add('revealed');
      const rgb = ColorMixer.hexToRgb(resultHex);
      resultSwatch.style.setProperty('--result-r', rgb.r);
      resultSwatch.style.setProperty('--result-g', rgb.g);
      resultSwatch.style.setProperty('--result-b', rgb.b);
      resultSwatch.setAttribute('aria-label', `Mixed color result: ${resultHex}`);

      const info = ColorMixer.getColorInfo(resultHex);
      resultHexEl.textContent = `HEX: ${info.hex}`;
      resultRgbEl.textContent = `RGB: ${info.rgbStr}`;
      resultCmykEl.textContent = `CMYK: ${info.cmykStr}`;

      Particles.burst(resultHex);
      announce(`Mixed result: ${info.hex}, RGB ${info.rgbStr}`);
    });
  });

  // --- Model switcher ---
  modelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      colorModel = btn.dataset.model;
      modelBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      modelDescription.textContent = modelDescriptions[colorModel];
      updateLearnContent();
      announce(`Color model changed to ${colorModel.toUpperCase()}`);

      if (resultHex) {
        resultHex = ColorMixer.mix(colorA, colorB, colorModel);
        resultSwatch.style.background = resultHex;
        const info = ColorMixer.getColorInfo(resultHex);
        resultHexEl.textContent = `HEX: ${info.hex}`;
        resultRgbEl.textContent = `RGB: ${info.rgbStr}`;
        resultCmykEl.textContent = `CMYK: ${info.cmykStr}`;
      }
    });
  });

  // Model switcher keyboard: arrow keys to move between radio buttons
  const modelBtnArr = Array.from(modelBtns);
  modelBtnArr.forEach((btn, i) => {
    btn.addEventListener('keydown', (e) => {
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (i + 1) % modelBtnArr.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (i - 1 + modelBtnArr.length) % modelBtnArr.length;
      }
      if (next >= 0) {
        e.preventDefault();
        modelBtnArr[next].focus();
        modelBtnArr[next].click();
      }
    });
  });

  // --- Learn panel ---
  learnBtn.addEventListener('click', () => {
    const isOpen = learnPanel.classList.toggle('open');
    learnBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close learn panel on Escape
  learnPanel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      learnPanel.classList.remove('open');
      learnBtn.setAttribute('aria-expanded', 'false');
      learnBtn.focus();
    }
  });

  function updateLearnContent() {
    const modelInfo = {
      rgb: {
        title: 'RGB \u2014 Additive Color',
        text: 'RGB adds red, green, and blue light together. Mixing all three at full intensity makes white. This is how your screen works right now!',
      },
      ryb: {
        title: 'RYB \u2014 Subtractive Pigment',
        text: 'RYB is the traditional color model taught in art class. Mixing red, yellow, and blue paint together makes a muddy brown \u2014 the opposite of RGB\'s white.',
      },
      cmyk: {
        title: 'CMYK \u2014 Print Inks',
        text: 'CMYK uses cyan, magenta, yellow, and black inks layered on paper. More ink means a darker color. This is how printers reproduce images.',
      },
    };

    const info = modelInfo[colorModel];
    const relExplanations = Relationships.explanations;

    learnContent.innerHTML = `
      <h3>${info.title}</h3>
      <p>${info.text}</p>
      <h3>Color Relationships</h3>
      <p><strong>Complementary:</strong> ${relExplanations['Complementary']}</p>
      <p><strong>Triadic:</strong> ${relExplanations['Triadic']}</p>
      <p><strong>Analogous:</strong> ${relExplanations['Analogous']}</p>
      <p><strong>Split-Complementary:</strong> ${relExplanations['Split-Complementary']}</p>
    `;
  }

  // --- Start ---
  init();
})();

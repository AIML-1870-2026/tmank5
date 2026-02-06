// ============================================================================
// Turing Patterns - Main Application
// Coordinates all modules: simulation, rendering, interaction, and UI
// ============================================================================

class TuringApp {
    constructor() {
        this.canvas = document.getElementById('sim-canvas');
        this.container = document.getElementById('canvas-container');

        // Initialize core modules
        this.sim = new TuringSimulation(this.canvas);
        this.renderer = new TuringRenderer(this.sim);
        this.interaction = new TuringInteraction(this.canvas, this.sim);
        this.recorder = new TuringRecorder(this.canvas);

        // App state
        this.running = false;
        this.animFrameId = null;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.fpsFrames = 0;
        this.fpsTime = 0;
        this.statsUpdateInterval = 30; // update stats every N frames
        this.statsCounter = 0;
        this.currentSeed = Math.random() * 100000;

        // Resize canvas to fill container
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Initialize UI bindings
        this._initUI();
        this._initKeyboard();

        // Load default preset
        this.loadPreset('spots');

        // Show help on first visit
        if (!localStorage.getItem('turing_visited')) {
            this.showHelp();
            localStorage.setItem('turing_visited', 'true');
        }

        // Start the render loop (paused initially)
        this._renderLoop();
    }

    _resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        // Use the simulation grid size for the canvas, but set display size to fit
        this.canvas.width = this.sim.width;
        this.canvas.height = this.sim.height;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
    }

    // ========================================================================
    // Main Render Loop
    // ========================================================================
    _renderLoop(timestamp) {
        this.animFrameId = requestAnimationFrame((t) => this._renderLoop(t));

        // FPS calculation
        this.fpsFrames++;
        if (timestamp - this.fpsTime >= 1000) {
            this.fps = this.fpsFrames;
            this.fpsFrames = 0;
            this.fpsTime = timestamp;
            this._updateFPS();
        }

        // Simulation stepping
        if (this.running) {
            const stepsPerFrame = this.sim.params.stepsPerFrame || 8;
            this.sim.stepN(stepsPerFrame);
        }

        // Render
        this.renderer.render();

        // Record if active
        if (this.recorder.isRecording()) {
            this.recorder.captureFrame();
            this._updateRecordingStatus();
        }

        // Stats update
        this.statsCounter++;
        if (this.statsCounter >= this.statsUpdateInterval) {
            this.statsCounter = 0;
            this._updateStats();
        }
    }

    // ========================================================================
    // UI Initialization
    // ========================================================================
    _initUI() {
        // --- Time Controls ---
        this._btn('btn-play', () => this.togglePlay());
        this._btn('btn-step', () => this.stepOnce());
        this._btn('btn-reset', () => this.reset());

        // --- Model Selection ---
        this._select('sel-model', (val) => {
            this.sim.setParams({ model: parseInt(val) });
        });

        // --- Parameter Sliders ---
        this._slider('slider-du', 'val-du', (v) => this.sim.setParams({ Du: v }), 3);
        this._slider('slider-dv', 'val-dv', (v) => this.sim.setParams({ Dv: v }), 3);
        this._slider('slider-feed', 'val-feed', (v) => this.sim.setParams({ feed: v }), 4);
        this._slider('slider-kill', 'val-kill', (v) => this.sim.setParams({ kill: v }), 4);
        this._slider('slider-dt', 'val-dt', (v) => this.sim.setParams({ dt: v }), 2);
        this._slider('slider-speed', 'val-speed', (v) => this.sim.setParams({ stepsPerFrame: Math.round(v) }), 0);

        // --- Grid Size ---
        this._select('sel-gridsize', (val) => {
            const size = parseInt(val);
            this.sim.resize(size, size);
            this._resizeCanvas();
        });

        // --- Boundary Conditions ---
        this._select('sel-boundary', (val) => {
            this.sim.setParams({ boundary: parseInt(val) });
        });

        // --- Drawing Tools ---
        const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.interaction.setBrushMode(parseInt(btn.dataset.tool));
            });
        });
        // Default tool
        const defaultTool = document.querySelector('.tool-btn[data-tool="0"]');
        if (defaultTool) defaultTool.classList.add('active');

        this._slider('slider-brush-size', 'val-brush-size', (v) => {
            this.interaction.setBrushRadius(v);
        }, 3);

        this._slider('slider-brush-strength', 'val-brush-strength', (v) => {
            this.interaction.setBrushStrength(v);
        }, 2);

        // --- Seed Controls ---
        this._btn('btn-seed-center', () => this.seedPattern(0));
        this._btn('btn-seed-spots', () => this.seedPattern(1));
        this._btn('btn-seed-noise', () => this.seedPattern(2));
        this._btn('btn-seed-clear', () => this.seedPattern(3));

        // --- Seed value ---
        this._btn('btn-random-seed', () => {
            this.currentSeed = Math.random() * 100000;
            const el = document.getElementById('input-seed');
            if (el) el.value = Math.floor(this.currentSeed);
            this.seedPattern(1);
        });

        // --- Image Upload ---
        const fileInput = document.getElementById('input-image');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.sim.loadImageAsInitialCondition(e.target.files[0]);
                }
            });
        }

        // --- Color Scheme ---
        this._select('sel-colorscheme', (val) => {
            this.renderer.setSettings({ colorScheme: parseInt(val) });
        });

        // --- Visual Sliders ---
        this._slider('slider-brightness', 'val-brightness', (v) => {
            this.renderer.setSettings({ brightness: v });
        }, 2);

        this._slider('slider-contrast', 'val-contrast', (v) => {
            this.renderer.setSettings({ contrast: v });
        }, 2);

        this._slider('slider-saturation', 'val-saturation', (v) => {
            this.renderer.setSettings({ saturation: v });
        }, 2);

        // --- Post-Processing Toggles ---
        this._toggle('toggle-bloom', (on) => {
            this.renderer.setSettings({ bloomEnabled: on });
        });

        this._slider('slider-bloom-strength', 'val-bloom-strength', (v) => {
            this.renderer.setSettings({ bloomStrength: v });
        }, 2);

        this._toggle('toggle-edge', (on) => {
            this.renderer.setSettings({ edgeEnabled: on });
        });

        this._slider('slider-edge-strength', 'val-edge-strength', (v) => {
            this.renderer.setSettings({ edgeStrength: v });
        }, 2);

        // --- Presets ---
        const presetGrid = document.getElementById('preset-grid');
        if (presetGrid) {
            Object.keys(TuringPresets.patterns).forEach(key => {
                const preset = TuringPresets.patterns[key];
                const btn = document.createElement('button');
                btn.className = 'preset-btn';
                btn.textContent = preset.name;
                btn.title = preset.description;
                btn.dataset.preset = key;
                btn.addEventListener('click', () => {
                    presetGrid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadPreset(key);
                });
                presetGrid.appendChild(btn);
            });
        }

        // --- Random Parameters ---
        this._btn('btn-random-params', () => {
            this.currentSeed = Math.random() * 100000;
            const params = TuringPresets.randomGrayScott(this.currentSeed);
            this.sim.setParams(params);
            this._syncSlidersFromParams();
            this.seedPattern(params.seedMode);
            const seedEl = document.getElementById('input-seed');
            if (seedEl) seedEl.value = Math.floor(this.currentSeed);
        });

        // --- Save/Load ---
        this._btn('btn-save-state', () => this.saveState());
        this._btn('btn-load-state', () => this.loadState());
        this._btn('btn-quick-save', () => this.quickSave());
        this._btn('btn-export-png', () => this.exportPNG());

        // --- Panel Toggle ---
        this._btn('btn-toggle-panel', () => {
            const panel = document.getElementById('side-panel');
            if (panel) panel.classList.toggle('collapsed');
        });

        // --- Help ---
        this._btn('btn-help', () => this.showHelp());
        this._btn('btn-close-help', () => this.hideHelp());
        const helpOverlay = document.getElementById('help-overlay');
        if (helpOverlay) {
            helpOverlay.addEventListener('click', (e) => {
                if (e.target === helpOverlay) this.hideHelp();
            });
        }

        // --- Section Collapse ---
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', () => {
                const body = header.nextElementSibling;
                const icon = header.querySelector('.collapse-icon');
                if (body) body.classList.toggle('collapsed');
                if (icon) icon.classList.toggle('collapsed');
            });
        });

        // --- Custom Color Stops ---
        this._initCustomColors();
    }

    _initCustomColors() {
        const container = document.getElementById('custom-color-stops');
        if (!container) return;

        const defaultColors = ['#000000', '#0088ff', '#ffffff'];
        this.customColorInputs = [];

        const update = () => {
            const colors = this.customColorInputs.map(input => {
                const hex = input.value;
                return [
                    parseInt(hex.slice(1, 3), 16) / 255,
                    parseInt(hex.slice(3, 5), 16) / 255,
                    parseInt(hex.slice(5, 7), 16) / 255
                ];
            });
            this.renderer.setSettings({
                customColors: colors,
                customColorCount: colors.length
            });
            this._updateGradientPreview();
        };

        defaultColors.forEach(hex => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = hex;
            input.addEventListener('input', update);
            container.appendChild(input);
            this.customColorInputs.push(input);
        });

        // Add/remove buttons
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-icon';
        addBtn.textContent = '+';
        addBtn.title = 'Add color stop';
        addBtn.addEventListener('click', () => {
            if (this.customColorInputs.length >= 6) return;
            const input = document.createElement('input');
            input.type = 'color';
            input.value = '#ff8800';
            input.addEventListener('input', update);
            container.insertBefore(input, addBtn);
            this.customColorInputs.push(input);
            update();
        });
        container.appendChild(addBtn);

        update();
    }

    _updateGradientPreview() {
        const preview = document.getElementById('gradient-preview');
        if (!preview || !this.customColorInputs) return;

        const colors = this.customColorInputs.map(input => input.value);
        const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1) * 100).toFixed(0)}%`).join(', ');
        preview.style.background = `linear-gradient(to right, ${stops})`;
    }

    // ========================================================================
    // UI Helper Methods
    // ========================================================================
    _btn(id, callback) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    }

    _select(id, callback) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => callback(el.value));
        }
    }

    _slider(sliderId, valueId, callback, decimals) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);

        if (slider) {
            slider.addEventListener('input', () => {
                const val = parseFloat(slider.value);
                if (valueEl) valueEl.textContent = val.toFixed(decimals);
                callback(val);
            });
        }
    }

    _toggle(id, callback) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => callback(el.checked));
        }
    }

    // ========================================================================
    // Keyboard Shortcuts
    // ========================================================================
    _initKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 's':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.quickSave();
                    }
                    break;
                case 'r':
                    if (!e.ctrlKey) {
                        this.reset();
                    }
                    break;
                case '.':
                    this.stepOnce();
                    break;
                case '1':
                    this.interaction.setBrushMode(0);
                    this._updateToolButtons(0);
                    break;
                case '2':
                    this.interaction.setBrushMode(1);
                    this._updateToolButtons(1);
                    break;
                case '3':
                    this.interaction.setBrushMode(2);
                    this._updateToolButtons(2);
                    break;
                case '4':
                    this.interaction.setBrushMode(3);
                    this._updateToolButtons(3);
                    break;
                case '[':
                    this._adjustBrushSize(-0.005);
                    break;
                case ']':
                    this._adjustBrushSize(0.005);
                    break;
                case 'h':
                    this.showHelp();
                    break;
                case 'Escape':
                    this.hideHelp();
                    break;
                case 'p':
                    const panel = document.getElementById('side-panel');
                    if (panel) panel.classList.toggle('collapsed');
                    break;
            }
        });
    }

    _updateToolButtons(mode) {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.tool) === mode);
        });
    }

    _adjustBrushSize(delta) {
        const newRadius = Math.max(0.005, Math.min(0.15, this.interaction.brushRadius + delta));
        this.interaction.setBrushRadius(newRadius);
        const slider = document.getElementById('slider-brush-size');
        const val = document.getElementById('val-brush-size');
        if (slider) slider.value = newRadius;
        if (val) val.textContent = newRadius.toFixed(3);
    }

    // ========================================================================
    // Actions
    // ========================================================================
    togglePlay() {
        this.running = !this.running;
        const btn = document.getElementById('btn-play');
        if (btn) {
            btn.textContent = this.running ? '\u23F8' : '\u25B6';
            btn.title = this.running ? 'Pause (Space)' : 'Play (Space)';
        }
    }

    stepOnce() {
        this.sim.stepN(this.sim.params.stepsPerFrame || 8);
    }

    reset() {
        this.running = false;
        const btn = document.getElementById('btn-play');
        if (btn) {
            btn.textContent = '\u25B6';
            btn.title = 'Play (Space)';
        }
        this.sim.seed(this._getCurrentSeedMode(), this.currentSeed);
    }

    _getCurrentSeedMode() {
        // Determine seed mode from whichever seed button was last clicked
        return this._lastSeedMode || 0;
    }

    seedPattern(mode) {
        this._lastSeedMode = mode;
        this.currentSeed = parseFloat(document.getElementById('input-seed')?.value) || Math.random() * 100000;
        this.sim.seed(mode, this.currentSeed);
    }

    loadPreset(key) {
        const preset = TuringPresets.patterns[key];
        if (!preset) return;

        this.sim.setParams({
            model: preset.model,
            Du: preset.Du,
            Dv: preset.Dv,
            feed: preset.feed,
            kill: preset.kill,
            dt: preset.dt,
        });

        // Update model selector
        const modelSel = document.getElementById('sel-model');
        if (modelSel) modelSel.value = preset.model;

        this._syncSlidersFromParams();
        this.sim.seed(preset.seedMode, this.currentSeed);
    }

    _syncSlidersFromParams() {
        const p = this.sim.params;

        const syncOne = (sliderId, valueId, val, decimals) => {
            const slider = document.getElementById(sliderId);
            const valEl = document.getElementById(valueId);
            if (slider) slider.value = val;
            if (valEl) valEl.textContent = val.toFixed(decimals);
        };

        syncOne('slider-du', 'val-du', p.Du, 3);
        syncOne('slider-dv', 'val-dv', p.Dv, 3);
        syncOne('slider-feed', 'val-feed', p.feed, 4);
        syncOne('slider-kill', 'val-kill', p.kill, 4);
        syncOne('slider-dt', 'val-dt', p.dt, 2);
        syncOne('slider-speed', 'val-speed', p.stepsPerFrame, 0);
    }

    // ========================================================================
    // Save / Load / Export
    // ========================================================================
    saveState() {
        const stateData = this.sim.readState();
        const json = TuringPresets.exportState(this.sim.params, stateData);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `turing_state_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadState() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const data = TuringPresets.importState(ev.target.result);
                if (!data) {
                    alert('Failed to load state file.');
                    return;
                }
                this.sim.setParams(data.params);
                if (data.grid) {
                    this.sim.writeState(data.grid);
                }
                this._syncSlidersFromParams();
                const modelSel = document.getElementById('sel-model');
                if (modelSel) modelSel.value = data.params.model;
            };
            reader.readAsText(file);
        };
        input.click();
    }

    quickSave() {
        const name = prompt('Save name:', `save_${Date.now()}`);
        if (!name) return;
        TuringPresets.quickSave(name, this.sim.params);
        this._updateSavesList();
    }

    _updateSavesList() {
        const container = document.getElementById('saves-list');
        if (!container) return;

        container.innerHTML = '';
        const saves = TuringPresets.listSaves();

        if (saves.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted);font-size:11px;">No saves yet</div>';
            return;
        }

        saves.forEach(save => {
            const item = document.createElement('div');
            item.className = 'save-item';

            const name = document.createElement('span');
            name.textContent = save.name;
            name.style.cursor = 'pointer';
            name.addEventListener('click', () => {
                const data = TuringPresets.quickLoad(save.name);
                if (data) {
                    this.sim.setParams(data.params);
                    this._syncSlidersFromParams();
                }
            });

            const del = document.createElement('button');
            del.className = 'btn btn-icon btn-danger';
            del.textContent = '\u2715';
            del.style.fontSize = '10px';
            del.style.height = '22px';
            del.style.minWidth = '22px';
            del.addEventListener('click', () => {
                TuringPresets.deleteSave(save.name);
                this._updateSavesList();
            });

            item.appendChild(name);
            item.appendChild(del);
            container.appendChild(item);
        });
    }

    exportPNG() {
        const dataUrl = this.renderer.exportFrame();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `turing_pattern_${Date.now()}.png`;
        a.click();
    }

    // ========================================================================
    // Status Updates
    // ========================================================================
    _updateFPS() {
        const el = document.getElementById('stat-fps');
        if (el) el.textContent = this.fps;
    }

    _updateStats() {
        const el = document.getElementById('stat-iteration');
        if (el) el.textContent = this.sim.iteration;

        // Only compute full stats occasionally (expensive)
        if (this.statsCounter === 0 && this.sim.iteration % 100 < this.sim.params.stepsPerFrame) {
            try {
                const stats = this.sim.computeStats();
                const coverageEl = document.getElementById('stat-coverage');
                const entropyEl = document.getElementById('stat-entropy');
                if (coverageEl) coverageEl.textContent = stats.coverage + '%';
                if (entropyEl) entropyEl.textContent = stats.entropy;
            } catch (e) {
                // Stats computation can fail if WebGL context is lost
            }
        }
    }

    _updateRecordingStatus() {
        const el = document.getElementById('recording-status');
        if (el) {
            if (this.recorder.isRecording()) {
                el.style.display = 'inline';
                el.textContent = `REC ${Math.floor(this.recorder.getProgress() * 100)}%`;
            } else {
                el.style.display = 'none';
            }
        }
    }

    // ========================================================================
    // Help
    // ========================================================================
    showHelp() {
        const overlay = document.getElementById('help-overlay');
        if (overlay) overlay.classList.add('visible');
    }

    hideHelp() {
        const overlay = document.getElementById('help-overlay');
        if (overlay) overlay.classList.remove('visible');
    }
}

// ============================================================================
// Boot
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    window.app = new TuringApp();
});

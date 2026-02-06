// ============================================================================
// Turing Patterns - Renderer
// Display rendering with color mapping and post-processing effects
// ============================================================================

class TuringRenderer {
    constructor(simulation) {
        this.sim = simulation;
        this.gl = simulation.gl;
        this.canvas = simulation.canvas;

        // Rendering settings
        this.settings = {
            colorScheme: 0,
            brightness: 0.0,
            contrast: 1.0,
            saturation: 1.0,
            showObstacles: true,
            bloomEnabled: false,
            bloomStrength: 0.3,
            bloomAmount: 2.0,
            edgeEnabled: false,
            edgeStrength: 0.5,
            customColors: [
                [0.0, 0.0, 0.0],
                [0.0, 0.5, 1.0],
                [1.0, 1.0, 1.0]
            ],
            customColorCount: 3
        };

        this._initShaders();
        this._initPostProcessing();
    }

    _initShaders() {
        const gl = this.gl;
        const sim = this.sim;

        // Display program
        this.displayProgram = sim._createProgram(TuringShaders.vertexShader, TuringShaders.displayShader);
        this.displayUniforms = {
            u_state: gl.getUniformLocation(this.displayProgram, 'u_state'),
            u_colorScheme: gl.getUniformLocation(this.displayProgram, 'u_colorScheme'),
            u_brightness: gl.getUniformLocation(this.displayProgram, 'u_brightness'),
            u_contrast: gl.getUniformLocation(this.displayProgram, 'u_contrast'),
            u_saturation: gl.getUniformLocation(this.displayProgram, 'u_saturation'),
            u_showObstacles: gl.getUniformLocation(this.displayProgram, 'u_showObstacles'),
            u_customColors: gl.getUniformLocation(this.displayProgram, 'u_customColors'),
            u_customColorCount: gl.getUniformLocation(this.displayProgram, 'u_customColorCount'),
        };

        // Blur program
        this.blurProgram = sim._createProgram(TuringShaders.vertexShader, TuringShaders.blurShader);
        this.blurUniforms = {
            u_texture: gl.getUniformLocation(this.blurProgram, 'u_texture'),
            u_direction: gl.getUniformLocation(this.blurProgram, 'u_direction'),
            u_blurAmount: gl.getUniformLocation(this.blurProgram, 'u_blurAmount'),
        };

        // Edge program
        this.edgeProgram = sim._createProgram(TuringShaders.vertexShader, TuringShaders.edgeShader);
        this.edgeUniforms = {
            u_texture: gl.getUniformLocation(this.edgeProgram, 'u_texture'),
            u_texelSize: gl.getUniformLocation(this.edgeProgram, 'u_texelSize'),
            u_edgeStrength: gl.getUniformLocation(this.edgeProgram, 'u_edgeStrength'),
        };

        // Composite program
        this.compositeProgram = sim._createProgram(TuringShaders.vertexShader, TuringShaders.compositeShader);
        this.compositeUniforms = {
            u_scene: gl.getUniformLocation(this.compositeProgram, 'u_scene'),
            u_bloom: gl.getUniformLocation(this.compositeProgram, 'u_bloom'),
            u_bloomStrength: gl.getUniformLocation(this.compositeProgram, 'u_bloomStrength'),
            u_bloomEnabled: gl.getUniformLocation(this.compositeProgram, 'u_bloomEnabled'),
        };
    }

    _initPostProcessing() {
        const gl = this.gl;

        // Post-processing FBOs (at canvas resolution)
        this.ppTextures = [];
        this.ppFBOs = [];

        for (let i = 0; i < 3; i++) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.canvas.width || 512, this.canvas.height || 512,
                0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            this.ppTextures.push(tex);
            this.ppFBOs.push(fbo);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.ppWidth = this.canvas.width || 512;
        this.ppHeight = this.canvas.height || 512;
    }

    _resizePPBuffers() {
        const gl = this.gl;
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (w === this.ppWidth && h === this.ppHeight) return;

        for (let i = 0; i < this.ppTextures.length; i++) {
            gl.bindTexture(gl.TEXTURE_2D, this.ppTextures[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        this.ppWidth = w;
        this.ppHeight = h;
    }

    // Main render call
    render() {
        const gl = this.gl;
        const sim = this.sim;

        this._resizePPBuffers();

        const needsPostProcessing = this.settings.bloomEnabled || this.settings.edgeEnabled;
        const renderTarget = needsPostProcessing ? this.ppFBOs[0] : null;
        const renderW = this.canvas.width;
        const renderH = this.canvas.height;

        // --- Pass 1: Color mapping ---
        gl.viewport(0, 0, renderW, renderH);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);

        gl.useProgram(this.displayProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sim.getCurrentTexture());
        gl.uniform1i(this.displayUniforms.u_state, 0);
        gl.uniform1i(this.displayUniforms.u_colorScheme, this.settings.colorScheme);
        gl.uniform1f(this.displayUniforms.u_brightness, this.settings.brightness);
        gl.uniform1f(this.displayUniforms.u_contrast, this.settings.contrast);
        gl.uniform1f(this.displayUniforms.u_saturation, this.settings.saturation);
        gl.uniform1i(this.displayUniforms.u_showObstacles, this.settings.showObstacles ? 1 : 0);

        // Custom colors
        const flatColors = [];
        for (let i = 0; i < 6; i++) {
            if (i < this.settings.customColors.length) {
                flatColors.push(...this.settings.customColors[i]);
            } else {
                flatColors.push(0, 0, 0);
            }
        }
        gl.uniform3fv(this.displayUniforms.u_customColors, flatColors);
        gl.uniform1i(this.displayUniforms.u_customColorCount, this.settings.customColorCount);

        sim._drawQuad();

        if (!needsPostProcessing) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return;
        }

        // --- Pass 2: Edge detection (optional) ---
        let currentScene = this.ppTextures[0];

        if (this.settings.edgeEnabled) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.ppFBOs[1]);
            gl.useProgram(this.edgeProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentScene);
            gl.uniform1i(this.edgeUniforms.u_texture, 0);
            gl.uniform2f(this.edgeUniforms.u_texelSize, 1.0 / renderW, 1.0 / renderH);
            gl.uniform1f(this.edgeUniforms.u_edgeStrength, this.settings.edgeStrength);
            sim._drawQuad();
            currentScene = this.ppTextures[1];
        }

        // --- Pass 3: Bloom (optional) ---
        if (this.settings.bloomEnabled) {
            // Horizontal blur
            const blurTarget = this.settings.edgeEnabled ? this.ppFBOs[0] : this.ppFBOs[1];
            const blurTex = this.settings.edgeEnabled ? this.ppTextures[0] : this.ppTextures[1];

            gl.bindFramebuffer(gl.FRAMEBUFFER, blurTarget);
            gl.useProgram(this.blurProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentScene);
            gl.uniform1i(this.blurUniforms.u_texture, 0);
            gl.uniform2f(this.blurUniforms.u_direction, 1.0 / renderW, 0.0);
            gl.uniform1f(this.blurUniforms.u_blurAmount, this.settings.bloomAmount);
            sim._drawQuad();

            // Vertical blur
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.ppFBOs[2]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.settings.edgeEnabled ? this.ppTextures[0] : this.ppTextures[1]);
            gl.uniform2f(this.blurUniforms.u_direction, 0.0, 1.0 / renderH);
            sim._drawQuad();

            // Composite: scene + bloom
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(this.compositeProgram);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentScene);
            gl.uniform1i(this.compositeUniforms.u_scene, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.ppTextures[2]);
            gl.uniform1i(this.compositeUniforms.u_bloom, 1);

            gl.uniform1f(this.compositeUniforms.u_bloomStrength, this.settings.bloomStrength);
            gl.uniform1f(this.compositeUniforms.u_bloomEnabled, 1.0);
            sim._drawQuad();
        } else {
            // Just copy the scene (with edge detection) to screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(sim.copyProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentScene);
            gl.uniform1i(gl.getUniformLocation(sim.copyProgram, 'u_texture'), 0);
            sim._drawQuad();
        }
    }

    // Export current frame as PNG data URL
    exportFrame() {
        this.render();
        return this.canvas.toDataURL('image/png');
    }

    // Export current frame as blob
    exportFrameBlob() {
        return new Promise((resolve) => {
            this.render();
            this.canvas.toBlob(resolve, 'image/png');
        });
    }

    // Update render settings
    setSettings(settings) {
        Object.assign(this.settings, settings);
    }

    destroy() {
        const gl = this.gl;
        for (let i = 0; i < this.ppTextures.length; i++) {
            gl.deleteTexture(this.ppTextures[i]);
            gl.deleteFramebuffer(this.ppFBOs[i]);
        }
        gl.deleteProgram(this.displayProgram);
        gl.deleteProgram(this.blurProgram);
        gl.deleteProgram(this.edgeProgram);
        gl.deleteProgram(this.compositeProgram);
    }
}


// ============================================================================
// GIF/Animation Recorder
// ============================================================================

class TuringRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.frames = [];
        this.recording = false;
        this.frameCount = 0;
        this.maxFrames = 200;
        this.frameInterval = 2; // capture every N render frames
        this.frameCounter = 0;
    }

    start(maxFrames, frameInterval) {
        this.frames = [];
        this.frameCount = 0;
        this.frameCounter = 0;
        this.maxFrames = maxFrames || 200;
        this.frameInterval = frameInterval || 2;
        this.recording = true;
    }

    captureFrame() {
        if (!this.recording) return false;

        this.frameCounter++;
        if (this.frameCounter % this.frameInterval !== 0) return false;

        if (this.frameCount >= this.maxFrames) {
            this.recording = false;
            return false;
        }

        // Capture canvas as blob
        this.canvas.toBlob((blob) => {
            if (blob) {
                this.frames.push(blob);
                this.frameCount++;
            }
        }, 'image/png');

        return true;
    }

    stop() {
        this.recording = false;
        return this.frames;
    }

    isRecording() {
        return this.recording;
    }

    getProgress() {
        return this.maxFrames > 0 ? this.frameCount / this.maxFrames : 0;
    }

    // Export as WebM video using MediaRecorder API
    async exportVideo(fps) {
        fps = fps || 30;

        return new Promise((resolve, reject) => {
            try {
                const stream = this.canvas.captureStream(fps);
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9'
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(blob);
                };

                recorder.onerror = reject;
                recorder.start();

                // Stop after a set duration
                setTimeout(() => recorder.stop(), (this.maxFrames / fps) * 1000);
            } catch (e) {
                reject(e);
            }
        });
    }
}

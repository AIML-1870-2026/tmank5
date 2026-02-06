// ============================================================================
// Turing Patterns - WebGL Simulation Engine
// GPU-accelerated reaction-diffusion computation using ping-pong FBOs
// ============================================================================

class TuringSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
        });

        if (!this.gl) {
            throw new Error('WebGL2 is not supported in this browser.');
        }

        const gl = this.gl;

        // Check for float texture support
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) {
            console.warn('EXT_color_buffer_float not available, falling back to half float');
            this.floatExt = gl.getExtension('EXT_color_buffer_half_float');
            this.textureFormat = gl.RGBA16F || gl.RGBA;
            this.textureType = gl.HALF_FLOAT || gl.FLOAT;
        } else {
            this.floatExt = ext;
            this.textureFormat = gl.RGBA32F;
            this.textureType = gl.FLOAT;
        }
        gl.getExtension('OES_texture_float_linear');

        // Simulation parameters
        this.width = 512;
        this.height = 512;
        this.params = {
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.055,
            kill: 0.062,
            dt: 1.0,
            boundary: 0,
            stepsPerFrame: 8
        };

        this.running = false;
        this.iteration = 0;
        this.currentReadIndex = 0; // which FBO to read from (0 or 1)

        this._initGL();
    }

    _initGL() {
        const gl = this.gl;

        // Create fullscreen quad
        this.quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);

        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        // Compile shaders
        this.simProgram = this._createProgram(TuringShaders.vertexShader, TuringShaders.simulationShader);
        this.brushProgram = this._createProgram(TuringShaders.vertexShader, TuringShaders.brushShader);
        this.seedProgram = this._createProgram(TuringShaders.vertexShader, TuringShaders.seedShader);
        this.copyProgram = this._createProgram(TuringShaders.vertexShader, TuringShaders.copyShader);

        // Cache uniform locations
        this._cacheUniforms();

        // Create ping-pong FBOs
        this._createFramebuffers();

        // Initialize with default seed
        this.seed(0, Math.random() * 100000);
    }

    _createProgram(vertSrc, fragSrc) {
        const gl = this.gl;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, 'a_position');
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);

        return prog;
    }

    _cacheUniforms() {
        const gl = this.gl;

        // Simulation uniforms
        this.simUniforms = {
            u_state: gl.getUniformLocation(this.simProgram, 'u_state'),
            u_resolution: gl.getUniformLocation(this.simProgram, 'u_resolution'),
            u_dt: gl.getUniformLocation(this.simProgram, 'u_dt'),
            u_Du: gl.getUniformLocation(this.simProgram, 'u_Du'),
            u_Dv: gl.getUniformLocation(this.simProgram, 'u_Dv'),
            u_feed: gl.getUniformLocation(this.simProgram, 'u_feed'),
            u_kill: gl.getUniformLocation(this.simProgram, 'u_kill'),
            u_model: gl.getUniformLocation(this.simProgram, 'u_model'),
            u_boundary: gl.getUniformLocation(this.simProgram, 'u_boundary'),
        };

        // Brush uniforms
        this.brushUniforms = {
            u_state: gl.getUniformLocation(this.brushProgram, 'u_state'),
            u_brushPos: gl.getUniformLocation(this.brushProgram, 'u_brushPos'),
            u_brushRadius: gl.getUniformLocation(this.brushProgram, 'u_brushRadius'),
            u_brushStrength: gl.getUniformLocation(this.brushProgram, 'u_brushStrength'),
            u_brushMode: gl.getUniformLocation(this.brushProgram, 'u_brushMode'),
            u_resolution: gl.getUniformLocation(this.brushProgram, 'u_resolution'),
            u_brushActive: gl.getUniformLocation(this.brushProgram, 'u_brushActive'),
        };

        // Seed uniforms
        this.seedUniforms = {
            u_resolution: gl.getUniformLocation(this.seedProgram, 'u_resolution'),
            u_seed: gl.getUniformLocation(this.seedProgram, 'u_seed'),
            u_seedMode: gl.getUniformLocation(this.seedProgram, 'u_seedMode'),
        };
    }

    _createTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.textureFormat, this.width, this.height,
            0, gl.RGBA, this.textureType, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    _createFramebuffers() {
        const gl = this.gl;

        // Create two FBO+texture pairs for ping-pong
        this.fbos = [];
        this.textures = [];

        for (let i = 0; i < 2; i++) {
            const tex = this._createTexture();
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error('Framebuffer incomplete:', status);
            }

            this.fbos.push(fbo);
            this.textures.push(tex);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _drawQuad() {
        const gl = this.gl;
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }

    // Resize the simulation grid
    resize(width, height) {
        if (width === this.width && height === this.height) return;

        const gl = this.gl;

        // Read current state if possible
        let oldData = null;
        if (this.textures[0]) {
            oldData = this.readState();
        }

        this.width = width;
        this.height = height;

        // Recreate textures and FBOs
        for (let i = 0; i < 2; i++) {
            gl.deleteTexture(this.textures[i]);
            gl.deleteFramebuffer(this.fbos[i]);
        }
        this._createFramebuffers();

        // Reinitialize
        this.seed(0, Math.random() * 100000);
    }

    // Seed the simulation with initial conditions
    seed(mode, seedValue) {
        const gl = this.gl;
        const writeIndex = 1 - this.currentReadIndex;

        gl.viewport(0, 0, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);

        gl.useProgram(this.seedProgram);
        gl.uniform2f(this.seedUniforms.u_resolution, this.width, this.height);
        gl.uniform1f(this.seedUniforms.u_seed, seedValue || 0);
        gl.uniform1i(this.seedUniforms.u_seedMode, mode);

        this._drawQuad();

        // Copy to read buffer too
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[this.currentReadIndex]);
        gl.useProgram(this.copyProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[writeIndex]);
        gl.uniform1i(gl.getUniformLocation(this.copyProgram, 'u_texture'), 0);
        this._drawQuad();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.iteration = 0;
    }

    // Load image data as initial conditions
    loadImageAsInitialCondition(imageData) {
        const gl = this.gl;
        const pixels = new Float32Array(this.width * this.height * 4);

        // Resample image to sim resolution
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const ctx = tempCanvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, this.width, this.height);
            const imgData = ctx.getImageData(0, 0, this.width, this.height);

            for (let i = 0; i < this.width * this.height; i++) {
                const brightness = (imgData.data[i * 4] + imgData.data[i * 4 + 1] + imgData.data[i * 4 + 2]) / (3 * 255);
                pixels[i * 4 + 0] = 1.0 - brightness * 0.5;  // u
                pixels[i * 4 + 1] = brightness * 0.5;         // v
                pixels[i * 4 + 2] = 0.0;                      // obstacle
                pixels[i * 4 + 3] = 1.0;
            }

            // Upload to both textures
            for (let t = 0; t < 2; t++) {
                gl.bindTexture(gl.TEXTURE_2D, this.textures[t]);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height,
                    gl.RGBA, this.textureType, pixels);
            }
            this.iteration = 0;
        };

        if (typeof imageData === 'string') {
            img.src = imageData;
        } else {
            img.src = URL.createObjectURL(imageData);
        }
    }

    // Perform one simulation step
    step() {
        const gl = this.gl;
        const readIndex = this.currentReadIndex;
        const writeIndex = 1 - readIndex;

        gl.viewport(0, 0, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);

        gl.useProgram(this.simProgram);

        // Bind state texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[readIndex]);
        gl.uniform1i(this.simUniforms.u_state, 0);

        // Set uniforms
        gl.uniform2f(this.simUniforms.u_resolution, this.width, this.height);
        gl.uniform1f(this.simUniforms.u_dt, this.params.dt);
        gl.uniform1f(this.simUniforms.u_Du, this.params.Du);
        gl.uniform1f(this.simUniforms.u_Dv, this.params.Dv);
        gl.uniform1f(this.simUniforms.u_feed, this.params.feed);
        gl.uniform1f(this.simUniforms.u_kill, this.params.kill);
        gl.uniform1i(this.simUniforms.u_model, this.params.model);
        gl.uniform1i(this.simUniforms.u_boundary, this.params.boundary);

        this._drawQuad();

        // Swap
        this.currentReadIndex = writeIndex;
        this.iteration++;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Perform multiple simulation steps
    stepN(n) {
        for (let i = 0; i < n; i++) {
            this.step();
        }
    }

    // Apply brush stroke
    applyBrush(normX, normY, radius, strength, mode) {
        const gl = this.gl;
        const readIndex = this.currentReadIndex;
        const writeIndex = 1 - readIndex;

        gl.viewport(0, 0, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);

        gl.useProgram(this.brushProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[readIndex]);
        gl.uniform1i(this.brushUniforms.u_state, 0);

        gl.uniform2f(this.brushUniforms.u_brushPos, normX, normY);
        gl.uniform1f(this.brushUniforms.u_brushRadius, radius);
        gl.uniform1f(this.brushUniforms.u_brushStrength, strength);
        gl.uniform1i(this.brushUniforms.u_brushMode, mode);
        gl.uniform2f(this.brushUniforms.u_resolution, this.width, this.height);
        gl.uniform1i(this.brushUniforms.u_brushActive, 1);

        this._drawQuad();

        this.currentReadIndex = writeIndex;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Get the current state texture (for rendering)
    getCurrentTexture() {
        return this.textures[this.currentReadIndex];
    }

    // Read simulation state back to CPU (for save/export)
    readState() {
        const gl = this.gl;
        const pixels = new Float32Array(this.width * this.height * 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[this.currentReadIndex]);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return pixels;
    }

    // Write state from CPU data
    writeState(data) {
        const gl = this.gl;
        const pixels = data instanceof Float32Array ? data : new Float32Array(data);

        for (let i = 0; i < 2; i++) {
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height,
                gl.RGBA, this.textureType, pixels);
        }
        this.iteration = 0;
    }

    // Compute statistics from the simulation state
    computeStats() {
        const data = this.readState();
        let sumU = 0, sumV = 0, count = 0;
        let minV = 1, maxV = 0;

        for (let i = 0; i < data.length; i += 4) {
            const u = data[i];
            const v = data[i + 1];
            const obs = data[i + 2];
            if (obs < 0.5) {
                sumU += u;
                sumV += v;
                minV = Math.min(minV, v);
                maxV = Math.max(maxV, v);
                count++;
            }
        }

        const meanU = count > 0 ? sumU / count : 0;
        const meanV = count > 0 ? sumV / count : 0;
        const coverage = count > 0 ? sumV / count : 0;

        // Simple entropy estimate
        const bins = 32;
        const hist = new Array(bins).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 2] < 0.5) {
                const bin = Math.min(bins - 1, Math.floor(data[i + 1] * bins));
                hist[bin]++;
            }
        }
        let entropy = 0;
        for (let i = 0; i < bins; i++) {
            if (hist[i] > 0) {
                const p = hist[i] / count;
                entropy -= p * Math.log2(p);
            }
        }

        return {
            iteration: this.iteration,
            meanU: meanU.toFixed(4),
            meanV: meanV.toFixed(4),
            coverage: (coverage * 100).toFixed(1),
            entropy: entropy.toFixed(3),
            minV: minV.toFixed(4),
            maxV: maxV.toFixed(4)
        };
    }

    // Update simulation parameters
    setParams(params) {
        Object.assign(this.params, params);
    }

    // Cleanup
    destroy() {
        const gl = this.gl;
        for (let i = 0; i < 2; i++) {
            gl.deleteTexture(this.textures[i]);
            gl.deleteFramebuffer(this.fbos[i]);
        }
        gl.deleteProgram(this.simProgram);
        gl.deleteProgram(this.brushProgram);
        gl.deleteProgram(this.seedProgram);
        gl.deleteProgram(this.copyProgram);
    }
}

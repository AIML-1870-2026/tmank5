// ============================================================================
// Turing Patterns - GLSL Shaders
// All WebGL2 shader source code for simulation, rendering, and post-processing
// ============================================================================

const TuringShaders = {

    // Shared fullscreen quad vertex shader
    vertexShader: `#version 300 es
        in vec2 a_position;
        out vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `,

    // ========================================================================
    // Simulation Step Shader
    // Computes one timestep of the reaction-diffusion equations
    // Supports Gray-Scott, FitzHugh-Nagumo, and Gierer-Meinhardt models
    // ========================================================================
    simulationShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_state;
        uniform vec2 u_resolution;
        uniform float u_dt;
        uniform float u_Du;
        uniform float u_Dv;
        uniform float u_feed;
        uniform float u_kill;
        uniform int u_model;      // 0=Gray-Scott, 1=FitzHugh-Nagumo, 2=Gierer-Meinhardt
        uniform int u_boundary;   // 0=wrap, 1=reflect, 2=fixed
        uniform int u_stepsPerFrame;

        in vec2 v_uv;
        out vec4 fragColor;

        vec4 getTexel(ivec2 coord) {
            ivec2 size = ivec2(u_resolution);
            if (u_boundary == 0) {
                // Wrap (toroidal)
                coord = ((coord % size) + size) % size;
            } else if (u_boundary == 1) {
                // Reflect (Neumann)
                if (coord.x < 0) coord.x = -coord.x - 1;
                if (coord.y < 0) coord.y = -coord.y - 1;
                if (coord.x >= size.x) coord.x = 2 * size.x - coord.x - 1;
                if (coord.y >= size.y) coord.y = 2 * size.y - coord.y - 1;
                coord = clamp(coord, ivec2(0), size - 1);
            } else {
                // Fixed (Dirichlet)
                if (coord.x < 0 || coord.x >= size.x || coord.y < 0 || coord.y >= size.y) {
                    return vec4(1.0, 0.0, 0.0, 1.0);
                }
            }
            return texelFetch(u_state, coord, 0);
        }

        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec4 center = texelFetch(u_state, coord, 0);
            float u = center.r;
            float v = center.g;
            float obstacle = center.b;

            // Obstacles block all diffusion
            if (obstacle > 0.5) {
                fragColor = center;
                return;
            }

            // 9-point Laplacian stencil (weighted)
            // [ 0.05  0.2  0.05 ]
            // [ 0.2  -1.0  0.2  ]
            // [ 0.05  0.2  0.05 ]
            vec4 tl = getTexel(coord + ivec2(-1,  1));
            vec4 tc = getTexel(coord + ivec2( 0,  1));
            vec4 tr = getTexel(coord + ivec2( 1,  1));
            vec4 ml = getTexel(coord + ivec2(-1,  0));
            vec4 mr = getTexel(coord + ivec2( 1,  0));
            vec4 bl = getTexel(coord + ivec2(-1, -1));
            vec4 bc = getTexel(coord + ivec2( 0, -1));
            vec4 br = getTexel(coord + ivec2( 1, -1));

            float lapU = 0.05 * tl.r + 0.2 * tc.r + 0.05 * tr.r
                       + 0.2  * ml.r                + 0.2  * mr.r
                       + 0.05 * bl.r + 0.2 * bc.r + 0.05 * br.r
                       - 1.0 * u;
            float lapV = 0.05 * tl.g + 0.2 * tc.g + 0.05 * tr.g
                       + 0.2  * ml.g                + 0.2  * mr.g
                       + 0.05 * bl.g + 0.2 * bc.g + 0.05 * br.g
                       - 1.0 * v;

            float du, dv;

            if (u_model == 0) {
                // Gray-Scott model
                float uvv = u * v * v;
                du = u_Du * lapU - uvv + u_feed * (1.0 - u);
                dv = u_Dv * lapV + uvv - (u_feed + u_kill) * v;
            } else if (u_model == 1) {
                // FitzHugh-Nagumo model
                float epsilon = u_feed;
                float a1 = u_kill;
                float a0 = 0.0;
                du = u_Du * lapU + u - u * u * u - v;
                dv = u_Dv * lapV + epsilon * (u - a1 * v - a0);
            } else {
                // Gierer-Meinhardt model
                float rho = u_feed * 10.0;
                float mu = u_kill * 10.0;
                float rho0 = 0.001;
                float nu = mu * 1.5;
                float denom = v + 0.001;
                du = u_Du * lapU + rho * u * u / denom - mu * u + rho0;
                dv = u_Dv * lapV + rho * u * u - nu * v;
            }

            float newU = u + u_dt * du;
            float newV = v + u_dt * dv;

            newU = clamp(newU, 0.0, 1.0);
            newV = clamp(newV, 0.0, 1.0);

            fragColor = vec4(newU, newV, obstacle, 1.0);
        }
    `,

    // ========================================================================
    // Brush Shader
    // Applies brush strokes (adding/removing chemicals, obstacles)
    // ========================================================================
    brushShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_state;
        uniform vec2 u_brushPos;      // normalized [0,1]
        uniform float u_brushRadius;  // normalized
        uniform float u_brushStrength;
        uniform int u_brushMode;      // 0=activator, 1=inhibitor, 2=eraser, 3=obstacle, 4=remove_obstacle
        uniform vec2 u_resolution;
        uniform bool u_brushActive;

        in vec2 v_uv;
        out vec4 fragColor;

        void main() {
            vec4 current = texture(u_state, v_uv);

            if (!u_brushActive) {
                fragColor = current;
                return;
            }

            vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
            float dist = length((v_uv - u_brushPos) * aspect);
            float influence = smoothstep(u_brushRadius, u_brushRadius * 0.3, dist) * u_brushStrength;

            if (influence <= 0.0) {
                fragColor = current;
                return;
            }

            float u = current.r;
            float v = current.g;
            float obs = current.b;

            if (u_brushMode == 0) {
                // Add activator
                v = mix(v, 1.0, influence);
                u = mix(u, 0.5, influence * 0.5);
            } else if (u_brushMode == 1) {
                // Add inhibitor
                u = mix(u, 1.0, influence);
                v = mix(v, 0.0, influence);
            } else if (u_brushMode == 2) {
                // Eraser - reset to base state
                u = mix(u, 1.0, influence);
                v = mix(v, 0.0, influence);
                obs = mix(obs, 0.0, influence);
            } else if (u_brushMode == 3) {
                // Place obstacle
                obs = mix(obs, 1.0, influence);
            } else if (u_brushMode == 4) {
                // Remove obstacle
                obs = mix(obs, 0.0, influence);
            }

            fragColor = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), clamp(obs, 0.0, 1.0), 1.0);
        }
    `,

    // ========================================================================
    // Display Shader
    // Maps simulation state to colors using various palettes
    // ========================================================================
    displayShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_state;
        uniform int u_colorScheme;    // 0-7
        uniform float u_brightness;
        uniform float u_contrast;
        uniform float u_saturation;
        uniform bool u_showObstacles;
        uniform vec3 u_customColors[6]; // custom gradient stops
        uniform int u_customColorCount;

        in vec2 v_uv;
        out vec4 fragColor;

        vec3 heatmap(float t) {
            vec3 c;
            if (t < 0.33) {
                c = mix(vec3(0.0, 0.0, 0.3), vec3(0.0, 0.3, 0.8), t / 0.33);
            } else if (t < 0.66) {
                c = mix(vec3(0.0, 0.3, 0.8), vec3(1.0, 0.3, 0.0), (t - 0.33) / 0.33);
            } else {
                c = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 1.0, 0.2), (t - 0.66) / 0.34);
            }
            return c;
        }

        vec3 neon(float t) {
            float r = 0.5 + 0.5 * sin(3.14159 * 2.0 * t + 0.0);
            float g = 0.5 + 0.5 * sin(3.14159 * 2.0 * t + 2.094);
            float b = 0.5 + 0.5 * sin(3.14159 * 2.0 * t + 4.189);
            return vec3(r * 0.8 + 0.2, g * 0.5, b * 0.9 + 0.1);
        }

        vec3 ocean(float t) {
            vec3 deep = vec3(0.0, 0.05, 0.15);
            vec3 mid = vec3(0.0, 0.3, 0.5);
            vec3 shallow = vec3(0.2, 0.7, 0.8);
            vec3 foam = vec3(0.85, 0.95, 1.0);
            if (t < 0.33) return mix(deep, mid, t / 0.33);
            if (t < 0.66) return mix(mid, shallow, (t - 0.33) / 0.33);
            return mix(shallow, foam, (t - 0.66) / 0.34);
        }

        vec3 forest(float t) {
            vec3 dark = vec3(0.05, 0.1, 0.02);
            vec3 mid = vec3(0.1, 0.35, 0.05);
            vec3 light = vec3(0.3, 0.6, 0.1);
            vec3 bright = vec3(0.7, 0.85, 0.2);
            if (t < 0.33) return mix(dark, mid, t / 0.33);
            if (t < 0.66) return mix(mid, light, (t - 0.33) / 0.33);
            return mix(light, bright, (t - 0.66) / 0.34);
        }

        vec3 sunset(float t) {
            vec3 night = vec3(0.1, 0.0, 0.2);
            vec3 purple = vec3(0.4, 0.1, 0.5);
            vec3 orange = vec3(0.9, 0.4, 0.1);
            vec3 gold = vec3(1.0, 0.8, 0.3);
            if (t < 0.33) return mix(night, purple, t / 0.33);
            if (t < 0.66) return mix(purple, orange, (t - 0.33) / 0.33);
            return mix(orange, gold, (t - 0.66) / 0.34);
        }

        vec3 plasma(float t) {
            // Viridis-like perceptually uniform
            float r = 0.5 + 0.5 * cos(6.28318 * (t * 0.8 + 0.0));
            float g = 0.5 + 0.5 * cos(6.28318 * (t * 0.8 + 0.33));
            float b = 0.5 + 0.5 * cos(6.28318 * (t * 0.8 + 0.67));
            return vec3(
                mix(0.05, 0.95, pow(t, 0.7)),
                mix(0.0, 0.9, sin(t * 3.14159)),
                mix(0.53, 0.15, t)
            );
        }

        vec3 customGradient(float t) {
            if (u_customColorCount <= 1) return u_customColors[0];
            float step = 1.0 / float(u_customColorCount - 1);
            for (int i = 0; i < 5; i++) {
                if (i >= u_customColorCount - 1) break;
                float lo = float(i) * step;
                float hi = float(i + 1) * step;
                if (t >= lo && t <= hi) {
                    float localT = (t - lo) / (hi - lo);
                    return mix(u_customColors[i], u_customColors[i + 1], localT);
                }
            }
            return u_customColors[u_customColorCount - 1];
        }

        void main() {
            vec4 state = texture(u_state, v_uv);
            float val = state.g; // Visualize v (inhibitor) concentration

            // Apply contrast and brightness
            val = (val - 0.5) * u_contrast + 0.5 + u_brightness;
            val = clamp(val, 0.0, 1.0);

            vec3 color;

            if (u_colorScheme == 0) {
                color = heatmap(val);
            } else if (u_colorScheme == 1) {
                color = neon(val);
            } else if (u_colorScheme == 2) {
                // Grayscale
                color = vec3(val);
            } else if (u_colorScheme == 3) {
                // Inverted grayscale
                color = vec3(1.0 - val);
            } else if (u_colorScheme == 4) {
                color = ocean(val);
            } else if (u_colorScheme == 5) {
                color = forest(val);
            } else if (u_colorScheme == 6) {
                color = sunset(val);
            } else if (u_colorScheme == 7) {
                color = plasma(val);
            } else {
                color = customGradient(val);
            }

            // Apply saturation
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(gray), color, u_saturation);

            // Show obstacles as dark with a subtle highlight
            if (u_showObstacles && state.b > 0.5) {
                color = vec3(0.15, 0.15, 0.2);
            }

            fragColor = vec4(color, 1.0);
        }
    `,

    // ========================================================================
    // Bloom/Glow - Blur pass (horizontal or vertical)
    // ========================================================================
    blurShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_texture;
        uniform vec2 u_direction; // (1/w, 0) for horizontal, (0, 1/h) for vertical
        uniform float u_blurAmount;

        in vec2 v_uv;
        out vec4 fragColor;

        void main() {
            vec4 color = vec4(0.0);
            float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

            color += texture(u_texture, v_uv) * weights[0];
            for (int i = 1; i < 5; i++) {
                vec2 offset = u_direction * float(i) * u_blurAmount;
                color += texture(u_texture, v_uv + offset) * weights[i];
                color += texture(u_texture, v_uv - offset) * weights[i];
            }

            fragColor = color;
        }
    `,

    // ========================================================================
    // Edge Detection (Sobel)
    // ========================================================================
    edgeShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_texture;
        uniform vec2 u_texelSize;
        uniform float u_edgeStrength;

        in vec2 v_uv;
        out vec4 fragColor;

        void main() {
            // Sobel operator
            vec3 tl = texture(u_texture, v_uv + vec2(-1, -1) * u_texelSize).rgb;
            vec3 tc = texture(u_texture, v_uv + vec2( 0, -1) * u_texelSize).rgb;
            vec3 tr = texture(u_texture, v_uv + vec2( 1, -1) * u_texelSize).rgb;
            vec3 ml = texture(u_texture, v_uv + vec2(-1,  0) * u_texelSize).rgb;
            vec3 mr = texture(u_texture, v_uv + vec2( 1,  0) * u_texelSize).rgb;
            vec3 bl = texture(u_texture, v_uv + vec2(-1,  1) * u_texelSize).rgb;
            vec3 bc = texture(u_texture, v_uv + vec2( 0,  1) * u_texelSize).rgb;
            vec3 br = texture(u_texture, v_uv + vec2( 1,  1) * u_texelSize).rgb;

            vec3 gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
            vec3 gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;

            vec3 edge = sqrt(gx * gx + gy * gy);
            vec3 original = texture(u_texture, v_uv).rgb;

            fragColor = vec4(mix(original, original + edge, u_edgeStrength), 1.0);
        }
    `,

    // ========================================================================
    // Composite shader (bloom combine + final adjustments)
    // ========================================================================
    compositeShader: `#version 300 es
        precision highp float;

        uniform sampler2D u_scene;
        uniform sampler2D u_bloom;
        uniform float u_bloomStrength;
        uniform float u_bloomEnabled;

        in vec2 v_uv;
        out vec4 fragColor;

        void main() {
            vec3 scene = texture(u_scene, v_uv).rgb;
            vec3 bloom = texture(u_bloom, v_uv).rgb;

            vec3 color = scene + bloom * u_bloomStrength * u_bloomEnabled;

            // Tone mapping (simple Reinhard)
            color = color / (1.0 + color);

            fragColor = vec4(color, 1.0);
        }
    `,

    // ========================================================================
    // Seed/initialization shader
    // ========================================================================
    seedShader: `#version 300 es
        precision highp float;

        uniform vec2 u_resolution;
        uniform float u_seed;
        uniform int u_seedMode; // 0=center_square, 1=random_spots, 2=random_noise, 3=clear

        out vec4 fragColor;

        // Simple hash function
        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21) + u_seed);
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            vec2 center = vec2(0.5);

            float u = 1.0;
            float v = 0.0;

            if (u_seedMode == 0) {
                // Center square with perturbation
                vec2 d = abs(uv - center);
                if (d.x < 0.05 && d.y < 0.05) {
                    u = 0.5;
                    v = 0.25;
                }
                // Add small random perturbation everywhere
                u += (hash(gl_FragCoord.xy) - 0.5) * 0.01;
                v += (hash(gl_FragCoord.xy + 100.0) - 0.5) * 0.01;
            } else if (u_seedMode == 1) {
                // Random spots
                for (float i = 0.0; i < 20.0; i++) {
                    vec2 spotPos = vec2(hash(vec2(i, 0.0)), hash(vec2(0.0, i)));
                    float spotDist = length(uv - spotPos);
                    float spotRadius = 0.01 + hash(vec2(i, i)) * 0.03;
                    if (spotDist < spotRadius) {
                        u = 0.5;
                        v = 0.25;
                    }
                }
                u += (hash(gl_FragCoord.xy) - 0.5) * 0.01;
                v += (hash(gl_FragCoord.xy + 100.0) - 0.5) * 0.01;
            } else if (u_seedMode == 2) {
                // Random noise
                float n = hash(gl_FragCoord.xy);
                if (n > 0.9) {
                    u = 0.5 + (hash(gl_FragCoord.xy + 50.0) - 0.5) * 0.5;
                    v = 0.25 + (hash(gl_FragCoord.xy + 150.0) - 0.5) * 0.1;
                }
            } else {
                // Clear
                u = 1.0;
                v = 0.0;
            }

            fragColor = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
        }
    `,

    // ========================================================================
    // Copy shader (simple passthrough)
    // ========================================================================
    copyShader: `#version 300 es
        precision highp float;
        uniform sampler2D u_texture;
        in vec2 v_uv;
        out vec4 fragColor;
        void main() {
            fragColor = texture(u_texture, v_uv);
        }
    `
};

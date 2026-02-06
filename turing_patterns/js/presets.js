// ============================================================================
// Turing Patterns - Presets & Color Schemes
// Pattern presets library and color palette definitions
// ============================================================================

const TuringPresets = {

    // ========================================================================
    // Pattern Presets
    // Each preset defines parameters for a specific pattern type
    // ========================================================================
    patterns: {
        spots: {
            name: "Spots",
            description: "Stable circular formations resembling animal skin patterns",
            model: 0, // Gray-Scott
            Du: 1.0,
            Dv: 0.5,
            feed: 0.034,
            kill: 0.066,
            dt: 1.0,
            seedMode: 1 // random spots
        },
        stripes: {
            name: "Stripes",
            description: "Parallel band patterns similar to zebra or tiger markings",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.025,
            kill: 0.060,
            dt: 1.0,
            seedMode: 2
        },
        labyrinth: {
            name: "Labyrinth",
            description: "Maze-like winding structures with organic branching",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.029,
            kill: 0.057,
            dt: 1.0,
            seedMode: 2
        },
        spirals: {
            name: "Spirals",
            description: "Rotating wave patterns that create spiral formations",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.014,
            kill: 0.054,
            dt: 1.0,
            seedMode: 2
        },
        mitosis: {
            name: "Mitosis",
            description: "Spots that grow and divide, mimicking cell division",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.0367,
            kill: 0.0649,
            dt: 1.0,
            seedMode: 0
        },
        waves: {
            name: "Waves",
            description: "Traveling wave fronts that propagate across the field",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.018,
            kill: 0.051,
            dt: 1.0,
            seedMode: 0
        },
        coral: {
            name: "Coral",
            description: "Branching coral-like growth patterns",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.062,
            kill: 0.063,
            dt: 1.0,
            seedMode: 0
        },
        fingerprint: {
            name: "Fingerprint",
            description: "Dense labyrinthine patterns resembling fingerprints",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.056,
            kill: 0.065,
            dt: 1.0,
            seedMode: 2
        },
        wormsAndLoops: {
            name: "Worms & Loops",
            description: "Worm-like structures that form closed loops",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.078,
            kill: 0.061,
            dt: 1.0,
            seedMode: 2
        },
        chaotic: {
            name: "Chaotic",
            description: "Unstable, constantly evolving turbulent patterns",
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: 0.026,
            kill: 0.051,
            dt: 1.0,
            seedMode: 2
        },
        // FitzHugh-Nagumo presets
        fhn_spirals: {
            name: "FHN Spirals",
            description: "Spiral waves from the FitzHugh-Nagumo excitable system",
            model: 1,
            Du: 1.0,
            Dv: 0.3,
            feed: 0.1,   // epsilon
            kill: 1.0,   // a1
            dt: 0.02,
            seedMode: 0
        },
        fhn_target: {
            name: "FHN Target",
            description: "Target wave patterns from the FitzHugh-Nagumo model",
            model: 1,
            Du: 1.0,
            Dv: 0.05,
            feed: 0.08,
            kill: 0.8,
            dt: 0.02,
            seedMode: 0
        },
        // Gierer-Meinhardt presets
        gm_spots: {
            name: "GM Spots",
            description: "Stable spots from the Gierer-Meinhardt activator-inhibitor model",
            model: 2,
            Du: 0.5,
            Dv: 10.0,
            feed: 0.05,   // rho (scaled)
            kill: 0.04,   // mu (scaled)
            dt: 0.1,
            seedMode: 2
        },
        gm_stripes: {
            name: "GM Stripes",
            description: "Stripe patterns from the Gierer-Meinhardt model",
            model: 2,
            Du: 0.5,
            Dv: 15.0,
            feed: 0.06,
            kill: 0.03,
            dt: 0.1,
            seedMode: 2
        }
    },

    // ========================================================================
    // Color Schemes
    // ========================================================================
    colorSchemes: [
        { id: 0, name: "Heat Map", description: "Classic blue to red to yellow gradient" },
        { id: 1, name: "Neon", description: "Vibrant cyan, magenta, and yellow" },
        { id: 2, name: "Grayscale", description: "Simple black to white" },
        { id: 3, name: "Inverted", description: "White to black (inverted grayscale)" },
        { id: 4, name: "Ocean", description: "Deep sea to shallow water blues" },
        { id: 5, name: "Forest", description: "Dark to bright green tones" },
        { id: 6, name: "Sunset", description: "Purple to orange to gold gradient" },
        { id: 7, name: "Plasma", description: "Perceptually uniform warm gradient" },
        { id: 8, name: "Custom", description: "User-defined color gradient" }
    ],

    // ========================================================================
    // Utility: Generate random valid Gray-Scott parameters
    // ========================================================================
    randomGrayScott(seed) {
        // Use a seeded random for reproducibility
        function seededRandom(s) {
            let x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        }

        seed = seed || Math.random() * 100000;
        const regions = [
            { fMin: 0.010, fMax: 0.025, kMin: 0.045, kMax: 0.055 }, // spirals/waves
            { fMin: 0.025, fMax: 0.040, kMin: 0.055, kMax: 0.065 }, // spots
            { fMin: 0.040, fMax: 0.060, kMin: 0.060, kMax: 0.066 }, // stripes/labyrinth
            { fMin: 0.055, fMax: 0.080, kMin: 0.060, kMax: 0.065 }, // worms
        ];

        const region = regions[Math.floor(seededRandom(seed) * regions.length)];
        const feed = region.fMin + seededRandom(seed + 1) * (region.fMax - region.fMin);
        const kill = region.kMin + seededRandom(seed + 2) * (region.kMax - region.kMin);

        return {
            seed: seed,
            model: 0,
            Du: 1.0,
            Dv: 0.5,
            feed: parseFloat(feed.toFixed(4)),
            kill: parseFloat(kill.toFixed(4)),
            dt: 1.0,
            seedMode: Math.random() > 0.5 ? 1 : 2
        };
    },

    // ========================================================================
    // Save/Load state to JSON
    // ========================================================================
    exportState(params, gridData) {
        return JSON.stringify({
            version: 1,
            timestamp: Date.now(),
            params: params,
            grid: gridData ? Array.from(gridData) : null
        });
    },

    importState(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.version !== 1) throw new Error("Unknown state version");
            return data;
        } catch (e) {
            console.error("Failed to import state:", e);
            return null;
        }
    },

    // LocalStorage quick saves
    quickSave(name, params) {
        const saves = JSON.parse(localStorage.getItem('turing_saves') || '{}');
        saves[name] = {
            timestamp: Date.now(),
            params: params
        };
        localStorage.setItem('turing_saves', JSON.stringify(saves));
    },

    quickLoad(name) {
        const saves = JSON.parse(localStorage.getItem('turing_saves') || '{}');
        return saves[name] || null;
    },

    listSaves() {
        const saves = JSON.parse(localStorage.getItem('turing_saves') || '{}');
        return Object.keys(saves).map(name => ({
            name,
            timestamp: saves[name].timestamp
        }));
    },

    deleteSave(name) {
        const saves = JSON.parse(localStorage.getItem('turing_saves') || '{}');
        delete saves[name];
        localStorage.setItem('turing_saves', JSON.stringify(saves));
    }
};

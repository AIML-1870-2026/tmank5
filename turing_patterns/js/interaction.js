// ============================================================================
// Turing Patterns - Interaction Manager
// Handles mouse/touch input, drawing tools, and canvas interaction
// ============================================================================

class TuringInteraction {
    constructor(canvas, simulation) {
        this.canvas = canvas;
        this.sim = simulation;

        // Brush state
        this.brushMode = 0;      // 0=activator, 1=inhibitor, 2=eraser, 3=obstacle, 4=remove_obstacle
        this.brushRadius = 0.03; // normalized
        this.brushStrength = 0.8;
        this.isDrawing = false;
        this.lastPos = null;

        // Cursor element
        this.cursorEl = document.getElementById('brush-cursor');

        // Bind events
        this._bindEvents();
    }

    _bindEvents() {
        const canvas = this.canvas;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this._onPointerDown(e));
        canvas.addEventListener('mousemove', (e) => this._onPointerMove(e));
        canvas.addEventListener('mouseup', (e) => this._onPointerUp(e));
        canvas.addEventListener('mouseleave', (e) => this._onPointerUp(e));

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._onPointerDown(this._touchToMouse(e));
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this._onPointerMove(this._touchToMouse(e));
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._onPointerUp(e);
        }, { passive: false });

        // Update cursor on canvas hover
        canvas.addEventListener('mousemove', (e) => this._updateCursor(e));
        canvas.addEventListener('mouseenter', () => {
            if (this.cursorEl) this.cursorEl.style.display = 'block';
        });
        canvas.addEventListener('mouseleave', () => {
            if (this.cursorEl) this.cursorEl.style.display = 'none';
        });
    }

    _touchToMouse(touchEvent) {
        const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0
        };
    }

    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const pixelX = (e.clientX - rect.left) * scaleX;
        const pixelY = (e.clientY - rect.top) * scaleY;

        // Normalized coordinates [0, 1]
        return {
            x: pixelX / this.canvas.width,
            y: 1.0 - (pixelY / this.canvas.height), // flip Y for OpenGL
            pixelX,
            pixelY
        };
    }

    _onPointerDown(e) {
        if (e.button !== 0) return;
        this.isDrawing = true;
        const pos = this._getCanvasPos(e);
        this.lastPos = pos;
        this._applyBrushAt(pos.x, pos.y);
    }

    _onPointerMove(e) {
        if (!this.isDrawing) return;
        const pos = this._getCanvasPos(e);

        // Interpolate between last position and current for smooth strokes
        if (this.lastPos) {
            const dx = pos.x - this.lastPos.x;
            const dy = pos.y - this.lastPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const stepSize = this.brushRadius * 0.3;

            if (dist > stepSize) {
                const steps = Math.ceil(dist / stepSize);
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const ix = this.lastPos.x + dx * t;
                    const iy = this.lastPos.y + dy * t;
                    this._applyBrushAt(ix, iy);
                }
            } else {
                this._applyBrushAt(pos.x, pos.y);
            }
        }

        this.lastPos = pos;
    }

    _onPointerUp(e) {
        this.isDrawing = false;
        this.lastPos = null;
    }

    _applyBrushAt(x, y) {
        this.sim.applyBrush(x, y, this.brushRadius, this.brushStrength, this.brushMode);
    }

    _updateCursor(e) {
        if (!this.cursorEl) return;

        const rect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentElement.getBoundingClientRect();

        // Calculate brush size in screen pixels
        const canvasDisplayWidth = rect.width;
        const brushScreenSize = this.brushRadius * 2 * canvasDisplayWidth;

        this.cursorEl.style.width = brushScreenSize + 'px';
        this.cursorEl.style.height = brushScreenSize + 'px';
        this.cursorEl.style.left = (e.clientX - containerRect.left) + 'px';
        this.cursorEl.style.top = (e.clientY - containerRect.top) + 'px';

        // Color based on brush mode
        const colors = [
            'rgba(88, 166, 255, 0.6)',   // activator
            'rgba(248, 81, 73, 0.6)',    // inhibitor
            'rgba(255, 255, 255, 0.6)',  // eraser
            'rgba(210, 153, 34, 0.6)',   // obstacle
            'rgba(63, 185, 80, 0.6)'    // remove obstacle
        ];
        this.cursorEl.style.borderColor = colors[this.brushMode] || colors[0];
    }

    setBrushMode(mode) {
        this.brushMode = mode;
    }

    setBrushRadius(radius) {
        this.brushRadius = radius;
    }

    setBrushStrength(strength) {
        this.brushStrength = strength;
    }
}

// scripts/shape.js
import { getShapePoints } from './utilities.js';

export class Shape {
    constructor(canvas, shapeName, settings) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shapeName = shapeName;
        this.settings = settings;
        this.animationIndex = 0;
        this.oscillationOffset = 0;
        this.center = { x: 0, y: 0 };
        this.shapePoints = [];

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.shapePoints = getShapePoints(this.shapeName, this.center);
        this.animate();
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.shapePoints = getShapePoints(this.shapeName, this.center);
    }

    setSettings(newSettings) {
        Object.assign(this.settings, newSettings);
    }

    animate() {
        const { speed, offset, frequency, tailLength, noiseLevel } = this.settings;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.shapePoints.length > 0) {
            this.animationIndex = (this.animationIndex + speed / 10) % this.shapePoints.length;
            this.oscillationOffset += frequency * 0.05;
            for (let i = 0; i < tailLength; i++) {
                let idx = Math.floor((this.animationIndex - i * (speed / 10)) % this.shapePoints.length);
                if (idx < 0) idx += this.shapePoints.length;
                const idxNext = (idx + 1) % this.shapePoints.length;
                const pCurrent = this.shapePoints[idx], pNext = this.shapePoints[idxNext];
                const dx = pNext.x - pCurrent.x, dy = pNext.y - pCurrent.y;
                const length = Math.hypot(dx, dy) || 1;
                const perp = { x: -dy / length, y: dx / length };
                const osc = Math.sin(this.oscillationOffset + i * 0.3) * offset * (1 - i / tailLength);
                const noise = () => (Math.random() - 0.5) * 2 * noiseLevel;
                const nx = pCurrent.x + perp.x * osc + noise(), ny = pCurrent.y + perp.y * osc + noise();
                const nnx = pNext.x + perp.x * osc + noise(), nny = pNext.y + perp.y * osc + noise();
                const fade = Math.max(0, 255 - Math.floor((i / tailLength) * 255));
                this.ctx.strokeStyle = `rgba(57,255,${Math.min(20, fade)},1)`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(nx, ny);
                this.ctx.lineTo(nnx, nny);
                this.ctx.stroke();
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}
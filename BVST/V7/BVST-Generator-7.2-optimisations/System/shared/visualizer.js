import { injectVisualizerStyles } from './ui_styles.js';

export class Visualizer {
    constructor(config = {}) {
        this.mode = config.mode || 'scope'; // scope, spectrum
        this.containerId = config.containerId;
        this.canvas = null;
        this.ctx = null;
        this.data = null;
        this.colors = { scope: '#00f0ff', spectrum: '#ff0055', trail: 'rgba(0,0,0,0.2)' };
        
        // Listen for data from Host
        window.addEventListener('message', (e) => {
            if (e.data.type === 'BVST_VIS_DATA') {
                this.data = e.data.data; // Float32Array or Uint8Array
                this.draw();
            }
        });
        
        // Notify Host to start sending data
        this.start();
    }

    start() {
        window.parent.postMessage({ type: 'BVST_VISUALIZER_MODE', mode: this.mode }, '*');
    }

    stop() {
        window.parent.postMessage({ type: 'BVST_VISUALIZER_MODE', mode: 'off' }, '*');
    }

    buildUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        injectVisualizerStyles();

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'bvst-visualizer';
        // Inline styles removed, handled by CSS class
        
        container.appendChild(this.canvas);
        
        // Read CSS variables
        const style = getComputedStyle(this.canvas);
        this.colors.scope = style.getPropertyValue('--viz-scope-color').trim() || '#00f0ff';
        this.colors.spectrum = style.getPropertyValue('--viz-spectrum-color').trim() || '#ff0055';
        this.colors.trail = style.getPropertyValue('--viz-trail-color').trim() || 'rgba(0,0,0,0.2)';

        // Resize observer to handle layout changes
        new ResizeObserver(() => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }).observe(this.canvas);

        this.ctx = this.canvas.getContext('2d');
    }

    draw() {
        if (!this.canvas || !this.ctx || !this.data) return;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        
        ctx.fillStyle = this.colors.trail; 
        ctx.fillRect(0, 0, w, h);
        
        const len = this.data.length;
        // Optimization: Step skip if data is much larger than screen width
        const step = Math.ceil(len / w);

        if (this.mode === 'scope') {
            ctx.lineWidth = 2;
            ctx.strokeStyle = this.colors.scope;
            ctx.beginPath();
            
            const sliceWidth = w * 1.0 / (len / step);
            let x = 0;
            
            for(let i = 0; i < len; i += step) {
                const v = this.data[i] * 0.5 + 0.5; // Norm 0-1 (assuming -1 to 1 input)
                const y = v * h;
                
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                
                x += sliceWidth;
            }
            ctx.stroke();
        } else if (this.mode === 'spectrum') {
            const barWidth = (w / (len / step)) * 2.5;
            let x = 0;
            ctx.fillStyle = this.colors.spectrum;
            
            for(let i = 0; i < len; i += step) {
                const v = this.data[i] / 255.0; // 0-1
                const barHeight = v * h;
                
                ctx.fillRect(x, h - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }
    }
}
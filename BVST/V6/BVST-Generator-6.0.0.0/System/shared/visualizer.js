
export class Visualizer {
    constructor(config = {}) {
        this.mode = config.mode || 'scope'; // scope, spectrum
        this.containerId = config.containerId;
        this.canvas = null;
        this.ctx = null;
        this.data = null;
        
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

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'bvst-visualizer';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.background = '#000';
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.border = '1px solid #333';
        
        container.appendChild(this.canvas);
        
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
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trail effect
        ctx.fillRect(0, 0, w, h);
        
        if (this.mode === 'scope') {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00f0ff';
            ctx.beginPath();
            
            const sliceWidth = w * 1.0 / this.data.length;
            let x = 0;
            
            for(let i = 0; i < this.data.length; i++) {
                const v = this.data[i] * 0.5 + 0.5; // Norm 0-1 (assuming -1 to 1 input)
                const y = v * h;
                
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                
                x += sliceWidth;
            }
            ctx.stroke();
        } else if (this.mode === 'spectrum') {
            const barWidth = (w / this.data.length) * 2.5;
            let x = 0;
            ctx.fillStyle = '#ff0055';
            
            for(let i = 0; i < this.data.length; i++) {
                const v = this.data[i] / 255.0; // 0-1
                const barHeight = v * h;
                
                ctx.fillRect(x, h - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }
    }
}

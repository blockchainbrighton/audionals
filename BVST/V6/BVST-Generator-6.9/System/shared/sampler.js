
export class SamplerUI {
    constructor(options = {}) {
        this.onSampleLoad = options.onSampleLoad || (() => {});
        this.onPreviewTrigger = options.onPreviewTrigger || ((active) => {});
        this.onSeek = options.onSeek || ((pct) => {});
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sampleData = null; // Float32Array
        this.sampleRate = this.audioContext.sampleRate;

        // Playback State
        this.state = {
            isPlaying: false,
            startTime: 0,
            startOffsetPct: 0.0, // Start position normalized 0-1
            playSpeed: 1.0,
            loopStart: 0.0, // 0.0 to 1.0
            loopEnd: 1.0,   // 0.0 to 1.0
            loopEnabled: false,
            note: 60 // Base note for tracking pitch shifts
        };

        this.animFrame = null;
    }

    buildUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return console.error(`SamplerUI: Container '${containerId}' not found.`);

        this.injectStyles();

        container.innerHTML = `
            <div class="bvst-sampler-container">
                <div class="bvst-waveform-wrapper">
                    <canvas class="bvst-waveform-canvas"></canvas>
                    <div class="bvst-waveform-overlay">
                        <div class="bvst-marker bvst-marker-start" style="left: 0%;"></div>
                        <div class="bvst-marker bvst-marker-end" style="left: 100%;"></div>
                        <div class="bvst-playhead" style="display:none; left: 0%;"></div>
                    </div>
                    <div class="bvst-drop-hint">DROP AUDIO HERE OR PASTE URL BELOW</div>
                </div>
                <div class="bvst-sampler-loader">
                    <input type="text" class="bvst-url-input" placeholder="https://example.com/sample.mp3">
                    <button class="bvst-load-btn">LOAD</button>
                </div>
            </div>
        `;

        this.canvas = container.querySelector('.bvst-waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startMarker = container.querySelector('.bvst-marker-start');
        this.endMarker = container.querySelector('.bvst-marker-end');
        this.playhead = container.querySelector('.bvst-playhead');
        this.urlInput = container.querySelector('.bvst-url-input');
        this.loadBtn = container.querySelector('.bvst-load-btn');

        this._bindEvents();
        this.draw(); // Initial draw
    }

    injectStyles() {
        if (document.getElementById('bvst-sampler-styles')) return;
        const style = document.createElement('style');
        style.id = 'bvst-sampler-styles';
        style.textContent = `
            .bvst-sampler-container { width: 100%; background: #000; font-family: monospace; }
            .bvst-waveform-wrapper { position: relative; height: 150px; width: 100%; background: #111; border-bottom: 1px solid #007a82; overflow: hidden; cursor: crosshair; }
            .bvst-waveform-canvas { width: 100%; height: 100%; display: block; }
            .bvst-waveform-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
            .bvst-marker { position: absolute; top: 0; height: 100%; width: 2px; background: #fff; z-index: 10; }
            .bvst-marker-start { background: #0f0; box-shadow: 0 0 5px #0f0; }
            .bvst-marker-end { background: #f00; box-shadow: 0 0 5px #f00; }
            .bvst-playhead { position: absolute; top: 0; height: 100%; width: 2px; background: #ff0; box-shadow: 0 0 8px #ff0; z-index: 20; will-change: left; }
            .bvst-drop-hint { position: absolute; top: 5px; left: 10px; color: #0f0; font-size: 10px; pointer-events: none; opacity: 0.7; }
            .bvst-sampler-loader { display: flex; padding: 5px; background: #000; border-bottom: 1px solid #333; }
            .bvst-url-input { flex: 1; background: #222; border: 1px solid #444; color: #ddd; padding: 4px; margin-right: 5px; }
            .bvst-load-btn { background: #007a82; color: #fff; border: none; padding: 0 10px; cursor: pointer; font-weight: bold; }
            .bvst-load-btn:hover { background: #009a92; }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        const getPct = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        };

        const startPreview = (e) => {
            e.preventDefault();
            const pct = getPct(e);
            this.onSeek(pct);
            this.trigger(pct);
            this.onPreviewTrigger(true);
            this.canvas.style.opacity = '0.9';
        };

        const endPreview = (e) => {
            e.preventDefault();
            this.release();
            this.onPreviewTrigger(false);
            this.canvas.style.opacity = '1.0';
        };

        this.canvas.addEventListener('mousedown', startPreview);
        this.canvas.addEventListener('touchstart', startPreview);
        
        this.canvas.addEventListener('mouseup', endPreview);
        this.canvas.addEventListener('mouseleave', endPreview);
        this.canvas.addEventListener('touchend', endPreview);

        this.loadBtn.addEventListener('click', () => this._loadFromUrl());

        const container = this.canvas.parentElement; 
        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => document.body.addEventListener(evt, prevent, false));
        document.body.addEventListener('drop', (e) => this._handleDrop(e));

        window.addEventListener('message', (e) => {
            if (e.data.type === 'BVST_SAMPLE_DATA') this.loadSampleData(e.data.samples);
        });
    }

    // --- API ---

    updateParam(key, value) {
        if (this.state.hasOwnProperty(key)) {
            this.state[key] = value;
            // Update UI markers immediately if needed
            if (key === 'loopStart') this.setStartMarker(value);
            if (key === 'loopEnd') this.setEndMarker(value);
            
            // Redraw to update shading
            if (key === 'loopStart' || key === 'loopEnd' || key === 'loopEnabled') {
                this.draw();
            }
        }
    }

    trigger(startPct = 0.0) {
        if (!this.sampleData) return;
        this.state.isPlaying = true;
        this.state.startTime = this.audioContext.currentTime;
        this.state.startOffsetPct = startPct;
        this.playhead.style.display = 'block';
        this._animate();
    }

    release() {
        this.state.isPlaying = false;
        this.playhead.style.display = 'none';
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    }

    // --- LOGIC ---

    _animate() {
        if (!this.state.isPlaying) return;

        const now = this.audioContext.currentTime;
        const elapsed = now - this.state.startTime;
        
        // Calculate Playhead Position
        // Base speed is params.speed. 
        const noteRatio = Math.pow(2, (this.state.note - 60) / 12);
        const effectiveSpeed = this.state.playSpeed * noteRatio;
        
        const totalSamples = this.sampleData.length;
        const playedSamples = elapsed * this.sampleRate * effectiveSpeed;
        const startSample = this.state.startOffsetPct * totalSamples;
        
        let currentPos = startSample + playedSamples;

        // Loop Logic
        if (this.state.loopEnabled) {
            const loopStartSamp = Math.floor(this.state.loopStart * totalSamples);
            const loopEndSamp = Math.floor(this.state.loopEnd * totalSamples);
            const loopLen = loopEndSamp - loopStartSamp;
            
            if (loopLen > 0 && currentPos >= loopEndSamp) {
                const overrun = currentPos - loopEndSamp;
                currentPos = loopStartSamp + (overrun % loopLen);
            }
        }

        const pct = currentPos / totalSamples;
        
        if (pct <= 1.0) {
            this.playhead.style.left = (pct * 100) + '%';
            this.animFrame = requestAnimationFrame(() => this._animate());
        } else {
            this.release(); // Stop at end
        }
    }

    // --- LOADING & DRAWING ---

    async _loadFromUrl() {
        const url = this.urlInput.value.trim();
        if (!url) return alert("Please enter a URL");
        const originalText = this.loadBtn.innerText;
        this.loadBtn.innerText = "...";
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const buffer = await response.arrayBuffer();
            await this._decodeAndLoad(buffer);
            this.loadBtn.innerText = "OK";
            setTimeout(() => this.loadBtn.innerText = originalText, 1000);
        } catch (e) {
            console.error(e);
            this.loadBtn.innerText = "ERR";
            alert(e.message);
            setTimeout(() => this.loadBtn.innerText = originalText, 2000);
        }
    }

    async _handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            try {
                const buffer = await files[0].arrayBuffer();
                await this._decodeAndLoad(buffer);
            } catch (err) { alert("Drop Error: " + err.message); }
        }
    }

    async _decodeAndLoad(arrayBuffer) {
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);
        this.loadSampleData(data);
        this.onSampleLoad(data);
    }

    loadSampleData(float32Array) {
        this.sampleData = float32Array;
        this.draw();
    }

    draw() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        const samples = this.sampleData;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        
        // Zero Line
        ctx.strokeStyle = '#222';
        ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

        if (!samples || samples.length === 0) {
            // Draw placeholder line
            return;
        }

        // Waveform
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#00f0ff';
        ctx.beginPath();
        
        const step = Math.max(1, Math.floor(samples.length / w));
        const amp = h / 2;

        for (let i = 0; i < w; i++) {
            let min = 1.0;
            let max = -1.0;
            const startIdx = i * step;
            
            for (let j = 0; j < step; j++) {
                const idx = startIdx + j;
                if (idx < samples.length) {
                    const val = samples[idx];
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
            if (min > max) min = max = 0; // Handle silence/gaps
            
            ctx.moveTo(i, amp + min * amp * 0.9); // 0.9 scale to keep margin
            ctx.lineTo(i, amp + max * amp * 0.9);
        }
        ctx.stroke();

        // Loop Regions Shading (Dim the non-active parts)
        if (this.state.loopEnabled || (this.state.loopStart > 0 || this.state.loopEnd < 1)) {
            const startX = this.state.loopStart * w;
            const endX = this.state.loopEnd * w;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            
            // Left Dim
            if (startX > 0) ctx.fillRect(0, 0, startX, h);
            
            // Right Dim
            if (endX < w) ctx.fillRect(endX, 0, w - endX, h);
            
            // Active Region Highlight (subtle)
            ctx.fillStyle = 'rgba(0, 255, 200, 0.05)';
            ctx.fillRect(startX, 0, endX - startX, h);
        }
    }

    setStartMarker(percent) {
        if (this.startMarker) this.startMarker.style.left = (percent * 100) + '%';
    }

    setEndMarker(percent) {
        if (this.endMarker) this.endMarker.style.left = (percent * 100) + '%';
    }
}

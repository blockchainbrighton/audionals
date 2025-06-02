import { EffectBase } from './EffectBase.js';

export class GlyphReveal extends EffectBase {
    constructor(name = 'GlyphReveal', options = {}) {
        super(name, options);
    }

    initializeParameters() {
        this.parameters = {
            glyphSet: this.options.glyphSet ?? 'ascii',
            density: this.options.density ?? 0.6,
            fontSize: this.options.fontSize ?? 12,
            glyphColor: this.options.glyphColor ?? [0, 255, 0],
            backgroundColor: this.options.backgroundColor ?? [0, 0, 0],
            revealSpeed: this.options.revealSpeed ?? 1.0,
            glyphChangeRate: this.options.glyphChangeRate ?? 0.1,
            convergenceMode: this.options.convergenceMode ?? 'random',
            beatSync: this.options.beatSync !== false
        };
        this.glyphSets = this.initGlyphSets();
        this.glyphGrid = null;
        this.revealGrid = null;
        this.glyphCanvas = null;
        this.glyphContext = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
    }

    initGlyphSets() {
        return {
            ascii: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
            unicode: '▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕▖▗▘▙▚▛▜▝▞▟■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯',
            symbols: '☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☐☑☒☓☔☕☖☗☘☙☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☰☱☲☳☴☵☶☷☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟',
            binary: '01',
            matrix: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789',
            braille: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿'
        };
    }

    draw(ctx, timingInfo) {
        if (!this.glyphGrid) this.initGrid();
        const intensity = this.getIntensity() * this.getProgress(timingInfo);
        this.updateGlyphStates(intensity, timingInfo);
        this.drawGlyphsToCanvas(intensity, timingInfo);
        this.compositeWithOriginal(ctx, intensity);
    }

    initGrid() {
        const { width, height } = this.originalImageData, fz = this.parameters.fontSize;
        this.gridWidth = Math.ceil(width / fz);
        this.gridHeight = Math.ceil(height / fz);
        this.glyphGrid = Array(this.gridWidth * this.gridHeight).fill(0).map(() => this.randomGlyph());
        this.revealGrid = new Float32Array(this.gridWidth * this.gridHeight);
        this.glyphCanvas = document.createElement('canvas');
        this.glyphCanvas.width = width;
        this.glyphCanvas.height = height;
        this.glyphContext = this.glyphCanvas.getContext('2d');
        this.glyphContext.font = `${fz}px monospace`;
        this.glyphContext.textAlign = 'center';
        this.glyphContext.textBaseline = 'middle';
    }

    randomGlyph() {
        const set = this.glyphSets[this.parameters.glyphSet] || this.glyphSets.ascii;
        const idx = this.random.nextInt ? this.random.nextInt(0, set.length - 1) : Math.random() * set.length | 0;
        return set[idx];
    }

    updateGlyphStates(intensity, timingInfo) {
        const p = this.getProgress(timingInfo), mode = this.parameters.convergenceMode, thresh = this.calcRevealThreshold(p, timingInfo);
        for (let y = 0; y < this.gridHeight; y++)
            for (let x = 0; x < this.gridWidth; x++) {
                const i = y * this.gridWidth + x;
                if (this.revealGrid[i] < 1 && this.random.next() < this.calcRevealProb(x, y, p, timingInfo, thresh)) {
                    this.revealGrid[i] = Math.min(1, this.revealGrid[i] + 0.1);
                }
                if (this.revealGrid[i] < 0.8 && this.random.next() < this.parameters.glyphChangeRate)
                    this.glyphGrid[i] = this.randomGlyph();
                if (this.parameters.beatSync && timingInfo.currentBeat % 1 < 0.1 && this.random.next() < intensity * 0.3)
                    this.glyphGrid[i] = this.randomGlyph();
            }
    }

    calcRevealThreshold(p, timingInfo) {
        let base = p * this.parameters.revealSpeed;
        switch (this.parameters.convergenceMode) {
            case 'wave': return base + Math.sin(timingInfo.currentTime * 2) * 0.1;
            case 'pulse': return base + Math.sin((timingInfo.currentBeat % 1) * Math.PI) * 0.2;
            default: return base;
        }
    }

    calcRevealProb(x, y, p, timingInfo, t) {
        const mode = this.parameters.convergenceMode;
        if (mode === 'random') return t * this.parameters.density;
        if (mode === 'center') {
            const cx = this.gridWidth / 2, cy = this.gridHeight / 2, maxD = Math.sqrt(cx * cx + cy * cy),
                  d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2), normD = d / maxD;
            return Math.max(0, t - normD) * this.parameters.density;
        }
        if (mode === 'edges') {
            const ed = Math.min(x, y, this.gridWidth - 1 - x, this.gridHeight - 1 - y),
                  maxED = Math.min(this.gridWidth, this.gridHeight) / 2, normED = ed / maxED;
            return Math.max(0, t - normED) * this.parameters.density;
        }
        if (mode === 'wave') {
            const wx = Math.sin((x / this.gridWidth) * Math.PI * 4 + timingInfo.currentTime * 2),
                  wy = Math.sin((y / this.gridHeight) * Math.PI * 4 + timingInfo.currentTime * 1.5),
                  wv = (wx + wy) / 2;
            return Math.max(0, t + wv * 0.3) * this.parameters.density;
        }
        if (mode === 'scanline') {
            const slY = (p * this.gridHeight) % this.gridHeight, dist = Math.abs(y - slY);
            return dist < 3 ? t * this.parameters.density * 2 : 0;
        }
        if (mode === 'spiral') {
            const scx = this.gridWidth / 2, scy = this.gridHeight / 2,
                  sd = Math.sqrt((x - scx) ** 2 + (y - scy) ** 2),
                  sa = Math.atan2(y - scy, x - scx),
                  sp = (sd + sa * 2) / 10;
            return Math.max(0, t - sp * 0.5) * this.parameters.density;
        }
        return t * this.parameters.density;
    }

    drawGlyphsToCanvas(intensity) {
        const ctx = this.glyphContext, fz = this.parameters.fontSize;
        ctx.fillStyle = `rgb(${this.parameters.backgroundColor.join(',')})`;
        ctx.fillRect(0, 0, this.glyphCanvas.width, this.glyphCanvas.height);
        ctx.fillStyle = `rgb(${this.parameters.glyphColor.join(',')})`;
        for (let y = 0; y < this.gridHeight; y++) for (let x = 0; x < this.gridWidth; x++) {
            const i = y * this.gridWidth + x, reveal = this.revealGrid[i];
            if (reveal < 1) {
                ctx.globalAlpha = (1 - reveal) * intensity;
                if (intensity > 0.7) { ctx.shadowColor = `rgb(${this.parameters.glyphColor.join(',')})`; ctx.shadowBlur = 3; }
                ctx.fillText(this.glyphGrid[i], (x + 0.5) * fz, (y + 0.5) * fz);
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;
    }

    compositeWithOriginal(ctx, intensity) {
        const w = this.glyphCanvas.width, h = this.glyphCanvas.height, og = this.originalImageData,
              glyphImg = this.glyphContext.getImageData(0, 0, w, h), orig = new Uint8ClampedArray(og.data), glyph = glyphImg.data;
        for (let i = 0; i < orig.length; i += 4) {
            const x = (i / 4) % w, y = ((i / 4) / w) | 0, gx = (x / this.parameters.fontSize) | 0, gy = (y / this.parameters.fontSize) | 0,
                  gi = gy * this.gridWidth + gx, reveal = gi < this.revealGrid.length ? this.revealGrid[gi] : 1,
                  glyphAlpha = glyph[i + 3] / 255, origAlpha = reveal;
            if (glyphAlpha > 0 && origAlpha < 1) {
                const bf = glyphAlpha * (1 - origAlpha);
                orig[i]     = orig[i]     * origAlpha + glyph[i]     * bf;
                orig[i + 1] = orig[i + 1] * origAlpha + glyph[i + 1] * bf;
                orig[i + 2] = orig[i + 2] * origAlpha + glyph[i + 2] * bf;
            } else {
                orig[i]     = orig[i]     * origAlpha;
                orig[i + 1] = orig[i + 1] * origAlpha;
                orig[i + 2] = orig[i + 2] * origAlpha;
            }
        }
        // Optionally: add noise at high intensity
        if (intensity > 0.5)
            for (let i = 0; i < orig.length; i += 4)
                if (this.random.next() < intensity * 0.1) {
                    const n = ((this.random.next() - 0.5) * 20 * intensity) | 0;
                    orig[i] = Math.max(0, Math.min(255, orig[i] + n));
                    orig[i + 1] = Math.max(0, Math.min(255, orig[i + 1] + n));
                    orig[i + 2] = Math.max(0, Math.min(255, orig[i + 2] + n));
                }
        ctx.putImageData(new ImageData(orig, w, h), 0, 0);
    }

    onStart() { this.glyphGrid = null; this.revealGrid = null; }
    onStop() { }
}

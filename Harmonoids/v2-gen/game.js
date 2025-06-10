// Harmonoids Game - Core Game Engine
class HarmonoidsGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.audioManager = new AudioManager();
  
      this.gameRunning = false;
      this.harmonoids = [];
      this.selectedHarmonoids = [];
      this.level = null;
      this.stats = { total: 0, saved: 0, lost: 0 };
  
      this.harmonoidSpawnRate = 120;
      this.harmonoidSpeed = 0.8;
      this.frameCount = 0;
      this.nextHarmonoidId = 0;
  
      this.gameMode = 'procession';
      this.isPlacingResonanceField = false;
      this.playerResonanceFields = [];
      this.MAX_PLAYER_FIELDS = 3;
      this.PLAYER_FIELD_DURATION = 600;
      this.PLAYER_FIELD_RADIUS = 50;
      this.PLAYER_FIELD_RESONANCE_FREQ = 500;
      this.PLAYER_FIELD_AMP_FACTOR = 3;
  
      this.selectionBox = null;
      this.isDragging = false;
  
      this.setupCanvas();
      this.setupEventListeners();
      this.createLevel();
      this.gameLoop();
    }
  
    setupCanvas() {
      const resize = () => {
        const w = window.innerWidth * 0.95, h = window.innerHeight * 0.85;
        Object.assign(this.canvas, { width: w, height: h });
        this.createLevel();
        this.render();
      };
      resize();
      window.addEventListener('resize', resize);
    }
  
    setupEventListeners() {
      const btn = (id, fn) => document.getElementById(id).addEventListener('click', fn);
      btn('startBtn', () => this.startGame());
      btn('pitchUpBtn', () => this.adjustPitch(1));
      btn('pitchDownBtn', () => this.adjustPitch(-1));
      btn('tempoUpBtn', () => this.adjustTempo(0.2));
      btn('tempoDownBtn', () => this.adjustTempo(-0.2));
      btn('audioToggleBtn', () => this.toggleAudio());
      btn('dropModeToggleBtn', () => this.toggleDropMode());
      btn('dropHarmonoidBtn', () => this.manualDropHarmonoid());
      btn('muteBtn', () => this.toggleMuteSelected());
      btn('soloBtn', () => this.toggleSoloSelected());
      btn('createResonanceFieldBtn', () => this.activateResonanceFieldPlacement());
  
      const c = this.canvas;
      c.addEventListener('click', e => this.handleCanvasClick(e));
      c.addEventListener('mousedown', e => this.startSelection(e));
      c.addEventListener('mousemove', e => this.updateSelection(e));
      c.addEventListener('mouseup', e => this.endSelection(e));
      c.addEventListener('contextmenu', e => e.preventDefault());
    }
  
    createLevel() {
      const ph = this.canvas.height - 50;
      const cw = this.canvas.width;
      this.level = {
        startX: 50,
        startY: ph - 50,
        endX: cw - 80,
        endY: ph - 50,
        platforms: [
          { x: 0, y: ph, width: cw, height: 50, type: 'ground' },
          { x: 200, y: ph - 100, width: 150, height: 20, type: 'floating' },
          { x: cw / 2 - 100, y: ph - 180, width: 200, height: 20, type: 'floating' },
          { x: cw - 350, y: ph - 100, width: 150, height: 20, type: 'floating' }
        ],
        harmonicGate: {
          x: cw / 2 - 25,
          y: ph - 150,
          width: 50,
          height: 100,
          requiredChord: [261.63, 329.63, 392],
          frequencyTolerance: 15,
          isOpen: false,
          notesPresent: new Set()
        },
        staticResonanceFields: [
          { x: 225, y: ph - 70, radius: 40, frequency: 329.63, effect: 'speed_boost', strength: 1.5, color: 'rgba(0,255,255,0.3)' },
          { x: cw - 275, y: ph - 70, radius: 40, frequency: 392, effect: 'jump_boost', strength: 1.2, color: 'rgba(255,255,0,0.3)' }
        ],
        dissonanceZones: [
          { x: cw / 2 + 80, y: ph - 100, width: 100, height: 60, maxDissonance: 0.8, color: 'rgba(255,0,0,0.2)' }
        ]
      };
      document.getElementById('targetChordDisplay').textContent =
        `C, E, G (${this.level.harmonicGate.requiredChord.map(f => Math.round(f)).join(', ')} Hz)`;
    }
  
    startGame() {
      this.gameRunning = true;
      this.harmonoids.length = 0;
      this.selectedHarmonoids.length = 0;
      this.playerResonanceFields.length = 0;
      Object.assign(this.stats, { total: 0, saved: 0, lost: 0 });
      this.frameCount = 0;
      this.nextHarmonoidId = 0;
      this.isPlacingResonanceField = false;
  
      if (!this.audioManager.isInitialized) {
        this.audioManager.initialize().then(() => {
          if (this.audioManager.isInitialized) this.audioManager.setMasterVolume(0.1);
        });
      } else {
        this.audioManager.resumeContext();
        this.audioManager.setMasterVolume(0.1);
      }
  
      ['pitchUpBtn', 'pitchDownBtn', 'tempoUpBtn', 'tempoDownBtn', 'muteBtn', 'soloBtn', 'createResonanceFieldBtn']
        .forEach(id => (document.getElementById(id).disabled = false));
      document.getElementById('startBtn').textContent = 'Restart';
      document.getElementById('dropHarmonoidBtn').disabled = this.gameMode === 'procession';
  
      this.updateStats();
      this.createLevel();
    }
  
    toggleDropMode() {
      const isProcession = this.gameMode === 'procession';
      this.gameMode = isProcession ? 'manualDrop' : 'procession';
      document.getElementById('dropModeToggleBtn').textContent = `Mode: ${isProcession ? 'Manual Drop' : 'Procession'}`;
      document.getElementById('dropHarmonoidBtn').disabled = isProcession ? !this.gameRunning : true;
    }
  
    manualDropHarmonoid() {
      if (this.gameRunning && this.gameMode === 'manualDrop') this.spawnHarmonoid();
    }
  
    spawnHarmonoid() {
      if (!this.gameRunning) return;
      const scale = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88];
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const h = new Harmonoid(this.nextHarmonoidId++, this.level.startX, this.level.startY, this.harmonoidSpeed, freq);
      this.harmonoids.push(h);
      this.stats.total++;
      this.audioManager.createHarmonoidSound(h.id, h.frequency);
      this.updateStats();
    }
  
    update() {
      if (!this.gameRunning) return;
      this.frameCount++;
      if (this.gameMode === 'procession' && this.frameCount % this.harmonoidSpawnRate === 0) this.spawnHarmonoid();
  
      for (let i = this.harmonoids.length - 1; i >= 0; i--) {
        const h = this.harmonoids[i];
        h.update(this.level, this.playerResonanceFields);
        this.applyStaticResonanceEffects(h);
        this.applyPlayerResonanceEffects(h);
        this.checkDissonanceZones(h);
  
        if (
          h.x > this.level.endX &&
          h.y + h.radius >= this.level.endY &&
          h.y - h.radius <= this.level.endY + 20
        ) {
          this.removeHarmonoid(h, 'saved');
          continue;
        }
        if (
          h.y > this.canvas.height + h.radius * 2 ||
          h.x < -h.radius * 2 ||
          h.x > this.canvas.width + h.radius * 2
        ) {
          this.removeHarmonoid(h, 'lost');
        }
      }
  
      for (let i = this.playerResonanceFields.length - 1; i >= 0; i--) {
        const f = this.playerResonanceFields[i];
        if (--f.duration <= 0) this.playerResonanceFields.splice(i, 1);
      }
  
      this.updateHarmonicGate();
      this.updateStats();
    }
  
    removeHarmonoid(h, status) {
      this.stats[status]++;
      this.harmonoids.splice(this.harmonoids.indexOf(h), 1);
      const si = this.selectedHarmonoids.indexOf(h);
      if (si > -1) this.selectedHarmonoids.splice(si, 1);
      this.audioManager.removeHarmonoidSound(h.id);
    }
  
    updateHarmonicGate() {
      const gate = this.level.harmonicGate;
      gate.notesPresent.clear();
      for (const h of this.harmonoids) {
        if (
          h.x > gate.x - 20 &&
          h.x < gate.x + gate.width + 20 &&
          h.y > gate.y - h.radius &&
          h.y < gate.y + gate.height + h.radius
        ) gate.notesPresent.add(Math.round(h.frequency));
      }
  
      const wasOpen = gate.isOpen;
      if (gate.notesPresent.size < gate.requiredChord.length) gate.isOpen = false;
      else {
        gate.isOpen = gate.requiredChord.every(rf =>
          [...gate.notesPresent].some(pf => Math.abs(pf - rf) <= gate.frequencyTolerance)
        );
      }
      if (wasOpen !== gate.isOpen) this.audioManager.playGateSound(gate.isOpen);
    }
  
    applyStaticResonanceEffects(h) {
      for (const f of this.level.staticResonanceFields) {
        const d = Math.hypot(h.x - f.x, h.y - f.y);
        if (d < f.radius + h.radius) {
          const fd = Math.abs(h.frequency - f.frequency);
          if (fd < 30) {
            const strength = Math.max(0, 1 - fd / 30) * f.strength;
            if (f.effect === 'speed_boost') h.applySpeedBoost(strength);
            else if (f.effect === 'jump_boost') h.applyJumpBoost(strength);
          }
        }
      }
    }
  
    applyPlayerResonanceEffects(h) {
      for (const f of this.playerResonanceFields) {
        const d = Math.hypot(h.x - f.x, h.y - f.y);
        const inRange = d < f.radius + h.radius && Math.abs(h.frequency - f.targetFrequency) < 30;
        if (inRange && !h.isAmplifiedByPlayerField) {
          this.audioManager.setTemporaryHarmonoidGain(h.id, this.PLAYER_FIELD_AMP_FACTOR, f.duration / 60);
          h.isAmplifiedByPlayerField = true;
          h.startEffectFlash('amplify', 60);
        } else if (!inRange && h.isAmplifiedByPlayerField) {
          h.isAmplifiedByPlayerField = false;
        }
      }
    }
  
    checkDissonanceZones(h) {
      for (const z of this.level.dissonanceZones) {
        if (h.x >= z.x && h.x <= z.x + z.width && h.y >= z.y && h.y <= z.y + z.height) {
          const inside = this.harmonoids.filter(h2 => h2.x >= z.x && h2.x <= z.x + z.width && h2.y >= z.y && h2.y <= z.y + z.height);
          if (inside.length > 1) {
            const freqs = inside.map(h2 => h2.frequency);
            const dissonance = this.audioManager.calculateDissonance(freqs);
            if (dissonance > z.maxDissonance) inside.forEach(h2 => h2.applyDissonanceEffect(dissonance));
          }
        }
      }
    }
  
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawLevel();
  
      this.playerResonanceFields.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(100,100,255,${0.1 + 0.2 * (f.duration / this.PLAYER_FIELD_DURATION)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(150,150,255,${0.3 + 0.4 * (f.duration / this.PLAYER_FIELD_DURATION)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${f.targetFrequency}Hz Amp`, f.x, f.y);
      });
  
      this.harmonoids.forEach(h => h.render(ctx, this.selectedHarmonoids.includes(h), this.audioManager.soloedHarmonoidId === h.id));
  
      if (this.selectionBox) this.drawSelectionBox();
  
      if (this.isPlacingResonanceField) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click to place Resonance Field', this.canvas.width / 2, 30);
      }
    }
  
    drawLevel() {
      const ctx = this.ctx;
  
      for (const p of this.level.platforms) {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, '#A0522D');
        grad.addColorStop(1, '#8B4513');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
      }
  
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00DD00';
      ctx.shadowColor = '#00DD00';
      ctx.fillRect(this.level.startX - 10, this.level.startY - 20, 20, 30);
      ctx.fillStyle = '#DD0000';
      ctx.shadowColor = '#DD0000';
      ctx.fillRect(this.level.endX - 10, this.level.endY - 20, 20, 30);
      ctx.shadowBlur = 0;
  
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('START', this.level.startX, this.level.startY - 25);
      ctx.fillText('END', this.level.endX, this.level.endY - 25);
  
      const g = this.level.harmonicGate;
      ctx.fillStyle = g.isOpen ? 'rgba(0,255,0,0.7)' : 'rgba(255,0,0,0.7)';
      ctx.fillRect(g.x, g.y, g.width, g.height);
      ctx.strokeStyle = g.isOpen ? '#00AA00' : '#AA0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.x, g.y, g.width, g.height);
      ctx.fillStyle = 'white';
      ctx.font = '11px Arial';
      ctx.fillText(g.isOpen ? 'OPEN' : 'CLOSED', g.x + g.width / 2, g.y - 8);
  
      g.requiredChord.forEach((freq, i) => {
        ctx.fillStyle = [...g.notesPresent].some(n => Math.abs(n - freq) <= g.frequencyTolerance) ? 'lime' : 'gray';
        ctx.beginPath();
        ctx.arc(g.x + ((g.width / (g.requiredChord.length + 1)) * (i + 1)), g.y + g.height + 15, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
  
      for (const f of this.level.staticResonanceFields) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, 2 * Math.PI);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.strokeStyle = f.color.replace('0.3', '0.8');
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        ctx.fillText(`${Math.round(f.frequency)}Hz`, f.x, f.y - 5);
        ctx.fillText(f.effect.replace('_', ' '), f.x, f.y + 5);
      }
  
      for (const z of this.level.dissonanceZones) {
        ctx.fillStyle = z.color;
        ctx.fillRect(z.x, z.y, z.width, z.height);
        ctx.strokeStyle = z.color.replace('0.2', '0.6');
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(z.x, z.y, z.width, z.height);
        ctx.setLineDash([]);
        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        ctx.fillText('Dissonance', z.x + z.width / 2, z.y + z.height / 2);
      }
    }
  
    drawSelectionBox() {
      if (!this.selectionBox) return;
      const { ctx, selectionBox: b } = this;
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(b.startX, b.startY, b.endX - b.startX, b.endY - b.startY);
      ctx.setLineDash([]);
    }
  
    handleCanvasClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
  
      if (this.isPlacingResonanceField) {
        this.createPlayerResonanceField(x, y);
        this.isPlacingResonanceField = false;
        document.getElementById('createResonanceFieldBtn').style.border = '';
        return;
      }
  
      const clicked = this.harmonoids.find(h => Math.hypot(x - h.x, y - h.y) < h.radius + 5);
      if (clicked) {
        if (e.shiftKey) {
          if (!this.selectedHarmonoids.includes(clicked)) this.selectedHarmonoids.push(clicked);
        } else if (e.ctrlKey || e.metaKey) {
          const idx = this.selectedHarmonoids.indexOf(clicked);
          idx > -1 ? this.selectedHarmonoids.splice(idx, 1) : this.selectedHarmonoids.push(clicked);
        } else {
          this.selectedHarmonoids = [clicked];
        }
        this.audioManager.playSelectionSound();
      } else if (!this.isDragging) {
        this.selectedHarmonoids.length = 0;
      }
      this.updateStats();
    }
  
    startSelection(e) {
      if (this.isPlacingResonanceField) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      this.selectionBox = { startX: x, startY: y, endX: x, endY: y };
      this.isDragging = true;
    }
  
    updateSelection(e) {
      if (!this.isDragging || !this.selectionBox) return;
      const rect = this.canvas.getBoundingClientRect();
      this.selectionBox.endX = e.clientX - rect.left;
      this.selectionBox.endY = e.clientY - rect.top;
    }
  
    endSelection(e) {
      if (!this.isDragging || !this.selectionBox) {
        this.isDragging = false;
        return;
      }
      const b = this.selectionBox;
      const [minX, maxX] = [Math.min(b.startX, b.endX), Math.max(b.startX, b.endX)];
      const [minY, maxY] = [Math.min(b.startY, b.endY), Math.max(b.startY, b.endY)];
  
      if (Math.abs(b.startX - b.endX) < 5 && Math.abs(b.startY - b.endY) < 5) {
        // small box, likely click, ignore here
      } else {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) this.selectedHarmonoids.length = 0;
        for (const h of this.harmonoids) {
          if (h.x >= minX && h.x <= maxX && h.y >= minY && h.y <= maxY && !this.selectedHarmonoids.includes(h)) {
            this.selectedHarmonoids.push(h);
          }
        }
        if (this.selectedHarmonoids.length) this.audioManager.playSelectionSound();
      }
      this.selectionBox = null;
      this.isDragging = false;
      this.updateStats();
    }
  
    adjustPitch(dir) {
      const STEP = 20;
      this.selectedHarmonoids.forEach(h => {
        h.adjustPitch(dir * STEP);
        this.audioManager.updateHarmonoidFrequency(h.id, h.frequency);
      });
    }
  
    adjustTempo(change) {
      this.selectedHarmonoids.forEach(h => h.adjustTempo(change));
    }
  
    toggleMuteSelected() {
      if (!this.selectedHarmonoids.length) return;
      const first = this.selectedHarmonoids[0];
      const osc = this.audioManager.harmonoidOscillators.get(first.id);
      const mute = osc ? !osc.isMuted : true;
      this.selectedHarmonoids.forEach(h => {
        this.audioManager.muteHarmonoid(h.id, mute);
        h.isMuted = mute;
      });
    }
  
    toggleSoloSelected() {
      if (!this.selectedHarmonoids.length) {
        this.audioManager.soloHarmonoid(null);
        return;
      }
      const first = this.selectedHarmonoids[0];
      this.audioManager.soloedHarmonoidId === first.id
        ? this.audioManager.soloHarmonoid(null)
        : this.audioManager.soloHarmonoid(first.id);
    }
  
    activateResonanceFieldPlacement() {
      if (this.playerResonanceFields.length >= this.MAX_PLAYER_FIELDS) {
        alert(`Maximum ${this.MAX_PLAYER_FIELDS} resonance fields allowed.`);
        return;
      }
      this.isPlacingResonanceField = true;
      document.getElementById('createResonanceFieldBtn').style.border = '2px solid yellow';
    }
  
    createPlayerResonanceField(x, y) {
      if (this.playerResonanceFields.length >= this.MAX_PLAYER_FIELDS) return;
      this.playerResonanceFields.push({
        x, y,
        radius: this.PLAYER_FIELD_RADIUS,
        targetFrequency: this.PLAYER_FIELD_RESONANCE_FREQ,
        duration: this.PLAYER_FIELD_DURATION,
        type: 'player_amplify'
      });
      this.audioManager.playResonanceFieldSound(true);
    }
  
    toggleAudio() {
      const enabled = this.audioManager.toggleAudio();
      document.getElementById('audioToggleBtn').textContent = `Audio: ${enabled ? 'ON' : 'OFF'}`;
    }
  
    updateStats() {
      const d = document;
      d.getElementById('harmonoidCount').textContent = this.harmonoids.length;
      d.getElementById('savedCount').textContent = this.stats.saved;
      d.getElementById('lostCount').textContent = this.stats.lost;
      d.getElementById('selectedCount').textContent = this.selectedHarmonoids.length;
    }
  
    gameLoop() {
      this.update();
      this.render();
      requestAnimationFrame(() => this.gameLoop());
    }
  }
  
  // Harmonoid class
  class Harmonoid {
    #effectTimers = { speedBoost: 0, jumpBoost: 0, dissonance: 0, flash: 0 };
  
    constructor(id, x, y, speed, frequency) {
      this.id = id;
      this.x = x; this.y = y;
      this.baseSpeed = speed;
      this.speed = speed;
      this.baseFrequency = frequency;
      this.frequency = frequency;
      this.radius = 8;
      this.color = this.getColorFromFrequency(frequency);
      this.vx = speed;
      this.vy = 0;
      this.onGround = false;
      this.gravity = 0.25;
      this.isMuted = false;
      this.isAmplifiedByPlayerField = false;
      this.flashColor = null;
    }
  
    getColorFromFrequency(freq) {
      const C4 = 261.63, C5 = 523.25;
      const norm = Math.max(0, Math.min(1, (freq - C4) / (C5 - C4)));
      return `hsl(${norm * 240}, 80%, 60%)`;
    }
  
    update(level, playerResonanceFields) {
      for (const k in this.#effectTimers) {
        if (this.#effectTimers[k] > 0 && --this.#effectTimers[k] === 0) this.resetEffect(k);
      }
      if (!this.onGround) this.vy += this.gravity;
  
      let spd = this.speed;
      if (this.#effectTimers.speedBoost > 0) spd *= 1.5;
      if (this.#effectTimers.dissonance > 0) spd *= 0.5;
  
      this.vx = Math.sign(this.vx) * spd;
      if (this.#effectTimers.dissonance > 0 && Math.random() < 0.02) this.vx = -this.vx;
  
      this.x += this.vx;
      this.y += this.vy;
  
      this.onGround = false;
      for (const p of level.platforms) {
        if (
          this.x + this.radius > p.x &&
          this.x - this.radius < p.x + p.width &&
          this.y + this.radius > p.y &&
          this.y + this.radius < p.y + p.height + this.vy + 1 &&
          this.vy >= 0
        ) {
          this.y = p.y - this.radius;
          this.vy = 0;
          this.onGround = true;
        }
      }
  
      if (this.x - this.radius < 0 && this.vx < 0) this.vx *= -1;
      if (this.x + this.radius > level.platforms[0].width && this.vx > 0) this.vx *= -1;
  
      const gate = level.harmonicGate;
      if (
        !gate.isOpen &&
        this.x + this.radius > gate.x &&
        this.x - this.radius < gate.x + gate.width &&
        this.y + this.radius > gate.y &&
        this.y - this.radius < gate.y + gate.height
      ) {
        if ((this.vx > 0 && this.x < gate.x + gate.width / 2) || (this.vx < 0 && this.x > gate.x + gate.width / 2)) {
          this.vx *= -0.5;
        }
      }
    }
  
    resetEffect(name) {
      if (name === 'speedBoost') this.speed = this.baseSpeed;
      else if (name === 'flash') this.flashColor = null;
    }
  
    adjustPitch(chg) {
      this.frequency = Math.min(1200, Math.max(100, this.frequency + chg));
      this.color = this.getColorFromFrequency(this.frequency);
    }
  
    adjustTempo(chg) {
      this.baseSpeed = Math.min(2.5, Math.max(0.2, this.baseSpeed + chg));
      this.speed = this.baseSpeed;
    }
  
    applySpeedBoost(str) {
      this.speed = this.baseSpeed * str;
      this.#effectTimers.speedBoost = 120;
      this.startEffectFlash('speed');
    }
  
    applyJumpBoost(str) {
      if (!this.onGround) return;
      this.vy = -4 * str;
      this.onGround = false;
      this.#effectTimers.jumpBoost = 60;
      this.startEffectFlash('jump');
    }
  
    applyDissonanceEffect() {
      this.#effectTimers.dissonance = 180;
      this.startEffectFlash('dissonance');
    }
  
    startEffectFlash(type, duration = 30) {
      this.#effectTimers.flash = duration;
      this.flashColor =
        type === 'speed' ? '#FFD700' :
        type === 'jump' ? '#00FF00' :
        type === 'dissonance' ? '#FF6347' :
        type === 'amplify' ? '#ADD8E6' :
        null;
    }
  
    render(ctx, selected, soloed) {
      let fill = this.isMuted ? 'grey' : this.color;
      if (this.#effectTimers.flash > 0 && this.flashColor && Math.floor(this.#effectTimers.flash / 5) % 2 === 0) fill = this.flashColor;
  
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
      ctx.fill();
  
      if (selected) {
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (soloed) {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }
  
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - 12, this.y - this.radius - 14, 24, 10);
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(this.frequency), this.x, this.y - this.radius - 6);
    }
  }
  
  window.addEventListener('load', () => new HarmonoidsGame());
  
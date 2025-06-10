// Harmonoid.js
export default class Harmonoid {
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
  
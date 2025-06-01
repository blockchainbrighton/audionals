import { EffectManager } from './effects/EffectBase.js';
import { SeededPRNG } from './utils/prng.js';
import { BeatScheduler } from './utils/scheduler.js';

class MusicSyncedImageReveal {
  constructor() {
    this.canvas = document.getElementById('mainCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.offscreenCanvas = new OffscreenCanvas(1, 1);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    this.effectManager = new EffectManager();
    this.prng = new SeededPRNG(12345);
    this.scheduler = new BeatScheduler();
    
    this.image = null;
    this.audioBuffer = null;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.source = null;
    
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.currentBeat = 0;
    this.lastFrameTime = 0;
    this.fps = 0;
    
    this.initControls();
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    this.animationFrameId = null;
  }
  
  initControls() {
    document.getElementById('startBtn').addEventListener('click', this.start.bind(this));
    document.getElementById('pauseBtn').addEventListener('click', this.togglePause.bind(this));
    document.getElementById('resetBtn').addEventListener('click', this.reset.bind(this));
    
    document.getElementById('speedSlider').addEventListener('input', (e) => {
      this.scheduler.speed = parseFloat(e.target.value);
    });
    
    document.getElementById('intensitySlider').addEventListener('input', (e) => {
      this.effectManager.intensity = parseFloat(e.target.value);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') this.togglePause();
      if (e.code === 'KeyS') document.getElementById('startBtn').click();
      if (e.code === 'KeyR') document.getElementById('resetBtn').click();
    });
  }
  
  async start() {
    const imageUrl = document.getElementById('imageUrl').value;
    const audioUrl = document.getElementById('audioUrl').value;
    const bpm = parseInt(document.getElementById('bpm').value);
    const bars = parseInt(document.getElementById('bars').value);
    const seed = parseInt(document.getElementById('seed').value);
    
    if (!imageUrl || !audioUrl) {
      alert('Please provide both image and audio URLs');
      return;
    }
    
    this.prng = new SeededPRNG(seed);
    this.scheduler = new BeatScheduler(bpm, bars);
    
    try {
      await this.loadImage(imageUrl);
      await this.loadAudio(audioUrl);
      
      document.getElementById('startBtn').disabled = true;
      document.getElementById('pauseBtn').disabled = false;
      document.getElementById('resetBtn').disabled = false;
      
      this.isPlaying = true;
      this.startTime = this.audioContext.currentTime;
      this.source.start(0);
      this.animationFrameId = requestAnimationFrame(this.render.bind(this));
    } catch (error) {
      console.error('Error loading assets:', error);
      alert('Error loading assets. Please check the URLs and try again.');
    }
  }
  
  togglePause() {
    if (!this.isPlaying) {
      // Resume
      this.isPlaying = true;
      this.startTime = this.audioContext.currentTime - this.pauseTime;
      this.source.start(0, this.pauseTime);
      this.animationFrameId = requestAnimationFrame(this.render.bind(this));
      document.getElementById('pauseBtn').textContent = 'Pause';
    } else {
      // Pause
      this.isPlaying = false;
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.source.stop();
      cancelAnimationFrame(this.animationFrameId);
      document.getElementById('pauseBtn').textContent = 'Resume';
    }
  }
  
  reset() {
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.currentBeat = 0;
    
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    
    cancelAnimationFrame(this.animationFrameId);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('resetBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('fpsCounter').textContent = '0 FPS';
    document.getElementById('beatCounter').textContent = 'Beat: 0';
  }
  
  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        this.image = img;
        this.offscreenCanvas.width = img.width;
        this.offscreenCanvas.height = img.height;
        this.offscreenCtx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
  
  async loadAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - document.querySelector('.controls').offsetHeight;
  }
  
  render(timestamp) {
    if (!this.isPlaying) return;
    
    // Calculate FPS
    if (this.lastFrameTime) {
      this.fps = Math.round(1000 / (timestamp - this.lastFrameTime));
      document.getElementById('fpsCounter').textContent = `${this.fps} FPS`;
    }
    this.lastFrameTime = timestamp;
    
    // Calculate current time and progress
    const currentTime = this.audioContext.currentTime - this.startTime;
    const progress = currentTime / this.audioBuffer.duration;
    document.getElementById('progressBar').style.width = `${progress * 100}%`;
    
    // Update beat scheduler
    const beatInfo = this.scheduler.getBeatInfo(currentTime);
    this.currentBeat = beatInfo.currentBeat;
    document.getElementById('beatCounter').textContent = `Beat: ${this.currentBeat}`;
    
    // Apply effects based on beat
    this.effectManager.applyEffects(
      this.offscreenCanvas, 
      this.canvas, 
      beatInfo, 
      this.prng
    );
    
    this.animationFrameId = requestAnimationFrame(this.render.bind(this));
  }
}

// Initialize the app when all effects are loaded
Promise.all([
  import('./effects/VShift.js'),
  import('./effects/Scanlines.js'),
  import('./effects/GaussianBlur.js'),
  import('./effects/Pixelation.js'),
  import('./effects/AlphaFade.js'),
  import('./effects/Glitch.js'),
  import('./effects/ColorSweep.js'),
  import('./effects/BrightnessReveal.js'),
  import('./effects/GlyphReveal.js'),
  import('./effects/RippleDistortion.js'),
  import('./effects/RadialReveal.js'),
  import('./effects/InkDiffusion.js')
]).then(() => {
  new MusicSyncedImageReveal();
}).catch(error => {
  console.error('Error loading effects:', error);
});
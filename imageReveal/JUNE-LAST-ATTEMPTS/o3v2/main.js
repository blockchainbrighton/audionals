
import { Xoshiro128 } from './utils/prng.js';
import BeatScheduler from './utils/BeatScheduler.js';
import EffectBase from './effects/EffectBase.js';

// Dynamic import all effects
const effectModules = await Promise.all([
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
  import('./effects/InkDiffusion.js'),
]);
const effectsList = effectModules.map(m=>m.default);

const SELECT_FPS = 60;
const FRAME_TIME = 1000 / SELECT_FPS;

const canvas = document.getElementById('visualCanvas');
const gl = canvas.getContext('webgl2', {alpha:false}) || canvas.getContext('webgl') || null;
const ctx2d = !gl ? canvas.getContext('2d') : null;

let audioCtx, sourceNode;
let analyser;
let scheduler;
let prng;
let effects = [];
let currentEffect = 0;
let running=false, paused=false;
let lastFrameTime=performance.now();
let progress=0;
let revealSpeed=0.5;
let intensity=0.8;
let fpsDisplay=document.getElementById('fpsDisplay');
let frameCounter=0, fpsStart=performance.now();

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  if(gl) gl.viewport(0,0,gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener('resize', resize);
resize();

function initEffects(image){
  effects = effectsList.map(Eff=> new Eff({gl,ctx2d,canvas,image,intensity,prng}));
}

function setupAudio(songUrl, bpmOverride){
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  fetch(songUrl)
    .then(r=>r.arrayBuffer())
    .then(buf=>audioCtx.decodeAudioData(buf))
    .then(buffer=>{
      sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(analyser).connect(audioCtx.destination);
      const bpm = bpmOverride || BeatScheduler.detectBPM(buffer) || 120;
      scheduler = new BeatScheduler(audioCtx.currentTime, bpm, document.getElementById('numBars').value);
      sourceNode.start();
      running=true;
    });
}

function render(now){
  if(!running) return requestAnimationFrame(render);
  const dt = now - lastFrameTime;
  if(dt < FRAME_TIME - 1){ // Frame skipping prevention
    return requestAnimationFrame(render);
  }
  lastFrameTime=now;

  frameCounter++;
  if(now - fpsStart >= 1000){
    if(!fpsDisplay.hidden) fpsDisplay.textContent=`${frameCounter} fps`;
    frameCounter=0; fpsStart=now;
  }

  const beatInfo = scheduler ? scheduler.update(audioCtx.currentTime) : {phase:0};
  progress += revealSpeed * dt / 1000;
  progress = Math.min(progress, 1);

  const eff = effects[currentEffect];
  eff.update({dt, progress, beat:beatInfo});
  if(gl){
    gl.clear(gl.COLOR_BUFFER_BIT);
  }else{
    ctx2d.clearRect(0,0,canvas.width, canvas.height);
  }
  eff.render();
  if(progress >= 1 && currentEffect < effects.length-1){
    currentEffect++;
    progress=0;
  }

  requestAnimationFrame(render);
}

document.getElementById('startBtn').addEventListener('click', ()=>{
  const imgUrl = document.getElementById('imageUrl').value;
  const songUrl = document.getElementById('songUrl').value;
  const seed = parseInt(document.getElementById('seedInput').value) || 1337;
  prng = new Xoshiro128(seed);
  const image = new Image();
  image.crossOrigin="anonymous";
  image.src = imgUrl;
  image.onload=()=>{
    initEffects(image);
    setupAudio(songUrl, parseInt(document.getElementById('bpmInput').value)||null);
    requestAnimationFrame(render);
  };
});

document.getElementById('pauseBtn').addEventListener('click', ()=>{
  if(!running) return;
  if(!paused){
    audioCtx.suspend();
    paused=true;
  }else{
    audioCtx.resume();
    paused=false;
  }
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(audioCtx) audioCtx.close();
  running=false; paused=false; progress=0; currentEffect=0;
});

document.getElementById('speedSlider').addEventListener('input',e=>{
  revealSpeed=parseFloat(e.target.value);
});
document.getElementById('intensitySlider').addEventListener('input',e=>{
  intensity=parseFloat(e.target.value);
  effects.forEach(eff=>eff.setIntensity(intensity));
});

window.addEventListener('keydown',e=>{
  if(e.key==='F' && e.shiftKey){
    fpsDisplay.hidden=!fpsDisplay.hidden;
  }
});

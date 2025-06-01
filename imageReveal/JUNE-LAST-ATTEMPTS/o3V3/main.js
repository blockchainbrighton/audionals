
import Xoshiro128 from './prng.js';
import {EffectBase} from './effect_base.js';
import VShift from './effects/VShift.js';
import Scanlines from './effects/Scanlines.js';
import GaussianBlur from './effects/GaussianBlur.js';
import Pixelation from './effects/Pixelation.js';
import AlphaFade from './effects/AlphaFade.js';
import Glitch from './effects/Glitch.js';
import ColorSweep from './effects/ColorSweep.js';
import BrightnessReveal from './effects/BrightnessReveal.js';
import GlyphReveal from './effects/GlyphReveal.js';
import RippleDistortion from './effects/RippleDistortion.js';
import RadialReveal from './effects/RadialReveal.js';
import InkDiffusion from './effects/InkDiffusion.js';

const effectsClasses=[VShift,Scanlines,GaussianBlur,Pixelation,AlphaFade,Glitch,ColorSweep,BrightnessReveal,GlyphReveal,RippleDistortion,RadialReveal,InkDiffusion];

const canvas=document.getElementById('visualizerCanvas');
const ctx=canvas.getContext('2d');

const dpr=window.devicePixelRatio||1;
function resizeCanvas(){
  canvas.width=window.innerWidth*dpr;
  canvas.height=window.innerHeight*dpr;
  canvas.style.width=window.innerWidth+'px';
  canvas.style.height=window.innerHeight+'px';
  ctx.scale(dpr,dpr);
}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);

const startBtn=document.getElementById('startBtn');
const pauseBtn=document.getElementById('pauseBtn');
const resetBtn=document.getElementById('resetBtn');
const speedSlider=document.getElementById('speedSlider');
const intensitySlider=document.getElementById('intensitySlider');
const progressBarFill=document.getElementById('progressBarFill');
const fpsCounter=document.getElementById('fpsCounter');

let audioCtx, audioEl, sourceNode, workletNode;
let imageBitmap=null;
let running=false, paused=false;
let seed=1, prng=null;
let bpm=120, bars=8, totalBeats=32;
let beatCount=0;
let startTimestamp=0;
let currentEffect=null, effectIndex=0;
let lastFrameTime=performance.now();
let frames=0, fps=0, fpsTimer=0;

async function setupAudioWorklet(){
  workletNode = new AudioWorkletNode(audioCtx,'beat-detector');
  workletNode.port.onmessage=(e)=>{
    if(e.data.type==='beat'){
      onBeat();
    }
  };
  sourceNode.connect(workletNode).connect(audioCtx.destination);
}

function onBeat(){
  beatCount++;
  if(beatCount%Math.ceil(totalBeats/effectsClasses.length)===0){
    effectIndex=(effectIndex+1)%effectsClasses.length;
    initCurrentEffect();
  }
  if(currentEffect&&currentEffect.onBeat) currentEffect.onBeat(beatCount/totalBeats);
}

function initCurrentEffect(){
  const EffectClass=effectsClasses[effectIndex];
  currentEffect=new EffectClass();
  currentEffect.init(ctx,imageBitmap,canvas,{intensity:Number(intensitySlider.value)});
}

async function loadImage(url){
  const worker=new Worker('./workers/imageWorker.js',{type:'module'});
  return new Promise((resolve,reject)=>{
    worker.onmessage=(e)=>{
      if(e.data.type==='image'){ resolve(e.data.bitmap); }
      else reject(e.data.message||'worker error');
    };
    worker.postMessage({type:'loadImage',url});
  });
}

async function start(){
  if(running) reset();
  const imgURL=document.getElementById('imageURL').value.trim();
  const audioURL=document.getElementById('audioURL').value.trim();
  bpm=Number(document.getElementById('bpmInput').value)||120;
  bars=Number(document.getElementById('barsInput').value)||8;
  totalBeats=bars*4;
  seed=parseInt(document.getElementById('seedInput').value)||42;
  prng=new Xoshiro128(seed);
  imageBitmap=await loadImage(imgURL);
  canvas.focus();
  // audio
  audioEl=new Audio(audioURL);
  audioEl.crossOrigin='anonymous';
  await audioEl.play();
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  sourceNode=audioCtx.createMediaElementSource(audioEl);
  await audioCtx.audioWorklet.addModule('./audio-worklet/beat-processor.js');
  await setupAudioWorklet();
  running=true; paused=false; beatCount=0; effectIndex=0;
  initCurrentEffect();
  startTimestamp=performance.now();
  requestAnimationFrame(loop);
}

function pause(){
  if(!running) return;
  if(paused){
    audioEl.play();
    audioCtx.resume();
    paused=false;
  }else{
    audioEl.pause();
    audioCtx.suspend();
    paused=true;
  }
  pauseBtn.textContent=paused?'Resume':'Pause';
}

function reset(){
  if(!running) return;
  audioEl.pause();
  audioCtx.close();
  running=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  progressBarFill.style.width='0%';
}

function loop(ts){
  if(!running||paused) { requestAnimationFrame(loop); return; }
  const dt=ts-lastFrameTime;
  lastFrameTime=ts;
  // fps calc
  frames++; fpsTimer+=dt;
  if(fpsTimer>1000){
    fps=frames; frames=0; fpsTimer=0;
    if(!fpsCounter.hidden) fpsCounter.textContent=`FPS: ${fps}`;
  }
  // progress
  const progress=Math.min(beatCount/totalBeats,1);
  progressBarFill.style.width=(progress*100).toFixed(1)+'%';
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(currentEffect) currentEffect.draw(progress,dt);
  requestAnimationFrame(loop);
}

// UI
startBtn.addEventListener('click',()=>start());
pauseBtn.addEventListener('click',pause);
resetBtn.addEventListener('click',reset);
document.addEventListener('keydown',e=>{
  if(e.shiftKey&&e.key==='F'){
    fpsCounter.hidden=!fpsCounter.hidden;
  }else if(e.key===' '){
    pause();
  }
});

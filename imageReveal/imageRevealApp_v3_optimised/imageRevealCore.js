/* imageRevealCore.js – condensed & API‑ready (07 May 2025) */
import fade   from './effects/fade.js';
import pixel  from './effects/pixelate.js';
import glyph, { hideGlyphCover } from './effects/glyph.js';
import sweep  from './effects/colourSweepBrightness.js';

/* effect registry & helpers */
export const renders = { ...fade, ...pixel, ...glyph, ...sweep };
export const EFFECT_PAIRS = {
  fadeIn:'fadeOut',          fadeOut:'fadeIn',
  pixelateFwd:'pixelateRev', pixelateRev:'pixelateFwd',
  glyphFwd:'glyphRev',       glyphRev:'glyphFwd',
  sweepBrightFwd:'sweepBrightRev', sweepBrightRev:'sweepBrightFwd'
};
const isGlyph = k => k.startsWith('glyph');
const isReverse = k => Object.values(EFFECT_PAIRS).includes(k) && !Object.keys(EFFECT_PAIRS).includes(k);

/* UI + state */
const STEP_FINE = .25, STEP_COARSE = 2, DUR_MIN = .25, DUR_MAX = 600, clamp = (v,mn,mx)=>Math.min(Math.max(v,mn),mx);

let ui, effectSel, durSlider, durVal, canvas, ctx,
    img = null, dur = 10_000, startT = 0, raf = null, running = false;

/* UI */
function makeUI () {
  const labels = {
    fadeIn:'Fade In (Black→Image)', fadeOut:'Fade Out (Image→Black)',
    pixelateFwd:'Pixelate (Image→Pixels)', pixelateRev:'De‑Pixelate',
    glyphFwd:'Glyph Fill', glyphRev:'Glyph Clear',
    sweepBrightFwd:'Brightness Sweep (Dark→Light)', sweepBrightRev:'Brightness Sweep (Light→Dark)'
  };

  ui = document.createElement('div'); ui.id = 'imageRevealContainer';
  ui.innerHTML = `
    <style>
      #imageRevealContainer{margin:20px 0;padding:15px;border:1px solid #ddd;background:#f9f9f9}
      #imageCanvas{border:1px solid #000;margin-top:10px;max-width:100%;background:#000}
    </style>
    <h2 style="margin:0">Image Reveal Effect</h2>
    <div><label>Effect:<select id="effectSelector"></select></label></div>
    <div><label>Duration:
      <input type="range" id="durationSlider" min="${DUR_MIN}" max="${DUR_MAX}" value="10" step="${STEP_FINE}">
      <span id="durationValueDisplay">10s</span>
    </label></div>
    <canvas id="imageCanvas" width="480" height="270"></canvas>`;
  document.body.appendChild(ui);

  [effectSel,durSlider,durVal,canvas] =
    ['effectSelector','durationSlider','durationValueDisplay','imageCanvas'].map(id => ui.querySelector('#'+id));
  ctx = canvas.getContext('2d');

  for (const [v,t] of Object.entries(labels)) effectSel.append(new Option(t,v));

  ctx.fillStyle='#555';ctx.textAlign='center';ctx.fillText('Image will appear here…',canvas.width/2,canvas.height/2);

  effectSel.onchange = () => { if (!isGlyph(effectSel.value)) hideGlyphCover(canvas); running?restart():resetEffect(); };
  durSlider.oninput  = ({target:{value}}) => { dur = value*1000; durVal.textContent=`${value}s`; if(running) restart(); };
}

/* Core render helpers */
const render = p => renders[effectSel.value]?.(ctx,canvas,img,p);
const dispatch = (t,d={})=>document.dispatchEvent(new CustomEvent(t,{detail:{effect:effectSel.value,...d}}));

function resetEffect () {
  cancelAnimationFrame(raf); running=false; raf=null;
  if (!isGlyph(effectSel.value)) hideGlyphCover(canvas);
  render(0); dispatch('imageRevealEffectStopped');
}
function startEffect () {
  if (!ctx||!img) return;
  cancelAnimationFrame(raf); running=true;
  if (!isGlyph(effectSel.value)) hideGlyphCover(canvas);
  render(0); startT=performance.now(); raf=requestAnimationFrame(loop);
  dispatch('imageRevealEffectStarted',{duration:dur});
}
const restartEffect = () => { resetEffect(); startEffect(); };

function loop (t){
  if(!running) return;
  const p=Math.min((t-startT)/dur,1);
  render(p);
  p<1? raf=requestAnimationFrame(loop)
     : (running=false,raf=null,dispatch('imageRevealEffectCompleted'));
}

/* duration utilities */
function adjustDuration({delta=0,factor=1}={}){
  const next = delta ? +durSlider.value+delta : +durSlider.value*factor;
  const s = +clamp(next,DUR_MIN,DUR_MAX).toFixed(2);
  if(s!==+durSlider.value){ durSlider.value=s; durSlider.oninput({target:{value:s}}); }
}

/* direction switch */
function setDirection(reverse=false){
  if(!effectSel) return;
  const cur=effectSel.value, revNow=isReverse(cur);
  if(reverse===revNow) return;           // already correct
  const opp=EFFECT_PAIRS[cur];           // guaranteed by map
  if(!opp) return;

  const prog = running? Math.min((performance.now()-startT)/dur,1):0;
  effectSel.value=opp;                   // swap
  startT = performance.now() - (1-prog)*dur;
  if(!running){ running=true; raf=requestAnimationFrame(loop); }
  render(1-prog);
}

/* image setter (exported) */
export function setImage(newImg){
  img = newImg instanceof HTMLImageElement ? newImg : null;
  if(!canvas || !ctx){ canvas=document.getElementById('imageCanvas'); ctx=canvas?.getContext('2d'); }
  if(!img){ showMsg('No valid image'); return; }
  [canvas.width,canvas.height] = [img.naturalWidth,img.naturalHeight];
  resetEffect();
}

/* keyboard + click */
function onKey(e){
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')) return;
  const {key,ctrlKey,shiftKey}=e;
  if(key==='ArrowUp'||key==='ArrowDown'){ e.preventDefault();
    const s=key==='ArrowUp'?1:-1;
    ctrlKey? adjustDuration({factor:key==='ArrowUp'?2:.5})
            : adjustDuration({delta:s*(shiftKey?STEP_COARSE:STEP_FINE)});
  } else if(ctrlKey&&key==='0'){ e.preventDefault(); adjustDuration({delta:10-+durSlider.value}); }
  else if(key==='ArrowLeft'){ e.preventDefault(); setDirection(true); }
  else if(key==='ArrowRight'){ e.preventDefault(); setDirection(false); }
}
const onCanvasClick=()=>document.dispatchEvent(new Event('togglePlayback'));
function showMsg(txt){ if(!ctx)return; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#555';ctx.textAlign='center';ctx.fillText(txt,canvas.width/2,canvas.height/2); }

/* boot */
function init(){
  makeUI();
  document.addEventListener('appImagesReady', ({detail})=>setImage(detail?.images?.find(i=>i)));
  if(window.imageRevealLoadedImages) setImage(window.imageRevealLoadedImages.find(i=>i));
  canvas.addEventListener('click',onCanvasClick);
  window.addEventListener('keydown',onKey,{passive:false});
  document.addEventListener('playbackStarted',startEffect);
  document.addEventListener('playbackStopped',resetEffect);
  console.log('ImageRevealCore ready (condensed).');
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();

/* === exports for Public API === */


/* parameter setters (exported) */
function setEffectParameter(name){
  if(!effectSel||!Array.from(effectSel.options).some(o=>o.value===name)) return;
  if(effectSel.value!==name){ effectSel.value=name; effectSel.onchange(); }
}
function setDurationParameter(sec){ if(!durSlider)return;
  const n=+clamp(+sec,DUR_MIN,DUR_MAX).toFixed(2);
  if(+durSlider.value!==n){ durSlider.value=n; durSlider.oninput({target:{value:n}}); }
}


export {
  startEffect, resetEffect, restartEffect,
  setDirection, setEffectParameter, setDurationParameter,
   DUR_MIN, DUR_MAX
};
/*
 * Shared utility helpers for the oscilloscope app.
 * Enhanced & refactored for minimal lines while preserving identifiers and behavior.
 * v20.2 - Consolidated utilities from multiple modules
 */

// === Core Math & Value Utilities ===
export function clamp01(n){ return Number.isFinite(n)?(n<0?0:n>1?1:n):0; }
export function clamp(v,a,b){ return v<a?a:v>b?b:v; }
export function pct(n){ return Math.round(clamp01(n)*100); }
export const TAU=Math.PI*2, HALF_PI=Math.PI*.5;

// === DOM Event Utilities ===
export function on(el,type,handler,opts){ el?.addEventListener?.(type,handler,opts); }
export function off(el,type,handler,opts){ el?.removeEventListener?.(type,handler,opts); }
export function addEvents(el,pairs){ for(let i=0;i<(pairs?.length||0);i++) on(el,pairs[i][0],pairs[i][1],pairs[i][2]); }
export function removeEvents(el,pairs){ for(let i=0;i<(pairs?.length||0);i++) off(el,pairs[i][0],pairs[i][1],pairs[i][2]); }

// === DOM Manipulation Utilities ===
export function setText(el,s){ if(el&&el.textContent!==s) el.textContent=s; }
export function setPressed(button,value){ const pressed=String(!!value); if(button?.getAttribute?.('aria-pressed')!==pressed) button?.setAttribute?.('aria-pressed',pressed); }
export function toggleClass(el,cls,on){ el?.classList?.toggle?.(cls,!!on); }
export function byId(root,id){ return root?.getElementById?.(id)??null; }
export function setDisabledAll(els,disabled){ const d=!!disabled; for(const el of els||[]) if(el&&el.disabled!==d) el.disabled=d; }

// === Type Checking Utilities ===
export const isBool=v=>typeof v==='boolean';
export const isNum=v=>typeof v==='number'&&!Number.isNaN(v);
export const isString=v=>typeof v==='string';
export const isFunction=v=>typeof v==='function';
export const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const isArray=Array.isArray;

// === Performance Utilities ===
export function memoize(fn,keyFn=(...a)=>JSON.stringify(a)){ const cache=new Map; return function(...a){ const k=keyFn(...a); if(cache.has(k)) return cache.get(k); const r=fn.apply(this,a); cache.set(k,r); return r; }; }
export function debounce(fn,delay){ let id; return function(...a){ clearTimeout(id); id=setTimeout(()=>fn.apply(this,a),delay); }; }
export function throttle(fn,limit){ let lock; return function(...a){ if(!lock){ fn.apply(this,a); lock=true; setTimeout(()=>lock=false,limit); } }; }
const g=globalThis;
export const raf=g.requestAnimationFrame||g.webkitRequestAnimationFrame||g.mozRequestAnimationFrame||(cb=>setTimeout(cb,16));
export const cancelRaf=g.cancelAnimationFrame||g.webkitCancelAnimationFrame||g.mozCancelAnimationFrame||clearTimeout;

// === Utility Functions ===
export const noop=()=>{};
export const identity=x=>x;
export function range(start,end,step=1){ const out=[]; if(step>0){ for(let i=start;i<end;i+=step) out.push(i); } else if(step<0){ for(let i=start;i>end;i+=step) out.push(i); } return out; }
export function deepClone(obj){
  if(obj===null||typeof obj!=='object') return obj;
  if(obj instanceof Date) return new Date(obj.getTime());
  if(Array.isArray(obj)) return obj.map(deepClone);
  const cloned={}; for(const k in obj) if(Object.prototype.hasOwnProperty.call(obj,k)) cloned[k]=deepClone(obj[k]); return cloned;
}
export function deepMerge(target,...sources){
  for(const src of sources){ if(isObject(target)&&isObject(src)){ for(const k in src){ if(Object.prototype.hasOwnProperty.call(src,k)){ const v=src[k]; isObject(v)?(target[k]??={}, deepMerge(target[k],v)):target[k]=v; } } } }
  return target;
}

// === Math Destructuring (shared across modules) ===
export const { sin, cos, abs, PI, pow, sqrt: SQRT, imul, min, max, floor, ceil, round } = Math;
export const SQRT2 = Math.SQRT2;

// === Element Creation Helper (consolidated from engine.js) ===
export const createElement = (tag, props) => Object.assign(document.createElement(tag), props);

// === DOM Ready Utility (consolidated from multiple modules) ===
export const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));

// === Wait/Polling Utility (consolidated from multiple modules) ===
export function waitFor(predicate, timeout = 6000) {
  return new Promise(resolve => {
    const startTime = performance.now();
    const check = () => {
      if (predicate()) {
        resolve(true);
      } else if (performance.now() - startTime > timeout) {
        resolve(false);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

// === Angle/Theta Utilities (consolidated from scope-canvas.js) ===
export const theta = (i, n, ph = 0) => (i / n) * TAU + ph;
export const norm = v => (v + 1) * 0.5;

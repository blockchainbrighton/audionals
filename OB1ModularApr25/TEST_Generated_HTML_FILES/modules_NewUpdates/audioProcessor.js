// audioProcessor.js
import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
import * as timingManager from './timingManagement.js';
import {
  drawWaveform, clearWaveform as clearDisplay, setAudioContext,
  startPlayhead, stopPlayhead, setReversed as setDispReversed
} from './waveformDisplay.js';
import {
  getTrimTimes, setBufferDuration, resetTrims, setReversed as setTrimReversed
} from './waveformTrimmer.js';

const A4=69, F4=440, SR=2**(1/12), MIN=21, MAX=108, SM=0.01, MD=1;
let ctx, mainGain, buf, revBuf, rev=false, tempo=78, pitch=1, vol=1, origFreq;
const rates=new Map(), clamp=(v,l,h)=>Math.max(l,Math.min(v,h));

const ensure=async()=>{
  if(ctx?.state==='suspended') try { await ctx.resume(); return true; } catch(e) { showError('Could not resume audio context.'); throw e; }
  return !!ctx;
};
const currBuf=()=>rev?revBuf:buf;
export const getCurrentDisplayBuffer=()=>rev&&revBuf?revBuf:buf;

const getParams=()=>{
  const b=currBuf(), d=buf;
  if(!b||!d) return null;
  const {startTime:st=0, duration:du=d.duration} = getTrimTimes?.()||{};
  const tot=d.duration;
  const off=rev ? clamp(tot-(st+du),0,tot) : clamp(st,0,tot);
  const dur=clamp(du,0,tot-off);
  return dur>0.001 ? {buffer:b,offset:off,duration:dur,rate:pitch} : null;
};

const playSeg=(b,o,d,r,t)=>{
  if(!b||!ctx||d<=0) return null;
  try {
    const s=ctx.createBufferSource();
    s.buffer=b; s.playbackRate.value=r; s.connect(filter);
    triggerImageAnimation(); s.start(t,o,d);
    startPlayhead?.(t,r,o,d);
    return s;
  } catch(e) {
    showError(`Failed to play audio segment: ${e.message}`);
    stopPlayhead?.();
    return null;
  }
};

const createRev=b=> b&&ctx ? (()=>{
  const c=b.numberOfChannels, l=b.length, s=b.sampleRate;
  const r=ctx.createBuffer(c,l,s);
  for(let i=0;i<c;i++){const oD=b.getChannelData(i),nD=r.getChannelData(i);
    for(let j=0,k=l-1;j<l;) nD[j++]=oD[k--];
  }
  return r;
})() : null;

let filter, delay, delayFB;
const setup=()=>{
  window.AudioContext=window.AudioContext||window.webkitAudioContext;
  ctx = ctx && ctx.state!=='closed' ? ctx : new AudioContext();
  mainGain=ctx.createGain(); filter=ctx.createBiquadFilter();
  delay=ctx.createDelay(MD); delayFB=ctx.createGain();
  mainGain.gain.setValueAtTime(vol,ctx.currentTime);
  filter.type='lowpass'; filter.frequency.setValueAtTime(clamp(20000,0,ctx.sampleRate/2),ctx.currentTime);
  filter.Q.setValueAtTime(1,ctx.currentTime);
  filter.gain.setValueAtTime(0,ctx.currentTime);
  delay.delayTime.setValueAtTime(0,ctx.currentTime);
  delayFB.gain.setValueAtTime(0,ctx.currentTime);
  filter.connect(delay); delay.connect(mainGain); mainGain.connect(ctx.destination);
  delay.connect(delayFB); delayFB.connect(delay);
  setAudioContext?.(ctx);
};

const decodePrep=async(a)=>{
  const ab=base64ToArrayBuffer(a);
  buf=await ctx.decodeAudioData(ab);
  revBuf=createRev(buf);
  drawWaveform(buf);
  setBufferDuration(buf.duration);
  const el=document.getElementById('audio-meta-frequency')?.textContent.trim();
  const f=parseFloat(el?.split(' ')[0]);
  if(isFinite(f)&&f>0) {
    origFreq=f;
    for(let n=MIN;n<=MAX;n++) rates.set(n,(F4*SR**(n-A4))/origFreq);
  }
};

export const init=async(a,ti=78,pi=1,vi=1)=>{
  if(ctx&&ctx.state!=='closed') await ctx.close();
  buf=revBuf=null; rates.clear(); rev=false;
  clearDisplay(); stopPlayhead(); resetTrims(); setTrimReversed(false); setDispReversed(false);
  tempo=ti>0?ti:78; pitch=pi>0?pi:1; vol=(vi>=0&&vi<=1.5)?vi:1;
  setup(); filter.frequency.setValueAtTime(ctx.sampleRate/2,ctx.currentTime);
  try {
    await decodePrep(a);
    timingManager.init(ctx,tempo,pitch);
    return true;
  } catch(e) {
    showError(`Initialization Error: ${e.message}`);
    ctx.close().catch(); ctx=undefined;
    return false;
  }
};

export const playOnce=async()=>{ if(!await ensure()) return; stopLoop(); const p=getParams(); p ? playSeg(p.buffer,p.offset,p.duration,p.rate,ctx.currentTime) : stopPlayhead(); };
export const startLoop=async()=>{
  if(timingManager.getLoopingState()||!await ensure()) return;
  const cb=t=>{ const p=getParams(); p ? playSeg(p.buffer,p.offset,p.duration,p.rate,t) : stopPlayhead(); };
  if(!getParams()) { showError('Cannot start loop: Trimmed duration is zero.'); return; }
  timingManager.startLoop(cb);
};
export const stopLoop=()=> timingManager.getLoopingState() && (timingManager.stopLoop(), stopPlayhead());

export const setScheduleMultiplier=m=>{ const v=parseInt(m,10); if(v>=1) timingManager.setScheduleMultiplier(v); };
export const setTempo=t=>t>0&&ctx&&(tempo=t, timingManager.setTempo(t));
export const setGlobalPitch=p=>p>0&&ctx&&(pitch=p, timingManager.setPitch(p));
export const setVolume=v=>ctx&&mainGain&&(vol=v, mainGain.gain.setTargetAtTime(v,ctx.currentTime,SM));

export const setDelayTime=t=>ctx&&(delay.delayTime.setTargetAtTime(clamp(t,0,MD),ctx.currentTime,SM));
export const setDelayFeedback=f=>ctx&&(delayFB.gain.setTargetAtTime(clamp(f,0,0.9),ctx.currentTime,SM));

export const setFilterType=t=>filter&&['lowpass','highpass','bandpass','lowshelf','highshelf','peaking','notch','allpass'].includes(t) && (filter.type=t);
export const setFilterFrequency=f=>ctx&&(filter.frequency.setTargetAtTime(clamp(f,10,ctx.sampleRate/2),ctx.currentTime,SM));
export const setFilterQ=q=>ctx&&(filter.Q.setTargetAtTime(clamp(q,0.0001,100),ctx.currentTime,SM));
export const setFilterGain=g=>ctx&&(filter.gain.setTargetAtTime(clamp(g,-40,40),ctx.currentTime,SM));

export const toggleReverse=async()=>{
  const target=!rev;
  if(target&&!revBuf||!target&&!buf) { showError('Audio unavailable.'); return rev; }
  if(!await ensure()) { showError('Audio context not running.'); return rev; }
  const looping=timingManager.getLoopingState(); looping? stopLoop() : stopPlayhead();
  rev=target; setTrimReversed(rev); setDispReversed(rev);
  const draw= getCurrentDisplayBuffer() ? drawWaveform : clearDisplay;
  draw(getCurrentDisplayBuffer());
  if(looping) try{ await startLoop(); } catch{ showError('Error restarting loop.'); }
  return rev;
};

export const getLoopingState=()=>timingManager.getLoopingState()||false;
export const getReverseState=()=>rev;
export const getAudioContextState=()=>ctx?.state||'unavailable';
export const resumeContext=()=>ensure();
export const getPlaybackRateForNote=n=>rates.get(n);
export const playSampleAtRate=async(r)=>{ if(r<=0||!await ensure()) return; const p=getParams(); p?playSeg(p.buffer,p.offset,p.duration,r,ctx.currentTime):stopPlayhead(); };

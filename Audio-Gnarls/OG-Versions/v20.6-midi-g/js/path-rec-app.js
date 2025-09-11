
// path-rec-app.js
// Freestyle Path Recorder module — Enhanced with neon visuals and smooth animations
// Captures pointer paths with timing, renders an overlay, and plays back recordings.

import { clamp01 } from './utils.js';

class PathRecApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:none}</style>';
    // State
    this._armed = this._isRecording = this._isPlaying = false;
    this._loop = false;
    this._showOverlay = true;
    this._recording = null;
    this._points = [];
    this._t0 = this._lastSampleT = this._playIdx = this._playT0 = this._raf = 0;
    // Bind methods
    for (const k of ['arm','disarm','clear','play','stop','getRecording','inputPointer','renderOverlay','setLoop']) this[k]=this[k].bind(this);
  }

  // -------------------- Public API --------------------
  arm(){ if(this._armed) return; this._armed=true; this._showOverlay=true; this._dispatch('fr-armed'); }
  disarm(){
    if(!this._armed) return;
    if(this._isRecording) this._endRecording(performance.now());
    this._armed=false; this._showOverlay=false; this._dispatch('fr-disarmed');
  }
  clear(){ this.stop(); this._recording=null; this._points=[]; this._dispatch('fr-cleared'); }
  getRecording(){ return this._recording ? { points: this._recording.points.slice(), duration: this._recording.duration } : null; }
  play(recording, opts = {}){
    this._loop=!!opts.loop; if(this._isPlaying) return;
    const rec = recording || this._recording; if(!rec?.points?.length) return;
    if(recording) this._recording=recording;
    this._isPlaying=true; this._playIdx=0; this._playT0=performance.now(); this._dispatch('fr-play-started');
    const first = rec.points[0]; if(first) this._emitPlayInput({ x:first.x, y:first.y, t:0, type:first.type||'down' });
    const step = () => {
      if(!this._isPlaying) return;
      const now = performance.now(), et = now - this._playT0, pts = rec.points;
      while(this._playIdx<pts.length && pts[this._playIdx].t<=et) this._emitPlayInput(pts[this._playIdx++]);
      const pos = this._interpAtTime(rec, et); if(pos) this._emitPlayInput({ x:pos.x, y:pos.y, t:et, type:'move', _interp:true });
      if(et >= rec.duration){
        const last = pts[pts.length-1];
        if(last.type!=='up') this._emitPlayInput({ x:last.x, y:last.y, t:rec.duration, type:'up' });
        if(this._loop){
          this._dispatch('fr-play-loop'); this._playIdx=0; this._playT0=performance.now();
          const f = pts[0]; if(f) this._emitPlayInput({ x:f.x, y:f.y, t:0, type:f.type||'down' });
          this._raf=requestAnimationFrame(step);
        } else this.stop();
        return;
      }
      this._raf=requestAnimationFrame(step);
    };
    this._raf=requestAnimationFrame(step);
  }
  stop(){ if(!this._isPlaying) return; cancelAnimationFrame(this._raf); this._isPlaying=false; this._dispatch('fr-play-stopped'); }
  setLoop(v){ this._loop=!!v; }
  inputPointer(type, x, y, t){
    if(!this._armed) return;
    x=clamp01(x); y=clamp01(y);
    const now = t ?? performance.now();
    if(type==='down' && !this._isRecording) this._beginRecording(now);
    if(!this._isRecording) return;
    const rel = now - this._t0;
    this._points.push({ x, y, t:rel, type }); this._lastSampleT=rel;
    if(type==='up') this._endRecording(now);
  }

  renderOverlay(ctx, now = performance.now()){
    if(!this._showOverlay && !(this._isPlaying && this._recording)) return;
    const rec = this._isRecording ? { points:this._points } : this._recording, hasPoints = rec?.points?.length>0, {canvas}=ctx;
    ctx.save();
    if(this._showOverlay && hasPoints){
      ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.shadowBlur=15; ctx.shadowColor='#00ffff80'; ctx.strokeStyle='#00ffff'; ctx.beginPath(); this._drawPath(ctx, rec.points, canvas); ctx.stroke();
      ctx.shadowBlur=5; ctx.shadowColor='#00ffff'; ctx.lineWidth=2; ctx.stroke();
    }
    if(this._isPlaying && this._recording){
      const et = now - this._playT0, pos = this._interpAtTime(this._recording, et);
      if(pos){
        const cx=pos.x*canvas.width, cy=pos.y*canvas.height, pulse=0.8+0.2*Math.sin(now/100), glow=0.7+0.3*Math.sin(now/150);
        ctx.beginPath(); ctx.arc(cx, cy, 10*pulse, 0, Math.PI*2);
        ctx.fillStyle=`hsl(300,100%,${70+10*glow}%)`; ctx.fill();
        ctx.shadowBlur=15*glow; ctx.shadowColor='#ff00ff'; ctx.strokeStyle='#ff00ff'; ctx.lineWidth=2; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // -------------------- Private Helpers --------------------
  _beginRecording(tAbs){
    this.stop(); this._isRecording=true; this._points=[]; this._t0=tAbs; this._lastSampleT=0; this._dispatch('fr-record-started');
  }
  _endRecording(tAbs){
    if(!this._isRecording) return;
    const duration = Math.max(1, Math.round(tAbs - this._t0));
    if(this._points.length===0) this._points.push({ x:0.5, y:0.5, t:0, type:'down' });
    const last = this._points[this._points.length-1];
    if(last.type!=='up') this._points.push({ x:last.x, y:last.y, t:duration, type:'up' });
    this._recording={ points:this._points.slice(), duration }; this._isRecording=false; this._dispatch('fr-record-stopped',{ duration });
    if(this._armed){ this._armed=false; this._showOverlay=false; this._dispatch('fr-disarmed'); }
    this.play(this._recording, { loop:this._loop });
  }
  _drawPath(ctx, points, canvas){
    for(let i=0;i<points.length;i++){ const p=points[i], cx=p.x*canvas.width, cy=p.y*canvas.height; i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy); }
  }
  _interpAtTime(rec, t){
    const pts=rec.points; if(!pts.length) return null;
    if(t<=pts[0].t) return { x:pts[0].x, y:pts[0].y };
    if(t>=rec.duration){ const l=pts[pts.length-1]; return { x:l.x, y:l.y }; }
    for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i]; if(t<=b.t){ const u=(t-a.t)/(b.t-a.t||1); return { x:a.x+(b.x-a.x)*u, y:a.y+(b.y-a.y)*u }; } }
    const l=pts[pts.length-1]; return { x:l.x, y:l.y };
  }
  _emitPlayInput(p){ this._dispatch('fr-play-input', { x:p.x, y:p.y, t:p.t, type:p.type }); }
  _dispatch(type, detail){ this.dispatchEvent(new CustomEvent(type,{ detail, bubbles:true, composed:true })); }
}

customElements.define('path-rec-app', PathRecApp);
export { PathRecApp };



/**
 * ============================================================================
 * Seed Synth Module — Web Components Suite
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * This bundle defines a small set of custom elements that together provide a
 * deterministic, seed-driven synth + oscilloscope + step-sequencer experience.
 * Audio is powered by Tone.js, but the UI and control flow are implemented as
 * Web Components with Shadow DOM encapsulation.
 *
 * COMPONENTS
 * ----------
 * 1) <tone-loader>               (class g)
 *    - Lazily loads Tone.js from a remote module URL (see SeedSynthElement
 *      default options). Once loaded, sets `window.Tone` and emits:
 *        • Event: 'tone-ready' (bubbles, composed)
 *    - Guards against duplicate loads via an internal `_loaded` flag.
 *    - Errors are logged to console but do not throw.
 *
 * 2) <scope-canvas>              (class y)
 *    - Renders real-time or synthetic oscilloscope/visual patterns onto a
 *      <canvas> with a variety of draw functions:
 *        • 'hum', 'circle', 'square', 'butterfly', 'lissajous', 'spiro',
 *          'harmonograph', 'rose', 'hypocycloid', 'epicycloid'
 *    - Inputs/state:
 *        • analyser: An AnalyserNode providing live float time-domain data.
 *        • preset:   Deterministic visual/audio preset (see osc-app).
 *        • shapeKey: Which draw function to use (string).
 *        • mode:     'live' (from analyser) or 'seed' (deterministic buffer).
 *        • isAudioStarted / isPlaying: influences indicator + drawing cues.
 *    - Internals:
 *        • _makeSeedBuffer(shapeKey, seed, len=2048): deterministic data.
 *        • Uses requestAnimationFrame; cancels on disconnectedCallback.
 *        • Color cycles via HSL; line props are tuned for readability.
 *        • Exposes `onIndicatorUpdate(label: string, isActive: boolean)` hook
 *          invoked each frame with a human-readable status string.
 *
 * 3) <osc-controls>              (class S)
 *    - Minimal control strip with:
 *        • POWER ON/OFF   -> 'start-request'
 *        • Mute/Unmute    -> 'mute-toggle'
 *        • Shape <select> -> 'shape-change' { shapeKey }
 *        • Create/Hide Sequencer -> 'toggle-sequencer'
 *    - Methods:
 *        • setShapes([{value,label}]) to populate waveform options.
 *        • disableAll(bool)
 *        • updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible })
 *    - Pure UI: emits semantic events; no audio logic.
 *
 * 4) <seq-app>                   (class b)
 *    - Lightweight 8-step sequencer with per-step velocity.
 *    - State:
 *        • isRecording, currentRecordSlot
 *        • sequence: number|null[8]  (1..9 map to shapes; 0 = hum; null = empty)
 *        • velocities: float[8] in [0,1]
 *        • sequencePlaying, sequenceStepIndex, stepTime(ms)
 *    - Interactions:
 *        • Click a slot -> enter record mode; type 0..9 to write value.
 *        • Right-click a slot -> clear.
 *        • Alt-drag on a slot -> adjust velocity; +Shift for fine control.
 *        • Play/Stop button; editable stepTime (50..2000ms).
 *    - Events (all bubble + composed):
 *        • 'seq-record-start'   { slotIndex }
 *        • 'seq-step-recorded'  { slotIndex, value, nextSlot, isRecording }
 *        • 'seq-step-cleared'   { slotIndex }
 *        • 'seq-play-started'   { stepTime }
 *        • 'seq-play-stopped'
 *        • 'seq-step-advance'   { index, value, velocity }
 *        • 'seq-step-time-changed' { stepTime }
 *    - Public methods for host:
 *        • updateState(partial), recordStep(value), playSequence(), stopSequence()
 *
 * 5) <osc-app>                   (class q)
 *    - The main application shell that wires everything together:
 *        • Renders: <tone-loader>, <scope-canvas>, <osc-controls>, <seq-app>,
 *          plus instructional panel + seed form.
 *        • Maintains all runtime state (Tone, chains, presets, seed, flags).
 *        • Keyboard shortcuts:
 *            - '0' -> hum; '1'..'9' -> shape select (and record when in seq record).
 *        • Deterministic preset synthesis via `deterministicPreset(seed, shape)`.
 *        • Buffers "hum" chain and shape chains on demand (and prebuffers after
 *          context unlock). Each chain includes oscillators, filter, LFO, reverb,
 *          and an AnalyserNode (fftSize=2048).
 *        • setActiveChain(key) connects reverb to destination, sets analyser to
 *          <scope-canvas>, and updates UI.
 *        • unlockAudioAndBufferInitial() handles the user gesture -> AudioContext
 *          unlock, buffers hum, then begins background prebuffer of all shapes.
 *        • resetToSeed(seed) fully resets state and presets for determinism.
 *    - Events/listeners from children:
 *        • tone-loader: 'tone-ready' -> caches window.Tone, loads presets/hum.
 *        • osc-controls: start/mute/shape/sequencer toggles.
 *        • seq-app: sequencing lifecycle (record/advance/time changes).
 *    - Sends status lines to <scope-canvas>.onIndicatorUpdate for UX feedback.
 *
 * 6) <seed-synth>                (class v)  **PUBLIC FACING WRAPPER**
 *    - Consumer-friendly container around <osc-app> with a small surface area.
 *    - Attributes / Options:
 *        • seed="..." (string; default '5s567g67')
 *        • show-sequencer (boolean attribute)
 *        • toneModuleUrl (via defaults; currently an Ordinals content URL)
 *        • audioContext (optional external context; currently unused path)
 *    - Lifecycle:
 *        • connectedCallback(): builds <osc-app>, forwards/bridges events,
 *          applies options, and emits 'ready' shortly after mount.
 *        • observedAttributes: 'seed', 'show-sequencer' -> live updates.
 *    - Public API (instance methods & properties):
 *        • setOptions(opts), seed (getter/setter)
 *        • options (list of {key,label} including hum)
 *        • currentKey (getter), setCurrent(key)
 *        • start(), stop(), mute(forceBool?),
 *          muted (getter; inferred from isPlaying)
 *        • recordStep(n | 1..9), playSequence(), stopSequence(), setStepTime(ms)
 *        • getAnalyser() -> AnalyserNode|null
 *        • getState()    -> snapshot of key state for persistence
 *        • setState(partial) -> applies seed, currentKey, sequence, stepTime,
 *          muted, isSequencerMode (shows/hides sequencer)
 *        • audioContext (get/set; passthrough)
 *        • tone (get/set window.Tone)
 *        • dispose()
 *    - Events emitted outward:
 *        • 'ready'
 *        • 'optionchange' { key, label }   // shape/hum selection changes
 *        • 'statechange'  { state }        // coarse app state snapshot
 *        • 'scopeframe'   { buffer: Float32Array } // analyser time-domain
 *
 * STATE & DETERMINISM
 * -------------------
 * - `seed` drives both audio preset parameters and the "seed" visual buffer.
 * - `deterministicPreset` uses a fast PRNG seeded by `${seed}_${shape}` to pick
 *   oscillator types, base notes, LFO rates/freqs, filter targets, ADSR, reverb,
 *   and color drift. Given the same seed and shape, presets are stable.
 *
 * ACCESSIBILITY & UX
 * ------------------
 * - Controls use plain buttons/select; keyboard shortcuts 0..9.
 * - Sequencer slots expose titles for velocity editing affordance (Alt-drag).
 * - Avoid blocking UI: async buffering shows succinct status in a loader label.
 *
 * PERFORMANCE
 * -----------
 * - Scope draws at RAF; analyser fftSize=2048 to balance fidelity vs CPU.
 * - Chains are disposed before re-buffering to avoid AudioNode leaks.
 * - Background prebuffering of shapes yields to frame loop (micro-yields).
 *
 * EXTENSION GUIDELINES
 * --------------------
 * - Adding a new visual shape:
 *    1. Implement a draw function in <scope-canvas>.drawFuncs[key].
 *    2. Add `key` to `osc-app.shapes` and label in `shapeLabels`.
 *    3. Update `deterministicPreset(...)` to consider any new params.
 * - Adding a new control:
 *    1. Define element in <osc-controls> constructor; add to container.
 *    2. Emit a semantic CustomEvent (bubbles + composed).
 *    3. Support it in <osc-app> handlers + updateState() propagation.
 * - Modifying synth graph:
 *    - Keep per-shape chain isolated; update bufferShapeChain() only.
 *    - Ensure you connect a reverb (or final node) to destination in
 *      setActiveChain() and expose an AnalyserNode for the scope.
 *
 * SAFETY / CAVEATS
 * ----------------
 * - Tone.js is loaded from an external URL (currently an Ordinals content URL).
 *   If that host is unavailable or slow, <tone-loader> will log an error and
 *   the app will not start. Consider making the URL configurable or mirrored.
 * - `window.Tone` is a global; avoid conflicting versions across the page.
 * - Always call dispose() on <seed-synth> or remove the element to stop timers,
 *   timeouts, and disconnect nodes. <scope-canvas> cancels RAF on disconnect.
 *
 * DEBUGGING TIPS
 * --------------
 * - If audio does not start: verify a user gesture reached unlockAudio..., and
 *   that `Tone.context.state === 'running'`.
 * - If visuals freeze: ensure analyser is non-null and that RAF isn’t cancelled.
 * - If CPU spikes: try smaller fftSize, fewer oscillators, or less reverb.
 *
 * ============================================================================
 */


/**
 * Seed Synth — Quick Reference
 * ----------------------------
 * Components:
 *  - <tone-loader>  -> emits 'tone-ready' once Tone.js is available.
 *  - <scope-canvas> -> drawFuncs by `shapeKey`; live via `analyser` or 'seed' mode.
 *  - <osc-controls> -> 'start-request' | 'mute-toggle' | 'shape-change'{shapeKey} | 'toggle-sequencer'
 *  - <seq-app>      -> 8-step; Alt-drag velocity; events: record/advance/play/stop/time change.
 *  - <osc-app>      -> wires everything; presets by seed; buffers chains; keyboard 0..9.
 *  - <seed-synth>   -> public wrapper. API: start/stop/mute, setCurrent, recordStep,
 *                      playSequence, stopSequence, setStepTime, getState/setState.
 *
 * Public events (from <seed-synth>):
 *  - 'ready'
 *  - 'optionchange' { key, label }
 *  - 'statechange'  { state }
 *  - 'scopeframe'   { buffer: Float32Array }
 *
 * Gotchas:
 *  - Audio must be unlocked by user gesture; Tone.js loads from external URL.
 *  - Chains must expose an AnalyserNode for the scope. Dispose old chains!
 *  - Determinism: same (seed, shape) => same preset + seed buffer.
 *
 * Edit flow:
 *  - New shape? Add drawFuncs[key] in <scope-canvas>, list in osc-app.shapes,
 *    label in shapeLabels, and ensure deterministicPreset supports it.
 *  - New control? Create in <osc-controls>, emit event, handle in <osc-app>,
 *    reflect via updateState().
 */


var g=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML="",this._loaded=!1}connectedCallback(){if(this._loaded)return;this._loaded=!0,import("https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0").then(t=>{!window.Tone&&(t?.default||t?.Tone)&&(window.Tone=t.default??t.Tone),this.dispatchEvent(new CustomEvent("tone-ready",{bubbles:!0,composed:!0}))}).catch(t=>{console.error("Failed to load Tone.js:",t)})}};customElements.define("tone-loader",g);var y=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this._canvas=document.createElement("canvas"),this._canvas.width=600,this._canvas.height=600,this._ctx=this._canvas.getContext("2d"),this.shadowRoot.appendChild(this._canvas),this.analyser=null,this.preset=null,this.shapeKey="circle",this.mode="seed",this.isAudioStarted=!1,this.isPlaying=!1,this.onIndicatorUpdate=null,this._dummyData=null,this._liveBuffer=null,this._animId=null,this._animate=this._animate.bind(this),this.drawFuncs={hum:(e,t,s)=>{let i=this._canvas.width,n=i/2,o=this._ctx,c=.33*i+Math.sin(t*2e-4)*5;o.save(),o.globalAlpha=.23+.14*Math.abs(Math.sin(t*4e-4)),o.beginPath(),o.arc(n,n,c,0,2*Math.PI),o.stroke(),o.strokeStyle="hsl(195, 80%, 62%)",o.globalAlpha=.36,o.beginPath();let h=128;for(let a=0;a<h;++a){let r=a/h*2*Math.PI,d=12*Math.sin(r*3+t*45e-5)+6*Math.sin(r*6-t*32e-5),l=0;e&&e.length===h?l=e[a]*7:e&&(l=(e[a%e.length]||0)*7);let u=c+d+l,p=n+Math.cos(r)*u,f=n+Math.sin(r)*u;a?o.lineTo(p,f):o.moveTo(p,f)}o.closePath(),o.stroke(),o.restore()},circle:(e,t,s)=>{let i=this._canvas.width,n=.8*i/2,o=i/2,c=this._ctx;c.beginPath();for(let h=0;h<e.length;++h){let a=h/e.length*2*Math.PI+t*.001,r=(e[h]+1)/2,d=n*r,l=o+Math.cos(a)*d,u=o+Math.sin(a)*d;h?c.lineTo(l,u):c.moveTo(l,u)}c.closePath(),c.stroke()},square:(e,t,s)=>{let i=this._canvas.width,n=.8*i/Math.SQRT2,o=i/2,c=(i-n)/2,h=this._ctx;h.beginPath();for(let a=0;a<e.length;++a){let r=a/e.length,d=(e[a]+1)/2,l,u;r<.25?[l,u]=[c+n*(r/.25),c]:r<.5?[l,u]=[c+n,c+n*((r-.25)/.25)]:r<.75?[l,u]=[c+n-n*((r-.5)/.25),c+n]:[l,u]=[c,c+n-n*((r-.75)/.25)];let p=l-o,f=u-o,_=o+p*(.8+.2*d)+Math.sin(t*5e-4)*10,x=o+f*(.8+.2*d)+Math.cos(t*6e-4)*10;a?h.lineTo(_,x):h.moveTo(l,u)}h.closePath(),h.stroke()},butterfly:(e,t,s)=>{let i=this._canvas.width,n=.4*i,o=i/2,c=this._ctx;c.beginPath();for(let h=0;h<e.length;++h){let a=h/e.length*Math.PI*24+t*3e-4,r=(e[h]+1)/2,d=Math.exp(Math.cos(a))-2*Math.cos(4*a)+Math.pow(Math.sin(a/12),5),l=Math.sin(a)*d*n*(.5+.5*r)+o,u=Math.cos(a)*d*n*(.5+.5*r)+o;h?c.lineTo(l,u):c.moveTo(l,u)}c.closePath(),c.stroke()},lissajous:(e,t,s)=>{let i=this._canvas.width,n=.8*i/3,o=i/2,c=e.reduce((l,u)=>l+Math.abs(u),0)/e.length,h=3+Math.sin(t*3e-4)*1.5,a=2+Math.cos(t*4e-4)*1.5,r=t*5e-4,d=this._ctx;d.beginPath();for(let l=0;l<e.length;l++){let u=l/e.length*2*Math.PI,p=c*(.5+.5*e[l]),f=o+Math.sin(h*u+r)*n*p,_=o+Math.sin(a*u)*n*p;l?d.lineTo(f,_):d.moveTo(f,_)}d.stroke()},spiro:(e,t,s)=>{let i=this._canvas.width,n=.6*i/3,o=i/2,c=.3+Math.sin(t*2e-4)*.2,h=.7,a=.21+.02*Math.sin(t*1e-4),r=this._ctx;r.beginPath();for(let d=0;d<e.length;d++){let l=d/e.length*2*Math.PI,u=(e[d]+1)/2,p=o+(n*(h-c)*Math.cos(l)+n*c*Math.cos((h-c)/c*l+t*a))*(.8+.2*u),f=o+(n*(h-c)*Math.sin(l)-n*c*Math.sin((h-c)/c*l+t*a))*(.8+.2*u);d?r.lineTo(p,f):r.moveTo(p,f)}r.stroke()},harmonograph:(e,t,s)=>{let i=this._canvas.width,n=.7*i/4,o=i/2,c=Math.exp(-t*2e-4),h=(e.reduce((r,d)=>r+d,0)/e.length+1)*.5,a=this._ctx;a.beginPath();for(let r=0;r<e.length;r++){let d=r/e.length*2*Math.PI,l=o+n*(Math.sin(3*d+t*3e-4)*.7+Math.sin(5*d+t*4e-4)*.3)*(.5+.5*e[r]),u=o+n*(Math.sin(4*d+t*35e-5)*.6+Math.sin(6*d+t*25e-5)*.4)*(.5+.5*e[r]);r?a.lineTo(l,u):a.moveTo(l,u)}a.stroke()},rose:(e,t,s)=>{let i=this._canvas.width,n=.42*i,o=i/2,c=3+Math.round(Math.abs(Math.sin(t*25e-5))*4),h=this._ctx;h.beginPath();for(let a=0;a<e.length;++a){let r=a/e.length*2*Math.PI+t*35e-5,d=(e[a]+1)/2,l=n*Math.cos(c*r)*(.65+.35*d),u=o+Math.cos(r)*l,p=o+Math.sin(r)*l;a?h.lineTo(u,p):h.moveTo(u,p)}h.closePath(),h.stroke()},hypocycloid:(e,t,s)=>{let i=this._canvas.width,n=.39*i,o=i/2,c=3+Math.round(3*Math.abs(Math.cos(t*23e-5))),h=this._ctx;h.beginPath();for(let a=0;a<e.length;++a){let r=a/e.length*2*Math.PI+t*4e-4,d=1,l=1/c,u=(e[a]+1)/2,p=o+n*((d-l)*Math.cos(r)+l*Math.cos((d-l)/l*r))*(.7+.3*u),f=o+n*((d-l)*Math.sin(r)-l*Math.sin((d-l)/l*r))*(.7+.3*u);a?h.lineTo(p,f):h.moveTo(p,f)}h.closePath(),h.stroke()},epicycloid:(e,t,s)=>{let i=this._canvas.width,n=.36*i,o=i/2,c=4+Math.round(3*Math.abs(Math.sin(t*21e-5+.5))),h=this._ctx;h.beginPath();for(let a=0;a<e.length;++a){let r=a/e.length*2*Math.PI+t*38e-5,d=1,l=1/c,u=(e[a]+1)/2,p=o+n*((d+l)*Math.cos(r)-l*Math.cos((d+l)/l*r))*(.7+.3*u),f=o+n*((d+l)*Math.sin(r)-l*Math.sin((d+l)/l*r))*(.7+.3*u);a?h.lineTo(p,f):h.moveTo(p,f)}h.closePath(),h.stroke()}}}connectedCallback(){this._animId||this._animate()}disconnectedCallback(){this._animId&&(cancelAnimationFrame(this._animId),this._animId=null)}_makeSeedBuffer(e,t,s=2048){let i=a=>()=>{a|=0,a=a+1831565813|0;let r=Math.imul(a^a>>>15,1|a);return r=r+Math.imul(r^r>>>7,61|r)^r,((r^r>>>14)>>>0)/4294967296},n=t+"_"+e,o=0;for(let a=0;a<n.length;a++)o=(o<<5)-o+n.charCodeAt(a);let c=i(o),h=new Float32Array(s);for(let a=0;a<s;++a){let r=a/s,d=Math.sin(2*Math.PI*r+c()*6.28),l=.5*Math.sin(4*Math.PI*r+c()*6.28),u=.25*Math.sin(6*Math.PI*r+c()*6.28);h[a]=.6*d+.3*l+.15*u}return h}_animate(){let e=this._ctx,t=performance.now(),s;if(this.isAudioStarted&&this.isPlaying&&this.analyser)(!this._liveBuffer||this._liveBuffer.length!==this.analyser.fftSize)&&(this._liveBuffer=new Float32Array(this.analyser.fftSize)),this.analyser.getFloatTimeDomainData(this._liveBuffer),s=this._liveBuffer;else if(this.preset&&this.mode==="seed"&&this.preset._seedBuffer)s=this.preset._seedBuffer;else if(this.preset&&this.mode==="seed"){let r=this.preset?.seed||"default",d=this._makeSeedBuffer(this.shapeKey||"circle",r);this.preset._seedBuffer=d,s=d}else{if(!this._dummyData){let d=new Float32Array(2048);for(let l=0;l<2048;l++){let u=l/2048;d[l]=.5*Math.sin(2*Math.PI*u)+.3*Math.sin(4*Math.PI*u+Math.PI/3)}this._dummyData=d}s=this._dummyData}let i=this.preset||{},n=i.colorSpeed||.06,o=t*n%360,c=85,h=60;if(e.clearRect(0,0,this._canvas.width,this._canvas.height),e.strokeStyle=`hsl(${o},${c}%,${h}%)`,e.lineWidth=2,e.lineJoin=e.lineCap="round",(this.drawFuncs[this.shapeKey]||this.drawFuncs.circle)(s,t,i),typeof this.onIndicatorUpdate=="function"){let r,d;this.isAudioStarted?(r=this.isPlaying?"Audio Live":"Muted",d=this.isPlaying):(r="Silent Mode",d=!1),this.onIndicatorUpdate(r,d)}this._animId=requestAnimationFrame(this._animate)}};customElements.define("scope-canvas",y);var S=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"});let e=document.createElement("div");e.id="controls",this._startBtn=document.createElement("button"),this._startBtn.id="startBtn",this._startBtn.textContent="POWER ON",this._muteBtn=document.createElement("button"),this._muteBtn.id="muteBtn",this._muteBtn.textContent="Mute",this._shapeSelect=document.createElement("select"),this._shapeSelect.id="shapeSelect",this._seqBtn=document.createElement("button"),this._seqBtn.id="seqBtn",this._seqBtn.textContent="Create Sequence",e.append(this._startBtn,this._muteBtn,this._shapeSelect,this._seqBtn);let t=document.createElement("style");t.textContent=`
      :host {
        display: block;
      }
      #controls {
        display: flex;
        gap: 1.1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.7rem 1.2rem;
        background: rgba(255, 255, 255, 0.07);
        border-radius: 9px;
        width: 95%;
        max-width: 880px;
        margin: 1.1rem auto 0 auto;
        box-sizing: border-box;
      }
      button, select {
        padding: 0.53em 1.17em;
        border-radius: 6px;
        border: 1px solid #555;
        background: #242;
        color: #fff;
        font-size: 1rem;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: background 0.19s, color 0.19s, box-shadow 0.19s;
        box-shadow: 0 0 0px #0000;
      }
      button:focus {
        outline: 2px solid #7af6ff;
        outline-offset: 1px;
      }
      button:hover {
        background: #454;
      }
      #startBtn.power-off {
        background: #451015;
        color: #e97c90;
        border-color: #89232a;
        box-shadow: 0 0 4px #ff505011, 0 0 0px #0000;
        text-shadow: none;
        filter: brightness(0.95);
      }
      #startBtn.power-on {
        background: #ff2a39;
        color: #fff;
        border-color: #ff4e6a;
        box-shadow: 0 0 18px 5px #ff2a3999, 0 0 4px #ff748499;
        text-shadow: 0 1px 3px #8d2025cc, 0 0 10px #fff7;
        filter: brightness(1.10) saturate(1.2);
      }
      #muteBtn.muted {
        background: #a51427;
        color: #fff;
        border-color: #ff506e;
        box-shadow: 0 0 12px #ff506e66;
        text-shadow: 0 1px 2px #320a0b;
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `,this.shadowRoot.append(t,e),this._startBtn.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("start-request",{bubbles:!0,composed:!0}))}),this._muteBtn.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("mute-toggle",{bubbles:!0,composed:!0}))}),this._shapeSelect.addEventListener("change",()=>{let s=this._shapeSelect.value;this.dispatchEvent(new CustomEvent("shape-change",{detail:{shapeKey:s},bubbles:!0,composed:!0}))}),this._seqBtn.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("toggle-sequencer",{bubbles:!0,composed:!0}))})}setShapes(e){this._shapeSelect.innerHTML="",e.forEach(({value:t,label:s})=>{let i=document.createElement("option");i.value=t,i.textContent=s,this._shapeSelect.appendChild(i)})}disableAll(e){[this._startBtn,this._muteBtn,this._shapeSelect,this._seqBtn].forEach(t=>{t.disabled=e})}updateState({isAudioStarted:e,isPlaying:t,isMuted:s,shapeKey:i,sequencerVisible:n}){this._startBtn.disabled=!e,this._muteBtn.disabled=!e,this._startBtn.textContent=t?"POWER OFF":"POWER ON",this._muteBtn.textContent=s?"Unmute":"Mute",this._startBtn.classList.toggle("power-on",!!t),this._startBtn.classList.toggle("power-off",!t),this._muteBtn.classList.toggle("muted",!!s),i&&(this._shapeSelect.value=i),this._seqBtn.textContent=n?"Hide Sequencer":"Create Sequence"}};customElements.define("osc-controls",S);var b=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.state={isRecording:!1,currentRecordSlot:-1,sequence:Array(8).fill(null),velocities:Array(8).fill(1),sequencePlaying:!1,sequenceStepIndex:0,stepTime:200},["updateState","updateSequenceUI","recordStep","playSequence","stopSequence","handleStepClick","handleStepRightClick","handlePlayClick","handleStepTimeChange"].forEach(e=>this[e]=this[e].bind(this))}connectedCallback(){this.render(),this.updateSequenceUI(),this._playBtn&&this._playBtn.addEventListener("click",()=>this.handlePlayClick()),this._stepTimeInput&&this._stepTimeInput.addEventListener("change",()=>this.handleStepTimeChange()),this._keyHandler=e=>{if(!this.state.isRecording||!/^[0-9]$/.test(e.key))return;let t=parseInt(e.key,10),s=this.state.currentRecordSlot;this.state.sequence[s]=t,this.state.currentRecordSlot=(s+1)%this.state.sequence.length,this.state.currentRecordSlot===0&&(this.state.isRecording=!1),this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-step-recorded",{detail:{slotIndex:s,value:t,nextSlot:this.state.currentRecordSlot,isRecording:this.state.isRecording},bubbles:!0,composed:!0}))},window.addEventListener("keydown",this._keyHandler)}render(){this.shadowRoot.innerHTML=`
        <style>
          :host { display:block; text-align:center; width:95%; margin:.8em auto 0 auto; }
          #stepSlots { display:flex; justify-content:center; gap:.55em; margin:.6em 0 .7em 0; }
          .step-slot { 
            width:37px; height:37px; border:1px solid #555; border-radius:6px; 
            background:#232325; display:grid; place-items:center; cursor:pointer; 
            font-weight:bold; font-size:1.12rem; user-select:none; 
            transition:background .15s,box-shadow .16s; 
          }
          .step-slot.record-mode { background:#343; box-shadow:0 0 7px #f7c46988; }
          .step-slot.record-mode.active { background:#575; box-shadow:0 0 12px #f7c469d6; }
          #sequenceControls { 
            display:flex; flex-direction:row; align-items:center; justify-content:center; 
            gap:1.1rem; margin:1.1em 0 0 0; width:100%;
          }
          #playBtn { 
            min-width:150px; font-size:1.09rem; padding:0.44em 1.4em; border-radius:7px; 
            margin:0; background:#181818; color:#fff; border:2px solid #7af6ff; 
            transition:background .19s,color .19s; box-shadow:0 2px 10px #7af6ff22;
          }
          #playBtn:hover { background:#212d3d; color:#fff; border-color:#fff; }
        </style>
        
        <div id="sequencer">
          <div id="stepSlots"></div>
          <div id="sequenceControls">
            <button id="playBtn">Play Sequence</button>
            <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
            <input type="number" id="stepTimeInput" min="50" max="2000" value="400" style="width:60px;margin-left:0.7em;" />
          </div>
        </div>
      `,this._stepSlotsDiv=this.shadowRoot.getElementById("stepSlots"),this._playBtn=this.shadowRoot.getElementById("playBtn"),this._stepTimeInput=this.shadowRoot.getElementById("stepTimeInput"),this.createSequenceUI()}createSequenceUI(){this._stepSlotsDiv.innerHTML="",this._dragState={painting:!1,mode:null,setTo:null,baseVel:1,startY:0,lastIndex:-1};let e=()=>{this._dragState.painting=!1,this._dragState.mode=null,this._dragState.lastIndex=-1};window.addEventListener("pointerup",e);for(let t=0;t<8;t++){let s=document.createElement("div");s.classList.add("step-slot"),s.dataset.index=t,s.style.position="relative";let i=document.createElement("div");i.className="vel-bar",Object.assign(i.style,{position:"absolute",bottom:"0px",left:"0px",width:"100%",height:"0%",background:"#7af6ff55",borderBottomLeftRadius:"6px",borderBottomRightRadius:"6px",pointerEvents:"none",transition:"height .05s linear"}),s.appendChild(i),s.addEventListener("click",()=>this.handleStepClick(t)),s.addEventListener("contextmenu",n=>this.handleStepRightClick(n,t)),s.addEventListener("pointerdown",n=>{let o=t;if(n.altKey)this._dragState.painting=!0,this._dragState.mode="velocity",this._dragState.baseVel=this.state.velocities[o]??1,this._dragState.startY=n.clientY,this._dragState.lastIndex=o,s.setPointerCapture(n.pointerId);else{let h=this.state.sequence[o]==null?1:null;this._dragState.painting=!0,this._dragState.mode="paint",this._dragState.setTo=h,this._dragState.lastIndex=-1,h===null?(this.state.sequence[o]=null,this.dispatchEvent(new CustomEvent("seq-step-cleared",{detail:{slotIndex:o},bubbles:!0,composed:!0}))):(this.state.sequence[o]=1,this.dispatchEvent(new CustomEvent("seq-step-recorded",{detail:{slotIndex:o,value:1,nextSlot:(o+1)%8,isRecording:!1},bubbles:!0,composed:!0}))),this.updateSequenceUI(),s.setPointerCapture(n.pointerId)}}),s.addEventListener("pointerenter",n=>{if(!this._dragState.painting)return;let o=t;if(this._dragState.mode==="paint"){if(this._dragState.lastIndex===o)return;this._dragState.lastIndex=o,this._dragState.setTo===null?(this.state.sequence[o]=null,this.dispatchEvent(new CustomEvent("seq-step-cleared",{detail:{slotIndex:o},bubbles:!0,composed:!0}))):(this.state.sequence[o]=1,this.dispatchEvent(new CustomEvent("seq-step-recorded",{detail:{slotIndex:o,value:1,nextSlot:(o+1)%8,isRecording:!1},bubbles:!0,composed:!0}))),this.updateSequenceUI()}}),s.addEventListener("pointermove",n=>{if(!this._dragState.painting||this._dragState.mode!=="velocity")return;let o=t,c=this._dragState.startY-n.clientY,h=n.shiftKey?.25:1,a=this._dragState.baseVel+c/150*h;a=Math.max(0,Math.min(1,a)),this.state.velocities[o]=a,s.title=`Velocity: ${Math.round(a*100)}% (Alt-drag${n.shiftKey?" + Shift":""})`;let r=s.querySelector(".vel-bar");r&&(r.style.height=Math.round(a*100)+"%")}),this._stepSlotsDiv.appendChild(s)}this._playBtn.addEventListener("click",this.handlePlayClick),this._stepTimeInput.addEventListener("change",this.handleStepTimeChange)}updateState(e){Object.assign(this.state,e),this.updateSequenceUI()}updateSequenceUI(){this._stepSlotsDiv&&(this._stepSlotsDiv.querySelectorAll(".step-slot").forEach(e=>{let t=parseInt(e.dataset.index),s=this.state.sequence[t];e.textContent=s===0?"0":s!=null?String(s):"",e.classList.toggle("record-mode",this.state.isRecording&&this.state.currentRecordSlot===t),e.classList.toggle("active",this.state.sequencePlaying&&this.state.sequenceStepIndex===t);let i=this.state.velocities&&this.state.velocities[t]!=null?this.state.velocities[t]:1,n=e.querySelector(".vel-bar");n&&(n.style.height=Math.round(i*100)+"%"),(!e.title||!e.title.startsWith("Velocity:"))&&(e.title=`Velocity: ${Math.round(i*100)}% (Alt-drag to edit)`)}),this._playBtn&&(this._playBtn.textContent=this.state.sequencePlaying?"Stop Sequence":"Play Sequence"),this._stepTimeInput&&!this.state.sequencePlaying&&(this._stepTimeInput.value=this.state.stepTime))}handleStepClick(e){this.state.isRecording=!0,this.state.currentRecordSlot=e,this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-record-start",{detail:{slotIndex:e},bubbles:!0,composed:!0}))}handleStepRightClick(e,t){e.preventDefault(),this.state.sequence[t]=null,this.state.isRecording&&this.state.currentRecordSlot===t&&(this.state.currentRecordSlot=(t+1)%8,this.state.currentRecordSlot===0&&(this.state.isRecording=!1)),this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-step-cleared",{detail:{slotIndex:t},bubbles:!0,composed:!0}))}handlePlayClick(){this.state.sequencePlaying?this.stopSequence():this.playSequence()}handleStepTimeChange(){if(!this._stepTimeInput)return;let e=parseInt(this._stepTimeInput.value,10);Number.isFinite(e)&&e>=50&&e<=2e3&&(this.state.stepTime=e,this.dispatchEvent(new CustomEvent("seq-step-time-changed",{detail:{stepTime:e},bubbles:!0,composed:!0})))}recordStep(e){let t=this.state.currentRecordSlot;!this.state.isRecording||t<0||t>=this.state.sequence.length||(this.state.sequence[t]=e,this.state.currentRecordSlot=(t+1)%this.state.sequence.length,this.state.currentRecordSlot===0&&(this.state.isRecording=!1),this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-step-recorded",{detail:{slotIndex:t,value:e,nextSlot:this.state.currentRecordSlot,isRecording:this.state.isRecording},bubbles:!0,composed:!0})))}playSequence(){if(this.state.sequencePlaying)return;this.state.sequencePlaying=!0,this.state.sequenceStepIndex=0,this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-play-started",{detail:{stepTime:this.state.stepTime},bubbles:!0,composed:!0}));let e=()=>{if(!this.state.sequencePlaying)return;let t=this.state.sequenceStepIndex,s=this.state.sequence[t],i=this.state.velocities&&this.state.velocities[t]!=null?this.state.velocities[t]:1;this.dispatchEvent(new CustomEvent("seq-step-advance",{detail:{index:t,value:s,velocity:i},bubbles:!0,composed:!0})),this.state.sequenceStepIndex=(t+1)%this.state.sequence.length,this.updateSequenceUI(),this._seqTimer=setTimeout(e,this.state.stepTime)};e()}stopSequence(){this.state.sequencePlaying=!1,this._seqTimer&&(clearTimeout(this._seqTimer),this._seqTimer=null),this.updateSequenceUI(),this.dispatchEvent(new CustomEvent("seq-play-stopped",{bubbles:!0,composed:!0}))}};customElements.define("seq-app",b);var q=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.state=this.defaultState("5s567g67"),["_onToneReady","_onStartRequest","_onMuteToggle","_onShapeChange","_onToggleSequencer","_handleSeedSubmit","_handleKeyDown","_handleKeyUp","_handleBlur","_onSeqRecordStart","_onSeqStepCleared","_onSeqStepRecorded","_onSeqPlayStarted","_onSeqPlayStopped","_onSeqStepAdvance","_onSeqStepTimeChanged"].forEach(e=>this[e]=this[e].bind(this)),this.shapes=["circle","square","butterfly","lissajous","spiro","harmonograph","rose","hypocycloid","epicycloid"],this.shapeLabels=Object.fromEntries(this.shapes.map(e=>[e,e.charAt(0).toUpperCase()+e.slice(1)])),this.humKey="hum",this.humLabel="Power Hum"}defaultState(e="default"){return{isPlaying:!1,isSequencerMode:!1,isRecording:!1,currentRecordSlot:-1,sequence:Array(8).fill(null),sequencePlaying:!1,sequenceIntervalId:null,sequenceStepIndex:0,stepTime:200,Tone:null,chains:{},current:null,seed:e,presets:{},contextUnlocked:!1,initialBufferingStarted:!1,initialShapeBuffered:!1}}connectedCallback(){let e=(h,a)=>Object.assign(document.createElement(h),a),t=e("div",{id:"appWrapper"}),s=e("aside",{id:"instructions"});s.innerHTML=`
      <div>
        <h2>How to Use</h2>
        <ol>
          <li><b>Numbers 1-9:</b><br> Instantly switch between unique sound+visual shapes.</li>
          <li><b>Step Sequencer:</b>
            <ul style="margin:0 0 0 1em; padding:0; font-size:.98em;">
              <li>Click <b>Create Sequence</b> to open.</li>
              <li>Click a box to record steps (use 1-9 keys).</li>
              <li>Right-click a box to clear.</li>
              <li>Set <b>Step Time</b> for sequence speed.</li>
              <li>Press <b>Play Sequence</b> to loop.</li>
            </ul>
          </li>
          <li><b>Mix Sounds:</b> Change shapes while audio is on to layer and blend rich effects.</li>
          <li><b>Toggle Audio:</b> Click the image or use <b>Start Audio</b> button to start/stop.</li>
        </ol>
      </div>
      <form id="seedForm" autocomplete="off" style="margin-top:auto;background:#1c1c1c;padding:1.1em 1em 0.9em 0.9em;border-radius:8px;border:1px solid #292929;">
        <label for="seedInput" style="font-size:0.97em;color:#ffecb3;margin-bottom:0.1em;font-weight:600;">Seed (deterministic):</label>
        <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"
          style="font-family:inherit;padding:0.35em 0.5em;border-radius:4px;border:1px solid #444;background:#232325;color:#ffecb3;font-size:1em;width:100%;margin-bottom:0.2em;letter-spacing:.05em;" />
        <button id="seedSetBtn" type="submit" style="padding:0.3em 1em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:0.97em;transition:background .18s;">Set Seed</button>
      </form>
    `;let i=e("div",{id:"main"}),n=e("div",{id:"canvasContainer"});this._canvasContainer=n,this._canvas=e("scope-canvas"),n.appendChild(this._canvas),this._controls=e("osc-controls"),this._sequencerComponent=e("seq-app"),this._sequencerComponent.style.display="none";let o=this.shadowRoot.getElementById("main");o&&(o.style.overflow="hidden"),this._loader=e("div",{id:"loader",textContent:"..."}),i.append(n,this._controls,this._sequencerComponent,this._loader),t.append(s,i),this.shadowRoot.append(e("style",{textContent:this._style()}),e("tone-loader"),t),this.shadowRoot.getElementById("seedInput").value=this.state.seed,this.shadowRoot.querySelector("tone-loader").addEventListener("tone-ready",this._onToneReady),this._controls.addEventListener("start-request",this._onStartRequest),this._controls.addEventListener("mute-toggle",this._onMuteToggle),this._controls.addEventListener("shape-change",this._onShapeChange),this._controls.addEventListener("toggle-sequencer",this._onToggleSequencer),this._canvas.onIndicatorUpdate=(h,a)=>{this._loader.textContent=!this.state.isPlaying&&!this.state.contextUnlocked?"...":h},this.shadowRoot.getElementById("seedForm").addEventListener("submit",this._handleSeedSubmit),window.addEventListener("keydown",this._handleKeyDown),window.addEventListener("keyup",this._handleKeyUp),window.addEventListener("blur",this._handleBlur),this._sequencerComponent.addEventListener("seq-record-start",this._onSeqRecordStart),this._sequencerComponent.addEventListener("seq-step-cleared",this._onSeqStepCleared),this._sequencerComponent.addEventListener("seq-step-recorded",this._onSeqStepRecorded),this._sequencerComponent.addEventListener("seq-play-started",this._onSeqPlayStarted),this._sequencerComponent.addEventListener("seq-play-stopped",this._onSeqPlayStopped),this._sequencerComponent.addEventListener("seq-step-advance",this._onSeqStepAdvance),this._sequencerComponent.addEventListener("seq-step-time-changed",this._onSeqStepTimeChanged);let c=[{value:this.humKey,label:this.humLabel}].concat(this.shapes.map(h=>({value:h,label:this.shapeLabels[h]})));this._controls.setShapes(c)}disconnectedCallback(){window.removeEventListener("keydown",this._handleKeyDown),window.removeEventListener("keyup",this._handleKeyUp),window.removeEventListener("blur",this._handleBlur),this._sequencerComponent.removeEventListener("seq-record-start",this._onSeqRecordStart),this._sequencerComponent.removeEventListener("seq-step-cleared",this._onSeqStepCleared),this._sequencerComponent.removeEventListener("seq-step-recorded",this._onSeqStepRecorded),this._sequencerComponent.removeEventListener("seq-play-started",this._onSeqPlayStarted),this._sequencerComponent.removeEventListener("seq-play-stopped",this._onSeqPlayStopped),this._sequencerComponent.removeEventListener("seq-step-advance",this._onSeqStepAdvance),this._sequencerComponent.removeEventListener("seq-step-time-changed",this._onSeqStepTimeChanged)}_style(){return`
    :host { display:block;width:100%;height:100%; }
    #appWrapper { display:grid;grid-template-columns:minmax(220px,340px) 1fr;grid-template-rows:100vh;gap:0;height:100%; }
    @media (max-width:900px){ #appWrapper{grid-template-columns:1fr;}}
    aside#instructions { background:linear-gradient(90deg,#181818 97%,#0000);color:#e1d9ce;font-size:1.07rem;min-width:210px;max-width:340px;height:100vh;border-right:2px solid #2229;line-height:1.65;box-sizing:border-box;display:flex;flex-direction:column;gap:1.4rem;padding:2.2rem 1.2rem 2.4rem 2.2rem;overflow-y:auto;}
    aside#instructions h2 { color:#f7c469;font-size:1.22rem;margin:0 0 0.95em 0;font-weight:bold;letter-spacing:.04em;}
    #main { width:100%;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:#000;}
    #canvasContainer { flex:1 1 0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;}
    #loader { font-size:.98rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin-top:.1em;}
  `}_eachChain(e){for(let t in this.state.chains)e(this.state.chains[t],t)}_disposeChain(e){Object.values(e).forEach(t=>{try{t.stop?.()}catch{}try{t.dispose?.()}catch{}})}_rng(e){let t=1831565813^e.length;for(let s=0;s<e.length;++s)t=Math.imul(t^e.charCodeAt(s),2654435761);return()=>(t=Math.imul(t^t>>>15,1|t),(t>>>16&65535)/65536)}deterministicPreset(e,t){let s=this._rng(`${e}_${t}`),i=["sine","triangle","square","sawtooth"],n=["C1","C2","E2","G2","A2","C3","E3","G3","B3","D4","F#4","A4","C5"],o=s(),c=o<.18?0:o<.56?1:o<.85?2:3,h=c===3?2+(s()>.7?1:0):1+(s()>.6?1:0),a=Array.from({length:h},()=>[i[s()*i.length|0],n[s()*n.length|0]]),r,d,l,u,p;return c===0?(r=.07+s()*.3,d=400+s()*400,l=900+s()*600,u=700+s()*500,p={attack:.005+s()*.03,decay:.04+s()*.08,sustain:.1+s()*.2,release:.03+s()*.1}):c===1?(r=.25+s()*8,d=120+s()*700,l=1200+s()*1400,u=300+s()*2400,p={attack:.03+s()*.4,decay:.1+s()*.7,sustain:.2+s()*.5,release:.2+s()*3}):c===2?(r=6+s()*20,d=80+s()*250,l=1500+s()*3500,u=300+s()*2400,p={attack:.03+s()*.4,decay:.1+s()*.7,sustain:.2+s()*.5,release:.2+s()*3}):(r=24+s()*36,d=80+s()*250,l=1500+s()*3500,u=300+s()*2400,p={attack:2+s()*8,decay:4+s()*20,sustain:.7+s()*.2,release:8+s()*24}),{osc1:a[0],osc2:a[1]||null,filter:u,filterQ:.6+s()*.7,lfo:[r,d,l],envelope:p,reverb:{wet:c===3?.4+s()*.5:.1+s()*.5,roomSize:c===3?.85+s()*.12:.6+s()*.38},colorSpeed:.06+s()*.22,shapeDrift:6e-4+s()*.0032,seed:e}}loadPresets(e){this.state.presets=Object.fromEntries(this.shapes.map(t=>[t,this.deterministicPreset(e,t)]))}async bufferHumChain(){let{Tone:e,chains:t}=this.state;if(e){t[this.humKey]&&(this._disposeChain(t[this.humKey]),delete t[this.humKey]);try{let s=new e.Oscillator("A0","sine").start(),i=new e.Filter(80,"lowpass");i.Q.value=.5;let n=new e.Volume(-25),o=new e.Freeverb().set({wet:.3,roomSize:.9}),c=e.context.createAnalyser();c.fftSize=2048,s.connect(n),n.connect(i),i.connect(o),i.connect(c),t[this.humKey]={osc:s,volume:n,filter:i,reverb:o,analyser:c}}catch(s){console.error("Error buffering hum chain",s),delete t[this.humKey]}}}async bufferShapeChain(e){if(e===this.humKey)return this.bufferHumChain();let{Tone:t,presets:s,chains:i}=this.state,n=s[e];if(!(!n||!t)){i[e]&&(this._disposeChain(i[e]),delete i[e]);try{let o=new t.Oscillator(n.osc1[1],n.osc1[0]).start(),c=n.osc2?new t.Oscillator(n.osc2[1],n.osc2[0]).start():null,h=new t.Volume(5),a=new t.Filter(n.filter,"lowpass");a.Q.value=n.filterQ;let r=new t.LFO(...n.lfo).start(),d=new t.Freeverb().set({wet:n.reverb.wet,roomSize:n.reverb.roomSize}),l=t.context.createAnalyser();l.fftSize=2048,r.connect(a.frequency),c&&r.connect(c.detune),o.connect(h),c&&c.connect(h),h.connect(a),a.connect(d),a.connect(l),i[e]={osc1:o,osc2:c,volume:h,filter:a,lfo:r,reverb:d,analyser:l}}catch(o){console.error("Error buffering chain for shape",e,o),delete i[e]}}}setActiveChain(e){this._eachChain(s=>s.reverb?.disconnect());let t=this.state.chains[e];t?.reverb?.toDestination(),this.state.current=e,t?.analyser?Object.assign(this._canvas,{analyser:t.analyser,isAudioStarted:!0,isPlaying:this.state.isPlaying}):Object.assign(this._canvas,{isAudioStarted:!0,isPlaying:this.state.isPlaying}),e===this.humKey&&Object.assign(this._canvas,{shapeKey:this.humKey,preset:null})}disposeAllChains(){this._eachChain(e=>this._disposeChain(e)),this.state.chains={},this.state.current=null}resetState(){this.disposeAllChains(),this.state.sequencePlaying&&this.stopSequence();let{seed:e,Tone:t}=this.state;this.state=this.defaultState(e),this.state.Tone=t,this.loadPresets(e),this.bufferHumChain();let s=this._rng(e),i=this.shapes[s()*this.shapes.length|0];Object.assign(this._canvas,{preset:this.state.presets[i],shapeKey:i,mode:"seed",isAudioStarted:!1,isPlaying:!1}),this.state.current=this.humKey,this._controls.updateState({isAudioStarted:!0,isPlaying:!1,isMuted:!1,shapeKey:this.humKey,sequencerVisible:!1}),this.state.isSequencerMode=!1,this._sequencerComponent.style.display="none";let n=this.shadowRoot.getElementById("main");n&&(n.style.overflow="hidden"),this.state.sequence=Array(8).fill(null),this.updateSequencerState()}async unlockAudioAndBufferInitial(){let e=this.state;if(e.initialBufferingStarted&&!e.initialShapeBuffered){this._loader.textContent="Still preparing initial synth, please wait...";return}if(e.isPlaying)return this.stopAudioAndDraw();if(e.contextUnlocked)if(e.initialShapeBuffered){this.setActiveChain(this.humKey),e.isPlaying=!0,this._controls.updateState({isAudioStarted:!0,isPlaying:!0,isMuted:e.Tone.Destination.mute,shapeKey:this.humKey,sequencerVisible:e.isSequencerMode}),this._loader.textContent="Audio resumed (hum).",this._canvas.isPlaying=!0;return}else{this._loader.textContent="Audio context unlocked, but synth not ready. Click again.";return}this._loader.textContent="Unlocking AudioContext...";try{let t=e.Tone;if(!t)throw new Error("Tone.js not available");let s=t.getContext?.()||t.context,i=!1;if(s?.resume?(await s.resume(),i=!0):t.start&&(await t.start(),i=!0),!i)throw new Error("Could not resume AudioContext");e.contextUnlocked=!0,e.initialBufferingStarted=!0,this._loader.textContent=`Preparing ${this.humLabel} synth...`,await this.bufferHumChain(),this.setActiveChain(this.humKey),e.initialShapeBuffered=!0,e.isPlaying=!0,this._canvas.isPlaying=!0,this._controls.updateState({isAudioStarted:!0,isPlaying:!0,isMuted:e.Tone.Destination.mute,shapeKey:this.humKey,sequencerVisible:e.isSequencerMode}),this._loader.textContent="Ready. Audio: "+this.humLabel,(async()=>{for(let n of this.shapes)if(e.contextUnlocked){try{await this.bufferShapeChain(n)}catch(o){console.error("Error buffering",n,o)}await new Promise(o=>setTimeout(o,0))}})()}catch(t){console.error("Failed to unlock AudioContext:",t),this._loader.textContent="Failed to unlock AudioContext.",e.contextUnlocked=!1,e.initialBufferingStarted=!1,e.initialShapeBuffered=!1}}stopAudioAndDraw(){let e=this.state;!e.isPlaying&&!e.initialBufferingStarted||(e.isPlaying=!1,e.initialBufferingStarted=!1,e.initialShapeBuffered=!1,this.disposeAllChains(),e.sequencePlaying&&this.stopSequence(),this._canvas.isPlaying=!1,this._canvas.isAudioStarted=!1,this.resetState())}_onToneReady(){this.state.Tone=window.Tone,this.loadPresets(this.state.seed),this.bufferHumChain();let e=this.shapes[this._rng(this.state.seed)()*this.shapes.length|0];Object.assign(this._canvas,{preset:this.state.presets[e],shapeKey:e,mode:"seed"}),this.state.current=this.humKey,this._controls.disableAll(!1),this._controls.updateState({isAudioStarted:!0,isPlaying:!1,isMuted:!1,shapeKey:this.humKey,sequencerVisible:!1}),this._loader.textContent="Tone.js loaded. Click \u2018POWER ON\u2019 or the image to begin."}_onStartRequest(){this.unlockAudioAndBufferInitial()}_onMuteToggle(){let e=this.state;if(!e.Tone||!e.contextUnlocked)return;let t=e.Tone.Destination.mute=!e.Tone.Destination.mute;this._controls.updateState({isAudioStarted:!0,isPlaying:e.isPlaying,isMuted:t,shapeKey:e.current,sequencerVisible:e.isSequencerMode}),this._loader.textContent=t?"Audio muted.":"Audio unmuted.",this._canvas.isPlaying=e.isPlaying&&!t}_onShapeChange(e){let t=e.detail.shapeKey;if(!t)return;let s=this.state;s.current=t,t===this.humKey?Object.assign(this._canvas,{shapeKey:this.humKey,preset:null}):this.shapes.includes(t)&&Object.assign(this._canvas,{shapeKey:t,preset:s.presets[t]}),s.contextUnlocked&&s.initialShapeBuffered&&this.setActiveChain(t),this._canvas.mode=s.contextUnlocked&&s.initialShapeBuffered&&s.isPlaying?"live":"seed",this._controls.updateState({isAudioStarted:s.contextUnlocked,isPlaying:s.isPlaying,isMuted:s.Tone?.Destination?.mute,shapeKey:t,sequencerVisible:s.isSequencerMode})}_onToggleSequencer(){let e=this.state;e.isSequencerMode=!e.isSequencerMode,this._sequencerComponent.style.display=e.isSequencerMode?"block":"none";let t=this.shadowRoot.getElementById("main");e.isSequencerMode?(t&&(t.style.overflow="auto"),this._canvasContainer&&(this._canvasContainer.style.maxHeight="60vh",this._canvasContainer.style.flex="0 0 auto"),this._canvas&&(this._canvas.style.maxHeight="60vh")):(t&&(t.style.overflow="hidden"),this._canvasContainer&&(this._canvasContainer.style.maxHeight="",this._canvasContainer.style.flex=""),this._canvas&&(this._canvas.style.maxHeight="")),this._controls.updateState({isAudioStarted:e.contextUnlocked,isPlaying:e.isPlaying,isMuted:e.Tone?.Destination?.mute,shapeKey:e.current,sequencerVisible:e.isSequencerMode}),e.isSequencerMode?this.updateSequencerState():(e.isRecording=!1,e.currentRecordSlot=-1,e.sequencePlaying&&this.stopSequence())}_handleSeedSubmit(e){e.preventDefault();let t=this.shadowRoot.getElementById("seedInput").value.trim()||"default";t!==this.state.seed&&this.resetToSeed(t)}resetToSeed(e){this.stopAudioAndDraw(),this.state.seed=e,this.loadPresets(e),this.resetState(),this._loader.textContent="Seed updated. Click POWER ON."}_handleKeyDown(e){if(/INPUT|TEXTAREA/.test(e.target.tagName))return;let t=null,s=-1;if(e.key==="0"?t=this.humKey:(s=e.key.charCodeAt(0)-49,s>=0&&s<this.shapes.length&&(t=this.shapes[s])),t){let i=this.state;if(i.isSequencerMode&&i.isRecording){let n=s>=0?s+1:0;this.recordStep(n),i.contextUnlocked&&i.initialShapeBuffered&&(this.setActiveChain(t),s>=0&&Object.assign(this._canvas,{shapeKey:t,preset:i.presets[t],mode:"live"}),this._canvas.isPlaying=!0,this._controls.updateState({isAudioStarted:i.contextUnlocked,isPlaying:i.isPlaying,isMuted:i.Tone?.Destination?.mute,shapeKey:t,sequencerVisible:i.isSequencerMode})),e.preventDefault();return}this._controls&&(this._controls.updateState({isAudioStarted:this.state.contextUnlocked,isPlaying:this.state.isPlaying,isMuted:this.state.Tone?.Destination?.mute,shapeKey:t,sequencerVisible:this.state.isSequencerMode}),this._onShapeChange({detail:{shapeKey:t}})),e.preventDefault()}}_handleKeyUp(e){}_handleBlur(){}_onSeqRecordStart(e){let{slotIndex:t}=e.detail;this.state.isRecording=!0,this.state.currentRecordSlot=t,this._controls.updateState({isAudioStarted:this.state.contextUnlocked,isPlaying:this.state.isPlaying,isMuted:this.state.Tone?.Destination?.mute,shapeKey:this.state.current,sequencerVisible:this.state.isSequencerMode})}_onSeqStepCleared(e){let{slotIndex:t}=e.detail;this.state.sequence[t]=null,this.state.isRecording&&this.state.currentRecordSlot===t&&(this.state.currentRecordSlot=(t+1)%8,this.state.currentRecordSlot===0&&(this.state.isRecording=!1))}_onSeqStepRecorded(e){let{slotIndex:t,value:s,nextSlot:i,isRecording:n}=e.detail;this.state.sequence[t]=s,this.state.currentRecordSlot=i,this.state.isRecording=n}_onSeqPlayStarted(e){let{stepTime:t}=e.detail||{};this.state.sequencePlaying=!0,this.state.sequenceStepIndex=0,t!==void 0&&(this.state.stepTime=t),this._controls.updateState({isAudioStarted:this.state.contextUnlocked,isPlaying:this.state.isPlaying,isMuted:this.state.Tone?.Destination?.mute,shapeKey:this.state.current,sequencerVisible:this.state.isSequencerMode})}_onSeqPlayStopped(){this.state.sequencePlaying=!1,this.state.sequenceStepIndex=0,this._controls.updateState({isAudioStarted:this.state.contextUnlocked,isPlaying:this.state.isPlaying,isMuted:this.state.Tone?.Destination?.mute,shapeKey:this.state.current,sequencerVisible:this.state.isSequencerMode})}_onSeqStepAdvance(e){let{stepIndex:t,value:s,isLastStep:i}=e.detail;this.state.sequenceStepIndex=t;let n;if(s===0)n=this.humKey;else if(s>=1&&s<=this.shapes.length)n=this.shapes[s-1];else return;this._controls.updateState({isAudioStarted:this.state.contextUnlocked,isPlaying:this.state.isPlaying,isMuted:this.state.Tone?.Destination?.mute,shapeKey:n,sequencerVisible:this.state.isSequencerMode}),this._onShapeChange({detail:{shapeKey:n}})}_onSeqStepTimeChanged(e){let{stepTime:t}=e.detail;this.state.stepTime=t}updateSequencerState(){this._sequencerComponent&&this._sequencerComponent.updateState({isRecording:this.state.isRecording,currentRecordSlot:this.state.currentRecordSlot,sequence:[...this.state.sequence],sequencePlaying:this.state.sequencePlaying,sequenceStepIndex:this.state.sequenceStepIndex,stepTime:this.state.stepTime})}recordStep(e){this._sequencerComponent&&this._sequencerComponent.recordStep(e)}playSequence(){this._sequencerComponent&&this._sequencerComponent.playSequence()}stopSequence(){this._sequencerComponent&&this._sequencerComponent.stopSequence()}};customElements.define("osc-app",q);var v=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this._options=null,this._oscApp=null,this._initialized=!1,this._defaultOptions={seed:"5s567g67",showSequencer:!1,toneModuleUrl:"https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0",audioContext:null},this._onReady=this._onReady.bind(this),this._onOptionChange=this._onOptionChange.bind(this),this._onStateChange=this._onStateChange.bind(this)}connectedCallback(){if(this._initialized)return;this._initialized=!0;let e={...this._defaultOptions,seed:this.getAttribute("seed")||this._defaultOptions.seed,showSequencer:this.hasAttribute("show-sequencer")};this.setOptions(e),this._render()}disconnectedCallback(){this._oscApp&&this._oscApp.dispose?.()}static get observedAttributes(){return["seed","show-sequencer"]}attributeChangedCallback(e,t,s){if(this._initialized)switch(e){case"seed":s!==t&&(this.seed=s);break;case"show-sequencer":this._updateSequencerVisibility();break}}setOptions(e){this._options={...this._defaultOptions,...e},this._oscApp&&this._applyOptionsToOscApp()}get seed(){return this._options?.seed||this._defaultOptions.seed}set seed(e){if(this._options&&(this._options.seed=e),this.setAttribute("seed",e),this._oscApp){this._oscApp.state.seed=e,this._oscApp.state.presets={};let t=this._oscApp.shadowRoot?.getElementById("seedInput");t&&(t.value=e)}}get options(){if(!this._oscApp)return[];let e=this._oscApp.shapes||[],t=this._oscApp.humKey||"hum",s=this._oscApp.humLabel||"Power Hum";return[{key:t,label:s},...e.map(i=>({key:i,label:i.charAt(0).toUpperCase()+i.slice(1)}))]}get currentKey(){return this._oscApp?.state?.current||this._oscApp?.humKey||"hum"}setCurrent(e){if(!this._oscApp)return;let s=this.options.find(i=>i.key===e);s&&(this._oscApp._onShapeChange({detail:{value:e}}),this._dispatchOptionChange(e,s.label))}async start(){if(!this._oscApp)throw new Error("Component not ready");window.Tone||await new Promise(e=>{let t=()=>{window.Tone?e():setTimeout(t,100)};t()}),window.Tone&&window.Tone.context.state!=="running"&&await window.Tone.start(),this._oscApp._onStartRequest()}stop(){this._oscApp&&(this._oscApp.state.isPlaying&&this._oscApp._onStartRequest(),this._oscApp.state.sequencePlaying&&this.stopSequence())}mute(e){this._oscApp&&(typeof e=="boolean"?!this._oscApp.state.isPlaying!==e&&this._oscApp._onMuteToggle():this._oscApp._onMuteToggle())}get muted(){return this._oscApp?!this._oscApp.state.isPlaying:!0}recordStep(e){if(!this._oscApp?._sequencerComponent)return;let t=typeof e=="number"&&e>=1&&e<=9?e-1:e;this._oscApp._sequencerComponent.recordStep?.(t)}playSequence(){this._oscApp?._sequencerComponent&&this._oscApp._sequencerComponent.playSequence?.()}stopSequence(){this._oscApp?._sequencerComponent&&this._oscApp._sequencerComponent.stopSequence?.()}setStepTime(e){this._oscApp&&(this._oscApp.state.stepTime=e,this._oscApp._sequencerComponent&&this._oscApp._sequencerComponent.setStepTime?.(e))}getAnalyser(){return this._oscApp?.state?.analyser||null}getState(){if(!this._oscApp)return null;let e=this._oscApp.state;return{seed:e.seed,currentKey:e.current,sequence:[...e.sequence],stepTime:e.stepTime,muted:!e.isPlaying,isSequencerMode:e.isSequencerMode,sequencePlaying:e.sequencePlaying}}setState(e){if(!this._oscApp||!e)return;let t=this._oscApp.state;e.seed&&(this.seed=e.seed),e.currentKey&&this.setCurrent(e.currentKey),e.sequence&&(t.sequence=[...e.sequence]),typeof e.stepTime=="number"&&this.setStepTime(e.stepTime),typeof e.muted=="boolean"&&this.mute(e.muted),typeof e.isSequencerMode=="boolean"&&(t.isSequencerMode=e.isSequencerMode,this._updateSequencerVisibility())}get audioContext(){return this._options?.audioContext||null}set audioContext(e){this._options&&(this._options.audioContext=e)}get tone(){return window.Tone||null}set tone(e){window.Tone=e}dispose(){this._oscApp&&(this._oscApp.disconnectedCallback?.(),this._oscApp=null)}_render(){this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        osc-app {
          width: 100%;
          height: 100%;
        }
        
        .sequencer-hidden osc-app::part(sequencer) {
          display: none !important;
        }
      </style>
      <osc-app></osc-app>
    `,this._oscApp=this.shadowRoot.querySelector("osc-app"),this._setupOscAppIntegration()}_setupOscAppIntegration(){this._oscApp&&(this._options.seed!==this._defaultOptions.seed&&setTimeout(()=>{if(this._oscApp.state){this._oscApp.state.seed=this._options.seed;let e=this._oscApp.shadowRoot?.getElementById("seedInput");e&&(e.value=this._options.seed)}},100),this._setupEventForwarding(),this._applyOptionsToOscApp(),this._updateSequencerVisibility(),setTimeout(()=>{this._dispatchReady()},200))}_setupEventForwarding(){if(!this._oscApp)return;let e=this._oscApp.shadowRoot?.querySelector("tone-loader");e&&e.addEventListener("tone-ready",this._onReady);let t=this._oscApp._controls;t&&(t.addEventListener("shape-change",this._onOptionChange),t.addEventListener("start-request",()=>this._onStateChange()),t.addEventListener("mute-toggle",()=>this._onStateChange()));let s=this._oscApp._sequencerComponent;s&&(s.addEventListener("seq-play-started",()=>this._onStateChange()),s.addEventListener("seq-play-stopped",()=>this._onStateChange()),s.addEventListener("seq-step-advance",()=>this._onStateChange()));let i=this._oscApp._canvas;if(i&&i.onIndicatorUpdate){let n=i.onIndicatorUpdate;i.onIndicatorUpdate=(o,c)=>{n(o,c),this._dispatchScopeFrame()}}}_applyOptionsToOscApp(){!this._oscApp||!this._options||(this._options.audioContext,this._options.toneModuleUrl,this._defaultOptions.toneModuleUrl)}_updateSequencerVisibility(){if(!this._oscApp)return;let e=this._oscApp._sequencerComponent;if(e){let t=this.hasAttribute("show-sequencer")||this._options?.showSequencer;e.style.display=t?"":"none"}}_onReady(){this._dispatchReady()}_onOptionChange(e){let{value:t}=e.detail||{};if(t){let s=this.options.find(i=>i.key===t);s&&this._dispatchOptionChange(t,s.label)}}_onStateChange(){this._dispatchStateChange()}_dispatchReady(){this.dispatchEvent(new CustomEvent("ready",{bubbles:!0,composed:!0}))}_dispatchOptionChange(e,t){this.dispatchEvent(new CustomEvent("optionchange",{bubbles:!0,composed:!0,detail:{key:e,label:t}}))}_dispatchStateChange(){this.dispatchEvent(new CustomEvent("statechange",{bubbles:!0,composed:!0,detail:{state:this.getState()}}))}_dispatchScopeFrame(){let e=this.getAnalyser();if(e){let t=new Float32Array(e.frequencyBinCount);e.getFloatTimeDomainData(t),this.dispatchEvent(new CustomEvent("scopeframe",{bubbles:!0,composed:!0,detail:{buffer:t}}))}}};customElements.define("seed-synth",v);export{v as SeedSynthElement};

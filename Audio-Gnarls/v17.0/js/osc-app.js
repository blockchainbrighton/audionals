// osc-app.js
// <osc-controls> + <osc-app> (iPhone-friendly layout)
// Requires: engine.js (Engine + Signatures), scope-canvas.js, seq-app.js, osc-hotkeys.js

import {
  clamp01, pct, on, off, setText, setPressed, toggleClass, byId, isBool, isNum,
  setDisabledAll, addEvents, removeEvents,
} from './utils.js';

/* ============================== <osc-controls> ============================== */
class OscControls extends HTMLElement {
  constructor(){
    super();
    const root=this.attachShadow({mode:'open'});
    const dispatch=(type,detail)=>this.dispatchEvent(new CustomEvent(type,{detail,bubbles:true,composed:true}));
    root.innerHTML=/* html */`
      <style>
        :host{display:block}
        #controls{display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap;justify-content:center;padding:.7rem 1.2rem;background:rgba(255,255,255,.07);border-radius:9px;width:95%;max-width:980px;margin:.9rem auto 0;box-sizing:border-box}
        .seed{display:flex;align-items:center;gap:.55rem;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}
        .seed label{font-size:.95rem;color:#ffe7b3;letter-spacing:.02em}
        .seed input{font-family:inherit;font-size:.98rem;color:#ffecb3;background:#1c1d22;border:1px solid #3c3f48;border-radius:6px;padding:.38rem .55rem;width:15ch;letter-spacing:.04em}
        .seed button{padding:.42rem .8rem;border-radius:6px;border:1px solid #665;background:#221;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:.95rem;transition:background .18s}
        .seed button:hover{background:#2c1f1f}
        .vol{display:flex;align-items:center;gap:.55rem;min-width:190px;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}
        .vol label{font-size:.95rem;color:#cfe3ff;letter-spacing:.02em}
        .vol input[type="range"]{-webkit-appearance:none;appearance:none;width:140px;height:4px;background:#3a3f4a;border-radius:999px;outline:none}
        .vol input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;box-shadow:0 0 6px #46ad6d55;cursor:pointer}
        .vol input[type="range"]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;cursor:pointer}
        .vol #volVal{font-size:.92rem;color:#9df5c2;min-width:3.5ch;text-align:right}
        button,select{padding:.53em 1.17em;border-radius:6px;border:1px solid #555;background:#242;color:#fff;font-size:1rem;cursor:pointer;font-family:inherit;font-weight:500;transition:background .19s,color .19s,box-shadow .19s,transform .06s ease;box-shadow:0 0 0 #0000;will-change:transform}
        button:active{transform:translateY(1px)}
        button:focus{outline:2px solid #7af6ff;outline-offset:1px}
        button:hover{background:#454}
        #startBtn.power-off{background:#451015;color:#e97c90;border-color:#89232a;box-shadow:0 0 4px #ff505011,0 0 0 #0000;text-shadow:none;filter:brightness(.95)}
        #startBtn.power-on{background:#ff2a39;color:#fff;border-color:#ff4e6a;box-shadow:0 0 18px 5px #ff2a3999,0 0 4px #ff748499;text-shadow:0 1px 3px #8d2025cc,0 0 10px #fff7;filter:brightness(1.1) saturate(1.2)}
        #startBtn:not(.ready){opacity:.7}
        #muteBtn.muted{background:#a51427;color:#fff;border-color:#ff506e;box-shadow:0 0 12px #ff506e66;text-shadow:0 1px 2px #320a0b}
        #audioSigBtn{background:#2a4d3a;color:#7af6ff;border-color:#4a7c59;box-shadow:0 0 8px #7af6ff33}
        #audioSigBtn:hover{background:#3a5d4a;box-shadow:0 0 12px #7af6ff55}
        #audioSigBtn:disabled{background:#1a2d2a;color:#4a6c59;box-shadow:none}
        .toggle{position:relative;background:#23252b;border-color:#4e5668;color:#cfe3ff;box-shadow:inset 0 -1px 0 #0004,0 0 0 #0000}
        .toggle:hover{background:#2b2f38}
        .toggle[aria-pressed="true"]{background:#1f3a26;color:#9df5c2;border-color:#46ad6d;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33;text-shadow:0 1px 2px #0b1a10aa}
        #loopBtn.toggle[aria-pressed="true"]{background:#173a2a;border-color:#35d08e;box-shadow:0 0 12px #35d08e55,inset 0 0 0 1px #35d08e33}
        #sigModeBtn.toggle[aria-pressed="true"]{background:#1f2a3f;border-color:#7aa2ff;color:#cfe0ff;box-shadow:0 0 12px #7aa2ff55,inset 0 0 0 1px #7aa2ff33}
        #latchBtn.toggle[aria-pressed="true"]{background:#1f3a26;border-color:#46ad6d;color:#9df5c2;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33}
        @media (max-width:430px){#controls{gap:.5rem;padding:.55rem .8rem}button,select{padding:.42em .8em;font-size:.93rem}.vol{min-width:160px}.vol input[type="range"]{width:120px}.seed input{width:11ch}}
        @media (max-width:380px){#controls{gap:.45rem;padding:.5rem .7rem}button,select{padding:.4em .72em;font-size:.9rem}.vol{min-width:150px}.vol input[type="range"]{width:110px}.seed label{display:none}}
        button:disabled,select:disabled{opacity:.5;pointer-events:none}
        .vol:has(input:disabled){opacity:.5;pointer-events:none}
      </style>
      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="latchBtn" class="toggle" aria-pressed="false">Latch: Off</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
        <div id="volWrap" class="vol" title="Master Volume">
          <label for="vol">Vol</label>
          <input id="vol" type="range" min="0" max="100" step="1" value="10"/>
          <span id="volVal">10%</span>
        </div>
        <form id="seedForm" class="seed" autocomplete="off">
          <label for="seedInput">Seed</label>
          <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"/>
          <button id="seedSetBtn" type="submit">Set Seed</button>
        </form>
      </div>`;
    // refs
    this._startBtn=byId(root,'startBtn');
    this._muteBtn=byId(root,'muteBtn');
    this._shapeSelect=byId(root,'shapeSelect');
    this._seqBtn=byId(root,'seqBtn');
    this._audioSigBtn=byId(root,'audioSigBtn');
    this._latchBtn=byId(root,'latchBtn');
    this._loopBtn=byId(root,'loopBtn');
    this._sigModeBtn=byId(root,'sigModeBtn');
    this._vol=byId(root,'vol');
    this._volVal=byId(root,'volVal');
    this._seedForm=byId(root,'seedForm');
    this._seedInput=byId(root,'seedInput');
    this._allControls=[this._startBtn,this._muteBtn,this._shapeSelect,this._seqBtn,this._audioSigBtn,this._latchBtn,this._loopBtn,this._sigModeBtn,this._vol];
    // events
    addEvents(this._startBtn,[['click',()=>dispatch('start-request')]]);
    addEvents(this._muteBtn,[['click',()=>dispatch('mute-toggle')]]);
    addEvents(this._shapeSelect,[['change',()=>dispatch('shape-change',{shapeKey:this._shapeSelect.value})]]);
    addEvents(this._seqBtn,[['click',()=>dispatch('toggle-sequencer')]]);
    addEvents(this._audioSigBtn,[['click',()=>dispatch('audio-signature')]]);
    addEvents(this._latchBtn,[['click',()=>dispatch('latch-toggle')]]);
    addEvents(this._loopBtn,[['click',()=>dispatch('loop-toggle')]]);
    addEvents(this._sigModeBtn,[['click',()=>dispatch('signature-mode-toggle')]]);
    addEvents(this._vol,[['input',()=>dispatch('volume-change',{value:Number(this._vol.value)})]]);
    addEvents(this._seedForm,[['submit',e=>(e.preventDefault(),dispatch('seed-set',{value:(this._seedInput?.value||'').trim()}))]]);
    this._helpers={setPressed,setText};
  }
  setShapes(shapes){const f=document.createDocumentFragment();for(const {value,label} of shapes??[])f.appendChild(Object.assign(document.createElement('option'),{value,textContent:label}));this._shapeSelect.replaceChildren(f);}
  setSeed(seed){this._seedInput&&(this._seedInput.value=seed??'');}
  disableAll(disabled){setDisabledAll(this._allControls,disabled);}
  updateState(o={}){
    const {setPressed:setP,setText:sT}=this._helpers, T=(btn,on,a,b)=>(setP(btn,on),sT(btn,on?a:b));
    isBool(o.isAudioSignaturePlaying)&&T(this._audioSigBtn,o.isAudioSignaturePlaying,'Stop Signature','Audio Signature');
    if(isBool(o.isPlaying)){sT(this._startBtn,o.isPlaying?'POWER OFF':'POWER ON');toggleClass(this._startBtn,'power-on',o.isPlaying);toggleClass(this._startBtn,'power-off',!o.isPlaying);}
    if(isBool(o.isAudioStarted)){toggleClass(this._startBtn,'ready',o.isAudioStarted);setDisabledAll([this._muteBtn,this._audioSigBtn,this._latchBtn,this._loopBtn,this._sigModeBtn,this._vol],!o.isAudioStarted);}
    isBool(o.isMuted)&&(sT(this._muteBtn,o.isMuted?'Unmute':'Mute'),toggleClass(this._muteBtn,'muted',o.isMuted));
    o.shapeKey&&(this._shapeSelect.value=o.shapeKey);
    isBool(o.sequencerVisible)&&sT(this._seqBtn,o.sequencerVisible?'Hide Sequencer':'Create Sequence');
    isBool(o.isLoopEnabled)&&T(this._loopBtn,o.isLoopEnabled,'Loop: On','Loop: Off');
    isBool(o.isSequenceSignatureMode)&&T(this._sigModeBtn,o.isSequenceSignatureMode,'Signature Mode: On','Signature Mode: Off');
    isBool(o.isLatchOn)&&T(this._latchBtn,!!o.isLatchOn,'Latch: On','Latch: Off');
    if(isNum(o.volume)){const p=pct(o.volume);this._vol&&(this._vol.value=String(p));this._volVal&&(this._volVal.textContent=`${p}%`);}
    isBool(o.sequencerVisible)&&this.dispatchEvent(new Event('controls-resize'));
  }
}
customElements.define('osc-controls',OscControls);

/* ============================== <osc-app> ================================== */
import { Engine, Signatures } from './engine.js';

class OscApp extends HTMLElement {
  static get observedAttributes(){return ['seed'];}
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._heldKeys=new Set();
    this.humKey='hum'; this.humLabel='Power Hum';
    this.shapes=['circle','square','butterfly','lissajous','spiro','harmonograph','rose','hypocycloid','epicycloid','spiral','star','flower','wave','mandala','infinity','dna','tornado'];
    this.shapeLabels=Object.fromEntries(this.shapes.map(k=>[k,k[0].toUpperCase()+k.slice(1)]));
    Object.assign(this,Engine(this),Signatures(this)); // public API
    const attrSeed=(this.getAttribute('seed')||'').trim(), htmlSeed=(document.documentElement?.dataset?.seed||'').trim();
    const initialSeed=attrSeed||htmlSeed||'default';
    this.state=this.defaultState(initialSeed);
    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange','_onToggleSequencer','_onAudioSignature','_handleSeedSubmit',
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded','_onSeqPlayStarted','_onSeqPlayStopped','_onSeqStepAdvance',
      '_onSeqStepTimeChanged','_onSeqStepsChanged','_onLoopToggle','_onSignatureModeToggle','_onVolumeChange','_onHotkeyPress',
      '_onHotkeyRelease','_onHotkeyLoopToggle','_onHotkeySignatureToggle','_onLatchToggle','_fitLayout','_onWindowResize','_onShapeStep', '_onHotkeyToggleSeqPlay', '_onHotkeyTogglePower',
      '_onToggleControls','_initControlsVisibility',
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  attributeChangedCallback(name,_o,nv){
    if(name!=='seed')return;
    const next=(nv||'').trim();
    (!next||next===this.state.seed)||this.resetToSeed(next);
  }

  defaultState(seed='default'){
    return {
      isPlaying:false,contextUnlocked:false,initialBufferingStarted:false,initialShapeBuffered:false,Tone:null,chains:{},current:null,
      isLoopEnabled:false,volume:0.2,
      isSequencerMode:false,isRecording:false,currentRecordSlot:-1,
      sequence:Array(8).fill(null),velocities:Array(8).fill(1),sequencePlaying:false,sequenceIntervalId:null,
      sequenceStepIndex:0,stepTime:200,_seqFirstCycleStarted:false,sequenceSteps:8,
      isSequenceSignatureMode:false,signatureSequencerRunning:false,
      audioSignaturePlaying:false,audioSignatureTimer:null,audioSignatureStepIndex:0,audioSignatureOnComplete:null,
      isLatchOn:false,seed,presets:{},uiHomeShapeKey:null,_transientOverride:false,
    };
  }

  connectedCallback(){
    const $=this._el.bind(this);
    const wrapper=$('div',{id:'appWrapper'});
    const main=(this._main=$('div',{id:'main'}));
    const canvasContainer=(this._canvasContainer=$('div',{id:'canvasContainer'}));
    this._canvas=$('scope-canvas'); canvasContainer.appendChild(this._canvas);
    this._setupCanvasClickGrid(); this._renderPowerOverlay();
    this._controls=$('osc-controls');

    const shapeOptions=[{value:this.humKey,label:this.humLabel},...this.shapes.map(k=>({value:k,label:this.shapeLabels[k]||k}))];
    this._controls.setShapes(shapeOptions);

    this._hotkeys=$('osc-hotkeys'); this._hotkeys.setConfig({humKey:this.humKey,shapes:this.shapes});
    main.appendChild(this._hotkeys);

    addEvents(this._hotkeys,[
      ['hk-press',this._onHotkeyPress],
      ['hk-release',this._onHotkeyRelease],
      ['hk-toggle-loop',this._onHotkeyLoopToggle],
      ['hk-toggle-signature',this._onHotkeySignatureToggle],  // Shift+S (Signature Mode)
      ['hk-shape-step',this._onShapeStep],
      // NEW:
      ['hk-toggle-mute', this._onMuteToggle],                 // M
      ['hk-toggle-sequencer', this._onToggleSequencer],       // C
      ['hk-audio-signature', this._onAudioSignature],         // s
      ['hk-toggle-latch', this._onLatchToggle],               // Shift+L
      ['hk-toggle-seq-play', this._onHotkeyToggleSeqPlay],    // P
      ['hk-toggle-power', this._onHotkeyTogglePower],         // O

    ]);

    // 5x5 map:
    // - HUM at the four corners: (0,0), (0,4), (4,0), (4,4)
    // - All other 21 cells: shapes spread deterministically by cycling shapes[0..17]
    this._buildGridMap = () => {
      const key = (r,c) => `${r},${c}`;

      // Four corners hum
      const humCells = [[0,0],[0,4],[4,0],[4,4]];
      const humSet = new Set(humCells.map(([r,c]) => key(r,c)));

      // Border clockwise (includes corners; we'll filter them)
      const borderCW = [];
      for (let c=0;c<5;c++) borderCW.push([0,c]);        // top
      for (let r=1;r<5;r++) borderCW.push([r,4]);        // right
      for (let c=3;c>=0;c--) borderCW.push([4,c]);       // bottom
      for (let r=3;r>=1;r--) borderCW.push([r,0]);       // left

      // Inner cells row-major
      const innerRowMajor = [];
      for (let r=1;r<=3;r++){
        for (let c=1;c<=3;c++){
          innerRowMajor.push([r,c]);
        }
      }

      // Deterministic ordering for non-hum cells
      const seen = new Set();
      const orderedNonHum = []
        .concat(borderCW, innerRowMajor)
        .filter(([r,c]) => {
          const k = key(r,c);
          if (humSet.has(k)) return false;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

      const shapes = this.shapes.slice(0,18);
      const map = new Map();

      // Fill non-hum cells by cycling shapes[0..17]
      for (let i=0;i<orderedNonHum.length;i++){
        const [r,c] = orderedNonHum[i];
        map.set(key(r,c), { type:'shape', shapeKey: shapes[i % shapes.length] });
      }

      // Place the 4 HUMs at the corners
      humCells.forEach(([r,c]) => {
        map.set(key(r,c), { type:'hum', shapeKey: this.humKey });
      });

      this._grid25 = {
        map,
        cellInfo: (r,c)=> map.get(key(r,c)) || null
      };
    };

    this._buildGridMap();




    this._sequencerComponent=$('seq-app'); this._sequencerComponent.style.display='none';
    this._loader=$('div',{id:'loader',textContent:'Initializing...'});
    main.append(canvasContainer,this._controls,this._sequencerComponent,this._loader);
    wrapper.append(main);
    this.shadowRoot.append($('style',{textContent:this._style()}),$('tone-loader'),wrapper);

    this._main.style.overflow='hidden';
    this._controls.setSeed?.(this.state.seed);
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready',this._onToneReady);

    addEvents(this._controls,[
      ['start-request',this._onStartRequest],['mute-toggle',this._onMuteToggle],['shape-change',this._onShapeChange],
      ['toggle-sequencer',this._onToggleSequencer],['audio-signature',this._onAudioSignature],['latch-toggle',this._onLatchToggle],
      ['loop-toggle',this._onLoopToggle],['signature-mode-toggle',this._onSignatureModeToggle],['volume-change',this._onVolumeChange],
      ['seed-set',this._handleSeedSubmit],['controls-resize',this._fitLayout],
    ]);

    this._canvas.onIndicatorUpdate=(text)=>{this._loader.textContent=(!this.state.isPlaying&&!this.state.contextUnlocked)?'Initializing...':text;this._fitLayout();};

    this._seqPairs=[
      ['seq-record-start',this._onSeqRecordStart],['seq-step-cleared',this._onSeqStepCleared],['seq-step-recorded',this._onSeqStepRecorded],
      ['seq-play-started',this._onSeqPlayStarted],['seq-play-stopped',this._onSeqPlayStopped],['seq-step-advance',this._onSeqStepAdvance],
      ['seq-step-time-changed',this._onSeqStepTimeChanged],['seq-steps-changed',this._onSeqStepsChanged],
    ];
    addEvents(this._sequencerComponent,this._seqPairs);

    this._fitLayout(); setTimeout(this._fitLayout,50); setTimeout(this._fitLayout,250);
    on(window,'resize',this._onWindowResize,{passive:true}); on(window,'orientationchange',this._onWindowResize,{passive:true});

    try{
      this._resizeObserver=new ResizeObserver(this._fitLayout);
      this._controls&&this._resizeObserver.observe(this._controls);
      this._sequencerComponent&&this._resizeObserver.observe(this._sequencerComponent);
      const loader=this.shadowRoot.getElementById('loader'); loader&&this._resizeObserver.observe(loader);
    }catch{}
  }

  // Hide controls at startup and toggle them when 'hk-toggle-controls' fires.
  _onToggleControls(){
    const c = this._controls;
    if (!c) return;
    const show = (c.style.display === 'none');
    c.style.display = show ? 'block' : 'none';
    try { this._fitLayout(); } catch {}
    try { c.dispatchEvent(new Event('controls-resize')); } catch {}
  }

  // Call once after hotkeys/controls exist; also hooks the event.
  _initControlsVisibility(){
    if (this._controls) this._controls.style.display = 'none'; // hidden on load
    if (this._hotkeys)  this._hotkeys.addEventListener('hk-toggle-controls', this._onToggleControls);
  }


  disconnectedCallback(){
    removeEvents(this._hotkeys,[
      ['hk-press',this._onHotkeyPress],['hk-release',this._onHotkeyRelease],['hk-toggle-loop',this._onHotkeyLoopToggle],
      ['hk-toggle-signature',this._onHotkeySignatureToggle],['hk-shape-step',this._onShapeStep],
    ]);
    this._sequencerComponent&&removeEvents(this._sequencerComponent,this._seqPairs||[]);
    if(this._resizeObserver){try{this._resizeObserver.disconnect();}catch{} this._resizeObserver=null;}
    off(window,'resize',this._onWindowResize); off(window,'orientationchange',this._onWindowResize);
  }

   _updateControls(patch = {}) {
    const c = this._controls;
    if (!c) return;

    // --- FIX: Create a complete state object for every UI update ---
    // This merges the full current state with any specific changes (the 'patch').
    const fullState = { ...this.state, ...patch };

    // Pass the complete state to the controls component.
    if (typeof c.updateState === 'function') {
      c.updateState(fullState);
    } else if (typeof c.setState === 'function') {
      c.setState(fullState);
    } else if (typeof c.update === 'function') {
      c.update(fullState);
    } else {
      // Fallback for older component structure
      ('shapeKey' in fullState) && (c.dataset.shape = String(fullState.shapeKey || ''));
      ('isAudioStarted' in fullState) && (c.dataset.ready = String(!!fullState.isAudioStarted));
      ('isPlaying' in fullState) && (c.dataset.playing = String(!!fullState.isPlaying));
      ('isMuted' in fullState) && (c.dataset.muted = String(!!fullState.isMuted));
      ('sequencerVisible' in fullState) && (c.dataset.sequencer = String(!!fullState.sequencerVisible));
      ('volume' in fullState) && (c.dataset.volume = String(fullState.volume));
    }

    // Also pass the complete state to the hotkey icons updater.
    this.updateHkIcons?.(fullState);

    // Trigger layout adjustments if visibility changed.
    if (Object.prototype.hasOwnProperty.call(patch, 'sequencerVisible')) {
      this._fitLayout();
    }
  }


  _style(){
    return `
      :host{display:block;width:100%;height:100%}
      #appWrapper{display:flex;flex-direction:column;height:100dvh;padding-bottom:env(safe-area-inset-bottom,0)}
      #main{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;overflow:hidden;background:#000;gap:8px;padding-inline:env(safe-area-inset-left,0) env(safe-area-inset-right,0)}
      #canvasContainer{flex:0 0 auto;max-width:100%;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;transform:none;margin-left:auto;margin-right:auto;aspect-ratio:1/1;box-sizing:border-box}
      #loader{font-size:.95rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin:2px 0 8px}
      @media (max-width:430px){:host{font-size:15px}}
      @media (max-width:380px){:host{font-size:14px}}
    `;
  }

  _safeInsetBottom(){
    try{
      const d=document.createElement('div');
      d.style.cssText='position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;';
      document.documentElement.appendChild(d);
      const pb=parseFloat(getComputedStyle(d).paddingBottom)||0; d.remove(); return pb;
    }catch{return 0;}
  }

  _measureChromeHeights(){
    const sr=this.shadowRoot; if(!sr) return {controlsH:0,loaderH:0,seqH:0};
    const controls=sr.querySelector('osc-controls'), loader=sr.getElementById('loader'), seq=this._sequencerComponent;
    const h=a=>a?a.getBoundingClientRect().height:0;
    return {controlsH:h(controls),loaderH:h(loader),seqH:(seq&&seq.style.display!=='none')?h(seq):0};
  }

  _fitLayout(){
    try{
      const cc=this._canvasContainer, sc=this._canvas, main=this._main; if(!cc||!sc||!main)return;
      const vw=Math.max(1,window.innerWidth||document.documentElement.clientWidth);
      const vh=Math.max(1,window.innerHeight||document.documentElement.clientHeight);
      const {controlsH,loaderH,seqH}=this._measureChromeHeights();
      const avail=Math.max(1,vh-controlsH-loaderH-seqH-this._safeInsetBottom()-10);
      const side=Math.round(Math.max(1,Math.min(vw,avail)));
      Object.assign(cc.style,{
        width:`${side}px`,height:`${side}px`,maxWidth:'100%',
        maxHeight:`calc(100dvh - ${controlsH+loaderH+seqH+this._safeInsetBottom()+10}px)`,
        aspectRatio:'1 / 1',boxSizing:'border-box',left:'',transform:''
      });
      Object.assign(sc.style,{width:'100%',height:'100%',aspectRatio:'1 / 1',display:'block',touchAction:'none'});
    }catch(e){console.warn('fitLayout failed',e);}
  }
  _onWindowResize(){this._fitLayout();}

  _onToneReady(){
    const s=this.state; s.Tone=window.Tone; this.loadPresets(s.seed); this.bufferHumChain();
    const initial=this.shapes[(this._rng(s.seed)()*this.shapes.length)|0];
    this._setCanvas({preset:s.presets[initial],shapeKey:initial,mode:'seed'});
    s.current=this.humKey; this._controls.disableAll?.(false);
    const D=s.Tone?.Destination?.volume; D&&(D.value=this._linToDb(s.volume));
    this._updateControls({isAudioStarted:true,isPlaying:false,isMuted:false,shapeKey:this.humKey,sequencerVisible:false,volume:s.volume});
    this._loader.textContent='Tone.js loaded. Click “POWER ON” or the image to begin.'; this._fitLayout();
  }

  _onHotkeyToggleSeqPlay(){
    const s = this.state || {};

    // Make sure the sequencer UI is visible so the user has context
    if (!s.isSequencerMode) this._onToggleSequencer();

    // Toggle using the public API provided by Signatures/SeqApp
    if (s.sequencePlaying) {
      if (typeof this.stopSequence === 'function') this.stopSequence();
    } else {
      if (typeof this.playSequence === 'function') this.playSequence();
    }
  }

  _onHotkeyTogglePower(){
    const s = this.state || {};
    // If currently running, power off; otherwise unlock/start
    if (s.isPlaying) {
      if (typeof this.stopAudioAndDraw === 'function') this.stopAudioAndDraw();
    } else {
      if (typeof this._onStartRequest === 'function') this._onStartRequest();
    }
  }



  _handleSeedSubmit(e){
    const v=(e?.detail?.value&&String(e.detail.value).trim())||(this.getAttribute('seed')||'').trim()||(document.documentElement?.dataset?.seed||'').trim()||'default';
    (!v||v===this.state.seed)|| (this.resetToSeed(v), this._controls.setSeed?.(v));
  }

  resetToSeed(newSeed){
    this.stopAudioAndDraw(); this.state.seed=newSeed; this.setAttribute('seed',newSeed);
    document?.documentElement&&(document.documentElement.dataset.seed=newSeed);
    this.loadPresets(newSeed); this.resetState();
    this._loader.textContent='Seed updated. Click POWER ON.'; this._fitLayout();
  }

  _renderPowerOverlay(){
    try{
      const s=this.state, container=this._canvasContainer||this._main||this.shadowRoot?.host||document.body;
      if(!container)return; if(s?.contextUnlocked){this._removePowerOverlay();return;}
      if(this._powerOverlay)return;
      const overlay=Object.assign(document.createElement('div'),{id:'powerOverlay'});
      Object.assign(overlay.style,{position:'absolute',inset:'0',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'20',pointerEvents:'auto',background:'rgba(0,0,0,.55)',userSelect:'none',cursor:'pointer',fontFamily:"'Courier New', monospace"});
      const inner=Object.assign(document.createElement('div'),{textContent:'Click to power on'});
      Object.assign(inner.style,{padding:'14px 18px',border:'1px dashed rgba(255,255,255,.65)',borderRadius:'8px',fontSize:'18px',letterSpacing:'.06em',color:'#fff',background:'rgba(0,0,0,.25)',textShadow:'0 1px 2px rgba(0,0,0,.5)'}); overlay.appendChild(inner);
      const parent=this._canvasContainer||this._main; parent&&getComputedStyle(parent).position==='static'&&(parent.style.position='relative');
      (this._canvasContainer||this._main||container).appendChild(overlay); this._powerOverlay=overlay;
      const onClick=async ev=>{
        ev?.preventDefault?.();
        try{await this.unlockAudioAndBufferInitial?.();}catch(e){console.error('Power-on unlock failed:',e);}
        finally{setTimeout(()=>{this.state?.contextUnlocked?this._removePowerOverlay():this._renderPowerOverlay();},0);}
      };
      overlay.addEventListener('click',onClick);
    }catch(e){console.error('overlay error',e);}
  }
  _removePowerOverlay(){this._powerOverlay?.parentNode?.removeChild(this._powerOverlay); this._powerOverlay=null;}

    _setupCanvasClickGrid(){
    const el=this._canvas; if(!el||this._canvasClickGridSetup)return; this._canvasClickGridSetup=true;

    const cellFromEvent=(ev)=>{
      const rct=el.getBoundingClientRect();
      const x=Math.max(0,Math.min(rct.width,(ev.clientX??0)-rct.left));
      const y=Math.max(0,Math.min(rct.height,(ev.clientY??0)-rct.top));
      const cols=5, rows=5;
      const col=Math.min(cols-1,Math.max(0,Math.floor(x/(rct.width/cols))));
      const row=Math.min(rows-1,Math.max(0,Math.floor(y/(rct.height/rows))));
      const info=this._grid25?.cellInfo(row,col);
      return { row, col, info };
    };

    const pressCell=(row,col,info)=>{
      // synth the same detail shape hotkeys would send, plus a stable key for hold-tracking
      const key=`r${row}c${col}`;
      const shapeKey=info?.shapeKey || this.humKey;
      const idx=(shapeKey===this.humKey)?-1:this.shapes.indexOf(shapeKey);
      // remember the last pressed logical key so release works
      this._heldKeys.add(key);
      // carry variant if present
      const detail={ key, idx, shapeKey, variant: info?.variant || null };
      this._onHotkeyPress({ detail });
    };

    const releaseCell=(key)=>{
      // tell release with the same key id
      this._onHotkeyRelease({ detail:{ key } });
    };

    this._onCanvasPointerDown=ev=>{
      if(!this.state?.contextUnlocked){ try{ this.unlockAudioAndBufferInitial?.(); }catch{} ev?.preventDefault?.(); return; }
      try{
        this._isCanvasPointerDown=true; try{ev.target?.setPointerCapture?.(ev.pointerId);}catch{}
        const {row,col,info}=cellFromEvent(ev);
        this._lastPointerKey=`r${row}c${col}`; this._lastPointerInfo=info||null;
        pressCell(row,col,info);
      }catch(e){ console.error('canvas grid down error',e); }
    };

    this._onCanvasPointerMove=ev=>{
      if(!this._isCanvasPointerDown||!this.state?.contextUnlocked)return;
      try{
        const {row,col,info}=cellFromEvent(ev);
        const key=`r${row}c${col}`;
        if(key!==this._lastPointerKey){
          const prev=this._lastPointerKey; this._lastPointerKey=key; this._lastPointerInfo=info||null;
          prev && releaseCell(prev);
          pressCell(row,col,info);
        }
      }catch(e){ console.error('canvas grid move error',e); }
    };

    this._onCanvasPointerUp=ev=>{
      try{ this._isCanvasPointerDown=false; ev?.target?.releasePointerCapture?.(ev.pointerId);}catch{}
      if(!this._lastPointerKey)return; const k=this._lastPointerKey; this._lastPointerKey=null; this._lastPointerInfo=null; releaseCell(k);
    };
    this._onCanvasPointerCancel=()=>{ this._isCanvasPointerDown=false; if(this._lastPointerKey){ const k=this._lastPointerKey; this._lastPointerKey=null; this._lastPointerInfo=null; releaseCell(k); }};

    addEvents(el,[
      ['pointerdown',this._onCanvasPointerDown],
      ['pointermove',this._onCanvasPointerMove],
      ['pointercancel',this._onCanvasPointerCancel],
      ['pointerleave',this._onCanvasPointerUp],
    ]);
    on(window,'pointerup',this._onCanvasPointerUp);
  }


  _onHotkeyLoopToggle(){this._onLoopToggle();}

  _onHotkeySignatureToggle(){
    
    // this.state.isSequencerMode&&this._onSignatureModeToggle();}
    this._onSignatureModeToggle();
  }

    _onHotkeyPress({detail}){
    const s=this.state; const {key,idx,shapeKey,variant}=detail||{}; if(!shapeKey)return;

    // NEW: remember requested variant for this press
    s._transientOverride = variant || null;

    if(s.isSequenceSignatureMode){ this._triggerSignatureFor(shapeKey,{loop:s.isLoopEnabled}); return; }
    this._heldKeys.add(key);

    const enter=()=>{
      this.setActiveChain(shapeKey);
      if (s._transientOverride) { this.applyVariant?.(shapeKey, s._transientOverride); } // <— NEW

      (idx>=0)&&this._setCanvas({shapeKey,preset:s.presets[shapeKey],mode:'live'});
      this._canvas.isPlaying=true; this._updateControls({shapeKey}); s.current=shapeKey;
      (shapeKey!==this.humKey)&&(s._uiReturnShapeKey=shapeKey);
    };

    if(s.isSequencerMode){
      if(s.isRecording){
        this._recordedThisHold=this._recordedThisHold||new Set();
        if(!this._recordedThisHold.has(key)){ this.recordStep((idx>=0)?(idx+1):0); this._recordedThisHold.add(key); }
      }
      (s.contextUnlocked&&s.initialShapeBuffered)&&enter(); return;
    }
    (s.contextUnlocked&&s.initialShapeBuffered)&&enter();
  }

  _onHotkeyRelease({detail}){
    const s=this.state; const {key}=detail||{}; if(!this._heldKeys?.has(key))return;
    this._heldKeys.delete(key); this._recordedThisHold?.delete?.(key);

    // NEW: reset any variant we applied
    if (s._transientOverride && s.current && s.current!==this.humKey) {
      this.applyVariant?.(s.current, null);
    }
    s._transientOverride = null;

    if(!s.isLatchOn&&s.contextUnlocked&&s.initialShapeBuffered){
      this.setActiveChain(this.humKey,{updateCanvasShape:false,setStateCurrent:false});
      this._canvas.isPlaying=false;
      s._uiReturnShapeKey?this._updateControls({shapeKey:s._uiReturnShapeKey}):this._updateControls();
    }
  }


  _onShapeStep({detail}){
    const d=detail?.direction; if(!d||!this.shapes.length)return;
    const s=this.state,arr=this.shapes,cur=s._uiReturnShapeKey||s.current; let i=arr.indexOf(cur); if(i===-1)i=(d===1)?-1:0;
    const next=arr[(i+d+arr.length)%arr.length];
    if(s.contextUnlocked&&s.initialShapeBuffered){
      this.setActiveChain(next); this._setCanvas({shapeKey:next,preset:s.presets[next],mode:'live'}); this._canvas.isPlaying=true; this._updateControls({shapeKey:next}); s.current=s._uiReturnShapeKey=next;
    }
  }

  // In osc-app.js, replace the entire _onLatchToggle method with this:
  _onLatchToggle() {
    // 1. Update the state
    this.state.isLatchOn = !this.state.isLatchOn;
    
    // 2. Propagate the full state change to all UI components
    this._updateControls();

    // 3. Apply audio logic if latch is turned off
    const s = this.state;
    if (!s.isLatchOn && !s.isSequencerMode && !this._heldKeys?.size && s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
      this._canvas.isPlaying = false;
    }
  }

  // Engine wires _onStartRequest/_onMuteToggle/_onShapeChange/_onToggleSequencer/_onAudioSignature/_onLoopToggle/_onSignatureModeToggle/_onVolumeChange.
}
customElements.define('osc-app',OscApp);
export { OscApp };

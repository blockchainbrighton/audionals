// osc-app.js
// <osc-controls> + <osc-app> (iPhone-friendly layout)
// Requires: engine.js (Engine + Signatures), scope-canvas.js, seq-app.js, osc-hotkeys.js

import {
  clamp01, pct, on, off, setText, setPressed, toggleClass, byId, isBool, isNum,
  setDisabledAll, addEvents, removeEvents,
} from './utils.js';
// Import freestyle path recorder (defines <path-rec-app>)
import './path-rec-app.js';

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
        /* Auditioning Controls Styles */
        #auditionControls{display:flex;gap:.5rem;border-left:2px solid #555;padding-left:1rem;margin-left:.5rem}
        #approveBtn{background:#141;color:#8f8;border-color:#383}
        #approveBtn:hover{background:#252}
        #rejectBtn{background:#411;color:#f88;border-color:#833}
        #rejectBtn:hover{background:#522}
        #approvedSeedsWrapper{width:100%;margin-top:.8rem;display:none}
        #approvedSeedsWrapper label{color:#ffe7b3;font-size:.9rem;display:block;margin-bottom:.3rem}
        #approvedSeedsList{width:100%;box-sizing:border-box;height:80px;background:#1c1d22;border:1px solid #3c3f48;color:#9f8;font-family:monospace;resize:vertical;padding:.4rem .6rem;border-radius:6px}
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
        <!-- MODIFIED START: Seed Auditioning Controls -->
        <div id="auditionControls">
            <button id="nextSeedBtn" title="Generate a new random seed and play its power-on signature">Next Seed</button>
            <button id="approveBtn" title="Save this seed to the list and play the next one">✅</button>
            <button id="rejectBtn" title="Discard this seed and play the next one">❌</button>
        </div>
        <!-- MODIFIED END -->
        <!-- Freestyle Path Recorder Buttons -->
        <button id="frReadyBtn" class="toggle" aria-pressed="false" title="Freestyle Record-Ready (R)">FR Ready</button>
        <button id="frPlayBtn" disabled title="Play Freestyle Recording (Shift+R)">FR Play</button>
        <!-- Save/Load Buttons -->
        <button id="saveBtn" title="Save entire sequencer state to clipboard as JSON">Save State</button>
        <button id="loadBtn" title="Load sequencer state from JSON data">Load State</button>
      </div>
      <!-- MODIFIED START: Approved Seeds List Display -->
      <div id="approvedSeedsWrapper">
        <label for="approvedSeedsList">Approved Seeds:</label>
        <textarea id="approvedSeedsList" readonly spellcheck="false"></textarea>
      </div>
      <!-- MODIFIED END -->`;
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
    // MODIFIED START: Auditioning Controls Refs
    this._nextSeedBtn = byId(root, 'nextSeedBtn');
    this._approveBtn = byId(root, 'approveBtn');
    this._rejectBtn = byId(root, 'rejectBtn');
    this._approvedSeedsWrapper = byId(root, 'approvedSeedsWrapper');
    this._approvedSeedsList = byId(root, 'approvedSeedsList');
    // MODIFIED END
    this._allControls=[this._startBtn,this._muteBtn,this._shapeSelect,this._seqBtn,this._audioSigBtn,this._latchBtn,this._loopBtn,this._sigModeBtn,this._vol];
    // Freestyle Recorder buttons
    this._frReadyBtn = byId(root, 'frReadyBtn');
    this._frPlayBtn = byId(root, 'frPlayBtn');
    // Save/Load buttons
    this._saveBtn = byId(root, 'saveBtn');
    this._loadBtn = byId(root, 'loadBtn');
    this._allControls.push(this._frReadyBtn, this._frPlayBtn, this._saveBtn, this._loadBtn);
    // MODIFIED START: Add auditioning buttons to allControls
    this._allControls.push(this._nextSeedBtn, this._approveBtn, this._rejectBtn);
    // MODIFIED END
    // dispatch custom events to osc-app
    addEvents(this._frReadyBtn, [['click', () => dispatch('fr-toggle')]]);
    addEvents(this._frPlayBtn, [['click', () => dispatch('fr-play')]]);
    // Save/Load button events
    addEvents(this._saveBtn, [['click', () => dispatch('save-state')]]);
    addEvents(this._loadBtn, [['click', () => dispatch('load-state')]]);
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
    // MODIFIED START: Auditioning events
    addEvents(this._nextSeedBtn, [['click', () => dispatch('next-seed')]]);
    addEvents(this._approveBtn, [['click', () => dispatch('approve-seed')]]);
    addEvents(this._rejectBtn, [['click', () => dispatch('reject-seed')]]);
    // MODIFIED END
    this._helpers={setPressed,setText};
  }
  setShapes(shapes){const f=document.createDocumentFragment();for(const {value,label} of shapes??[])f.appendChild(Object.assign(document.createElement('option'),{value,textContent:label}));this._shapeSelect.replaceChildren(f);}
  setSeed(seed){this._seedInput&&(this._seedInput.value=seed??'');}
  disableAll(disabled){setDisabledAll(this._allControls,disabled);}

  // MODIFIED START: New method to update the approved seeds list
  updateApprovedSeeds(seeds = []) {
      if (this._approvedSeedsWrapper && this._approvedSeedsList) {
        const hasSeeds = seeds.length > 0;
        this._approvedSeedsWrapper.style.display = hasSeeds ? 'block' : 'none';
        this._approvedSeedsList.value = hasSeeds ? seeds.join('\n') : '';
        // Auto-scroll to the bottom
        if (hasSeeds) {
            this._approvedSeedsList.scrollTop = this._approvedSeedsList.scrollHeight;
        }
        this.dispatchEvent(new Event('controls-resize'));
      }
  }
  // MODIFIED END

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
    this.shapes=['circle','square','butterfly','Bowditch','spiro','harmonograph','rose','hypocycloid','epicycloid','spiral','star','flower','wave','mandala','infinity','dna','tornado'];
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
      '_onFreestyleReadyToggle','_onFreestylePlay',
      '_onSaveState','_onLoadState',
      // MODIFIED START: Add new handlers for auditioning
      '_onNextSeed', '_onApproveSeed', '_onRejectSeed',
      // MODIFIED END
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
      isMuted: false,
      isLoopEnabled:false,volume:0.2,
      isSequencerMode:false,isRecording:false,currentRecordSlot:-1,
      sequence:Array(8).fill(null),velocities:Array(8).fill(1),sequencePlaying:false,sequenceIntervalId:null,
      sequenceStepIndex:0,stepTime:200,_seqFirstCycleStarted:false,sequenceSteps:8,
      isSequenceSignatureMode:false,signatureSequencerRunning:false,
      audioSignaturePlaying:false,audioSignatureTimer:null,audioSignatureStepIndex:0,audioSignatureOnComplete:null,
      isLatchOn:false,seed,presets:{},uiHomeShapeKey:null,_transientOverride:false,
      // Freestyle Path Recorder state
      isFreestyleMode:false,isFreestyleRecording:false,freestyleRecording:null,freestylePlayback:false,
      // MODIFIED START: State for approved seeds
      approvedSeeds: [],
      // MODIFIED END
    };
  }

  connectedCallback(){
    const $=this._el?.bind(this) ?? ((tag,attrs={})=>{
      const el=document.createElement(tag); for(const k in attrs){
        if(k==='textContent') el.textContent=attrs[k]; else el.setAttribute(k,attrs[k]);
      } return el;
    });
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
      ['hk-toggle-signature',this._onHotkeySignatureToggle],  // Shift+S
      ['hk-shape-step',this._onShapeStep],
      ['hk-toggle-mute', this._onMuteToggle],                 // M
      ['hk-toggle-sequencer', this._onToggleSequencer],       // C
      ['hk-audio-signature', this._onAudioSignature],         // s
      ['hk-toggle-latch', this._onLatchToggle],               // Shift+L
      ['hk-toggle-seq-play', this._onHotkeyToggleSeqPlay],    // P
      ['hk-toggle-power', this._onHotkeyTogglePower],         // O
      ['fr-toggle', this._onFreestyleReadyToggle],            // R
      ['fr-play', this._onFreestylePlay],                     // Shift+R
    ]);

    // 5x5 grid mapping
    this._buildGridMap = () => {
      const key = (r,c) => `${r},${c}`;
      const humCells = [[0,0],[0,4],[4,0],[4,4]];
      const humSet = new Set(humCells.map(([r,c]) => key(r,c)));
      const borderCW = [];
      for (let c=0;c<5;c++) borderCW.push([0,c]);
      for (let r=1;r<5;r++) borderCW.push([r,4]);
      for (let c=3;c>=0;c--) borderCW.push([4,c]);
      for (let r=3;r>=1;r--) borderCW.push([r,0]);
      const innerRowMajor = [];
      for (let r=1;r<=3;r++) for (let c=1;c<=3;c++) innerRowMajor.push([r,c]);
      const seen = new Set();
      const orderedNonHum = [].concat(borderCW, innerRowMajor).filter(([r,c])=>{
        const k=key(r,c); if (humSet.has(k) || seen.has(k)) return false; seen.add(k); return true;
      });
      const shapes = this.shapes.slice(0,18);
      const map = new Map();
      for (let i=0;i<orderedNonHum.length;i++){
        const [r,c] = orderedNonHum[i];
        map.set(key(r,c), { type:'shape', shapeKey: shapes[i % shapes.length] });
      }
      humCells.forEach(([r,c]) => map.set(key(r,c), { type:'hum', shapeKey: this.humKey }));
      this._grid25 = { map, cellInfo: (r,c)=> map.get(key(r,c)) || null };
    };
    this._buildGridMap();

    // Freestyle path recorder + overlay
    this._pathRec = document.createElement('path-rec-app');
    this.shadowRoot.appendChild(this._pathRec);
    this._frLastCell = null;

    this._frCanvas = document.createElement('canvas');
    Object.assign(this._frCanvas.style, {
      position:'absolute', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none'
    });
    canvasContainer.appendChild(this._frCanvas);
    this._frCtx = this._frCanvas.getContext('2d');

    // overlay drawing loop
    this._drawFrOverlay = () => {
      const ctx = this._frCtx;
      if (ctx) {
        ctx.clearRect(0, 0, this._frCanvas.width, this._frCanvas.height);
        try {
          if (this.state?.isFreestyleMode || this.state?.freestylePlayback || this.state?.isFreestyleRecording) {
            this._pathRec?.renderOverlay(ctx);
          }
        } catch {}
      }
      requestAnimationFrame(this._drawFrOverlay);
    };
    this._resizeFrCanvas();            // initial size
    requestAnimationFrame(this._drawFrOverlay);

    // FR events
    this._pathRec.addEventListener('fr-armed', () => { this.state.isFreestyleMode = true;  this._updateControls(); });
    this._pathRec.addEventListener('fr-disarmed', () => { this.state.isFreestyleMode = false; this._updateControls(); });
    this._pathRec.addEventListener('fr-record-started', () => { this.state.isFreestyleRecording = true; this._updateControls(); });
    this._pathRec.addEventListener('fr-record-stopped', () => {
      this.state.isFreestyleRecording = false;
      this.state.freestyleRecording = this._pathRec.getRecording();
      this._updateControls();
    });
    this._pathRec.addEventListener('fr-cleared', () => { this.state.freestyleRecording = null; this._updateControls(); });
    this._pathRec.addEventListener('fr-play-started', () => { this.state.freestylePlayback = true; this._updateControls(); });
    this._pathRec.addEventListener('fr-play-stopped', () => {
      this.state.freestylePlayback = false; this._updateControls();
      if (this._frLastCell) { this._releaseCell(this._frLastCell); this._frLastCell = null; }
    });
    this._pathRec.addEventListener('fr-play-input', (ev) => {
      const { x, y, type } = ev.detail || {};
      const cell = this._cellFromNorm(x, y);
      this._handleFreestyleInput(cell, type);
    });

    this._sequencerComponent=$('seq-app'); this._sequencerComponent.style.display='none';
    this._loader=$('div',{id:'loader',textContent:'...'});
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
      ['fr-toggle', this._onFreestyleReadyToggle], ['fr-play', this._onFreestylePlay],
      ['save-state', this._onSaveState], ['load-state', this._onLoadState],
      // MODIFIED START: Add listeners for auditioning controls
      ['next-seed', this._onNextSeed],
      ['approve-seed', this._onApproveSeed],
      ['reject-seed', this._onRejectSeed],
      // MODIFIED END
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
    c.style.display = show ? 'flex' : 'none'; // Use flex for proper layout
    try { this._fitLayout(); } catch {}
    try { c.dispatchEvent(new Event('controls-resize')); } catch {}
  }

  _initControlsVisibility(){
    if (this._controls) this._controls.style.display = 'none';
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
    const fullState = { ...this.state, ...patch };

    if (fullState.contextUnlocked) this._removePowerOverlay();

    if (typeof c.updateState === 'function') { c.updateState(fullState); }
    this.updateHkIcons?.(fullState);
    if (Object.prototype.hasOwnProperty.call(patch, 'sequencerVisible')) { this._fitLayout(); }

    // Freestyle buttons
    try {
      const { isFreestyleMode, freestyleRecording, freestylePlayback } = fullState;
      if (c._frReadyBtn) setPressed(c._frReadyBtn, !!isFreestyleMode);
      if (c._frPlayBtn) {
        c._frPlayBtn.disabled = !freestyleRecording;
        setText(c._frPlayBtn, freestylePlayback ? 'Stop' : 'FR Play');
      }
    } catch {}
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
      this._resizeFrCanvas?.();  // keep overlay in sync
    }catch(e){console.warn('fitLayout failed',e);}
  }
  _onWindowResize(){this._fitLayout();}

  _onToneReady(){
    const s=this.state; s.Tone=window.Tone; this.loadPresets(s.seed); this.bufferHumChain();
    const initial=this.shapes[(this._rng(s.seed)()*this.shapes.length)|0];
    s.uiHomeShapeKey = initial; // remember the default non-hum start shape
    this._setCanvas({preset:s.presets[initial],shapeKey:initial,mode:'seed'});
    s.current=this.humKey; this._controls.disableAll?.(false);
    const D=s.Tone?.Destination?.volume; D&&(D.value=this._linToDb(s.volume));
    this._updateControls();
    this._fitLayout();
  }

  _onHotkeyToggleSeqPlay(){
    if(this.state.sequencePlaying)this.stopSequence?.(); else this.playSequence?.();
  }

  _onSeqPlayStarted(e){
    const t=e?.detail?.stepTime,s=this.state; s.sequencePlaying=true; s.sequenceStepIndex=0; s._seqFirstCycleStarted=false;
    typeof t==='number'&&(s.stepTime=t); this._updateControls();
    if(s.isSequenceSignatureMode){this._sequencerComponent?.stopSequence();this._startSignatureSequencer();}
  }

  _onSeqPlayStopped(){
    const s=this.state; s.sequencePlaying=false; s.sequenceStepIndex=0; s._seqFirstCycleStarted=false;
    if(s.signatureSequencerRunning)this._stopSignatureSequencer();
    if(!s.isLatchOn){try{const h=this.humKey; this._updateControls({shapeKey:h}); this._onShapeChange({detail:{shapeKey:h}});}catch{}}
    this._updateControls();
  }

  _onHotkeyTogglePower(){
    const s = this.state || {};
    if (s.isPlaying) this.stopAudioAndDraw?.(); else this._onStartRequest?.();
  }

  _handleSeedSubmit(e){
    const v=(e?.detail?.value&&String(e.detail.value).trim())||(this.getAttribute('seed')||'').trim()||(document.documentElement?.dataset?.seed||'').trim()||'default';
    (!v||v===this.state.seed)|| (this.resetToSeed(v), this._controls.setSeed?.(v));
  }

  resetToSeed(newSeed){
    this.stopAudioAndDraw(); this.state.seed=newSeed; this.setAttribute('seed',newSeed);
    document?.documentElement&&(document.documentElement.dataset.seed=newSeed);
    this.loadPresets(newSeed); this.resetState();
    this._controls.setSeed?.(newSeed); // Ensure UI updates
    this._loader.textContent='Seed updated. Click POWER ON.'; this._fitLayout();
  }

  // MODIFIED START: Seed Auditioning Logic
  _generateRandomSeed() {
    // Generates an 8-character alphanumeric seed.
    return Math.random().toString(36).substring(2, 10);
  }

  _onNextSeed() {
    const newSeed = this._generateRandomSeed();
    this._loader.textContent = `Loading new seed: ${newSeed}...`;

    // resetToSeed stops audio and re-initializes state for the new seed.
    this.resetToSeed(newSeed);

    // Automatically power on after a short delay to allow the reset to complete.
    setTimeout(() => {
        this._onStartRequest();
    }, 150);
  }

  _onApproveSeed() {
    const { seed, approvedSeeds } = this.state;
    if (seed && !approvedSeeds.includes(seed)) {
      this.state.approvedSeeds.push(seed);
      this._controls.updateApprovedSeeds(this.state.approvedSeeds);
      console.log('Approved seeds:', this.state.approvedSeeds);
    }
    this._onNextSeed(); // Move to the next seed
  }

  _onRejectSeed() {
    // Simply move to the next seed without saving.
    this._onNextSeed();
  }
  // MODIFIED END

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
      overlay.addEventListener('click',()=>this._onStartRequest?.());
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
      const xNorm = rct.width  > 0 ? (x / rct.width)  : 0;
      const yNorm = rct.height > 0 ? (y / rct.height) : 0;
      return { row, col, info, xNorm, yNorm };
    };

    const pressCell=(row,col,info)=>{
      const key=`r${row}c${col}`;
      const shapeKey=info?.shapeKey || this.humKey;
      const idx=(shapeKey===this.humKey)?-1:this.shapes.indexOf(shapeKey);
      this._heldKeys.add(key);
      const detail={ key, idx, shapeKey, variant: info?.variant || null };
      this._onHotkeyPress({ detail });
    };
    const releaseCell=(key)=>{ this._onHotkeyRelease({ detail:{ key } }); };

    this._onCanvasPointerDown=ev=>{
      if(!this.state?.contextUnlocked){ try{ this.unlockAudioAndBufferInitial?.(); }catch{} ev?.preventDefault?.(); return; }
      try{
        this._isCanvasPointerDown=true; try{ev.target?.setPointerCapture?.(ev.pointerId);}catch{}
        const {row,col,info,xNorm,yNorm}=cellFromEvent(ev);
        if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
          try { this._pathRec?.arm?.(); this._pathRec?.inputPointer?.('down', xNorm, yNorm, performance.now()); } catch {}
        }
        this._lastPointerKey=`r${row}c${col}`; this._lastPointerInfo=info||null;
        pressCell(row,col,info);
      }catch(e){ console.error('canvas grid down error',e); }
    };

    this._onCanvasPointerMove=ev=>{
      if(!this._isCanvasPointerDown||!this.state?.contextUnlocked)return;
      try{
        const {row,col,info,xNorm,yNorm}=cellFromEvent(ev);
        if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
          try { this._pathRec?.inputPointer?.('move', xNorm, yNorm, performance.now()); } catch {}
        }
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
      if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
        try {
          const rct=el.getBoundingClientRect();
          const x=Math.max(0,Math.min(rct.width,(ev?.clientX??0)-rct.left));
          const y=Math.max(0,Math.min(rct.height,(ev?.clientY??0)-rct.top));
          const xn=rct.width>0?x/rct.width:0;
          const yn=rct.height>0?y/rct.height:0;
          this._pathRec?.inputPointer?.('up', xn, yn, performance.now());
        } catch {}
      }
      if(!this._lastPointerKey)return; const k=this._lastPointerKey; this._lastPointerKey=null; this._lastPointerInfo=null; releaseCell(k);
    };

    this._onCanvasPointerCancel=()=>{
      this._isCanvasPointerDown=false;
      if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
        try { this._pathRec?.inputPointer?.('up', 0, 0, performance.now()); } catch {}
      }
      if(this._lastPointerKey){
        const k=this._lastPointerKey;
        this._lastPointerKey=null; this._lastPointerInfo=null;
        releaseCell(k);
      }
    };

    addEvents(el,[
      ['pointerdown',this._onCanvasPointerDown],
      ['pointermove',this._onCanvasPointerMove],
      ['pointercancel',this._onCanvasPointerCancel],
      ['pointerleave',this._onCanvasPointerUp],
    ]);
    on(window,'pointerup',this._onCanvasPointerUp);
  }

  _onHotkeyLoopToggle(){this._onLoopToggle();}
  _onHotkeySignatureToggle(){ this._onSignatureModeToggle(); }

  _onHotkeyPress({detail}){
    const s=this.state; const {key,idx,shapeKey,variant}=detail||{}; if(!shapeKey)return;
    s._transientOverride = variant || null;
    if(s.isSequenceSignatureMode){ this._triggerSignatureFor(shapeKey,{loop:s.isLoopEnabled}); return; }
    this._heldKeys.add(key);
    const enter=()=>{
      this.setActiveChain(shapeKey);
      if (s._transientOverride) { this.applyVariant?.(shapeKey, s._transientOverride); }
      (idx>=0)&&this._setCanvas({shapeKey,preset:s.presets[shapeKey],mode:'live'});
      this._canvas.isPlaying=true; this._updateControls({shapeKey}); s.current=shapeKey;
      (shapeKey!==this.humKey)&&(s._uiReturnShapeKey=shapeKey);
    };
    if(s.isSequencerMode){
      if (s.contextUnlocked && s.initialShapeBuffered) {
        enter();
      }
      return;
    }
    (s.contextUnlocked&&s.initialShapeBuffered)&&enter();
  }

  _onHotkeyRelease({detail}){
    const s=this.state; const {key}=detail||{}; if(!this._heldKeys?.has(key))return;
    this._heldKeys.delete(key); this._recordedThisHold?.delete?.(key);
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

  _onFreestyleReadyToggle() {
    const s = this.state || {};
    const newMode = !s.isFreestyleMode;
    s.isFreestyleMode = newMode;
    try { newMode ? this._pathRec?.arm?.() : this._pathRec?.disarm?.(); } catch {}
    this._updateControls();
  }

  _onFreestylePlay() {
    const s = this.state || {};
    try {
      if (s.freestylePlayback) {
        this._pathRec?.stop?.();
      } else if (s.freestyleRecording) {
        this._pathRec?.play?.(s.freestyleRecording, { loop: !!s.isLoopEnabled });
      }
    } catch {}
  }

  _cellFromNorm(x, y) {
    const row = Math.min(4, Math.max(0, Math.floor(y * 5)));
    const col = Math.min(4, Math.max(0, Math.floor(x * 5)));
    const info = this._grid25?.cellInfo(row, col) || null;
    return { row, col, info };
  }

  _resizeFrCanvas() {
    const c = this._frCanvas;
    if (!c) return;
    const host = this._canvasContainer || this._canvas || c.parentElement;
    const r = host.getBoundingClientRect();
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const W = Math.max(1, Math.round(r.width  * dpr));
    const H = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== W || c.height !== H) {
      c.width  = W;
      c.height = H;
      c.style.width  = '100%';
      c.style.height = '100%';
    }
  }

  _pressCell(cell) {
    if (!cell) return;
    const { row, col, info } = cell;
    const key = `r${row}c${col}`;
    const shapeKey = info?.shapeKey || this.humKey;
    const idx = (shapeKey === this.humKey) ? -1 : this.shapes.indexOf(shapeKey);
    this._heldKeys.add(key);
    const detail = { key, idx, shapeKey, variant: info?.variant || null };
    this._onHotkeyPress({ detail });
  }
  _releaseCell(cell) {
    if (!cell) return;
    const key = typeof cell === 'string' ? cell : `r${cell.row}c${cell.col}`;
    this._onHotkeyRelease({ detail: { key } });
  }
  _handleFreestyleInput(cell, type) {
    if (!cell) return;
    if (type === 'down') {
      if (this._frLastCell && (this._frLastCell.row !== cell.row || this._frLastCell.col !== cell.col)) {
        this._releaseCell(this._frLastCell);
      }
      this._pressCell(cell);
      this._frLastCell = cell;
    } else if (type === 'move') {
      if (!this._frLastCell || this._frLastCell.row !== cell.row || this._frLastCell.col !== cell.col) {
        if (this._frLastCell) this._releaseCell(this._frLastCell);
        this._pressCell(cell);
        this._frLastCell = cell;
      }
    } else if (type === 'up') {
      if (this._frLastCell) { this._releaseCell(this._frLastCell); this._frLastCell = null; }
    }
  }

  _onLatchToggle() {
    this.state.isLatchOn = !this.state.isLatchOn;
    this._updateControls();
    const s = this.state;
    if (!s.isLatchOn && !s.isSequencerMode && !this._heldKeys?.size && s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
      this._canvas.isPlaying = false;
    }
  }

  async _onSaveState() {
    try {
      const appState = {
        ...this.state,
        Tone: undefined,
        chains: undefined,
        audioSignatureTimer: undefined,
        sequenceIntervalId: undefined,
        sequencerState: this._sequencerComponent ? {
          steps: this._sequencerComponent.steps,
          state: this._sequencerComponent.state
        } : null,
        pathRecorderState: this._pathRec ? {
          recording: this._pathRec.getRecording(),
          isArmed: this._pathRec._armed,
          loop: this._pathRec._loop
        } : null,
        uiState: {
          sequencerVisible: this._sequencerComponent?.style.display !== 'none',
          currentShapeKey: this.state.current,
          volume: this.state.volume
        },
        saveTimestamp: new Date().toISOString(),
        version: 'v19.3'
      };

      const jsonData = JSON.stringify(appState, null, 2);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonData);
        this._showNotification('State saved to clipboard successfully!', 'success');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = jsonData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this._showNotification('State saved to clipboard (fallback method)', 'success');
      }
      console.log('Saved state:', appState);
    } catch (error) {
      console.error('Error saving state:', error);
      this._showNotification('Error saving state: ' + error.message, 'error');
    }
  }

  async _onLoadState() {
    try {
      const jsonData = prompt('Paste the JSON state data to load:');
      if (!jsonData || jsonData.trim() === '') {
        return;
      }

      const loadedState = JSON.parse(jsonData);
      
      if (!loadedState || typeof loadedState !== 'object') {
        throw new Error('Invalid state data format');
      }

      if (this.state.sequencePlaying) {
        this._sequencerComponent?.stopSequence();
      }
      if (this.state.freestylePlayback) {
        this._pathRec?.stop();
      }

      const newState = { ...this.state };
      
      const stateProps = [
        'isMuted', 'isLoopEnabled', 'volume', 'isSequencerMode', 'isRecording',
        'currentRecordSlot', 'sequence', 'velocities', 'sequenceStepIndex', 
        'stepTime', 'sequenceSteps', 'isSequenceSignatureMode', 'isLatchOn',
        'seed', 'uiHomeShapeKey', 'isFreestyleMode', 'freestyleRecording', 'approvedSeeds'
      ];
      
      stateProps.forEach(prop => {
        if (loadedState.hasOwnProperty(prop)) {
          newState[prop] = loadedState[prop];
        }
      });

      Object.assign(this.state, newState);

      if (loadedState.sequencerState && this._sequencerComponent) {
        const seqState = loadedState.sequencerState;
        if (seqState.steps) {
          this._sequencerComponent.changeStepCount(seqState.steps);
        }
        if (seqState.state) {
          Object.assign(this._sequencerComponent.state, seqState.state);
          this._sequencerComponent.updateSequenceUI();
          this._sequencerComponent.updateStepControls();
        }
      }

      if (loadedState.pathRecorderState && this._pathRec) {
        const prState = loadedState.pathRecorderState;
        if (prState.recording) {
          this.state.freestyleRecording = prState.recording;
        }
        if (prState.loop !== undefined) {
          this._pathRec.setLoop(prState.loop);
        }
      }

      if (loadedState.uiState) {
        const uiState = loadedState.uiState;
        
        if (uiState.sequencerVisible !== undefined && this._sequencerComponent) {
          this._sequencerComponent.style.display = uiState.sequencerVisible ? 'block' : 'none';
          this.state.isSequencerMode = uiState.sequencerVisible;
        }
        
        if (uiState.volume !== undefined) {
          this.state.volume = uiState.volume;
        }
      }

      if (loadedState.seed && loadedState.seed !== this.state.seed) {
        this.resetToSeed(loadedState.seed);
      }
      
      // MODIFIED: update the approved seeds list on load
      this._controls.updateApprovedSeeds(this.state.approvedSeeds);

      this._updateControls();
      this._fitLayout();

      this._showNotification('State loaded successfully!', 'success');
      console.log('Loaded state:', loadedState);
      
    } catch (error) {
      console.error('Error loading state:', error);
      this._showNotification('Error loading state: ' + error.message, 'error');
    }
  }

  _showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: '14px',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}
customElements.define('osc-app',OscApp);
export { OscApp };
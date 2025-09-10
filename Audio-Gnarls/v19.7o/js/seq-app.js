/* eslint-disable no-underscore-dangle */
class SeqApp extends HTMLElement {
  static VALID_SIZES = [8,16,32,64];
  static DEFAULT_STEPS = 8;
  static MIN_MS = 50;
  static MAX_MS = 2000;

  #dispatch = (t,d={})=>this.dispatchEvent(new CustomEvent(t,{detail:d,bubbles:true,composed:true}));
  #len = ()=>this.state.sequence.length;
  #next = i=>(i+1)%this.#len();
  #clamp01 = v=>(v<0?0:v>1?1:v);
  #slotEls = ()=>this._stepSlotsDiv?.querySelectorAll(".step-slot")??[];
  #velAt = i=>this.state.velocities?.[i]??1;
  #setSeq = (i,v)=>(this.state.sequence[i]=v);
  #setVel = (i,v)=>(this.state.velocities[i]=v);
  #isRecordingSlot = i=>this.state.isRecording&&this.state.currentRecordSlot===i;
  #isActiveStep = i=>this.state.sequencePlaying&&this.state.sequenceStepIndex===i;
  #setTooltip = (s,v,suf="Alt-drag to edit")=>(s.title=`Velocity: ${Math.round(v*100)}% (${suf})`);
  #nextSize = dir=>(SeqApp.VALID_SIZES[SeqApp.VALID_SIZES.indexOf(this.steps)+dir]??null);
  #initStateForSteps(n){ this.steps=n; Object.assign(this.state,{sequence:Array(n).fill(null),velocities:Array(n).fill(1),sequenceStepIndex:0}); }

  #cacheRefs(){ const $=id=>this.shadowRoot.getElementById(id); this._stepSlotsDiv=$("stepSlots"); this._playBtn=$("playBtn"); this._stepTimeInput=$("stepTimeInput"); this._addBlockBtn=$("addBlockBtn"); this._removeBlockBtn=$("removeBlockBtn"); this._stepInfo=$("stepInfo"); }

  #attachUIEvents(){
    this._eventListeners||=[]; const on=(el,ev,h)=>el&&(el.addEventListener(ev,h),this._eventListeners.push([el,ev,h]));
    on(this._playBtn,"click",this.handlePlayClick);
    on(this._stepTimeInput,"change",this.handleStepTimeChange);
    on(this._addBlockBtn,"click",this.handleAddBlock);
    on(this._removeBlockBtn,"click",this.handleRemoveBlock);
  }

  _applyPendingEdits(){ const q=this._pendingEdits||[]; if(!q.length) return; for(const e of q){ if(e.type==='paint'){ this.#setSeq(e.i,e.value); this.#dispatch("seq-step-recorded",{slotIndex:e.i,value:e.value,nextSlot:this.#next(e.i),isRecording:false}); } else { this.#setSeq(e.i,null); this.#dispatch("seq-step-cleared",{slotIndex:e.i}); } } this._pendingEdits.length=0; this.updateSequenceUI(); }

  #recordAt(i,n){
    if(!this.state.isRecording||i<0||i>=this.#len()) return;
    this._pendingEdits&&(this._pendingEdits=this._pendingEdits.filter(e=>e.i!==i));
    this.#setSeq(i,n);
    const nx=this.#next(i);
    this.state.currentRecordSlot=nx; if(nx===0) this.state.isRecording=false;
    this.updateSequenceUI();
    this.#dispatch("seq-step-recorded",{slotIndex:i,value:n,nextSlot:nx,isRecording:this.state.isRecording});
  }

  #clearAt(i){ this.#setSeq(i,null); this.updateSequenceUI(); this.#dispatch("seq-step-cleared",{slotIndex:i}); }

  #paint(i,to){
    this._pendingEdits||=[]; this._pendingEdits.push(to==null?{type:'clear',i}:{type:'paint',i,value:0});
    this.#setSeq(i,to==null?null:0); this.updateSequenceUI();
  }

  #beginDragPaint(i){ const to=this.state.sequence[i]==null?1:null; Object.assign(this._dragState,{painting:true,mode:"paint",setTo:to,lastIndex:-1}); this.#paint(i,to); }
  #beginDragVelocity(i,e){ Object.assign(this._dragState,{painting:true,mode:"velocity",baseVel:this.#velAt(i),startY:e.clientY,lastIndex:i}); }

  #handleDragPaint(i){ const d=this._dragState; if(!d.painting||d.mode!=="paint"||d.lastIndex===i) return; d.lastIndex=i; this.#paint(i,d.setTo); }

  #handleDragVelocity(i,e,slot,bar){
    const d=this._dragState; if(!d.painting||d.mode!=="velocity") return;
    this._velocityUpdateThrottle||={}; const now=Date.now(), t=this._velocityUpdateThrottle[i]; if(t&&now-t<16) return; this._velocityUpdateThrottle[i]=now;
    const v=this.#clamp01(d.baseVel+((d.startY-e.clientY)/150)*(e.shiftKey?.25:1)); this.#setVel(i,v); this.#setTooltip(slot,v,`Alt-drag${e.shiftKey?" + Shift":""}`); bar.style.height=`${Math.round(v*100)}%`;
  }

  #createSlot(i){
    const s=Object.assign(document.createElement("div"),{className:"step-slot"}); s.dataset.index=`${i}`;
    const b=Object.assign(document.createElement("div"),{className:"vel-bar"}), d=Object.assign(document.createElement("div"),{className:"digit"}); s.append(b,d);
    this._slotListeners||=[]; const on=(ev,h)=>(s.addEventListener(ev,h),this._slotListeners.push([s,ev,h]));
    on("click",()=>this.handleStepClick(i));
    on("contextmenu",e=>this.handleStepRightClick(e,i));
    on("pointerdown",e=>(e.altKey?this.#beginDragVelocity(i,e):this.#beginDragPaint(i),s.setPointerCapture(e.pointerId)));
    on("pointerenter",()=>this.#handleDragPaint(i));
    on("pointermove",e=>this.#handleDragVelocity(i,e,s,b));
    return s;
  }

  #rebuildAfterSteps(){ this.render(); this.#attachUIEvents(); this.updateSequenceUI(); }

  constructor(){
    super();
    this.attachShadow({mode:"open"});
    this.state={isRecording:false,currentRecordSlot:-1,sequence:[],velocities:[],sequencePlaying:false,sequenceStepIndex:0,stepTime:400};
    ["updateState","updateSequenceUI","recordStep","playSequence","stopSequence","handleStepClick","handleStepRightClick","handlePlayClick","handleStepTimeChange","handleAddBlock","handleRemoveBlock","updateStepControls","_onWindowKeyDown","_onPointerUpGlobal","createSequenceUI","render","changeStepCount"].forEach(k=>(this[k]=this[k].bind(this)));
    this._eventListeners=[]; this._slotListeners=[];
  }

  connectedCallback(){
    const a=Number(this.getAttribute("steps"))||SeqApp.DEFAULT_STEPS; this.#initStateForSteps(SeqApp.VALID_SIZES.includes(a)?a:SeqApp.DEFAULT_STEPS);
    this.render(); this.updateSequenceUI(); this.#attachUIEvents();
    window.addEventListener("keydown",this._onWindowKeyDown); window.addEventListener("pointerup",this._onPointerUpGlobal);
    this._globalListeners=[["keydown",this._onWindowKeyDown],["pointerup",this._onPointerUpGlobal]];
  }

  disconnectedCallback(){
    (this._globalListeners||[]).forEach(([e,h])=>window.removeEventListener(e,h));
    (this._eventListeners||[]).forEach(([el,e,h])=>el.removeEventListener(e,h));
    (this._slotListeners||[]).forEach(([el,e,h])=>el.removeEventListener(e,h));
    this._globalListeners=this._eventListeners=this._slotListeners=[];
    this._seqTimer&&clearTimeout(this._seqTimer); this._tailTimer&&clearTimeout(this._tailTimer);
    this._velocityUpdateThrottle=null;
  }

  render(){
    const gc=Math.min(8,this.steps), mw=Math.min(320,this.steps*40), {MIN_MS,MAX_MS}=SeqApp;
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;text-align:center;width:95%;margin:.8em auto 0;font-family:sans-serif}
        #stepSlots{display:grid;grid-template-columns:repeat(${gc},1fr);gap:.4em;margin:.6em auto .7em;max-width:${mw}px;width:100%;justify-content:center;align-content:center;padding:0;border-radius:6px;background:#fff0;box-shadow:0 0 12px #0003}
        #stepControls{display:flex;align-items:center;justify-content:center;gap:1rem;margin:.5em 0;font-size:.9em}
        #stepControls button{padding:.3em .8em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font:inherit;font-size:.9em;transition:background .18s}
        #stepControls button:hover{background:#323}
        #stepControls button:disabled{opacity:.5;cursor:not-allowed}
        #stepInfo{color:#aaa;font-size:.85em}
        .step-slot{position:relative;width:37px;height:37px;border:1px solid #555;border-radius:6px;background:#232325;display:grid;place-items:center;cursor:pointer;font-weight:700;font-size:1.12rem;user-select:none;transition:background .15s,box-shadow .16s,border-color .16s}
        .step-slot.record-mode{background:#343;box-shadow:0 0 7px #f7c46988}
        .step-slot.active{border-color:#7af6ff;box-shadow:0 0 8px #7af6ff88}
        .step-slot.record-mode.active{background:#575;box-shadow:0 0 12px #f7c469d6}
        .digit{position:relative;z-index:2;color:#eee}
        .vel-bar{position:absolute;bottom:0;left:0;width:100%;height:0%;background:#7af6ff55;border-bottom-left-radius:6px;border-bottom-right-radius:6px;pointer-events:none;transition:height .05s linear;z-index:1}
        #sequenceControls{display:flex;align-items:center;justify-content:center;gap:1.1rem;margin:1.1em 0 0;width:100%}
        #playBtn{min-width:150px;font-size:1.09rem;padding:.44em 1.4em;border-radius:7px;margin:0;background:#181818;color:#fff;border:2px solid #7af6ff;transition:background .19s,color .19s;box-shadow:0 2px 10px #7af6ff22}
        #playBtn:hover{background:#212d3d;color:#fff;border-color:#fff}
        #playBtn:disabled{opacity:.5;cursor:not-allowed;background:#181818;border-color:#555;color:#888}
        #stepTimeInput{width:60px;margin-left:.7em}
      </style>
      <div id="sequencer">
        <div id="stepControls">
          <button id="removeBlockBtn">Remove Block (-8)</button>
          <span id="stepInfo">${this.steps} steps (${this.steps/8} blocks)</span>
          <button id="addBlockBtn">Add Block (+8)</button>
        </div>
        <div id="stepSlots"></div>
        <div id="sequenceControls">
          <button id="playBtn">Play Sequence</button>
          <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
          <input type="number" id="stepTimeInput" min="${MIN_MS}" max="${MAX_MS}" value="${this.state.stepTime}"/>
        </div>
      </div>`;
    this.#cacheRefs(); this.createSequenceUI(); this.updateStepControls();
  }

  createSequenceUI(){
    if(!this._stepSlotsDiv) return;
    (this._slotListeners||[]).forEach(([el,e,h])=>el.removeEventListener(e,h)); this._slotListeners=[];
    this._stepSlotsDiv.innerHTML=""; this._dragState={painting:false,mode:null,setTo:null,baseVel:1,startY:0,lastIndex:-1};
    const f=document.createDocumentFragment(); for(let i=0;i<this.steps;i++) f.appendChild(this.#createSlot(i)); this._stepSlotsDiv.appendChild(f);
  }

  updateState(n={}){
    if("steps" in n){ const d=SeqApp.VALID_SIZES.includes(n.steps)?n.steps:this.steps; if(d!==this.steps) return this.#initStateForSteps(d),this.#rebuildAfterSteps(); }
    Object.assign(this.state,n); this.updateSequenceUI();
  }

  updateSequenceUI(){
    if(!this._stepSlotsDiv) return;
    const {sequence:q,velocities:vels,sequencePlaying:sp,stepTime:st}=this.state;
    for(const s of this.#slotEls()){
      const i=+s.dataset.index, v=q[i], d=s.querySelector(".digit"), b=s.querySelector(".vel-bar"), vel=vels?.[i]??1;
      if(d) d.textContent=v===0?"0":v??"";
      s.classList.toggle("record-mode",this.#isRecordingSlot(i));
      s.classList.toggle("active",this.#isActiveStep(i));
      if(b) b.style.height=`${Math.round(vel*100)}%`;
      if(!s.title?.startsWith("Velocity:")) this.#setTooltip(s,vel);
    }
    if(this._playBtn){ this._playBtn.textContent=sp?"Stop Sequence":"Play Sequence"; this._playBtn.disabled=!sp&&!this.hasPopulatedSteps(); }
    if(this._stepTimeInput&&!sp) this._stepTimeInput.value=st;
    this.updateStepControls();
  }

  handleStepClick(i){ this.state.isRecording=true; this.state.currentRecordSlot=i; this.updateSequenceUI(); this.#dispatch("seq-record-start",{slotIndex:i}); }
  handleStepRightClick(e,i){ e.preventDefault(); this._pendingEdits||=[]; this._pendingEdits.push({type:'clear',i}); this.#setSeq(i,null); this.updateSequenceUI(); }
  handlePlayClick(){ this.state.sequencePlaying?this.stopSequence():this.playSequence(); }

  handleStepTimeChange(){
    const el=this._stepTimeInput; if(!el) return;
    const v=parseInt(el.value,10); if(!Number.isFinite(v)||v<SeqApp.MIN_MS||v>SeqApp.MAX_MS) return;
    this.state.stepTime=v; this.#dispatch("seq-step-time-changed",{stepTime:v});
  }

  handleAddBlock(){ if(!this.state.sequencePlaying){ const nx=this.#nextSize(1); nx&&this.changeStepCount(nx); } }
  handleRemoveBlock(){ if(!this.state.sequencePlaying){ const nx=this.#nextSize(-1); nx&&this.changeStepCount(nx); } }

  changeStepCount(n){
    if(!SeqApp.VALID_SIZES.includes(n)) return;
    this.state.isRecording=false; this.state.currentRecordSlot=-1;
    const os=[...this.state.sequence], ov=[...this.state.velocities];
    this.steps=n; this.state.sequence=Array(n).fill(null); this.state.velocities=Array(n).fill(1);
    for(let i=0,l=Math.min(os.length,n);i<l;i++) (this.state.sequence[i]=os[i]),(this.state.velocities[i]=ov[i]);
    if(this.state.sequenceStepIndex>=n) this.state.sequenceStepIndex=0;
    this.#rebuildAfterSteps(); this.#dispatch("seq-steps-changed",{steps:n});
  }

  updateStepControls(){
    if(this._addBlockBtn) this._addBlockBtn.disabled=this.steps>=64||this.state.sequencePlaying;
    if(this._removeBlockBtn) this._removeBlockBtn.disabled=this.steps<=8||this.state.sequencePlaying;
    if(this._stepInfo) this._stepInfo.textContent=`${this.steps} steps (${this.steps/8} blocks)`;
  }

  _onWindowKeyDown(e){ if(this.state.isRecording&&/^[0-9]$/.test(e.key)) this.#recordAt(this.state.currentRecordSlot,parseInt(e.key,10)); }
  _onPointerUpGlobal(){ this._dragState&&Object.assign(this._dragState,{painting:false,mode:null,lastIndex:-1}); }
  recordStep(n){ this.#recordAt(this.state.currentRecordSlot,n); }
  hasPopulatedSteps(){ return this.state.sequence.some(s=>s!==null); }

  playSequence(){
    if(this.state.sequencePlaying||!this.hasPopulatedSteps()) return;
    this.state.sequencePlaying=true; this.state.sequenceStepIndex=0; this.#dispatch("seq-play-started",{stepTime:this.state.stepTime});
    const tick=()=>{
      if(!this.state.sequencePlaying) return;
      this._applyPendingEdits();
      const i=this.state.sequenceStepIndex; this.updateSequenceUI();
      const v=this.state.sequence[i], vel=this.#velAt(i), last=this.#next(i)===0;
      this.#dispatch("seq-step-advance",{stepIndex:i,index:i,value:v,velocity:vel,isLastStep:last});
      this.state.sequenceStepIndex=this.#next(i);
      this._seqTimer=this.state.sequencePlaying?setTimeout(tick,this.state.stepTime):null;
    };
    tick();
  }

  stopSequence(){
    this.state.sequencePlaying=false;
    this._seqTimer&&(clearTimeout(this._seqTimer),(this._seqTimer=null));
    this._tailTimer&&(clearTimeout(this._tailTimer),(this._tailTimer=null));
    this._applyPendingEdits(); this.state.sequenceStepIndex=0; this.updateSequenceUI(); this.#dispatch("seq-play-stopped",{});
    const d=Math.max(20,Math.min(this.state.stepTime,200));
    this._tailTimer=setTimeout(()=>{ this.#dispatch("seq-step-advance",{stepIndex:-1,index:-1,value:0,velocity:1,isLastStep:true}); this._tailTimer=null; },d);
  }
}

if(!customElements.get('seq-app')) customElements.define('seq-app',SeqApp);

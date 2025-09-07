/* eslint-disable no-underscore-dangle */
class SeqApp extends HTMLElement {
  static VALID_SIZES=[8,16,32,64];
  static DEFAULT_STEPS=8;
  static MIN_MS=50;
  static MAX_MS=2000;

  #dispatch(t,d={}){this.dispatchEvent(new CustomEvent(t,{detail:d,bubbles:true,composed:true}));}
  #len(){return this.state.sequence.length;}
  #next(i){return(i+1)%this.#len();}
  #clamp01(v){return v<0?0:v>1?1:v;}
  #slotEls(){return this._stepSlotsDiv?.querySelectorAll(".step-slot")??[];}
  #velAt(i){return this.state.velocities?.[i]??1;}
  #setSeq(i,v){this.state.sequence[i]=v;}
  #setVel(i,v){this.state.velocities[i]=v;}
  #isRecordingSlot(i){return this.state.isRecording&&this.state.currentRecordSlot===i;}
  #isActiveStep(i){return this.state.sequencePlaying&&this.state.sequenceStepIndex===i;}
  #setTooltip(s,v,suf="Alt-drag to edit"){s.title=`Velocity: ${Math.round(v*100)}% (${suf})`;}
  #nextSize(dir){const o=SeqApp.VALID_SIZES;const n=o[o.indexOf(this.steps)+dir];return n??null;}
  #initStateForSteps(n){this.steps=n;Object.assign(this.state,{sequence:Array(n).fill(null),velocities:Array(n).fill(1),sequenceStepIndex:0});}
  #cacheRefs(){const $=id=>this.shadowRoot.getElementById(id);this._stepSlotsDiv=$("stepSlots");this._playBtn=$("playBtn");this._stepTimeInput=$("stepTimeInput");this._addBlockBtn=$("addBlockBtn");this._removeBlockBtn=$("removeBlockBtn");this._stepInfo=$("stepInfo");}
  #attachUIEvents(){this._playBtn?.addEventListener("click",this.handlePlayClick);this._stepTimeInput?.addEventListener("change",this.handleStepTimeChange);this._addBlockBtn?.addEventListener("click",this.handleAddBlock);this._removeBlockBtn?.addEventListener("click",this.handleRemoveBlock);}
  #recordAt(i,n){if(!this.state.isRecording||i<0||i>=this.#len())return;this.#setSeq(i,n);const nx=this.#next(i);this.state.currentRecordSlot=nx;nx===0&&(this.state.isRecording=false);this.updateSequenceUI();this.#dispatch("seq-step-recorded",{slotIndex:i,value:n,nextSlot:nx,isRecording:this.state.isRecording});}
  #clearAt(i){this.#setSeq(i,null);this.updateSequenceUI();this.#dispatch("seq-step-cleared",{slotIndex:i});}
  #paint(i,to){if(to==null)return this.#clearAt(i);this.#setSeq(i,0);this.updateSequenceUI();this.#dispatch("seq-step-recorded",{slotIndex:i,value:0,nextSlot:this.#next(i),isRecording:false});}
  #beginDragPaint(i){const to=this.state.sequence[i]==null?1:null;Object.assign(this._dragState,{painting:true,mode:"paint",setTo:to,lastIndex:-1});this.#paint(i,to);}
  #beginDragVelocity(i,e){Object.assign(this._dragState,{painting:true,mode:"velocity",baseVel:this.#velAt(i),startY:e.clientY,lastIndex:i});}
  #handleDragPaint(i){if(!this._dragState.painting||this._dragState.mode!=="paint"||this._dragState.lastIndex===i)return;this._dragState.lastIndex=i;this.#paint(i,this._dragState.setTo);}
  #handleDragVelocity(i,e,slot,bar){if(!this._dragState.painting||this._dragState.mode!=="velocity")return;const dy=this._dragState.startY-e.clientY;const v=this.#clamp01(this._dragState.baseVel+(dy/150)*(e.shiftKey?.25:1));this.#setVel(i,v);this.#setTooltip(slot,v,`Alt-drag${e.shiftKey?" + Shift":""}`);bar.style.height=`${Math.round(v*100)}%`;}
  #createSlot(i){const s=Object.assign(document.createElement("div"),{className:"step-slot"});s.dataset.index=String(i);const b=Object.assign(document.createElement("div"),{className:"vel-bar"});const d=Object.assign(document.createElement("div"),{className:"digit"});s.append(b,d);s.addEventListener("click",()=>this.handleStepClick(i));s.addEventListener("contextmenu",e=>this.handleStepRightClick(e,i));s.addEventListener("pointerdown",e=>{e.altKey?this.#beginDragVelocity(i,e):this.#beginDragPaint(i);s.setPointerCapture(e.pointerId);});s.addEventListener("pointerenter",()=>this.#handleDragPaint(i));s.addEventListener("pointermove",e=>this.#handleDragVelocity(i,e,s,b));return s;}
  #rebuildAfterSteps(){this.render();this.#attachUIEvents();this.updateSequenceUI();}

  constructor(){super();this.attachShadow({mode:"open"});this.state={isRecording:false,currentRecordSlot:-1,sequence:[],velocities:[],sequencePlaying:false,sequenceStepIndex:0,stepTime:400};["updateState","updateSequenceUI","recordStep","playSequence","stopSequence","handleStepClick","handleStepRightClick","handlePlayClick","handleStepTimeChange","handleAddBlock","handleRemoveBlock","updateStepControls","_onWindowKeyDown","_onPointerUpGlobal","createSequenceUI","render","changeStepCount"].forEach(fn=>{this[fn]=this[fn].bind(this);});}

  connectedCallback(){const a=Number(this.getAttribute("steps"))||SeqApp.DEFAULT_STEPS;const n=SeqApp.VALID_SIZES.includes(a)?a:SeqApp.DEFAULT_STEPS;this.#initStateForSteps(n);this.render();this.updateSequenceUI();this.#attachUIEvents();window.addEventListener("pointerup",this._onPointerUpGlobal);}
  disconnectedCallback(){window.removeEventListener("pointerup",this._onPointerUpGlobal);this._seqTimer&&clearTimeout(this._seqTimer);this._tailTimer&&clearTimeout(this._tailTimer);}

  render(){this.shadowRoot.innerHTML=`
    <style>
      :host{display:block;text-align:center;width:95%;margin:.8em auto 0;font-family:sans-serif;}
      #stepSlots{display:grid;grid-template-columns:repeat(8,1fr);gap:.4em;margin:.6em auto .7em;max-width:${Math.min(320,this.steps*40)}px;width:100%;justify-content:center;align-content:center;padding:0;border-radius:6px;background:rgba(255,255,255,.05);box-shadow:0 0 12px #0003;}
      #stepControls{display:flex;align-items:center;justify-content:center;gap:1rem;margin:.5em 0;font-size:.9em;}
      #stepControls button{padding:.3em .8em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font:inherit;font-size:.9em;transition:background .18s;}
      #stepControls button:hover{background:#323;}
      #stepControls button:disabled{opacity:.5;cursor:not-allowed;}
      #stepInfo{color:#aaa;font-size:.85em;}
      .step-slot{position:relative;width:37px;height:37px;border:1px solid #555;border-radius:6px;background:#232325;display:grid;place-items:center;cursor:pointer;font-weight:bold;font-size:1.12rem;user-select:none;transition:background .15s,box-shadow .16s;}
      .step-slot.record-mode{background:#343;box-shadow:0 0 7px #f7c46988;}
      .step-slot.record-mode.active{background:#575;box-shadow:0 0 12px #f7c469d6;}
      .digit{position:relative;z-index:2;color:#eee;}
      .vel-bar{position:absolute;bottom:0;left:0;width:100%;height:0%;background:#7af6ff55;border-bottom-left-radius:6px;border-bottom-right-radius:6px;pointer-events:none;transition:height .05s linear;z-index:1;}
      #sequenceControls{display:flex;align-items:center;justify-content:center;gap:1.1rem;margin:1.1em 0 0;width:100%;}
      #playBtn{min-width:150px;font-size:1.09rem;padding:.44em 1.4em;border-radius:7px;margin:0;background:#181818;color:#fff;border:2px solid #7af6ff;transition:background .19s,color .19s;box-shadow:0 2px 10px #7af6ff22;}
      #playBtn:hover{background:#212d3d;color:#fff;border-color:#fff;}
      #stepTimeInput{width:60px;margin-left:.7em;}
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
        <input type="number" id="stepTimeInput" min="${SeqApp.MIN_MS}" max="${SeqApp.MAX_MS}" value="${this.state.stepTime}"/>
      </div>
    </div>
  `;this.#cacheRefs();this.createSequenceUI();this.updateStepControls();}

  createSequenceUI(){if(!this._stepSlotsDiv)return;this._stepSlotsDiv.innerHTML="";this._dragState={painting:false,mode:null,setTo:null,baseVel:1,startY:0,lastIndex:-1};const f=document.createDocumentFragment();for(let i=0;i<this.steps;i++)f.appendChild(this.#createSlot(i));this._stepSlotsDiv.appendChild(f);}

  updateState(n={}){if("steps"in n){const d=SeqApp.VALID_SIZES.includes(n.steps)?n.steps:this.steps;if(d!==this.steps){this.#initStateForSteps(d);this.#rebuildAfterSteps();return;}}Object.assign(this.state,n);this.updateSequenceUI();}

  updateSequenceUI(){if(!this._stepSlotsDiv)return;const {sequence,velocities,sequencePlaying,stepTime}=this.state;for(const s of this.#slotEls()){const i=Number(s.dataset.index);const v=sequence[i];s.querySelector(".digit").textContent=v===0?"0":(v??"");s.classList.toggle("record-mode",this.#isRecordingSlot(i));s.classList.toggle("active",this.#isActiveStep(i));const vel=velocities?.[i]??1;s.querySelector(".vel-bar").style.height=`${Math.round(vel*100)}%`;s.title?.startsWith("Velocity:")||this.#setTooltip(s,vel);}this._playBtn&&(this._playBtn.textContent=sequencePlaying?"Stop Sequence":"Play Sequence");this._stepTimeInput&&!sequencePlaying&&(this._stepTimeInput.value=stepTime);this.updateStepControls();}

  handleStepClick(i){this.state.isRecording=true;this.state.currentRecordSlot=i;this.updateSequenceUI();this.#dispatch("seq-record-start",{slotIndex:i});}
  handleStepRightClick(e,i){e.preventDefault();this.#setSeq(i,null);if(this.state.isRecording&&this.state.currentRecordSlot===i){const nx=this.#next(i);this.state.currentRecordSlot=nx;nx===0&&(this.state.isRecording=false);}this.updateSequenceUI();this.#dispatch("seq-step-cleared",{slotIndex:i});}
  handlePlayClick(){this.state.sequencePlaying?this.stopSequence():this.playSequence();}
  handleStepTimeChange(){const el=this._stepTimeInput;if(!el)return;const v=parseInt(el.value,10);if(!Number.isFinite(v)||v<SeqApp.MIN_MS||v>SeqApp.MAX_MS)return;this.state.stepTime=v;this.#dispatch("seq-step-time-changed",{stepTime:v});}
  handleAddBlock(){if(this.state.sequencePlaying)return;const nx=this.#nextSize(+1);nx&&this.changeStepCount(nx);}
  handleRemoveBlock(){if(this.state.sequencePlaying)return;const nx=this.#nextSize(-1);nx&&this.changeStepCount(nx);}

  changeStepCount(n){if(!SeqApp.VALID_SIZES.includes(n))return;this.state.isRecording=false;this.state.currentRecordSlot=-1;const os=[...this.state.sequence],ov=[...this.state.velocities];this.steps=n;this.state.sequence=Array(n).fill(null);this.state.velocities=Array(n).fill(1);for(let i=0,l=Math.min(os.length,n);i<l;i++){this.state.sequence[i]=os[i];this.state.velocities[i]=ov[i];}this.state.sequenceStepIndex>=n&&(this.state.sequenceStepIndex=0);this.#rebuildAfterSteps();this.#dispatch("seq-steps-changed",{steps:n});}

  updateStepControls(){this._addBlockBtn&&(this._addBlockBtn.disabled=this.steps>=64||this.state.sequencePlaying);this._removeBlockBtn&&(this._removeBlockBtn.disabled=this.steps<=8||this.state.sequencePlaying);this._stepInfo&&(this._stepInfo.textContent=`${this.steps} steps (${this.steps/8} blocks)`);}
  _onWindowKeyDown(e){if(!this.state.isRecording||!/^[0-9]$/.test(e.key))return;this.#recordAt(this.state.currentRecordSlot,parseInt(e.key,10));}
  _onPointerUpGlobal(){this._dragState&&Object.assign(this._dragState,{painting:false,mode:null,lastIndex:-1});}

  recordStep(n){this.#recordAt(this.state.currentRecordSlot,n);}
  playSequence(){if(this.state.sequencePlaying)return;this.state.sequencePlaying=true;this.state.sequenceStepIndex=0;this.updateSequenceUI();this.#dispatch("seq-play-started",{stepTime:this.state.stepTime});const stepFn=()=>{if(!this.state.sequencePlaying)return;const i=this.state.sequenceStepIndex,v=this.state.sequence[i],vel=this.#velAt(i);this.#dispatch("seq-step-advance",{stepIndex:i,index:i,value:v,velocity:vel,isLastStep:this.#next(i)===0});this.state.sequenceStepIndex=this.#next(i);this.updateSequenceUI();this._seqTimer=this.state.sequencePlaying?setTimeout(stepFn,this.state.stepTime):null;};stepFn();}
  stopSequence(){this.state.sequencePlaying=false;this._seqTimer&&(clearTimeout(this._seqTimer),this._seqTimer=null);this._tailTimer&&(clearTimeout(this._tailTimer),this._tailTimer=null);this.updateSequenceUI();this.#dispatch("seq-play-stopped",{});const d=Math.max(20,Math.min(this.state.stepTime,200));this._tailTimer=setTimeout(()=>{this.#dispatch("seq-step-advance",{stepIndex:-1,index:-1,value:0,velocity:1,isLastStep:true});this._tailTimer=null;},d);}
}
customElements.define("seq-app",SeqApp);

// <step-sequencer> — 16 step buttons; dispatches 'step' with on/off per tick.
// Headless scheduling lives in Tone.Transport when attached.
class StepSequencer extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this.shadowRoot.innerHTML = `<style>
      .steps{display:grid;grid-template-columns:repeat(16,1fr);gap:6px}
      button{padding:8px 0;border:1px solid #212433;border-radius:8px;background:#0e1220;color:#e7e7f1}
      button[data-on="true"]{background:#13263a;border-color:#244b78}
    </style>
    <div class="steps"></div>`;
    this._stepsEl = this.shadowRoot.querySelector('.steps');
    this._pattern = new Array(16).fill(false);
    this._idx = -1;
    this._Tone = null;
    this._event = null;
    this._buildUI();
  }
  _buildUI(){
    this._stepsEl.innerHTML = '';
    for (let i=0;i<16;i++){
      const b = document.createElement('button');
      b.textContent = String(i+1).padStart(2,'0');
      b.dataset.on = 'false';
      b.addEventListener('click', ()=>{
        const v = (b.dataset.on!=='true');
        b.dataset.on = String(v);
        this._pattern[i] = v;
      });
      this._stepsEl.appendChild(b);
    }
  }
  attachTone(Tone){
    this._Tone = Tone;
    if (this._event) { this._event.dispose?.(); this._event = null; }
    const stepDur = '16n';
    this._event = this._Tone.Transport.scheduleRepeat((time)=>{
      this._idx = (this._idx + 1) % 16;
      const on = !!this._pattern[this._idx];
      // Dispatch event for the app
      this.dispatchEvent(new CustomEvent('step', { detail: { index:this._idx, on, time }, bubbles:true, composed:true }));
    }, stepDur);
  }
}
customElements.define('step-sequencer', StepSequencer);
export {};
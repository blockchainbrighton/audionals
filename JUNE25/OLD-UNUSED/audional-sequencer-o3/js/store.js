
/**
 * Simple observable store built on top of EventTarget.
 * Avoids external state libraries while providing pub/sub.
 */
class Store extends EventTarget {
  constructor(initialState) {
    super();
    this._state = structuredClone(initialState);
  }
  get state() {
    return this._state;
  }
  set(partial) {
    this._state = {...this._state, ...partial};
    this.dispatchEvent(new CustomEvent('update', {detail: this._state}));
  }
  update(path, value) {
    const keys = path.split('.');
    let obj = this._state;
    for (let i=0; i<keys.length-1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length-1]] = value;
    this.dispatchEvent(new CustomEvent('update', {detail: this._state}));
  }
}

const defaultChannel = () => ({
  id: crypto.randomUUID(),
  name: 'Channel',
  sampleUrl: null,
  buffer: null,
  steps: Array(64).fill(false),
  volume: 1,
  mute: false,
  solo: false,
  group: null,
  rate: 1,
  trimStart: 0,
  trimEnd: 1
});

const initialState = {
  bpm: 120,
  playing: false,
  currentStep: 0,
  channels: Array.from({length:16}, (_,i)=>({...defaultChannel(), name: 'Ch '+(i+1)})),
  sequences: [{name:'Seq 1', steps: []}],
  currentSequence: 0
};

export const store = new Store(initialState);

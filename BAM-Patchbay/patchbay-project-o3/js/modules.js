import { genId } from './utils.js';
// FIX: Revert to named imports, matching the .mjs build
import {
  setContext,
  getContext,
  start, // Although start is called in main.js, we list needed components here
  Oscillator,
  FeedbackDelay,
  EQ3
} from 'tone';

export class ModuleLoader {
  constructor(audioContext, patchbay) {
    this.audioContext = audioContext;
    this.patchbay = patchbay;

    // FIX: Use the imported getContext and setContext functions directly
    if (getContext() !== this.audioContext) {
        console.log("Setting Tone.js v15 context using imported setContext (.mjs)...");
        setContext(this.audioContext);
    } else {
        console.log("Tone.js v15 context already set.");
    }
  }

  async loadToneOscillator() {
    const id = genId();
    // FIX: Use the imported Oscillator class directly
    const osc = new Oscillator(440, 'sine').toDestination();
    osc.start();
    const gui = document.createElement('div');
    gui.innerHTML = '<p>Oscillator 440Hz</p>';
    const module = {
      id,
      name: 'Oscillator',
      audioNode: osc,
      gui,
      inputs: 0,
      outputs: 1,
      destroy() { osc.dispose(); }
    };
    this.patchbay.addModule(module);
    return module;
  }

  async loadToneDelay() {
    const id = genId();
    // FIX: Use the imported FeedbackDelay class directly
    const delay = new FeedbackDelay(0.25, 0.5).toDestination();
    const gui = document.createElement('div');
    gui.innerHTML = '<p>Delay</p>';
    const module = {
      id,
      name: 'Delay',
      audioNode: delay,
      gui,
      inputs: 1,
      outputs: 1,
      destroy() { delay.dispose(); }
    };
    this.patchbay.addModule(module);
    return module;
  }

  async loadToneEQ3() {
    const id = genId();
    // FIX: Use the imported EQ3 class directly
    const eq = new EQ3().toDestination();
    const gui = document.createElement('div');
    gui.innerHTML = '<p>EQ3</p>';
    const module = {
      id,
      name: 'EQ3',
      audioNode: eq,
      gui,
      inputs: 1,
      outputs: 1,
      destroy() { eq.dispose(); }
    };
    this.patchbay.addModule(module);
    return module;
  }

  // WAM loading remains unchanged
  async loadWamPlugin(url, name='WAM Plugin') {
    const id = genId();
    const { default: PluginFactory } = await import(url);
    const instance = await PluginFactory.createInstance(this.audioContext, {});
    const gui = await instance.createGui();

    try {
        if (instance.audioNode.numberOfOutputs > 0) {
           instance.audioNode.connect(this.audioContext.destination);
        }
    } catch(e) {
        console.warn(`Could not connect ${name} output to destination initially:`, e);
    }

    const module = {
      id,
      name,
      audioNode: instance.audioNode,
      gui,
      inputs: instance.audioNode.numberOfInputs > 0 ? 1 : 0,
      outputs: instance.audioNode.numberOfOutputs > 0 ? 1 : 0,
      destroy() { instance.destroy && instance.destroy(); }
    };
    this.patchbay.addModule(module);
    return module;
  }
}
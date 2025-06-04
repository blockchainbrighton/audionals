
import { store } from './store.js';
import { audioEngine } from './audioEngine.js';
import { sequencer } from './sequencer.js';
import { Utils } from './utils.js';

class UI {
  constructor() {
    this.root = document.getElementById('sequencer');
    this.sequenceSelect = document.getElementById('sequence-select');
    this.buildTracks();
    this.bindControls();

    // Observe store
    store.addEventListener('update', ()=>this.render());
  }

  buildTracks() {
    this.root.innerHTML = '';
    const {channels} = store.state;
    channels.forEach((ch, idx)=>{
      const track = document.createElement('div');
      track.className = 'track';
      track.dataset.channel = idx;

      const header = document.createElement('div');
      header.className = 'track-header';
      header.innerHTML = `<h4 contenteditable="true">${ch.name}</h4>
      <input type="file" accept="audio/*" data-file >
      <button data-mute>${ch.mute?'Unmute':'Mute'}</button>
      `;
      track.appendChild(header);

      for (let i=0;i<64;i++) {
        const btn = document.createElement('button');
        btn.className = 'step' + (ch.steps[i] ? ' on':'');
        btn.dataset.step = i;
        btn.addEventListener('click', ()=>{
          ch.steps[i] = !ch.steps[i];
          btn.classList.toggle('on', ch.steps[i]);
        });
        track.appendChild(btn);
      }
      // file upload
      header.querySelector('[data-file]').addEventListener('change', async e=>{
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        ch.sampleUrl = url;
        ch.buffer = await audioEngine.loadSample(url);
      });
      // mute
      header.querySelector('[data-mute]').addEventListener('click', e=>{
        ch.mute = !ch.mute;
        e.target.textContent = ch.mute ? 'Unmute':'Mute';
      });

      // editable name
      header.querySelector('h4').addEventListener('blur', e=>{
        ch.name = e.target.textContent.trim();
      });

      this.root.appendChild(track);
    });
  }

  bindControls() {
    document.getElementById('play').addEventListener('click', ()=>sequencer.start());
    document.getElementById('stop').addEventListener('click', ()=>sequencer.stop());

    document.getElementById('bpm').addEventListener('change', e=>{
      const bpm = Utils.clamp(parseInt(e.target.value,10),1,420);
      store.update('bpm', bpm);
    });

    // Save
    document.getElementById('save-project').addEventListener('click', ()=>{
      Utils.downloadJSON(store.state);
    });

    // Load
    document.getElementById('load-project-btn').addEventListener('click', ()=>{
      document.getElementById('load-project').click();
    });
    document.getElementById('load-project').addEventListener('change', async (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      const text = await Utils.readFileAsText(file);
      const obj = JSON.parse(text);
      // naive load state
      store.set(obj);
      this.buildTracks();
    });

    // sequences
    document.getElementById('add-seq').addEventListener('click', ()=>{
      const name = prompt('Sequence name','Seq '+(store.state.sequences.length+1));
      if (!name) return;
      store.state.sequences.push({name, steps: []});
      this.refreshSequenceSelect();
    });
    this.refreshSequenceSelect();
  }

  refreshSequenceSelect() {
    const sel = this.sequenceSelect;
    sel.innerHTML = '';
    store.state.sequences.forEach((seq, idx)=>{
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = seq.name;
      sel.appendChild(opt);
    });
    sel.value = store.state.currentSequence;
    sel.addEventListener('change', e=>{
      store.update('currentSequence', parseInt(e.target.value,10));
    });
  }

  render() {
    // highlight playhead
    const {currentStep} = store.state;
    document.querySelectorAll('.step.playing').forEach(el=>el.classList.remove('playing'));
    document.querySelectorAll(`[data-step='${currentStep}']`).forEach(el=>el.classList.add('playing'));
  }
}

export const ui = new UI();

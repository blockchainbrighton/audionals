import { appState, newChannel, newSequence } from './state.js';
import { renderSequencer } from './ui.js';
import { playSequencer, stopSequencer } from './audio.js';
import { saveProject, loadProject } from './project.js';

document.getElementById('play').addEventListener('click', playSequencer);
document.getElementById('stop').addEventListener('click', stopSequencer);
document.getElementById('bpm').addEventListener('input', e => {
  appState.bpm.set(Number(e.target.value));
  document.getElementById('bpm-display').textContent = e.target.value;
});
document.getElementById('save-project').addEventListener('click', saveProject);

function initDemo() {
  if (appState.channels.get().length === 0) {
    appState.channels.set([
      newChannel("Kick"),
      newChannel("Snare"),
      newChannel("Hat"),
      newChannel("Bass")
    ]);
    appState.sequences.set([
      newSequence("Seq 1", 4)
    ]);
  }
  renderSequencer();
}

appState.channels.subscribe(renderSequencer);

window.addEventListener('DOMContentLoaded', initDemo);

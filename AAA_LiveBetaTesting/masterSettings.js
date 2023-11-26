//masterSettings.js

const bpmSlider = document.getElementById('bpm-slider');
const bpmDisplay = document.getElementById('bpm-display');

let externalSyncBPM; // Initialize the cloned BPM variable

bpmSlider.addEventListener('input', () => {
  const newBPM = bpmSlider.value;
  bpmDisplay.textContent = newBPM;
  // console.log(`BPM changed to ${newBPM}`);

  // Update the cloned BPM variable and send to the external synth module
  externalSyncBPM = newBPM;
  window.externalSyncBPM = externalSyncBPM;
  // console.log(`External Sync BPM updated to ${externalSyncBPM}`);

  // Send BPM to external modules
  emitMessage('BPMUpdate', externalSyncBPM);

  // Update the global settings object
  window.unifiedSequencerSettings.updateSetting('projectBPM', newBPM);
});

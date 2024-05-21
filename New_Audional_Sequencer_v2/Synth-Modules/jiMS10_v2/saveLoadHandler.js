// saveLoadHandler.js

const SYNTH_CHANNEL = new URLSearchParams(window.location.search).get('channelIndex');

import { clearMidiRecording, addMidiRecording, getMidiRecording } from './midiRecording.js';
import { arpNotes, isArpeggiatorOn, startArpeggiator, stopArpeggiator } from './arpeggiator.js';
import { updateUIFromSettings } from './uiHandler.js';

const channelSettingsMap = new Map();

export function saveSettings() {
  const midiRecording = getMidiRecording(); // Now using getter function
  const settings = {
    channelIndex: SYNTH_CHANNEL,
    waveform: document.getElementById('waveform').value,
    attack: document.getElementById('attack').value,
    release: document.getElementById('release').value,
    cutoff: document.getElementById('cutoff').value,
    resonance: document.getElementById('resonance').value,
    volume: document.getElementById('volume').value,
    arpTempo: document.getElementById('arpTempo').value,
    arpPattern: document.getElementById('arpPattern').value,
    arpSpeed: document.getElementById('arpSpeed').value,
    useSequencerTiming: document.getElementById('useSequencerTiming').checked,
    timingAdjust: document.getElementById('timingAdjust').value,
    arpNotes: arpNotes,
    midiRecording: midiRecording // Retrieved via getter
  };

  const settingsJson = JSON.stringify(settings, null, 2);
  const blob = new Blob([settingsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Save the temporary URL to the map
  channelSettingsMap.set(SYNTH_CHANNEL, url);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `synth_settings_channel_${SYNTH_CHANNEL}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function loadSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const settings = JSON.parse(e.target.result);
    if (settings.channelIndex === SYNTH_CHANNEL) {
      loadSettingsFromObject(settings);
    } else {
      console.error(`Loaded settings do not match the current channel index: ${SYNTH_CHANNEL}`);
    }
  };
  reader.readAsText(file);
}

// Load settings directly from an object
export function loadSettingsFromObject(settings) {
  console.log('Loading settings from object:', settings);

  // UI update section
  document.getElementById('waveform').value = settings.waveform;
  document.getElementById('attack').value = settings.attack;
  document.getElementById('release').value = settings.release;
  document.getElementById('cutoff').value = settings.cutoff;
  document.getElementById('resonance').value = settings.resonance;
  document.getElementById('volume').value = settings.volume;
  document.getElementById('arpTempo').value = settings.arpTempo;
  document.getElementById('arpPattern').value = settings.arpPattern;
  document.getElementById('arpSpeed').value = settings.arpSpeed;
  document.getElementById('useSequencerTiming').checked = settings.useSequencerTiming;
  document.getElementById('timingAdjust').value = settings.timingAdjust;

  // Load arpeggiator notes and MIDI recordings
  arpNotes.length = 0;
  settings.arpNotes.forEach(note => arpNotes.push(note));

  clearMidiRecording();
  settings.midiRecording.forEach(event => addMidiRecording(event));

  if (isArpeggiatorOn) {
    stopArpeggiator();
    startArpeggiator();
  }

  updateUIFromSettings(settings);
}

document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('loadSettingsFile').addEventListener('change', loadSettings);
document.getElementById('loadSettingsButton').addEventListener('click', () => {
  document.getElementById('loadSettingsFile').click();
});


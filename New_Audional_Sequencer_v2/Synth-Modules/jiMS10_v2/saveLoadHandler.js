// saveLoadHandler.js
import { clearMidiRecording, addMidiRecording, getMidiRecording } from './midiRecording.js';
import { arpNotes, isArpeggiatorOn, startArpeggiator, stopArpeggiator } from './arpeggiator.js';
import { updateUIFromSettings } from './uiHandler.js';

const SYNTH_CHANNEL = new URLSearchParams(window.location.search).get('channelIndex');

const channelSettingsMap = new Map();

// Function to retrieve the current settings of the synthesizer
export function getCurrentSynthSettings() {
    return {
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
        timingAdjust: document.getElementById('timingAdjust').value,
        arpNotes: [...arpNotes],
        midiRecording: getMidiRecording()
    };
}

// Function to save current settings to a file
export function saveSettings() {
    const settings = getCurrentSynthSettings();
    const settingsJson = JSON.stringify(settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    channelSettingsMap.set(SYNTH_CHANNEL, url);

    const a = document.createElement('a');
    a.href = url;
    a.download = `synth_settings_channel_${SYNTH_CHANNEL}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Function to load settings from a file
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

// Function to apply loaded settings to the synthesizer
export function loadSettingsFromObject(settings) {
    console.log('Loading settings from object:', settings);

    // Update UI and system state from settings
    updateUIFromSettings(settings);
    arpNotes.splice(0, arpNotes.length, ...settings.arpNotes);
    clearMidiRecording();
    settings.midiRecording.forEach(event => addMidiRecording(event));

    if (isArpeggiatorOn) {
        stopArpeggiator();
        startArpeggiator();
    }
}

// Setup UI event listeners
document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('loadSettingsFile').addEventListener('change', loadSettings);
document.getElementById('loadSettingsButton').addEventListener('click', () => document.getElementById('loadSettingsFile').click());


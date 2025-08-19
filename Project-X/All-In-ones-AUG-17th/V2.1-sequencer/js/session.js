// Session Management Module - Save/Load Functionality
'use strict';

import { $, log } from './utils.js';
import { state } from './sequencer.js';
import { addChannel, renderAllGrids } from './channels.js';
import { renderSequenceButtons } from './sequences.js';
import { loadSampleFromSource, loadSynthFromSource } from './audio.js';

const saveStateBtn = $('#saveState');
const loadStateFile = $('#loadStateFile');
const copyStateBtn = $('#copyState');
const newSessionBtn = $('#newSession');
const sessionPanel = $('#sessionPanel');

// Session data management
export function makeSnapshot() {
  return {
    version: '1.0',
    bpm: state.bpm,
    numSequences: state.numSequences,
    activeSeq: state.activeSeq,
    continuous: state.continuous,
    channels: state.channels.map(ch => ({
      id: ch.id,
      type: ch.type,
      name: ch.name,
      isArmed: ch.isArmed,
      patterns: ch.patterns.map(p => 
        ch.type === 'sampler' ? Array.from(p) : p.map(notes => [...notes])
      ),
      sampleSource: ch.sampleSource,
      synthParams: ch.synthParams,
      synthModule: ch.synthModule
    }))
  };
}

export async function applySnapshot(snap) {
  if (!snap || typeof snap !== 'object') throw new Error('Invalid snapshot');
  
  // Clear current session
  newSession(false);
  
  // Apply basic settings
  state.bpm = snap.bpm || 120;
  $('#bpm').value = state.bpm;
  state.numSequences = snap.numSequences || 1;
  state.activeSeq = Math.min(snap.activeSeq || 0, state.numSequences - 1);
  state.continuous = !!snap.continuous;
  $('#continuousPlay').checked = state.continuous;
  
  // Restore channels
  if (Array.isArray(snap.channels)) {
    for (const chData of snap.channels) {
      const ch = addChannel(chData.type, chData);
      
      // Restore patterns
      if (Array.isArray(chData.patterns)) {
        ch.patterns = chData.patterns.map(p => 
          ch.type === 'sampler' ? new Uint8Array(p) : p.map(notes => [...notes])
        );
      }
      
      // Load audio sources
      if (chData.sampleSource && chData.sampleSource.type !== 'none') {
        await loadSampleFromSource(ch, chData.sampleSource);
      }
      if (chData.synthModule && chData.synthModule.type !== 'none') {
        await loadSynthFromSource(ch, chData.synthModule);
      }
    }
  }
  
  renderAllGrids(state.activeSeq);
  renderSequenceButtons();
  log('Session loaded successfully.');
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyJSONToClipboard(obj) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    log('Session JSON copied to clipboard.');
  } catch {
    log('Could not copy to clipboard.');
  }
}

export function newSession(doLog = true) {
  // Clear channels
  state.channels.forEach(ch => ch.ui.strip?.remove());
  state.channels.length = 0;
  state.channelById.clear();
  state.channelCounter = 0;
  
  // Reset sequences
  state.numSequences = 1;
  state.activeSeq = 0;
  state.queuedSeq = -1;
  state.continuous = false;
  $('#continuousPlay').checked = false;
  
  // Reset transport
  state.bpm = 120;
  $('#bpm').value = 120;
  
  renderSequenceButtons();
  if (doLog) log('New blank session.');
}

// Initialize session controls
export function initSession() {
  saveStateBtn.addEventListener('click', () => {
    downloadJSON(makeSnapshot(), 'poly-sequencer-session.json');
    log('Session downloaded.');
  });
  
  copyStateBtn.addEventListener('click', () => copyJSONToClipboard(makeSnapshot()));
  
  loadStateFile.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const snap = JSON.parse(await f.text());
      await applySnapshot(snap);
    } catch {
      log('Invalid JSON file.');
    } finally {
      e.target.value = '';
    }
  });
  
  newSessionBtn.addEventListener('click', () => {
    if (confirm('Start a new session?')) newSession(true);
  });

  // Drag and drop support
  const dz = sessionPanel;
  const on = () => dz.classList.add('drag');
  const off = () => dz.classList.remove('drag');
  
  ['dragenter', 'dragover'].forEach(ev => 
    dz.addEventListener(ev, e => { e.preventDefault(); on(); })
  );
  ['dragleave', 'drop'].forEach(ev => 
    dz.addEventListener(ev, e => { e.preventDefault(); off(); })
  );
  
  dz.addEventListener('drop', async (e) => {
    const file = [...(e.dataTransfer?.files || [])].find(f => 
      f.type === 'application/json' || f.name.endsWith('.json')
    );
    if (!file) {
      log('Drop a JSON session file.');
      return;
    }
    try {
      const snap = JSON.parse(await file.text());
      await applySnapshot(snap);
    } catch {
      log('Invalid JSON on drop.');
    }
  });
}


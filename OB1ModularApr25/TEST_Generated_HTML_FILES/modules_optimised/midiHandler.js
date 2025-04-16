// Module State
let midiAccess = null,
    selectedInputDevice = null,
    onNoteOnCallback = null,
    onNoteOffCallback = null,
    onStateChangeCallback = null;

// Constants
const NOTE_ON = 0x90,
      NOTE_OFF = 0x80;

// --- Private Helper Functions ---

const _onSuccess = access => {
  console.log("MIDI Handler: Successfully obtained MIDI access.");
  midiAccess = access;
  midiAccess.onstatechange = _onStateChange;
  _listInputsAndNotify();
};

const _onFailure = error => {
  console.error("MIDI Handler: Failed to get MIDI access.", error);
  onStateChangeCallback?.({
    status: 'error',
    message: `Failed to access MIDI devices: ${error.message}`,
    devices: []
  });
  midiAccess = null;
};

const _onStateChange = ({ port }) => {
  console.log(`MIDI Handler: State change for ${port.type} device "${port.name}". State: ${port.state}, Connection: ${port.connection}`);
  if (selectedInputDevice?.id === port.id && port.state === 'disconnected') {
    console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" disconnected.`);
    selectedInputDevice.onmidimessage = null;
    selectedInputDevice = null;
  }
  _listInputsAndNotify();
};

const _listInputsAndNotify = () => {
  if (!midiAccess) {
    console.warn("MIDI Handler: Cannot list inputs, MIDI access not available.");
    onStateChangeCallback?.({
      status: 'unavailable',
      message: 'MIDI Access not granted or unavailable.',
      devices: []
    });
    return;
  }
  const inputs = Array.from(midiAccess.inputs.values()).map(input => ({ id: input.id, name: input.name }));
  console.log(`MIDI Handler: Found ${inputs.length} MIDI input(s):`, inputs.map(i => i.name));
  onStateChangeCallback?.({
    status: 'ready',
    message: inputs.length ? 'MIDI devices available.' : 'MIDI access ready, but no input devices found.',
    devices: inputs
  });
};

const _handleMidiMessage = event => {
  if (!event.data || event.data.length < 3) return;
  const [status, note, velocity] = event.data,
        command = status & 0xf0;
  if (command === NOTE_ON) {
    velocity > 0 ? onNoteOnCallback?.(note, velocity) : onNoteOffCallback?.(note, velocity);
  } else if (command === NOTE_OFF) {
    onNoteOffCallback?.(note, velocity);
  }
};

// --- Public API ---

export const init = (noteOnCb, noteOffCb, stateChangeCb) => {
  onNoteOnCallback = noteOnCb;
  onNoteOffCallback = noteOffCb;
  onStateChangeCallback = stateChangeCb;

  if (navigator.requestMIDIAccess) {
    console.log("MIDI Handler: Requesting MIDI access...");
    navigator.requestMIDIAccess({ sysex: false }).then(_onSuccess, _onFailure);
  } else {
    console.warn("MIDI Handler: Web MIDI API not supported in this browser.");
    onStateChangeCallback?.({
      status: 'unsupported',
      message: 'Web MIDI API is not supported in this browser.',
      devices: []
    });
  }
};

export const selectDevice = deviceId => {
  if (!midiAccess) {
    console.error("MIDI Handler: Cannot select device, MIDI access not available.");
    return;
  }
  if (selectedInputDevice) {
    console.log(`MIDI Handler: Deselecting previous device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}).`);
    selectedInputDevice.onmidimessage = null;
    selectedInputDevice = null;
  }
  if (!deviceId) {
    console.log("MIDI Handler: No device selected (deselected).");
    return;
  }
  const newDevice = midiAccess.inputs.get(deviceId);
  if (newDevice) {
    selectedInputDevice = newDevice;
    selectedInputDevice.onmidimessage = _handleMidiMessage;
    console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}). Listening for messages...`);
  } else {
    console.error(`MIDI Handler: Could not find MIDI input device with ID "${deviceId}".`);
  }
};

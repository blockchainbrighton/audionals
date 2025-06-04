import { Observable } from './observer.js';
import { uid } from './utils.js';

// Central state management
export const appState = {
  bpm: new Observable(120),
  playing: new Observable(false),
  currentSeq: new Observable(0),
  theme: new Observable(localStorage.getItem('theme') || "default"),
  sequences: new Observable([]),
  channels: new Observable([]),
  presets: new Observable([]),
  status: new Observable('Ready.'),
};

export function newChannel(name = "Channel", sampleUrl = "") {
  return {
    id: uid(),
    name,
    sampleUrl,
    group: "",
    volume: 1,
    mute: false,
    solo: false,
    pitch: 1,
    trim: [0, 1],
    steps: Array.from({ length: 64 }, () => ({ on: false, reverse: false })),
    buffer: null,
    bufferReversed: null,
  };
}

export function newSequence(name = "Seq 1", channelCount = 16) {
  return {
    name,
    steps: Array.from({ length: channelCount }, () =>
      Array.from({ length: 64 }, () => ({ on: false, reverse: false }))
    ),
  };
}

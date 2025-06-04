import { appState } from './state.js';
import { downloadJSON } from './utils.js';

export function saveProject() {
  const data = {
    bpm: appState.bpm.get(),
    theme: appState.theme.get(),
    sequences: appState.sequences.get(),
    channels: appState.channels.get().map(({ buffer, bufferReversed, ...rest }) => rest)
  };
  downloadJSON(data, "audional-project.json");
}

export function loadProject(data) {
  try {
    appState.bpm.set(data.bpm ?? 120);
    appState.theme.set(data.theme ?? "default");
    appState.sequences.set(data.sequences ?? []);
    appState.channels.set(data.channels ?? []);
  } catch (e) {
    console.error("Failed to load project:", e);
  }
}

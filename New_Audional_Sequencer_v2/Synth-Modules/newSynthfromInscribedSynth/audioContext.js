export const context = new (window.AudioContext || window.webkitAudioContext)();
export let currentOscillator = null;

export function playMS10TriangleBass(frequency = null) {
  if (currentOscillator) {
    currentOscillator.stop();
    currentOscillator = null;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filterNode = context.createBiquadFilter();

  oscillator.type = document.getElementById('waveform').value;

  if (frequency === null) {
    frequency = parseFloat(document.getElementById('note').value);
    if (!isFinite(frequency)) {
      console.error('Invalid frequency value:', frequency);
      return;
    }
  }

  oscillator.frequency.setValueAtTime(frequency, context.currentTime);

  const attack = document.getElementById('attack').value / 1000;
  const release = document.getElementById('release').value / 1000;
  const cutoff = document.getElementById('cutoff').value;
  const resonance = document.getElementById('resonance').value;

  filterNode.type = 'lowpass';
  filterNode.frequency.value = cutoff;
  filterNode.Q.value = resonance;

  const volume = document.getElementById('volume').value / 100;
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + attack);
  gainNode.gain.linearRampToValueAtTime(0, context.currentTime + attack + release);

  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + attack + release);

  currentOscillator = oscillator;
}

export function stopMS10TriangleBass() {
  if (currentOscillator) {
    currentOscillator.stop();
    currentOscillator = null;
  }
}

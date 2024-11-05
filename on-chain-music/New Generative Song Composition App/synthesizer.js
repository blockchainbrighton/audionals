// synthesizer.js
export default class Synthesizer {
    constructor(audioContext) {
      this.audioContext = audioContext;
    }
  
    playNote(frequency, duration = 1, type = 'sawtooth', time = this.audioContext.currentTime, params = {}) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
  
      oscillator.type = type;
      oscillator.frequency.value = frequency;
  
      // Apply additional parameters
      if (params.detune) {
        oscillator.detune.value = params.detune;
      }
  
      if (params.filter) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = params.filter.type || 'lowpass';
        filter.frequency.value = params.filter.frequency || 1000;
        oscillator.connect(filter);
        filter.connect(gainNode);
      } else {
        oscillator.connect(gainNode);
      }
  
      // Envelope
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(1, time + 0.1); // Attack
      gainNode.gain.linearRampToValueAtTime(0, time + duration); // Release
  
      gainNode.connect(this.audioContext.destination);
  
      oscillator.start(time);
      oscillator.stop(time + duration);
    }
  }
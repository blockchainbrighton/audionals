// visor-js/heartbeat.js
export const HEARTBEAT_SETTINGS = { pitchMultiplier: .4, peakRatio: .5, speedMultiplier: 1, peakBaseFreq: 1100, volume: .2 };

export function beep(time, settings = HEARTBEAT_SETTINGS) {
  const audioCtx = window.fxAudioContext; if (!audioCtx) return;
  const S = settings.speedMultiplier, thump = { rampUp: .015 * S, hold: .09 * S, decay: .16 * S, fadeOut: .38 * S, duration: .4 * S }, snap = { delay: .13 * S, rampPeak: .18 * S, end: .27 * S, gainPeak: .155 * S, gainEnd: .28 * S, duration: .29 * S };
  const masterGain = audioCtx.createGain(); masterGain.gain.value = settings.volume ?? .4; masterGain.connect(audioCtx.destination);
  const thOsc = audioCtx.createOscillator(), thGain = audioCtx.createGain();
  thOsc.type = 'sine'; thOsc.frequency.setValueAtTime(80 * settings.pitchMultiplier, time);
  thGain.gain.setValueAtTime(0, time);
  thGain.gain.linearRampToValueAtTime(1.7, time + thump.rampUp);
  thGain.gain.linearRampToValueAtTime(1.1, time + thump.hold);
  thGain.gain.linearRampToValueAtTime(.5, time + thump.decay);
  thGain.gain.linearRampToValueAtTime(0, time + thump.fadeOut);
  thOsc.connect(thGain).connect(masterGain); thOsc.start(time); thOsc.stop(time + thump.duration);
  const snOsc = audioCtx.createOscillator(), snGain = audioCtx.createGain();
  snOsc.type = 'sine'; snOsc.frequency.setValueAtTime(480 * settings.pitchMultiplier, time + snap.delay);
  snOsc.frequency.linearRampToValueAtTime(settings.peakBaseFreq * settings.pitchMultiplier, time + snap.rampPeak);
  snOsc.frequency.linearRampToValueAtTime(320 * settings.pitchMultiplier, time + snap.end);
  snGain.gain.setValueAtTime(0, time + snap.delay);
  snGain.gain.linearRampToValueAtTime(1 * settings.peakRatio, time + snap.gainPeak);
  snGain.gain.linearRampToValueAtTime(0, time + snap.gainEnd);
  snOsc.connect(snGain).connect(masterGain); snOsc.start(time + snap.delay); snOsc.stop(time + snap.duration);
}

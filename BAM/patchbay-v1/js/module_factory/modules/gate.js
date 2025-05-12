// js/module_factory/modules/gate.js

import { createSlider, slider } from '../ui/slider.js';

export function createGateModule(audioCtx, parentEl, id) {
    const input = audioCtx.createGain();    // Module's main I/O node
    const output = audioCtx.createGain();   // Internal summing node
  
    const gateGain = audioCtx.createGain(); // The actual gain node acting as the gate
    const analyserNode = audioCtx.createAnalyser();
    
    analyserNode.fftSize = 256; // Smaller for faster response, less detail needed
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength); // For amplitude, not frequency
  
    let animationFrameId = null;
    let currentThreshold = -50; // dB
    let attackTime = 0.01;
    let releaseTime = 0.05;
    let isGateOpen = false;
  
    // Path: input -> analyser -> gateGain -> output
    input.connect(analyserNode);
    analyserNode.connect(gateGain);
    gateGain.connect(output);
  
    // Default to fully wet, input.gain should be 0 to not bypass the gate.
    input.gain.value = 0; // No direct pass-through.
    gateGain.gain.value = 0; // Start closed
  
    // Mixed signal back to input
    output.connect(input);
    
    function processAudioLevel() {
      analyserNode.getByteTimeDomainData(dataArray); // More direct level measure
      let sumSquares = 0.0;
      for (let i = 0; i < bufferLength; i++) {
        const normSample = (dataArray[i] / 128.0) - 1.0; // Normalize -1 to 1
        sumSquares += normSample * normSample;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      const db = 20 * Math.log10(rms || 0.00001); // avoid log(0)
  
      const now = audioCtx.currentTime;
      if (db > currentThreshold) {
        if (!isGateOpen) {
          gateGain.gain.cancelScheduledValues(now);
          gateGain.gain.setTargetAtTime(1.0, now, attackTime);
          isGateOpen = true;
        }
      } else {
        if (isGateOpen) {
          gateGain.gain.cancelScheduledValues(now);
          gateGain.gain.setTargetAtTime(0.0, now, releaseTime);
          isGateOpen = false;
        }
      }
      animationFrameId = requestAnimationFrame(processAudioLevel);
    }
  
    processAudioLevel();
  
    parentEl.innerHTML = `<h3>Gate ${id}</h3>`;
    slider(parentEl, 'Threshold (dB)', -100, 0, currentThreshold, 1, v => currentThreshold = v);
    slider(parentEl, 'Attack (s)', 0.001, 0.5, attackTime, 0.001, v => attackTime = v);
    slider(parentEl, 'Release (s)', 0.01, 1, releaseTime, 0.01, v => releaseTime = v);
  
    return {
      id,
      audioNode: input,
      // LFO might not make sense for these control parameters, but could be exposed
      // gateThreshold: { set value(v) { currentThreshold = v; } }, // Example for LFO, careful with direct property access
      dispose() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        input.disconnect();
        output.disconnect();
        analyserNode.disconnect();
        gateGain.disconnect();
        parentEl.replaceChildren();
        console.log(`[Gate ${id}] disposed`);
      }
    };
  }
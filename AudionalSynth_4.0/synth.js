// synth.js


function createOscillator(audioContext, frequency, type, detune = 0) {
    let oscillator = audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.detune.setValueAtTime(detune, audioContext.currentTime);
    return oscillator;
}

function createFilter(audioContext) {
    let filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = document.getElementById("cutoff").value;
    filter.Q.value = document.getElementById("resonance").value;
    return filter;
}

function configureEnvelope(audioContext, gainNode) {
    let attackTime = document.getElementById("attack").value / 1000;
    let releaseTime = document.getElementById("release").value / 1000;
    let sustainLevel = 0.5; // Adjust as needed
    let currentTime = audioContext.currentTime;

    // Smoothly ramp up
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, currentTime + attackTime);

    // Maintain sustain
    gainNode.gain.setValueAtTime(sustainLevel, currentTime + attackTime);
    
    // Smoothly ramp down
    gainNode.gain.linearRampToValueAtTime(0, currentTime + attackTime + releaseTime);
}

function playMS10TriangleBass(audioContext, frequency, gainManager) {
    // Clear previous oscillators if any
    if (audioContext.currentOscillator) {
        audioContext.currentOscillator.forEach(osc => osc.stop(audioContext.currentTime));
    }
    audioContext.currentOscillator = [];

    // Create oscillators
    let primaryOscillator = createOscillator(audioContext, frequency, document.getElementById("waveform").value);
    let subOscillator = createOscillator(audioContext, frequency / 2, 'sine');
    let detuneOscillator = createOscillator(audioContext, frequency, document.getElementById("waveform").value, 10);

    // Create and configure filter
    let filter = createFilter(audioContext);

    // Create a gain node for envelope control
    let envelopeGainNode = audioContext.createGain();

    // Configure the envelope on the gain node
    configureEnvelope(audioContext, envelopeGainNode);

    // Connect oscillators to filter, then filter to envelope gain node
    [primaryOscillator, subOscillator, detuneOscillator].forEach(osc => {
        osc.connect(filter);
        audioContext.currentOscillator.push(osc); // Store oscillators to manage later
    });

      // LFO Setup
      let lfoSwitch = document.getElementById('lfoSwitch').checked;
      let lfoRate = parseFloat(document.getElementById('lfoRate').value);
      
      if (lfoSwitch) {
          let lfo = audioContext.createOscillator();
          let lfoGain = audioContext.createGain();
          
          // Configure LFO rate and gain
          lfo.frequency.setValueAtTime(lfoRate, audioContext.currentTime); // LFO frequency determines the "wobble" speed
          lfoGain.gain.setValueAtTime(frequency / 30, audioContext.currentTime); // Adjust depth of the wobble effect
          
          // Connect LFO
          lfo.connect(lfoGain);
          lfoGain.connect(primaryOscillator.frequency); // Apply to primary oscillator frequency
          lfoGain.connect(subOscillator.frequency); // Optionally, apply to sub oscillator
          lfoGain.connect(detuneOscillator.frequency); // Optionally, apply to detuned oscillator
          
          lfo.start();
      }

    // Continue the audio node chain
    filter.connect(envelopeGainNode);
    envelopeGainNode.connect(gainManager.inputGain); // Connect envelope gain node to GainManager's inputGain

    // Connect GainManager to audio context destination or next node in the chain
    gainManager.connect(audioContext.destination);

    // Start oscillators
    audioContext.currentOscillator.forEach(osc => osc.start());
}


export { playMS10TriangleBass, createOscillator, createFilter, configureEnvelope };

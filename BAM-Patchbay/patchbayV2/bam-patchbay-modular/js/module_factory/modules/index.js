// js/modules/index.js

export const MODULE_DEFS = {
    oscillator: {
      // Uniform factory signature: (audioCtx, parentEl, id) => Promise<moduleData>
      create: (audioCtx, parentEl, id) =>
        import('./oscillator.js')
          .then(m => m.createOscillatorModule(audioCtx, parentEl, id)),
      hasIn: false,
      hasOut: true,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: {}  // Oscillator doesn’t accept LFO
    },
  
    gain: {
      create: (audioCtx, parentEl, id) =>
        import('./gain.js')
          .then(m => m.createGainModule(audioCtx, parentEl, id)),
      hasIn: true,
      hasOut: true,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: { gain: 'gain' }
    },
  
    filter: {
      create: (audioCtx, parentEl, id) =>
        import('./filter.js')
          .then(m => m.createFilterModule(audioCtx, parentEl, id)),
      hasIn: true,
      hasOut: true,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: { frequency: 'frequency', Q: 'Q' }
    },
  
    lfo: {
      create: (audioCtx, parentEl, id) =>
        import('./lfo.js')
          .then(m => m.createLfoModule(audioCtx, parentEl, id)),
      hasIn: false,
      hasOut: false,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: {}  // LFOs don’t host other LFOs
    },
  
    samplePlayer: {
      create: (_audioCtx, parentEl, id) =>
        import('./sample_player.js')
          .then(m => m.createSamplePlayerModule(parentEl, id)),
      hasIn: false,
      hasOut: true,
      hasTriggerIn: true,
      hasTriggerOut: false,
      lfoTargets: {}
    },
  
    sequencer: {
      create: (_audioCtx, parentEl, id) =>
        import('./sequencer.js')
          .then(m => m.createSequencerModule(parentEl, id)),
      hasIn: false,
      hasOut: false,
      hasTriggerIn: false,
      hasTriggerOut: true,
      lfoTargets: {}
    },
  
    bpmClock: {
      create: (_audioCtx, parentEl, id) =>
        import('./bpm_clock.js')
          .then(m => m.createBpmClockModule(parentEl, id)),
      hasIn: false,
      hasOut: false,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: {}
    },
  
    output: {
        // Change the first parameter name from _audioCtx to audioCtx
        create: (audioCtx, _parentEl, _id) =>
          // Now, this 'audioCtx' correctly refers to the AudioContext instance
          // passed from audio_component_factory.js
          Promise.resolve({ audioNode: audioCtx.destination }),
        hasIn: true,
        hasOut: false,
        hasTriggerIn: false,
        hasTriggerOut: false,
        lfoTargets: {}
      }
  };
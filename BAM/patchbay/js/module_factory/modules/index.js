// js/modules/index.js
import { makeLoader } from './utils.js';


export const MODULE_DEFS = {
  oscillator: {
    create: makeLoader('oscillator', 'createOscillatorModule'),
    hasIn: false,
    hasOut: true,
    hasTriggerIn: false,
    hasTriggerOut: false,
    lfoTargets: { Frequency: 'params.frequency', Detune: 'params.detune' } // Corrected path
  },
  gain: {
    create: makeLoader('gain', 'createGainModule'),
    hasIn: true,
    hasOut: true,
    hasTriggerIn: false,
    hasTriggerOut: false,
    lfoTargets: { gain: 'params.gain' } // Assuming gain module now returns params.gain
  },
  
    filter: {
      create: (audioCtx, parentEl, id) =>
        import('./filter.js')
          .then(m => m.createFilterModule(audioCtx, parentEl, id)),
      hasIn: true,
      hasOut: true,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: { frequency: 'params.frequency', Q: 'params.q', gain: 'params.gain' } // Corrected paths
    },
  
    lfo: {
      create: (audioCtx, parentEl, id) =>
        import('./lfo.js')
          .then(m => m.createLfoModule(audioCtx, parentEl, id)),
      hasIn: false,
      hasOut: true,
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
        import('../../../UNUSED/bpm_clock.js')
          .then(m => m.createBpmClockModule(parentEl, id)),
      hasIn: false,
      hasOut: false,
      hasTriggerIn: false,
      hasTriggerOut: false,
      lfoTargets: {}
    },

    delay: {
        create: (ctx, el, id) => import('./delay.js').then(m => m.createDelayModule(ctx, el, id)),
        hasIn: true, hasOut: true,
        hasTriggerIn: false, hasTriggerOut: false,
        lfoTargets: { wet: 'params.wetGain', dry: 'params.dryGain' } // <--- CORRECTED PATHS
      },

      reverb: {
        create: (ctx, el, id) => import('./reverb.js').then(m => m.createReverbModule(ctx, el, id)),
        hasIn: true, hasOut: true,
        hasTriggerIn: false, hasTriggerOut: false,
        lfoTargets: { wet: 'wetGain', dry: 'dryGain' /*, decayAp1: 'ap1Feedback' */ }
      },


        compressor: {
        create: (ctx, el, id) => import('./compressor.js').then(m => m.createCompressorModule(ctx, el, id)),
        hasIn: true, hasOut: true,
        hasTriggerIn: false, hasTriggerOut: false,
        lfoTargets: { threshold: 'params.threshold', ratio: 'params.ratio', makeup: 'params.makeup' } // Corrected paths
      },

      gate: {
        create: (ctx, el, id) => import('./gate.js').then(m => m.createGateModule(ctx, el, id)),
        hasIn: true, hasOut: true,
        hasTriggerIn: false, hasTriggerOut: false,
        lfoTargets: null // LFO controlling threshold would be tricky due to JS involvement; could add dummy AudioParam if needed
      },


      arpeggiator: {
        create: (ctx, el, id) => import('./arpeggiator.js')
          .then(m => m.createArpeggiatorModule(ctx, el, id)),
        hasIn: false,
        hasOut: true,       // Crucially, its audioNode outputs the pitch control signal
        hasTriggerIn: false,
        hasTriggerOut: true,
        lfoTargets: { bpm: 'params.paramsForLfo.rate' } // Assuming arpeggiator returns { ..., params: { paramsForLfo: { rate: ... } } }
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
        lfoTargets: null // Or undefined. An empty object {} was causing the issue.
      }
  };
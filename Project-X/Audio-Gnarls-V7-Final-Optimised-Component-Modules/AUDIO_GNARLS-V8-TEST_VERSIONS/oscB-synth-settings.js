// File: oscB-synth-settings.js

/**
 * Stateless audio synth generator for oscilloscope.
 * No global state. You control lifecycle and wiring.
 */

export function generateSynthSettings(Tone) {
    // -- Utility --
    const randRange = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(randRange(min, max + 1));
    const randChoice = arr => arr[Math.floor(Math.random() * arr.length)];
  
    // -- Musical scales --
    const scales = {
      pentatonic: ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5'],
      minor:     ['A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4'],
      dorian:    ['C3','D3','Eb3','F3','G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5']
    };
  
    const scale = randChoice(Object.values(scales));
    const note = randChoice(scale);
    const oscTypes = ['sine', 'square', 'sawtooth', 'triangle'];
    const filterTypes = ['lowpass', 'highpass', 'bandpass'];
  
    // -- Main synth nodes --
    const masterVolume = new Tone.Volume(-12);
    const filter = new Tone.Filter({
      type: randChoice(filterTypes),
      frequency: randRange(300,4000),
      rolloff: -24,
      Q: randRange(1,10)
    });
  
    // -- Oscillators (1–2, sometimes in harmony) --
    const oscillators = [
      new Tone.Oscillator({
        type: randChoice(oscTypes),
        frequency: note,
        volume: -6
      }).start()
    ];
    if (Math.random() > 0.4) {
      oscillators.push(
        new Tone.Oscillator({
          type: randChoice(oscTypes),
          frequency: randChoice(scale),
          volume: -10,
          detune: randRange(-20, 20)
        }).start()
      );
    }
  
    // -- LFOs (1–2, random targets) --
    const lfos = [];
    for(let i=0; i<randInt(1,2); ++i) {
      const lfoType = randChoice(oscTypes),
            lfoFreq = randRange(0.01,1.5);
      const targets = [
        {target: filter.frequency, min: randRange(200,1000), max: randRange(1000,8000)},
        oscillators[1] && {target: oscillators[1].detune, min: randRange(-50,-5), max: randRange(5,50)},
        {target: masterVolume.volume, min: randRange(-15,-1), max: randRange(1,3)}
      ].filter(Boolean);
      const trg = randChoice(targets);
      const lfo = new Tone.LFO({
        type: lfoType,
        frequency: lfoFreq,
        min: trg.min,
        max: trg.max,
        amplitude: 1
      }).start();
      lfo.connect(trg.target);
      lfos.push(lfo);
    }
  
    // -- Phaser (optional) --
    const phaser = Math.random() > 0.6
      ? new Tone.Phaser({
          frequency: randRange(0.1, 2),
          octaves: randRange(2, 6),
          baseFrequency: randRange(200, 1000)
        })
      : null;
  
    // -- Output object (You must connect as you wish) --
    return {
      masterVolume, // Tone.Volume node (output here to analyser/destination)
      oscillators,  // Array of Tone.Oscillator
      filter,       // Tone.Filter node
      lfos,         // Array of Tone.LFO
      phaser        // Tone.Phaser (may be null)
    };
  }
  
  // --- Convenience: connect and dispose helpers ---
  
  /**
   * Connects the synth settings to an analyser node and (optionally) destination.
   * Returns { analyser }.
   */
  export function wireSynthSettings({oscillators, filter, masterVolume, phaser}, Tone, analyser=null, connectToDestination=true) {
    // Connect oscillators -> filter
    oscillators.forEach(o => o.connect(filter));
    let last = filter;
    if (phaser) { last.connect(phaser); last = phaser; }
    last.connect(masterVolume);
    // Setup analyser if not provided
    if (!analyser) {
      analyser = Tone.context.createAnalyser();
      analyser.fftSize = 2048;
    }
    masterVolume.connect(analyser);
    if (connectToDestination)
      masterVolume.toDestination();
    return { analyser };
  }
  
  /**
   * Dispose all synth objects.
   */
  export function disposeSynthSettings({oscillators, filter, masterVolume, lfos, phaser}) {
    if (oscillators) oscillators.forEach(o => { try{o.stop();o.dispose();}catch{} });
    if (filter) try{filter.dispose();}catch{};
    if (masterVolume) try{masterVolume.dispose();}catch{};
    if (lfos) lfos.forEach(l => { try{l.stop();l.dispose();}catch{} });
    if (phaser) try{phaser.dispose();}catch{};
  }
  
  
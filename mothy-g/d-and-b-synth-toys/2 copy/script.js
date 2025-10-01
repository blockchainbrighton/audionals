// Global Tone.js setup
const masterVolume = new Tone.Volume(-6).toDestination();

// Global controls
const tempoSlider = document.getElementById('tempo');
const tempoValue = document.getElementById('tempo-value');
const recordButton = document.getElementById('record');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');

// Wobble Bass Station
const lfoRateSlider = document.getElementById('lfo-rate');
const lfoDepthSlider = document.getElementById('lfo-depth');
const filterCutoffSlider = document.getElementById('filter-cutoff');
const filterResonanceSlider = document.getElementById('filter-resonance');
const playWobbleButton = document.getElementById('play-wobble');
const wobbleSynth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, release: 0.2 },
    filter: { type: 'lowpass', frequency: 1000, rolloff: -24, Q: 5 }
}).connect(masterVolume);
const lfo = new Tone.LFO(5, 200, 2000).connect(wobbleSynth.filter.frequency);

// Amen Break Slicer
const slicerPads = document.getElementById('slicer-pads');
const slicerPitchSlider = document.getElementById('slicer-pitch');
const player = new Tone.Player('https://archive.org/download/amen-break-16-bit-wav/Amen%20Break%2016%20Bit.wav', () => {
    // Player is loaded
}).connect(masterVolume);

// Reese Bass Generator
const detuneSlider = document.getElementById('detune');
const reeseFilterSlider = document.getElementById('reese-filter');
const octaveSelect = document.getElementById('octave');
const reeseKeys = document.getElementById('reese-keys');
const reeseSynth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, release: 0.2 },
    filter: { type: 'lowpass', frequency: 1000, rolloff: -24 }
}).connect(masterVolume);
const reeseSynth2 = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, release: 0.2 },
    filter: { type: 'lowpass', frequency: 1000, rolloff: -24 }
}).connect(masterVolume);
reeseSynth2.detune.value = 10;

// Atmospheric Pad Machine
const attackSlider = document.getElementById('attack');
const releaseSlider = document.getElementById('release');
const padFilterSlider = document.getElementById('pad-filter');
const reverbSlider = document.getElementById('reverb');
const chordButtons = document.getElementById('chord-buttons');
const padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.5, release: 1 },
}).connect(masterVolume);
const reverb = new Tone.Reverb(1.5).connect(masterVolume);
padSynth.connect(reverb);

// Sub-Kick & Snare Module
const kickPad = document.getElementById('kick-pad');
const snarePad = document.getElementById('snare-pad');
const kickDecaySlider = document.getElementById('kick-decay');
const snareSnapSlider = document.getElementById('snare-snap');
const drumPitchSlider = document.getElementById('drum-pitch');
const kick = new Tone.MembraneSynth().connect(masterVolume);
const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
}).connect(masterVolume);

// Recording
let recording = false;
let recordedEvents = [];
let startTime;

// Event Listeners

// Global
tempoSlider.addEventListener('input', e => {
    Tone.Transport.bpm.value = e.target.value;
    tempoValue.textContent = e.target.value;
});

recordButton.addEventListener('click', () => {
    recording = !recording;
    recordButton.textContent = recording ? 'Stop Recording' : 'Record';
    if (recording) {
        recordedEvents = [];
        startTime = Tone.now();
    }
});

playButton.addEventListener('click', () => {
    Tone.Transport.start();
    recordedEvents.forEach(event => {
        if (event.type === 'note') {
            const synth = eval(event.synth);
            synth.triggerAttackRelease(event.note, event.duration, event.time);
        } else if (event.type === 'sample') {
            player.start(event.time, event.offset, event.duration);
        }
    });
});

stopButton.addEventListener('click', () => {
    Tone.Transport.stop();
});

// Wobble Bass
playWobbleButton.addEventListener('click', () => {
    if (wobbleSynth.state === 'stopped') {
        wobbleSynth.triggerAttack('C2');
        lfo.start();
    } else {
        wobbleSynth.triggerRelease();
        lfo.stop();
    }
});

lfoRateSlider.addEventListener('input', e => lfo.frequency.value = e.target.value);
lfoDepthSlider.addEventListener('input', e => lfo.amplitude.value = e.target.value);
filterCutoffSlider.addEventListener('input', e => wobbleSynth.filter.frequency.value = e.target.value);
filterResonanceSlider.addEventListener('input', e => wobbleSynth.filter.Q.value = e.target.value);

// Amen Break Slicer
for (let i = 0; i < 16; i++) {
    const pad = document.createElement('button');
    slicerPads.appendChild(pad);
    pad.addEventListener('click', () => {
        const offset = i * (player.buffer.duration / 16);
        const duration = player.buffer.duration / 16;
        player.start(Tone.now(), offset, duration);
        if (recording) recordedEvents.push({ type: 'sample', offset, duration, time: Tone.now() - startTime });
    });
}
slicerPitchSlider.addEventListener('input', e => player.playbackRate = Math.pow(2, e.target.value / 12));

// Reese Bass
reeseKeys.addEventListener('click', e => {
    if (e.target.matches('button')) {
        const note = e.target.dataset.note + octaveSelect.value;
        reeseSynth.triggerAttackRelease(note, '8n');
        reeseSynth2.triggerAttackRelease(note, '8n');
        if (recording) recordedEvents.push({ type: 'note', synth: 'reeseSynth', note, duration: '8n', time: Tone.now() - startTime });
    }
});
detuneSlider.addEventListener('input', e => reeseSynth2.detune.value = e.target.value);
reeseFilterSlider.addEventListener('input', e => {
    reeseSynth.filter.frequency.value = e.target.value;
    reeseSynth2.filter.frequency.value = e.target.value;
});

// Atmospheric Pad
chordButtons.addEventListener('click', e => {
    if (e.target.matches('button')) {
        const chord = e.target.dataset.chord.split(', ');
        padSynth.triggerAttackRelease(chord, '2n');
        if (recording) recordedEvents.push({ type: 'note', synth: 'padSynth', note: chord, duration: '2n', time: Tone.now() - startTime });
    }
});
attackSlider.addEventListener('input', e => padSynth.set({ envelope: { attack: parseFloat(e.target.value) } }));
releaseSlider.addEventListener('input', e => padSynth.set({ envelope: { release: parseFloat(e.target.value) } }));
padFilterSlider.addEventListener('input', e => padSynth.set({ filter: { frequency: e.target.value } }));
reverbSlider.addEventListener('input', e => reverb.wet.value = e.target.value);

// Drums
kickPad.addEventListener('click', () => {
    kick.triggerAttackRelease('C1', '8n');
    if (recording) recordedEvents.push({ type: 'note', synth: 'kick', note: 'C1', duration: '8n', time: Tone.now() - startTime });
});

snarePad.addEventListener('click', () => {
    snare.triggerAttackRelease('8n');
    if (recording) recordedEvents.push({ type: 'note', synth: 'snare', note: null, duration: '8n', time: Tone.now() - startTime });
});

kickDecaySlider.addEventListener('input', e => kick.envelope.decay = parseFloat(e.target.value));
snareSnapSlider.addEventListener('input', e => snare.envelope.decay = parseFloat(e.target.value));
drumPitchSlider.addEventListener('input', e => {
    kick.pitch = parseInt(e.target.value);
    snare.pitch = parseInt(e.target.value);
});
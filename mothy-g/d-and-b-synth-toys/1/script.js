document.addEventListener('DOMContentLoaded', () => {
    const startStopButton = document.getElementById('start-stop');
    const tempoSlider = document.getElementById('tempo');
    const tempoValue = document.getElementById('tempo-value');
    const recordButton = document.getElementById('record');
    const stopRecordButton = document.getElementById('stop-record');
    const playbackElement = document.getElementById('playback');
    const downloadLink = document.getElementById('download-link');

    let isPlaying = false;
    let mediaRecorder;
    let recordedChunks = [];

    // Global Transport
    startStopButton.addEventListener('click', async () => {
        await Tone.start();
        if (isPlaying) {
            Tone.Transport.stop();
            startStopButton.textContent = 'Start';
        } else {
            Tone.Transport.start();
            startStopButton.textContent = 'Stop';
        }
        isPlaying = !isPlaying;
    });

    tempoSlider.addEventListener('input', (e) => {
        Tone.Transport.bpm.value = e.target.value;
        tempoValue.textContent = e.target.value;
    });

    // Recording
    const dest = Tone.context.createMediaStreamDestination();
    Tone.getDestination().connect(dest);

    recordButton.addEventListener('click', () => {
        mediaRecorder = new MediaRecorder(dest.stream);
        mediaRecorder.start();
        recordedChunks = [];
        recordButton.disabled = true;
        stopRecordButton.disabled = false;

        mediaRecorder.ondataavailable = (e) => {
            recordedChunks.push(e.data);
        };
    });

    stopRecordButton.addEventListener('click', () => {
        mediaRecorder.stop();
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { 'type' : 'audio/ogg; codecs=opus' });
            const audioURL = URL.createObjectURL(blob);
            playbackElement.src = audioURL;
            downloadLink.href = audioURL;
            downloadLink.download = 'recording.ogg';
            downloadLink.style.display = 'inline';
        };
        recordButton.disabled = false;
        stopRecordButton.disabled = true;
    });


    // --- 1. Wobble Bass Generator ---
    const wobbleSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 0.8 },
    }).toDestination();

    const wobbleFilter = new Tone.Filter(1000, 'lowpass').toDestination();
    wobbleSynth.connect(wobbleFilter);

    const wobbleLFO = new Tone.LFO('8n', 100, 1000).start();
    wobbleLFO.connect(wobbleFilter.frequency);

    document.getElementById('wobble-rate').addEventListener('change', e => wobbleLFO.frequency.value = e.target.value);
    document.getElementById('wobble-depth').addEventListener('input', e => wobbleLFO.max = +e.target.value);
    document.getElementById('wobble-cutoff').addEventListener('input', e => wobbleFilter.frequency.value = +e.target.value);
    document.getElementById('wobble-resonance').addEventListener('input', e => wobbleFilter.Q.value = +e.target.value);
    document.getElementById('wobble-waveform').addEventListener('change', e => wobbleSynth.oscillator.type = e.target.value);
    document.getElementById('wobble-trigger').addEventListener('mousedown', () => wobbleSynth.triggerAttack('C2'));
    document.getElementById('wobble-trigger').addEventListener('mouseup', () => wobbleSynth.triggerRelease());


    // --- 2. Breakbeat Chopper ---
    let breakPlayer;
    const breakFilter = new Tone.Filter(10000, 'lowpass').toDestination();
    const breakPadsContainer = document.getElementById('break-pads');

    document.getElementById('breakbeat-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        breakPlayer = new Tone.Player(url, () => {
             for(let i = 0; i < 16; i++) {
                const pad = document.createElement('div');
                pad.className = 'break-pad';
                pad.addEventListener('click', () => {
                    const chaos = document.getElementById('break-chaos').value / 100;
                    const startTime = Math.random() * (breakPlayer.buffer.duration - 0.2);
                    const duration = Math.random() * 0.5 + 0.1;
                    const rate = 1 + (Math.random() - 0.5) * chaos;
                    breakPlayer.playbackRate = rate;
                    breakPlayer.start(Tone.now(), chaos > 0 ? startTime : (i/16) * breakPlayer.buffer.duration, duration);
                });
                breakPadsContainer.appendChild(pad);
            }
        }).toDestination();
        breakPlayer.connect(breakFilter);
    });
     document.getElementById('break-rate').addEventListener('input', e => {
        if(breakPlayer) breakPlayer.playbackRate = +e.target.value;
     });
     document.getElementById('break-filter').addEventListener('input', e => breakFilter.frequency.value = +e.target.value);


    // --- 3. Reese Bass Drone ---
    const reeseOsc1 = new Tone.Oscillator('C2', 'sawtooth').start();
    const reeseOsc2 = new Tone.Oscillator('C2', 'sawtooth').start();
    const subOsc = new Tone.Oscillator('C1', 'sine').start();
    const reeseFilter = new Tone.Filter(800, 'lowpass').toDestination();
    const subGain = new Tone.Gain(0.5).connect(reeseFilter);

    reeseOsc1.connect(reeseFilter);
    reeseOsc2.connect(reeseFilter);
    subOsc.connect(subGain);

    document.getElementById('reese-detune').addEventListener('input', e => reeseOsc2.detune.value = +e.target.value);
    document.getElementById('reese-cutoff').addEventListener('input', e => reeseFilter.frequency.value = +e.target.value);
    document.getElementById('reese-resonance').addEventListener('input', e => reeseFilter.Q.value = +e.target.value);
    document.getElementById('reese-sub-mix').addEventListener('input', e => subGain.gain.value = +e.target.value);
    document.getElementById('reese-trigger').addEventListener('mousedown', () => {
        reeseOsc1.volume.rampTo(0, 0.05);
        reeseOsc2.volume.rampTo(0, 0.05);
        subOsc.volume.rampTo(-6, 0.05);
    });
    document.getElementById('reese-trigger').addEventListener('mouseup', () => {
       reeseOsc1.volume.rampTo(-Infinity, 0.5);
       reeseOsc2.volume.rampTo(-Infinity, 0.5);
       subOsc.volume.rampTo(-Infinity, 0.5);
    });


    // --- 4. Atmospheric Pad Machine ---
    const padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: { attack: 1, decay: 0.5, sustain: 0.8, release: 2 },
    });
    const padReverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).toDestination();
    const padDelay = new Tone.PingPongDelay('4n', 0.5).connect(padReverb);
    const padFilter = new Tone.Filter(2000, 'lowpass').connect(padDelay);
    const padLFO = new Tone.LFO('1m', 200, 2200).start().connect(padFilter.frequency);
    padSynth.connect(padFilter);

    document.getElementById('pad-space').addEventListener('input', e => padReverb.wet.value = +e.target.value);
    document.getElementById('pad-echoes').addEventListener('input', e => padDelay.feedback.value = +e.target.value);
    document.getElementById('pad-filter').addEventListener('input', e => padFilter.frequency.value = +e.target.value);
    document.getElementById('pad-lfo-depth').addEventListener('input', e => padLFO.max = +e.target.value);

    document.addEventListener('keydown', e => {
        if(e.key === 'c') padSynth.triggerAttack('C4');
        if(e.key === 'd') padSynth.triggerAttack('G4');
        if(e.key === 'e') padSynth.triggerAttack('A#4');
        if(e.key === 'f') padSynth.triggerAttack('F4');
    });
     document.addEventListener('keyup', e => {
        if(e.key === 'c' || e.key === 'd' || e.key === 'e' || e.key === 'f') padSynth.triggerReleaseAll();
    });


    // --- 5. Glitch Percussion Sequencer ---
    const kick = new Tone.MembraneSynth().toDestination();
    const noise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
    });
    const noiseFilter = new Tone.Filter(2000, 'highpass').toDestination();
    noise.connect(noiseFilter);

    const sequencerGrid = document.getElementById('sequencer-grid');
    const steps = [];
    for (let i = 0; i < 16; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        step.dataset.index = i;
        step.addEventListener('click', () => step.classList.toggle('active'));
        sequencerGrid.appendChild(step);
        steps.push(step);
    }

    let seq = new Tone.Sequence((time, col) => {
        if (steps[col].classList.contains('active')) {
            noise.triggerAttack(time);
        }
        if (col % 4 === 0 && steps[col].classList.contains('active')) {
             kick.triggerAttackRelease("C1", "8n", time);
        }
    }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], '16n').start(0);

    document.getElementById('noise-filter').addEventListener('input', e => noiseFilter.frequency.value = +e.target.value);
    document.getElementById('noise-decay').addEventListener('input', e => noise.envelope.decay = +e.target.value);
    document.getElementById('glitch-button').addEventListener('mousedown', () => {
        seq.probability = 0.5;
        seq.playbackRate = 1.5;
    });
    document.getElementById('glitch-button').addEventListener('mouseup', () => {
        seq.probability = 1;
        seq.playbackRate = 1;
    });
});
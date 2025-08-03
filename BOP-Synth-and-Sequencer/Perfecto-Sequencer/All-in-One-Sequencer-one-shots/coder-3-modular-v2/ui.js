import { toggleStep, setNote, toggleMute, clearChannel, setSample, setSynthType, setSynthParams } from './state.js';

// UI Module
export class UIManager {
    constructor(Tone, synthManager, synthRegistry) {
        this.Tone = Tone;
        this.synthManager = synthManager;
        this.synthRegistry = synthRegistry; // Pass the registry to access getUI
        this.state = null;
        this.dispatch = null;
    }

    setStateAndDispatch(state, dispatch) {
        this.state = state;
        this.dispatch = dispatch;
    }

    // Sample channel rendering and handling
    renderSampleChannel(header, channel, channelIndex) {
        // Clear previous content
        header.innerHTML = '<div class="channel-controls"></div>';
        this.createChannelControls(header, channelIndex);

        // Create file input for drag/drop
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => this.handleFileSelect(e.target.files[0], channelIndex);

        // Create drop zone
        const dropZone = document.createElement('div');
        dropZone.textContent = channel.sampleFile ? channel.sampleFile.name : 'Drop audio file';
        dropZone.style.cssText = `
            padding: 5px;
            margin-top: 5px;
            background: #2c3e50;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        dropZone.onclick = () => fileInput.click();

        // Drag and drop handling
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.background = '#34495e';
        };
        dropZone.ondragleave = () => {
            dropZone.style.background = '#2c3e50';
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.background = '#2c3e50';
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files[0], channelIndex);
            }
        };

        header.appendChild(fileInput);
        header.appendChild(dropZone);
    }

    handleFileSelect(file, channelIndex) {
        if (!file.type.startsWith('audio/')) return;
        const player = new this.Tone.Player(URL.createObjectURL(file)).toDestination();
        this.dispatch(setSample(channelIndex, file, player));
        // The UI will re-render based on state change
    }


    // --- Synth channel rendering and dynamic controls ---
    renderSynthChannel(header, channel, channelIndex) {
        // Clear previous content
        header.innerHTML = '<div class="channel-controls"></div>';
        this.createChannelControls(header, channelIndex);

        // 1. Synth Type Selector
        const synthTypeSelect = document.createElement('select');
        synthTypeSelect.className = 'synth-type-selector';
        Object.keys(this.synthRegistry).forEach(type => {
            const option = document.createElement('option');
            // Use a more user-friendly name if available, or derive from type
            const displayName = type.replace(/([A-Z])/g, ' $1').trim(); // Basic conversion
            option.value = type;
            option.textContent = displayName;
            if (type === channel.synthType) option.selected = true;
            synthTypeSelect.appendChild(option);
        });

        synthTypeSelect.onchange = () => {
            const newSynthType = synthTypeSelect.value;
            const SynthClass = this.synthRegistry[newSynthType];
            if (SynthClass) {
                // Get default params from the new synth class
                // This assumes a static method or a way to get defaults
                // For now, we'll just reset to an empty object or a basic default
                // A better approach would be to have a static getDefaultParams method
                // or instantiate temporarily to get defaults.
                // Let's assume for now the reducer handles resetting params.
                this.dispatch(setSynthType(channelIndex, newSynthType, {})); // Pass empty defaults for now
                // The synth manager will handle creating the new instance on the next sequence tick
                // or we could trigger it here if needed immediately.
            }
        };

        header.appendChild(synthTypeSelect);

        // 2. Dynamic Controls based on selected synth's getUI()
        const SynthClass = this.synthRegistry[channel.synthType];
        if (SynthClass && typeof SynthClass.getUI === 'function') {
            const uiControls = SynthClass.getUI();
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'synth-controls';

            uiControls.forEach(controlDef => {
                const label = document.createElement('label');
                label.textContent = controlDef.label || controlDef.param;
                label.title = controlDef.param;

                let input;
                if (controlDef.type === 'range') {
                    input = document.createElement('input');
                    input.type = 'range';
                    input.min = controlDef.min !== undefined ? controlDef.min : '0';
                    input.max = controlDef.max !== undefined ? controlDef.max : '1';
                    input.step = controlDef.step !== undefined ? controlDef.step : '0.01';
                    input.value = channel.params[controlDef.param] !== undefined ? channel.params[controlDef.param] : controlDef.defaultValue;
                    input.oninput = () => {
                        const value = input.type === 'range' ? parseFloat(input.value) : input.value;
                        this.dispatch(setSynthParams(channelIndex, { [controlDef.param]: value }));
                    };
                } else if (controlDef.type === 'select') {
                    input = document.createElement('select');
                    controlDef.options.forEach(optionValue => {
                        const option = document.createElement('option');
                        option.value = optionValue;
                        option.textContent = optionValue;
                        if (optionValue === (channel.params[controlDef.param] !== undefined ? channel.params[controlDef.param] : controlDef.defaultValue)) {
                            option.selected = true;
                        }
                        input.appendChild(option);
                    });
                    input.onchange = () => {
                        this.dispatch(setSynthParams(channelIndex, { [controlDef.param]: input.value }));
                    };
                }

                if (input) {
                    controlsContainer.appendChild(label);
                    controlsContainer.appendChild(input);
                }
            });

            header.appendChild(controlsContainer);
        }
    }
    // --- End of synth channel rendering ---

    createChannelControls(header, channelIndex) {
         const controlsDiv = header.querySelector('.channel-controls') || document.createElement('div');
         controlsDiv.className = 'channel-controls';
         controlsDiv.innerHTML = ''; // Clear existing buttons

         const muteBtn = document.createElement('button');
         muteBtn.textContent = this.state.channels[channelIndex].muted ? 'Unmute' : 'Mute';
         muteBtn.onclick = () => this.dispatch(toggleMute(channelIndex));

         const clearBtn = document.createElement('button');
         clearBtn.textContent = 'Clear';
         clearBtn.onclick = () => this.dispatch(clearChannel(channelIndex));

         controlsDiv.appendChild(muteBtn);
         controlsDiv.appendChild(clearBtn);
         // Append only if it wasn't already in the DOM
         if (!header.querySelector('.channel-controls')) {
             header.appendChild(controlsDiv);
         }
     }


    // Sequencer grid rendering and interaction
    renderSequencerGrid(container) {
        container.innerHTML = '';
        this.state.channels.forEach((channel, channelIndex) => {
            const row = document.createElement('div');
            row.className = channel.type === 'sample' ? 'sample-row' : 'synth-row';
            row.style.cssText = `display: contents;`;

            // Row header
            const header = document.createElement('div');
            header.className = 'row-header';
            header.textContent = channel.name;

            row.appendChild(header);

            // Steps
            channel.steps.forEach((isActive, stepIndex) => {
                const step = document.createElement('div');
                step.className = 'step';
                step.dataset.channel = channelIndex;
                step.dataset.step = stepIndex;
                if (isActive) step.classList.add('active');
                if (channel.muted) step.classList.add('muted');
                if (this.state.currentStep === stepIndex) step.classList.add('playing');

                step.onclick = () => {
                    if (channel.type === 'sample') {
                        this.dispatch(toggleStep(channelIndex, stepIndex));
                    } else {
                        // For synth channels, prompt for note selection
                        const note = prompt(`Enter note for step ${stepIndex + 1} (e.g. C4, D#5)`, channel.notes[stepIndex]);
                        if (note) {
                            this.dispatch(setNote(channelIndex, stepIndex, note.toUpperCase()));
                            this.dispatch(toggleStep(channelIndex, stepIndex));
                        }
                    }
                };
                row.appendChild(step);
            });

            container.appendChild(row);

            // Render channel-specific controls *after* the row is appended
            // so they are correctly positioned within the CSS grid
            if (channel.type === 'sample') {
                this.renderSampleChannel(header, channel, channelIndex);
            } else {
                this.renderSynthChannel(header, channel, channelIndex);
            }
        });
    }

    setupTransportControls() {
        const playBtn = document.getElementById('play-btn');
        const stopBtn = document.getElementById('stop-btn');
        const bpmInput = document.getElementById('bpm-input');

        playBtn.onclick = () => {
            this.dispatch(this.state.isPlaying ? { type: 'TOGGLE_PLAY' } : { type: 'TOGGLE_PLAY' });
            if (this.state.isPlaying) {
                this.Tone.Transport.start();
            } else {
                this.Tone.Transport.stop();
            }
        };

        stopBtn.onclick = () => {
            this.Tone.Transport.stop();
            this.Tone.Transport.seconds = 0;
            this.dispatch({ type: 'TOGGLE_PLAY' }); // Ensure state is stopped
        };

        bpmInput.value = this.state.bpm;
        bpmInput.onchange = () => {
            const bpm = parseInt(bpmInput.value);
            if (bpm >= 20 && bpm <= 300) {
                this.Tone.Transport.bpm.value = bpm;
                this.dispatch({ type: 'SET_BPM', payload: bpm });
            }
        };
    }

    createPiano(pianoContainer) {
        pianoContainer.innerHTML = '';
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        notes.forEach(note => {
            const key = document.createElement('div');
            key.className = 'key';
            key.textContent = note;
            key.dataset.note = `${note}4`;
            if (!whiteKeys.includes(note)) {
                key.classList.add('black');
            }
            key.onmousedown = () => {
                // Use a temporary synth for piano auditioning
                const tempSynth = new this.Tone.Synth().toDestination();
                tempSynth.triggerAttackRelease(`${note}4`, '8n');
                key.classList.add('active');
                setTimeout(() => {
                     key.classList.remove('active');
                     tempSynth.dispose(); // Clean up temporary synth
                }, 200);
            };
            pianoContainer.appendChild(key);
        });
    }
}
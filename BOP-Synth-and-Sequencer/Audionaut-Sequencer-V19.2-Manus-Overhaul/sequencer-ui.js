            stepEl.onclick = () => {
                const currentSeq = getCurrentSequence();
                currentSeq.channels[chIndex].steps[stepIndex] = !currentSeq.channels[chIndex].steps[stepIndex];
                stepEl.classList.toggle('active');
            };

            rowDiv.appendChild(stepEl);
            stepElements.push(stepEl);
        }

        stepsContainer.appendChild(rowDiv);
        channelEl.appendChild(stepsContainer);

        // --- Cache stepElements for highlightPlayhead ---
        allChannels[chIndex].stepElements = stepElements;

        // 7. Finally, add the completed channel to the DOM
        elements.sequencer.appendChild(channelEl);
    });

    updateSequenceListUI();
    updatePlaybackControls();
}



function highlightPlayhead(currentStep, previousStep) {
    // Iterate over your cached channel objects
    allChannels.forEach(channel => {
        if (previousStep !== null && channel.stepElements[previousStep]) {
            channel.stepElements[previousStep].classList.remove('playhead');
        }
        if (currentStep !== null && channel.stepElements[currentStep]) {
            channel.stepElements[currentStep].classList.add('playhead');
        }
    });
}


function updateSequenceListUI() {
    elements.sequenceList.innerHTML = '';
    projectState.sequences.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'sequence-btn';
        btn.textContent = `Seq ${index + 1}`;
        if (index === projectState.currentSequenceIndex) btn.classList.add('active');
        btn.onclick = () => {
            projectState.currentSequenceIndex = index;
            render();
        };
        elements.sequenceList.appendChild(btn);
    });
}

function updatePlaybackControls() {
    elements.playSequenceBtn.disabled = projectState.isPlaying;
    elements.playAllBtn.disabled = projectState.isPlaying;
    elements.stopBtn.disabled = !projectState.isPlaying;
}

function checkAllSelectedLoopsBPM() {
    // ... (logic for bpmWarning)
}

export function setLoaderStatus(text, isError = false) {
    elements.loaderStatus.textContent = text;
    elements.loaderStatus.style.color = isError ? '#f00' : '#0f0';
}

export function bindEventListeners() {
    let isSliderActive = false;
    elements.bpmInput.oninput  = e => !isSliderActive && setBPM(e.target.value);
    elements.bpmInput.onblur   = e => setBPM(e.target.value);
    elements.bpmSlider.onmousedown = () => isSliderActive = true;
    elements.bpmSlider.oninput = e => { if (isSliderActive) setBPM(e.target.value); };
    elements.bpmSlider.onmouseup = () => isSliderActive = false;

    elements.playSequenceBtn.onclick = () => startPlayback('sequence').then(render);
    elements.playAllBtn.onclick      = () => startPlayback('all').then(render);
    elements.stopBtn.onclick         = () => { stopPlayback(); render(); };

    elements.addSequenceBtn.onclick = () => {
        if (projectState.sequences.length < config.MAX_SEQUENCES) {
            const numChannels = getCurrentSequence()?.channels.length
                              || config.INITIAL_SAMPLER_CHANNELS;
            projectState.sequences.push({
                channels: Array(numChannels).fill(null)
                          .map(() => createNewChannel('sampler'))
            });
            render();
        }
    };
    elements.addSamplerChannelBtn.onclick    = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
            getCurrentSequence().channels.push(createNewChannel('sampler'));
            render();
        }
    };
    elements.addInstrumentChannelBtn.onclick = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
// UnifiedSequencerSettings_UI.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Update Project Name in UI
    updateProjectNameUI(projectName) {
        const input = document.getElementById('project-name');
        if (input) input.value = projectName || "AUDX Project";
    },

    // Update BPM in UI
    updateBPMUI(bpm) {
        const [slider, display] = ['bpm-slider', 'bpm-display'].map(id => document.getElementById(id));
        if (slider && display) {
            slider.value = bpm;
            display.textContent = bpm;
        }
    },

    // Update all Load Sample button texts
    updateAllLoadSampleButtonTexts() {
        document.querySelectorAll('.channel').forEach((channel, idx) => {
            const btn = channel.querySelector('.load-sample-button');
            if (btn) this.updateLoadSampleButtonText(idx, btn);
        });
    },

    // Update a single Load Sample button text
    updateLoadSampleButtonText(channelIdx, button) {
        if (!button) {
            console.error(`updateLoadSampleButtonText: Button not found for channelIndex ${channelIdx}`);
            return;
        }

        const { projectChannelNames, channelURLs } = this.settings.masterSettings;
        const name = projectChannelNames[channelIdx];
        const url = channelURLs[channelIdx];
        const text = name || (url ? url.split('/').pop().split('#')[0] : 'Load Sample');
        button.textContent = text;
    },

    // Update UI for a specific sequence
    updateUIForSequence(seqIdx) {
        const channels = document.querySelectorAll('.channel');
        channels.forEach((channel, chIdx) => {
            const steps = channel.querySelectorAll('.step-button');
            steps.forEach((btn, stepIdx) => {
                const { isActive, isReverse } = this.getStepStateAndReverse(seqIdx, chIdx, stepIdx);
                btn.classList.toggle('selected', isActive);
                btn.classList.toggle('reverse', isReverse);
            });
        });
    },

    // Update project channel names in UI
    updateProjectChannelNamesUI(channelNames) {
        if (!Array.isArray(channelNames)) {
            console.error("updateProjectChannelNamesUI: channelNames is not an array");
            return;
        }

        channelNames.forEach((name, channelIdx) => {
            const defaultName = 'Load Sample';
            const urlName = this.settings.masterSettings.channelURLs[channelIdx]?.split('/').pop().split('#')[0] || defaultName;
            const effectiveName = name || urlName;
            const nameDisplay = document.getElementById(`channel-name-${channelIdx}`);
            if (nameDisplay) {
                nameDisplay.textContent = effectiveName;
            }
            this.settings.masterSettings.projectChannelNames[channelIdx] = effectiveName;
        });
    },
});

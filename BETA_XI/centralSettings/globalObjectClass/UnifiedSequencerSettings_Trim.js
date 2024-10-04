// UnifiedSequencerSettings_Trim.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Trim settings management
    setTrimSettings(channelIdx, { start, end }) {
        if (!this.isValidIndex(channelIdx)) {
            console.error(`setTrimSettings: Invalid channel index: ${channelIdx}`);
            return;
        }
        const current = this.settings.masterSettings.trimSettings[channelIdx];
        if (current) {
            Object.assign(current, { start, end });
            this.notifyObservers();
        } else {
            console.error(`setTrimSettings: Trim settings not found for channel index: ${channelIdx}`);
        }
    },

    getTrimSettings(channelIdx) {
        return this.settings.masterSettings.trimSettings[channelIdx] || { start: 0, end: 1 };
    },

    // Update trim settings UI
    updateTrimSettingsUI(trimSettings) {
        console.log("updateTrimSettingsUI entered", trimSettings);
        trimSettings.forEach((setting, idx) => {
            ['start', 'end'].forEach(prop => {
                const slider = document.getElementById(`${prop}-slider-${idx}`);
                if (slider) slider.value = setting[prop];
            });
        });
    },
});

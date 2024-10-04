// UnifiedSequencerSettings_Audio.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Initialize Gain Nodes
    initializeGainNodes() {
        this.gainNodes = this.gainNodes.map((gain, i) => gain || this.createGainNode(i));
    },

    // Create a single Gain Node
    createGainNode(channelIndex) {
        const gn = this.audioContext.createGain();
        const volume = isFinite(this.settings.masterSettings.channelVolume[channelIndex]) ? this.settings.masterSettings.channelVolume[channelIndex] : 0.5;
        gn.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gn.connect(this.audioContext.destination);
        console.log(`Gain node ${channelIndex} initialized with volume ${volume}`);
        return gn;
    },

    // Initialize Source Nodes
    initializeSourceNodes() {
        this.sourceNodes = this.sourceNodes.map((source, i) => source || this.createSourceNode(i));
    },

    // Create a single Source Node
    createSourceNode(channelIndex) {
        const src = this.audioContext.createBufferSource();
        src.playbackRate.setValueAtTime(this.settings.masterSettings.channelPlaybackSpeed[channelIndex], this.audioContext.currentTime);
        src.connect(this.getGainNode(channelIndex));
        return src;
    },

    // Get or create Gain Node for a channel
    getGainNode(channelIndex) {
        if (!this.gainNodes[channelIndex]) {
            this.gainNodes[channelIndex] = this.createGainNode(channelIndex);
        }
        return this.gainNodes[channelIndex];
    },

    // Set channel volume
    setChannelVolume(channelIndex, volume) {
        if (!this.isValidIndex(channelIndex)) {
            console.error(`setChannelVolume: Invalid channel index ${channelIndex}`);
            return;
        }
        console.log(`Setting volume for channel ${channelIndex} to ${volume}`);
        const gainNode = this.getGainNode(channelIndex);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        this.settings.masterSettings.channelVolume[channelIndex] = volume;
        console.log(`Volume for channel ${channelIndex} set to ${volume}`);
        localStorage.setItem(`channelVolume_${channelIndex}`, volume.toString());
        this.notifyObservers();
    },

    // Get channel volume
    getChannelVolume(channelIndex) {
        return this.settings.masterSettings.channelVolume[channelIndex] || 1;
    },
});

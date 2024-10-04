// UnifiedSequencerSettings_Settings.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Async URL formatter
    formatURL(url) {
        return new Promise(resolve => setTimeout(() => resolve(url), 100));
    },

    // Get BPM
    getBPM() {
        return this.settings.masterSettings.projectBPM;
    },

    // Load settings
    async loadSettings(inputData) {
        console.log("[internalPresetDebug] loadSettings entered");
        try {
            this.clearMasterSettings();
            let jsonSettings;

            if (inputData instanceof Uint8Array || inputData instanceof ArrayBuffer) {
                console.log("[internalPresetDebug] Received Gzip data, decompressing...");
                jsonSettings = JSON.parse(await decompressGzipFile(inputData));
            } else if (typeof inputData === 'string') {
                jsonSettings = JSON.parse(inputData);
            } else {
                jsonSettings = inputData;
            }

            console.log("[internalPresetDebug] Received JSON Settings:", jsonSettings);

            const settingsToLoad = this.isHighlySerialized(jsonSettings)
                ? await this.decompressSerializedData(jsonSettings)
                : jsonSettings;

            // Ensure projectChannelNames is an array of strings
            if (Array.isArray(settingsToLoad.projectChannelNames)) {
                this.settings.masterSettings.projectChannelNames = settingsToLoad.projectChannelNames.map(name => typeof name === 'string' ? name : 'Load Sample');
            } else {
                console.error("[loadSettings] projectChannelNames is not an array. Reverting to defaults.");
                this.settings.masterSettings.projectChannelNames = Array(this.numChannels).fill('Load Sample');
            }

            Object.assign(this.settings.masterSettings, {
                projectName: settingsToLoad.projectName,
                projectBPM: settingsToLoad.projectBPM,
                artistName: settingsToLoad.artistName || "",
                trimSettings: settingsToLoad.trimSettings || this.initializeTrimSettings(this.numChannels),
                // projectChannelNames is handled above
            });

            this.globalPlaybackSpeed = settingsToLoad.globalPlaybackSpeed || 1;
            this.channelPlaybackSpeed = settingsToLoad.channelPlaybackSpeed || Array(this.numChannels).fill(1);

            this.initializeGainNodes();
            this.initializeSourceNodes();

            if (settingsToLoad.channelURLs) {
                await Promise.all(settingsToLoad.channelURLs.map((url, index) => this.formatAndFetchAudio(url, index)));
            }

            if (settingsToLoad.channelVolume) {
                settingsToLoad.channelVolume.forEach((volume, index) => this.setChannelVolume(index, volume));
            }

            if (!settingsToLoad || typeof settingsToLoad !== 'object') throw new Error("Invalid or undefined settingsToLoad");

            this.sortAndApplyProjectSequences(settingsToLoad.projectSequences);
            this.updateUIWithLoadedSettings();
        } catch (error) {
            console.error('[internalPresetDebug] Error loading settings:', error);
        }
    },

    // Format and fetch audio
    formatAndFetchAudio(url, index) {
        const baseDomain = "https://ordinals.com";
        const formattedUrl = url.startsWith("/") ? `${baseDomain}${url}` : url;
        return this.formatURL(formattedUrl).then(formatted => {
            this.settings.masterSettings.channelURLs[index] = formatted;
            return fetchAudio(formatted, index);
        });
    },

    // Update UI with loaded settings
    updateUIWithLoadedSettings() {
        const { projectName, projectBPM } = this.settings.masterSettings;
        this.updateProjectNameUI(projectName);
        this.updateBPMUI(projectBPM);
        this.updateAllLoadSampleButtonTexts();
        this.setCurrentSequence(0);
        this.updateUIForSequence(this.settings.masterSettings.currentSequence);
        handleSequenceTransition(0);
    },

    // Check if settings are highly serialized
    isHighlySerialized(parsedSettings) {
        const keys = Object.keys(parsedSettings);
        const numericKeyCount = keys.filter(key => /^\d+$/.test(key)).length;
        return numericKeyCount / keys.length > 0.5;
    },

    // Decompress serialized data
    async decompressSerializedData(serializedData) {
        const keyMap = {
            0: 'projectName', 1: 'artistName', 2: 'projectBPM', 3: 'currentSequence',
            4: 'channelURLs', 5: 'channelVolume', 6: 'channelPlaybackSpeed',
            7: 'trimSettings', 8: 'projectChannelNames', 14: 'projectSequences',
            15: 'steps'
        };
        const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, +k]));
        const channelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

        const decompressSteps = steps => steps.flatMap(step => {
            if (typeof step === 'number') return { index: step };
            if (typeof step === 'string' && step.endsWith('r')) return { index: parseInt(step.slice(0, -1), 10), isReverse: true };
            return [];
        });

        const deserialize = (data) => {
            const deserializedData = {};
            for (const [key, value] of Object.entries(data)) {
                const originalKey = keyMap[key] || key;
                if (originalKey === 'projectSequences') {
                    deserializedData[originalKey] = Object.entries(value).reduce((acc, [seqKey, channels]) => {
                        const originalSeqKey = seqKey.replace('s', 'Sequence');
                        acc[originalSeqKey] = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                            const channelIndex = channelMap.indexOf(chKey);
                            const originalChKey = `ch${channelIndex !== -1 ? channelIndex : chKey}`;
                            if (chValue[reverseKeyMap['steps']]) {
                                chAcc[originalChKey] = {
                                    steps: decompressSteps(chValue[reverseKeyMap['steps']])
                                };
                            }
                            return chAcc;
                        }, {});
                        return acc;
                    }, {});
                } else if (originalKey === 'trimSettings') {
                    deserializedData[originalKey] = value.map(ts => ({
                        start: ts.startSliderValue || 0,
                        end: ts.endSliderValue || 100,
                        length: ts.totalSampleDuration || 0,
                    }));
                } else if (originalKey === 'projectChannelNames') {
                    deserializedData[originalKey] = Array.isArray(value) ? value.map(name => String(name)) : Array(this.numChannels).fill('Load Sample');
                } else {
                    deserializedData[originalKey] = value;
                }
            }
            return deserializedData;
        };

        return deserialize(serializedData);
    },

    // Sort and apply project sequences
    sortAndApplyProjectSequences(projectSequences) {
        console.log("[sortAndApplyProjectSequences] Sorting and applying project sequences.");
        if (!projectSequences || typeof projectSequences !== 'object') throw new Error("[sortAndApplyProjectSequences] Invalid project sequences data.");

        Object.entries(projectSequences).forEach(([sequenceKey, sequenceData]) => {
            if (!sequenceData || typeof sequenceData !== 'object') return;
            this.settings.masterSettings.projectSequences[sequenceKey] = this.settings.masterSettings.projectSequences[sequenceKey] || {};

            Object.entries(sequenceData).forEach(([channelKey, channelData]) => {
                const channelIndex = parseInt(channelKey.replace('ch', ''), 10);
                if (channelIndex >= this.numChannels) return;

                const newSteps = Array(64).fill().map(() => ({
                    isActive: false,
                    isReverse: false,
                    volume: 1,
                    pitch: 1
                }));

                if (channelData?.steps?.length) {
                    channelData.steps.forEach(step => {
                        let index, isReverse = false;
                        if (typeof step === 'object' && step.index !== undefined) {
                            index = step.index - 1;
                            isReverse = step.isReverse || false;
                        } else if (typeof step === 'number') {
                            index = step - 1;
                        }
                        if (index >= 0 && index < 64) {
                            newSteps[index] = { isActive: true, isReverse, volume: 1, pitch: 1 };
                        }
                    });
                }

                this.settings.masterSettings.projectSequences[sequenceKey][channelKey] = {
                    steps: newSteps,
                    mute: false,
                    url: this.settings.masterSettings.channelURLs[channelIndex] || ""
                };
            });
        });
        console.log("[sortAndApplyProjectSequences] Project sequences sorted and applied.");
    },
    
    // Download JSON
    downloadJSON(content, fileNameBase) {
        try {
            if (!content) throw new Error("Content is undefined or null");
            const fileName = `${fileNameBase}_AUDX.json`;
            const blob = new Blob([content], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            console.log(`Download initiated successfully for file: ${fileName}`);
        } catch (error) {
            console.error("Failed to download JSON:", error);
        }
    },

    // Clear all master settings to defaults
    clearMasterSettings() {
        Object.assign(this.settings.masterSettings, {
            projectName: 'New Audx Project',
            artistName: '',
            projectBPM: 120,
            currentSequence: 0,
            channelURLs: Array(this.numChannels).fill(''),
            projectChannelNames: Array(this.numChannels).fill('Load Sample'),
            channelVolume: Array(this.numChannels).fill(1),
            trimSettings: Array.from({ length: this.numChannels }, () => ({ start: 0.01, end: 100.00, length: 0 })),
            channelPlaybackSpeed: Array(this.numChannels).fill(1),
            projectSequences: this.initializeSequences(64, this.numChannels, 64)
        });
        console.log("[clearMasterSettings] Master settings cleared.");
        this.notifyObservers();
    },
});

class UnifiedSequencerSettings {
    constructor(audioContext, numSequences = 64, numChannels = 16) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.numSequences = numSequences;
        this.numChannels = numChannels;
        this.globalPlaybackSpeed = 1;
        this.channelPlaybackSpeed = Array(this.numChannels).fill(1);
        this.observers = [];
        this.gainNodes = Array(this.numChannels).fill(null);
        this.sourceNodes = Array(this.numChannels).fill(null);

        this.settings = {
            masterSettings: {
                projectName: 'New Audx Project',
                artistName: '',
                projectBPM: 120,
                currentSequence: 0,
                channelURLs: Array(this.numChannels).fill(''),
                channelVolume: Array(this.numChannels).fill(0.5),
                channelPlaybackSpeed: Array(this.numChannels).fill(1),
                trimSettings: Array.from({ length: this.numChannels }, () => ({ start: 0.01, end: 100.00, length: 0 })),
                projectChannelNames: Array(this.numChannels).fill('Load Sample'),
                channelSettings: this.initializeChannelSettings(numChannels),
                projectSequences: this.initializeSequences(this.numSequences, this.numChannels, 64)
            }
        };

        this.initializeGainNodes();
        this.initializeSourceNodes();
    }

    // Async URL formatter
    formatURL = async (url) => {
        return new Promise(resolve => setTimeout(() => resolve(url), 100));
    }

    // Helper to safely access nested properties
    getNested = (...keys) => {
        return keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null, this.settings.masterSettings);
    }

    // Helper to validate channel index
    isValidIndex = (index) => {
        return index >= 0 && index < this.numChannels;
    }

    // Initialize channel settings
    initializeChannelSettings = (numChannels) => {
        const channelSettings = {};
        Array.from({ length: numChannels }, (_, ch) => {
            channelSettings[`ch${ch}`] = { volume: 1, pitch: 1 };
        });
        return channelSettings;
    }

    // Initialize sequences
    initializeSequences = (numSequences, numChannels, numSteps) => {
        const sequences = {};
        Array.from({ length: numSequences }, (_, seq) => {
            sequences[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
        });
        return sequences;
    }

    // Initialize channels within sequences
    initializeChannels = (numChannels, numSteps) => {
        const channels = {};
        Array.from({ length: numChannels }, (_, ch) => {
            channels[`ch${ch}`] = {
                steps: Array.from({ length: numSteps }, () => ({
                    isActive: false,
                    isReverse: false,
                    volume: 1,
                    pitch: 1,
                })),
                mute: false,
                url: ''
            };
        });
        return channels;
    }

    // Initialize Gain Nodes
    initializeGainNodes = () => {
        this.gainNodes = this.gainNodes.map((gain, i) => gain || this.createGainNode(i));
    }

    // Create a single Gain Node
    createGainNode = (channelIndex) => {
        const gn = this.audioContext.createGain();
        const volume = isFinite(this.settings.masterSettings.channelVolume[channelIndex]) ? this.settings.masterSettings.channelVolume[channelIndex] : 0.5;
        gn.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gn.connect(this.audioContext.destination);
        console.log(`Gain node ${channelIndex} initialized with volume ${volume}`);
        return gn;
    }

    // Initialize Source Nodes
    initializeSourceNodes = () => {
        this.sourceNodes = this.sourceNodes.map((source, i) => source || this.createSourceNode(i));
    }

    // Create a single Source Node
    createSourceNode = (channelIndex) => {
        const src = this.audioContext.createBufferSource();
        src.playbackRate.setValueAtTime(this.settings.masterSettings.channelPlaybackSpeed[channelIndex], this.audioContext.currentTime);
        src.connect(this.getGainNode(channelIndex));
        return src;
    }

    // Get or create Gain Node for a channel
    getGainNode = (channelIndex) => {
        if (!this.gainNodes[channelIndex]) {
            this.gainNodes[channelIndex] = this.createGainNode(channelIndex);
        }
        return this.gainNodes[channelIndex];
    }

    // Set channel volume
    setChannelVolume = (channelIndex, volume) => {
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
    }

    // Get channel volume
    getChannelVolume = (channelIndex) => {
        return this.settings.masterSettings.channelVolume[channelIndex] || 1;
    }

    // Get BPM
    getBPM = () => {
        return this.settings.masterSettings.projectBPM;
    }

    // Load settings
    loadSettings = async (inputData) => {
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
    }

    // Format and fetch audio
    formatAndFetchAudio = (url, index) => {
        const baseDomain = "https://ordinals.com";
        const formattedUrl = url.startsWith("/") ? `${baseDomain}${url}` : url;
        return this.formatURL(formattedUrl).then(formatted => {
            this.settings.masterSettings.channelURLs[index] = formatted;
            return fetchAudio(formatted, index);
        });
    }

    // Update UI with loaded settings
    updateUIWithLoadedSettings = () => {
        const { projectName, projectBPM, projectChannelNames } = this.settings.masterSettings;
        this.updateProjectNameUI(projectName);
        this.updateBPMUI(projectBPM);
        this.updateAllLoadSampleButtonTexts();
        // this.updateProjectChannelNamesUI(projectChannelNames);
        this.setCurrentSequence(0);
        this.updateUIForSequence(this.settings.masterSettings.currentSequence);
        handleSequenceTransition(0);
    }

    // Check if settings are highly serialized
    isHighlySerialized = (parsedSettings) => {
        const keys = Object.keys(parsedSettings);
        const numericKeyCount = keys.filter(key => /^\d+$/.test(key)).length;
        return numericKeyCount / keys.length > 0.5;
    }

    // Decompress serialized data
    decompressSerializedData = async (serializedData) => {
        const keyMap = {
            0: 'projectName', 1: 'artistName', 2: 'projectBPM', 3: 'currentSequence',
            4: 'channelURLs', 5: 'channelVolume', 6: 'channelPlaybackSpeed',
            7: 'trimSettings', 8: 'projectChannelNames', 14: 'projectSequences'
        };
        const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, +k]));
        const channelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

        const decompressSteps = steps => steps.flatMap(step => {
            if (typeof step === 'number') return step;
            if (step.r) return Array.from({ length: step.r[1] - step.r[0] + 1 }, (_, i) => step.r[0] + i);
            if (typeof step === 'string' && step.endsWith('r')) return { index: parseInt(step.slice(0, -1), 10), reverse: true };
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
                            if (chValue[keyMap['steps']]) {
                                chAcc[originalChKey] = { steps: decompressSteps(chValue[keyMap['steps']]) };
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
                    // Ensure it's an array of strings
                    deserializedData[originalKey] = Array.isArray(value) ? value.map(name => String(name)) : Array(this.numChannels).fill('Load Sample');
                } else {
                    deserializedData[originalKey] = value;
                }
            }
            return deserializedData;
        }

        return deserialize(serializedData);
    }

    // Sort and apply project sequences
    sortAndApplyProjectSequences = (projectSequences) => {
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
                            isReverse = step.reverse || false;
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
    }

    // Export settings
    exportSettings = (pretty = true, includeGzip = true) => {
        const { masterSettings } = this.settings;
        const settingsClone = JSON.parse(JSON.stringify(masterSettings));
        settingsClone.currentSequence = 0;
        settingsClone.globalPlaybackSpeed = this.globalPlaybackSpeed;
        settingsClone.channelPlaybackSpeed = [...(this.channelPlaybackSpeed || Array(this.numChannels).fill(1))];
        settingsClone.channelVolume = [...(masterSettings.channelVolume || Array(this.numChannels).fill(1))];
        if (masterSettings.artistName) settingsClone.artistName = masterSettings.artistName;

        for (const sequence of Object.values(settingsClone.projectSequences)) {
            for (const channel of Object.values(sequence)) {
                channel.steps = channel.steps.flatMap((step, index) => {
                    if (step.isActive || step.isReverse) {
                        const stepData = { index: index + 1, ...(step.isReverse && { reverse: true }), ...(step.volume !== 1 && { volume: step.volume }), ...(step.pitch !== 1 && { pitch: step.pitch }) };
                        return Object.keys(stepData).length > 1 ? stepData : stepData.index;
                    }
                    return [];
                });
                delete channel.mute;
                delete channel.url;
            }
        }

        const exportedSettings = JSON.stringify(settingsClone, null, pretty ? 2 : 0);
        console.log("[exportSettings] Exported Settings:", exportedSettings);

        const serializedSettings = this.serialize(settingsClone);
        const serializedExportedSettings = JSON.stringify(serializedSettings);
        console.log("[exportSettings] Serialized Exported Settings:", serializedExportedSettings);

        const { projectName = 'Project' } = masterSettings;

        const downloadOptions = [
            { enabled: true, content: exportedSettings, suffix: '_ff_' },
            { enabled: false, content: serializedExportedSettings, suffix: '_sf_' }
        ];

        downloadOptions.forEach(({ enabled, content, suffix }) => {
            if (enabled && content?.length > 2) {
                this.downloadJSON(content, `${projectName}${suffix}`);
            } else if (enabled) {
                console.error(`Failed to generate ${suffix === '_ff_' ? 'full' : 'serialized'} format JSON for download or content is empty.`);
            }
        });

        if (includeGzip && serializedExportedSettings?.length > 2) {
            createGzipFile(serializedExportedSettings)
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const downloadLink = document.createElement('a');
                    downloadLink.href = url;
                    downloadLink.download = `${projectName}_sf.gz`;
                    downloadLink.click();
                    console.log("Gzip file created and downloaded successfully.");
                })
                .catch(error => console.error("Error during Gzip creation:", error));
        } else if (includeGzip) {
            console.error("Failed to generate serialized format JSON for Gzip compression or content is empty.");
        }
    }

    // Serialize data
    serialize = (data) => {
        const keyMap = {
            projectName: 0, artistName: 1, projectBPM: 2, currentSequence: 3,
            channelURLs: 4, channelVolume: 5, channelPlaybackSpeed: 6,
            trimSettings: 7, projectChannelNames: 8, projectSequences: 14,
            steps: 15
        };
        const reverseChannelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

        const roundToFourDecimals = num => Math.round(num * 10000) / 10000;

        const compressSteps = steps => steps.reduce((acc, step) => {
            if (typeof step === 'number') {
                acc.push(step);
            } else if (step.isReverse) {
                acc.push(`${step.index}r`);
            } else if (step.isActive) {
                acc.push(step.index);
            }
            return acc;
        }, []);

        const stripDomainFromUrl = url => {
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.pathname + parsedUrl.search;
            } catch {
                return url;
            }
        };

        const serializeData = (data) => {
            const serialized = {};
            for (const [key, value] of Object.entries(data)) {
                const shortKey = keyMap[key] ?? key;
                if (key === 'channelURLs') {
                    serialized[shortKey] = value.map(stripDomainFromUrl);
                } else if (Array.isArray(value)) {
                    serialized[shortKey] = key === 'projectChannelNames'
                        ? value.map((v, i) => reverseChannelMap[i] || v)
                        : value.map(v => typeof v === 'number' ? roundToFourDecimals(v) : serializeData(v));
                } else if (typeof value === 'object' && value !== null) {
                    serialized[shortKey] = key === 'projectSequences'
                        ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
                            const shortSeqKey = seqKey.replace('Sequence', 's');
                            acc[shortSeqKey] = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                                const letter = reverseChannelMap[parseInt(chKey.replace('ch', ''), 10)] || chKey;
                                if (chValue.steps?.length) {
                                    chAcc[letter] = { [keyMap['steps']]: compressSteps(chValue.steps) };
                                }
                                return chAcc;
                            }, {});
                            return acc;
                        }, {})
                        : serializeData(value);
                } else {
                    serialized[shortKey] = typeof value === 'number' ? roundToFourDecimals(value) : value;
                }
            }
            return serialized;
        }

        return serializeData(data);
    }

    // Download JSON
    downloadJSON = (content, fileNameBase) => {
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
    }

    // Observer methods
    addObserver = (observerFunction) => {
        console.log("addObserver", observerFunction);
        this.observers.push(observerFunction);
    }

    notifyObservers = () => {
        console.log('[SequenceChangeDebug] Notifying observers of changes.');
        this.observers.forEach(fn => fn(this.settings));
    }

    // Trim settings management
    setTrimSettings = (channelIdx, { start, end }) => {
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
    }

    getTrimSettings = (channelIdx) => {
        return this.settings.masterSettings.trimSettings[channelIdx] || { start: 0, end: 1 };
    }

    // Channel pitch getters
    getChannelPitch = (channelIdx) => {
        return this.getNested('channelSettings', `ch${channelIdx}`, 'pitch') || 1;
    }

    // Step volume and pitch getters
    getStepVolume = (seqIdx, chIdx, stepIdx) => {
        return this.getStepSettings(seqIdx, chIdx, stepIdx).volume;
    }

    getStepPitch = (seqIdx, chIdx, stepIdx) => {
        return this.getStepSettings(seqIdx, chIdx, stepIdx).pitch;
    }

    // Set channel pitch
    setChannelPitch = (channelIdx, pitch) => {
        if (!this.isValidIndex(channelIdx)) {
            console.error(`setChannelPitch: Invalid channel index: ${channelIdx}`);
            return;
        }
        this.settings.masterSettings.channelSettings[`ch${channelIdx}`].pitch = pitch;
        this.notifyObservers();
    }

    // Generic setter for step properties
    setStepProperty = (seqIdx, chIdx, stepIdx, property, value) => {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) {
            step[property] = value;
            this.notifyObservers();
        } else {
            console.error(`setStepProperty: Invalid indices in setStep${property}`);
        }
    }

    // Set step volume
    setStepVolume = (seqIdx, chIdx, stepIdx, volume) => {
        this.setStepProperty(seqIdx, chIdx, stepIdx, 'volume', volume);
    }

    // Set step pitch
    setStepPitch = (seqIdx, chIdx, stepIdx, pitch) => {
        this.setStepProperty(seqIdx, chIdx, stepIdx, 'pitch', pitch);
    }

    // Get step settings
    getStepSettings = (seqIdx, chIdx, stepIdx) => {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) return { ...step };
        console.error('getStepSettings: Invalid indices');
        return { isActive: false, isReverse: false, volume: 1, pitch: 1 };
    }

    // Get step state and reverse
    getStepStateAndReverse = (seqIdx, chIdx, stepIdx) => {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) return { isActive: step.isActive, isReverse: step.isReverse };
        console.error('getStepStateAndReverse: Invalid indices');
        return { isActive: false, isReverse: false };
    }

    // Update step state and reverse
    updateStepStateAndReverse = (seqIdx, chIdx, stepIdx, isActive, isReverse) => {
        if ([seqIdx, chIdx, stepIdx].some(idx => typeof idx !== 'number') ||
            typeof isActive !== 'boolean' || typeof isReverse !== 'boolean') {
            throw new Error('updateStepStateAndReverse: Invalid input types');
        }
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) {
            step.isActive = isActive;
            step.isReverse = isReverse;
            this.updateTotalSequences();
            this.notifyObservers();
        } else {
            throw new Error('updateStepStateAndReverse: Invalid step indices');
        }
    }

    // Generic toggle method for step properties
    toggleStepProperty = (seqIdx, chIdx, stepIdx, property) => {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step && typeof step[property] === 'boolean') {
            step[property] = !step[property];
            this.updateTotalSequences();
            this.notifyObservers();
        } else {
            console.error(`toggleStepProperty: Invalid indices or property in toggleStep${property}`);
        }
    }

    // Toggle step active state
    toggleStepState = (seqIdx, chIdx, stepIdx) => {
        this.toggleStepProperty(seqIdx, chIdx, stepIdx, 'isActive');
    }

    // Toggle step reverse state
    toggleStepReverseState = (seqIdx, chIdx, stepIdx) => {
        this.toggleStepProperty(seqIdx, chIdx, stepIdx, 'isReverse');
    }

    // Initialize trim settings
    initializeTrimSettings = (numSettings) => {
        return Array.from({ length: numSettings }, () => ({ start: 0, end: 100, length: 0 }));
    }

    // Update trim settings UI
    updateTrimSettingsUI = (trimSettings) => {
        console.log("updateTrimSettingsUI entered", trimSettings);
        trimSettings.forEach((setting, idx) => {
            ['start', 'end'].forEach(prop => {
                const slider = document.getElementById(`${prop}-slider-${idx}`);
                if (slider) slider.value = setting[prop];
            });
        });
    }

    // Update all Load Sample button texts
    updateAllLoadSampleButtonTexts = () => {
        document.querySelectorAll('.channel').forEach((channel, idx) => {
            const btn = channel.querySelector('.load-sample-button');
            if (btn) this.updateLoadSampleButtonText(idx, btn);
        });
    }

    // Update a single Load Sample button text
    updateLoadSampleButtonText = (channelIdx, button) => {
        if (!button) {
            console.error(`updateLoadSampleButtonText: Button not found for channelIndex ${channelIdx}`);
            return;
        }

        const { projectChannelNames, channelURLs } = this.settings.masterSettings;
        const name = projectChannelNames[channelIdx];
        const url = channelURLs[channelIdx];
        const text = name || (url ? url.split('/').pop().split('#')[0] : 'Load Sample');
        button.textContent = text;
    }

    // UI Update Methods
    updateProjectNameUI = (projectName) => {
        const input = document.getElementById('project-name');
        if (input) input.value = projectName || "AUDX Project";
    }

    updateBPMUI = (bpm) => {
        const [slider, display] = ['bpm-slider', 'bpm-display'].map(id => document.getElementById(id));
        if (slider && display) { slider.value = bpm; display.textContent = bpm; }
    }

    updateChannelURLsUI = (urls) => {
        urls.forEach((url, idx) => {
            const input = document.getElementById(`url-input-${idx}`);
            if (input) input.value = url;
        });
    }

    // Update all project channel names in the UI
    updateProjectChannelNamesUI = (channelNames) => {
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
    }


    // URL Management
    addChannelURL = (channelIdx, url) => {
        if (this.isValidIndex(channelIdx)) {
            this.settings.masterSettings.channelURLs[channelIdx] = url;
            this.notifyObservers();
        } else {
            console.error(`[addChannelURL] Invalid channel index: ${channelIdx}`);
        }
    }

    getChannelURL = (channelIdx) => {
        return this.getNested('channelURLs', channelIdx) || null;
    }

    getprojectUrlforChannel = (channelIdx) => {
        return this.getNested('channelURLs', channelIdx);
    }

    // Project Name Management
    setProjectName = (name) => {
        this.settings.masterSettings.projectName = name;
        this.notifyObservers();
    }

    // Clear all master settings to defaults
    clearMasterSettings = () => {
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
    }

    // Sequence Management
    setCurrentSequence = (seqIdx) => {
        if (this.settings.masterSettings.currentSequence !== seqIdx) {
            this.settings.masterSettings.currentSequence = seqIdx;
            this.notifyObservers();
        }
    }

    getCurrentSequence = () => {
        return this.settings.masterSettings.currentSequence;
    }

    getSequenceSettings = (seqIdx) => {
        return this.getNested('projectSequences', `Sequence${seqIdx}`);
    }

    setSequenceSettings = (seqIdx, settings) => {
        this.settings.masterSettings.projectSequences[`Sequence${seqIdx}`] = settings;
        this.notifyObservers();
    }

    // Check current settings
    checkSettings = () => {
        console.log("Current Global Settings:", this.settings);
    }

    // Update UI for a specific sequence
    updateUIForSequence = (seqIdx) => {
        const channels = document.querySelectorAll('.channel');
        channels.forEach((channel, chIdx) => {
            const steps = channel.querySelectorAll('.step-button');
            steps.forEach((btn, stepIdx) => {
                const { isActive, isReverse } = this.getStepStateAndReverse(seqIdx, chIdx, stepIdx);
                btn.classList.toggle('selected', isActive);
                btn.classList.toggle('reverse', isReverse);
            });
        });

        if (!this._scheduledUpdate) {
            this._scheduledUpdate = true;
            requestAnimationFrame(() => {
                this._scheduledUpdate = false;
                this.updateUIForSequence(this.settings.masterSettings.currentSequence);
            });
        }
    }

    // Update a single channel's name in the UI
    updateProjectChannelNameUI = (channelIdx, name) => {
        if (typeof channelIdx !== 'number' || channelIdx < 0 || channelIdx >= this.numChannels) {
            console.error(`updateProjectChannelNameUI: Invalid channel index ${channelIdx}`);
            return;
        }
        const defaultName = 'Load Sample';
        const urlName = this.settings.masterSettings.channelURLs[channelIdx]?.split('/').pop().split('#')[0] || defaultName;
        const effectiveName = name || urlName;
        const nameDisplay = document.getElementById(`channel-name-${channelIdx}`);
        if (nameDisplay) {
            nameDisplay.textContent = effectiveName;
        }
        this.settings.masterSettings.projectChannelNames[channelIdx] = effectiveName;
    }





}

// Initialize the sequencer settings
window.unifiedSequencerSettings = new UnifiedSequencerSettings();

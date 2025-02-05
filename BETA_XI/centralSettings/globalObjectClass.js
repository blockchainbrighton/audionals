// globalObjectClass.js

class UnifiedSequencerSettings {
    constructor(audioContext, numSequences = 64, numChannels = 32) {
      this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      this.numSequences = numSequences;
      this.numChannels = numChannels;
      this.globalPlaybackSpeed = 1;
      this.channelPlaybackSpeed = new Array(this.numChannels).fill(1); // Default (1x)
      this.observers = [];
      this.gainNodes = new Array(this.numChannels);
      this.sourceNodes = new Array(this.numChannels);
  
      this.settings = {
        masterSettings: {
          projectName: 'New Audx Project',
          artistName: '',
          projectBPM: 120,
          currentSequence: 0,
          channelURLs: new Array(this.numChannels).fill(''),
          channelVolume: new Array(this.numChannels).fill(0.5),
          channelPlaybackSpeed: new Array(this.numChannels).fill(1),
          trimSettings: Array.from({ length: this.numChannels }, () => ({ start: 0.01, end: 100.00, length: 0 })),
          projectChannelNames: new Array(this.numChannels).fill('Load Sample'),
          channelSettings: this.initializeChannelSettings(this.numChannels),
          projectSequences: this.initializeSequences(this.numSequences, this.numChannels, 64)
        }
      };
  
      this.initializeGainNodes();
      this.initializeSourceNodes();
  
      // Bind methods as needed
      this.checkSettings = this.checkSettings.bind(this);
      this.clearMasterSettings = this.clearMasterSettings.bind(this);
      this.loadSettings = this.loadSettings.bind(this);
      this.formatURL = this.formatURL.bind(this);
      this.setChannelVolume = this.setChannelVolume.bind(this);
      this.setChannelPlaybackSpeed = this.setChannelPlaybackSpeed.bind(this);
      this.updateTotalSequences = this.updateTotalSequences.bind(this);
    }
  
    /*–––––– Audio Node Initialization ––––––*/
  
    initializeGainNodes() {
      console.log("Initializing gain nodes");
      for (let i = 0; i < this.numChannels; i++) {
        if (!this.gainNodes[i]) {
          const gainNode = this.audioContext.createGain();
          gainNode.gain.setValueAtTime(this.settings.masterSettings.channelVolume[i], this.audioContext.currentTime);
          gainNode.connect(this.audioContext.destination);
          this.gainNodes[i] = gainNode;
          console.log(`Gain node ${i} initialized with volume ${this.settings.masterSettings.channelVolume[i]}`);
        }
      }
    }
  
    initializeSourceNodes() {
      for (let i = 0; i < this.numChannels; i++) {
        if (!this.sourceNodes[i]) {
          const source = this.audioContext.createBufferSource();
          source.playbackRate.setValueAtTime(this.settings.masterSettings.channelPlaybackSpeed[i], this.audioContext.currentTime);
          if (!this.gainNodes[i]) this.initializeGainNodes();
          source.connect(this.gainNodes[i]);
          this.sourceNodes[i] = source;
        }
      }
    }
  
    createGainNodeForChannel(channelIndex) {
      if (!this.gainNodes[channelIndex]) {
        const gainNode = this.audioContext.createGain();
        let volume = this.settings.masterSettings.channelVolume[channelIndex];
        if (!isFinite(volume)) {
          console.warn(`Non-finite volume detected for channel ${channelIndex}, defaulting to 0.5`);
          volume = 0.5;
        }
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.connect(this.audioContext.destination);
        this.gainNodes[channelIndex] = gainNode;
        console.log(`Gain node ${channelIndex} initialized with volume ${volume}`);
      }
    }
  
    setChannelVolume(channelIndex, volume) {
      console.log(`Setting volume for channel ${channelIndex} to ${volume}`);
      if (!this.gainNodes[channelIndex]) {
        console.warn(`No gain node found for channel ${channelIndex}. Creating new gain node.`);
        this.createGainNodeForChannel(channelIndex);
      }
      const gainNode = this.gainNodes[channelIndex];
      if (!gainNode) {
        console.error(`Failed to create gain node for channel ${channelIndex}`);
        return;
      }
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      this.settings.masterSettings.channelVolume[channelIndex] = volume;
      console.log(`Volume for channel ${channelIndex} set to ${volume}`);
      localStorage.setItem(`channelVolume_${channelIndex}`, volume.toString());
    }
  
    // Returns the gain-node (audio) volume
    getChannelVolume(channelIndex) {
      return this.settings.masterSettings.channelVolume[channelIndex] || 1;
    }
  
    // Returns the separate channel setting (stored in channelSettings)
    getChannelSettingsVolume(channelIndex) {
      return this.settings.masterSettings.channelSettings[`ch${channelIndex}`]?.volume || 1;
    }
  
    /*–––––– Settings Loading & Serialization ––––––*/
  
    async loadSettings(inputData) {
      console.log("[internalPresetDebug] loadSettings entered");
      try {
        this.clearMasterSettings();
        let jsonSettings;
        if (inputData instanceof Uint8Array || inputData instanceof ArrayBuffer) {
          console.log("[internalPresetDebug] Received Gzip data, decompressing...");
          const decompressedData = await decompressGzipFile(inputData);
          jsonSettings = JSON.parse(decompressedData);
        } else if (typeof inputData === 'string') {
          jsonSettings = JSON.parse(inputData);
        } else {
          jsonSettings = inputData;
        }
        console.log("[internalPresetDebug] Received JSON Settings:", jsonSettings);
        const settingsToLoad = this.isHighlySerialized(jsonSettings)
          ? await this.decompressSerializedData(jsonSettings)
          : jsonSettings;
        this.settings.masterSettings.projectName = settingsToLoad.projectName;
        this.settings.masterSettings.projectBPM = settingsToLoad.projectBPM;
        this.settings.masterSettings.artistName = settingsToLoad.artistName || "";
        this.globalPlaybackSpeed = settingsToLoad.globalPlaybackSpeed || 1;
        this.channelPlaybackSpeed = settingsToLoad.channelPlaybackSpeed || new Array(this.numChannels).fill(1);
        this.initializeGainNodes();
        if (settingsToLoad.channelURLs) {
          const urlPromises = settingsToLoad.channelURLs.map((url, index) =>
            this.formatAndFetchAudio(url, index)
          );
          await Promise.all(urlPromises);
        }
        if (settingsToLoad.channelVolume) {
          settingsToLoad.channelVolume.forEach((volume, index) => {
            this.setChannelVolume(index, volume);
          });
        }
        this.settings.masterSettings.trimSettings = settingsToLoad.trimSettings;
        this.settings.masterSettings.projectChannelNames = settingsToLoad.projectChannelNames;
        if (!settingsToLoad || typeof settingsToLoad !== 'object') {
          throw new Error("Invalid or undefined settingsToLoad");
        }
        this.sortAndApplyProjectSequences(settingsToLoad.projectSequences);
        this.updateUIWithLoadedSettings();
      } catch (error) {
        console.error('[internalPresetDebug] Error loading settings:', error);
      }
    }
  
    async formatAndFetchAudio(url, index) {
      const baseDomain = "https://ordinals.com";
      if (url.startsWith("/")) {
        url = `${baseDomain}${url}`;
      }
      return this.formatURL(url).then((formattedUrl) => {
        this.settings.masterSettings.channelURLs[index] = formattedUrl;
        return fetchAudio(formattedUrl, index); // Assumes fetchAudio is defined elsewhere
      });
    }
  
    updateUIWithLoadedSettings() {
      this.updateProjectNameUI(this.settings.masterSettings.projectName);
      this.updateBPMUI(this.settings.masterSettings.projectBPM);
      this.updateAllLoadSampleButtonTexts();
      this.updateProjectChannelNamesUI(this.settings.masterSettings.projectChannelNames);
      this.setCurrentSequence(0);
      this.updateUIForSequence(this.settings.masterSettings.currentSequence);
      handleSequenceTransition(0); // Assumes handleSequenceTransition is defined elsewhere
    }
  
    isHighlySerialized(parsedSettings) {
      const keys = Object.keys(parsedSettings);
      const numericKeyCount = keys.filter(key => /^\d+$/.test(key)).length;
      return numericKeyCount / keys.length > 0.5;
    }
  
    async decompressSerializedData(serializedData) {
      const keyMap = {
        0: 'projectName',
        1: 'artistName',
        2: 'projectBPM',
        3: 'currentSequence',
        4: 'channelURLs',
        5: 'channelVolume',
        6: 'channelPlaybackSpeed',
        7: 'trimSettings',
        8: 'projectChannelNames',
        9: 'startSliderValue',
        10: 'endSliderValue',
        11: 'totalSampleDuration',
        12: 'start',
        13: 'end',
        14: 'projectSequences',
        15: 'steps'
      };
      const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, +k]));
      const channelMap = Array.from({ length: this.numChannels }, (_, i) => 
        i < 26 ? String.fromCharCode(65 + i) : i.toString()
      );
        const decompressSteps = steps => steps.flatMap(step => {
        if (typeof step === 'number') return step;
        if (step.r) return Array.from({ length: step.r[1] - step.r[0] + 1 }, (_, i) => step.r[0] + i);
        if (typeof step === 'string' && step.endsWith('r')) return { index: parseInt(step.slice(0, -1), 10), reverse: true };
      });
      const deserialize = (data) => {
        const deserializedData = {};
        Object.entries(data).forEach(([key, value]) => {
          const originalKey = keyMap[key] || key;
          if (originalKey === 'projectSequences') {
            deserializedData[originalKey] = Object.entries(value).reduce((acc, [seqKey, channels]) => {
              const originalSeqKey = seqKey.replace('s', 'Sequence');
              const restoredChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                const channelIndex = channelMap.indexOf(chKey);
                const originalChKey = `ch${channelIndex !== -1 ? channelIndex : chKey}`;
                if (chValue[reverseKeyMap['steps']]) {
                  chAcc[originalChKey] = { steps: decompressSteps(chValue[reverseKeyMap['steps']]) };
                }
                return chAcc;
              }, {});
              acc[originalSeqKey] = restoredChannels;
              return acc;
            }, {});
          } else if (originalKey === 'trimSettings') {
            deserializedData[originalKey] = value.map(trimSetting => ({
              startSliderValue: trimSetting[9],
              endSliderValue: trimSetting[10],
              totalSampleDuration: trimSetting[11],
              ...(trimSetting[12] !== undefined && { start: trimSetting[12] }),
              ...(trimSetting[13] !== undefined && { end: trimSetting[13] })
            }));
          } else {
            deserializedData[originalKey] = value;
          }
        });
        return deserializedData;
      };
      return deserialize(serializedData);
    }
  
    sortAndApplyProjectSequences(projectSequences) {
      console.log("[sortAndApplyProjectSequences] Sorting and applying project sequences.");
      if (!projectSequences || typeof projectSequences !== 'object') {
        throw new Error("[sortAndApplyProjectSequences] Invalid project sequences data.");
      }
      Object.keys(projectSequences).forEach(sequenceKey => {
        const sequenceData = projectSequences[sequenceKey];
        if (!sequenceData || typeof sequenceData !== 'object') return;
        if (!this.settings.masterSettings.projectSequences[sequenceKey]) {
          this.settings.masterSettings.projectSequences[sequenceKey] = {};
        }
        Object.keys(sequenceData).forEach(channelKey => {
          const channelData = sequenceData[channelKey];
          const channelIndex = parseInt(channelKey.replace('ch', ''), 10);
          if (channelIndex < this.numChannels) {
            const newSteps = Array.from({ length: 64 }, () => ({
              isActive: false,
              isReverse: false,
              volume: 1,
              pitch: 1
            }));
            if (channelData && Array.isArray(channelData.steps)) {
              channelData.steps.forEach(step => {
                let index, isReverse = false;
                if (typeof step === 'object' && step.index !== undefined) {
                  index = step.index - 1;
                  isReverse = step.reverse || false;
                } else if (typeof step === 'number') {
                  index = step - 1;
                }
                if (index >= 0 && index < 64) {
                  newSteps[index] = {
                    isActive: true,
                    isReverse: isReverse,
                    volume: 1,
                    pitch: 1
                  };
                }
              });
            }
            this.settings.masterSettings.projectSequences[sequenceKey][channelKey] = {
              steps: newSteps,
              mute: false,
              url: this.settings.masterSettings.channelURLs[channelIndex] || ""
            };
          }
        });
      });
      console.log("[sortAndApplyProjectSequences] Project sequences sorted and applied.");
    }
  
    exportSettings(pretty = true, includeGzip = true) {
      const settingsClone = JSON.parse(JSON.stringify(this.settings.masterSettings));
      settingsClone.currentSequence = 0;
      settingsClone.globalPlaybackSpeed = this.globalPlaybackSpeed;
      settingsClone.channelPlaybackSpeed = Array.isArray(this.channelPlaybackSpeed)
        ? [...this.channelPlaybackSpeed]
        : new Array(this.numChannels).fill(1);
      settingsClone.channelVolume = Array.isArray(this.settings.masterSettings.channelVolume)
        ? [...this.settings.masterSettings.channelVolume]
        : new Array(this.numChannels).fill(1);
      if (this.settings.masterSettings.artistName) {
        settingsClone.artistName = this.settings.masterSettings.artistName;
      }
      for (let sequenceKey in settingsClone.projectSequences) {
        const sequence = settingsClone.projectSequences[sequenceKey];
        for (let channelKey in sequence) {
          const channel = sequence[channelKey];
          const activeSteps = [];
          channel.steps.forEach((step, index) => {
            if (step.isActive || step.isReverse) {
              const stepData = { index: index + 1 };
              if (step.isReverse) stepData.reverse = true;
              const stepVolume = step.volume !== undefined ? step.volume : 1;
              if (stepVolume !== 1) stepData.volume = stepVolume;
              if (step.pitch !== 1) stepData.pitch = step.pitch;
              if (Object.keys(stepData).length > 1) {
                activeSteps.push(stepData);
              } else {
                activeSteps.push(index + 1);
              }
            }
          });
          channel.steps = activeSteps;
          delete channel.mute;
          delete channel.url;
        }
      }
      const exportedSettings = JSON.stringify(settingsClone, null, pretty ? 2 : 0);
      console.log("[exportSettings] Exported Settings:", exportedSettings);
      const serializedSettings = this.serialize(settingsClone);
      const serializedExportedSettings = JSON.stringify(serializedSettings);
      console.log("[exportSettings] Serialized Exported Settings:", serializedExportedSettings);
      const projectName = this.settings.masterSettings.projectName || 'Project';
      const downloadFullFormat = true;
      const downloadSerializedFormat = false;
      if (downloadFullFormat && exportedSettings && exportedSettings.length > 2) {
        this.downloadJSON(exportedSettings, `${projectName}_ff_`);
      } else if (!downloadFullFormat) {
        console.log("Full format JSON download is disabled.");
      } else {
        console.error("Failed to generate full format JSON for download or content is empty.");
      }
      if (downloadSerializedFormat && serializedExportedSettings && serializedExportedSettings.length > 2) {
        this.downloadJSON(serializedExportedSettings, `${projectName}_sf_`);
      } else if (!downloadSerializedFormat) {
        console.log("Serialized format JSON download is disabled.");
      } else {
        console.error("Failed to generate serialized format JSON for download or content is empty.");
      }
      if (includeGzip && serializedExportedSettings && serializedExportedSettings.length > 2) {
        createGzipFile(serializedExportedSettings)
          .then(blob => {   
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `${projectName}_sf.gz`;
            downloadLink.click();
            console.log("Gzip file created and downloaded successfully.");
          })
          .catch(error => {
            console.error("Error during Gzip creation:", error);
          });
      } else if (!includeGzip) {
        console.log("Gzip file creation is disabled.");
      } else {
        console.error("Failed to generate serialized format JSON for Gzip compression or content is empty.");
      }
    }
  
    serialize(data) {
      const keyMap = {
        projectName: 0,
        artistName: 1,
        projectBPM: 2,
        currentSequence: 3,
        channelURLs: 4,
        channelVolume: 5,
        channelPlaybackSpeed: 6,
        trimSettings: 7,
        projectChannelNames: 8,
        startSliderValue: 9,
        endSliderValue: 10,
        totalSampleDuration: 11,
        start: 12,
        end: 13,
        projectSequences: 14,
        steps: 15
      };
      const reverseChannelMap = Array.from({ length: this.numChannels }, (_, i) => 
        i < 26 ? String.fromCharCode(65 + i) : i.toString()
      );
    const roundToFourDecimals = num => Math.round(num * 10000) / 10000;
      const compressSteps = steps => {
        if (!steps.length) return [];
        const compressed = [];
        let start = null, end = null, inRange = false;
        steps.forEach(step => {
          if (typeof step === 'number') {
            if (start === null) {
              start = end = step;
            } else if (step === end + 1) {
              end = step;
              inRange = true;
            } else {
              compressed.push(inRange ? { r: [start, end] } : start);
              start = end = step;
              inRange = false;
            }
          } else if (step.index !== undefined && step.reverse) {
            if (start !== null) {
              compressed.push(inRange ? { r: [start, end] } : start);
              start = end = null;
              inRange = false;
            }
            compressed.push(`${step.index}r`);
          }
        });
        if (start !== null) compressed.push(inRange ? { r: [start, end] } : start);
        return compressed;
      };
      const stripDomainFromUrl = url => {
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.pathname + parsedUrl.search;
        } catch (e) {
          return url;
        }
      };
      const serializeData = data => {
        const serializedData = {};
        for (const [key, value] of Object.entries(data)) {
          const shortKey = keyMap[key] ?? key;
          if (key === 'channelURLs') {
            serializedData[shortKey] = value.map(stripDomainFromUrl);
          } else if (Array.isArray(value)) {
            serializedData[shortKey] = (key === 'projectChannelNames')
              ? value.map((v, i) => reverseChannelMap[i] ?? v)
              : value.map(v => typeof v === 'number' ? roundToFourDecimals(v) : serializeData(v));
          } else if (typeof value === 'object' && value !== null) {
            serializedData[shortKey] = key === 'projectSequences'
              ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
                  const shortSeqKey = seqKey.replace('Sequence', 's');
                  const filteredChannels = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                    const letter = reverseChannelMap[parseInt(chKey.replace('ch', ''), 10)] ?? chKey;
                    if (chValue.steps?.length) {
                      chAcc[letter] = { [keyMap['steps']]: compressSteps(chValue.steps) };
                    }
                    return chAcc;
                  }, {});
                  if (Object.keys(filteredChannels).length) acc[shortSeqKey] = filteredChannels;
                  return acc;
                }, {})
              : serializeData(value);
          } else {
            serializedData[shortKey] = typeof value === 'number' ? roundToFourDecimals(value) : value;
          }
        }
        return serializedData;
      };
      return serializeData(data);
    }
  
    downloadJSON(content, fileNameBase) {
      try {
        console.log(`[downloadJSON] Attempting to download file with base name: ${fileNameBase}`);
        if (!content) throw new Error("Content is undefined or null");
        const fileName = `${fileNameBase}_AUDX.json`;
        console.log(`[downloadJSON] Generated file name: ${fileName}`);
        console.log(`[downloadJSON] Content length: ${content.length}`);
        console.log(`[downloadJSON] Content preview: ${content.slice(0, 100)}`);
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        console.log(`[downloadJSON] Initiating download for file: ${fileName}`);
        link.click();
        console.log(`[downloadJSON] Download initiated successfully for file: ${fileName}`);
      } catch (error) {
        console.error("Failed to download JSON:", error);
      }
    }
  
    async formatURL(url) {
      // Simulate asynchronous processing
      return new Promise(resolve => setTimeout(() => resolve(url), 100));
    }
  
    /*–––––– Playback Speed Control ––––––*/
  
    setGlobalPlaybackSpeed(speed) {
      this.globalPlaybackSpeed = speed;
      this.sourceNodes.forEach(sourceNode => {
        if (sourceNode && sourceNode.buffer) {
          sourceNode.playbackRate.setValueAtTime(speed, this.audioContext.currentTime);
        }
      });
      console.log(`Global playback speed set to ${speed}x`);
    }
  
    setChannelPlaybackSpeed(channelIndex, speed) {
      if (channelIndex < 0 || channelIndex >= this.channelPlaybackSpeed.length) {
        console.error("Channel index out of bounds");
        return;
      }
      this.channelPlaybackSpeed[channelIndex] = speed;
      const sourceNode = this.sourceNodes[channelIndex];
      if (sourceNode && sourceNode.buffer) {
        sourceNode.playbackRate.setValueAtTime(speed, this.audioContext.currentTime);
        console.log(`Playback speed for channel ${channelIndex} set to ${speed}x`);
      } else {
        console.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
      }
    }
  
    updatePlaybackSpeed(channelIndex) {
      const sourceNode = this.sourceNodes[channelIndex];
      if (sourceNode && sourceNode.buffer) {
        sourceNode.playbackRate.setValueAtTime(this.channelPlaybackSpeed[channelIndex], this.audioContext.currentTime);
        console.log(`Playback speed for channel ${channelIndex} updated to ${this.channelPlaybackSpeed[channelIndex]}x`);
      } else {
        console.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
      }
    }
  
    /*–––––– Sequences and Steps ––––––*/
  
    updateTotalSequences() {
      let lastActiveSequence = -1;
      for (let seq = 0; seq < this.numSequences; seq++) {
        const sequence = this.settings.masterSettings.projectSequences[`Sequence${seq}`];
        if (!sequence) continue;
        for (let ch = 0; ch < this.numChannels; ch++) {
          const channel = sequence[`ch${ch}`];
          if (channel && channel.steps.some(step => step.isActive)) {
            lastActiveSequence = seq;
            break;
          }
        }
      }
      this.numSequences = lastActiveSequence + 1;
      console.log(`Total sequences updated to ${this.numSequences}`);
    }
  
    checkSettings() {
      console.log("Current Global Settings:", this.settings);
      return this.settings.masterSettings;
    }
  
    initializeChannelSettings(numChannels) {
      const channelSettings = {};
      for (let ch = 0; ch < numChannels; ch++) {
        channelSettings[`ch${ch}`] = { volume: 1, pitch: 1 };
      }
      return channelSettings;
    }
  
    initializeSequences(numSequences = this.numSequences, numChannels = this.numChannels, numSteps = 64) {
      const sequenceData = {};
      for (let seq = 0; seq < numSequences; seq++) {
        sequenceData[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
      }
      return sequenceData;
    }
  
    initializeChannels(numChannels, numSteps) {
      const channels = {};
      for (let ch = 0; ch < numChannels; ch++) {
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
      }
      return channels;
    }
  
    getStepSettings(sequenceIndex, channelIndex, stepIndex) {
      const sequence = this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`];
      const channel = sequence && sequence[`ch${channelIndex}`];
      const step = channel && channel.steps[stepIndex];
      if (step) {
        return { isActive: step.isActive, isReverse: step.isReverse, volume: step.volume, pitch: step.pitch };
      } else {
        console.error('Invalid sequence, channel, or step index in getStepSettings');
        return { isActive: false, isReverse: false, volume: 1, pitch: 1 };
      }
    }
  
    getStepStateAndReverse(currentSequence, channelIndex, stepIndex) {
      const sequence = this.settings.masterSettings.projectSequences[`Sequence${currentSequence}`];
      const channel = sequence && sequence[`ch${channelIndex}`];
      if (channel && stepIndex < channel.steps.length) {
        const step = channel.steps[stepIndex];
        return { isActive: step.isActive, isReverse: step.isReverse };
      } else {
        console.error('Invalid sequence, channel, or step index in getStepStateAndReverse');
        return { isActive: false, isReverse: false };
      }
    }
  
    updateStepState(currentSequence, channelIndex, stepIndex, state) {
      console.log("updateStepState entered");
      const existingStepState = this.getStepStateAndReverse(currentSequence, channelIndex, stepIndex);
      if (typeof state === 'boolean') {
        this.updateStepStateAndReverse(currentSequence, channelIndex, stepIndex, state, existingStepState.isReverse);
        this.updateTotalSequences();
      } else {
        console.error('Invalid state type in updateStepState');
      }
    }
  
    getStepState(currentSequence, channelIndex, stepIndex) {
      const sequence = this.settings.masterSettings.projectSequences[`Sequence${currentSequence}`];
      const channel = sequence && sequence[`ch${channelIndex}`];
      if (channel && stepIndex < channel.steps.length) {
        return channel.steps[stepIndex].isActive;
      } else {
        console.error('Invalid sequence, channel, or step index in getStepState');
        return false;
      }
    }
  
    toggleStepState(sequenceIndex, channelIndex, stepIndex) {
      const step = this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`][`ch${channelIndex}`].steps[stepIndex];
      step.isActive = !step.isActive;
      this.updateTotalSequences();
      this.notifyObservers();
    }
  
    toggleStepReverseState(sequenceIndex, channelIndex, stepIndex) {
      const step = this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`][`ch${channelIndex}`].steps[stepIndex];
      step.isReverse = !step.isReverse;
      this.updateTotalSequences();
      this.notifyObservers();
    }
  
    updateStepStateAndReverse(currentSequence, channelIndex, stepIndex, isActive, isReverse) {
      if (typeof currentSequence !== 'number' || typeof channelIndex !== 'number' || typeof stepIndex !== 'number' ||
          typeof isActive !== 'boolean' || typeof isReverse !== 'boolean') {
        throw new Error('Invalid input types');
      }
      const step = this.settings?.masterSettings?.projectSequences?.[`Sequence${currentSequence}`]?.[`ch${channelIndex}`]?.steps?.[stepIndex];
      if (step) {
        step.isActive = isActive;
        step.isReverse = isReverse;
        this.updateTotalSequences();
      } else {
        throw new Error('Invalid sequence, channel, or step index in updateStepStateAndReverse');
      }
    }
  
    /*–––––– Channel & Step Settings ––––––*/
  
    getChannelPitch(channelIndex) {
      return this.settings.masterSettings.channelSettings[`ch${channelIndex}`]?.pitch || 1;
    }
  
    getStepVolume(sequenceIndex, channelIndex, stepIndex) {
      return this.getStepSettings(sequenceIndex, channelIndex, stepIndex).volume;
    }
    
    getStepPitch(sequenceIndex, channelIndex, stepIndex) {
      return this.getStepSettings(sequenceIndex, channelIndex, stepIndex).pitch;
    }
  
    setChannelPitch(channelIndex, pitch) {
      if (!this.settings.masterSettings.channelSettings) {
        this.settings.masterSettings.channelSettings = {};
      }
      if (!this.settings.masterSettings.channelSettings[`ch${channelIndex}`]) {
        this.settings.masterSettings.channelSettings[`ch${channelIndex}`] = {};
      }
      this.settings.masterSettings.channelSettings[`ch${channelIndex}`].pitch = pitch;
      this.notifyObservers();
    }
  
    setStepVolume(channelIndex, stepIndex, volume) {
      const sequence = this.settings.masterSettings.currentSequence;
      const channel = this.settings.masterSettings.projectSequences[`Sequence${sequence}`]?.[`ch${channelIndex}`];
      const step = channel?.steps[stepIndex];
      if (step) {
        step.volume = volume;
      } else {
        console.error('Invalid sequence, channel, or step index in setStepVolume');
      }
      this.notifyObservers();
    }
  
    setStepPitch(channelIndex, stepIndex, pitch) {
      const sequence = this.settings.masterSettings.currentSequence;
      const channel = this.settings.masterSettings.projectSequences[`Sequence${sequence}`]?.[`ch${channelIndex}`];
      const step = channel?.steps[stepIndex];
      if (step) {
        step.pitch = pitch;
      } else {
        console.error('Invalid sequence, channel, or step index in setStepPitch');
      }
      this.notifyObservers();
    }
  
    /*–––––– Trim Settings & UI Updates ––––––*/
  
    initializeTrimSettings(numSettings) {
      console.log("initializeTrimSettings entered with numSettings:", numSettings);
      return Array.from({ length: numSettings }, () => ({
        start: 0,
        end: 100,
        length: 0
      }));
    }
  
    updateTrimSettingsUI(trimSettings) {
      console.log("updateTrimSettingsUI entered", trimSettings);
      trimSettings.forEach((setting, index) => {
        const startSlider = document.getElementById(`start-slider-${index}`);
        const endSlider = document.getElementById(`end-slider-${index}`);
        if (startSlider && endSlider) {
          startSlider.value = setting.start;
          endSlider.value = setting.end;
        }
      });
    }
  
    /*–––––– Observer & UI Helpers ––––––*/
  
    addObserver(observerFunction) {
      console.log("addObserver", observerFunction);
      this.observers.push(observerFunction);
    }
  
    notifyObservers() {
      console.log('[SequenceChangeDebug] Notifying observers of changes.');
      this.observers.forEach(observerFunction => observerFunction(this.settings));
    }
  
    setTrimSettings(channelIndex, start, end) {
      console.log("setTrimSettings entered");
      if (this.isValidIndex(channelIndex)) {
        const currentSettings = this.settings.masterSettings.trimSettings[channelIndex];
        if (currentSettings) {
          Object.assign(currentSettings, { start, end });
        } else {
          console.error(`Trim settings not found for channel index: ${channelIndex}`);
        }
      } else {
        console.error(`Invalid channel index: ${channelIndex}`);
      }
    }
    
    getTrimSettings(channelIndex) {
      const trimSettings = this.settings.masterSettings.trimSettings[channelIndex];
      return trimSettings || { start: 0, end: 1 };
    }
  
    isValidIndex(index) {
      console.log("isValidIndex entered");
      return index >= 0 && index < this.numChannels;
    }
  
    updateUIForSequence(currentSequenceIndex) {
      const channels = document.querySelectorAll('.channel');
      channels.forEach((channel, channelIndex) => {
        const stepButtons = channel.querySelectorAll('.step-button');
        stepButtons.forEach((button, stepIndex) => {
          const { isActive, isReverse } = this.getStepStateAndReverse(currentSequenceIndex, channelIndex, stepIndex);
          button.classList.toggle('selected', isActive);
          button.classList.toggle('reverse', isReverse);
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
  
    addChannelURL(index, url) {
      if (index >= 0 && index < this.settings.masterSettings.channelURLs.length) {
        console.log(`[addChannelURL] Adding URL to channel ${index}: ${url}`);
        this.settings.masterSettings.channelURLs[index] = url;
        this.notifyObservers();
      } else {
        console.error(`[addChannelURL] Invalid channel index: ${index}`);
      }
    }
  
    getChannelURL(index) {
      if (index >= 0 && index < this.settings.masterSettings.channelURLs.length) {
        console.log(`[getChannelURL] Retrieving URL from channel ${index}: ${this.settings.masterSettings.channelURLs[index]}`);
        return this.settings.masterSettings.channelURLs[index];
      } else {
        console.error(`[getChannelURL] Invalid channel index: ${index}`);
        return null;
      }
    }
  
    updateProjectChannelNamesUI(channelIndexOrNames, name) {
      if (typeof channelIndexOrNames === 'number') {
        const channelIndex = channelIndexOrNames;
        const defaultName = 'Load Sample';
        let effectiveName = name;
        const channelUrl = this.settings.masterSettings.channelURLs[channelIndex];
        const urlName = channelUrl ? channelUrl.split('/').pop().split('#')[0] : defaultName;
        if (!effectiveName) {
          effectiveName = urlName;
        }
        console.log("[updateProjectChannelNamesUI] Updating with name:", effectiveName);
        const nameDisplay = document.getElementById(`channel-name-${channelIndex}`);
        if (nameDisplay) {
          nameDisplay.textContent = effectiveName;
        }
        this.settings.masterSettings.projectChannelNames[channelIndex] = effectiveName;
      } else {
        const names = channelIndexOrNames;
        names.forEach((name, index) => {
          this.updateProjectChannelNamesUI(index, name);
        });
      }
    }

    setChannelName(channelIndex, name) {
        // Update the internal settings
        this.settings.masterSettings.projectChannelNames[channelIndex] = name;
        // Optionally update the UI for this channel name.
        // This assumes updateProjectChannelNamesUI can take the channel index and name.
        this.updateProjectChannelNamesUI(channelIndex, name);
        // If you need to notify observers or do any additional work, you can do that here.
        console.log(`Channel ${channelIndex} name set to: ${name}`);
      }
  
    getChannelName(channelIndex) {
      console.log("getChannelName entered");
      return this.settings.masterSettings.projectChannelNames[channelIndex];
    }
  
    setProjectName(name) {
      console.log("setProjectName entered");
      this.settings.masterSettings.projectName = name;
      this.notifyObservers();
    }
  
    clearMasterSettings() {
      console.log("[clearMasterSettings] Current masterSettings before clearing:", this.settings.masterSettings);
      this.settings.masterSettings.projectName = 'New Audx Project';
      this.settings.masterSettings.artistName = '';
      this.settings.masterSettings.projectBPM = 120;
      this.settings.masterSettings.currentSequence = 0;
      this.settings.masterSettings.channelURLs = new Array(this.numChannels).fill('');
      this.settings.masterSettings.projectChannelNames = new Array(this.numChannels).fill('Load Sample');
      this.settings.masterSettings.channelVolume = new Array(this.numChannels).fill(1);
      this.settings.masterSettings.trimSettings = Array.from({ length: this.numChannels }, () => ({
        start: 0.01, 
        end: 100.00, 
        length: 0
      }));
      this.settings.masterSettings.channelPlaybackSpeed = new Array(this.numChannels).fill(1);
      this.settings.masterSettings.projectSequences = this.initializeSequences(64, this.numChannels, 64);
      console.log("[clearMasterSettings] Master settings cleared.");
    }
  
    setCurrentSequence(currentSequence) {
      if (this.settings.masterSettings.currentSequence !== currentSequence) {
        this.settings.masterSettings.currentSequence = currentSequence;
        this.notifyObservers();
      }
    }
  
    getCurrentSequence() {
      return this.settings.masterSettings.currentSequence;
    }
  
    getSequenceSettings(sequenceIndex) {
      console.log("getSequenceSettings entered");
      return this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`];
    }
  
    setSequenceSettings(sequenceIndex, sequenceSettings) {
      console.log("setSequenceSettings entered");
      this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`] = sequenceSettings;
    }
  
    getSettings(key) {
      console.log("getSettings entered", key);
      if (key === 'masterSettings') {
        console.log("[getSettings] Retrieved all masterSettings:", this.settings.masterSettings);
        return this.settings.masterSettings;
      } else if (key) {
        const settingValue = this.settings.masterSettings[key];
        console.log(`[getSettings] Retrieved setting for key '${key}':`, settingValue);
        return settingValue;
      } else {
        console.log("[getSettings] Retrieved all settings:", this.settings);
        return this.settings;
      }
    }
  
    updateProjectSequencesUI() {
      console.log("updateProjectSequencesUI entered");
      const projectSequences = this.getSettings('projectSequences');
      Object.values(projectSequences).forEach((sequence, index) => {
        updateSequenceUI(index, sequence); // Assumes updateSequenceUI is defined elsewhere
      });
    }
  
    updateSetting(key, value, channelIndex = null) {
      console.log("updateSetting entered");
      if (channelIndex !== null && Array.isArray(this.settings.masterSettings[key])) {
        this.settings.masterSettings[key][channelIndex] = value;
      } else if (key in this.settings.masterSettings) {
        this.settings.masterSettings[key] = value;
      } else {
        console.error(`Setting ${key} does not exist in masterSettings`);
      }
    }
  
    updateSampleDuration(duration, channelIndex) {
      console.log("updateSampleDuration entered");
      if (this.isValidIndex(channelIndex)) {
        this.settings.masterSettings.trimSettings[channelIndex].length = duration;
      } else {
        console.error(`Invalid channel index: ${channelIndex}`);
      }
    }
  
    getBPM() {
      return this.settings.masterSettings.projectBPM;
    }
  
    setBPM(newBPM) {
      this.settings.masterSettings.projectBPM = newBPM;
    }
  
    updateAllLoadSampleButtonTexts() {
      console.log("updateAllLoadSampleButtonTexts entered");
      const channels = document.querySelectorAll('.channel');
      channels.forEach((channel, index) => {
        const loadSampleButton = channel.querySelector('.load-sample-button');
        if (loadSampleButton) {
          this.updateLoadSampleButtonText(index, loadSampleButton);
        }
      });
    }
  
    updateLoadSampleButtonText(channelIndex, button) {
      console.log("updateLoadSampleButtonText entered");
      if (!button) {
        console.error(`updateLoadSampleButtonText: Button not found for channelIndex ${channelIndex}`);
        return;
      }
      let buttonText = 'Load New Audional';
      console.log(`[updateLoadSampleButtonText] Default text: ${buttonText}`);
      if (!this.settings || !this.settings.masterSettings) {
        console.error('updateLoadSampleButtonText: masterSettings not properly initialized');
        button.textContent = buttonText;
        return;
      }
      const { projectChannelNames, channelURLs } = this.settings.masterSettings;
      if (!Array.isArray(projectChannelNames) || !Array.isArray(channelURLs)) {
        console.error('updateLoadSampleButtonText: projectChannelNames or channelURLs is not an array');
        button.textContent = buttonText;
        return;
      }
      const channelName = projectChannelNames[channelIndex];
      const loadedUrl = channelURLs[channelIndex];
      console.log(`[updateLoadSampleButtonText] Channel Name: ${channelName}, Loaded URL: ${loadedUrl}`);
      if (channelName) {
        buttonText = channelName;
      } else if (loadedUrl) {
        const urlParts = loadedUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        buttonText = lastPart;
      }
      console.log(`[updateLoadSampleButtonText] Final button text: ${buttonText}`);
      button.textContent = buttonText;
    }
  
    updateProjectNameUI(projectName) {
      console.log("Project name UI entered and updated:", projectName);
      const projectNameInput = document.getElementById('project-name');
      if (projectNameInput) {
        projectNameInput.value = projectName || "AUDX Project";
        console.log("Project name UI updated:", projectName);
      }
    }
  
    updateBPMUI(bpm) {
      const bpmSlider = document.getElementById('bpm-slider');
      const bpmDisplay = document.getElementById('bpm-display');
      if (bpmSlider && bpmDisplay) {
        bpmSlider.value = bpm;
        bpmDisplay.textContent = bpm;
        console.log("BPM UI updated:", bpm);
      }
    }
  
    updateChannelURLsUI(urls) {
      console.log("Project URLs UI entered and updated:", urls);
      urls.forEach((url, index) => {
        const urlInput = document.getElementById(`url-input-${index}`);
        if (urlInput) {
          urlInput.value = url;
        }
      });
    }
  
    ensureArrayLength(array, maxLength) {
      while (array.length < maxLength) {
        array.push(this.getDefaultArrayElement());
      }
    }
    
    getDefaultArrayElement() {
      return { start: 0.01, end: 100.00, length: 0 };
    }
  }
  
  window.unifiedSequencerSettings = new UnifiedSequencerSettings(null, 64, 32);  
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
  
      // Global debug flag – set to true to enable debug logging
      this.DEBUG = false;
  
      // Define a shared log method
      this.log = (msg, ...args) => {
        if (this.DEBUG) {
          console.log(msg, ...args);
        }
      };
  
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
      this.log("Initializing gain nodes");
      for (let i = 0; i < this.numChannels; i++) {
        if (!this.gainNodes[i]) {
          const gainNode = this.audioContext.createGain();
          gainNode.gain.setValueAtTime(this.settings.masterSettings.channelVolume[i], this.audioContext.currentTime);
          gainNode.connect(this.audioContext.destination);
          this.gainNodes[i] = gainNode;
          this.log(`Gain node ${i} initialized with volume ${this.settings.masterSettings.channelVolume[i]}`);
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
        this.log(`Gain node ${channelIndex} initialized with volume ${volume}`);
      }
    }
  
    setChannelVolume(channelIndex, volume) {
      this.log(`Setting volume for channel ${channelIndex} to ${volume}`);
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
      this.log(`Volume for channel ${channelIndex} set to ${volume}`);
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
  this.log("[internalPresetDebug] loadSettings entered");
  try {
    this.clearMasterSettings();
    let jsonSettings;
    if (inputData instanceof Uint8Array || inputData instanceof ArrayBuffer) {
      this.log("[internalPresetDebug] Received Gzip data, decompressing...");
      const decompressedData = await decompressGzipFile(inputData);
      jsonSettings = JSON.parse(decompressedData);
    } else if (typeof inputData === "string") {
      jsonSettings = JSON.parse(inputData);
    } else {
      jsonSettings = inputData;
    }
    this.log("[internalPresetDebug] Received JSON Settings:", jsonSettings);
    const settingsToLoad = this.isHighlySerialized(jsonSettings)
      ? await this.decompressSerializedData(jsonSettings)
      : jsonSettings;
    this.settings.masterSettings.projectName = settingsToLoad.projectName;
    this.settings.masterSettings.projectBPM = settingsToLoad.projectBPM;
    this.settings.masterSettings.artistName = settingsToLoad.artistName || "";
    this.globalPlaybackSpeed = settingsToLoad.globalPlaybackSpeed || 1;
    this.channelPlaybackSpeed = settingsToLoad.channelPlaybackSpeed || new Array(this.numChannels).fill(1);
    if (this.channelPlaybackSpeed.length < this.numChannels) {
      this.channelPlaybackSpeed = [
        ...this.channelPlaybackSpeed,
        ...new Array(this.numChannels - this.channelPlaybackSpeed.length).fill(1)
      ];
    }
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
    if (!settingsToLoad || typeof settingsToLoad !== "object") {
      throw new Error("Invalid or undefined settingsToLoad");
    }
    this.sortAndApplyProjectSequences(settingsToLoad.projectSequences);
    this.updateUIWithLoadedSettings();







    function audioBufferToWav(buffer, opt) {
      opt = opt || {};
      var numChannels = buffer.numberOfChannels;
      var sampleRate = buffer.sampleRate;
      var format = opt.float32 ? 3 : 1;
      var bitDepth = format === 3 ? 32 : 16;
      var result;
      if (numChannels === 2) {
        result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
      } else {
        result = buffer.getChannelData(0);
      }
      return encodeWAV(result, numChannels, sampleRate, bitDepth);
    }
    
    function interleave(inputL, inputR) {
      var length = inputL.length + inputR.length;
      var result = new Float32Array(length);
      var index = 0, inputIndex = 0;
      while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
      }
      return result;
    }
    
    function encodeWAV(samples, numChannels, sampleRate, bitDepth) {
      var bytesPerSample = bitDepth / 8;
      var blockAlign = numChannels * bytesPerSample;
      var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
      var view = new DataView(buffer);
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + samples.length * bytesPerSample, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, samples.length * bytesPerSample, true);
      if (bitDepth === 16) {
        floatTo16BitPCM(view, 44, samples);
      } else {
        writeFloat32(view, 44, samples);
      }
      return buffer;
    }
    
    function writeFloat32(view, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 4) {
        view.setFloat32(offset, input[i], true);
      }
    }
    
    function floatTo16BitPCM(view, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    }
    
    function writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    
    // ---------------------------------------------------------
    // Offline Bounce Integration
    // After the settings are applied, we want to render the current sequence offline,
    // convert it to a WAV file, and download it automatically.
    // A short delay is added to ensure that all audio buffers are loaded.
    setTimeout(() => {
      // Instantiate the offline bounce module (assumes OfflineBounce is globally available)
      const bounceModule = new OfflineBounce(window.unifiedSequencerSettings);
      bounceModule.bounceCurrentSequence().then(renderedBuffer => {
        // Convert the rendered AudioBuffer to a WAV ArrayBuffer.
        // (audioBufferToWav is assumed to be defined; see note below.)
        const wavArrayBuffer = audioBufferToWav(renderedBuffer);
        const blob = new Blob([wavArrayBuffer], { type: "audio/wav" });
        const projectName = this.settings.masterSettings.projectName || "Project";
        const fileName = `${projectName}_bounce.wav`;
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = fileName;
        // Append link to DOM (required for Firefox), click it, and remove it.
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }).catch(error => {
        console.error("Offline bounce error:", error);
      });
    }, 500); // delay (in ms) to ensure that all audio data is ready
    // ---------------------------------------------------------
  } catch (error) {
    console.error("[internalPresetDebug] Error loading settings:", error);
  }
}

async formatAndFetchAudio(url, index) {
  const baseDomain = "https://ordinals.com";
  if (url.startsWith("/")) {
    url = `${baseDomain}${url}`;
  }
  return this.formatURL(url).then((formattedUrl) => {
    this.settings.masterSettings.channelURLs[index] = formattedUrl;
    // Use the namespaced fetchAudio
    return window.AudioUtilsPart1.fetchAudio(formattedUrl, index);
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
  this.log("[sortAndApplyProjectSequences] Sorting and applying project sequences.");
  if (!projectSequences || typeof projectSequences !== "object") {
    throw new Error("[sortAndApplyProjectSequences] Invalid project sequences data.");
  }
  Object.keys(projectSequences).forEach(sequenceKey => {
    const sequenceData = projectSequences[sequenceKey];
    if (!sequenceData || typeof sequenceData !== "object") return;
    if (!this.settings.masterSettings.projectSequences[sequenceKey]) {
      this.settings.masterSettings.projectSequences[sequenceKey] = {};
    }
    Object.keys(sequenceData).forEach(channelKey => {
      const channelData = sequenceData[channelKey];
      const channelIndex = parseInt(channelKey.replace("ch", ""), 10);
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
            if (typeof step === "object" && step.index !== undefined) {
              index = step.index - 1;
              isReverse = step.reverse || false;
            } else if (typeof step === "number") {
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
  this.log("[sortAndApplyProjectSequences] Project sequences sorted and applied.");
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
      this.log("[exportSettings] Exported Settings:", exportedSettings);
      const serializedSettings = this.serialize(settingsClone);
      const serializedExportedSettings = JSON.stringify(serializedSettings);
      this.log("[exportSettings] Serialized Exported Settings:", serializedExportedSettings);
      const projectName = this.settings.masterSettings.projectName || "Project";
      const downloadFullFormat = true;
      const downloadSerializedFormat = false;
      if (downloadFullFormat && exportedSettings && exportedSettings.length > 2) {
        this.downloadJSON(exportedSettings, `${projectName}_ff_`);
      } else if (!downloadFullFormat) {
        this.log("Full format JSON download is disabled.");
      } else {
        console.error("Failed to generate full format JSON for download or content is empty.");
      }
      if (downloadSerializedFormat && serializedExportedSettings && serializedExportedSettings.length > 2) {
        this.downloadJSON(serializedExportedSettings, `${projectName}_sf_`);
      } else if (!downloadSerializedFormat) {
        this.log("Serialized format JSON download is disabled.");
      } else {
        console.error("Failed to generate serialized format JSON for download or content is empty.");
      }
      if (includeGzip && serializedExportedSettings && serializedExportedSettings.length > 2) {
        createGzipFile(serializedExportedSettings)
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = `${projectName}_sf.gz`;
            downloadLink.click();
            this.log("Gzip file created and downloaded successfully.");
          })
          .catch(error => {
            console.error("Error during Gzip creation:", error);
          });
      } else if (!includeGzip) {
        this.log("Gzip file creation is disabled.");
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
      if (typeof step === "number") {
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
    if (!url) return "";
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname + parsedUrl.search;
    } catch (e) {
      return url;
    }
  };

  function serializeData(data) {
    // If data is null or not an object, just return it.
    if (data === null || typeof data !== "object") return data;
    const serializedData = {};
    for (const [key, value] of Object.entries(data)) {
      // If the value is null or undefined, skip this key.
      if (value === null || value === undefined) continue;

      const shortKey = keyMap[key] ?? key;

      if (key === "channelURLs") {
        // Ensure value is an array and filter/map valid entries.
        serializedData[shortKey] = Array.isArray(value)
          ? value.filter(v => v).map(stripDomainFromUrl)
          : [];
      } else if (Array.isArray(value)) {
        serializedData[shortKey] =
          key === "projectChannelNames"
            ? value.map((v, i) => reverseChannelMap[i] ?? v)
            : value.map(v =>
                typeof v === "number"
                  ? roundToFourDecimals(v)
                  : serializeData(v)
              );
      } else if (typeof value === "object") {
        // Special handling for projectSequences.
        if (key === "projectSequences") {
          serializedData[shortKey] = Object.entries(value).reduce(
            (acc, [seqKey, channels]) => {
              const shortSeqKey = seqKey.replace("Sequence", "s");
              const filteredChannels = Object.entries(channels).reduce(
                (chAcc, [chKey, chValue]) => {
                  const letter =
                    reverseChannelMap[parseInt(chKey.replace("ch", ""), 10)] ?? chKey;
                  if (chValue.steps && chValue.steps.length) {
                    chAcc[letter] = { [keyMap["steps"]]: compressSteps(chValue.steps) };
                  }
                  return chAcc;
                },
                {}
              );
              if (Object.keys(filteredChannels).length)
                acc[shortSeqKey] = filteredChannels;
              return acc;
            },
            {}
          );
        } else {
          serializedData[shortKey] = serializeData(value);
        }
      } else {
        serializedData[shortKey] =
          typeof value === "number" ? roundToFourDecimals(value) : value;
      }
    }
    return serializedData;
  }

  return serializeData(data);
}

  
    downloadJSON(content, fileNameBase) {
      try {
        this.log(`[downloadJSON] Attempting to download file with base name: ${fileNameBase}`);
        if (!content) throw new Error("Content is undefined or null");
        const fileName = `${fileNameBase}_AUDX.json`;
        this.log(`[downloadJSON] Generated file name: ${fileName}`);
        this.log(`[downloadJSON] Content length: ${content.length}`);
        this.log(`[downloadJSON] Content preview: ${content.slice(0, 100)}`);
        const blob = new Blob([content], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        this.log(`[downloadJSON] Initiating download for file: ${fileName}`);
        link.click();
        this.log(`[downloadJSON] Download initiated successfully for file: ${fileName}`);
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
      this.log(`Global playback speed set to ${speed}x`);
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
        this.log(`Playback speed for channel ${channelIndex} set to ${speed}x`);
      } else {
        this.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
      }
    }
  
    updatePlaybackSpeed(channelIndex) {
      const sourceNode = this.sourceNodes[channelIndex];
      if (sourceNode && sourceNode.buffer) {
        sourceNode.playbackRate.setValueAtTime(this.channelPlaybackSpeed[channelIndex], this.audioContext.currentTime);
        this.log(`Playback speed for channel ${channelIndex} updated to ${this.channelPlaybackSpeed[channelIndex]}x`);
      } else {
        this.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
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
      this.log(`Total sequences updated to ${this.numSequences}`);
    }
  
    checkSettings() {
      this.log("Current Global Settings:", this.settings);
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
          url: ""
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
        console.error("Invalid sequence, channel, or step index in getStepSettings");
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
        console.error("Invalid sequence, channel, or step index in getStepStateAndReverse");
        return { isActive: false, isReverse: false };
      }
    }
  
    updateStepState(currentSequence, channelIndex, stepIndex, state) {
      this.log("updateStepState entered");
      const existingStepState = this.getStepStateAndReverse(currentSequence, channelIndex, stepIndex);
      if (typeof state === "boolean") {
        this.updateStepStateAndReverse(currentSequence, channelIndex, stepIndex, state, existingStepState.isReverse);
        this.updateTotalSequences();
      } else {
        console.error("Invalid state type in updateStepState");
      }
    }
  
    getStepState(currentSequence, channelIndex, stepIndex) {
      const sequence = this.settings.masterSettings.projectSequences[`Sequence${currentSequence}`];
      const channel = sequence && sequence[`ch${channelIndex}`];
      if (channel && stepIndex < channel.steps.length) {
        return channel.steps[stepIndex].isActive;
      } else {
        console.error("Invalid sequence, channel, or step index in getStepState");
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
      if (
        typeof currentSequence !== "number" ||
        typeof channelIndex !== "number" ||
        typeof stepIndex !== "number" ||
        typeof isActive !== "boolean" ||
        typeof isReverse !== "boolean"
      ) {
        throw new Error("Invalid input types");
      }
      const step =
        this.settings?.masterSettings?.projectSequences?.[`Sequence${currentSequence}`]?.[`ch${channelIndex}`]?.steps?.[stepIndex];
      if (step) {
        step.isActive = isActive;
        step.isReverse = isReverse;
        this.updateTotalSequences();
      } else {
        throw new Error("Invalid sequence, channel, or step index in updateStepStateAndReverse");
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
        console.error("Invalid sequence, channel, or step index in setStepVolume");
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
        console.error("Invalid sequence, channel, or step index in setStepPitch");
      }
      this.notifyObservers();
    }
  
    /*–––––– Trim Settings & UI Updates ––––––*/
  
    initializeTrimSettings(numSettings) {
      this.log("initializeTrimSettings entered with numSettings:", numSettings);
      return Array.from({ length: numSettings }, () => ({
        start: 0,
        end: 100,
        length: 0
      }));
    }
  
    updateTrimSettingsUI(trimSettings) {
      this.log("updateTrimSettingsUI entered", trimSettings);
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
      this.log("addObserver", observerFunction);
      this.observers.push(observerFunction);
    }
  
    notifyObservers() {
      this.log("[SequenceChangeDebug] Notifying observers of changes.");
      this.observers.forEach(observerFunction => observerFunction(this.settings));
    }
  
    setTrimSettings(channelIndex, start, end) {
      this.log("setTrimSettings entered");
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
      this.log("isValidIndex entered");
      return index >= 0 && index < this.numChannels;
    }
  
    updateUIForSequence(currentSequenceIndex) {
      const channels = document.querySelectorAll(".channel");
      channels.forEach((channel, channelIndex) => {
        const stepButtons = channel.querySelectorAll(".step-button");
        stepButtons.forEach((button, stepIndex) => {
          const { isActive, isReverse } = this.getStepStateAndReverse(currentSequenceIndex, channelIndex, stepIndex);
          button.classList.toggle("selected", isActive);
          button.classList.toggle("reverse", isReverse);
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
        this.log(`[addChannelURL] Adding URL to channel ${index}: ${url}`);
        this.settings.masterSettings.channelURLs[index] = url;
        this.notifyObservers();
      } else {
        console.error(`[addChannelURL] Invalid channel index: ${index}`);
      }
    }
  
    getChannelURL(index) {
      if (index >= 0 && index < this.settings.masterSettings.channelURLs.length) {
        this.log(`[getChannelURL] Retrieving URL from channel ${index}: ${this.settings.masterSettings.channelURLs[index]}`);
        return this.settings.masterSettings.channelURLs[index];
      } else {
        console.error(`[getChannelURL] Invalid channel index: ${index}`);
        return null;
      }
    }
  
    updateProjectChannelNamesUI(channelIndexOrNames, name) {
      if (typeof channelIndexOrNames === "number") {
        const channelIndex = channelIndexOrNames;
        const defaultName = "Load Sample";
        let effectiveName = name;
        const channelUrl = this.settings.masterSettings.channelURLs[channelIndex];
        const urlName = channelUrl ? channelUrl.split("/").pop().split("#")[0] : defaultName;
        if (!effectiveName) {
          effectiveName = urlName;
        }
        this.log("[updateProjectChannelNamesUI] Updating with name:", effectiveName);
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
      this.updateProjectChannelNamesUI(channelIndex, name);
      this.log(`Channel ${channelIndex} name set to: ${name}`);
    }
  
    getChannelName(channelIndex) {
      this.log("getChannelName entered");
      return this.settings.masterSettings.projectChannelNames[channelIndex];
    }
  
    setProjectName(name) {
      this.log("setProjectName entered");
      this.settings.masterSettings.projectName = name;
      this.notifyObservers();
    }
  
    clearMasterSettings() {
      this.log("[clearMasterSettings] Current masterSettings before clearing:", this.settings.masterSettings);
      this.settings.masterSettings.projectName = "New Audx Project";
      this.settings.masterSettings.artistName = "";
      this.settings.masterSettings.projectBPM = 120;
      this.settings.masterSettings.currentSequence = 0;
      this.settings.masterSettings.channelURLs = new Array(this.numChannels).fill("");
      this.settings.masterSettings.projectChannelNames = new Array(this.numChannels).fill("Load Sample");
      this.settings.masterSettings.channelVolume = new Array(this.numChannels).fill(1);
      this.settings.masterSettings.trimSettings = Array.from({ length: this.numChannels }, () => ({
        start: 0.01,
        end: 100.0,
        length: 0
      }));
      this.settings.masterSettings.channelPlaybackSpeed = new Array(this.numChannels).fill(1);
      // Also update the global channelPlaybackSpeed property:
      this.channelPlaybackSpeed = new Array(this.numChannels).fill(1);
      this.settings.masterSettings.projectSequences = this.initializeSequences(64, this.numChannels, 64);
      this.log("[clearMasterSettings] Master settings cleared.");
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
      this.log("getSequenceSettings entered");
      return this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`];
    }
  
    setSequenceSettings(sequenceIndex, sequenceSettings) {
      this.log("setSequenceSettings entered");
      this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`] = sequenceSettings;
    }
  
    getSettings(key) {
      this.log("getSettings entered", key);
      if (key === "masterSettings") {
        this.log("[getSettings] Retrieved all masterSettings:", this.settings.masterSettings);
        return this.settings.masterSettings;
      } else if (key) {
        const settingValue = this.settings.masterSettings[key];
        this.log(`[getSettings] Retrieved setting for key '${key}':`, settingValue);
        return settingValue;
      } else {
        this.log("[getSettings] Retrieved all settings:", this.settings);
        return this.settings;
      }
    }
  
    updateProjectSequencesUI() {
      const projectSequences = this.getSettings("projectSequences");
      Object.values(projectSequences).forEach((sequence, index) => {
        updateSequenceUI(index, sequence); // Assumes updateSequenceUI is defined elsewhere
      });
    }
  
    updateSetting(key, value, channelIndex = null) {
      this.log("updateSetting entered");
      if (channelIndex !== null && Array.isArray(this.settings.masterSettings[key])) {
        this.settings.masterSettings[key][channelIndex] = value;
      } else if (key in this.settings.masterSettings) {
        this.settings.masterSettings[key] = value;
      } else {
        console.error(`Setting ${key} does not exist in masterSettings`);
      }
    }
  
    updateSampleDuration(duration, channelIndex) {
      this.log("updateSampleDuration entered");
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
      this.log("updateAllLoadSampleButtonTexts entered");
      const channels = document.querySelectorAll(".channel");
      channels.forEach((channel, index) => {
        const loadSampleButton = channel.querySelector(".load-sample-button");
        if (loadSampleButton) {
          this.updateLoadSampleButtonText(index, loadSampleButton);
        }
      });
    }
  
    updateLoadSampleButtonText(channelIndex, button) {
      this.log("updateLoadSampleButtonText entered");
      if (!button) {
        console.error(`updateLoadSampleButtonText: Button not found for channelIndex ${channelIndex}`);
        return;
      }
      let buttonText = "Load New Audional";
      this.log(`[updateLoadSampleButtonText] Default text: ${buttonText}`);
      if (!this.settings || !this.settings.masterSettings) {
        console.error("updateLoadSampleButtonText: masterSettings not properly initialized");
        button.textContent = buttonText;
        return;
      }
      const { projectChannelNames, channelURLs } = this.settings.masterSettings;
      if (!Array.isArray(projectChannelNames) || !Array.isArray(channelURLs)) {
        console.error("updateLoadSampleButtonText: projectChannelNames or channelURLs is not an array");
        button.textContent = buttonText;
        return;
      }
      const channelName = projectChannelNames[channelIndex];
      const loadedUrl = channelURLs[channelIndex];
      this.log(`[updateLoadSampleButtonText] Channel Name: ${channelName}, Loaded URL: ${loadedUrl}`);
      if (channelName) {
        buttonText = channelName;
      } else if (loadedUrl) {
        const urlParts = loadedUrl.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        buttonText = lastPart;
      }
      this.log(`[updateLoadSampleButtonText] Final button text: ${buttonText}`);
      button.textContent = buttonText;
    }
  
    updateProjectNameUI(projectName) {
      this.log("Project name UI entered and updated:", projectName);
      const projectNameInput = document.getElementById("project-name");
      if (projectNameInput) {
        projectNameInput.value = projectName || "AUDX Project";
        this.log("Project name UI updated:", projectName);
      }
    }
  
    updateBPMUI(bpm) {
      const bpmSlider = document.getElementById("bpm-slider");
      const bpmDisplay = document.getElementById("bpm-display");
      if (bpmSlider && bpmDisplay) {
        // Ensure that bpm is a number with one decimal place
        const formattedBPM = parseFloat(bpm).toFixed(1);
        bpmSlider.value = formattedBPM;
        bpmDisplay.value = formattedBPM;
        this.log("BPM UI updated:", formattedBPM);
      }
    }
  
    updateChannelURLsUI(urls) {
      this.log("Project URLs UI entered and updated:", urls);
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
      return { start: 0.01, end: 100.0, length: 0 };
    }
  }
  
  window.unifiedSequencerSettings = new UnifiedSequencerSettings(null, 64, 64);
  window.NUM_CHANNELS = window.unifiedSequencerSettings.numChannels;
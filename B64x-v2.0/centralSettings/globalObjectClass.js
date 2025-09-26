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
    this.DEBUG = true;

    // Define a shared log method
    this.log = (msg, ...args) => {
      if (this.DEBUG) {
        console.log(msg, ...args);
      }
    };

    // Add a new field: channelGroups, initialized to "all" for every channel.
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
        channelGroups: new Array(this.numChannels).fill('all'), // <-- NEW: initialize groups to "all"
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

  exportSettings(pretty = true, includeGzip = true) {
    // Clone and augment settings
    const clone = JSON.parse(JSON.stringify(this.settings.masterSettings));
    Object.assign(clone, {
      currentSequence: 0,
      globalPlaybackSpeed: this.globalPlaybackSpeed,
      channelPlaybackSpeed: Array.isArray(this.channelPlaybackSpeed)
        ? [...this.channelPlaybackSpeed]
        : new Array(this.numChannels).fill(1),
      channelVolume: Array.isArray(this.settings.masterSettings.channelVolume)
        ? [...this.settings.masterSettings.channelVolume]
        : new Array(this.numChannels).fill(1)
    });
    if (this.settings.masterSettings.artistName) {
      clone.artistName = this.settings.masterSettings.artistName;
    }
  
    // Process project sequences and compress step data
    Object.values(clone.projectSequences || {}).forEach(sequence => {
      Object.values(sequence).forEach(channel => {
        channel.steps = channel.steps.reduce((activeSteps, step, idx) => {
          if (step.isActive || step.isReverse) {
            const data = { index: idx + 1 };
            if (step.isReverse) data.reverse = true;
            const vol = step.volume !== undefined ? step.volume : 1;
            if (vol !== 1) data.volume = vol;
            if (step.pitch !== 1) data.pitch = step.pitch;
            activeSteps.push(Object.keys(data).length > 1 ? data : idx + 1);
          }
          return activeSteps;
        }, []);
        delete channel.mute;
        delete channel.url;
      });
    });
  
    // Create exported JSON strings
    const exportedSettings = JSON.stringify(clone, null, pretty ? 2 : 0);
    this.log("[exportSettings] Exported Settings:", exportedSettings);
    const serializedExportedSettings = JSON.stringify(this.serialize(clone));
    this.log("[exportSettings] Serialized Exported Settings:", serializedExportedSettings);
    const projectName = this.settings.masterSettings.projectName || "Project";
    const downloadFullFormat = true;
    const downloadSerializedFormat = false;
  
    // Download full JSON if enabled
    if (downloadFullFormat && exportedSettings?.length > 2) {
      this.downloadJSON(exportedSettings, `${projectName}_ff_`);
    } else if (!downloadFullFormat) {
      this.log("Full format JSON download is disabled.");
    } else {
      console.error("Failed to generate full format JSON for download or content is empty.");
    }
  
    // Download serialized JSON if enabled
    if (downloadSerializedFormat && serializedExportedSettings?.length > 2) {
      this.downloadJSON(serializedExportedSettings, `${projectName}_sf_`);
    } else if (!downloadSerializedFormat) {
      this.log("Serialized format JSON download is disabled.");
    } else {
      console.error("Failed to generate serialized format JSON for download or content is empty.");
    }
  
    // Optionally create and download a Gzip file
    if (includeGzip && serializedExportedSettings?.length > 2) {
      createGzipFile(serializedExportedSettings)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${projectName}_sf.gz`;
          link.click();
          this.log("Gzip file created and downloaded successfully.");
        })
        .catch(error => console.error("Error during Gzip creation:", error));
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
      steps: 15,
      channelGroups: 16 // <-- NEW: include channel groups in the serialized output
    };

    const reverseChannelMap = Array.from({ length: this.numChannels }, (_, i) =>
      i < 26 ? String.fromCharCode(65 + i) : i.toString()
    );
    const roundToFour = num => Math.round(num * 10000) / 10000;

    const compressSteps = steps => {
      if (!steps.length) return [];
      const compressed = [];
      let start = null,
        end = null,
        inRange = false;
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

    const stripDomain = url => {
      if (!url) return "";
      try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch (e) {
        return url;
      }
    };

    const serializeData = data => {
      if (data === null || typeof data !== "object") return data;
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        const shortKey = keyMap[key] ?? key;
        if (key === "channelURLs") {
          result[shortKey] = Array.isArray(value)
            ? value.filter(v => v).map(stripDomain)
            : [];
        } else if (Array.isArray(value)) {
          result[shortKey] = key === "projectChannelNames"
            ? value.map((v, i) => reverseChannelMap[i] ?? v)
            : value.map(v => (typeof v === "number" ? roundToFour(v) : serializeData(v)));
        } else if (typeof value === "object") {
          result[shortKey] = key === "projectSequences"
            ? Object.entries(value).reduce((acc, [seqKey, channels]) => {
                const shortSeqKey = seqKey.replace("Sequence", "s");
                const filtered = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
                  const letter = reverseChannelMap[parseInt(chKey.replace("ch", ""), 10)] ?? chKey;
                  if (chValue.steps?.length) {
                    chAcc[letter] = { [keyMap["steps"]]: compressSteps(chValue.steps) };
                  }
                  return chAcc;
                }, {});
                if (Object.keys(filtered).length) acc[shortSeqKey] = filtered;
                return acc;
              }, {})
            : serializeData(value);
        } else {
          result[shortKey] = typeof value === "number" ? roundToFour(value) : value;
        }
      }
      return result;
    };

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
    // Simulate asynchronous URL processing
    return new Promise(resolve => setTimeout(() => resolve(url), 100));
  }


  
 /*–––––– Settings Loading & Serialization ––––––*/
async loadSettings(inputData) {
  this.log("[internalPresetDebug] loadSettings entered");
  try {
    this.clearMasterSettings();

    // Determine and parse the input data
    const jsonSettings =
      inputData instanceof Uint8Array || inputData instanceof ArrayBuffer
        ? JSON.parse(await decompressGzipFile(inputData))
        : typeof inputData === "string"
          ? JSON.parse(inputData)
          : inputData;
    this.log("[internalPresetDebug] Received JSON Settings:", jsonSettings);

    const settingsToLoad = this.isHighlySerialized(jsonSettings)
      ? await this.decompressSerializedData(jsonSettings)
      : jsonSettings;

    if (!settingsToLoad || typeof settingsToLoad !== "object") {
      throw new Error("Invalid or undefined settingsToLoad");
    }

    // Destructure settings with defaults
    // After settingsToLoad is defined and destructured:
    const {
      projectName,
      projectBPM,
      artistName = "",
      globalPlaybackSpeed = 1,
      channelPlaybackSpeed,
      channelURLs,
      channelVolume,
      trimSettings,
      projectChannelNames,
      projectSequences
      // Note: channelGroups is not destructured here yet.
    } = settingsToLoad;

    // **NEW CODE FOR STAGE 1: Log the channelGroups**
    if (settingsToLoad.channelGroups) {
      this.log("[ChannelGroups] Loaded from settings:", settingsToLoad.channelGroups);
    } else {
      this.log("[ChannelGroups] Not found in settings; using default value.");
    }

    Object.assign(this.settings.masterSettings, {
      projectName,
      projectBPM,
      artistName,
      trimSettings,
      projectChannelNames,
      // **NEW: merge channelGroups from the loaded settings**
      channelGroups: settingsToLoad.channelGroups || new Array(this.numChannels).fill('all')
    });
    this.log("[ChannelGroups] Global settings channelGroups now:", this.settings.masterSettings.channelGroups);
    this.globalPlaybackSpeed = globalPlaybackSpeed;
    this.channelPlaybackSpeed = Array.from(
      { length: this.numChannels },
      (_, i) => (channelPlaybackSpeed && channelPlaybackSpeed[i] != null ? channelPlaybackSpeed[i] : 1)
    );

    this.initializeGainNodes();

    if (channelURLs) {
      await Promise.all(channelURLs.map((url, index) => this.formatAndFetchAudio(url, index)));
    }
    if (channelVolume) {
      channelVolume.forEach((vol, index) => this.setChannelVolume(index, vol));
    }

    this.sortAndApplyProjectSequences(projectSequences);
    // **NEW CODE FOR STAGE 3: Update each channel’s dataset.group based on loaded settings**
    if (this.settings.masterSettings.channelGroups && window.channelsStore) {
      window.channelsStore.forEach((channel, index) => {
        const loadedGroup = this.settings.masterSettings.channelGroups[index];
        // Update the channel's data attribute
        channel.dataset.group = loadedGroup;
        
        // Find the dropdown element in the channel
        const groupDropdown = channel.querySelector('.group-dropdown');
        if (groupDropdown) {
          // Set the dropdown's value to the loaded group value.
          // This will ensure that the native select shows the correct option as selected.
          groupDropdown.value = loadedGroup;
        }
        
        this.log(`[UI Update] Channel ${index} group set to: ${loadedGroup}`);
      });
    }
    this.updateUIWithLoadedSettings();

    // ---------------------------------------------------------
    // Offline Bounce Integration
    setTimeout(() => {
      const bounceModule = new OfflineBounce(window.unifiedSequencerSettings);
      bounceModule.bounceCurrentSequence()
        .then(renderedBuffer => {
          const wavArrayBuffer = audioBufferToWav(renderedBuffer);
          const blob = new Blob([wavArrayBuffer], { type: "audio/wav" });
          const fileName = `${this.settings.masterSettings.projectName || "Project"}_bounce.wav`;
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement("a");
          downloadLink.href = url;
          downloadLink.download = fileName;
          
          // The following code initiates the file download.
          // It has been commented out to prevent an actual download.
          /*
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
          */
        })
        .catch(error => console.error("Offline bounce error:", error));
    }, 500);
    // ---------------------------------------------------------

    // Utility functions for WAV conversion
    function audioBufferToWav(buffer, opt = {}) {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = opt.float32 ? 3 : 1;
      const bitDepth = format === 3 ? 32 : 16;
      const channelData = numChannels === 2
        ? interleave(buffer.getChannelData(0), buffer.getChannelData(1))
        : buffer.getChannelData(0);
      return encodeWAV(channelData, numChannels, sampleRate, bitDepth);
    }

    function interleave(inputL, inputR) {
      const length = inputL.length + inputR.length;
      const result = new Float32Array(length);
      for (let i = 0, j = 0; i < inputL.length; i++) {
        result[j++] = inputL[i];
        result[j++] = inputR[i];
      }
      return result;
    }

    function encodeWAV(samples, numChannels, sampleRate, bitDepth) {
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;
      const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
      const view = new DataView(buffer);
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
      bitDepth === 16 ? floatTo16BitPCM(view, 44, samples) : writeFloat32(view, 44, samples);
      return buffer;
    }

    function writeFloat32(view, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 4) {
        view.setFloat32(offset, input[i], true);
      }
    }

    function floatTo16BitPCM(view, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    }

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
  } catch (error) {
    console.error("[internalPresetDebug] Error loading settings:", error);
  }
}

async formatAndFetchAudio(url, index) {
  const baseDomain = "https://ordinals.com";
  url = url.startsWith("/") ? `${baseDomain}${url}` : url;
  const formattedUrl = await this.formatURL(url);
  this.settings.masterSettings.channelURLs[index] = formattedUrl;
  return window.AudioUtilsPart1.fetchAudio(formattedUrl, index);
}

updateUIWithLoadedSettings() {
  const { projectName, projectBPM, projectChannelNames, currentSequence } = this.settings.masterSettings;
  this.updateProjectNameUI(projectName);
  this.updateBPMUI(projectBPM);
  this.updateAllLoadSampleButtonTexts();
  this.updateProjectChannelNamesUI(projectChannelNames);
  this.setCurrentSequence(0);
  this.updateUIForSequence(currentSequence);
  handleSequenceTransition(0); // Assumes handleSequenceTransition is defined elsewhere
}

isHighlySerialized(parsedSettings) {
  const keys = Object.keys(parsedSettings);
  return keys.filter(key => /^\d+$/.test(key)).length / keys.length > 0.5;
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
  const reverseKeyMap = Object.fromEntries(
    Object.entries(keyMap).map(([k, v]) => [v, +k])
  );
  const channelMap = Array.from({ length: this.numChannels }, (_, i) =>
    i < 26 ? String.fromCharCode(65 + i) : i.toString()
  );
  const decompressSteps = steps => steps.flatMap(step =>
    typeof step === 'number'
      ? step
      : step.r
        ? Array.from({ length: step.r[1] - step.r[0] + 1 }, (_, i) => step.r[0] + i)
        : typeof step === 'string' && step.endsWith('r')
          ? { index: parseInt(step.slice(0, -1), 10), reverse: true }
          : []
  );
  const deserialize = data =>
    Object.entries(data).reduce((deserializedData, [key, value]) => {
      const originalKey = keyMap[key] || key;
      if (originalKey === 'projectSequences') {
        deserializedData[originalKey] = Object.entries(value).reduce((acc, [seqKey, channels]) => {
          const originalSeqKey = seqKey.replace('s', 'Sequence');
          acc[originalSeqKey] = Object.entries(channels).reduce((chAcc, [chKey, chValue]) => {
            const channelIndex = channelMap.indexOf(chKey);
            const originalChKey = `ch${channelIndex !== -1 ? channelIndex : chKey}`;
            if (chValue[reverseKeyMap['steps']]) {
              chAcc[originalChKey] = { steps: decompressSteps(chValue[reverseKeyMap['steps']]) };
            }
            return chAcc;
          }, {});
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
      return deserializedData;
    }, {});
  return deserialize(serializedData);
}

sortAndApplyProjectSequences(projectSequences) {
  this.log("[sortAndApplyProjectSequences] Sorting and applying project sequences.");
  if (!projectSequences || typeof projectSequences !== "object") {
    throw new Error("[sortAndApplyProjectSequences] Invalid project sequences data.");
  }
  Object.entries(projectSequences).forEach(([seqKey, sequenceData]) => {
    if (!sequenceData || typeof sequenceData !== "object") return;
    this.settings.masterSettings.projectSequences[seqKey] =
      this.settings.masterSettings.projectSequences[seqKey] || {};
    Object.entries(sequenceData).forEach(([channelKey, channelData]) => {
      const channelIndex = parseInt(channelKey.replace("ch", ""), 10);
      if (channelIndex < this.numChannels) {
        const newSteps = Array.from({ length: 64 }, () => ({
          isActive: false,
          isReverse: false,
          volume: 1,
          pitch: 1
        }));
        if (channelData?.steps && Array.isArray(channelData.steps)) {
          channelData.steps.forEach(step => {
            let index, isReverse = false;
            if (typeof step === "object" && step.index != null) {
              index = step.index - 1;
              isReverse = !!step.reverse;
            } else if (typeof step === "number") {
              index = step - 1;
            }
            if (index >= 0 && index < 64) {
              newSteps[index] = { isActive: true, isReverse, volume: 1, pitch: 1 };
            }
          });
        }
        this.settings.masterSettings.projectSequences[seqKey][channelKey] = {
          steps: newSteps,
          mute: false,
          url: this.settings.masterSettings.channelURLs[channelIndex] || ""
        };
      }
    });
  });
  this.log("[sortAndApplyProjectSequences] Project sequences sorted and applied.");
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
  
    /*–––––– Playback Speed Control ––––––*/
setGlobalPlaybackSpeed(speed) {
  this.globalPlaybackSpeed = speed;
  this.sourceNodes.forEach(node =>
    node?.buffer && node.playbackRate.setValueAtTime(speed, this.audioContext.currentTime)
  );
  this.log(`Global playback speed set to ${speed}x`);
}

setChannelPlaybackSpeed(channelIndex, speed) {
  if (channelIndex < 0 || channelIndex >= this.channelPlaybackSpeed.length) {
    return console.error("Channel index out of bounds");
  }
  this.channelPlaybackSpeed[channelIndex] = speed;
  const node = this.sourceNodes[channelIndex];
  if (node?.buffer) {
    node.playbackRate.setValueAtTime(speed, this.audioContext.currentTime);
    this.log(`Playback speed for channel ${channelIndex} set to ${speed}x`);
  } else {
    this.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
  }
}

updatePlaybackSpeed(channelIndex) {
  const node = this.sourceNodes[channelIndex];
  if (node?.buffer) {
    node.playbackRate.setValueAtTime(this.channelPlaybackSpeed[channelIndex], this.audioContext.currentTime);
    this.log(`Playback speed for channel ${channelIndex} updated to ${this.channelPlaybackSpeed[channelIndex]}x`);
  } else {
    this.log(`Source node for channel ${channelIndex} is not initialized or lacks a buffer.`);
  }
}

/*–––––– Sequences and Steps ––––––*/
updateTotalSequences() {
  let lastActive = -1;
  for (let seq = 0; seq < this.numSequences; seq++) {
    const sequence = this.settings.masterSettings.projectSequences[`Sequence${seq}`];
    if (!sequence) continue;
    if (Object.values(sequence).some(channel => channel?.steps?.some(step => step.isActive))) {
      lastActive = seq;
    }
  }
  this.numSequences = lastActive + 1;
  this.log(`Total sequences updated to ${this.numSequences}`);
}

checkSettings() {
  this.log("Current Global Settings:", this.settings);
  return this.settings.masterSettings;
}

initializeChannelSettings(numChannels) {
  return Array.from({ length: numChannels }, (_, ch) => ({ volume: 1, pitch: 1 }))
    .reduce((acc, setting, i) => ({ ...acc, [`ch${i}`]: setting }), {});
}

initializeSequences(numSequences = this.numSequences, numChannels = this.numChannels, numSteps = 64) {
  const sequences = {};
  for (let seq = 0; seq < numSequences; seq++) {
    sequences[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
  }
  return sequences;
}

initializeChannels(numChannels, numSteps) {
  const channels = {};
  for (let ch = 0; ch < numChannels; ch++) {
    channels[`ch${ch}`] = {
      steps: Array.from({ length: numSteps }, () => ({ isActive: false, isReverse: false, volume: 1, pitch: 1 })),
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
  return step
    ? { isActive: step.isActive, isReverse: step.isReverse, volume: step.volume, pitch: step.pitch }
    : (console.error("Invalid sequence, channel, or step index in getStepSettings"),
       { isActive: false, isReverse: false, volume: 1, pitch: 1 });
}

getStepStateAndReverse(currentSequence, channelIndex, stepIndex) {
  const sequence = this.settings.masterSettings.projectSequences[`Sequence${currentSequence}`];
  const channel = sequence && sequence[`ch${channelIndex}`];
  return channel && stepIndex < channel.steps.length
    ? { isActive: channel.steps[stepIndex].isActive, isReverse: channel.steps[stepIndex].isReverse }
    : (console.error("Invalid sequence, channel, or step index in getStepStateAndReverse"),
       { isActive: false, isReverse: false });
}

updateStepState(currentSequence, channelIndex, stepIndex, state) {
  this.log("updateStepState entered");
  if (typeof state === "boolean") {
    const { isReverse } = this.getStepStateAndReverse(currentSequence, channelIndex, stepIndex);
    this.updateStepStateAndReverse(currentSequence, channelIndex, stepIndex, state, isReverse);
    this.updateTotalSequences();
  } else {
    console.error("Invalid state type in updateStepState");
  }
}

getStepState(currentSequence, channelIndex, stepIndex) {
  const sequence = this.settings.masterSettings.projectSequences[`Sequence${currentSequence}`];
  const channel = sequence && sequence[`ch${channelIndex}`];
  return channel && stepIndex < channel.steps.length
    ? channel.steps[stepIndex].isActive
    : (console.error("Invalid sequence, channel, or step index in getStepState"), false);
}

toggleStepState(sequenceIndex, channelIndex, stepIndex) {
  const step = this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`]?.[`ch${channelIndex}`]?.steps[stepIndex];
  if (step) {
    step.isActive = !step.isActive;
    this.updateTotalSequences();
    this.notifyObservers();
  } else {
    console.error("Invalid sequence, channel, or step index in toggleStepState");
  }
}

toggleStepReverseState(sequenceIndex, channelIndex, stepIndex) {
  const step = this.settings.masterSettings.projectSequences[`Sequence${sequenceIndex}`]?.[`ch${channelIndex}`]?.steps[stepIndex];
  if (step) {
    step.isReverse = !step.isReverse;
    this.updateTotalSequences();
    this.notifyObservers();
  } else {
    console.error("Invalid sequence, channel, or step index in toggleStepReverseState");
  }
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
  const step = this.settings?.masterSettings?.projectSequences?.[`Sequence${currentSequence}`]?.[`ch${channelIndex}`]?.steps?.[stepIndex];
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
  return this.settings.masterSettings.channelSettings?.[`ch${channelIndex}`]?.pitch || 1;
}

getStepVolume(sequenceIndex, channelIndex, stepIndex) {
  return this.getStepSettings(sequenceIndex, channelIndex, stepIndex).volume;
}

getStepPitch(sequenceIndex, channelIndex, stepIndex) {
  return this.getStepSettings(sequenceIndex, channelIndex, stepIndex).pitch;
}

setChannelPitch(channelIndex, pitch) {
  this.settings.masterSettings.channelSettings = this.settings.masterSettings.channelSettings || {};
  this.settings.masterSettings.channelSettings[`ch${channelIndex}`] = this.settings.masterSettings.channelSettings[`ch${channelIndex}`] || {};
  this.settings.masterSettings.channelSettings[`ch${channelIndex}`].pitch = pitch;
  this.notifyObservers();
}

setStepVolume(channelIndex, stepIndex, volume) {
  const sequence = this.settings.masterSettings.currentSequence;
  const step = this.settings.masterSettings.projectSequences[`Sequence${sequence}`]?.[`ch${channelIndex}`]?.steps[stepIndex];
  if (step) {
    step.volume = volume;
    this.notifyObservers();
  } else {
    console.error("Invalid sequence, channel, or step index in setStepVolume");
  }
}

setStepPitch(channelIndex, stepIndex, pitch) {
  const sequence = this.settings.masterSettings.currentSequence;
  const step = this.settings.masterSettings.projectSequences[`Sequence${sequence}`]?.[`ch${channelIndex}`]?.steps[stepIndex];
  if (step) {
    step.pitch = pitch;
    this.notifyObservers();
  } else {
    console.error("Invalid sequence, channel, or step index in setStepPitch");
  }
}

/*–––––– Trim Settings & UI Updates ––––––*/
initializeTrimSettings(numSettings) {
  this.log("initializeTrimSettings entered with numSettings:", numSettings);
  return Array.from({ length: numSettings }, () => ({ start: 0, end: 100, length: 0 }));
}

updateTrimSettingsUI(trimSettings) {
  this.log("updateTrimSettingsUI entered", trimSettings);
  trimSettings.forEach((setting, idx) => {
    const startSlider = document.getElementById(`start-slider-${idx}`);
    const endSlider = document.getElementById(`end-slider-${idx}`);
    if (startSlider && endSlider) {
      startSlider.value = setting.start;
      endSlider.value = setting.end;
    }
  });
}
  
    /*–––––– Observer & UI Helpers ––––––*/
addObserver(fn) {
  this.log("addObserver", fn);
  this.observers.push(fn);
}

notifyObservers() {
  this.log("[SequenceChangeDebug] Notifying observers of changes.");
  this.observers.forEach(fn => fn(this.settings));
}

setTrimSettings(channelIndex, start, end) {
  this.log("setTrimSettings entered");
  if (this.isValidIndex(channelIndex)) {
    const settings = this.settings.masterSettings.trimSettings[channelIndex];
    settings ? Object.assign(settings, { start, end }) : console.error(`Trim settings not found for channel index: ${channelIndex}`);
  } else {
    console.error(`Invalid channel index: ${channelIndex}`);
  }
}

getTrimSettings(channelIndex) {
  return this.settings.masterSettings.trimSettings[channelIndex] || { start: 0, end: 1 };
}

isValidIndex(index) {
  this.log("isValidIndex entered");
  return index >= 0 && index < this.numChannels;
}

  updateUIForSequence(currentSeqIdx) {
  const channelElements = window.channelsStore && window.channelsStore.length
    ? window.channelsStore
    : document.querySelectorAll(".channel");
  channelElements.forEach((channel, chIdx) => {
    channel.querySelectorAll(".step-button").forEach((btn, stepIdx) => {
      const { isActive, isReverse } = this.getStepStateAndReverse(currentSeqIdx, chIdx, stepIdx);
      btn.classList.toggle("selected", isActive);
      btn.classList.toggle("reverse", isReverse);
    });
  });
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
    const url = this.settings.masterSettings.channelURLs[index];
    this.log(`[getChannelURL] Retrieving URL from channel ${index}: ${url}`);
    return url;
  }
  console.error(`[getChannelURL] Invalid channel index: ${index}`);
  return null;
}

updateProjectChannelNamesUI(channelIndexOrNames, name) {
  if (typeof channelIndexOrNames === "number") {
    const idx = channelIndexOrNames,
          defaultName = "Load Sample",
          effectiveName = name || (this.settings.masterSettings.channelURLs[idx]?.split("/").pop().split("#")[0] || defaultName);
    this.log("[updateProjectChannelNamesUI] Updating with name:", effectiveName);
    const el = document.getElementById(`channel-name-${idx}`);
    if (el) el.textContent = effectiveName;
    this.settings.masterSettings.projectChannelNames[idx] = effectiveName;
  } else if (Array.isArray(channelIndexOrNames)) {
    channelIndexOrNames.forEach((n, i) => this.updateProjectChannelNamesUI(i, n));
  }
}

setChannelName(channelIndex, name) {
  this.settings.masterSettings.projectChannelNames[channelIndex] = name;
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
  const ms = this.settings.masterSettings;
  ms.projectName = "New Audx Project";
  ms.artistName = "";
  ms.projectBPM = 120;
  ms.currentSequence = 0;
  ms.channelURLs = new Array(this.numChannels).fill("");
  ms.projectChannelNames = new Array(this.numChannels).fill("Load Sample");
  ms.channelVolume = new Array(this.numChannels).fill(1);
  ms.trimSettings = Array.from({ length: this.numChannels }, () => ({ start: 0.01, end: 100.0, length: 0 }));
  ms.channelPlaybackSpeed = new Array(this.numChannels).fill(1);
  // Also update the global channelPlaybackSpeed property:
  this.channelPlaybackSpeed = new Array(this.numChannels).fill(1);
  ms.projectSequences = this.initializeSequences(64, this.numChannels, 64);
  this.log("[clearMasterSettings] Master settings cleared.");
}

setCurrentSequence(seq) {
  if (this.settings.masterSettings.currentSequence !== seq) {
    this.settings.masterSettings.currentSequence = seq;
    this.notifyObservers();
  }
}

getCurrentSequence() {
  return this.settings.masterSettings.currentSequence;
}

getSequenceSettings(seqIdx) {
  this.log("getSequenceSettings entered");
  return this.settings.masterSettings.projectSequences[`Sequence${seqIdx}`];
}

setSequenceSettings(seqIdx, seqSettings) {
  this.log("setSequenceSettings entered");
  this.settings.masterSettings.projectSequences[`Sequence${seqIdx}`] = seqSettings;
}

getSettings(key) {
  this.log("getSettings entered", key);
  if (key === "masterSettings") {
    this.log("[getSettings] Retrieved all masterSettings:", this.settings.masterSettings);
    return this.settings.masterSettings;
  } else if (key) {
    const value = this.settings.masterSettings[key];
    this.log(`[getSettings] Retrieved setting for key '${key}':`, value);
    return value;
  }
  this.log("[getSettings] Retrieved all settings:", this.settings);
  return this.settings;
}

updateProjectSequencesUI() {
  const sequences = this.getSettings("projectSequences");
  Object.values(sequences).forEach((seq, idx) => updateSequenceUI(idx, seq)); // Assumes updateSequenceUI is defined elsewhere
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
  document.querySelectorAll(".channel").forEach((channel, idx) => {
    const btn = channel.querySelector(".load-sample-button");
    if (btn) this.updateLoadSampleButtonText(idx, btn);
  });
}

updateLoadSampleButtonText(channelIndex, button) {
  this.log("updateLoadSampleButtonText entered");
  if (!button) return console.error(`Button not found for channelIndex ${channelIndex}`);
  let btnText = "Load New Audional";
  if (!this.settings?.masterSettings) {
    console.error("masterSettings not properly initialized");
    return button.textContent = btnText;
  }
  const { projectChannelNames, channelURLs } = this.settings.masterSettings;
  if (projectChannelNames?.[channelIndex]) {
    btnText = projectChannelNames[channelIndex];
  } else if (channelURLs?.[channelIndex]) {
    btnText = channelURLs[channelIndex].split("/").pop();
  }
  button.textContent = btnText;
  this.log(`[updateLoadSampleButtonText] Final button text: ${btnText}`);
}

updateProjectNameUI(projectName) {
  this.log("Project name UI entered and updated:", projectName);
  const input = document.getElementById("project-name");
  if (input) {
    input.value = projectName || "AUDX Project";
    this.log("Project name UI updated:", projectName);
  }
}

updateBPMUI(bpm) {
  const slider = document.getElementById("nice-slider"),
        display = document.getElementById("bpm-display");
  if (slider && display) {
    const formatted = parseFloat(bpm).toFixed(1);
    slider.value = formatted;
    display.value = formatted;
    this.log("BPM UI updated:", formatted);
  }
}

updateChannelURLsUI(urls) {
  this.log("Project URLs UI entered and updated:", urls);
  urls.forEach((url, idx) => {
    const input = document.getElementById(`url-input-${idx}`);
    if (input) input.value = url;
  });
}

ensureArrayLength(arr, maxLength) {
  while (arr.length < maxLength) {
    arr.push(this.getDefaultArrayElement());
  }
}

getDefaultArrayElement() {
  return { start: 0.01, end: 100.0, length: 0 };
}
}
// Initialization at the end of the class/module:
window.unifiedSequencerSettings = new UnifiedSequencerSettings(null, 64, 64);
window.NUM_CHANNELS = window.unifiedSequencerSettings.numChannels;

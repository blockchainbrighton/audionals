// eventListeners_v2.js
(() => {
    // Define a local log function that checks the global debug flag.
    const log = (msg, ...args) => {
      if (window.unifiedSequencerSettings && window.unifiedSequencerSettings.DEBUG) {
        console.log(msg, ...args);
      }
    };
  
    document.addEventListener("DOMContentLoaded", () => {
      // Resume audio on app container click
      const appContainer = document.getElementById("drum-machine");
      appContainer?.addEventListener("click", () => {
        window.unifiedSequencerSettings.audioContext.resume().then(() => {
          log("Playback resumed successfully");
        });
      });
  
      // Get UI elements
      const saveButton = document.getElementById("save-button");
      const loadFileInput = document.getElementById("load-file-input");
      const loadButton = document.getElementById("new-load-button");
      const loadOptions = document.getElementById("loadOptions");
      const loadJson = document.getElementById("loadJson");
      const projectNameInput = document.getElementById("project-name");
  
      // Preset buttons (assumes these IDs exist in your HTML)
      const loadInternalPresets = [
        document.getElementById("loadInternalPreset1"),
        document.getElementById("loadInternalPreset2"),
        document.getElementById("loadInternalPreset3"),
        document.getElementById("loadInternalPreset4"),
        document.getElementById("loadInternalPreset5"),
        document.getElementById("loadInternalPreset6")
      ];
  
      // Create and append Cancel button if not already present
      let cancelButton = document.getElementById("cancel-load-button");
      if (!cancelButton) {
        cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.id = "cancel-load-button";
        cancelButton.style.display = "block";
        loadOptions.appendChild(cancelButton);
      }
  
      // Cancel button event listener
      cancelButton.addEventListener("click", () => {
        loadOptions.style.display = "none";
        log("[Save/Load debug] Cancel button clicked");
      });
  
      // Helper for sequence navigation (prev/next)
      const setupSequenceNav = (buttonId, offset) => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.addEventListener("click", () => {
          const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
          const totalSequences = Object.keys(
            window.unifiedSequencerSettings.settings.masterSettings.projectSequences
          ).length;
          const targetSequence = (currentSequence + offset + totalSequences) % totalSequences;
          window.unifiedSequencerSettings.setCurrentSequence(targetSequence);
          log(`[master] [${buttonId}] Transitioning to sequence ${targetSequence}`);
          // currentStep, handleSequenceTransition, and syncCurrentSequenceWithSlave are assumed global
          handleSequenceTransition(targetSequence, currentStep);
          syncCurrentSequenceWithSlave(targetSequence);
          const message = { type: "SEQUENCE_TRANSITION", targetSequence, startStep: currentStep };
          log(`[master] [${buttonId}] Sending message to slave: ${JSON.stringify(message)}`);
          if (slaveWindow) {
            slaveWindow.postMessage(message, "*");
          }
        });
      };
  
      setupSequenceNav("prev-sequence", -1);
      setupSequenceNav("next-sequence", 1);
  
      // Save button event listener – simply calls exportSettings
      saveButton?.addEventListener("click", () => {
        window.unifiedSequencerSettings.exportSettings();
        log("[saveButton] ExportSettings executed. No additional file download triggered.");
      });
  
      // Toggle load options display and position under the load button
      loadButton?.addEventListener("click", () => {
        log("[Save/Load debug] Load button clicked");
        const isVisible = loadOptions.style.display === "block";
        loadOptions.style.display = isVisible ? "none" : "block";
        if (!isVisible) {
          const rect = loadButton.getBoundingClientRect();
          loadOptions.style.position = "absolute";
          loadOptions.style.left = `${rect.left}px`;
          loadOptions.style.top = `${rect.bottom + window.scrollY}px`;
        }
      });
  
      // loadJson button – trigger file input click and hide load options
      loadJson?.addEventListener("click", () => {
        log("[Save/Load debug] loadJson clicked");
        loadFileInput.click();
        loadOptions.style.display = "none";
      });
  
      // Unified function to load settings and fetch audio
      async function loadSettingsAndFetchAudio(jsonSettings) {
        log("[UnifiedLoad] Settings Loaded:", jsonSettings);
        window.unifiedSequencerSettings.loadSettings(jsonSettings);
        // Try both channelURLs and projectURLs
        const urls = jsonSettings.channelURLs || jsonSettings.projectURLs;
        if (urls && Array.isArray(urls)) {
          log("[UnifiedLoad] Found URLs:", urls);
          for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            if (url) {
              log(`[UnifiedLoad] Processing URL ${i}: ${url}`);
              const loadSampleButtonElement = document.getElementById(`load-sample-button-${i}`);
              // Use the namespaced fetchAudio
              await window.AudioUtilsPart1.fetchAudio(url, i, loadSampleButtonElement);
            }
          }
        }
      }
  
      // File input change event – handles both JSON and gzipped files
      loadFileInput?.addEventListener("change", async () => {
        log("[Save/Load debug] loadFileInput change event");
        const file = loadFileInput.files[0];
        const fileExtension = file.name.split(".").pop().toLowerCase();
        const reader = new FileReader();
  
        reader.onload = async (e) => {
          try {
            log("File read start");
            let loadedSettings;
            if (fileExtension === "gz") {
              log("[Save/Load debug] Gzip file detected");
              const arrayBuffer = e.target.result;
              const decompressed = await decompressGzipFile(arrayBuffer);
              loadedSettings = JSON.parse(decompressed);
            } else {
              log("[Save/Load debug] JSON file detected");
              loadedSettings = JSON.parse(e.target.result);
            }
            log("[loadFileInput] File content:", loadedSettings);
            await loadSettingsAndFetchAudio(loadedSettings);
          } catch (error) {
            console.error("[Save/Load debug] Error processing file:", error);
          }
        };
  
        fileExtension === "gz" ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
      });
  
      // Function to load a preset from a given file path
      function loadPresetFromFile(filePath) {
        log("[Save/Load Debug] loadPresetFromFile called");
        log(`[internalPresetDebug] Loading preset from: ${filePath}`);
        fetch(filePath)
          .then(response => response.json())
          .then(async (jsonSettings) => {
            log("[internalPresetDebug] JSON settings fetched:", jsonSettings);
            await loadSettingsAndFetchAudio(jsonSettings);
          })
          .catch(error => console.error(`[internalPresetDebug] Error loading preset from ${filePath}:`, error));
        loadOptions.style.display = "none";
      }
  
      // Preset buttons event listeners
      const presetFilePaths = [
        "Preset_Json_Files/BeBased_OB1.json",
        "Preset_Json_Files/FREEDOM_to_TRANSACT.json",
        "Preset_Json_Files/OB1_PresetTemplate.json",
        "Preset_Json_Files/Basic_Drum_Kit.json",
        "Preset_Json_Files/16_Glockenspiel_Notes.json",
        "Preset_Json_Files/Farty_McFarterson.json"
      ];
      loadInternalPresets.forEach((btn, idx) => {
        btn?.addEventListener("click", () => loadPresetFromFile(presetFilePaths[idx]));
      });
  
      // Modal close (click on close-button)
      document.querySelector(".close-button")?.addEventListener("click", () => {
        log("Close button clicked");
        if (window.currentTrimmerInstance) {
          window.currentTrimmerInstance.stopAudio();
        }
        document.getElementById("audio-trimmer-modal").style.display = "none";
        log("Modal closed");
      });
  
      // Modal close (click outside modal content)
      window.addEventListener("click", (event) => {
        const modal = document.getElementById("audio-trimmer-modal");
        const modalContent = document.querySelector(".trimmer-modal-content");
        if (modal && modal.style.display === "block" && !modalContent.contains(event.target) && event.target === modal) {
          log("Clicked outside the modal content");
          if (window.currentTrimmerInstance) {
            window.currentTrimmerInstance.stopAudio();
          }
          modal.style.display = "none";
          log("Modal closed");
        }
      });
  
      // Update project name on input
      projectNameInput?.addEventListener("input", () => {
        const projectName = projectNameInput.value.trim();
        window.unifiedSequencerSettings.updateSetting("projectName", projectName);
        if (!projectName) {
          projectNameInput.value = "Default Project Name";
        }
      });
    });
  })();
  
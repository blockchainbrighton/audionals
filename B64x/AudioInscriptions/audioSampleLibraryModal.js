// audioSampleLibraryModal.js

function openAudioSampleLibraryModal(onSampleSelected) {
    // === Aggregated Logging and Status Counters ===
    const aggregatedLogs = {
      successes: new Set(),
      errors: new Set(),
      addSuccess: msg => aggregatedLogs.successes.add(msg),
      addError: msg => aggregatedLogs.errors.add(msg),
      flush() {
        console.log("Aggregated Log:");
        console.log("Successes:\n" + [...this.successes].join("\n"));
        console.log("Errors:\n" + [...this.errors].join("\n"));
      }
    };
  
    const stats = {
      total: 0,
      headCompleted: 0,
      headSuccess: 0,
      headFailure: 0,
      wsReady: 0,
      wsError: 0,
      logsFlushed: false
    };
  
    const checkAllSamplesProcessed = () => {
      if (
        stats.total &&
        stats.headCompleted === stats.total &&
        (stats.wsReady + stats.wsError) === stats.total &&
        !stats.logsFlushed
      ) {
        aggregatedLogs.addSuccess(`All ${stats.total} samples processed.`);
        aggregatedLogs.addSuccess(
          `HEAD requests: ${stats.headSuccess} succeeded, ${stats.headFailure} failed.`
        );
        aggregatedLogs.addSuccess(
          `WaveSurfer: ${stats.wsReady} ready, ${stats.wsError} errors.`
        );
        aggregatedLogs.flush();
        stats.logsFlushed = true;
      }
    };
  
    // === Concurrency-Limited Fetch with Retry ===
    const MAX_CONCURRENT_HEAD = 20;
    let activeHead = 0;
    const headQueue = [];
    const throttledFetch = (url, options) =>
      new Promise((resolve, reject) => {
        const task = () => {
          activeHead++;
          fetch(url, options)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              activeHead--;
              if (headQueue.length) headQueue.shift()();
            });
        };
        activeHead < MAX_CONCURRENT_HEAD ? task() : headQueue.push(task);
      });
  
    const fetchWithRetry = async (url, options, retries = 2, delay = 500) => {
      for (let i = 0; i <= retries; i++) {
        try {
          return await throttledFetch(url, options);
        } catch (err) {
          if (i < retries) await new Promise(r => setTimeout(r, delay));
          else throw err;
        }
      }
    };
  
    // === Helper: Map Content-Type to File Extension ===
    const CONTENT_TYPE_MAP = {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/ogg": "ogg",
      "audio/opus": "opus",
      "audio/flac": "flac"
    };
    const getFileType = ct => (ct ? CONTENT_TYPE_MAP[ct.toLowerCase()] || "" : "");
  
    // === Shared Domain for Audio Files ===
    const domain = "https://ordinals.com/content/";
  
    // === Create the Modal Overlay and Content Container ===
    const modalOverlay = document.createElement("div");
    modalOverlay.classList.add("modal-overlay");
    Object.assign(modalOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "1000"
    });
  
    // Close modal if clicking outside modalContent
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay);
      }
    });
  
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    Object.assign(modalContent.style, {
      background: "#f9f9f9",
      padding: "30px",
      borderRadius: "8px",
      width: "80%",
      maxWidth: "600px",
      maxHeight: "80vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      position: "relative" // To position the close (X) button
    });
  
    // --- Add a Close (X) Button at Top-Right ---
    const closeX = document.createElement("span");
    closeX.textContent = "×";
    Object.assign(closeX.style, {
      position: "absolute",
      top: "10px",
      right: "15px",
      fontSize: "24px",
      fontWeight: "bold",
      color: "#333",
      cursor: "pointer"
    });
    closeX.addEventListener("click", () => {
      if (document.body.contains(modalOverlay)) {
        document.body.removeChild(modalOverlay);
      }
    });
    modalContent.appendChild(closeX);
  
    // --- Header ---
    const header = document.createElement("h2");
    header.textContent = "Select an Audio Inscription";
    Object.assign(header.style, {
      marginBottom: "20px",
      fontFamily: "Arial, sans-serif",
      color: "#333"
    });
    modalContent.appendChild(header);
  
    // --- Sorting and Filtering Controls ---
    const controlsContainer = document.createElement("div");
    Object.assign(controlsContainer.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px"
    });
  
    // Sort dropdown
    const sortLabel = document.createElement("label");
    sortLabel.textContent = "Sort: ";
    Object.assign(sortLabel.style, {
      fontFamily: "Arial, sans-serif",
      color: "#333"
    });
    const sortSelect = document.createElement("select");
    Object.assign(sortSelect.style, {
      padding: "5px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px"
    });
    [
      { value: "newest", text: "Newest to Oldest" },
      { value: "oldest", text: "Oldest to Newest" },
      { value: "durationAsc", text: "Duration: Shortest to Longest" },
      { value: "durationDesc", text: "Duration: Longest to Shortest" }
    ].forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.text;
      sortSelect.appendChild(optionEl);
    });
    sortLabel.appendChild(sortSelect);
    controlsContainer.appendChild(sortLabel);
  
    // File type filter dropdown
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "File Type: ";
    Object.assign(typeLabel.style, {
      fontFamily: "Arial, sans-serif",
      color: "#333"
    });
    const typeSelect = document.createElement("select");
    Object.assign(typeSelect.style, {
      padding: "5px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px"
    });
    [
      { value: "all", text: "All" },
      { value: "mp3", text: "MP3" },
      { value: "wav", text: "WAV" },
      { value: "ogg", text: "OGG" }
    ].forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.text;
      typeSelect.appendChild(optionEl);
    });
    typeLabel.appendChild(typeSelect);
    controlsContainer.appendChild(typeLabel);
  
    modalContent.appendChild(controlsContainer);
  
    // --- Sample List Container ---
    const sampleListContainer = document.createElement("div");
    sampleListContainer.id = "audio-sample-list";
    sampleListContainer.style.flex = "1";
    modalContent.appendChild(sampleListContainer);
  
    // --- Close Button (Alternate, below the list) ---
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    Object.assign(closeButton.style, {
      marginTop: "10px",
      padding: "10px 20px",
      backgroundColor: "#dc3545",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px"
    });
    closeButton.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
    modalContent.appendChild(closeButton);
  
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
  
    // === Helper for Creating Elements ===
    function createEl(tag, cls, text) {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text) el.textContent = text;
      return el;
    }
  
    // === Update Metadata Display (duration, size, type) ===
    function updateMetadataDisplay(sample) {
      const { duration, fileSize, fileType } = sample;
      sample.metadataDiv.textContent =
        `${duration ? `Duration: ${duration.toFixed(2)}s ` : ""}` +
        `${fileSize ? `Size: ${(fileSize / 1024).toFixed(1)} KB ` : ""}` +
        `${fileType ? `Type: ${fileType.toUpperCase()}` : ""}`;
      Object.assign(sample.metadataDiv.style, {
        fontSize: "0.9em",
        color: "#555",
        marginLeft: "10px"
      });
    }
  
    // === Toggle Play/Pause (using WaveSurfer) ===
    function togglePlay(sample) {
      if (!sample.wavesurfer) sample.loadWaveSurfer();
      if (sample.wavesurfer.isPlaying()) {
        sample.wavesurfer.pause();
        sample.playButton.textContent = "Play";
      } else {
        sample.wavesurfer.play();
        sample.playButton.textContent = "Pause";
      }
    }
  
    // === Global Samples Array ===
    const samples = [];
  
    // === IntersectionObserver for Lazy Loading ===
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const s = entry.target.sample;
          if (!s) return;
          // Simply load when intersecting; destroy when not.
          entry.isIntersecting ? s.loadWaveSurfer() : s.destroyWaveSurfer();
        });
      },
      { threshold: 0.1 }
    );
  
    // === Create a Sample Object (with DOM elements and WaveSurfer integration) ===
    function createSample(audio, index) {
      const sample = {
        id: audio.id,
        url: domain + audio.id,
        initialIndex: index,
        duration: null,
        fileSize: null,
        fileType: "",
        wavesurfer: null
      };
  
      // Create container and subelements.
      sample.container = createEl("div", "audio-sample");
      Object.assign(sample.container.style, {
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #ddd",
        padding: "10px 0"
      });
  
      sample.waveformDiv = createEl("div", "waveform");
      sample.waveformDiv.id = `waveform-${index}`;
      Object.assign(sample.waveformDiv.style, {
        width: "200px",
        height: "40px",
        marginRight: "10px",
        border: "1px solid #ddd",
        background: "#fff",
        borderRadius: "10px"
      });
  
      sample.playButton = createEl("button", "play-button", "Play");
      Object.assign(sample.playButton.style, {
        padding: "8px 16px",
        backgroundColor: "#28a745", // Green color for Play button
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        marginRight: "10px"
      });
      sample.playButton.setAttribute("title", "Click to play or pause the sample");
  
      // Updated Use Button: Bigger, square, and with new text and color.
      sample.useButton = createEl("button", "use-button", "Use This Sample");
      Object.assign(sample.useButton.style, {
        padding: "12px 24px",
        backgroundColor: "#F7931A", // Bitcoin-orange color
        color: "#fff",
        border: "none",
        borderRadius: "0px", // Square corners
        cursor: "pointer",
        fontSize: "16px"
      });
      sample.useButton.setAttribute(
        "title",
        "Click this button to instantly import the sample into your project with a single click"
      );
  
      sample.metadataDiv = createEl("div", "metadata");
      Object.assign(sample.metadataDiv.style, {
        fontSize: "0.9em",
        color: "#555",
        marginLeft: "10px"
      });
  
      sample.container.append(
        sample.waveformDiv,
        sample.playButton,
        sample.useButton,
        sample.metadataDiv
      );
  
      // Attach sample to container for IntersectionObserver
      sample.container.sample = sample;
      observer.observe(sample.container);
  
      // --- WaveSurfer Initialization (as in the original HTML file) ---
      sample.loadWaveSurfer = () => {
        if (sample.wavesurfer) return;
        sample.wavesurfer = WaveSurfer.create({
          container: sample.waveformDiv,
          waveColor: "#999",
          progressColor: "#555",
          height: 20
        });
        sample.wavesurfer.load(sample.url);
        sample.wavesurfer.on("ready", () => {
          try {
            sample.duration = sample.wavesurfer.getDuration();
            updateMetadataDisplay(sample);
            sample.playButton.textContent = "Play";
          } catch (error) {
            aggregatedLogs.addError(`Ready error for sample ${sample.id}: ${error}`);
          }
          stats.wsReady++;
          checkAllSamplesProcessed();
        });
        sample.wavesurfer.on("error", err => {
          if (
            err &&
            (err.name === "AbortError" ||
              (typeof err === "string" &&
                err.toLowerCase().includes("abort")))
          )
            return;
          stats.wsError++;
          aggregatedLogs.addError(`WaveSurfer error for sample ${sample.id}: ${err}`);
          checkAllSamplesProcessed();
        });
        sample.wavesurfer.on("finish", () => {
          sample.playButton.textContent = "Play";
        });
      };
  
      sample.destroyWaveSurfer = () => {
        if (sample.wavesurfer && !sample.wavesurfer.isPlaying()) {
          try {
            sample.wavesurfer.destroy();
          } catch (error) {
            if (
              !(error.name === "AbortError" ||
                (error.message &&
                  error.message.toLowerCase().includes("abort")))
            ) {
              aggregatedLogs.addError(`Destroy error for sample ${sample.id}: ${error}`);
            }
          }
          sample.wavesurfer = null;
        }
      };
  
      // --- Set up the Play button ---
      sample.playButton.addEventListener("click", () => togglePlay(sample));
  
      // --- Set up the Use button ---
      sample.useButton.addEventListener("click", async () => {
        try {
          // Instead of copying to clipboard, find the already-open Load Sample Modal.
          const loadModal = Array.from(document.querySelectorAll('.modal-content'))
            .find(modal => modal.querySelector('.audional-input'));
          if (loadModal) {
            const ordInput = loadModal.querySelector('.audional-input');
            const loadBtn = loadModal.querySelector('button.green-button');
            if (ordInput && loadBtn) {
              ordInput.value = sample.id;
              loadBtn.click();
              console.log(`Loaded ORD ID ${sample.id} into load sample modal.`);
              if (document.body.contains(modalOverlay)) {
                document.body.removeChild(modalOverlay);
              }
            } else {
              console.warn('Load sample modal input or load button not found.');
            }
          } else {
            console.warn('Load sample modal not found.');
          }
        } catch (err) {
          console.error("Failed to load sample via Use button:", err);
        }
      });
  
      // --- Fetch File Metadata via a HEAD Request ---
      async function fetchMetadata() {
        try {
          const res = await fetchWithRetry(sample.url, { method: "HEAD" });
          stats.headCompleted++;
          if (res.ok) {
            stats.headSuccess++;
            const cl = res.headers.get("Content-Length");
            if (cl) sample.fileSize = parseInt(cl, 10);
            sample.fileType = getFileType(res.headers.get("Content-Type"));
            updateMetadataDisplay(sample);
          } else {
            stats.headFailure++;
            aggregatedLogs.addError(`HEAD failed for ${sample.url}: ${res.statusText}`);
          }
        } catch (err) {
          stats.headCompleted++;
          stats.headFailure++;
          aggregatedLogs.addError(`HEAD error for ${sample.url}: ${err}`);
        }
        checkAllSamplesProcessed();
      }
      fetchMetadata();
  
      return sample;
    }
  
    // === Render Samples Based on Sorting and Filtering ===
    function renderSamples() {
      sampleListContainer.innerHTML = "";
      const sortBy = sortSelect.value;
      const filterType = typeSelect.value;
      const sorted = samples
        .filter(sample => filterType === "all" || sample.fileType === filterType)
        .sort((a, b) => {
          switch (sortBy) {
            case "oldest":
              return a.initialIndex - b.initialIndex;
            case "newest":
              return b.initialIndex - a.initialIndex;
            case "durationAsc":
              return (a.duration || Infinity) - (b.duration || Infinity);
            case "durationDesc":
              return (b.duration || 0) - (a.duration || 0);
            default:
              return 0;
          }
        });
      sorted.forEach(sample => {
        sampleListContainer.appendChild(sample.container);
      });
    }
  
    // --- Listen for Changes on Sorting/Filtering Controls ---
    sortSelect.addEventListener("change", renderSamples);
    typeSelect.addEventListener("change", renderSamples);
  
    // === Load JSON Data and Initialize Samples ===
    (async () => {
      try {
        // IMPORTANT: Adjust the JSON file path to your needs.
        const res = await fetch("AudioInscriptions/all_audio_inscriptions.json");
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        stats.total = data.length;
        data.forEach((audio, index) => {
          const sample = createSample(audio, index);
          samples.push(sample);
        });
        renderSamples();
      } catch (err) {
        aggregatedLogs.addError("Error loading JSON: " + err);
        console.error("JSON load error:", err);
        sampleListContainer.textContent = "Failed to load audio inscriptions.";
      }
    })();
  }
// js/module_factory/modules/sample_player.js
import { audioCtx } from '../../audio_context.js';

// Base URL for fetching Ordinal content
const ORDINAL_CONTENT_BASE_URL = 'https://ordinals.com/content/';

export function createSamplePlayerModule(parent, moduleId) {
  let audioBuffer = null;
  let isLoading = false; // Flag to prevent multiple loads at once
  const outputGain = audioCtx.createGain();
  parent.append(outputGain); // connect later in factory

  // --- Helper to create DOM elements ---
  const el = (tag, attrs = {}, children = []) => {
    const element = Object.assign(document.createElement(tag), attrs);
    element.append(...children);
    return element;
  };

  // --- UI Elements ---
  const canvas = el('canvas', {
    width: 150, height: 40,
    style: 'border:1px solid #555; background:#222; display:block; margin:5px 0; cursor: default;',
    title: 'Audio Waveform Preview'
  });

  // --- Ordinal ID ---
  const ordinalInputLabel = el('label', { style: 'display: block; font-size: 11px; margin-bottom: 2px;' }, ['Load Ordinal ID:']);
  const ordinalInput = el('input', {
    type: 'text',
    placeholder: 'Enter Ordinal ID...',
    style: 'display: inline-block; width: calc(100% - 45px); margin-right: 5px; font-size: 11px; padding: 2px;',
    title: 'Enter the Ordinal inscription ID (e.g., 91bb...i17)'
  });
  const loadOrdinalButton = el('button', {
    textContent: 'Load',
    style: 'font-size: 11px; padding: 2px 5px; vertical-align: middle;',
    title: 'Load audio from the specified Ordinal ID'
  });
  const ordinalContainer = el('div', { style: 'margin-bottom: 8px;' }, [ordinalInput, loadOrdinalButton]); // Added margin-bottom

  // --- Local File ---
  const fileInputLabel = el('label', { style: 'display: block; font-size: 11px; margin-bottom: 2px;' }, ['Load Local File:']);
  const fileInput = el('input', {
    type: 'file', accept: 'audio/*',
    style: 'display: block; margin-bottom: 8px; width: 100%; font-size: 11px;', // Keep margin-bottom here too
    title: 'Select an audio file from your computer'
  });

  // --- Append UI to parent in the new order ---
  parent.append(
    canvas,
    ordinalInputLabel, // Ordinal first
    ordinalContainer,
    fileInputLabel,    // File second
    fileInput
    // URL elements are removed
  );
  const ctx = canvas.getContext('2d');

  // --- Drawing Logic (Unchanged) ---
  const draw = (message = null) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#777';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    if (isLoading) {
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2 + 4);
        canvas.style.borderColor = '#FFA500'; // Orange border while loading
        return;
    }
    if (message) { // Display specific messages (e.g., errors)
        ctx.fillStyle = message.startsWith('Error') ? '#FF6347' : '#777'; // Red for errors
        ctx.fillText(message.substring(0, 25), canvas.width / 2, canvas.height / 2 + 4); // Limit message length
        canvas.style.borderColor = message.startsWith('Error') ? '#FF6347' : '#555';
        return;
    }
     if (!audioBuffer) {
        ctx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2 + 4);
        canvas.style.borderColor = '#555';
        return;
    }

    // Draw waveform
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const h2 = canvas.height / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#87CEFA'; // Light blue
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      let min = 1.0, max = -1.0;
      const start = x * step;
      const end = Math.min(start + step, data.length);
      for (let j = start; j < end; j++) {
        const v = data[j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      min = Math.max(-1.0, min);
      max = Math.min(1.0, max);
      ctx.moveTo(x + 0.5, (1 + min) * h2);
      ctx.lineTo(x + 0.5, (1 + max) * h2);
    }
    ctx.stroke();
    canvas.style.borderColor = '#555';
  };
  draw(); // Initial draw

  // --- Core Audio Processing (Unchanged) ---
  const decodeAndSetBuffer = async (arrayBuffer, sourceName) => {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("Empty audio data received.");
    }
    try {
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBuffer = decodedBuffer;
      console.log(`[SamplePlayer ${moduleId}] Decoded ${sourceName} (${audioBuffer.duration.toFixed(2)}s)`);
      draw();
      return audioBuffer;
    } catch (err) {
      audioBuffer = null;
      console.error(`[SamplePlayer ${moduleId}] Decode error for ${sourceName}:`, err);
      draw(`Error decoding audio`);
      throw err;
    }
  };

  // --- Loading from URL (Kept internally for Ordinal Loading) ---
  // Renamed sourceDescription default for clarity as it's now only used by Ordinal
  const loadAudioFromUrlInternal = (url, sourceDescription = "source") => new Promise(async (resolve, reject) => {
    if (isLoading) return reject(new Error("Already loading audio."));
    if (!url || typeof url !== 'string' || !url.trim()) return reject(new Error(`Invalid ${sourceDescription} provided.`));

    console.log(`[SamplePlayer ${moduleId}] Loading ${sourceDescription}: ${url}`);
    isLoading = true;
    // Disable remaining inputs/buttons during load
    fileInput.disabled = true;
    ordinalInput.disabled = true;
    loadOrdinalButton.disabled = true;
    draw(); // Show loading state

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
          const statusText = response.statusText || `Status ${response.status}`;
          throw new Error(`HTTP error! ${statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      // Use Ordinal ID (last part of URL) as display name if fetching ordinal
      const displayName = sourceDescription === "Ordinal ID" ? url.split('/').pop() : url;
      const resultBuffer = await decodeAndSetBuffer(arrayBuffer, displayName);
      resolve(resultBuffer);
    } catch (err) {
      console.error(`[SamplePlayer ${moduleId}] Fetch/Decode error for ${sourceDescription} ${url}:`, err);
      audioBuffer = null;
      let errorMsg = `Error loading ${sourceDescription}`;
       if (err.message.includes('HTTP error')) {
           errorMsg = `Error: ${err.message}`;
           if (err.message.includes('404')) errorMsg += ' (Not Found)';
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
           errorMsg = 'Error: Network/CORS?';
      }
      draw(errorMsg);
      reject(err);
    } finally {
      isLoading = false;
      // Re-enable remaining inputs/buttons
      fileInput.disabled = false;
      ordinalInput.disabled = false;
      loadOrdinalButton.disabled = false;
       if (!isLoading && !ctx.fillStyle.startsWith('#FF') && !ctx.strokeStyle.startsWith('#87CEFA')) {
           draw(audioBuffer ? null : `Failed ${sourceDescription}`);
       } else if (audioBuffer && ctx.fillStyle === '#777') {
           draw();
       }
    }
  });


  // --- Loading from File ---
  const loadAudioFromFile = file => new Promise(async (resolve, reject) => {
    if (isLoading) return reject(new Error("Already loading audio."));
    if (!file) return reject(new Error("No file selected."));

    console.log(`[SamplePlayer ${moduleId}] Loading file: ${file.name}`);
    isLoading = true;
    // Disable inputs/buttons during load
    fileInput.disabled = true;
    ordinalInput.disabled = true;
    loadOrdinalButton.disabled = true;
    draw(); // Show loading state

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const resultBuffer = await decodeAndSetBuffer(e.target.result, file.name);
        resolve(resultBuffer);
      } catch (err) {
        reject(err);
      } finally {
        isLoading = false;
        // Re-enable inputs/buttons
        fileInput.disabled = false;
        ordinalInput.disabled = false;
        loadOrdinalButton.disabled = false;
        draw(); // Redraw final state
      }
    };
    reader.onerror = e => {
      console.error(`[SamplePlayer ${moduleId}] FileReader error:`, e.target.error);
      audioBuffer = null;
      isLoading = false;
      // Re-enable inputs/buttons
      fileInput.disabled = false;
      ordinalInput.disabled = false;
      loadOrdinalButton.disabled = false;
      draw(`Error reading file`);
      reject(e.target.error);
    };
    reader.readAsArrayBuffer(file);
  });


  // --- Event Listeners ---

  // File Input Listener
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      loadAudioFromFile(file)
        .then(() => {
            ordinalInput.value = ''; // Clear Ordinal input on successful file load
        })
        .catch(err => console.warn(`[SamplePlayer ${moduleId}] Failed to load file: ${err.message}`));
    }
  };

  // Ordinal Load Handler
  const handleOrdinalLoad = () => {
      const id = ordinalInput.value.trim();
      if (id) {
          if (id.includes('/') || id.includes(':')) {
              draw('Error: Invalid ID format');
              return;
          }
          const url = ORDINAL_CONTENT_BASE_URL + id;
          // Use the internal URL loader function
          loadAudioFromUrlInternal(url, "Ordinal ID")
          .then(() => {
              fileInput.value = ''; // Clear file input on successful Ordinal load
          })
          .catch(err => console.warn(`[SamplePlayer ${moduleId}] Failed to load Ordinal ID: ${err.message}`));
      } else {
          console.warn(`[SamplePlayer ${moduleId}] No Ordinal ID entered.`);
          draw('Enter an Ordinal ID');
      }
  };

  // Ordinal Input Listeners
  loadOrdinalButton.onclick = handleOrdinalLoad;
  ordinalInput.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleOrdinalLoad(); }
  };

  // URL Handlers are removed


  // --- Playback Trigger (Unchanged) ---
  const trigger = t => {
    if (isLoading) return console.warn(`[SamplePlayer ${moduleId}] Cannot trigger while loading.`);
    if (!audioBuffer) return console.warn(`[SamplePlayer ${moduleId}] No audio buffer loaded.`);

    const play = time => {
       try {
         if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
              console.log(`[SamplePlayer ${moduleId}] AudioContext resumed.`);
              startSource(time);
            }).catch(e => console.error(`[SamplePlayer ${moduleId}] resume error:`, e));
         } else {
             startSource(time);
         }
       } catch (e) {
           console.error(`[SamplePlayer ${moduleId}] Error during playback attempt:`, e);
       }
     };

     const startSource = (startTime) => {
        const src = audioCtx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(outputGain);
        try {
            src.start(startTime);
            console.log(`[SamplePlayer ${moduleId}] Play triggered ${startTime !== undefined ? `at ${startTime.toFixed(3)}` : 'immediately'}`);
            canvas.style.borderColor = '#32CD32'; // Green border
            src.onended = () => {
                canvas.style.borderColor = '#555';
                src.disconnect();
                console.log(`[SamplePlayer ${moduleId}] Playback ended.`);
            };
        } catch (e) {
            console.error(`[SamplePlayer ${moduleId}] source.start() error:`, e);
            canvas.style.borderColor = '#FF6347'; // Red border
            setTimeout(() => {
                if (canvas.style.borderColor === 'rgb(255, 99, 71)') {
                    canvas.style.borderColor = '#555';
                }
            }, 500);
        }
    };

    play(t);
  };

  // --- Module Definition ---
  return {
    id: moduleId,
    type: 'samplePlayer',
    element: parent,
    audioNode: outputGain,
    trigger,
    getBufferDuration: () => audioBuffer?.duration ?? 0,
    dispose: () => {
      console.log(`[SamplePlayer ${moduleId}] Disposed`);
      // Remove event listeners for remaining inputs
      fileInput.onchange = null;
      loadOrdinalButton.onclick = null;
      ordinalInput.onkeydown = null;
      // No need to clean up URL listeners as they were removed
    }
  };
}
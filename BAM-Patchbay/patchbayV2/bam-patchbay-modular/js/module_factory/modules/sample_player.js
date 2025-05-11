// js/module_factory/modules/sample_player.js
import { audioCtx } from '../../audio_context.js';

export function createSamplePlayerModule(parent, moduleId) {
  let audioBuffer = null;
  const outputGain = audioCtx.createGain(); // This is the module's main audio output

  // Tiny helper for element creation
  const el = (tag, props = {}) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    return e;
  };

  const fileInput = el('input', {
    type: 'file',
    accept: 'audio/*',
    style: 'display:block; margin-top: 5px; margin-bottom: 5px;' // Added some margin
  });

  const canvas = el('canvas', {
    width: 150, // Consider making this slightly wider if module width allows
    height: 40,
    style: 'border:1px solid #555; background-color: #222;' // Added background for clarity
  });

  // It's good practice to add a label or title for the module
  const titleHeader = el('div', { 
    textContent: 'Sample Player', 
    style: 'font-weight: bold; margin-bottom: 5px; text-align: center; background-color: #4a4a4a; padding: 3px; border-radius: 3px 3px 0 0;'
  });
  // Prepend title if you want it at the top of the module's content
  // parent.appendChild(titleHeader); // Or manage header in a more generic module wrapper

  parent.appendChild(canvas);
  parent.appendChild(fileInput);

  const ctx = canvas.getContext('2d');
  const halfH = canvas.height / 2;

  function drawWaveform() {
    if (!audioBuffer) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear if no buffer
      ctx.fillStyle = '#777';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2 + 4);
      return;
    }
    const data = audioBuffer.getChannelData(0); // Assuming mono or using first channel
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2; // Amplitude for drawing

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#87CEFA'; // LightSkyBlue for waveform
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(x * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      // Draw a vertical line from min to max for each "pixel"
      ctx.moveTo(x + 0.5, (1 + min) * amp); // +0.5 for sharper lines
      ctx.lineTo(x + 0.5, (1 + max) * amp);
    }
    ctx.stroke();
  }
  // Initial draw (e.g., "No audio loaded" message)
  drawWaveform();


  function loadAudioBuffer(file) {
    console.log(`[SamplePlayer ${moduleId}] Loading “${file.name}”`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          audioBuffer = await audioCtx.decodeAudioData(event.target.result);
          console.log(`[SamplePlayer ${moduleId}] Decoded "${file.name}" (${audioBuffer.duration.toFixed(2)}s)`);
          drawWaveform();
          resolve(audioBuffer);
        } catch (err) {
          console.error(`[SamplePlayer ${moduleId}] Decode error for "${file.name}":`, err);
          audioBuffer = null;
          drawWaveform(); // Redraw to show "No audio" or clear
          reject(err);
        }
      };
      reader.onerror = (event) => {
        console.error(`[SamplePlayer ${moduleId}] FileRead error for "${file.name}":`, event.target.error);
        reject(event.target.error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  fileInput.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      loadAudioBuffer(file).catch(err => {
        // User already sees console error, alert might be too intrusive
        // alert(`Failed to load audio for module ${moduleId}. See console.`);
        console.warn(`UI: Failed to load audio for ${moduleId}, error logged.`);
      });
    }
  };

  /**
   * Triggers playback of the loaded sample.
   * Can be called with a specific Web Audio time for scheduled playback.
   * @param {number} [startTime] - The audioCtx.currentTime-based time to start playback.
   *                             If undefined, plays immediately.
   */
  function trigger(startTime) {
    if (!audioBuffer) {
      console.warn(`[SamplePlayer ${moduleId}] Trigger received, but no audio buffer loaded.`);
      return;
    }

    // Ensure AudioContext is running. This is crucial.
    // The global play button should handle the initial resume, but this is a good safeguard.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log(`[SamplePlayer ${moduleId}] AudioContext resumed on trigger.`);
        // Now actually play
        playSample(startTime);
      }).catch(err => {
        console.error(`[SamplePlayer ${moduleId}] Error resuming AudioContext on trigger:`, err);
      });
    } else {
      playSample(startTime);
    }
  }

  function playSample(startTime) {
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(outputGain); // Connect to the module's gain node (its audio output)

    try {
      // If startTime is undefined or in the past, start immediately.
      // The Web Audio API handles startTime in the past by playing as soon as possible.
      sourceNode.start(startTime); // startTime can be undefined
      console.log(`[SamplePlayer ${moduleId}] Play triggered ${startTime !== undefined ? `at ${startTime.toFixed(3)}` : 'immediately'}`);
    } catch (e) {
      console.error(`[SamplePlayer ${moduleId}] Error calling sourceNode.start():`, e);
      return; // Don't proceed if start fails
    }

    // Visual feedback
    canvas.style.borderColor = '#32CD32'; // LimeGreen
    sourceNode.onended = () => {
      canvas.style.borderColor = '#555'; // Reset border color
      sourceNode.disconnect(); // Important to disconnect finished sources
      console.log(`[SamplePlayer ${moduleId}] Playback ended.`);
    };
  }

  // Method to clean up (if ever needed, e.g., when module is deleted)
  function dispose() {
    console.log(`[SamplePlayer ${moduleId}] Disposing.`);
    // outputGain.disconnect(); // Disconnect from wherever it's connected
    // Any other cleanup
  }

  return {
    id: moduleId,
    type: 'samplePlayer',
    element: parent,      // The DOM element container for this module
    audioNode: outputGain, // The main audio output node of this module
    
    // Exposed methods
    loadAudioBuffer,      // Allows external loading if needed, though fileInput handles UI
    trigger,              // The method for the sequencer to call

    // Optional: if you want a manual play button on the module itself someday
    // play: () => trigger(), // Simple play calls trigger immediately

    dispose               // For cleanup
  };
}
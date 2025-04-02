// Check if FFmpeg object exists (loaded from CDN in HTML)
if (typeof FFmpeg === 'undefined') {
    console.error("FFmpeg library not loaded. Check the script tag in the HTML.");
    // Optionally display an error message to the user
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = 'Error: Could not load required FFmpeg library.';
      statusEl.className = 'error';
    }
  } else {
    const { createFFmpeg, fetchFile } = FFmpeg;
  
    // Get references to DOM elements
    const statusEl = document.getElementById('status'),
      progressEl = document.getElementById('progress'),
      convertBtn = document.getElementById('convertBtn'),
      fileInput = document.getElementById('fileInput'),
      resultEl = document.getElementById('result'),
      formatRadios = document.querySelectorAll('input[name="format"]'),
      mp3SettingsDiv = document.getElementById('mp3Settings'),
      opusSettingsDiv = document.getElementById('opusSettings'),
      mp3QualitySlider = document.getElementById('mp3Quality'),
      mp3QualityValueSpan = document.getElementById('mp3QualityValue'),
      opusBitrateSlider = document.getElementById('opusBitrate'),
      opusBitrateValueSpan = document.getElementById('opusBitrateValue'),
      estSizeMp3Span = document.getElementById('estSizeMp3'),
      estSizeOpusSpan = document.getElementById('estSizeOpus'),
      base64Container = document.getElementById('base64Container'),
      base64Result = document.getElementById('base64Result'),
      base64Output = document.getElementById('base64Output'),
      copyBase64Btn = document.getElementById('copyBase64Btn'),
      downloadBase64Btn = document.getElementById('downloadBase64Btn'),
      playSampleBtn = document.getElementById('playSampleBtn'),
      originalAudioContainer = document.getElementById('originalAudioContainer');
  
    // State variables
    let ffmpeg = null, selectedFile = null, fileDuration = null, convertedAudioBlob = null, base64String = null;
    let originalAudioUrl = null, originalAudioElement = null;
  
    // --- Helper Functions ---
  
    const formatBytes = (bytes, dec = 2) =>
      bytes <= 0 ? '0 Bytes' : (bytes / Math.pow(1024, Math.floor(Math.log(bytes) / Math.log(1024)))).toFixed(dec) +
      ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4)];
  
    const updateStatus = (msg, err = false) => {
      console.log(msg);
      statusEl.textContent = `Status: ${msg}`;
      statusEl.className = err ? 'error' : '';
      progressEl.style.display = 'none';
      if (err) {
        convertBtn.disabled = !(ffmpeg && selectedFile);
        playSampleBtn.disabled = !selectedFile;
      }
    };
  
    const enableConvertButtonIfNeeded = () => {
      const enabled = ffmpeg && selectedFile;
      convertBtn.disabled = !enabled;
      playSampleBtn.disabled = !selectedFile;
      return !enabled; // Return true if disabled
    };
  
    const loadFFmpeg = async () => {
      try {
        if (!ffmpeg) {
          updateStatus('Loading FFmpeg core...');
          ffmpeg = createFFmpeg({ log: true, corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js' });
          await ffmpeg.load();
          ffmpeg.setProgress(({ ratio }) => {
            progressEl.style.display = 'block';
            const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
            progressEl.value = percent;
            updateStatus(`Converting... (${percent}%)`);
          });
        }
        updateStatus('FFmpeg ready. Select a file.');
        enableConvertButtonIfNeeded();
      } catch (e) {
        updateStatus(`Failed to load FFmpeg: ${e.message}`, true);
        console.error(e);
      }
    };
  
    const getWavDuration = file => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          ctx.decodeAudioData(e.target.result)
            .then(buffer => res(buffer.duration))
            .catch(err => { console.error("Decode error:", err); rej("Could not decode audio."); })
            .finally(() => ctx.close());
        } catch (err) {
          console.error("AudioContext error:", err);
          rej("Web Audio API not supported.");
        }
      };
      reader.onerror = () => rej("File reading error.");
      reader.readAsArrayBuffer(file);
    });
  
    const updateEstimatedSize = () => {
      if (!fileDuration || !selectedFile) { estSizeMp3Span.textContent = estSizeOpusSpan.textContent = ''; return; }
      const selectedFormat = document.querySelector('input[name="format"]:checked').value;
      let bitrateKbps = 0, estimatedSizeBytes = 0;
      if (selectedFormat === 'mp3') {
        const visualQuality = parseInt(mp3QualitySlider.value, 10),
          ffmpegQuality = 9 - visualQuality,
          approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65];
        bitrateKbps = approxBitrates[ffmpegQuality] || 128;
        // MP3 VBR size estimation is tricky, this is very approximate
        estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8; // MP3 uses bits
        estSizeMp3Span.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
        estSizeOpusSpan.textContent = '';
      } else { // Opus
        bitrateKbps = parseInt(opusBitrateSlider.value, 10);
        estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8; // Opus uses bits
        estSizeOpusSpan.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
        estSizeMp3Span.textContent = '';
      }
    };
  
    const updateQualityDisplays = () => {
      const fmt = document.querySelector('input[name="format"]:checked').value;
      mp3SettingsDiv.style.display = fmt === 'mp3' ? 'block' : 'none';
      opusSettingsDiv.style.display = fmt === 'opus' ? 'block' : 'none';
      updateEstimatedSize();
    };
  
    const convertToBase64 = blob => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]); // Get only the Base64 part
      reader.onerror = () => rej(new Error('Error reading file as base64'));
      reader.readAsDataURL(blob);
    });
  
    const createAudioPlayer = (blob, mime, label) => {
      const url = URL.createObjectURL(blob);
      const container = document.createElement('div');
      const audio = Object.assign(document.createElement('audio'), {
        controls: true,
        style: 'width:100%; margin-top:10px;',
        src: url
      });
      const playButton = Object.assign(document.createElement('button'), {
        className: 'play-button',
        textContent: `Play ${label}`
      });
      playButton.onclick = () => {
        if (audio.paused) {
          audio.play();
          playButton.textContent = `Pause ${label}`;
        } else {
          audio.pause();
          playButton.textContent = `Play ${label}`;
        }
      };
      audio.onended = () => {
        playButton.textContent = `Play ${label}`;
      };
      // Cleanup blob URL when element is removed (optional but good practice)
      const observer = new MutationObserver((mutationsList, obs) => {
          for(const mutation of mutationsList) {
              if (mutation.removedNodes) {
                  mutation.removedNodes.forEach(node => {
                      if (node === container) {
                          URL.revokeObjectURL(url);
                          console.log(`Revoked Blob URL for ${label}`);
                          obs.disconnect(); // Stop observing once removed
                      }
                  });
              }
          }
      });
      observer.observe(container.parentNode || document.body, { childList: true }); // Watch parent or body
  
      container.append(playButton, audio);
      return container;
    };
  
    const setupOriginalAudioPlayer = () => {
        if (originalAudioUrl) {
          URL.revokeObjectURL(originalAudioUrl); // Clean up previous URL if any
        }
        originalAudioContainer.innerHTML = ''; // Clear previous player
        originalAudioContainer.style.display = 'none';
  
        if (!selectedFile) return; // No file, do nothing
  
        originalAudioUrl = URL.createObjectURL(selectedFile);
        originalAudioElement = Object.assign(document.createElement('audio'), {
          controls: true,
          style: 'width:100%;',
          src: originalAudioUrl
        });
  
        const audioTitle = document.createElement('h3');
        audioTitle.textContent = 'Original WAV File';
        audioTitle.style.margin = '0 0 10px 0';
  
        originalAudioContainer.appendChild(audioTitle);
        originalAudioContainer.appendChild(originalAudioElement);
        originalAudioContainer.style.display = 'block'; // Show the container
  
        // Update button text when audio plays/pauses/ends externally
        originalAudioElement.onplay = () => playSampleBtn.textContent = 'Pause Original';
        originalAudioElement.onpause = () => playSampleBtn.textContent = 'Play Original';
        originalAudioElement.onended = () => playSampleBtn.textContent = 'Play Original';
    };
  
  
    const setupBase64Conversion = async (blob, outputFormat, originalName) => {
      try {
        updateStatus('Converting audio to Base64...');
        base64String = await convertToBase64(blob);
        base64Container.style.display = 'block';
        base64Output.textContent = base64String; // Display the string
  
        // Create a blob from the base64 string to verify and play
        const base64Blob = new Blob([Uint8Array.from(atob(base64String), c => c.charCodeAt(0))], { type: outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus' });
  
        base64Result.innerHTML = ''; // Clear previous player
        base64Result.appendChild(createAudioPlayer(base64Blob, outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus', 'Base64 Audio'));
  
        copyBase64Btn.onclick = () => {
          navigator.clipboard.writeText(base64String)
            .then(() => {
              const origText = copyBase64Btn.textContent;
              copyBase64Btn.textContent = 'Copied!';
              setTimeout(() => copyBase64Btn.textContent = origText, 2000);
            })
            .catch(err => {
              console.error('Failed to copy base64:', err);
              alert('Failed to copy to clipboard. Your browser might not support it or requires HTTPS.');
            });
        };
  
        downloadBase64Btn.onclick = () => {
          const txtBlob = new Blob([base64String], { type: 'text/plain' });
          const url = URL.createObjectURL(txtBlob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `${originalName}.base64.txt`
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
  
        const base64TextSizeBytes = base64String.length; // Size of the text representation
        downloadBase64Btn.textContent = `Download as TXT (${formatBytes(base64TextSizeBytes)})`;
  
        updateStatus('Base64 conversion complete!');
  
      } catch (e) {
        updateStatus(`Base64 conversion failed: ${e.message || 'Unknown error'}`, true);
        console.error("Base64 Conversion Error:", e);
        base64Container.style.display = 'none'; // Hide section on error
      }
    };
  
  
    // --- Event Listeners ---
  
    fileInput.addEventListener('change', async e => {
      selectedFile = e.target.files[0];
  
      // Reset UI elements
      resultEl.innerHTML = '';
      base64Container.style.display = 'none';
      base64Result.innerHTML = '';
      downloadBase64Btn.textContent = 'Download as TXT';
      originalAudioContainer.style.display = 'none';
      originalAudioContainer.innerHTML = '';
      playSampleBtn.textContent = 'Play Original'; // Reset button text
      if (originalAudioUrl) {
        URL.revokeObjectURL(originalAudioUrl); // Clean up previous blob URL
        originalAudioUrl = null;
      }
      originalAudioElement = null; // Remove reference to old audio element
  
      fileDuration = null;
      convertedAudioBlob = null;
      base64String = null;
      estSizeMp3Span.textContent = estSizeOpusSpan.textContent = '';
  
      if (selectedFile) {
        updateStatus(`File selected: ${selectedFile.name}. Reading duration...`);
        enableConvertButtonIfNeeded(); // Enable convert if FFmpeg is ready
        try {
          fileDuration = await getWavDuration(selectedFile);
          updateStatus(`File selected: ${selectedFile.name} (${fileDuration.toFixed(1)}s)`);
          updateEstimatedSize(); // Update size estimate now that we have duration
          setupOriginalAudioPlayer(); // Prepare the original audio player
        } catch (err) {
          updateStatus(`Error getting file duration: ${err}`, true);
          fileDuration = null;
          enableConvertButtonIfNeeded(); // Ensure buttons are correctly disabled
        }
      } else {
        updateStatus('No file selected.');
        fileDuration = null;
        enableConvertButtonIfNeeded(); // Disable buttons
      }
      // Final check on button states after processing
      enableConvertButtonIfNeeded();
    });
  
    playSampleBtn.addEventListener('click', () => {
      if (!selectedFile) {
          updateStatus('No file selected!', true);
          return;
      }
  
      // Ensure the player is set up if it wasn't already (e.g., if duration failed)
      if (!originalAudioElement && originalAudioContainer.innerHTML === '') {
          setupOriginalAudioPlayer();
      }
  
      // Now toggle play/pause
      if (originalAudioElement) {
        if (originalAudioElement.paused) {
          originalAudioElement.play();
          // Button text is handled by onplay/onpause handlers now
        } else {
          originalAudioElement.pause();
          // Button text is handled by onplay/onpause handlers now
        }
      } else {
          updateStatus('Could not create audio player for original file.', true);
      }
    });
  
  
    formatRadios.forEach(r => r.addEventListener('change', updateQualityDisplays));
    mp3QualitySlider.addEventListener('input', e => { mp3QualityValueSpan.textContent = e.target.value; updateEstimatedSize(); });
    opusBitrateSlider.addEventListener('input', e => { opusBitrateValueSpan.textContent = `${e.target.value} kbps`; updateEstimatedSize(); });
  
    convertBtn.addEventListener('click', async () => {
      if (!ffmpeg || !selectedFile) {
        return updateStatus('Error: FFmpeg not loaded or no file selected.', true);
      }
  
      // Disable buttons during conversion
      convertBtn.disabled = true;
      playSampleBtn.disabled = true;
  
      // Reset previous results
      resultEl.innerHTML = '';
      base64Container.style.display = 'none';
      base64Result.innerHTML = '';
      convertedAudioBlob = null;
      base64String = null;
  
      updateStatus('Loading file into memory...');
      progressEl.style.display = 'none'; // Hide progress until FFmpeg reports it
  
      const inputFilename = "input.wav";
      const outputFormat = document.querySelector('input[name="format"]:checked').value;
      const outputFilename = `output.${outputFormat}`;
  
      try {
        // Clean up old files in virtual FS if they exist
        [inputFilename, outputFilename].forEach(f => { try { if(ffmpeg.FS('readdir','/').includes(f)) ffmpeg.FS('unlink', f); } catch(e){} });
  
        // Write input file to FFmpeg's virtual filesystem
        ffmpeg.FS('writeFile', inputFilename, await fetchFile(selectedFile));
  
        updateStatus(`Starting conversion to ${outputFormat.toUpperCase()}...`);
        progressEl.style.display = 'block';
        progressEl.value = 0;
  
        // Build FFmpeg command
        let cmd = ['-i', inputFilename];
        if (outputFormat === 'opus') {
          cmd.push('-c:a', 'libopus', '-b:a', `${opusBitrateSlider.value}k`, outputFilename);
        } else { // MP3
          const ffmpegQuality = 9 - parseInt(mp3QualitySlider.value, 10); // FFmpeg q:a is reverse of visual slider
          cmd.push('-c:a', 'libmp3lame', '-q:a', ffmpegQuality.toString(), outputFilename);
        }
  
        // Run FFmpeg
        await ffmpeg.run(...cmd);
  
        updateStatus('Conversion complete! Preparing download...');
        progressEl.style.display = 'none';
  
        // Read output file from virtual filesystem
        const data = ffmpeg.FS('readFile', outputFilename);
        const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus';
        convertedAudioBlob = new Blob([data.buffer], { type: mimeType }); // Store the blob
        const url = URL.createObjectURL(convertedAudioBlob);
        const originalName = (selectedFile.name.split('.').slice(0, -1).join('.')) || 'converted'; // Handle names with dots
  
        // Create download link
        const dlLink = document.createElement('a');
        dlLink.href = url;
        dlLink.download = `${originalName}.${outputFormat}`;
        dlLink.textContent = `Download ${dlLink.download} (${formatBytes(convertedAudioBlob.size)})`;
  
        // Create audio player for converted file
        const audioPlayer = createAudioPlayer(convertedAudioBlob, mimeType, 'Converted Audio');
  
        // Display results
        resultEl.append(dlLink, audioPlayer);
  
        updateStatus('Conversion successful! Click link to download.');
  
        // Start Base64 conversion process
        await setupBase64Conversion(convertedAudioBlob, outputFormat, originalName);
  
        // Clean up virtual filesystem
        [inputFilename, outputFilename].forEach(f => { try { ffmpeg.FS('unlink', f); } catch(e){ console.warn(`Cleanup failed for ${f}:`, e); } });
  
      } catch (e) {
        updateStatus(`Conversion failed: ${e.message || 'Unknown error'}`, true);
        console.error("Conversion Error:", e);
        // Attempt cleanup even on error
        [inputFilename, outputFilename].forEach(f => { try { if(ffmpeg.FS('readdir','/').includes(f)) ffmpeg.FS('unlink', f); } catch(e){} });
      } finally {
        // Re-enable buttons after conversion (success or failure)
        enableConvertButtonIfNeeded();
         // Play original button should always be enabled if a file is selected
        playSampleBtn.disabled = !selectedFile;
      }
    });
  
    // --- Initial Setup on Page Load ---
  
    window.addEventListener('load', () => {
      loadFFmpeg(); // Start loading FFmpeg automatically
      // Set initial quality display values
      mp3QualityValueSpan.textContent = mp3QualitySlider.value;
      opusBitrateValueSpan.textContent = `${opusBitrateSlider.value} kbps`;
      updateQualityDisplays(); // Ensure correct settings group is visible
      updateStatus('Initializing...'); // Initial status before FFmpeg loads
    });
  
  } // End of FFmpeg check block

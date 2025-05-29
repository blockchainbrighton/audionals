// ab-player.js

/**
 * Creates an A/B comparison player UI with perfect sync and seamless switching.
 * Uses Web Audio API for true sample-accurate toggling, seeking, and looping.
 *
 * @param {Blob} originalBlob - Original audio file Blob
 * @param {string} originalMimeType - Unused, for compatibility
 * @param {Blob} convertedBlob - Converted audio file Blob
 * @param {string} convertedMimeType - Unused, for compatibility
 * @returns {Promise<HTMLDivElement>} - Resolved when decoding and UI are ready
 */
const createABPlayerUI = async (originalBlob, originalMimeType, convertedBlob, convertedMimeType) => {
    // --- UI setup ---
    const abContainer = document.createElement('div');
    abContainer.className = 'ab-player-container';
    Object.assign(abContainer.style, {
      marginTop: '20px',
      border: '1px solid #666',
      padding: '15px',
      backgroundColor: '#333'
    });
  
    abContainer.innerHTML = `
      <h4 style="text-align:center;margin-bottom:15px;">A/B Comparison Player</h4>
      <div class="ab-player-master-controls" style="display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px;">
        <button id="ab-playpause" class="button-small">▶️ Play A/B</button>
        <button id="ab-switch" class="button-small" data-listening-to="A">Listen to B (Converted)</button>
        <button id="ab-loop" class="button-small" title="Enable looping (min duration: 1s)">🔁 Loop Off</button>
        <input id="ab-seek" type="range" min="0" step="0.01" value="0" style="flex:1;max-width:200px;">
        <span id="ab-currenttime">0.00</span> / <span id="ab-duration">0.00</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <b id="ab-label-a" style="opacity:1;">A: Original Audio</b>
        <b id="ab-label-b" style="opacity:0.6;">B: Converted Audio (WebM/Opus)</b>
      </div>
    `;
  
    // --- UI references ---
    const playPauseBtn = abContainer.querySelector('#ab-playpause');
    const abSwitchBtn = abContainer.querySelector('#ab-switch');
    const loopBtn = abContainer.querySelector('#ab-loop');
    const seekSlider = abContainer.querySelector('#ab-seek');
    const curTimeLbl = abContainer.querySelector('#ab-currenttime');
    const durationLbl = abContainer.querySelector('#ab-duration');
    const labelA = abContainer.querySelector('#ab-label-a');
    const labelB = abContainer.querySelector('#ab-label-b');
  
    // --- Web Audio decode/setup ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
    async function decode(blob) {
      const buf = await blob.arrayBuffer();
      return audioCtx.decodeAudioData(buf);
    }
    const [bufA, bufB] = await Promise.all([decode(originalBlob), decode(convertedBlob)]);
    const duration = Math.min(bufA.duration, bufB.duration);
    durationLbl.textContent = duration.toFixed(2);
    seekSlider.max = duration;
  
    // --- Player state ---
    let isPlaying = false, loop = false;
    let listenTo = 'A';  // "A" or "B"
    let startTime = 0;   // AudioContext.currentTime when started
    let pausedAt = 0;    // seconds
    let rafId = null;
    let sourceA = null, sourceB = null, gainA = null, gainB = null;
  
    // --- Internal helpers ---
    function stopSources() {
      if (sourceA) try { sourceA.stop(); } catch {}
      if (sourceB) try { sourceB.stop(); } catch {}
      sourceA = sourceB = gainA = gainB = null;
    }
  
    function setupSources(offset = 0) {
      stopSources();
      gainA = audioCtx.createGain();
      gainB = audioCtx.createGain();
      gainA.gain.value = listenTo === 'A' ? 1 : 0;
      gainB.gain.value = listenTo === 'B' ? 1 : 0;
  
      sourceA = audioCtx.createBufferSource();
      sourceB = audioCtx.createBufferSource();
      sourceA.buffer = bufA;
      sourceB.buffer = bufB;
      [sourceA, gainA].reduce((a, b) => (a.connect(b), b));
      [sourceB, gainB].reduce((a, b) => (a.connect(b), b));
      gainA.connect(audioCtx.destination);
      gainB.connect(audioCtx.destination);
      sourceA.loop = sourceB.loop = loop;
      sourceA.loopStart = sourceB.loopStart = 0;
      sourceA.loopEnd = sourceB.loopEnd = duration;
      sourceA.start(0, offset);
      sourceB.start(0, offset);
      startTime = audioCtx.currentTime - offset;
    }
  
    function getCurrentTime() {
      return isPlaying ? Math.min(audioCtx.currentTime - startTime, duration) : pausedAt;
    }
  
    function setCurrentTime(t) {
      pausedAt = Math.max(0, Math.min(duration, +t));
      if (isPlaying) {
        setupSources(pausedAt);
      }
      seekSlider.value = pausedAt;
      curTimeLbl.textContent = pausedAt.toFixed(2);
    }
  
    function updateSlider() {
      const t = getCurrentTime();
      seekSlider.value = t;
      curTimeLbl.textContent = t.toFixed(2);
      if (t >= duration && !loop) {
        isPlaying = false;
        playPauseBtn.textContent = '▶️ Play A/B';
        stopSources();
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(updateSlider);
      }
    }
  
    // --- UI Actions ---
    playPauseBtn.onclick = () => {
      if (!isPlaying) {
        setupSources(pausedAt);
        isPlaying = true;
        playPauseBtn.textContent = '⏸️ Pause A/B';
        rafId = requestAnimationFrame(updateSlider);
      } else {
        pausedAt = getCurrentTime();
        stopSources();
        isPlaying = false;
        playPauseBtn.textContent = '▶️ Play A/B';
        cancelAnimationFrame(rafId);
      }
    };
  
    abSwitchBtn.onclick = () => {
      listenTo = listenTo === 'A' ? 'B' : 'A';
      if (gainA && gainB) {
        gainA.gain.value = listenTo === 'A' ? 1 : 0;
        gainB.gain.value = listenTo === 'B' ? 1 : 0;
      }
      abSwitchBtn.textContent = listenTo === 'A' ? 'Listen to B (Converted)' : 'Listen to A (Original)';
      abSwitchBtn.dataset.listeningTo = listenTo;
      labelA.style.opacity = listenTo === 'A' ? '1' : '0.6';
      labelB.style.opacity = listenTo === 'B' ? '1' : '0.6';
    };
  
    loopBtn.onclick = () => {
      loop = !loop;
      loopBtn.textContent = loop ? '🔁 Loop On' : '🔁 Loop Off';
      loopBtn.style.backgroundColor = loop ? 'var(--accent-operational)' : '';
      loopBtn.style.color = loop ? '#111' : '';
      if (sourceA && sourceB) sourceA.loop = sourceB.loop = loop;
    };
  
    seekSlider.oninput = e => setCurrentTime(e.target.value);
  
    // --- Cleanup for SPA/unmounts ---
    abContainer.revokeUrls = () => {
      stopSources();
      audioCtx.close();
    };
  
    // --- Ready! ---
    return abContainer;
  };
  
// ab-player.js

/**
 * Creates a perfect A/B audio comparison UI.
 * Plays ONLY one at a time; instant switch; always in sync; looping and seeking supported.
 * @param {Blob} originalBlob
 * @param {string} originalMimeType
 * @param {Blob} convertedBlob
 * @param {string} convertedMimeType
 * @returns {Promise<HTMLElement>}
 */
const createABPlayerUI = async (originalBlob, originalMimeType, convertedBlob, convertedMimeType) => {
    const abContainer = document.createElement('div');
    abContainer.className = 'ab-player-container';
    Object.assign(abContainer.style, {
      marginTop: '20px', border: '1px solid #666', padding: '15px', backgroundColor: '#333'
    });
  
    abContainer.innerHTML = `
      <h4 style="text-align:center;margin-bottom:15px;">A/B Comparison Player</h4>
      <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px;">
        <button id="ab-play" class="button-small">▶️ Play A/B</button>
        <button id="ab-switch" class="button-small" data-listening-to="A">Listen to B (Converted)</button>
        <button id="ab-loop" class="button-small" title="Enable looping (min duration: 1s)">🔁 Loop Off</button>
        <input id="ab-seek" type="range" min="0" max="1" step="0.01" value="0" style="flex:1;max-width:200px;">
        <span id="ab-cur">0.00</span> / <span id="ab-dur">0.00</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <b id="ab-label-a" style="font-weight:bold;opacity:1;">A: Original Audio</b>
        <b id="ab-label-b" style="font-weight:bold;opacity:0.6;">B: Converted Audio (WebM/Opus)</b>
      </div>
    `;
  
    // --- UI Elements ---
    const playBtn = abContainer.querySelector('#ab-play');
    const switchBtn = abContainer.querySelector('#ab-switch');
    const loopBtn = abContainer.querySelector('#ab-loop');
    const seekSlider = abContainer.querySelector('#ab-seek');
    const curLabel = abContainer.querySelector('#ab-cur');
    const durLabel = abContainer.querySelector('#ab-dur');
    const labelA = abContainer.querySelector('#ab-label-a');
    const labelB = abContainer.querySelector('#ab-label-b');
  
    // --- Web Audio: decode both files ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    async function decode(blob) {
      const buf = await blob.arrayBuffer();
      return audioCtx.decodeAudioData(buf);
    }
    const [bufA, bufB] = await Promise.all([decode(originalBlob), decode(convertedBlob)]);
    const duration = Math.min(bufA.duration, bufB.duration);
    durLabel.textContent = duration.toFixed(2);
    seekSlider.max = duration;
  
    // --- State ---
    let isPlaying = false, isLoop = false, listenTo = 'A';
    let startTime = 0, pausedAt = 0, rafId = null;
    let currentSource = null;
  
    // Utility: create a new BufferSource for the selected audio, and start at offset
    function playSource(offset) {
      if (currentSource) { try { currentSource.stop(); } catch {} }
      const buf = listenTo === 'A' ? bufA : bufB;
      const source = audioCtx.createBufferSource();
      source.buffer = buf;
      source.loop = isLoop;
      source.loopStart = 0;
      source.loopEnd = duration;
      source.connect(audioCtx.destination);
      source.start(0, offset);
      source.onended = handleEnded;
      currentSource = source;
      startTime = audioCtx.currentTime - offset;
    }
  
    function stopSource() {
      if (currentSource) { try { currentSource.stop(); } catch {} }
      currentSource = null;
    }
  
    function getCurrentTime() {
      return isPlaying ? Math.min(audioCtx.currentTime - startTime, duration) : pausedAt;
    }
  
    function setCurrentTime(t) {
      pausedAt = Math.max(0, Math.min(duration, +t));
      if (isPlaying) {
        playSource(pausedAt);
      }
      seekSlider.value = pausedAt;
      curLabel.textContent = pausedAt.toFixed(2);
    }
  
    function updateSlider() {
      const t = getCurrentTime();
      seekSlider.value = t;
      curLabel.textContent = t.toFixed(2);
      if (t >= duration && !isLoop) {
        isPlaying = false;
        playBtn.textContent = '▶️ Play A/B';
        stopSource();
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(updateSlider);
      }
    }
  
    // --- Event Handlers ---
    playBtn.onclick = () => {
      if (!isPlaying) {
        playSource(pausedAt);
        isPlaying = true;
        playBtn.textContent = '⏸️ Pause A/B';
        rafId = requestAnimationFrame(updateSlider);
      } else {
        pausedAt = getCurrentTime();
        stopSource();
        isPlaying = false;
        playBtn.textContent = '▶️ Play A/B';
        cancelAnimationFrame(rafId);
      }
    };
  
    switchBtn.onclick = () => {
      const old = listenTo;
      listenTo = listenTo === 'A' ? 'B' : 'A';
      switchBtn.textContent = listenTo === 'A' ? 'Listen to B (Converted)' : 'Listen to A (Original)';
      switchBtn.dataset.listeningTo = listenTo;
      labelA.style.opacity = listenTo === 'A' ? '1' : '0.6';
      labelB.style.opacity = listenTo === 'B' ? '1' : '0.6';
  
      // If playing, instantly switch buffer sources at same moment!
      if (isPlaying) {
        playSource(getCurrentTime());
      }
    };
  
    loopBtn.onclick = () => {
      isLoop = !isLoop;
      loopBtn.textContent = isLoop ? '🔁 Loop On' : '🔁 Loop Off';
      loopBtn.style.backgroundColor = isLoop ? 'var(--accent-operational)' : '';
      loopBtn.style.color = isLoop ? '#111' : '';
      // If playing, need to rebuild current source to update loop property
      if (isPlaying) playSource(getCurrentTime());
    };
  
    seekSlider.oninput = e => setCurrentTime(e.target.value);
  
    function handleEnded() {
      if (!isLoop) {
        isPlaying = false;
        playBtn.textContent = '▶️ Play A/B';
        pausedAt = 0;
        stopSource();
        cancelAnimationFrame(rafId);
        setCurrentTime(0);
      }
      // Looping case handled automatically by buffer source
    }
  
    abContainer.revokeUrls = () => {
      stopSource();
      audioCtx.close();
    };
  
    return abContainer;
  };
  
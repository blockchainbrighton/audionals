// ab-player.js

/**
 * Creates an A/B comparison player UI with perfect sync, instant switching, and looping.
 * Uses Web Audio API for true, seamless switching and seeking.
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
      marginTop: '20px', border: '1px solid #666',
      padding: '15px', backgroundColor: '#333'
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
    let sourceA = null, sourceB = null, gainA = null, gainB = null;
  
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
      sourceA.connect(gainA).connect(audioCtx.destination);
      sourceB.connect(gainB).connect(audioCtx.destination);
      sourceA.loop = sourceB.loop = isLoop;
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
      if (isPlaying) setupSources(pausedAt);
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
        stopSources();
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(updateSlider);
      }
    }
  
    // --- Controls ---
    playBtn.onclick = () => {
      if (!isPlaying) {
        setupSources(pausedAt);
        isPlaying = true;
        playBtn.textContent = '⏸️ Pause A/B';
        rafId = requestAnimationFrame(updateSlider);
      } else {
        pausedAt = getCurrentTime();
        stopSources();
        isPlaying = false;
        playBtn.textContent = '▶️ Play A/B';
        cancelAnimationFrame(rafId);
      }
    };
  
    switchBtn.onclick = () => {
      listenTo = listenTo === 'A' ? 'B' : 'A';
      if (gainA && gainB) {
        gainA.gain.value = listenTo === 'A' ? 1 : 0;
        gainB.gain.value = listenTo === 'B' ? 1 : 0;
      }
      switchBtn.textContent = listenTo === 'A' ? 'Listen to B (Converted)' : 'Listen to A (Original)';
      switchBtn.dataset.listeningTo = listenTo;
      labelA.style.opacity = listenTo === 'A' ? '1' : '0.6';
      labelB.style.opacity = listenTo === 'B' ? '1' : '0.6';
    };
  
    loopBtn.onclick = () => {
      isLoop = !isLoop;
      loopBtn.textContent = isLoop ? '🔁 Loop On' : '🔁 Loop Off';
      loopBtn.style.backgroundColor = isLoop ? 'var(--accent-operational)' : '';
      loopBtn.style.color = isLoop ? '#111' : '';
      if (sourceA && sourceB) sourceA.loop = sourceB.loop = isLoop;
    };
  
    seekSlider.oninput = e => setCurrentTime(e.target.value);
  
    abContainer.revokeUrls = () => {
      stopSources();
      audioCtx.close();
    };
  
    return abContainer;
  };
  
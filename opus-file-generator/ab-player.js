// ab-player.js

const createABPlayerUI = (originalBlob, originalMimeType, convertedBlob, convertedMimeType) => {
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
        <button id="ab-switch" class="button-small" data-listening-to="original">Listen to B (Converted)</button>
        <button id="ab-loop" class="button-small" title="Enable looping (min duration: 1s)">🔁 Loop Off</button>
        <label style="margin-left:10px;display:flex;align-items:center;gap:3px;">
          <span style="font-size:0.92em;">B Offset:</span>
          <input type="number" id="ab-offset" value="250" min="0" max="2000" step="5" style="width:50px;">
          <span style="font-size:0.92em;">ms</span>
        </label>
      </div>
      <p id="labelA" style="font-weight:bold;opacity:1;">A: Original Audio</p>
      <audio id="audioA" controls preload="metadata" style="width:100%;margin-bottom:5px;"></audio>
      <p id="labelB" style="font-weight:bold;opacity:0.6;">B: Converted Audio (WebM/Opus)</p>
      <audio id="audioB" controls preload="metadata" style="width:100%;"></audio>
    `;
  
    // --- Elements ---
    const audioA = abContainer.querySelector('#audioA');
    const audioB = abContainer.querySelector('#audioB');
    const playBtn = abContainer.querySelector('#ab-play');
    const switchBtn = abContainer.querySelector('#ab-switch');
    const loopBtn = abContainer.querySelector('#ab-loop');
    const labelA = abContainer.querySelector('#labelA');
    const labelB = abContainer.querySelector('#labelB');
    const offsetInput = abContainer.querySelector('#ab-offset');
  
    // --- Setup sources and types ---
    const urlA = URL.createObjectURL(originalBlob);
    const urlB = URL.createObjectURL(convertedBlob);
    audioA.src = urlA;
    audioA.type = originalMimeType;
    audioB.src = urlB;
    audioB.type = convertedMimeType;
  
    // --- State ---
    let isLoop = false, isSeeking = false;
    // Use localStorage to persist last-used offset
    offsetInput.value = localStorage.getItem('ab_player_offset_ms') || '250';
    offsetInput.onchange = () => {
      let v = Math.max(0, Math.min(2000, parseInt(offsetInput.value) || 0));
      offsetInput.value = v;
      localStorage.setItem('ab_player_offset_ms', v);
    };
  
    // --- Helper: get offset in seconds ---
    const getOffset = () => Math.max(0, Math.min(2, parseInt(offsetInput.value) / 1000));
  
    // --- Mute state: A active, B muted at first ---
    audioA.muted = false; audioB.muted = true;
    switchBtn.dataset.listeningTo = 'original';
    switchBtn.textContent = 'Listen to B (Converted)';
    labelA.style.opacity = '1';
    labelB.style.opacity = '0.6';
  
    // --- Main Controls ---
    playBtn.onclick = () => {
      // Always tightly resync before play!
      const offset = getOffset();
      // Clamp so B never starts before 0
      audioA.currentTime = Math.max(0, audioA.currentTime);
      audioB.currentTime = Math.max(0, audioA.currentTime + offset);
      if ((audioA.ended || audioB.ended) && !isLoop) {
        audioA.currentTime = 0;
        audioB.currentTime = offset;
      }
      Promise.all([audioA.play(), audioB.play()])
        .catch(() => { playBtn.textContent = 'Error'; });
    };
  
    switchBtn.onclick = () => {
      const isOriginal = switchBtn.dataset.listeningTo === 'original';
      audioA.muted = isOriginal;
      audioB.muted = !isOriginal;
      switchBtn.textContent = isOriginal ? 'Listen to A (Original)' : 'Listen to B (Converted)';
      switchBtn.dataset.listeningTo = isOriginal ? 'converted' : 'original';
      labelA.style.opacity = isOriginal ? '0.6' : '1';
      labelB.style.opacity = isOriginal ? '1' : '0.6';
      // Sync positions when switching so they're exactly in alignment
      const offset = getOffset();
      if (!audioA.paused && !audioB.paused) {
        // If playing, sync both to the "current logical playhead"
        if (!isOriginal) {
          // Switch to B: A is at t, B should be at t+offset
          audioB.currentTime = Math.max(0, audioA.currentTime + offset);
        } else {
          // Switch to A: B is at t, A should be at t-offset (don't go negative)
          audioA.currentTime = Math.max(0, audioB.currentTime - offset);
        }
      }
    };
  
    loopBtn.onclick = () => {
      isLoop = !isLoop;
      audioA.loop = audioB.loop = isLoop;
      loopBtn.textContent = isLoop ? '🔁 Loop On' : '🔁 Loop Off';
      loopBtn.style.backgroundColor = isLoop ? 'var(--accent-operational)' : '';
      loopBtn.style.color = isLoop ? '#111' : '';
      if (isLoop && playBtn.textContent === '▶️ Play A/B' && (audioA.ended || audioB.ended)) {
        const offset = getOffset();
        audioA.currentTime = 0; audioB.currentTime = offset;
      }
    };
  
    // --- Play/Pause/Ended Sync ---
    const syncBtn = () =>
      playBtn.textContent = (audioA.paused && audioB.paused) ? '▶️ Play A/B' : '⏸️ Pause A/B';
  
    [audioA, audioB].forEach(audio => {
      audio.onplay = () => {
        const other = audio === audioA ? audioB : audioA;
        const offset = getOffset();
        if (other.paused) {
          if (audio === audioA) other.currentTime = Math.max(0, audio.currentTime + offset);
          else other.currentTime = Math.max(0, audio.currentTime - offset);
          other.play().catch(() => {});
        }
        syncBtn();
      };
      audio.onpause = () => {
        const other = audio === audioA ? audioB : audioA;
        if (!other.paused) other.pause();
        syncBtn();
      };
      audio.onended = () => {
        const other = audio === audioA ? audioB : audioA;
        if (!audio.paused) audio.pause();
        if (!other.paused && other.duration - other.currentTime < 0.5) other.pause();
        syncBtn();
        if (isLoop) {
          const offset = getOffset();
          const d = Math.min(audioA.duration, audioB.duration);
          if (d >= 1.0) {
            audioA.currentTime = 0;
            audioB.currentTime = offset;
            setTimeout(() => {
              if (playBtn.textContent !== '⏸️ Pause A/B')
                Promise.all([audioA.play(), audioB.play()]).catch(() => {});
            }, 50);
          } else {
            audioA.currentTime = 0;
            audioB.currentTime = offset;
          }
        } else {
          audioA.currentTime = 0;
          audioB.currentTime = getOffset();
        }
      };
    });
  
    // --- Seek sync with offset ---
    const syncSeek = (src, tgt, srcIsA) => {
      const offset = getOffset();
      if (!isSeeking && Math.abs((src.currentTime + (srcIsA ? offset : -offset)) - tgt.currentTime) > 0.15) {
        isSeeking = true;
        if (srcIsA) tgt.currentTime = Math.max(0, src.currentTime + offset);
        else tgt.currentTime = Math.max(0, src.currentTime - offset);
        setTimeout(() => {
          isSeeking = false;
          if (playBtn.textContent === '⏸️ Pause A/B') {
            if (src.paused) src.play().catch(()=>{});
            if (tgt.paused) tgt.play().catch(()=>{});
          }
        }, 50);
      } else if (isSeeking) {
        setTimeout(() => isSeeking = false, 100);
      }
    };
    audioA.addEventListener('seeked', () => syncSeek(audioA, audioB, true));
    audioB.addEventListener('seeked', () => syncSeek(audioB, audioA, false));
  
    // --- Cleanup ---
    const observer = new MutationObserver(list =>
      list.forEach(m =>
        m.removedNodes && m.removedNodes.forEach(n => {
          if (n === abContainer) {
            URL.revokeObjectURL(urlA);
            URL.revokeObjectURL(urlB);
            observer.disconnect();
          }
        })
      )
    );
    observer.observe(document.body, { childList: true, subtree: true });
  
    abContainer.revokeUrls = () => {
      URL.revokeObjectURL(urlA);
      URL.revokeObjectURL(urlB);
      audioA.src = '';
      audioB.src = '';
      observer.disconnect();
    };
  
    return abContainer;
  };
  
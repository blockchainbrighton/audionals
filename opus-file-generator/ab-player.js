// ab-player.js

window.AB_PLAYER_VERSION = '1.01';
console.log('[A/B Player] Loading AB Player Version 1.01');


/**
 * Creates an A/B comparison player UI with tight sync and looping.
 * @param {Blob} originalBlob
 * @param {string} originalMimeType
 * @param {Blob} convertedBlob
 * @param {string} convertedMimeType
 * @returns {HTMLElement}
 */
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

  // --- Setup sources and types ---
  const urlA = URL.createObjectURL(originalBlob);
  const urlB = URL.createObjectURL(convertedBlob);
  audioA.src = urlA;
  audioA.type = originalMimeType;
  audioB.src = urlB;
  audioB.type = convertedMimeType;

  // --- State ---
  let isLoop = false;
  let isSeeking = false;

  // --- Controls ---
  playBtn.onclick = () => {
    if (audioA.paused && audioB.paused) {
      if ((audioA.ended || audioB.ended) && !isLoop) {
        audioA.currentTime = 0;
        audioB.currentTime = 0;
      }
      Promise.all([audioA.play(), audioB.play()])
        .catch(() => { playBtn.textContent = 'Error'; });
    } else {
      audioA.pause(); audioB.pause();
    }
  };

  switchBtn.onclick = () => {
    const isOriginal = switchBtn.dataset.listeningTo === 'original';
    audioA.muted = isOriginal;
    audioB.muted = !isOriginal;
    switchBtn.textContent = isOriginal ? 'Listen to A (Original)' : 'Listen to B (Converted)';
    switchBtn.dataset.listeningTo = isOriginal ? 'converted' : 'original';
    labelA.style.opacity = isOriginal ? '0.6' : '1';
    labelB.style.opacity = isOriginal ? '1' : '0.6';
  };

  loopBtn.onclick = () => {
    isLoop = !isLoop;
    audioA.loop = audioB.loop = isLoop;
    loopBtn.textContent = isLoop ? '🔁 Loop On' : '🔁 Loop Off';
    loopBtn.style.backgroundColor = isLoop ? 'var(--accent-operational)' : '';
    loopBtn.style.color = isLoop ? '#111' : '';
    if (isLoop && playBtn.textContent === '▶️ Play A/B' && (audioA.ended || audioB.ended)) {
      audioA.currentTime = 0; audioB.currentTime = 0;
    }
  };

  // --- Play/Pause/Ended Sync ---
  const syncBtn = () =>
    playBtn.textContent = (audioA.paused && audioB.paused) ? '▶️ Play A/B' : '⏸️ Pause A/B';

  [audioA, audioB].forEach(audio => {
    audio.onplay = () => {
      const other = audio === audioA ? audioB : audioA;
      if (other.paused) {
        if (Math.abs(audio.currentTime - other.currentTime) > 0.2)
          other.currentTime = audio.currentTime;
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
        const d = Math.min(audioA.duration, audioB.duration);
        if (d >= 1.0) {
          audioA.currentTime = audioB.currentTime = 0;
          setTimeout(() => {
            if (playBtn.textContent !== '⏸️ Pause A/B')
              Promise.all([audioA.play(), audioB.play()]).catch(() => {});
          }, 50);
        } else {
          audioA.currentTime = audioB.currentTime = 0;
        }
      } else {
        audioA.currentTime = audioB.currentTime = 0;
      }
    };
  });

  // --- Seek sync ---
  const syncSeek = (src, tgt) => {
    if (!isSeeking && Math.abs(src.currentTime - tgt.currentTime) > 0.2) {
      isSeeking = true;
      tgt.currentTime = src.currentTime;
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
  audioA.addEventListener('seeked', () => syncSeek(audioA, audioB));
  audioB.addEventListener('seeked', () => syncSeek(audioB, audioA));

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

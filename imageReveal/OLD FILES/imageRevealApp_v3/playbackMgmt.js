// playbackMgmt.js  (synced with imageRevealCore)
(() => {
    /* ---------- DOM ---------- */
    const btn = document.getElementById('playBtn'),
          lg  = document.getElementById('log'),
          AC  = window.AudioContext || window.webkitAudioContext;
  
    const log = msg => {
      if (!lg) return;
      lg.textContent += `${new Date().toLocaleTimeString()}: ${msg}\n`;
      lg.scrollTop = lg.scrollHeight;
    };
  
    if (!AC) { btn.textContent = 'Audio not supported'; btn.disabled = true; return; }
  
    /* ---------- State ---------- */
    let ctx        = new AC();                    // single AudioContext
    let buffers    = Array(audioParts.length);
    let partIdx    = 0;
    let activeSrc  = null;
    let loading    = true;
    let playing    = false;
  
    /* ---------- UI helper ---------- */
    const setBtn = () => {
      btn.disabled = loading;
      btn.textContent = loading
        ? 'Loading…'
        : (playing ? 'Stop Mix' : 'Play Mix');
    };
  
    /* ---------- Pre‑load ---------- */
    (async () => {
      try {
        log(`Fetching first part → ${audioParts[0]}`);
        const firstAB   = await (await fetch(audioParts[0])).arrayBuffer();
        buffers[0]      = await ctx.decodeAudioData(firstAB);
        loading         = false; setBtn();
        log(`First part ready (${buffers[0].duration.toFixed(2)} s).`);
  
        await Promise.all(
          audioParts.slice(1).map(async (url, i) => {
            const ab   = await (await fetch(url)).arrayBuffer();
            buffers[i + 1] = await ctx.decodeAudioData(ab);
            log(`Decoded part ${i + 2}/${audioParts.length}`);
          })
        );
        log('All parts decoded. ✅');
      } catch (e) {
        loading = false; setBtn();
        log(`Preload failed: ${e.message}`);
      }
    })();
  
    /* ---------- Playback helpers ---------- */
    const playPart = () => {
      if (!playing) return;
      if (partIdx >= buffers.length) { playing = false; setBtn(); log('Finished. 🎉'); dispatchStopped(); return; }
  
      const buf = buffers[partIdx];
      if (!buf) { setTimeout(playPart, 200); return; }
  
      activeSrc = ctx.createBufferSource();
      activeSrc.buffer = buf;
      activeSrc.connect(ctx.destination);
      activeSrc.start();
      log(`▶ Part ${partIdx + 1}/${buffers.length} (${buf.duration.toFixed(2)} s)`);
      partIdx++;
  
      activeSrc.onended = () => { activeSrc = null; if (playing) playPart(); };
    };
  
    const dispatchStarted  = () => document.dispatchEvent(new Event('playbackStarted'));
    const dispatchStopped  = () => document.dispatchEvent(new Event('playbackStopped'));
  
    const start = async () => {
      if (loading || playing) return;
      await ctx.resume();
      playing  = true; partIdx = 0; setBtn(); dispatchStarted(); playPart();
    };
  
    const stop = () => {
      if (!playing) return;
      playing = false;
      if (activeSrc) { try { activeSrc.stop(); } catch {} }
      activeSrc = null;
      log('Stopped by user.');
      setBtn();
      dispatchStopped();
    };
  
    /* ---------- Button & external toggle ---------- */
    btn.onclick = () => (playing ? stop() : start());
  
    // Allow other modules (e.g. clicking the image) to toggle playback
    document.addEventListener('togglePlayback', () => (playing ? stop() : start()));
  })();
  
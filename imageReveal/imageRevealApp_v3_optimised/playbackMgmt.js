// playbackMgmt.js  (synced with imageRevealCore)
(() => {
    /* ---------- DOM ---------- */
    const btn = document.getElementById('playBtn'),
          lg  = document.getElementById('log'),
          AC  = window.AudioContext || window.webkitAudioContext,
          clickToBeginText = document.getElementById('clickToBeginText'); // <-- NEW

    const log = msg => {
      if (!lg) return;
      lg.textContent += `${new Date().toLocaleTimeString()}: ${msg}\n`;
      lg.scrollTop = lg.scrollHeight;
    };

    if (!AC) { btn.textContent = 'Audio not supported'; btn.disabled = true; return; }
    if (!clickToBeginText) { console.warn('"Click to Begin" text element not found.'); } // <-- NEW: Graceful degradation

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

    /* ---------- "Click to Begin" Text Visibility NEW ---------- */
    const showStartupText = () => {
        if (clickToBeginText) clickToBeginText.classList.remove('hidden');
    };
    const hideStartupText = () => {
        if (clickToBeginText) clickToBeginText.classList.add('hidden');
    };
    // Initially, the text should be visible (CSS default, no 'hidden' class)
    // If for some reason it starts hidden, uncomment:
    // if (clickToBeginText) showStartupText();
    /* --------------------------------------------------------- */

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
      if (!playing) return; // Should not happen if called correctly, but good guard
      if (partIdx >= buffers.length) {
        playing = false;
        setBtn();
        log('Finished. 🎉');
        dispatchStopped(); // This will trigger showStartupText via event listener
        return;
      }

      const buf = buffers[partIdx];
      if (!buf) { // If a part is not yet decoded (should be rare with current preload logic)
        log(`Part ${partIdx + 1} buffer not ready, retrying...`);
        setTimeout(playPart, 200);
        return;
      }

      activeSrc = ctx.createBufferSource();
      activeSrc.buffer = buf;
      activeSrc.connect(ctx.destination);
      activeSrc.start();
      log(`▶ Part ${partIdx + 1}/${buffers.length} (${buf.duration.toFixed(2)} s)`);
      partIdx++;

      activeSrc.onended = () => {
        activeSrc = null;
        if (playing) { // Only continue if still in 'playing' state
            playPart();
        } else {
            // If playing became false (e.g. user clicked stop during a part's playback)
            // dispatchStopped() would have already been called by stop().
            // If it reached here because playing was false and it wasn't the end of song,
            // it means stop() was called.
        }
      };
    };

    const dispatchStarted  = () => document.dispatchEvent(new Event('playbackStarted'));
    const dispatchStopped  = () => document.dispatchEvent(new Event('playbackStopped'));

    const start = async () => {
      if (loading || playing) return;
      if (ctx.state === 'suspended') { // Ensure context is running
        await ctx.resume();
      }
      playing  = true;
      partIdx = 0;
      setBtn();
      dispatchStarted(); // This will trigger hideStartupText via event listener
      playPart();
    };

    const stop = () => {
      if (!playing) return;
      playing = false;
      if (activeSrc) {
        try {
          activeSrc.onended = null; // Prevent onended from re-triggering playPart
          activeSrc.stop();
        } catch (e) {
          log(`Error stopping active source: ${e.message}`);
        }
      }
      activeSrc = null;
      log('Stopped by user.');
      setBtn();
      dispatchStopped(); // This will trigger showStartupText via event listener
    };

    /* ---------- Button & external toggle ---------- */
    btn.onclick = () => (playing ? stop() : start());

    // Allow other modules (e.g. clicking the image) to toggle playback
    document.addEventListener('togglePlayback', () => (playing ? stop() : start()));

    /* ---------- Event Listeners for Text Visibility - NEW ---------- */
    document.addEventListener('playbackStarted', hideStartupText);
    document.addEventListener('playbackStopped', showStartupText);
    /* -------------------------------------------------------------- */

  })();
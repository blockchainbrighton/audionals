// playbackMgmt.js
(() => {
    // ---------- DOM ----------
    const btn = document.getElementById('playBtn'),
          lg  = document.getElementById('log'),
          AC  = window.AudioContext || window.webkitAudioContext;
  
    const log = msg => {
      if (!lg) return;
      lg.textContent += `${new Date().toLocaleTimeString()}: ${msg}\n`;
      lg.scrollTop = lg.scrollHeight;
    };
  
    if (!AC) { btn.textContent = 'Audio not supported'; btn.disabled = true; return; }
  
    // ---------- State ----------
    let ctx        = new AC();                    // single AudioContext
    let buffers    = Array(audioParts.length);    // placeholder array
    let partIdx    = 0;                           // which part should play next
    let activeSrc  = null;                        // current BufferSource
    let loading    = true;                        // still fetching/decoding?
    let playing    = false;                       // are we in playback mode?
  
    // ---------- UI helper ----------
    const setBtn = () => {
        // Disable **only** during the initial fetch / decode phase.
        // Even if the first buffer isn’t scheduled yet we still want a responsive “Stop”.
        btn.disabled = loading;
    
        btn.textContent = loading
        ? 'Loading…'
        : (playing ? 'Stop Mix' : 'Play Mix');
    };
  
    // ---------- Preload ----------
    (async () => {
      try {
        // 1) Fetch + decode FIRST part for instant start
        log(`Fetching first part → ${audioParts[0]}`);
        const firstAB   = await (await fetch(audioParts[0])).arrayBuffer();
        buffers[0]      = await ctx.decodeAudioData(firstAB);
        loading         = false;
        log(`First part ready (${buffers[0].duration.toFixed(2)} s).`);
        setBtn();                       // ▶ button goes live here
  
        // 2) Decode REMAINING parts silently in the background
        await Promise.all(
          audioParts.slice(1).map(async (url, i) => {
            const ab   = await (await fetch(url)).arrayBuffer();
            buffers[i + 1] = await ctx.decodeAudioData(ab);
            log(`Decoded part ${i + 2}/${audioParts.length}`);
          })
        );
        log('All parts decoded. ✅');
      } catch (e) {
        loading = false;
        log(`Preload failed: ${e.message}`);
        setBtn();
      }
    })();
  
    // ---------- Playback helpers ----------
    const playPart = () => {
        if (!playing) return;                       // user hit Stop while waiting
      
        if (partIdx >= buffers.length) {            // finished
          playing = false; setBtn(); log('Finished. 🎉'); return;
        }
      
        const buf = buffers[partIdx];
        if (!buf) {                                 // not decoded yet
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
          if (playing) playPart();                  // queue next if still playing
        };
      };
      
  
    const start = async () => {
      if (loading || playing) return;
      await ctx.resume();               // resume if user gesture required
      playing  = true;
      partIdx  = 0;
      setBtn();
      playPart();
    };
  
    const stop = () => {
      if (!playing) return;
      playing = false;
      if (activeSrc) { try { activeSrc.stop(); } catch {} }
      activeSrc = null;
      log('Stopped by user.');
      setBtn();
    };
  
    // ---------- Button handler ----------
    btn.onclick = () => (playing ? stop() : start());
  })();
  
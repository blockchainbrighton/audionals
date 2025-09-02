// osc-audio.js

/**
 * =============================================================================
 * osc-audio.js — Tone.js chain manager + canvas bridge
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Encapsulates all audio graph setup/teardown for the app using Tone.js and
 * coordinates the <scope-canvas> visual via `_setCanvas`. Manages a dedicated
 * "hum" chain and per-shape synth chains, swaps the active output to the
 * destination, and mirrors analyser nodes into the canvas for live visuals.
 *
 * HIGH-LEVEL FLOW
 * ---------------
 * • On first unlock, constructs the hum chain, routes it to destination, and
 *   pre-buffers all shape chains in the background.
 * • Tracks `contextUnlocked`, `initialBufferingStarted`, `initialShapeBuffered`,
 *   `isPlaying`, `current`, and a `chains` map in `app.state`.
 * • Reflects playback/mute/shape changes to:
 *   - Tone.Destination.mute (toggle)
 *   - <scope-canvas> props (analyser, preset/shapeKey, mode, isPlaying)
 *   - UI controls via `app._updateControls` and `app._loader` text.
 *
 * PUBLIC METHODS (called as Audio(app).method(...))
 * -------------------------------------------------
 * • bufferHumChain(): (re)creates the low-volume sine hum chain:
 *     Oscillator(A0 sine) → Volume(-25dB) → Filter(80Hz lowpass, Q=0.5)
 *     → Freeverb(wet=0.3, roomSize=0.9) → (optionally) analyser. Stores in
 *     `chains[app.humKey]`. Disposes any stale chain first.
 *
 * • bufferShapeChain(shape): builds a synth chain from preset `app.state.presets[shape]`:
 *     Osc1 (type/freq from pr.osc1), optional Osc2 (pr.osc2),
 *     LFO(...pr.lfo) → filter.frequency (+ Osc2.detune)
 *     Osc* → Volume(5) → Filter(pr.filter, Q=pr.filterQ) → Freeverb(pr.reverb)
 *     → analyser. Stored in `chains[shape]`. Hum key delegates to bufferHumChain.
 *
 * • setActiveChain(shape):
 *     - Disconnects all chains’ reverbs from destination, then sends the chosen
 *       chain to destination, sets `state.current`, and syncs canvas:
 *       { analyser?, isAudioStarted:true, isPlaying:state.isPlaying }.
 *       If `hum`, also sets { shapeKey: humKey, preset:null }.
 *
 * • disposeAllChains(): disposes all Tone nodes and clears the `chains` map.
 *
 * • resetState():
 *     - Hard stop: disposes chains, stops sequence & audio signatures, rebuilds
 *       default state with same seed & Tone instance, reloads presets, buffers
 *       hum, sets canvas to seed mode on a randomly chosen first shape, and
 *       resets UI/sequencer visibility/arrays.
 *
 * • unlockAudioAndBufferInitial():
 *     - Resumes AudioContext (Tone.getContext()/Tone.context or Tone.start()).
 *     - Buffers hum, activates it, marks state ready/playing, wires canvas,
 *       then pre-buffers all shapes (yielding with `_sleep(0)` between). 
 *       Updates status messages throughout. Idempotent guards included.
 *
 * • stopAudioAndDraw():
 *     - Stops playback, disposes chains, halts sequencer/signatures, turns off
 *       canvas live flags, and calls resetState().
 *
 * • _onStartRequest(): convenience to call unlockAudioAndBufferInitial().
 *
 * • _onMuteToggle():
 *     - Flips Tone.Destination.mute, updates controls/loader, and ensures the
 *       canvas reflects `isPlaying && !mute`.
 *
 * • _onShapeChange(e):
 *     - Accepts { detail: { shapeKey } }, updates current/preset, nudges canvas
 *       (seed/live based on unlock/buffer state), and, if fully ready, switches
 *       the active chain. Also updates UI controls.
 *
 * STATE & COORDINATION NOTES
 * --------------------------
 * • Canvas bridge: `_setCanvas({ analyser?, preset?, shapeKey?, mode?, isAudioStarted?, isPlaying? })`
 *   is the single source of truth for the visual. Live analyser is attached
 *   only when available.
 * • Preset loading and first-shape seeding occur in `resetState()`. The canvas
 *   starts in seed mode until the context is unlocked and a live chain is active.
 * • Prebuffer loop: shapes are buffered sequentially after hum; break if the
 *   context becomes locked again.
 *
 * ERROR HANDLING
 * --------------
 * • Each buffer method is wrapped in try/catch; on failure the chain entry is
 *   deleted and an error logged. Unlock errors reset all ready flags.
 *
 * GOTCHAS / BEST PRACTICES
 * ------------------------
 * • Always dispose stale chains before re-creating them to avoid orphan nodes.
 * • When switching shapes, ensure UI + canvas are updated even if audio isn’t
 *   live yet; visuals should still reflect seed mode.
 * • Respect `state.isPlaying` vs mute: canvas `isPlaying` should be false when
 *   muted, even if transport is technically running.
 * • The “hum” chain is special-cased: preset is null and shapeKey is `humKey`.
 *
 * =============================================================================
 * DEVELOPER QUICK REFERENCE
 * =============================================================================
 * // Unlock & warm start
 * await app.audio._onStartRequest?.(); // internally calls unlockAudioAndBufferInitial()
 *
 * // Build or rebuild chains
 * await app.audio.bufferHumChain();
 * await app.audio.bufferShapeChain('circle'); // uses presets[circle]
 *
 * // Switch active output
 * app.audio.setActiveChain(app.humKey);   // route hum to destination
 * app.audio.setActiveChain('circle');     // route shape to destination
 *
 * // Mute/unmute
 * app.audio._onMuteToggle();
 *
 * // Stop everything and reset visuals
 * app.audio.stopAudioAndDraw();
 *
 * // React to a UI shape change
 * app.audio._onShapeChange({ detail: { shapeKey: 'butterfly' } });
 *
 * // Internals used:
 * // - app.state: { Tone, chains, isPlaying, contextUnlocked, ... }
 * // - app._setCanvas, app._updateControls, app._loader, app._rng, app._sleep
 */

export function Audio(app) {
  return {
    async bufferHumChain() {
      const { Tone, chains } = app.state;
      if (!Tone) return;
      if (chains[app.humKey]) { app._disposeChain(chains[app.humKey]); delete chains[app.humKey]; }

      try {
        const osc = new Tone.Oscillator('A0', 'sine').start();
        const filter = new Tone.Filter(80, 'lowpass'); filter.Q.value = 0.5;
        const volume = new Tone.Volume(-25);
        const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
        const analyser = app._createAnalyser(Tone);

        osc.connect(volume); volume.connect(filter); filter.connect(reverb); if (analyser) filter.connect(analyser);

        chains[app.humKey] = { osc, volume, filter, reverb, analyser };
      } catch (e) {
        console.error('Error buffering hum chain', e);
        delete chains[app.humKey];
      }
    },

    async bufferShapeChain(shape) {
      if (shape === app.humKey) return app.bufferHumChain();
      const { Tone, presets, chains } = app.state, pr = presets[shape];
      if (!pr || !Tone) return;
      if (chains[shape]) { app._disposeChain(chains[shape]); delete chains[shape]; }

      try {
        const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
        const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
        const volume = new Tone.Volume(5);
        const filter = new Tone.Filter(pr.filter, 'lowpass'); filter.Q.value = pr.filterQ;
        const lfo = new Tone.LFO(...pr.lfo).start();
        const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
        const analyser = app._createAnalyser(Tone);

        lfo.connect(filter.frequency);
        if (osc2) lfo.connect(osc2.detune);

        osc1.connect(volume);
        osc2?.connect(volume);
        volume.connect(filter);
        filter.connect(reverb);
        if (analyser) filter.connect(analyser);

        chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
      } catch (e) {
        console.error('Error buffering chain for shape', shape, e);
        delete chains[shape];
      }
    },

    // --- Minimal change: micro-fade around disconnect/connect to avoid clicks
    setActiveChain(shape) {
      const { Tone, chains, current } = app.state;
      const dur = 0.008; // 8 ms is enough to kill clicks, inaudible to users

      // 1) Fade out the *current* chain's reverb wet to 0 very quickly
      const prev = current ? chains[current] : null;
      if (prev?.reverb?.wet?.rampTo) {
        try { prev.reverb.wet.rampTo(0, dur); } catch {}
      }

      // 2) After the tiny fade, perform your existing switch, then fade the new one in
      const doSwitch = () => {
        // original behavior: hard switch routing
        app._eachChain(chain => chain.reverb?.disconnect());
        const next = chains[shape];
        next?.reverb?.toDestination();

        // Canvas/analyser updates (unchanged)
        if (next?.analyser) {
          app._setCanvas({ analyser: next.analyser, isAudioStarted: true, isPlaying: app.state.isPlaying });
        } else {
          app._setCanvas({ isAudioStarted: true, isPlaying: app.state.isPlaying });
        }
        if (shape === app.humKey) app._setCanvas({ shapeKey: app.humKey, preset: null });

        // 3) Fade in the *new* chain's reverb wet from 0 to its current value
        if (next?.reverb?.wet) {
          try {
            const target = next.reverb.wet.value ?? 0.3; // use its configured wet as the target
            if (typeof next.reverb.wet.setValueAtTime === 'function') {
              next.reverb.wet.setValueAtTime(0, Tone?.now?.() ?? 0);
            } else {
              next.reverb.wet.value = 0;
            }
            if (next.reverb.wet.rampTo) next.reverb.wet.rampTo(target, dur);
            else next.reverb.wet.value = target;
          } catch {}
        }

        app.state.current = shape;
      };

      // Use a short timeout ~ dur to keep it simple and avoid Transport dependencies
      const ms = Math.max(1, Math.floor(dur * 1000));
      setTimeout(doSwitch, ms);
    },

    disposeAllChains() {
      app._eachChain(chain => app._disposeChain(chain));
      app.state.chains = {};
      app.state.current = null;
    },

    resetState() {
      app.disposeAllChains();
      if (app.state.sequencePlaying) app.stopSequence();
      if (app.state.audioSignaturePlaying) app.stopAudioSignature();

      const { seed, Tone } = app.state;
      app.state = app.defaultState(seed);
      app.state.Tone = Tone;

      app.loadPresets(seed);
      app.bufferHumChain();

      const rand = app._rng(seed);
      const firstShape = app.shapes[(rand() * app.shapes.length) | 0];
      app._setCanvas({
        preset: app.state.presets[firstShape],
        shapeKey: firstShape,
        mode: 'seed',
        isAudioStarted: false,
        isPlaying: false
      });
      app.state.current = app.humKey;

      app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: app.humKey });

      app.state.isSequencerMode = false;
      app._sequencerComponent.style.display = 'none';
      app._main.style.overflow = 'hidden';

      app.state.sequence = Array(8).fill(null);
      app.updateSequencerState();
    },

    async unlockAudioAndBufferInitial() {
      const s = app.state;

      if (s.initialBufferingStarted && !s.initialShapeBuffered) {
        app._loader.textContent = 'Still preparing initial synth, please wait...';
        return;
      }
      if (s.isPlaying) return app.stopAudioAndDraw();

      if (s.contextUnlocked) {
        if (s.initialShapeBuffered) {
          app.setActiveChain(app.humKey);
          s.isPlaying = true;
          app._updateControls({ isAudioStarted: true, isPlaying: true });
          app._loader.textContent = 'Audio resumed (hum).';
          app._canvas.isPlaying = true;
          return;
        }
        app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.';
        return;
      }

      app._loader.textContent = 'Unlocking AudioContext...';
      try {
        const Tone = s.Tone;
        if (!Tone) throw new Error('Tone.js not available');

        const contextToResume = Tone.getContext?.() || Tone.context;
        let contextResumed = false;
        if (contextToResume?.resume) { await contextToResume.resume(); contextResumed = true; }
        else if (Tone.start) { await Tone.start(); contextResumed = true; }
        if (!contextResumed) throw new Error('Could not resume AudioContext');

        s.contextUnlocked = true;
        s.initialBufferingStarted = true;
        app._loader.textContent = `Preparing ${app.humLabel} synth...`;

        await app.bufferHumChain();
        app.setActiveChain(app.humKey);
        s.initialShapeBuffered = true;
        s.isPlaying = true;
        app._canvas.isPlaying = true;

        app._updateControls({ isAudioStarted: true, isPlaying: true });
        app._loader.textContent = 'Ready. Audio: ' + app.humLabel;

        // Pre-buffer shapes
        for (const shape of app.shapes) {
          if (!s.contextUnlocked) break;
          try { await app.bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); }
          await app._sleep(0);
        }
      } catch (e) {
        console.error('Failed to unlock AudioContext:', e);
        app._loader.textContent = 'Failed to unlock AudioContext.';
        s.contextUnlocked = false;
        s.initialBufferingStarted = false;
        s.initialShapeBuffered = false;
      }
    },

    stopAudioAndDraw() {
      const s = app.state;
      if (!s.isPlaying && !s.initialBufferingStarted) return;

      s.isPlaying = false;
      s.initialBufferingStarted = false;
      s.initialShapeBuffered = false;

      app.disposeAllChains();
      if (s.sequencePlaying) app.stopSequence();
      if (s.audioSignaturePlaying) app.stopAudioSignature();

      app._canvas.isPlaying = false;
      app._canvas.isAudioStarted = false;

      app.resetState();
    },

    _onStartRequest() { app.unlockAudioAndBufferInitial(); },

    _onMuteToggle() {
      const s = app.state;
      if (!s.Tone || !s.contextUnlocked) return;
      const mute = (s.Tone.Destination.mute = !s.Tone.Destination.mute);
      app._updateControls({ isMuted: mute });
      app._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
      app._canvas.isPlaying = s.isPlaying && !mute;
    },

    _onShapeChange(e) {
      const shapeKey = e?.detail?.shapeKey;
      if (!shapeKey) return;

      const s = app.state;
      s.current = shapeKey;

      if (shapeKey === app.humKey) {
        app._setCanvas({ shapeKey: app.humKey, preset: null });
      } else if (app.shapes.includes(shapeKey)) {
        app._setCanvas({ shapeKey, preset: s.presets[shapeKey] });
      }

      if (s.contextUnlocked && s.initialShapeBuffered) app.setActiveChain(shapeKey);
      app._canvas.mode = (s.contextUnlocked && s.initialShapeBuffered) ? (s.isPlaying ? 'live' : 'seed') : 'seed';

      app._updateControls({ shapeKey });
    },
  };
}
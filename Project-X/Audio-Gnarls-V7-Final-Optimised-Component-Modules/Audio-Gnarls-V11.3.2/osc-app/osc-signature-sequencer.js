// osc-signature-sequencer.js

/**
 * =============================================================================
 * osc-signature-sequencer.js — Signature generation + Sequencer bridge
 * =============================================================================
 *
 * PURPOSE
 * -------
 * Orchestrates two related modes:
 *  1) “Audio Signature” playback: deterministic, seed-based sequences that
 *     switch shapes automatically using one of several algorithms. (play/stop,
 *     loop, algorithm mapping) :contentReference[oaicite:22]{index=22}
 *  2) Bridge to the 8-step UI sequencer (<seq-app>): subscribes to its events,
 *     keeps app.state in sync, and (optionally) runs “Signature Sequencer Mode”
 *     where each step triggers a full audio signature pass instead of a fixed
 *     dwell time. :contentReference[oaicite:23]{index=23}
 *
 * GLOBAL TOGGLES
 * --------------
 * • _onToggleSequencer():
 *     - Shows/hides the sequencer UI, changes main overflow and caps canvas
 *       height to ~60vh when enabled. Resets recording and stops any running
 *       sequence/signature when disabling. Updates controls. :contentReference[oaicite:24]{index=24}
 *
 * • _onLoopToggle(): flips `state.isLoopEnabled` and updates UI message. :contentReference[oaicite:25]{index=25}
 *
 * • _onSignatureModeToggle():
 *     - Toggles `state.isSequenceSignatureMode`. If currently sequencing, stops
 *       transport(s) and informs the user that step playback will now dispatch
 *       full signatures per step (or revert). :contentReference[oaicite:26]{index=26}
 *
 * AUDIO SIGNATURES
 * ----------------
 * • _getUniqueAlgorithmMapping(seed):
 *     - Deterministically shuffles algorithm ids [1..10] and maps them across
 *       `[humKey, ...shapes]`, so each shape has a repeatable algorithm pick. :contentReference[oaicite:27]{index=27}
 *
 * • generateAudioSignature(seed, algorithm=1):
 *     - Produces a 32-step array of shape indices (0=hum, 1..N=shape index) or
 *       nulls (silence), using 10 distinct algorithm families (uniform random,
 *       constrained palettes/repeats, patterns, walks, clusters, sparsity,
 *       Fibonacci skips, alternating pairs, decays, bar-based changes). 
 *       A constrained generator is also exposed as `_generateSignatureWithConstraints`. :contentReference[oaicite:28]{index=28}
 *
 * • playAudioSignature(sequence, algorithm, { loop=false, onComplete }):
 *     - Chooses a step time by algorithm (e.g., 100ms for alg 3/7, 125ms default),
 *       iterates the sequence, and on each non-null step switches the app’s
 *       active shape via `_onShapeChange`. On completion: loops (if requested),
 *       or returns to `humKey` then fires completion once. State flags:
 *       `audioSignaturePlaying`, `audioSignatureStepIndex`, `audioSignatureTimer`. :contentReference[oaicite:29]{index=29}
 *
 * • stopAudioSignature(): clears timer and resets flags. :contentReference[oaicite:30]{index=30}
 *
 * UI ENTRYPOINT
 * -------------
 * • _onAudioSignature():
 *     - Guarded by `contextUnlocked` and `initialShapeBuffered`, stops any
 *       running sequencer, computes algorithm from the per-shape mapping, then
 *       calls `playAudioSignature` with loop honoring `isLoopEnabled`. :contentReference[oaicite:31]{index=31}
 *
 * SEQUENCER BRIDGE (events from <seq-app>)
 * ----------------------------------------
 * • _onSeqRecordStart({ detail: { slotIndex } }): sets recording flags. :contentReference[oaicite:32]{index=32}
 * • _onSeqStepCleared({ detail: { slotIndex } }): clears value and advances
 *   record slot when applicable. :contentReference[oaicite:33]{index=33}
 * • _onSeqStepRecorded({ detail: { slotIndex, value, nextSlot, isRecording } }):
 *   writes value and moves the record cursor. :contentReference[oaicite:34]{index=34}
 * • _onSeqPlayStarted({ detail: { stepTime } }):
 *   sets flags, stores stepTime, and if Signature Mode is ON, stops the 8-step
 *   timer and starts `_startSignatureSequencer()`. :contentReference[oaicite:35]{index=35}
 * • _onSeqPlayStopped(): clears flags; stops signature sequencer if running. :contentReference[oaicite:36]{index=36}
 * • _onSeqStepAdvance({ detail: { stepIndex|index, value } }):
 *   - Normal Mode: advances UI state, handles loop stop when wrapping (if loop
 *     disabled), and switches current shape based on the step’s numeric value
 *     (0→hum, 1..N→shape). Signature Mode: this handler is ignored. :contentReference[oaicite:37]{index=37}
 * • _onSeqStepTimeChanged({ detail: { stepTime } }): updates state. :contentReference[oaicite:38]{index=38}
 *
 * SIGNATURE SEQUENCER MODE (per-step full signatures)
 * ---------------------------------------------------
 * • _startSignatureSequencer():
 *     - For each non-null step value, pick that step’s shape, resolve its
 *       algorithm via the mapping, generate an audio signature, play it to
 *       completion (awaiting via onComplete), then brief sleep before next
 *       step. If `isLoopEnabled` and the 8-step transport is still "playing",
 *       repeat passes; otherwise stop and sync the UI. State flag:
 *       `signatureSequencerRunning`. :contentReference[oaicite:39]{index=39}
 *
 * • _stopSignatureSequencer(): stops signature playback, resets sequencing
 *   state, and refreshes the UI. :contentReference[oaicite:40]{index=40}
 *
 * STATE MIRRORING TO <seq-app>
 * ----------------------------
 * • updateSequencerState(): pushes app.state props into the child component
 *   via its `updateState` API (recording flags, sequence array, play flags,
 *   active index, stepTime, loop flags, signature-mode flag). :contentReference[oaicite:41]{index=41}
 * • Proxies: recordStep(number), playSequence(), stopSequence() delegate to the
 *   child, while also ensuring signature/audio signature engines are halted
 *   and state is consistent. :contentReference[oaicite:42]{index=42}
 *
 * GOTCHAS / BEST PRACTICES
 * ------------------------
 * • Only one engine at a time: when starting audio signatures, stop the 8-step
 *   sequencer; when starting Signature Mode, stop the 8-step timer first. :contentReference[oaicite:43]{index=43}
 * • Loop semantics differ:
 *   - Normal 8-step mode uses `isLoopEnabled` to allow wrap at step 0; if false,
 *     it stops when the first wrap would occur. :contentReference[oaicite:44]{index=44}
 *   - Audio signature playback uses `loop` to repeat the entire signature seq. :contentReference[oaicite:45]{index=45}
 * • Timings:
 *   - Signatures pick stepTime by algorithm (e.g., 100/125/150/200ms buckets).
 *   - Signature Sequencer Mode respects app.stepTime only for inter-signature
 *     sleeps; the per-signature timing is algorithmic. :contentReference[oaicite:46]{index=46}
 * • UI sizing: enabling sequencer constrains canvas height (maxHeight 60vh) and
 *   enables main scrolling; disabling restores defaults. :contentReference[oaicite:47]{index=47}
 *
 * =============================================================================
 * DEVELOPER QUICK REFERENCE
 * =============================================================================
 * // Toggle sequencer UI
 * app.sig._onToggleSequencer(); // show/hide, adjusts layout
 *
 * // Toggle loop + signature-per-step mode
 * app.sig._onLoopToggle();
 * app.sig._onSignatureModeToggle();
 *
 * // Kick off an Audio Signature for the current shape
 * app.sig._onAudioSignature();
 *
 * // Manual signature run
 * const map = app.sig._getUniqueAlgorithmMapping(app.state.seed);
 * const algo = map[app.state.current] || 1;
 * const seq = app.sig.generateAudioSignature(app.state.seed, algo);
 * app.sig.playAudioSignature(seq, algo, { loop: true });
 * // app.sig.stopAudioSignature();
 *
 * // Bridge interactions with <seq-app>
 * app.sig._onSeqRecordStart({ detail: { slotIndex: 0 } });
 * app.sig._onSeqStepRecorded({ detail: { slotIndex: 0, value: 3, nextSlot: 1, isRecording: true } });
 * app.sig._onSeqPlayStarted({ detail: { stepTime: 200 } });
 * app.sig._onSeqStepAdvance({ detail: { stepIndex: 0, value: 1 } });
 * app.sig._onSeqPlayStopped();
 *
 * // Signature Sequencer Mode directly
 * app.sig._startSignatureSequencer(); // respects current sequence + flags
 * app.sig._stopSignatureSequencer();
 *
 * // Push app.state -> <seq-app>
 * app.sig.updateSequencerState();
 *
 * // Proxies to child
 * app.sig.recordStep(7);
 * app.sig.playSequence();
 * app.sig.stopSequence();
 *
 * // Internals referenced:
 * // - app._onShapeChange, app._updateControls, app._canvas(_Container), app._sequencerComponent
 * // - app._rng, app._sleep, app.shapes, app.humKey
 */



export function SignatureSequencer(app) {
  return {
    // ---------- Global toggles ----------
    _onToggleSequencer() {
      const s = app.state;
      s.isSequencerMode = !s.isSequencerMode;
      app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';

      if (s.isSequencerMode) {
        app._main.style.overflow = 'auto';
        if (app._canvasContainer) { app._canvasContainer.style.maxHeight = '60vh'; app._canvasContainer.style.flex = '0 0 auto'; }
        if (app._canvas) { app._canvas.style.maxHeight = '60vh'; }
        app.updateSequencerState();
      } else {
        app._main.style.overflow = 'hidden';
        if (app._canvasContainer) { app._canvasContainer.style.maxHeight = ''; app._canvasContainer.style.flex = ''; }
        if (app._canvas) { app._canvas.style.maxHeight = ''; }
        s.isRecording = false;
        s.currentRecordSlot = -1;
        if (s.sequencePlaying) app.stopSequence();
        if (s.signatureSequencerRunning) app._stopSignatureSequencer();
      }

      app._updateControls();
    },

    _onLoopToggle() {
      app.state.isLoopEnabled = !app.state.isLoopEnabled;
      app._updateControls();
      if (app.state.audioSignaturePlaying && !app.state.isSequenceSignatureMode) {
        app._loader.textContent = app.state.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.';
      }
    },

    _onSignatureModeToggle() {
      const s = app.state;
      s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
      app._updateControls();

      if (s.sequencePlaying) {
        app.stopSequence();
        app.stopAudioSignature();
        app._loader.textContent = s.isSequenceSignatureMode
          ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.'
          : 'Sequencer Signature Mode disabled. Press Play for normal step timing.';
      }
    },

    // ---------- Audio Signature UI trigger ----------
    _onAudioSignature() {
      const s = app.state;
      if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
      if (s.sequencePlaying) app.stopSequence();

      const algorithmMap = app._getUniqueAlgorithmMapping(s.seed);
      const algorithm = algorithmMap[s.current] || 1;
      const audioSignatureSequence = app.generateAudioSignature(s.seed, algorithm);
      app.playAudioSignature(audioSignatureSequence, algorithm, { loop: s.isLoopEnabled });

      app._loader.textContent = s.isLoopEnabled ? 'Playing Audio Signature (Loop).' : 'Playing Audio Signature...';
    },

    // ---------- Signature generation ----------
    _getUniqueAlgorithmMapping(seed) {
      const rng = app._rng(`${seed}_unique_algo_mapping`);
      const shapeKeys = [app.humKey, ...app.shapes];
      const algorithms = [1,2,3,4,5,6,7,8,9,10];

      for (let i = algorithms.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [algorithms[i], algorithms[j]] = [algorithms[j], algorithms[i]];
      }
      const map = {};
      shapeKeys.forEach((k, i) => { map[k] = algorithms[i]; });
      return map;
    },

    generateAudioSignature(seed, algorithm = 1) {
      const rng = app._rng(`${seed}_audio_signature_v${algorithm}`);
      switch (algorithm) {
        case 1: {
          const seq = []; for (let i = 0; i < 32; i++) seq.push(Math.floor(rng() * 10)); return seq;
        }
        case 2:
          return app._generateSignatureWithConstraints(seed, {
            steps: 32, paletteSize: 6, pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true
          });
        case 3: {
          const L = 8; const pattern = Array.from({ length: L }, () => Math.floor(rng() * 10));
          return Array.from({ length: 32 }, (_, i) => pattern[i % L]);
        }
        case 4: {
          const seq = [0]; let cur = 0;
          for (let i = 1; i < 32; i++) {
            const dir = rng() > 0.5 ? 1 : -1; const step = (Math.floor(rng() * 3) + 1);
            cur = Math.max(0, Math.min(9, cur + dir * step)); seq.push(cur);
          } return seq;
        }
        case 5: {
          const seq = []; let cluster = Math.floor(rng() * 10);
          for (let i = 0; i < 32;) { const len = Math.min((Math.floor(rng() * 6) + 2), 32 - i);
            for (let j = 0; j < len; j++, i++) seq.push(cluster); cluster = Math.floor(rng() * 10);
          } return seq;
        }
        case 6: {
          const seq = []; for (let i = 0; i < 32; i++) seq.push(rng() > 0.7 ? (Math.floor(rng() * 9) + 1) : 0); return seq;
        }
        case 7: {
          const seq = new Array(32).fill(0); let pos = 0; let a = 1, b = 1;
          while (pos < 32) { seq[pos] = Math.floor(rng() * 9) + 1; const next = a + b; a = b; b = next; pos += next; }
          return seq;
        }
        case 8: {
          const a = Math.floor(rng() * 10); const b = Math.floor(rng() * 10);
          return Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? a : b));
        }
        case 9: {
          const seq = []; let v = Math.floor(rng() * 9) + 1;
          for (let i = 0; i < 32; i++) { if (rng() < 0.2 || v === 0) v = Math.floor(rng() * 10);
            seq.push(v); if (rng() > 0.7) v = Math.max(0, v - 1);
          } return seq;
        }
        case 10: {
          const seq = []; let c = Math.floor(rng() * 10);
          for (let i = 0; i < 32; i++) { if (i % 8 === 0 || rng() > 0.6) c = Math.floor(rng() * 10); seq.push(c); }
          return seq;
        }
        default:
          return app._generateSignatureWithConstraints(seed);
      }
    },

    _generateSignatureWithConstraints(seed, {
      steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true
    } = {}) {
      const rng = app._rng(`${seed}_audio_signature_constrained`);
      const sequence = [];
      const paletteCount = Math.max(1, Math.min(9, paletteSize));

      let last = null;
      let prevNonHum = null;

      for (let i = 0; i < steps; i++) {
        if (rng() < pSilence) { sequence.push(null); continue; }
        const roll = rng();
        let next;

        if (roll < pHum) next = 0;
        else if (roll < pHum + pRepeat && prevNonHum !== null) next = prevNonHum;
        else {
          do {
            next = 1 + Math.floor(rng() * paletteCount);
            if (avoidBackAndForth && last !== null && last >= 1 && next >= 1) {
              if (sequence.length >= 2 && sequence[sequence.length - 2] === next) next = null;
            }
          } while (next === null);
        }

        sequence.push(next);
        if (next !== null) {
          if (next >= 1) prevNonHum = next;
          last = next;
        }
      }

      return sequence;
    },

    // ---------- Signature playback ----------
    playAudioSignature(sequence, algorithm = 1, { loop = false, onComplete = null } = {}) {
      const s = app.state;
      if (s.audioSignaturePlaying) app.stopAudioSignature();

      s.audioSignaturePlaying = true;
      s.audioSignatureStepIndex = 0;
      s.audioSignatureOnComplete = onComplete;

      let stepTime;
      switch (algorithm) {
        case 3: case 7: stepTime = 100; break;
        case 5: stepTime = 150; break;
        case 10: stepTime = 200; break;
        default: stepTime = 125;
      }

      const playStep = () => {
        if (!s.audioSignaturePlaying) return;

        const stepIndex = s.audioSignatureStepIndex;
        const shapeIndex = sequence[stepIndex];

        if (shapeIndex !== null) {
          let shapeKey;
          if (shapeIndex === 0) shapeKey = app.humKey;
          else shapeKey = app.shapes[shapeIndex - 1];

          if (shapeKey) {
            app._updateControls({ shapeKey });
            app._onShapeChange({ detail: { shapeKey } });
          }
        }

        s.audioSignatureStepIndex++;

        if (s.audioSignatureStepIndex >= sequence.length) {
          const finishOnce = () => {
            s.audioSignaturePlaying = false;
            s.audioSignatureTimer = null;
            const cb = s.audioSignatureOnComplete;
            s.audioSignatureOnComplete = null;
            if (typeof cb === 'function') cb();
            else app._loader.textContent = 'Audio Signature complete.';
          };

          if (loop) {
            s.audioSignatureStepIndex = 0;
            s.audioSignatureTimer = setTimeout(playStep, stepTime);
          } else {
            app._updateControls({ shapeKey: app.humKey });
            app._onShapeChange({ detail: { shapeKey: app.humKey } });
            s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
          }
          return;
        }

        s.audioSignatureTimer = setTimeout(playStep, stepTime);
      };

      playStep();
    },

    stopAudioSignature() {
      const s = app.state;
      if (s.audioSignatureTimer) {
        clearTimeout(s.audioSignatureTimer);
        s.audioSignatureTimer = null;
      }
      s.audioSignaturePlaying = false;
      s.audioSignatureStepIndex = 0;
      s.audioSignatureOnComplete = null;
    },

    // ---------- Sequencer bridge ----------
    _onSeqRecordStart(e) {
      const slotIndex = e?.detail?.slotIndex ?? -1;
      app.state.isRecording = true;
      app.state.currentRecordSlot = slotIndex;
      app._updateControls();
    },

    _onSeqStepCleared(e) {
      const slotIndex = e?.detail?.slotIndex;
      if (typeof slotIndex !== 'number') return;

      app.state.sequence[slotIndex] = null;

      if (app.state.isRecording && app.state.currentRecordSlot === slotIndex) {
        app.state.currentRecordSlot = (slotIndex + 1) % 8;
        if (app.state.currentRecordSlot === 0) app.state.isRecording = false;
      }
    },

    _onSeqStepRecorded(e) {
      const { slotIndex, value, nextSlot, isRecording } = e?.detail ?? {};
      if (typeof slotIndex === 'number') app.state.sequence[slotIndex] = value;
      if (typeof nextSlot === 'number') app.state.currentRecordSlot = nextSlot;
      if (typeof isRecording === 'boolean') app.state.isRecording = isRecording;
    },

    _onSeqPlayStarted(e) {
      const stepTime = e?.detail?.stepTime;
      app.state.sequencePlaying = true;
      app.state.sequenceStepIndex = 0;
      app.state._seqFirstCycleStarted = false;
      if (typeof stepTime === 'number') app.state.stepTime = stepTime;
      app._updateControls();

      if (app.state.isSequenceSignatureMode) {
        app._sequencerComponent?.stopSequence();
        app._startSignatureSequencer();
      }
    },

    _onSeqPlayStopped() {
      const s = app.state;
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;

      if (s.signatureSequencerRunning) app._stopSignatureSequencer();

      app._updateControls();
    },

    _onSeqStepAdvance(e) {
      if (app.state.isSequenceSignatureMode) return;

      const d = e?.detail || {};
      const stepIndex = (typeof d.stepIndex === 'number') ? d.stepIndex
                       : (typeof d.index === 'number') ? d.index
                       : app.state.sequenceStepIndex;
      const value = d.value;

      if (app.state.sequencePlaying) {
        if (stepIndex === 0) {
          if (app.state._seqFirstCycleStarted) {
            if (!app.state.isLoopEnabled) {
              app.stopSequence();
              return;
            }
          } else {
            app.state._seqFirstCycleStarted = true;
          }
        }
      }

      app.state.sequenceStepIndex = stepIndex;

      let shapeKey;
      if (value === 0) shapeKey = app.humKey;
      else if (value >= 1 && value <= app.shapes.length) shapeKey = app.shapes[value - 1];
      else return;

      app._updateControls({ shapeKey });
      app._onShapeChange({ detail: { shapeKey } });
    },

    _onSeqStepTimeChanged(e) {
      const stepTime = e?.detail?.stepTime;
      if (typeof stepTime === 'number') app.state.stepTime = stepTime;
    },

    _onSeqStepsChanged(e) {
      const steps = e?.detail?.steps;
      if (typeof steps === 'number' && steps > 0) {
        // Update the state to match the new step count
        app.state.sequenceSteps = steps;
        
        // Resize sequence and velocities arrays if needed
        const currentLength = app.state.sequence.length;
        if (steps !== currentLength) {
          // Preserve existing data
          const oldSequence = [...app.state.sequence];
          const oldVelocities = [...(app.state.velocities || [])];
          
          // Create new arrays with the correct length
          app.state.sequence = Array(steps).fill(null);
          app.state.velocities = Array(steps).fill(1);
          
          // Copy over existing data
          for (let i = 0; i < Math.min(oldSequence.length, steps); i++) {
            app.state.sequence[i] = oldSequence[i];
            if (oldVelocities[i] !== undefined) {
              app.state.velocities[i] = oldVelocities[i];
            }
          }
          
          // Reset step index if it's beyond the new range
          if (app.state.sequenceStepIndex >= steps) {
            app.state.sequenceStepIndex = 0;
          }
        }
        
        app.updateSequencerState();
      }
    },

    async _startSignatureSequencer() {
      const s = app.state;
      if (s.signatureSequencerRunning) app._stopSignatureSequencer();
      s.signatureSequencerRunning = true;

      app.stopAudioSignature();

      const algorithmMap = app._getUniqueAlgorithmMapping(s.seed);

      const runOnePass = async () => {
        if (!s.signatureSequencerRunning) return;

        for (let i = 0; i < s.sequence.length; i++) {
          if (!s.signatureSequencerRunning) return;

          s.sequenceStepIndex = i;
          app.updateSequencerState();

          const value = s.sequence[i];

          if (value === null || typeof value !== 'number' || value < 0) {
            await app._sleep(Math.max(50, s.stepTime));
            continue;
          }

          let shapeKey = null;
          if (value === 0) shapeKey = app.humKey;
          else if (value >= 1 && value <= app.shapes.length) shapeKey = app.shapes[value - 1];

          if (!shapeKey) { await app._sleep(Math.max(50, s.stepTime)); continue; }

          const algo = algorithmMap[shapeKey] || 1;
          const seq = app.generateAudioSignature(s.seed, algo);

          await new Promise(resolve => {
            if (!s.signatureSequencerRunning) { resolve(); return; }
            app.playAudioSignature(seq, algo, { loop: false, onComplete: () => resolve() });
          });

          if (!s.signatureSequencerRunning) return;
          await app._sleep(Math.max(30, s.stepTime));
        }
      };

      await runOnePass();
      if (!s.signatureSequencerRunning) return;

      if (s.isLoopEnabled && s.sequencePlaying) {
        while (s.signatureSequencerRunning && s.sequencePlaying) {
          await runOnePass();
        }
      }

      app._stopSignatureSequencer();
      app._sequencerComponent?.stopSequence?.();
    },

    _stopSignatureSequencer() {
      const s = app.state;
      s.signatureSequencerRunning = false;
      app.stopAudioSignature();
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      app.updateSequencerState();
      app._updateControls();
    },

    updateSequencerState() {
      if (!app._sequencerComponent) return;
      app._sequencerComponent.updateState?.({
        isRecording: app.state.isRecording,
        currentRecordSlot: app.state.currentRecordSlot,
        sequence: [...app.state.sequence],
        sequencePlaying: app.state.sequencePlaying,
        sequenceStepIndex: app.state.sequenceStepIndex,
        stepTime: app.state.stepTime,
        isLoopEnabled: app.state.isLoopEnabled,
        isSequenceSignatureMode: app.state.isSequenceSignatureMode
      });
    },

    // Public proxies to child component
    recordStep(number) { app._sequencerComponent?.recordStep(number); },
    playSequence() { app._sequencerComponent?.playSequence(); },
    stopSequence() {
      app._sequencerComponent?.stopSequence();
      if (app.state.signatureSequencerRunning) app._stopSignatureSequencer();
      if (app.state.audioSignaturePlaying) app.stopAudioSignature();
      app.state.sequencePlaying = false;
      app.state.sequenceStepIndex = 0;
      app.state._seqFirstCycleStarted = false;
      app.updateSequencerState();
      app._updateControls();
    },
  };
}

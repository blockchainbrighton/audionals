// Audio Module - Web Audio API and Synth Management
'use strict';

import { clamp, midiToHz, DEFAULT_SYNTH_PARAMS, log } from './utils.js';

// Audio Context
export const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Rhodes Synth Module (Headless)
export function createRhodesSynth(context, paramsRef) {
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);

  const updateParams = () => {
    const p = paramsRef?.current || DEFAULT_SYNTH_PARAMS;
  };

  return {
    noteOn(note, t, dur = 0.22, vel = 1) {
      const p = paramsRef?.current || DEFAULT_SYNTH_PARAMS;
      const freq = midiToHz(note);

      const o1 = context.createOscillator();
      o1.type = 'sine';
      const o2 = context.createOscillator();
      o2.type = 'sine';

      o1.frequency.setValueAtTime(freq, t);
      o2.frequency.setValueAtTime(freq * 2, t);

      const g1 = context.createGain();
      g1.gain.value = 1 - p.harmonicMix;
      const g2 = context.createGain();
      g2.gain.value = p.harmonicMix;

      const l = context.createBiquadFilter();
      l.type = 'lowpass';
      l.frequency.setValueAtTime(p.brightness, t);
      l.Q.setValueAtTime(1.5, t);

      const v = context.createGain();
      const a = Math.max(0.001, p.attack);
      const d = Math.max(0.001, p.decay);
      const s = clamp(p.sustain, 0, 1);
      const r = Math.max(0.001, p.release);
      const peak = clamp(vel * p.gain, 0.01, 1);

      v.gain.cancelScheduledValues(t);
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(peak, t + a);
      v.gain.linearRampToValueAtTime(peak * s, t + a + d);

      const holdEnd = t + Math.max(dur, a + d);
      v.gain.setValueAtTime(peak * s, holdEnd);
      v.gain.linearRampToValueAtTime(0, holdEnd + r);

      o1.connect(g1).connect(l);
      o2.connect(g2).connect(l);
      l.connect(v).connect(master);

      o1.start(t);
      o2.start(t);
      o1.stop(holdEnd + r + 0.02);
      o2.stop(holdEnd + r + 0.02);
    },
    setParams(next) {
      if (paramsRef) {
        paramsRef.current = { ...(paramsRef.current || {}), ...next };
        updateParams();
      }
    },
    setParam(k, v) {
      if (paramsRef) {
        paramsRef.current = { ...(paramsRef.current || {}), [k]: v };
        updateParams();
      }
    }
  }
}

// Audio loading functions
export async function decodeSample(channel, ab) {
  try {
    channel.sampleBuf = await ctx.decodeAudioData(ab);
    return true;
  } catch {
    return false;
  }
}

export async function loadSampleFromSource(channel, source) {
  channel.sampleBuf = null;
  channel.sampleSource = { type: 'none' };
  try {
    if (source.type === 'url' && source.url) {
      const ab = await (await fetch(source.url)).arrayBuffer();
      if (await decodeSample(channel, ab)) channel.sampleSource = { type: 'url', url: source.url };
      else throw 0;
    } else if (source.type === 'data' && source.dataUrl) {
      const ab = await (await fetch(source.dataUrl)).arrayBuffer();
      if (await decodeSample(channel, ab)) channel.sampleSource = { type: 'data', name: source.name || 'sample', mime: source.mime || 'audio/wav', dataUrl: source.dataUrl };
      else throw 0;
    }
  } catch {
    log(`[${channel.name}] Failed to load saved sample.`);
  }
}

export async function loadSynthFromSource(channel, source) {
  if (!source) {
    channel.synth = createRhodesSynth(ctx, channel._paramRef);
    channel.synthModule = { type: 'none' };
    log(`[${channel.name}] Using built-in synth.`);
    return;
  }
  let importUrl = null;
  if (source.type === 'url') { importUrl = source.url; }
  else if (source.type === 'data') { importUrl = source.dataUrl; }

  await loadSynthFromUrl(channel, importUrl, source);
}

export async function loadSynthFromUrl(channel, url, sourceMeta) {
  await ctx.resume();

  const useFallback = (msg) => {
    console.error(msg);
    channel.synth = createRhodesSynth(ctx, channel._paramRef);
    channel.synthModule = { type: 'none' };
    log(`[${channel.name}] Failed to load synth. Using demo synth.`);
  };

  if (!url) {
    channel.synth = createRhodesSynth(ctx, channel._paramRef);
    channel.synthModule = { type: 'none' };
    log(`[${channel.name}] Using built-in synth.`);
    return;
  }

  try {
    const mod = await import(/* @vite-ignore */ url);
    const candidate = (mod && (mod.default ?? mod.createSynth ?? mod.synth)) ?? mod;
    let synth = null;

    if (candidate && typeof candidate === 'object' && typeof candidate.noteOn === 'function') {
      synth = candidate;
    }
    else if (typeof candidate === 'function') {
      try {
        const maybe = candidate(ctx);
        synth = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } catch (err1) {
        try {
          const maybe = new candidate(ctx);
          synth = maybe;
        } catch (err2) {
          throw err2;
        }
      }
    }

    if (!synth || typeof synth.noteOn !== 'function') {
      throw new Error('Invalid synth module: missing noteOn()');
    }

    channel.synth = synth;
    channel.synthModule = sourceMeta || { type: 'url', url };

    if (typeof synth.getParams === 'function') {
      channel.synthParams = { ...synth.getParams() };
    }
    if (typeof synth.setParams === 'function') synth.setParams(channel.synthParams);
    else if (typeof synth.setParam === 'function') for (const [k, v] of Object.entries(channel.synthParams)) synth.setParam(k, v);

    // Note: rebuildSynthHead will be called from the channel creation process
    log(`[${channel.name}] Loaded synth module.`);
  } catch (e) {
    useFallback(e);
  }
}


// visor-js/loop.js
import { grain } from './grain.js';
import { beep } from './heartbeat.js';
import { curve } from './curve.js';
import { checkAndTriggerFade } from './fade.js';

export function loop(ctx, cvs, geom, CFG, chars, helmet, noise, nCtx, animationState, lastHeartbeatTimeRef, lastTimeRef, pxOffsetRef, charShiftRef) {
  return function _loop(t) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const o = geom.visor; ctx.save(); ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, 2 * Math.PI); ctx.clip();
    if (CFG.sineWave) {
        // (Sine wave logic goes here if needed)
      } else if (CFG.ecg) {
        // ✅ Only render ECG when playback is running
        if (window.fxPlaybackState?.isPlaying) {
          const amplitude = CFG.amplitude || 40, cycleWidth = CFG.cycleWidth || 250, depth = CFG.depth || .25, n = o.h * depth;
          const BASE_BPM = window.fxInitialBPM || 104.15, BASE_HEART_BPM = BASE_BPM / 2, heartbeatSpeed = CFG.heartbeatSpeed || 1, heartRateBPM = BASE_HEART_BPM * heartbeatSpeed, heartbeatInterval = 60 / heartRateBPM;
          const audioCtx = window.fxAudioContext, now = audioCtx ? audioCtx.currentTime : 0;
          if (now - lastHeartbeatTimeRef.value >= heartbeatInterval) {
            beep(now);
            lastHeartbeatTimeRef.value += heartbeatInterval * Math.floor((now - lastHeartbeatTimeRef.value) / heartbeatInterval);
          }
          const elapsedHeartbeats = now / heartbeatInterval, scrollOffset = (elapsedHeartbeats * cycleWidth) % cycleWidth;
          ctx.beginPath(); ctx.strokeStyle = CFG.color; ctx.lineWidth = CFG.lineWidth || 2; ctx.filter = "blur(0.5px)"; ctx.lineJoin = "round";
          for (let x = 0; x <= o.w; x++) {
            const baseY = o.y + o.h / 2 + curve(x, o.w, n);
            let posInCycle = (x - scrollOffset) % cycleWidth; if (posInCycle < 0) posInCycle += cycleWidth;
            let waveOffsetY = 0, qrsStart = cycleWidth * .6, qrsWidth = 35;
            if (posInCycle > qrsStart && posInCycle < qrsStart + qrsWidth) {
              const p = posInCycle - qrsStart;
              if (p < 5) waveOffsetY = p * .8;
              else if (p < 15) waveOffsetY = 4 - (p - 5) * (amplitude / 10 + .4);
              else if (p < 25) waveOffsetY = -amplitude + (p - 15) * (amplitude / 10 + 1.5);
              else waveOffsetY = 15 - (p - 25) * 1.5;
            }
            const tWaveStart = qrsStart + qrsWidth + 20, tWaveWidth = 50;
            if (posInCycle > tWaveStart && posInCycle < tWaveStart + tWaveWidth) {
              const p = posInCycle - tWaveStart;
              waveOffsetY = Math.sin(p / tWaveWidth * Math.PI) * (-amplitude * .25);
            }
            const finalY = baseY + waveOffsetY;
            x === 0 ? ctx.moveTo(o.x + x, finalY) : ctx.lineTo(o.x + x, finalY);
          }
          ctx.stroke();
        }
      } else {
      const e = (t - lastTimeRef.value) / 1e3; lastTimeRef.value = t; pxOffsetRef.value += CFG.speed * e;
      if (pxOffsetRef.value >= CFG.step) { charShiftRef.value = (charShiftRef.value + ((pxOffsetRef.value / CFG.step) | 0)) % chars.length; pxOffsetRef.value %= CFG.step; }
      ctx.font = `${CFG.fontSize}px ${CFG.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = CFG.color; ctx.filter = "blur(.6px)";
      if (CFG.flashing) ctx.globalAlpha = CFG.flashSync ? ((window.fxPlaybackState?.currentBeat ?? 0) / (CFG.flashBeats ?? 1) % 2 < 1 ? 1 : 0.2) : Math.sin(t / 150) > 0 ? 1 : 0.2;
      if (CFG.pulse) ctx.globalAlpha = .6 + .4 * Math.sin(t / 183.36);
      const n = o.h * CFG.depth, i = o.w / CFG.step + 2;
      for (let e = -1; e < i; e++) {
        const s = chars[(e + charShiftRef.value + chars.length) % chars.length], r = o.x + o.w - e * CFG.step + pxOffsetRef.value;
        let l = o.y + o.h / 2 + (CFG.pulse ? -1 : 1) * curve(e * CFG.step - pxOffsetRef.value, o.w, n);
        if (CFG.glitch && Math.random() > .95) l += (Math.random() - .5) * CFG.fontSize * CFG.glitch;
        if (CFG.rainbow) ctx.fillStyle = `hsla(${(t / 20 + 10 * e) % 360},100%,70%,0.6)`;
        ctx.save(); ctx.translate(r, l); ctx.scale(-1, 1); ctx.fillText(s, 0, 0); ctx.restore();
      }
    }
    ctx.globalAlpha = 1; ctx.fillStyle = CFG.color; ctx.filter = "none";
    grain(geom, nCtx, CFG, noise);
    ctx.drawImage(noise, o.x, o.y, geom.visor.w, geom.visor.h); ctx.restore();
    if (window.fxPlaybackState?.isPlaying) {
      const currentTime = { bar: window.fxPlaybackState.currentBar, ms: performance.now() - animationState.startTime };
      if (currentTime.bar > -1) {
        checkAndTriggerFade('helmet', helmet, currentTime, animationState);
        checkAndTriggerFade('hud', cvs, currentTime, animationState);
      }
    }
    requestAnimationFrame(_loop);
  }
}

// js/module_factory/modules/sample_player.js
import { audioCtx } from '../../audio_context.js';

export function createSamplePlayerModule(parent, moduleId) {
  let audioBuffer = null;
  const outputGain = audioCtx.createGain();

  // Tiny helper for element creation
  const el = (tag, props = {}) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    return e;
  };

  const fileInput = el('input', {
    type: 'file',
    accept: 'audio/*',
    style: 'display:block'
  });

  const canvas = el('canvas', {
    width: 150,
    height: 40,
    style: 'border:1px solid #555'
  });

  parent.appendChild(canvas);
  parent.appendChild(fileInput);

  const ctx = canvas.getContext('2d');
  const halfH = canvas.height / 2;

  function drawWaveform() {
    if (!audioBuffer) return;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, halfH);

    for (let x = 0; x < canvas.width; x++) {
      let min = 1, max = -1;
      for (let i = 0; i < step; i++) {
        const v = data[x * step + i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.lineTo(x, (1 + min) * halfH);
      ctx.lineTo(x, (1 + max) * halfH);
    }
    ctx.stroke();
  }

  function loadAudioBuffer(file) {
    console.log(`[SamplePlayer ${moduleId}] Loading “${file.name}”`);
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          audioBuffer = await audioCtx.decodeAudioData(e.target.result);
          console.log(`[SamplePlayer ${moduleId}] Decoded (${audioBuffer.duration.toFixed(2)}s)`);
          drawWaveform();
          res(audioBuffer);
        } catch (err) {
          console.error(`[SamplePlayer ${moduleId}] Decode error:`, err);
          audioBuffer = null;
          rej(err);
        }
      };
      reader.onerror = e => rej(e);
      reader.readAsArrayBuffer(file);
    });
  }

  fileInput.onchange = e => {
    const f = e.target.files[0];
    if (f) loadAudioBuffer(f).catch(() =>
      alert(`Failed to load audio for module ${moduleId}. See console.`)
    );
  };

  function play() {
    if (!audioBuffer) return console.warn(`[SamplePlayer ${moduleId}] No buffer to play`);
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(outputGain);
    try {
      src.start(0);
    } catch {
      return;
    }

    canvas.style.borderColor = 'lime';
    src.onended = () => {
      canvas.style.borderColor = '#555';
      src.disconnect();
    };
  }

  return {
    id: moduleId,
    type: 'samplePlayer',
    audioNode: outputGain,
    loadAudioBuffer,
    play,
    element: parent
  };
}

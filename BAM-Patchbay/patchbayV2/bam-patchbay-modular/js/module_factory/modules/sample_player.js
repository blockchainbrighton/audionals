// js/module_factory/modules/sample_player.js
import { audioCtx } from '../../audio_context.js';

export function createSamplePlayerModule(parent, moduleId) {
  let audioBuffer = null;
  const outputGain = audioCtx.createGain();
  parent.append(outputGain); // connect later in factory

  const el = (tag, attrs = {}) => Object.assign(document.createElement(tag), attrs);

  const canvas = el('canvas', {
    width: 150, height: 40,
    style: 'border:1px solid #555; background:#222; display:block; margin:5px 0;'
  });

  const fileInput = el('input', {
    type: 'file', accept: 'audio/*',
    style: 'display:block; margin-bottom:5px;'
  });

  parent.append(canvas, fileInput);
  const ctx = canvas.getContext('2d');

  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (!audioBuffer) {
      ctx.fillStyle='#777'; ctx.font='10px sans-serif';
      ctx.textAlign='center';
      ctx.fillText('No audio loaded', canvas.width/2, canvas.height/2+4);
      return;
    }
    const data = audioBuffer.getChannelData(0), step = Math.ceil(data.length/canvas.width), h2=canvas.height/2;
    ctx.lineWidth=1; ctx.strokeStyle='#87CEFA'; ctx.beginPath();
    for(let x=0; x<canvas.width; x++){
      let min=1, max=-1;
      for(let j=0; j<step; j++){ const v=data[x*step+j]; if(v<min)min=v; if(v>max)max=v; }
      ctx.moveTo(x+0.5, (1+min)*h2);
      ctx.lineTo(x+0.5, (1+max)*h2);
    }
    ctx.stroke();
  };
  draw();

  const loadAudio = file => new Promise((res, rej) => {
    console.log(`[SamplePlayer ${moduleId}] Loading ${file.name}`);
    const r = new FileReader();
    r.onload = async e => {
      try {
        audioBuffer = await audioCtx.decodeAudioData(e.target.result);
        console.log(`[SamplePlayer ${moduleId}] Decoded ${file.name} (${audioBuffer.duration.toFixed(2)}s)`);
        draw(); res(audioBuffer);
      } catch(err) {
        console.error(`[SamplePlayer ${moduleId}] Decode error:`, err);
        audioBuffer=null; draw(); rej(err);
      }
    };
    r.onerror = e => rej(e.target.error);
    r.readAsArrayBuffer(file);
  });

  fileInput.onchange = e => {
    const f = e.target.files[0];
    if(f) loadAudio(f).catch(() => console.warn(`Failed to load ${moduleId}`));
  };

  const trigger = t => {
    if(!audioBuffer) return console.warn(`[SamplePlayer ${moduleId}] No buffer`);
    const play = time => {
      const src = audioCtx.createBufferSource();
      src.buffer=audioBuffer; src.connect(outputGain);
      try{ src.start(time); console.log(`[SamplePlayer ${moduleId}] Play ${time?`at ${time.toFixed(3)}`:'immediately'}`); }
      catch(e){ return console.error(`[SamplePlayer ${moduleId}] start error:`, e); }
      canvas.style.borderColor='#32CD32';
      src.onended=() => { canvas.style.borderColor='#555'; src.disconnect(); console.log(`[SamplePlayer ${moduleId}] Ended`); };
    };

    if(audioCtx.state==='suspended')
      audioCtx.resume().then(() => play(t)).catch(e=>console.error(`[SamplePlayer ${moduleId}] resume error:`, e));
    else play(t);
  };

  return { id: moduleId, type: 'samplePlayer', element: parent, audioNode: outputGain,
    loadAudioBuffer: loadAudio, trigger, dispose: () => console.log(`[SamplePlayer ${moduleId}] Disposed`) };
}

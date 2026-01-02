import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function assertFinite(arr, label) {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) throw new Error(`${label}[${i}] non-finite: ${v}`);
  }
}

async function main() {
  const pluginDir = 'Plugins/Instruments/UniversalSynth';
  const manifest = JSON.parse(await readFile(path.join(pluginDir, 'manifest.json'), 'utf8'));
  const wasmPath = path.join(pluginDir, manifest.components.audio_engine);
  const wasmBytes = await readFile(wasmPath);

  const loaderUrl =
    pathToFileURL(path.resolve('System/shared/wasm_loader_unified.js')).href +
    `?stress=UniversalSynth&t=${Date.now()}`;
  const loader = await import(loaderUrl);
  const init = loader.default || loader.__wbg_init || loader.init;
  if (typeof init !== 'function') throw new Error(`Unified loader init not found in ${loaderUrl}`);
  await init(wasmBytes);

  const Synth = loader.BvstSynth;
  const synth = Synth.new(48000, 'UniversalSynth');

  const blockSize = 128;
  const inL = new Float32Array(blockSize);
  const inR = new Float32Array(blockSize);
  const outL = new Float32Array(blockSize);
  const outR = new Float32Array(blockSize);

  const blocks = Number(process.env.BVST_STRESS_BLOCKS || 20000);
  let note = 60;

  for (let i = 0; i < blocks; i++) {
    // Random-ish musical events.
    if (i % 37 === 0) synth.note_on?.(note, 0.8);
    if (i % 53 === 0) synth.note_off?.(note);
    if (i % 97 === 0) {
      note = 36 + ((note + 7) % 48);
    }
    if (i % 19 === 0) synth.set_param?.(0, (i % 100) / 100);

    synth.process(inL, inR, outL, outR);
    assertFinite(outL, 'outL');
    assertFinite(outR, 'outR');
  }

  synth.free?.();
  console.log(`[OK] Stress ran ${blocks} blocks`);
}

await main();


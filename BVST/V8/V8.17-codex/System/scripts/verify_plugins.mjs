import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';


async function discoverPluginDirs() {
  const pluginsRoot = path.resolve('Plugins');
  const entries = [];

  let categories;
  try {
    categories = await (await import('node:fs/promises')).readdir(pluginsRoot, { withFileTypes: true });
  } catch (e) {
    throw new Error(`Failed to read Plugins/ directory: ${e}`);
  }

  for (const cat of categories) {
    if (!cat.isDirectory() || cat.name.startsWith('.')) continue;
    const catPath = path.join(pluginsRoot, cat.name);

    const plugins = await (await import('node:fs/promises')).readdir(catPath, { withFileTypes: true });
    for (const pl of plugins) {
      if (!pl.isDirectory() || pl.name.startsWith('.')) continue;
      const pluginDir = path.join('Plugins', cat.name, pl.name);
      try {
        await readFile(path.join(pluginDir, 'manifest.json'));
        entries.push(pluginDir);
      } catch (_) {
        // ignore
      }
    }
  }

  entries.sort();
  return entries;
}

async function loadJson(filePath) {
  const txt = await readFile(filePath, 'utf8');
  return JSON.parse(txt);
}

function isFiniteFloat32Array(arr) {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) return false;
  }
  return true;
}

async function testPlugin(pluginDir) {
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const manifest = await loadJson(manifestPath);

  // Ensure legacy per-plugin WASM artifacts are not present (single shared WASM only).
  await readFile(path.join(pluginDir, 'bvst_engine_bg.wasm'))
    .then(() => {
      throw new Error(`Legacy per-plugin WASM found in ${pluginDir}/bvst_engine_bg.wasm (should be removed)`);
    })
    .catch((err) => {
      if (err && err.code === 'ENOENT') return;
      // Unexpected FS error
      throw err;
    });

  // Ensure legacy per-plugin worklet bundles are not present (single shared AudioWorklet module only).
  await readFile(path.join(pluginDir, 'processor.js'))
    .then(() => {
      throw new Error(`Legacy per-plugin worklet found in ${pluginDir}/processor.js (should be removed)`);
    })
    .catch((err) => {
      if (err && err.code === 'ENOENT') return;
      throw err;
    });

  const wasmRel = manifest?.components?.audio_engine;
  if (typeof wasmRel !== 'string' || wasmRel.length === 0) {
    throw new Error(`Missing manifest.components.audio_engine in ${manifestPath}`);
  }
  const wasmPath = path.join(pluginDir, wasmRel);
  const wasmBytes = await readFile(wasmPath);

  // Important: wasm_loader_unified.js keeps module-level state (`let wasm;`).
  // Load a fresh module instance per plugin by varying the import URL.
  const loaderUrl =
    pathToFileURL(path.resolve('System/shared/wasm_loader_unified.js')).href +
    `?plugin=${encodeURIComponent(manifest.name || path.basename(pluginDir))}&t=${Date.now()}`;
  const loader = await import(loaderUrl);
  const init = loader.default || loader.__wbg_init || loader.init;
  if (typeof init !== 'function') throw new Error(`Unified loader init not found in ${loaderUrl}`);

  await init(wasmBytes);

  const Synth = loader.BvstSynth;
  if (typeof Synth?.new !== 'function') throw new Error(`BvstSynth.new missing for ${pluginDir}`);

  const synth = Synth.new(48000, manifest.name || path.basename(pluginDir));
  const inL = new Float32Array(128);
  const inR = new Float32Array(128);
  const outL = new Float32Array(128);
  const outR = new Float32Array(128);

  // Exercise basic API surface.
  synth.set_param?.(0, 0.5);
  synth.set_param?.(1, 0.25);

  if (manifest.type === 'Instrument') {
    synth.note_on?.(60, 0.8);
  }

  for (let i = 0; i < 32; i++) {
    synth.process(inL, inR, outL, outR);
  }

  if (manifest.type === 'Instrument') {
    synth.note_off?.(60);
    for (let i = 0; i < 8; i++) synth.process(inL, inR, outL, outR);
  }

  if (!isFiniteFloat32Array(outL) || !isFiniteFloat32Array(outR)) {
    throw new Error(`Non-finite samples in output for ${pluginDir}`);
  }

  synth.free?.();
  return { name: manifest.name, type: manifest.type, wasm: wasmRel };
}

async function main() {
  const pluginDirs = await discoverPluginDirs();

  const results = [];
  for (const dir of pluginDirs) {
    try {
      const r = await testPlugin(dir);
      results.push({ dir, ok: true, ...r });
    } catch (e) {
      results.push({ dir, ok: false, error: String(e?.stack || e) });
    }
  }

  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    if (r.ok) {
      console.log(`[OK] ${r.dir} (${r.name}, ${r.type}) -> ${r.wasm}`);
    } else {
      console.log(`[FAIL] ${r.dir}\n${r.error}\n`);
    }
  }

  if (failed.length > 0) process.exitCode = 1;
}

await main();

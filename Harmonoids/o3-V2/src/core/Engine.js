// Engine.js
/**
 * Main game engine – orchestrates update / render / audio / physics / UI layers.
 * @module core/Engine
 */
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { Physics } from './Physics.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { MusicLogic } from '../audio/MusicLogic.js';
import { HUD } from '../ui/HUD.js';
import { HarmonoidFactory } from '../entities/Harmonoid.js';
import { loadJSON } from './util.js';

export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} levelPath
   */
  constructor(canvas, levelPath) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.renderer = new Renderer(this.ctx);
    this.physics = new Physics();
    this.audio = new AudioEngine();
    this.music = new MusicLogic(this.audio);
    this.hud = new HUD(this);
    /** @type {import('../entities/Harmonoid.js').Harmonoid[]} */
    this.entities = [];
    this.environment = []; // gates, zones, etc.
    this.paused = false;
    this.levelPath = levelPath;
    this.lastTime = 0;
  }

  async start() {
    await this.loadLevel(this.levelPath);
    requestAnimationFrame(this.loop.bind(this));
  }

  /** @param {number} t */
  loop(t) {
    const dt = (t - this.lastTime) / 1000;
    this.lastTime = t;
    if (!this.paused) this.update(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  /** @param {number} dt */
  update(dt) {
    // Spawn queued entities (demo level uses auto-spawn)
    for (const e of this.entities) {
      e.update(dt, this.input, this.physics);
    }
    this.physics.update(dt, this.entities, this.environment);
    this.music.update(this.entities);
    this.hud.update(this.entities);
  }

  render() {
    this.renderer.clear();
    for (const tile of this.environment) this.renderer.drawEnv(tile);
    for (const e of this.entities) this.renderer.drawEntity(e);
    this.hud.render(this.renderer.ctx);
  }

  /** @param {string} path */
 /** Load level JSON and instantiate objects & entities. */
 async loadLevel(path) {
  const data = await loadJSON(path);

  /* --- environment objects (gates, zones, tiles, etc.) --- */
  for (const obj of data.environment) {
    // Dynamically import the module once
    const mod = await import(`../mechanics/${obj.type}.js`);
    // Get the constructor by the exact name OR the default/first export
    const Cls =
      mod[obj.type] ||             // exact match (e.g. Gates, DissonanceZone, EnvObjects)
      mod.default  ||              // if the file used a default export
      Object.values(mod)[0];       // last-chance fallback

    if (typeof Cls !== 'function') {
      console.error(`Can’t find class for type "${obj.type}"`);
      continue;
    }
    this.environment.push(new Cls(obj));
  }

  /* --- Harmonoids --- */
  for (const h of data.harmonoids) {
    this.entities.push(await HarmonoidFactory.create(h)); // <-- await!
  }
}
}

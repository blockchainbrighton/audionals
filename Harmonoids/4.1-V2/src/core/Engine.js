import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { Physics } from './Physics.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { MusicLogic } from '../audio/MusicLogic.js';
import { Harmonoid } from '../entities/Harmonoid.js';
import { Bassoids } from '../entities/Bassoids.js';
import { Glissoids } from '../entities/Glissoids.js';
import { Percussoids } from '../entities/Percussoids.js';
import { Droneoids } from '../entities/Droneoids.js';
import { Gates } from '../mechanics/Gates.js';
import { DissonanceZone } from '../mechanics/DissonanceZone.js';
import { ResonanceField } from '../mechanics/ResonanceField.js';
import { EnvObjects } from '../mechanics/EnvObjects.js';
import { HUD } from '../ui/HUD.js';

import level01 from '../../levels/level01.json' assert { type: "json" };

const CANVAS_ID = "gameCanvas";
const TICK_MS = 1000/60;
const HARMONOID_TYPES = [
  { type: 'Standard', class: Harmonoid },
  { type: 'Bassoids', class: Bassoids },
  { type: 'Glissoids', class: Glissoids },
  { type: 'Percussoids', class: Percussoids },
  { type: 'Droneoids', class: Droneoids }
];

class GameState {
  constructor() {
    this.reset();
  }
  reset() {
    this.running = false;
    this.mode = "procession";
    this.level = JSON.parse(JSON.stringify(level01));
    this.harmonoids = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.selected = [];
    this.stats = { total: 0, saved: 0, lost: 0 };
    this.fields = [];
    this.abilities = {
      pitch: 0, tempo: 1, arpeggio: false, quantize: false, morph: 0
    };
  }
}

class Engine {
  constructor() {
    this.canvas = document.getElementById(CANVAS_ID);
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.renderer = new Renderer(this.ctx);
    this.physics = new Physics();
    this.audio = new AudioEngine();
    this.music = new MusicLogic(this.audio);
    this.gates = new Gates();
    this.zones = new DissonanceZone();
    this.env = new EnvObjects();
    this.hud = new HUD(document.getElementById("hud"), this);
    this.state = new GameState();
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this._tickHandle = null;

    window.engine = this; // For console inspection/debug
    this.init();
  }

  async init() {
    this.hud.init();
    this.loadLevel(this.state.level);
    this.start();
  }

  loadLevel(level) {
    this.state.level = level;
    this.state.harmonoids = [];
    this.state.spawnQueue = level.harmonoidQueue.slice();
    this.state.spawnTimer = 0;
    this.state.stats = { total: level.harmonoidQueue.length, saved: 0, lost: 0 };
    this.env.load(level.envObjects);
    this.gates.load(level.gates);
    this.zones.load(level.zones);
  }

  start() {
    if (this._tickHandle) cancelAnimationFrame(this._tickHandle);
    this.state.running = true;
    this.lastTime = performance.now();
    this._tickHandle = requestAnimationFrame(this.loop);
  }

  pause() {
    this.state.running = false;
    if (this._tickHandle) cancelAnimationFrame(this._tickHandle);
    this.hud.update();
  }

  reset() {
    this.state.reset();
    this.loadLevel(this.state.level);
    this.hud.update();
    this.start();
  }

  loop(now = performance.now()) {
    if (!this.state.running) return;
    let dt = Math.min((now - this.lastTime), 80);
    this.lastTime = now;

    // SPAWNING
    if (this.state.mode === "procession" && this.state.spawnQueue.length && this.state.spawnTimer <= 0) {
      this.spawnHarmonoid(this.state.spawnQueue.shift());
      this.state.spawnTimer = this.state.level.spawnDelay;
    }
    if (this.state.spawnTimer > 0)
      this.state.spawnTimer -= dt;

    // PHYSICS & LOGIC
    this.physics.update(this.state.harmonoids, this.env, dt);
    this.music.update(this.state.harmonoids, this.state.abilities, dt);
    this.gates.update(this.state.harmonoids, this.env, dt);
    this.zones.update(this.state.harmonoids, dt);
    this.state.fields = this.state.fields.filter(f => !f.expired);

    // WIN/LOSE
    if (!this.state.harmonoids.length && !this.state.spawnQueue.length) {
      this.state.running = false;
      setTimeout(() => alert(
        `Level complete!\nSaved: ${this.state.stats.saved}\nLost: ${this.state.stats.lost}`
      ), 500);
    }

    // RENDER
    this.renderer.draw(this.state, this.env, this.gates, this.zones, this.hud);

    // SCHEDULE NEXT
    this._tickHandle = requestAnimationFrame(this.loop);
  }

  spawnHarmonoid(type) {
    let H = HARMONOID_TYPES.find(h => h.type === type) || HARMONOID_TYPES[0];
    let h = new H.class(this.state.level.start, this.state.harmonoids.length);
    this.state.harmonoids.push(h);
  }

  dropManualHarmonoid() {
    if (this.state.mode !== "manualDrop") return;
    if (this.state.spawnQueue.length) this.spawnHarmonoid(this.state.spawnQueue.shift());
  }

  selectHarmonoid(h) {
    if (!this.state.selected.includes(h)) this.state.selected.push(h);
    this.hud.update();
  }

  deselectAll() {
    this.state.selected = [];
    this.hud.update();
  }
}

window.addEventListener('DOMContentLoaded', () => new Engine());

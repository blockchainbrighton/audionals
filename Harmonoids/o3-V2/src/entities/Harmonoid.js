/**
 * Harmonoid base class & factory.
 * @module entities/Harmonoid
 */

/** Color wheel helper – map MIDI note to hue */
const NOTE_TO_HUE = n => ((n % 12) / 12) * 360;

export class Harmonoid {
  /**
   * @param {{x:number,y:number, pitch:number, subtype?:string}} opts
   */
  constructor({ x, y, pitch, subtype = 'standard' }) {
    this.subtype = subtype;
    this.pitch = pitch; // MIDI note number
    this.frequency = 440 * 2 ** ((pitch - 69) / 12);
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.radius = 10;
    this.color = `hsl(${NOTE_TO_HUE(pitch)} 80% 50%)`;
    this.muted = false;
    this.onGround = false;
    this.static = false;
  }
  /**
   * @param {number} dt
   * @param {import('../core/Input.js').Input} input
   * @param {import('../core/Physics.js').Physics} physics
   */
  update(dt, input, physics) {
    // Base harmonic abilities handled in subclasses
  }
}

/** Factory helper for JSON spawning */
export const HarmonoidFactory = {
  /**
   * @param {{type:string,x:number,y:number,pitch:number}} json
   * @returns {Harmonoid}
   */
  async create(json) {
    const map = {
      Standard: (await import('./Harmonoid.js')).Harmonoid,
      Bassoids: (await import('./Bassoids.js')).Bassoids,
      Glissoids: (await import('./Glissoids.js')).Glissoids,
      Percussoids: (await import('./Percussoids.js')).Percussoids,
      Droneoids: (await import('./Droneoids.js')).Droneoids,
    };
    const Cls = map[json.type] ?? (await import('./Harmonoid.js')).Harmonoid;
    return new Cls(json);
  },
};

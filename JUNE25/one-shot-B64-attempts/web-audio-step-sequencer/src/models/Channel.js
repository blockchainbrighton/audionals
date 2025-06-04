export default class Channel {
  constructor({ id, name, buffer, gain = 1, pan = 0, mute = false, group = null }) {
    this.id = id;
    this.name = name;
    this.buffer = buffer; // AudioBuffer or null
    this.steps = new Array(16).fill(false);
    this.velocity = new Array(16).fill(1);
    this.gain = gain;
    this.pan = pan;
    this.mute = mute;
    this.group = group;
  }

  toggleStep(index, velocity = 1) {
    this.steps[index] = !this.steps[index];
    this.velocity[index] = velocity;
  }

  serialize() {
    const { id, name, gain, pan, mute, group, steps, velocity } = this;
    return { id, name, gain, pan, mute, group, steps, velocity };
  }

  static deserialize(obj, buffer) {
    const ch = new Channel({ ...obj, buffer });
    ch.steps = obj.steps;
    ch.velocity = obj.velocity;
    return ch;
  }
}

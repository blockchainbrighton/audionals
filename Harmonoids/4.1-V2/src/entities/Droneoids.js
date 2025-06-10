import { Harmonoid } from './Harmonoid.js';
export class Droneoids extends Harmonoid {
  constructor(pos, idx=0){
  super(pos, idx);
  this.type = "Droneoids";
  this.color = "#6fa86f";
  this.freq *= 0.5; // 1 octave down
}
update(dt) {
  // vibrate low-freq plates to topple obstacles
}
}
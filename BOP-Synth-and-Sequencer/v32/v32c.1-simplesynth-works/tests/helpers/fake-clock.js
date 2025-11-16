export class FakeClock {
  constructor(ms = 0) {
    this.t = ms;
  }

  nowMs() {
    return this.t;
  }

  tick(ms) {
    this.t += ms;
  }
}

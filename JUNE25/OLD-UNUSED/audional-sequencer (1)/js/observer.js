export class Observable {
  constructor(val) {
    this.value = val;
    this.subscribers = [];
  }
  set(val) {
    if (val !== this.value) {
      this.value = val;
      this.subscribers.forEach(fn => fn(val));
    }
  }
  get() { return this.value; }
  subscribe(fn) {
    this.subscribers.push(fn);
    fn(this.value);
    return () => this.unsubscribe(fn);
  }
  unsubscribe(fn) {
    this.subscribers = this.subscribers.filter(f => f !== fn);
  }
}

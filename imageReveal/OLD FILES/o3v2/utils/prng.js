
export class Xoshiro128 {
  constructor(seed=1337){
    this.state = new Uint32Array(4);
    let x = seed;
    for(let i=0;i<4;i++){
      x ^= x << 13; x ^= x >> 17; x ^= x << 5;
      this.state[i]=x>>>0;
    }
  }
  next(){
    const s = this.state;
    const result = (s[0] + s[3]) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11 | s[3] >>> (32-11)) >>> 0;
    return result / 0xFFFFFFFF;
  }
}

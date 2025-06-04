
/**
 * Xoshiro128** PRNG implementation (small & fast)
 * @see https://prng.di.unimi.it/
 */
export default class Xoshiro128 {
  constructor(seed=1){
    this.state = new Uint32Array(4);
    // simple splitmix32 to seed
    let z = seed>>>0;
    const splitmix32 = ()=> {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z;
      t = (t ^ (t >>> 16)) >>> 0;
      t = Math.imul(t, 0x85ebca6b) >>> 0;
      t = (t ^ (t >>> 13)) >>> 0;
      t = Math.imul(t, 0xc2b2ae35) >>> 0;
      return (t ^ (t >>> 16)) >>> 0;
    };
    for(let i=0;i<4;i++) this.state[i]=splitmix32();
  }
  rotl(x,k){return ((x<<k)|(x>>>(32-k)))>>>0;}
  next(){
    const [a,b,c,d] = this.state;
    const result = this.rotl(b * 5 >>> 0, 7) * 9 >>> 0;
    const t = b << 9 >>> 0;
    this.state[2] ^= a;
    this.state[3] ^= b;
    this.state[1] ^= c;
    this.state[0] ^= d;
    this.state[2] ^= t;
    this.state[3] = this.rotl(this.state[3],11);
    return result>>>0;
  }
  // returns float in [0,1)
  random(){ return this.next() / 0xFFFFFFFF; }
}

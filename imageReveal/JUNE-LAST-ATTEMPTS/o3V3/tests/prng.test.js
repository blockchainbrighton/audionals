
import Xoshiro128 from '../prng.js';
test('xoshiro deterministic sequence',()=>{
  const rng1=new Xoshiro128(123);
  const rng2=new Xoshiro128(123);
  for(let i=0;i<100;i++){
    expect(rng1.next()).toBe(rng2.next());
  }
});

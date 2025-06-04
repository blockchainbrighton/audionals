
import { Xoshiro128 } from '../utils/prng.js';
test('PRNG determinism', ()=>{
  const a = new Xoshiro128(42);
  const b = new Xoshiro128(42);
  for(let i=0;i<1000;i++){
    expect(a.next()).toBeCloseTo(b.next());
  }
});

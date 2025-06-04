/* eslint-env jest */
function mulberry32(seed){ return ()=>{ let t=(seed+=0x6d2b79f5); t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
test('deterministic',()=>{ const a=mulberry32(123), b=mulberry32(123); for(let i=0;i<100;i++) expect(a()).toBeCloseTo(b(),10); });

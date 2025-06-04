/* eslint-env jest */
import RadialReveal from '../effects/RadialReveal.js';
import { createCanvas } from 'canvas';
test('mask increases',()=>{ const c=createCanvas(100,100); const ctx=c.getContext('2d'); const e=new RadialReveal(ctx); e.init(c); e.draw(0.2); const low=ctx.getImageData(50,10,1,1).data[3]; e.draw(0.8); const high=ctx.getImageData(50,10,1,1).data[3]; expect(high).toBeGreaterThanOrEqual(low); });

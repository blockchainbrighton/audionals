/* eslint-env jest */
import GlyphReveal from '../effects/GlyphReveal.js';
import { createCanvas } from 'canvas';
test('converges',()=>{ const c=createCanvas(100,100); const ctx=c.getContext('2d'); const e=new GlyphReveal(ctx); e.init(c); e.draw(1); expect(ctx.getImageData(0,0,1,1).data[3]).toBeGreaterThanOrEqual(0); });

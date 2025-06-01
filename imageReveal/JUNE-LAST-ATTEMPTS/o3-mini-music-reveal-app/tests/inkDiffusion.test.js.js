/* eslint-env jest */
import InkDiffusion from '../effects/InkDiffusion.js';
import { createCanvas } from 'canvas';
test('reveals',()=>{ const c=createCanvas(100,100); const ctx=c.getContext('2d'); const e=new InkDiffusion(ctx); e.init(c); e.draw(0.1); const a1=ctx.getImageData(0,0,100,100).data.filter((_,i)=>i%4===3).reduce((a,b)=>a+b,0); e.draw(0.9); const a2=ctx.getImageData(0,0,100,100).data.filter((_,i)=>i%4===3).reduce((a,b)=>a+b,0); expect(a2).toBeGreaterThan(a1); });

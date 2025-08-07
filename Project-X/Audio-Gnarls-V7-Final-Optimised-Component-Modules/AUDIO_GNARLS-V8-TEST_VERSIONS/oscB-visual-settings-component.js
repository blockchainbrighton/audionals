// oscB-visual-settings-component.js

/**
 * Stateless oscilloscope visualizer toolkit.
 * Exports draw algorithms and parameter generators for modular use.
 */

export const parseHue = c => +((c.match(/hsla?\(([\d.]+)/)||[])[1]||0);

export const drawFuncs = {
  radial(data, t, params, ctx, width, height) {
    const {symmetry=1, visualLFOs} = params, S=0.4*width, cx=width/2, cy=height/2;
    const angStep=2*Math.PI/symmetry, rot=(visualLFOs?.[0]?.rate||0.005)*t;
    for(let s=0; s<symmetry; s++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(s*angStep+rot); ctx.translate(-cx, -cy);
      ctx.beginPath();
      for(let i=0; i<data.length; i++) {
        const a = i/data.length*2*Math.PI, amp = (data[i]+1)/2,
              r = S*(0.5+0.5*amp), x = cx+Math.cos(a)*r, y = cy+Math.sin(a)*r;
        i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  },

  polygon(data, t, params, ctx, width, height) {
    const {symmetry=1, visualLFOs, polygonSides=4} = params, S=0.4*width, cx=width/2, cy=height/2;
    const angStep=2*Math.PI/symmetry, rot=(visualLFOs?.[0]?.rate||0.005)*t;
    for(let s=0; s<symmetry; s++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(s*angStep+rot); ctx.translate(-cx, -cy);
      ctx.beginPath();
      for(let i=0; i<data.length; i++) {
        const p = i/data.length, amp = (data[i]+1)/2, sideIdx = Math.floor(p*polygonSides),
              sideProg = (p*polygonSides)%1,
              a1 = sideIdx/polygonSides*2*Math.PI, a2 = (sideIdx+1)/polygonSides*2*Math.PI,
              x1 = Math.cos(a1)*S, y1 = Math.sin(a1)*S,
              x2 = Math.cos(a2)*S, y2 = Math.sin(a2)*S,
              x = x1+(x2-x1)*sideProg, y = y1+(y2-y1)*sideProg,
              len = Math.hypot(x,y), modLen = len*(0.7+0.3*amp),
              fx = cx+(x/len)*modLen, fy = cy+(y/len)*modLen;
        i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  },

  layers(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, layers=3, cx=width/2, cy=height/2, baseSize=0.4*width;
    for(let l=0; l<layers; l++) {
      ctx.save(); ctx.globalAlpha=0.7-l*0.2;
      ctx.translate(cx, cy);
      ctx.rotate((visualLFOs?.[0]?.rate||0.005)*t*(1+l*0.3)+l*0.05);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      for(let i=0; i<data.length; i++) {
        const a = i/data.length*2*Math.PI, amp = (data[(i+100*l)%data.length]+1)/2,
              r = baseSize*(1-l*0.15)*(0.8+0.2*amp), x = cx+Math.cos(a)*r, y = cy+Math.sin(a)*r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  },

  particles(data, t, params, ctx, width, height, stateParticles=null) {
    const {particleCount=100, particleSize=2, visualLFOs} = params, cx=width/2, cy=height/2, baseRadius=0.4*width;
    let particles = stateParticles;
    if(!particles || particles.length !== particleCount)
      particles = Array.from({length:particleCount},(_,i)=>({
        angle:i/particleCount*2*Math.PI, radius:baseRadius, speed:0.001+0.009*Math.random(), life:Math.random()*1000, size:particleSize*(0.5+Math.random())
      }));
    const rot=(visualLFOs?.[0]?.rate||0.002)*t;
    particles.forEach(p=>{
      p.life+=0.01;
      const audioIdx=Math.floor(p.angle/(2*Math.PI)*data.length)%data.length,
            amp=(data[audioIdx]+1)/2;
      p.radius=baseRadius*(0.8+0.4*amp); p.angle+=p.speed;
      const ang=p.angle+rot, x=cx+Math.cos(ang)*p.radius, y=cy+Math.sin(ang)*p.radius;
      ctx.beginPath(); ctx.arc(x,y,p.size,0,2*Math.PI); ctx.fill();
    });
    return particles;
  },

  // 5. Spiral
  spiral(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, cx=width/2, cy=height/2, turns=5, maxRadius=0.45*width;
    const rotSpeed = (visualLFOs?.[0]?.rate || 0.003) * t;
    ctx.beginPath();
    for(let i=0; i<data.length; i++) {
      const p = i/data.length, amp = (data[i]+1)/2;
      const angle = p * turns * 2 * Math.PI + rotSpeed;
      const r = p * maxRadius * (0.6 + 0.4 * amp);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  },

  // 6. Grid Pulse
  gridPulse(data, t, params, ctx, width, height) {
    const cols = 8, rows = 6, cellW = width / cols, cellH = height / rows;
    const {visualLFOs} = params;
    const pulse = 0.5 + 0.5 * Math.sin((visualLFOs?.[0]?.rate || 0.005) * t);
    for(let y=0; y<rows; y++) {
      for(let x=0; x<cols; x++) {
        const idx = Math.floor((x/cols + y/rows) * 0.5 * data.length) % data.length;
        const amp = (data[idx] + 1) / 2;
        const size = cellW * 0.4 * (0.3 + 0.7 * amp * pulse);
        ctx.beginPath();
        ctx.arc(x*cellW + cellW/2, y*cellH + cellH/2, size, 0, 2*Math.PI);
        ctx.fill();
      }
    }
  },

  // 7. Lissajous
  lissajous(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, cx=width/2, cy=height/2, scale=0.4*Math.min(width, height);
    const a = 3 + 2 * Math.sin((visualLFOs?.[0]?.rate || 0.002) * t); // x freq
    const b = 2 + 2 * Math.cos((visualLFOs?.[1]?.rate || 0.0015) * t); // y freq
    const delta = (visualLFOs?.[1]?.phase || 0);
    ctx.beginPath();
    for(let i=0; i<data.length; i++) {
      const tVal = i/data.length * 2*Math.PI;
      const amp = (data[i]+1)/2;
      const r = scale * (0.7 + 0.3 * amp);
      const x = cx + r * Math.sin(a * tVal + delta);
      const y = cy + r * Math.cos(b * tVal);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  },

  // 8. Waveform
  waveform(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, offsetY = height/2, scale = 0.3*height;
    const phase = (visualLFOs?.[0]?.rate || 0.005) * t;
    ctx.beginPath();
    for(let i=0; i<data.length; i++) {
      const x = (i / data.length) * width;
      const amp = data[i];
      const y = offsetY + Math.sin(amp * Math.PI + phase) * scale * amp;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  },

  // 9. Flower
  flower(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, cx=width/2, cy=height/2, rMax=0.45*Math.min(width, height);
    const petals = 6 + 4 * Math.sin((visualLFOs?.[0]?.rate || 0.002) * t);
    const flutter = 0.2 * Math.sin((visualLFOs?.[1]?.rate || 0.003) * t);
    ctx.beginPath();
    for(let i=0; i<data.length; i++) {
      const theta = i/data.length * 2*Math.PI;
      const amp = (data[i]+1)/2;
      const r = rMax * (Math.sin(petals * theta / 2) + 1) * (0.6 + 0.4 * amp) * (1 + flutter * Math.cos(theta));
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  },

  // 10. Starburst
  starburst(data, t, params, ctx, width, height) {
    const {symmetry=8} = params, cx=width/2, cy=height/2, rOuter=0.48*width, rInner=0.2*width;
    const {visualLFOs} = params;
    const rot = (visualLFOs?.[0]?.rate || 0.004) * t;
    const spikes = symmetry;
    ctx.beginPath();
    for(let i=0; i<spikes; i++) {
      const angle = (i / spikes) * 2*Math.PI + rot;
      const ampIdx = Math.floor((i / spikes) * data.length);
      const amp = (data[ampIdx] + 1) / 2;
      const outerR = rOuter * (0.7 + 0.3 * amp);
      const x1 = cx + Math.cos(angle) * outerR;
      const y1 = cy + Math.sin(angle) * outerR;
      const midAngle = angle + Math.PI / spikes;
      const x2 = cx + Math.cos(midAngle) * rInner;
      const y2 = cy + Math.sin(midAngle) * rInner;
      i === 0 ? ctx.moveTo(x1, y1) : ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath(); ctx.stroke();
  },

  // 11. Hypotrochoid (Spirograph-style)
  hypotrochoid(data, t, params, ctx, width, height) {
    const {visualLFOs} = params, cx=width/2, cy=height/2;
    const R = 0.4 * width, r = R * (0.3 + 0.2 * Math.sin((visualLFOs?.[0]?.rate || 0.002) * t));
    const d = R * (0.5 + 0.5 * Math.cos((visualLFOs?.[1]?.rate || 0.001) * t));
    const numPoints = 200;
    ctx.beginPath();
    for(let i=0; i<numPoints; i++) {
      const theta = i / numPoints * 2*Math.PI * 5; // 5 loops
      const ratio = (R - r) / r;
      const x = cx + (R - r) * Math.cos(theta) + d * Math.cos(ratio * theta);
      const y = cy + (R - r) * Math.sin(theta) - d * Math.sin(ratio * theta);
      const audioIdx = Math.floor((theta / (2*Math.PI)) * data.length) % data.length;
      const amp = (data[audioIdx] + 1) / 2;
      const scale = 0.8 + 0.4 * amp;
      const sx = cx + (x - cx) * scale;
      const sy = cy + (y - cy) * scale;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
};

// Generates all randomized visual parameters for a "mode" string
export function generateVisualParams(mode = "radial") {
  const randRange = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(randRange(min, max + 1));
  const randChoice = arr => arr[Math.floor(Math.random() * arr.length)];
  const baseHue = randRange(0, 360);
  const strategies = { analogous: [0,30,60], triadic: [0,120,240], complementary: [0,180,0] };
  const strat = randChoice(Object.keys(strategies)), offsets = strategies[strat];
  const palette = offsets.map(o => `hsla(${(baseHue+o)%360},90%,60%,0.85)`);
  const bgColor = `hsl(${baseHue},20%,${randRange(5,12)}%)`;

  const baseModes = Object.keys(drawFuncs);
  const selectedMode = mode === "random" ? randChoice(baseModes) : mode;

  return {
    palette,
    bgColor,
    baseShape: selectedMode,
    symmetry: randInt(1, 8),
    visualLFOs: [
      { type: 'rotation', rate: randRange(0.001, 0.01), depth: Math.PI * 2, phase: randRange(0, 2*Math.PI) },
      { type: 'hueShift', rate: randRange(0.0005, 0.005), depth: 360, phase: randRange(0, 2*Math.PI) }
    ],
    polygonSides: selectedMode === 'polygon' ? randInt(3, 9) : 4,
    particleCount: selectedMode === 'particles' ? randInt(50, 200) : 0,
    particleSize: randRange(1, 4)
  };
}
// visor-js/grain.js
export function grain(geom, nCtx, CFG, noise) {
    const { w, h } = geom.visor;
    noise.width = w; noise.height = h;
    const o = nCtx.getImageData(0, 0, w, h), alpha = CFG.flashing ? 25 : 12;
    for (let i = 0; i < o.data.length; i += 4) o.data[i] = o.data[i + 1] = o.data[i + 2] = Math.random() * 255 | 0, o.data[i + 3] = alpha;
    nCtx.putImageData(o, 0, 0);
    nCtx.save();
    nCtx.globalCompositeOperation = "destination-in";
    nCtx.beginPath();
    nCtx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    nCtx.fill();
    nCtx.restore();
  }
  
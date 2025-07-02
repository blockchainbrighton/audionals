// visor-js/geometry.js
export function updateGeometry(helmetElem, visorRel, geom, canvasParent, noise) {
    const e = devicePixelRatio || 1, o = canvasParent.clientWidth;
    const n = helmetElem.getBoundingClientRect(), i = canvasParent.getBoundingClientRect();
    Object.assign(geom.helmet, { w: n.width, h: n.height, x: n.left - i.left, y: n.top - i.top });
    Object.assign(geom.visor, {
      w: geom.helmet.w * visorRel.w,
      h: geom.helmet.h * visorRel.h,
      x: geom.helmet.x + geom.helmet.w * visorRel.x,
      y: geom.helmet.y + geom.helmet.h * visorRel.y
    });
    noise.width = geom.visor.w; noise.height = geom.visor.h;
    return { scale: e, size: o };
  }
  
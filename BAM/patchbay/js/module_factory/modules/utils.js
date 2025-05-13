// js/modules/utils.js
export function makeLoader(name, fnName = `create${capitalize(name)}Module`) {
    return (audioCtx, parentEl, id) =>
      import(`./${name}.js`)
        .then(m => m[fnName](audioCtx, parentEl, id));
  }
  
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  
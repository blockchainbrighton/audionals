// timeline--stringify-serialiser.js

// one-off helper to convert any existing timeline → string
export const stringify = arr =>
  arr.map(({effect, param, from, to, startBar, endBar, ...rest}) => {
    const code = Object.entries(MAP).find(([,v])=>v.effect===effect)?.[0];
    const tail = Object.keys(rest).length ? ':'+JSON.stringify(rest).slice(1,-1) : '';
    return `${code}${from}-${to}@${startBar}-${endBar}${tail}`;
  }).join(',');
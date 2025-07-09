// utils.js
// Helper Files for various modules

// DOM
export const $ = s => document.getElementById(s) || document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

// Colors
export const cellBg = (i, col) => i === 0 ? 'rgba(0,0,0,0)' : `rgb(${col[0]},${col[1]},${col[2]})`;
export const hexToRgbArr = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// 2D grid
export const cloneGrid = grid => grid.map(r => [...r]);
export const clearGrid = arr => arr.forEach(a => a.fill(0));
export const flattenGrid = arr => arr.flat();

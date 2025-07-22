// settingsPanel.js
let expandedSections = new Set(['shooting']);

const _c = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      // Special case for dataset
      if (k === 'dataset') for (const dk in v) el.dataset[dk] = v[dk];
      // Normal props
      else el[k] = v;
    }
    kids.flat().forEach(child =>
      child && (child instanceof Node
        ? el.appendChild(child)
        : el.appendChild(document.createTextNode(child)))
    );
    return el;
  };
  
const slider = (o, k, min, max, step = .01) => Object.assign(_c('input', { type: 'range', min, max, step, value: o[k], style: 'width:120px' }), { oninput: e => o[k] = +e.target.value });
const colorPick = (o, k) => Object.assign(_c('input', { type: 'color', value: o[k], style: 'padding:0;height:18px;width:30px;background:none;border:none;' }), { oninput: e => o[k] = e.target.value });
const checkbox = (o, k) => Object.assign(_c('input', { type: 'checkbox', checked: !!o[k] }), { onchange: e => o[k] = e.target.checked });

const select = (o, k, ...opts) => {
    const sel = _c('select');
    opts.forEach(opt => {
      const option = document.createElement('option');
      option.value = option.textContent = opt;
      sel.appendChild(option);
    });
    sel.value = o[k];
    sel.onchange = e => o[k] = sel.value;
    return sel;
  };
  
  const addRow = (par, lab, inp) => par.appendChild(_c('div', { style: 'margin:4px 0;display:flex;align-items:center;justify-content:space-between;gap:6px;' }, _c('label', { textContent: lab }), inp));

export function buildSettingsPanel(config) {
  let p = document.getElementById('settingsPanel');
  if (!p) { p = document.createElement('div'); p.id = 'settingsPanel'; p.style.cssText = 'position:fixed;top:10px;right:10px;width:300px;max-height:95vh;overflow-y:auto;background:#111a;color:#eee;font-size:11px;font-family:monospace;border:1px solid #555;padding:8px 12px;border-radius:4px;z-index:9999;'; document.body.appendChild(p); }
  p.innerHTML = '';
  const colors = ['#ff8c69', '#87cefa', '#98fb98', '#f0e68c', '#dda0dd', '#ffb6c1', '#20b2aa', '#ffa07a', '#c71585', '#6a5acd', '#deb887', '#5f9ea0'];
  let i = 0;
  Object.entries(config).forEach(([k, cfg], idx) => {
    const h = _c('h4', { textContent: k[0].toUpperCase() + k.slice(1), style: `margin:12px 0 4px 0;border-bottom:1px solid #444;padding-bottom:2px;cursor:pointer;user-select:none;color:${colors[i++%colors.length]}` });
    const content = _c('div', { className: 'collapsible-content', dataset: { key: k }, style: `display:${expandedSections.has(k)||idx===0?'block':'none'}` });
    h.onclick = () => (content.style.display = content.style.display === 'none' ? 'block' : 'none', expandedSections[content.style.display === 'block' ? 'add' : 'delete'](k));
    p.append(h, content);

    const S = (lab, ...args) => addRow(content, lab, slider(cfg, ...args));
    const C = (lab, ...args) => addRow(content, lab, colorPick(cfg, ...args));
    const B = (lab, ...args) => addRow(content, lab, checkbox(cfg, ...args));
    const SEL = (lab, ...args) => addRow(content, lab, select(cfg, ...args));
    switch (k) {
      case 'shooting': case 'meteor': case 'comet':
        S('spawnRate', 'spawnRate', 0, .1, .001); S('maxCount', 'maxCount', 1, 100, 1); S('speedMin', 'speedMin', 0, 5, .05); S('speedMax', 'speedMax', 0, 5, .05);
        S('sizeStart', 'sizeStart', .5, 5, .1); S('sizeEnd', 'sizeEnd', .5, 5, .1); S('trailLen', 'trailLen', 0, 50, 1); S('trailFadePow', 'trailFadePow', .1, 3, .1);
        SEL('colorMode', 'colorMode', 'white', 'silver', 'gold', 'rainbow', 'fire', 'ice', 'custom'); B('trail', 'trail'); break;
      case 'rocket':
        S('speed', 'speed', .1, 2, .05); S('startX', 'startX', 0, 63, 1); S('startY', 'startY', 0, 63, 1); S('trailLen', 'trailLen', 1, 100, 1); S('trailFadePow', 'trailFadePow', .1, 3, .1);
        SEL('colorMode', 'colorMode', 'fire', 'ice', 'white', 'rainbow'); break;
      case 'aurora':
        S('bandCount', 'bandCount', 1, 10, 1); S('yBase', 'yBase', 0, 32, 1); S('ySpread', 'ySpread', 0, 10, .5); S('amplitudeMin', 'amplitudeMin', 0, 10, .5); S('amplitudeMax', 'amplitudeMax', 0, 15, .5);
        S('speedMin', 'speedMin', 0, .1, .005); S('speedMax', 'speedMax', 0, .1, .005); S('waveFreq', 'waveFreq', .05, 1, .01); S('alpha', 'alpha', 0, .5, .01);
        SEL('colorMode', 'colorMode', 'green', 'rainbow'); S('lineWidth', 'lineWidth', 1, 5, 1); break;
      case 'lightning':
        S('chance', 'chance', 0, .02, .0001); S('forks', 'forks', 1, 20, 1); S('flashAlpha', 'flashAlpha', 0, 1, .05); S('duration', 'duration', 1, 30, 1); C('color', 'color'); break;
      case 'dayNight':
        S('speed', 'speed', .0001, .002, .0001); S('peakTime', 'peakTime', .1, .9, .01); C('dayTop', 'dayTop'); C('dayHorizon', 'dayHorizon'); C('horizonPeakColor', 'horizonPeakColor');
        C('nightTop', 'nightTop'); C('nightHorizon', 'nightHorizon'); C('sunColorStart', 'sunColorStart'); C('sunColorEnd', 'sunColorEnd'); break;
      case 'moon':
        S('speed', 'speed', .00005, .0005, .00005); S('yAmplitude', 'yAmplitude', 10, 70, 1); S('radiusMin', 'radiusMin', .5, 5, .1); S('radiusMax', 'radiusMax', 1, 10, .1);
        C('color1', 'color1'); C('color2', 'color2'); S('daytimeAlpha', 'daytimeAlpha', 0, 1, .01); break;
      case 'solar':
        S('speed', 'speed', .0001, .001, .0001); S('sunRadius', 'sunRadius', 1, 10, .5); S('orbitalLineWidth', 'orbitalLineWidth', 0, 5, .5); S('orbitalLineOpacity', 'orbitalLineOpacity', 0, 1, .05);
        cfg.planets.forEach((p,i) => { const pd = _c('div', { style: 'border:1px solid #555;padding:4px;margin:4px 0;' }); addRow(pd, `Planet${i+1} Radius`, slider(p, 'r', .5, 5, .1)); addRow(pd, `Planet${i+1} Distance`, slider(p, 'd', 5, 30, .5)); addRow(pd, `Planet${i+1} Speed`, slider(p, 's', .001, .05, .001)); addRow(pd, `Planet${i+1} Color`, colorPick(p, 'c')); content.appendChild(pd); }); break;
      case 'clouds':
        S('count', 'count', 1, 10, 1); S('speedMin', 'speedMin', .01, .2, .005); S('speedMax', 'speedMax', .01, .2, .005); S('waveAmp', 'waveAmp', 0, 5, .25);
        const t = _c('input', { type: 'text', value: cfg.color, style: 'width:120px' }); t.onchange = e => cfg.color = t.value; addRow(content, 'color', t); break;
      case 'stars':
        S('count', 'count', 1, 100, 1); S('twinkleSpeedMin', 'twinkleSpeedMin', .005, .1, .005); S('twinkleSpeedMax', 'twinkleSpeedMax', .005, .1, .005); break;
      case 'land':
        S('baseHeight', 'baseHeight', 10, 50, 1); S('amplitude', 'amplitude', 0, 15, .5); S('random', 'random', 0, 10, .5); C('colorBack', 'colorBack'); C('colorTop', 'colorTop'); break;
    }
  });
}

export function toggleSettingsPanel(config) {
  const p = document.getElementById('settingsPanel'), btn = document.getElementById('settingsBtn');
  p ? (p.remove(), btn.textContent = 'Show Settings') : (buildSettingsPanel(config), btn.textContent = 'Hide Settings');
}

(async () => {
  // Tuneful Seed Finder v2.0 — “Character Seed” + Color Filter
  // Keeps your two audio categories:
  //   1) Sparse & Harmonious (scale-fit + consonance, with min hit-rate to alg 11)
  //   2) High-Pause (>50% shapes not mapped to alg 11)
  // Adds optional COLOR SEARCH gates:
  //   - mono  : palette must be Mono and the mono color === TARGET_COLOR
  //   - half  : ≥ MIN_FRACTION of shapes use TARGET_COLOR (or generator picked it as dominant half)
  //   - group : ≥ MIN_GROUP shapes use TARGET_COLOR
  //   - palette filter: Any / Standard / Dark / Neutral
  //
  // Toggle and tune in the CONFIG section below.

  // =================== CONFIG ===================
  const TOTAL_SEEDS = 100000;
  const BATCH_SIZE  = 100;
  const KEEP_TOP    = 1000;
  const RNG_CHARS   = "0123456789abcdefghijklmnopqrstuvwxyz";

  // AUDIO target: shapes mapped to alg 11
  const TARGET_ALGORITHMS = new Set([11]);

  // Audio gates
  const MIN_HITRATE_FOR_SPARSE = 0.25; // need some melodic algorithm presence
  const MIN_PALETTE_FALLBACK = 3;      // allow smaller pitch-class palettes for the sparse check

  // COLOR SEARCH (set enabled:false to ignore colors entirely)
  const COLOR_SEARCH = {
    enabled: true,
    mode: 'mono',           // 'mono' | 'half' | 'group' | 'any'
    targetColor: 'royal_blue',
    palette: 'any',         // 'any' | 'standard' | 'dark' | 'neutral'
    minGroup: 8,            // for mode: 'group'
    minFraction: 0.5        // for mode: 'half'
  };

  // =================== MUSIC HELPERS (unchanged) ===================
  const NOTE_BASE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const toMidi = (note) => {
    if (!note || typeof note !== 'string') return null;
    const m = note.match(/^([A-G])([#b]?)(-?\d+)$/i); if (!m) return null;
    const [, L, acc, octStr] = m;
    let s = NOTE_BASE[L.toUpperCase()];
    if (acc === '#') s += 1; else if (acc === 'b') s -= 1;
    const octave = parseInt(octStr, 10);
    return 12 * (octave + 1) + s;
  };

  const MAJOR=[0,2,4,5,7,9,11], MINOR=[0,2,3,5,7,8,10];
  const rotatePC = (pcs, t) => pcs.map(x => (x + t) % 12);
  const scaleFitScore = (pcs, tmpl) => {
    let best = -Infinity, bestKey = 0;
    for (let t=0; t<12; t++) {
      const set = new Set(rotatePC(tmpl, t));
      let hits = 0, misses = 0;
      for (const p of pcs) set.has(p) ? hits++ : misses++;
      const s = hits - 0.35 * misses;
      if (s > best) { best = s; bestKey = t; }
    }
    return { score: best, key: bestKey, template: tmpl };
  };

  const INTERVAL_SCORE = {0:1.0,1:-0.55,2:-0.25,3:0.75,4:0.85,5:0.60,6:-0.80,7:0.95,8:0.35,9:0.55,10:-0.35,11:-0.55};
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const sum  = a => a.reduce((x,y)=>x+y,0);

  // =================== SHAPE KEYS (unchanged) ===================
  const safeGetShapeKeys = () => {
    try {
      if (window.app?.state?.presets && Object.keys(window.app.state.presets).length) return Object.keys(window.app.state.presets);
      return ['circle','square','triangle','star','hex','wave','ring','burst','coil','loop','arc','petal'];
    } catch {
      return ['circle','square','triangle','star','hex','wave','ring','burst','coil','loop','arc','petal'];
    }
  };
  const SHAPE_KEYS = safeGetShapeKeys();
  const ALL_KEYS = SHAPE_KEYS.includes('hum') ? SHAPE_KEYS : ['hum', ...SHAPE_KEYS];

  // =================== RNG + ENGINE-MATCHING FNS (unchanged) ===================
  const _rng = s => { let a = 0x6d2b79f5 ^ s.length; for (let i=0;i<s.length;i++) a = Math.imul(a ^ s.charCodeAt(i), 2654435761); return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000); };
  const deterministicPreset = (seed, shape) => {
    const r = _rng(`${seed}_${shape}`), types = ['sine','triangle','square','sawtooth'], notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const m = r(), mode = m < .18 ? 0 : m < .56 ? 1 : m < .85 ? 2 : 3;
    const cnt = (mode === 3 ? 2 + (r() > .7 ? 1 : 0) : 1 + (r() > .6 ? 1 : 0));
    const oscs = Array.from({ length: cnt }, () => [types[(r() * types.length) | 0], notes[(r() * notes.length) | 0]]);
    return { osc1: oscs[0], osc2: oscs[1] || null };
  };

  const _getUniqueAlgorithmMapping = (seed) => {
    const r = _rng(`${seed}_unique_algo_mapping`), keys = ALL_KEYS, n = keys.length;
    const base = [1,2,3,4,5,6,7,8,9,10,11], pool = [];
    while (pool.length < n) pool.push(...base);
    pool.length = n;
    for (let i = pool.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const m = {}; keys.forEach((k, i) => m[k] = pool[i]); return m;
  };

  // =================== AUDIO SCORING (unchanged) ===================
  function scoreSparseAndHarmonious(seed) {
    const presets = SHAPE_KEYS.map(k => deterministicPreset(seed, k));
    const pcsAll = new Set();
    for (const p of presets) {
      const m1 = toMidi(p.osc1?.[1]); if (m1 != null) pcsAll.add(m1 % 12);
      const m2 = toMidi(p.osc2?.[1]); if (m2 != null) pcsAll.add(m2 % 12);
    }
    if (pcsAll.size < MIN_PALETTE_FALLBACK) return { score: 0, details: null };

    const pcs = Array.from(pcsAll);
    const fitMaj = scaleFitScore(pcs, MAJOR);
    const fitMin = scaleFitScore(pcs, MINOR);
    const best = (fitMaj.score >= fitMin.score) ? fitMaj : fitMin;
    const scaleSet = new Set(rotatePC(best.template, best.key));
    const scaleName = `${best.template===MAJOR?'Major':'Minor'} @ ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][best.key]}`;

    const stepIntervals = [];
    presets.forEach(p => {
      const m1 = toMidi(p.osc1?.[1]), m2 = toMidi(p.osc2?.[1]);
      if (m1 != null && m2 != null && scaleSet.has(m1%12) && scaleSet.has(m2%12)) {
        stepIntervals.push(Math.abs(m2 - m1) % 12);
      }
    });

    const k = pcsAll.size;
    const sparsityScore = Math.exp(-Math.pow((k - 4) / 1.5, 2));              // centered at 4 notes
    const scaleFit = clamp01(best.score / Math.max(3, k));
    const consRaw = stepIntervals.length ? sum(stepIntervals.map(ic => INTERVAL_SCORE[ic] ?? 0)) / stepIntervals.length : 0;
    const consonance = clamp01((consRaw + 0.8) / 1.8);
    const harmonyScore = 0.6 * scaleFit + 0.4 * consonance;

    return { score: sparsityScore * harmonyScore,
             details: { scaleName, uniquePCs: k, sparsity: sparsityScore, harmony: harmonyScore, scaleFit, consonance } };
  }

  function analyzeSeedAudio(seed) {
    const map = _getUniqueAlgorithmMapping(seed);
    let hits = 0;
    for (const key of SHAPE_KEYS) if (TARGET_ALGORITHMS.has(map[key])) hits++;
    const hitRate = SHAPE_KEYS.length ? (hits / SHAPE_KEYS.length) : 0;

    // Sparse & Harmonious
    let sparseResult = { seed, score: 0, hitRate: (hitRate*100).toFixed(0)+'%', uniquePCs: 'n/a', scale: 'n/a', details: 'n/a' };
    if (hitRate >= MIN_HITRATE_FOR_SPARSE) {
      const sparse = scoreSparseAndHarmonious(seed);
      if (sparse.details) {
        const d = sparse.details;
        sparseResult = {
          seed,
          score: +(sparse.score).toFixed(4),
          hitRate: (hitRate*100).toFixed(0)+'%',
          uniquePCs: d.uniquePCs,
          scale: d.scaleName,
          details: `sparsity:${(d.sparsity*100|0)}% harmony:${(d.harmony*100|0)}%`
        };
      }
    }

    // High Pauses
    const pauseRate = 1.0 - hitRate;
    let pauseResult = { seed, score: 0, pauseRate: '0%', details: `${SHAPE_KEYS.length-hits}/${SHAPE_KEYS.length} pauses` };
    if (pauseRate > 0.5) {
       pauseResult = {
         seed,
         score: +pauseRate.toFixed(4),
         pauseRate: (pauseRate*100).toFixed(0)+'%',
         details: `${SHAPE_KEYS.length-hits}/${SHAPE_KEYS.length} pauses`
       };
    }

    return { sparseResult, pauseResult };
  }

  // =================== COLOR ENGINE (added) ===================
  // Probabilities + weights match the oscilloscope visual generator family.
  const PROB = {
    "mono-prob": 0.02,
    "half-dominant-prob": 0.05,
    "group-strobe-prob": 0.01,
    "dark-palette-prob": 0.01,
    "neutral-palette-prob": 0.05
  };
  const EFFECT_WEIGHTS = { none:60, glow:25, strobe:10, neon:5 };
  const COLOR_WEIGHTS = {
    bitcoin_orange:3, stacks_purple:2, deep_purple:2, light_magenta:3, shocking_pink:4,
    royal_blue:10, dark_green:3, bright_pink:6, bright_red:12, dark_red:6,
    bright_yellow:1, gold:1, white:3, dark_gray:2, cycler:3
  };
  const DARK_COLOR_WEIGHTS = {
    extra_dark_purple:2, very_dark_blue:2, very_dark_green:3, dark_red:5, extra_dark_gray:3, charcoal:2, near_black:1, gold:1
  };
  const NEUTRAL_COLOR_WEIGHTS = {
    near_black:4, extra_dark_gray:5, charcoal:5, dark_gray:5, slate_gray:4, dim_gray:4, silver:3, gainsboro:3, off_white:4, white:3
  };
  const HALF_DOMINANT_RATIO = 0.5;

  const _rngEnsure = s => { let t=0; for (let i=0;i<s.length;i++) t=(t<<5)-t+s.charCodeAt(i); t|=0; return () => { t = (t + 1831565813)|0; let e = Math.imul(t ^ (t>>>15), 1|t); e = e + Math.imul(e ^ (e>>>7), 61|e) ^ e; return ((e ^ (e>>>14))>>>0) / 4294967296; }; };
  const pickWeightedKey = (rng, weights) => {
    const keys = Object.keys(weights); if (!keys.length) return null;
    const total = keys.reduce((s,k)=>s+(weights[k]||0),0); if (total<=0) return keys[0];
    let r = rng()*total; for (const k of keys){ r -= (weights[k]||0); if (r<=0) return k; }
    return keys[keys.length-1];
  };
  const chooseSubset = (rng, arr, count) => {
    const A=[...arr]; for (let i=A.length-1;i>0;i--){ const j=(rng()*(i+1))|0; [A[i],A[j]]=[A[j],A[i]]; }
    return A.slice(0,count);
  };

  function generateVisualTraits(seed, {withMaps=false}={}) {
    const sounds = ALL_KEYS; // color keyed by sound/shape names (incl. 'hum')
    const isMono = _rngEnsure(`${seed}::mode::mono`)() < PROB["mono-prob"];
    const isNeutral = !isMono && _rngEnsure(`${seed}::mode::neutral`)() < PROB["neutral-palette-prob"];
    const isDark = !isMono && !isNeutral && _rngEnsure(`${seed}::mode::dark`)() < PROB["dark-palette-prob"];
    const isHalf = !isMono && _rngEnsure(`${seed}::mode::half`)() < PROB["half-dominant-prob"];
    const isGroupStrobe = _rngEnsure(`${seed}::mode::gStrobe`)() < PROB["group-strobe-prob"];
    const groupStrobeAll = isGroupStrobe && (_rngEnsure(`${seed}::mode::gStrobeType`)() < 0.5);

    const activeWeights = isNeutral ? NEUTRAL_COLOR_WEIGHTS : (isDark ? DARK_COLOR_WEIGHTS : COLOR_WEIGHTS);
    const halfDominantKey = isHalf ? pickWeightedKey(_rngEnsure(`${seed}::halfColorPick`), activeWeights) : null;
    const monoColor = isMono ? pickWeightedKey(_rngEnsure(`${seed}::monoColorPick`), activeWeights) : null;
    const halfSet = isHalf ? new Set(chooseSubset(_rngEnsure(`${seed}::halfSubset`), sounds, Math.max(1, Math.round(sounds.length*HALF_DOMINANT_RATIO)))) : new Set();

    const perShapeColorKey = {};
    const perShapeEffectKey = {};
    for (const k of sounds) {
      perShapeColorKey[k] = isMono ? monoColor
        : (isHalf && halfSet.has(k) ? halfDominantKey
           : pickWeightedKey(_rngEnsure(`${seed}::color::${k}`), activeWeights));
      perShapeEffectKey[k] = pickWeightedKey(_rngEnsure(`${seed}::effect::${k}`), EFFECT_WEIGHTS) ?? 'none';
    }
    if (isGroupStrobe) {
      const subset = groupStrobeAll ? new Set(sounds)
                  : new Set(chooseSubset(_rngEnsure(`${seed}::gStrobe::subset`), sounds, Math.max(1, Math.round(sounds.length*(0.5 + 0.5*_rngEnsure(`${seed}::gStrobe::size`)())))));
      for (const k of subset) perShapeEffectKey[k] = 'strobe';
    }

    const colors = Object.values(perShapeColorKey);
    const effects = Object.values(perShapeEffectKey);
    const paletteType = isMono ? 'Mono' : (isNeutral ? 'Neutral' : (isDark ? 'Dark' : 'Standard'));

    const visual = {
      paletteType,
      dominantColor: halfDominantKey || 'N/A',
      numColors: new Set(colors).size
    };
    if (withMaps) {
      visual.perShapeColorKey = perShapeColorKey;
      visual.perShapeEffectKey = perShapeEffectKey;
      visual.monoColor = monoColor;
      visual.isHalf = isHalf;
    }
    return visual;
  }

  function matchesPaletteFilter(visual, filter) {
    if (filter==='any') return true;
    if (filter==='standard') return visual.paletteType==='Standard';
    if (filter==='dark') return visual.paletteType==='Dark';
    if (filter==='neutral') return visual.paletteType==='Neutral';
    return true;
  }

  function matchesColorCriteria(seed, cfg) {
    if (!cfg.enabled || cfg.mode==='any') return true;
    const v = generateVisualTraits(seed, { withMaps:true });
    if (!matchesPaletteFilter(v, cfg.palette)) return false;

    const map = v.perShapeColorKey;
    const vals = Object.values(map);
    const count = vals.filter(c => c === cfg.targetColor).length;

    if (cfg.mode === 'mono') {
      return v.paletteType==='Mono' && v.monoColor === cfg.targetColor;
    }
    if (cfg.mode === 'half') {
      const frac = count / vals.length;
      const declared = v.isHalf && v.dominantColor === cfg.targetColor;
      return declared || frac >= (cfg.minFraction ?? 0.5);
    }
    // group
    return count >= (cfg.minGroup ?? 8);
  }

  // =================== CSV helper (unchanged) ===================
  function downloadCSV(data, filename) {
    if (!data || data.length === 0) return;
    const replacer = (key, value) => value === null ? '' : value;
    const header = Object.keys(data[0]);
    let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8,' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =================== RUN (batched) ===================
  const resultsSparse = [];
  const resultsPauses = [];
  const seen = new Set();
  const randSeed = () => Array.from({length:8}, () => RNG_CHARS[(Math.random()*36)|0]).join('');

  const t0 = performance.now();
  console.log(`Searching ${TOTAL_SEEDS} seeds for audio categories${COLOR_SEARCH.enabled ? ` with color filter (${COLOR_SEARCH.mode} • ${COLOR_SEARCH.targetColor} • palette:${COLOR_SEARCH.palette})` : ''}…`);

  let lastLoggedPercent = -1;

  for (let i = 0; i < TOTAL_SEEDS; i++) {
    let s; do { s = randSeed(); } while (seen.has(s)); seen.add(s);

    // Color pre-filter (cheap reject) — only keep seeds that match color criteria
    if (COLOR_SEARCH.enabled && !matchesColorCriteria(s, COLOR_SEARCH)) {
      if ((i + 1) % BATCH_SIZE === 0) await new Promise(r => setTimeout(r, 0));
      continue;
    }

    // Audio analysis (as before)
    const { sparseResult, pauseResult } = analyzeSeedAudio(s);
    if (sparseResult.score > 0) resultsSparse.push(sparseResult);
    if (pauseResult.score > 0) resultsPauses.push(pauseResult);

    const percentComplete = Math.floor(((i + 1) / TOTAL_SEEDS) * 100);
    if (percentComplete > lastLoggedPercent) {
      console.log(`Searching… ${percentComplete}% complete.`);
      lastLoggedPercent = percentComplete;
    }
    if ((i + 1) % BATCH_SIZE === 0) await new Promise(r => setTimeout(r, 0));
  }
  const t1 = performance.now();

  // =================== REPORT ===================
  console.log(`%cCharacter Seed Finder — Complete`,'font-weight:bold;');
  console.log(`Tried ${TOTAL_SEEDS} seeds in ${(t1 - t0).toFixed(0)}ms.`);
  if (COLOR_SEARCH.enabled) {
    console.log(`Color gate used → mode=${COLOR_SEARCH.mode}, color=${COLOR_SEARCH.targetColor}, palette=${COLOR_SEARCH.palette}${COLOR_SEARCH.mode==='group' ? `, minGroup=${COLOR_SEARCH.minGroup}` : ''}${COLOR_SEARCH.mode==='half' ? `, minFraction=${COLOR_SEARCH.minFraction}` : ''}`);
  }

  // 1) Sparse & Harmonious (filtered by color if enabled)
  resultsSparse.sort((a,b)=>b.score - a.score);
  const topSparse = resultsSparse.slice(0, KEEP_TOP);
  if (topSparse.length > 0) {
    const bankSparse = topSparse.map(r => r.seed).join(' ');
    console.log(`\n%c--- Top ${topSparse.length} Sparse & Harmonious Seeds ${COLOR_SEARCH.enabled? '(color-matched)':''} ---`,'font-weight:bold; color: #8f8;');
    console.log(`(Copy this line):`);
    console.log(bankSparse);
    const tableSparse = topSparse.map((r,i)=>({'#':i+1, ...r}));
    console.table(tableSparse);
    downloadCSV(tableSparse, `top_${KEEP_TOP}_sparse${COLOR_SEARCH.enabled?`_${COLOR_SEARCH.mode}_${COLOR_SEARCH.targetColor}`:''}.csv`);
  } else {
    console.log('\n%c--- No qualifying Sparse & Harmonious seeds found. ---','color: #f88;');
  }

  // 2) High-Pause (>50%) (filtered by color if enabled)
  resultsPauses.sort((a,b)=>b.score - a.score);
  const topPauses = resultsPauses.slice(0, KEEP_TOP);
  if (topPauses.length > 0) {
    const bankPauses = topPauses.map(r => r.seed).join(' ');
    console.log(`\n%c--- Top ${topPauses.length} High-Pause Seeds ${COLOR_SEARCH.enabled? '(color-matched)':''} ---`,'font-weight:bold; color: #88f;');
    console.log(`(Copy this line):`);
    console.log(bankPauses);
    const tablePauses = topPauses.map((r,i)=>({'#':i+1, ...r}));
    console.table(tablePauses);
    downloadCSV(tablePauses, `top_${KEEP_TOP}_high_pauses${COLOR_SEARCH.enabled?`_${COLOR_SEARCH.mode}_${COLOR_SEARCH.targetColor}`:''}.csv`);
  } else {
    console.log('\n%c--- No qualifying High-Pause seeds found. ---','color: #f88;');
  }

  return { topSparse, topPauses };
})();

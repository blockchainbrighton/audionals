/**
 * Main JavaScript file for website interactions and enhancements.
 * Features: Mobile Navigation, Animations, Audio Playback, Filtering, Quantize, UI Effects.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
  
    const neonRowColors = [
      'hsl(180, 100%, 50%)', 'hsl(300, 100%, 50%)', 'hsl(120, 100%, 50%)',
      'hsl(60, 100%, 50%)', 'hsl(0, 100%, 50%)', 'hsl(30, 100%, 50%)',
      'hsl(240, 100%, 60%)', 'hsl(330, 100%, 55%)', 'hsl(90, 100%, 50%)',
      'hsl(210, 100%, 55%)', 'hsl(30, 95%, 60%)', 'hsl(150, 100%, 50%)',
      'hsl(270, 100%, 60%)', 'hsl(45, 100%, 50%)', 'hsl(3, 100%, 60%)',
      'hsl(195, 100%, 50%)', 'hsl(315, 100%, 50%)', 'hsl(75, 100%, 50%)',
      'hsl(285, 90%, 60%)', 'hsl(15, 100%, 55%)', 'hsl(255, 100%, 65%)',
      'hsl(135, 90%, 55%)', 'hsl(345, 100%, 58%)', 'hsl(170, 95%, 50%)',
      'hsl(50, 100%, 55%)'
    ];
  
    // Audio Context setup
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    let audioContext = null;
    try { audioContext = AudioCtx && new AudioCtx(); }
    catch (e) { console.error('Failed to create AudioContext:', e); }
    if (!audioContext) console.warn('Web Audio API not supported by this browser.');
    else console.log(`AudioContext created. Initial state: ${audioContext.state}`);
  

    // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
    let sampleData = [
        { src: 'audio/KP_ABkit_113bpm_A1.webm', title: 'KP ABkit A1', details: '113 BPM | ABkit', category: 'abkit' },
        { src: 'audio/KP_ABkit_113bpm_A2.webm', title: 'KP ABkit A2', details: '113 BPM | ABkit', category: 'abkit' },
        { src: 'audio/KP_ABkit_113bpm_A3.webm', title: 'KP ABkit A3', details: '113 BPM | ABkit', category: 'abkit' },
        { src: 'audio/KP_ATHENSkit_124_A1.webm', title: 'KP ATHENSkit A1', details: '124 BPM | ATHENSkit', category: 'athenskit' },
        { src: 'audio/KP_ATHENSkit_124_A2.webm', title: 'KP ATHENSkit A2', details: '124 BPM | ATHENSkit', category: 'athenskit' },
        { src: 'audio/KP_ATHENSkit_124_A3.webm', title: 'KP ATHENSkit A3', details: '124 BPM | ATHENSkit', category: 'athenskit' },
        { src: 'audio/KP_CRIMkitB_86bpm_B1.webm', title: 'KP CRIMkit B1', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_CRIMkitB_86bpm_B2.webm', title: 'KP CRIMkit B2', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_CRIMkitB_86bpm_B3.webm', title: 'KP CRIMkit B3', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_CRIMkit_86bpm_A1.webm', title: 'KP CRIMkit A1', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_CRIMkit_86bpm_A2.webm', title: 'KP CRIMkit A2', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_CRIMkit_86bpm_A3.webm', title: 'KP CRIMkit A3', details: '86 BPM | CRIMkit', category: 'crimkit' },
        { src: 'audio/KP_NAXOUkit_92bpm_A1.webm', title: 'KP NAXOUkit A1', details: '92 BPM | NAXOUkit', category: 'naxoukit' },
        { src: 'audio/KP_NAXOUkit_92bpm_A2.webm', title: 'KP NAXOUkit A2', details: '92 BPM | NAXOUkit', category: 'naxoukit' },
        { src: 'audio/KP_NAXOUkit_92bpm_A3.webm', title: 'KP NAXOUkit A3', details: '92 BPM | NAXOUkit', category: 'naxoukit' },
        { src: 'audio/KP_NOIZEkit_160bpm_A1.webm', title: 'KP NOIZEkit A1', details: '160 BPM | NOIZEkit', category: 'noizekit' },
        { src: 'audio/KP_NOIZEkit_160bpm_A2.webm', title: 'KP NOIZEkit A2', details: '160 BPM | NOIZEkit', category: 'noizekit' },
        { src: 'audio/KP_NOIZEkit_160bpm_A3.webm', title: 'KP NOIZEkit A3', details: '160 BPM | NOIZEkit', category: 'noizekit' },
        { src: 'audio/KP_SUBOOMkit_140bpm_A1.webm', title: 'KP SUBOOMkit A1', details: '140 BPM | SUBOOMkit', category: 'suboomkit' },
        { src: 'audio/KP_SUBOOMkit_140bpm_A2.webm', title: 'KP SUBOOMkit A2', details: '140 BPM | SUBOOMkit', category: 'suboomkit' },
        { src: 'audio/KP_SUBOOMkit_140bpm_A3.webm', title: 'KP SUBOOMkit A3', details: '140 BPM | SUBOOMkit', category: 'suboomkit' },
        { src: 'audio/KP_SwingKit_68bpm_A1.webm', title: 'KP SwingKit A1', details: '68 BPM | Swing', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_A2.webm', title: 'KP SwingKit A2', details: '68 BPM | Swing', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_PianoPerc.webm', title: 'KP SwingKit PianoPerc', details: '68 BPM | Percussion', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_SleepSYNTH.webm', title: 'KP SwingKit SleepSYNTH', details: '68 BPM | Synth', category: 'swing' },
        { src: 'audio/KP_SwingKit_68bpm_WitnessBASS.webm', title: 'KP SwingKit WitnessBASS', details: '68 BPM | Bass', category: 'swing' },
        { src: 'audio/KP_TAPkit_135bpm_A1.webm', title: 'KP TAPkit A1', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_A2.webm', title: 'KP TAPkit A2', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_A3.webm', title: 'KP TAPkit A3', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_B1.webm', title: 'KP TAPkit B1', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_TAPkit_135bpm_B2.webm', title: 'KP TAPkit B2', details: '135 BPM | TAPkit', category: 'tapkit' },
        { src: 'audio/KP_VANkit_127_A1.webm', title: 'KP VANkit A1', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A2.webm', title: 'KP VANkit A2', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A3.webm', title: 'KP VANkit A3', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VANkit_127_A4.webm', title: 'KP VANkit A4', details: '127 BPM | VANkit', category: 'vankit' },
        { src: 'audio/KP_VARKIZAkit_121_A1.webm', title: 'KP VARKIZAkit A1', details: '121 BPM | VARKIZAkit', category: 'varkizakit' },
        { src: 'audio/KP_VARKIZAkit_121_A2.webm', title: 'KP VARKIZAkit A2', details: '121 BPM | VARKIZAkit', category: 'varkizakit' },
        { src: 'audio/KP_VARKIZAkit_121_A3.webm', title: 'KP VARKIZAkit A3', details: '121 BPM | VARKIZAkit', category: 'varkizakit' },
        { src: 'audio/KP_boomkit_100bpm_A1.webm', title: 'KP Boomkit A1', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A2.webm', title: 'KP Boomkit A2', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_100bpm_A3.webm', title: 'KP Boomkit A3', details: '100 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A1.webm', title: 'KP Boomkit A1', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A2.webm', title: 'KP Boomkit A2', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_boomkit_98bpm_A3.webm', title: 'KP Boomkit A3', details: '98 BPM | Boom Bap', category: 'boom-bap' },
        { src: 'audio/KP_caziokit_129bpm_A1.webm', title: 'KP CazioKit A1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_A2.webm', title: 'KP CazioKit A2', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_B1.webm', title: 'KP CazioKit B1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_B2.webm', title: 'KP CazioKit B2', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_C1.webm', title: 'KP CazioKit C1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_C2.webm', title: 'KP CazioKit C2', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_D1.webm', title: 'KP CazioKit D1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_D2.webm', title: 'KP CazioKit D2', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_E1.webm', title: 'KP CazioKit E1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_E2.webm', title: 'KP CazioKit E2', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_F1.webm', title: 'KP CazioKit F1', details: '129 BPM | Breakbeat', category: 'breakbeat' },
        { src: 'audio/KP_caziokit_129bpm_F2.webm', title: 'KP CazioKit F2', details: '129 BPM | Breakbeat', category: 'breakbeat' }
    ];

    let wargasmSamples = [
        // === Wargasm Samples to Play ===
        { src: 'audio/KP_FunKit_101bpm_A1.webm', title: 'KP FunKit A1', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_A2.webm', title: 'KP FunKit A2', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_B1.webm', title: 'KP FunKit B1', details: '101 BPM | FunKit', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_B2.webm', title: 'KP FunKit B2', details: '101 BPM | FunKit', category: 'funkit' },

        { src: 'audio/KP_FunKit_101bpm_Bass1.webm', title: 'KP FunKit Bass1', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass2.webm', title: 'KP FunKit Bass2', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass3.webm', title: 'KP FunKit Bass3', details: '101 BPM | Bass', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_Bass4.webm', title: 'KP FunKit Bass4', details: '101 BPM | Bass', category: 'funkit' },

        { src: 'audio/KP_FunKit_101bpm_arp1.webm', title: 'KP FunKit Arp1', details: '101 BPM | Arp', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_arp2.webm', title: 'KP FunKit Arp2', details: '101 BPM | Arp', category: 'funkit' },
        
        { src: 'audio/KP_FunKit_101bpm_pulse1.webm', title: 'KP FunKit Pulse1', details: '101 BPM | Pulse', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_pulse2.webm', title: 'KP FunKit Pulse2', details: '101 BPM | Pulse', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_synth1.webm', title: 'KP FunKit Synth1', details: '101 BPM | Synth', category: 'funkit' },
        { src: 'audio/KP_FunKit_101bpm_synth2.webm', title: 'KP FunKit Synth2', details: '101 BPM | Synth', category: 'funkit' },
    ];


    

     // =========================================================================
    // --- DYNAMIC SAMPLE CARD GENERATION ---
    // =========================================================================
    const loopPlayers = new Map(); // Shared map for all audio players

    // === Sorting Helper ===
  const getSortKeys = sample => {
    const titleMatch = sample.title.match(/^(KP\s+[\w-]+)\s*(.*)$/i);
    const bpmMatch = typeof sample.details === 'string' && sample.details.match(/^(\d+)\s*BPM/i);
    const kitName = titleMatch?.[1].trim() ?? sample.title;
    const variation = titleMatch?.[2].trim() ?? '';
    const bpm = bpmMatch ? +bpmMatch[1] : 0;
    const groupIdentifier = `${kitName}-${bpm || 'NoBPM'}`;
    const seriesPrefix = variation.match(/^([A-Z])(?:$|\d|\s|_)/)?.[1] ?? '';
    return { kitName, bpm, variation, groupIdentifier, seriesPrefix };
  };

  // Sort samples by groupIdentifier then variation
  const sortSamples = arr => arr.sort((a,b) => {
    const ka = getSortKeys(a), kb = getSortKeys(b);
    const cmp = ka.groupIdentifier.localeCompare(kb.groupIdentifier);
    return cmp !== 0 ? cmp : ka.variation.localeCompare(kb.variation, undefined, {numeric:true, sensitivity:'base'});
  });

  sortSamples(sampleData);
  sortSamples(wargasmSamples);

  // --- Populate Grid ---
  const populateSamplesInGrid = (data, grid, players, audioCtx, colors, getKeys) => {
    if (!grid) { console.error('Target grid element not found.'); return 0; }
    grid.innerHTML = '';
    let prevGroup = null, rowEl = null, rowIdx = 0, prevSeries = '', added = 0;
    for (const s of data) {
      const keys = getKeys(s);
      if (keys.groupIdentifier !== prevGroup || !rowEl) {
        rowEl = document.createElement('div');
        rowEl.classList.add('sample-row');
        const c = colors[rowIdx++ % colors.length];
        rowEl.style.borderTopColor = c;
        rowEl.style.setProperty('--row-border-color', c);
        grid.appendChild(rowEl);
        prevGroup = keys.groupIdentifier;
        prevSeries = '';
      }
      const card = document.createElement('div');
      card.classList.add('sample-card');
      card.dataset.group = keys.groupIdentifier;
      if (keys.bpm > 0) card.dataset.originalBpm = keys.bpm;
      if (prevSeries && keys.seriesPrefix && keys.seriesPrefix !== prevSeries) card.style.marginLeft = '20px';
      if (keys.seriesPrefix) prevSeries = keys.seriesPrefix;

      if (s.src) {
        card.dataset.src = s.src;
        if (s.category) card.dataset.category = s.category;

        card.append(Object.assign(document.createElement('h3'), {textContent: s.title}));
        card.append(Object.assign(document.createElement('p'), {textContent: s.details ?? ''}));

        const btn = document.createElement('button');
        btn.classList.add('play-pause-btn');
        btn.tabIndex = -1;
        btn.setAttribute('aria-label', `Play/Pause ${s.title ?? 'sample'}`);
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-play');
        btn.appendChild(icon);
        card.append(btn);

        const loading = document.createElement('span');
        loading.classList.add('loading-indicator');
        loading.style.display = 'none';
        loading.textContent = 'Loading...';
        card.append(loading);

        if (audioCtx) {
          const originalBPM = parseInt(card.dataset.originalBpm) || keys.bpm || 0;
          if (originalBPM === 0) console.warn(`Sample "${s.src}" has no discernible BPM.`);
          players.set(card, {
            isPlaying: false, audioBuffer: null, audioPromise: null, sourceNode: null,
            gainNode: null, isMutedDueToSolo: false, isLoading: false,
            loadError: null, src: s.src, button: btn, indicator: loading,
            icon, originalBPM
          });
          added++;
        } else {
          btn.disabled = true; btn.title = 'Audio playback not available.';
          loading.textContent = 'Audio N/A'; loading.style.display = 'inline';
          card.classList.add('audio-error');
        }
      } else {
        card.classList.add('placeholder');
        card.append(Object.assign(document.createElement('h3'), {textContent: s.title ?? 'Coming Soon...'}));
        card.append(Object.assign(document.createElement('p'), {textContent: s.details ?? 'More variants pending'}));
        card.setAttribute('data-tooltip', s.details ?? 'Loop not yet available');
      }
      rowEl.appendChild(card);
    }
    console.log(`Populated ${added} players in grid targeted by: ${grid.parentElement?.parentElement?.id ?? '[unknown]'}`);
    return added;
  };

  const kpGrid = document.querySelector('#kp-loops .samples-grid');
  const wargasmGrid = document.querySelector('#wargasm-remix .samples-grid');

  if (kpGrid) populateSamplesInGrid(sampleData, kpGrid, loopPlayers, audioContext, neonRowColors, getSortKeys);
  else console.error('KP Loops grid element not found.');

  if (wargasmGrid) populateSamplesInGrid(wargasmSamples, wargasmGrid, loopPlayers, audioContext, neonRowColors, getSortKeys);
  else console.error('Wargasm Remix grid element not found.');

  console.log(`Total generated audio players across all grids: ${loopPlayers.size}.`);

  // --- Mobile Nav Toggle ---
  const navToggle = document.querySelector('.nav-toggle'), nav = document.querySelector('nav');
  if (navToggle && nav) {
    const icon = navToggle.querySelector('i');
    const toggleNav = () => {
      nav.classList.toggle('active');
      icon?.classList.toggle('fa-bars');
      icon?.classList.toggle('fa-times');
    };
    navToggle.addEventListener('click', toggleNav);
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.contains('active') && toggleNav()));
  }

  // --- Placeholder marking ---
  document.querySelectorAll('.sample-card:not([data-src])').forEach(el => {
    if (!el.classList.contains('placeholder')) el.classList.add('placeholder');
    if (!el.hasAttribute('data-tooltip')) el.setAttribute('data-tooltip', 'Coming Soon');
    el.querySelectorAll('button').forEach(b => b.disabled = true);
  });

  // --- Animate on scroll fallback ---
  const animateOnScroll = () => {
    document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
      if (['running', 'paused'].includes(el.style.animationPlayState)) return;
      if (el.getBoundingClientRect().top < window.innerHeight - 50) {
        if (el.style.opacity !== '1') {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }
      }
    });
  };
  animateOnScroll();
  window.addEventListener('scroll', animateOnScroll);

  // --- Intersection Observer ---
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        const style = getComputedStyle(target);
        if (style.animationName !== 'none') {
          target.style.animationPlayState = isIntersecting ? 'running' : 'paused';
        } else if (isIntersecting) {
          if (target.style.opacity !== '1') {
            target.style.opacity = '1';
            if (target.classList.contains('slide-up')) target.style.transform = 'translateY(0)';
          }
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in, .slide-up').forEach(el => {
      const style = getComputedStyle(el);
      if (style.animationName !== 'none') el.style.animationPlayState = 'paused';
      else {
        el.style.opacity = '0';
        if (el.classList.contains('slide-up')) el.style.transform = 'translateY(20px)';
      }
      io.observe(el);
    });
  } else console.log('Intersection Observer not supported, using scroll fallback.');

  // --- Hero Typewriter Effect ---
  const heroText = document.querySelector('.hero-text h1');
  if (heroText) {
    const text = heroText.textContent ?? '';
    heroText.textContent = '';
    let idx = 0;
    const typeSpeed = 80;
    const typeWriter = () => {
      if (idx < text.length) {
        heroText.textContent += text[idx++];
        setTimeout(typeWriter, typeSpeed);
      }
    };
    setTimeout(typeWriter, 300);
  }

  // --- Category Filter ---
  const filterBtns = document.querySelectorAll('.category-filter button, .category-filter .btn');
  if (filterBtns.length) {
    const cards = document.querySelectorAll('#kp-loops .samples-grid .sample-card');
    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      cards.forEach(c => {
        const cCat = c.dataset.category;
        const show = cat === 'all' || c.classList.contains('placeholder') || cCat === cat;
        c.style.display = show ? '' : 'none';
      });
    }));
    document.querySelector('.category-filter button[data-category="all"]')?.click();
  } else console.log('No category filter buttons found.');

  // --- Retro Screen Flicker ---
  const screen = document.querySelector('.computer-screen');
  if (screen) setInterval(() => {
    const dur = 80 + Math.random() * 50;
    screen.classList.add('flicker');
    setTimeout(() => screen.classList.remove('flicker'), dur);
  }, 5000 + Math.random() * 2000);

  // --- Smooth Anchor Scrolling ---
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href?.length > 1 && href.startsWith('#')) {
      const tgt = document.querySelector(href);
      if (tgt) {
        e.preventDefault();
        const offset = 80;
        const pos = tgt.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: pos, behavior: 'smooth' });
        if (nav?.classList.contains('active')) navToggle?.click();
      } else console.warn(`Smooth scroll target not found for selector: ${href}`);
    }
  }));

  // --- Web Audio API Looping & Quantize Feature ---
  let quantizeEnabled = false, globalTargetBPM = 120;
  const quantizeToggle = document.getElementById('quantize-toggle');
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput) globalTargetBPM = parseInt(bpmInput.value, 10) ?? 120;
  if (quantizeToggle) quantizeEnabled = quantizeToggle.checked;

  let isSoloActive = false, soloedCard = null;

  // --- Quantize State ---
  let quantizeReferenceTime = null;
  
  async function fetchAndDecodeAudio(ps) {
    if (!audioContext) return Promise.reject(new Error('AudioContext not available.'));
    if (ps.audioPromise) return ps.audioPromise;
    ps.audioPromise = (async () => {
      try {
        const res = await fetch(ps.src);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${ps.src}`);
        const buffer = await audioContext.decodeAudioData(await res.arrayBuffer());
        ps.audioBuffer = buffer; ps.loadError = null;
        console.log(`Loaded ${ps.src}`);
        return buffer;
      } catch (e) {
        console.error(`Error loading ${ps.src}:`, e);
        ps.loadError = e; ps.audioBuffer = null; ps.audioPromise = null;
        throw e;
      }
    })();
    return ps.audioPromise;
  }

  /**
   * Calculate next quantized start time aligned to the beat grid with a grace window.
   * @param {number} bpm - BPM for quantization (usually globalTargetBPM)
   * @param {number} now - current audioContext.currentTime
   * @param {number} [referenceTime] - reference start time for beat grid, defaults to now
   * @param {number} [gracePeriodMs] - grace window in milliseconds, defaults to 75ms
   * @returns {number} - next quantized time >= now aligned to BPM beat grid
   */
  function getNextQuantizedStartTime(bpm, now, referenceTime = now, gracePeriodMs = 75) {
    const secondsPerBeat = 60 / bpm;
    const gracePeriod = gracePeriodMs / 1000;

    const elapsed = now - referenceTime;
    const beatsElapsedFloor = Math.floor(elapsed / secondsPerBeat);
    const lastBeatTime = referenceTime + beatsElapsedFloor * secondsPerBeat;

    if (now - lastBeatTime <= gracePeriod) {
      return lastBeatTime + secondsPerBeat;
    }

    const beatsElapsedCeil = Math.ceil(elapsed / secondsPerBeat);
    return referenceTime + beatsElapsedCeil * secondsPerBeat;
  }

  function getEarliestStartTime() {
    let earliest = null;
    loopPlayers.forEach(ps => {
      if (ps.isPlaying && typeof ps.startTime === 'number') {
        if (earliest === null || ps.startTime < earliest) earliest = ps.startTime;
      }
    });
    return earliest;
  }

  function getNumberPlayingLoops() {
    let count = 0;
    loopPlayers.forEach(ps => { if (ps.isPlaying) count++; });
    return count;
  }

  // --- Update playback rates for BPM sync ---
  const updateRateForAllCurrentlyPlayingLoops = () => {
    if (!audioContext || audioContext.state !== 'running') return;
    loopPlayers.forEach(ps => {
      if (ps.isPlaying && ps.sourceNode) {
        const rate = quantizeEnabled && ps.originalBPM > 0 && globalTargetBPM > 0
          ? globalTargetBPM / ps.originalBPM
          : 1;
        if (ps.sourceNode.playbackRate.value !== rate) ps.sourceNode.playbackRate.value = rate;
      }
    });
  };

  quantizeToggle?.addEventListener('change', () => {
    quantizeEnabled = quantizeToggle.checked;
    updateRateForAllCurrentlyPlayingLoops();
  });

  bpmInput?.addEventListener('input', () => {
    const val = parseInt(bpmInput.value, 10);
    const min = parseInt(bpmInput.min, 10) || 30;
    const max = parseInt(bpmInput.max, 10) || 300;
    if (!isNaN(val) && val >= min && val <= max) {
      globalTargetBPM = val;
      if (quantizeEnabled) updateRateForAllCurrentlyPlayingLoops();
    }
  });

  // --- Playback Functions ---
  async function playLoop(card, {quantizeStart = false, shiftKey = false} = {}) {
    const ps = loopPlayers.get(card);
    if (!ps || ps.isPlaying || !audioContext || audioContext.state !== 'running') {
      if (audioContext && audioContext.state !== 'running') console.warn(`playLoop: AudioContext not running (state: ${audioContext.state}).`);
      else if (!ps) console.warn('playLoop: No playerState for card.');
      else if (ps.isPlaying) console.warn(`playLoop: Already playing ${ps.src}.`);
      return;
    }
    ps.isLoading = true;
    ps.button.disabled = true;
    ps.indicator.style.display = 'inline';
    card.classList.add('loading');
    card.classList.remove('audio-error');

    try {
      if (!ps.audioBuffer) await fetchAndDecodeAudio(ps);

      const now = audioContext.currentTime;
      let startTime = now;

      const rate = quantizeEnabled && ps.originalBPM && globalTargetBPM
        ? globalTargetBPM / ps.originalBPM
        : 1;

      if (quantizeEnabled && quantizeStart && shiftKey) {
        if (!quantizeReferenceTime) {
          quantizeReferenceTime = now;
        }
        startTime = getNextQuantizedStartTime(globalTargetBPM, now, quantizeReferenceTime, 75);
      }

      const src = audioContext.createBufferSource();
      src.buffer = ps.audioBuffer;
      src.loop = true;
      src.playbackRate.value = rate;

      const gain = audioContext.createGain();
      ps.gainNode = gain;

      if (isSoloActive && soloedCard !== card) {
        gain.gain.value = 0;
        ps.isMutedDueToSolo = true;
        console.log(`PLAYLOOP (SOLO): Muted ${ps.src}`);
      } else {
        gain.gain.value = 1;
        ps.isMutedDueToSolo = false;
      }

      src.connect(gain);
      gain.connect(audioContext.destination);

      src.onended = () => {
        if (ps.sourceNode === src) {
          const wasPlaying = ps.isPlaying, wasSoloed = isSoloActive && soloedCard === card;
          ps.isPlaying = false;
          ps.sourceNode = null;
          ps.gainNode?.disconnect();
          ps.gainNode = null;
          ps.isMutedDueToSolo = false;
          ps.startTime = null;
          if (wasPlaying && wasSoloed) deactivateSolo();
          else {
            updateButtonUI(card, ps, false);
            card.classList.remove('playing', 'muted-by-solo', 'soloed');
          }
          // Reset quantizeReferenceTime if no loops playing
          if (getNumberPlayingLoops() === 0) quantizeReferenceTime = null;
        }
      };

      src.start(startTime);
      ps.sourceNode = src;
      ps.isPlaying = true;
      ps.loadError = null;
      ps.startTime = startTime;

      // If this is the earliest loop, update quantizeReferenceTime
      const earliestStart = getEarliestStartTime();
      if (!quantizeReferenceTime || startTime < quantizeReferenceTime) {
        quantizeReferenceTime = startTime;
      } else if (!quantizeReferenceTime) {
        quantizeReferenceTime = startTime;
      }

      updateButtonUI(card, ps, true);
      card.classList.add('playing');
      console.log(`playLoop: Started ${ps.src} at ${startTime.toFixed(3)} (now ${now.toFixed(3)})`);

    } catch (err) {
      console.error(`playLoop error: ${ps.src}`, err);
      ps.loadError = err;
      ps.isPlaying = false;
      ps.audioBuffer = null;
      ps.audioPromise = null;
      ps.sourceNode = null;
      ps.gainNode?.disconnect();
      ps.gainNode = null;
      ps.isMutedDueToSolo = false;
      ps.startTime = null;
      updateButtonUI(card, ps, false);
      alert(`Could not load/play "${ps.src.split('/').pop()}". Error: ${err.message}`);
      card.classList.add('audio-error');
    } finally {
      ps.isLoading = false;
      card.classList.remove('loading');
      if (ps.indicator && ps.indicator.textContent !== 'Load Error') ps.indicator.style.display = 'none';
      ps.button.disabled = false;
    }
  }

  function stopLoop(card) {
    const ps = loopPlayers.get(card);
    if (ps?.isPlaying && ps.sourceNode) {
      try {
        ps.sourceNode.stop(0);
      } catch (e) {
        if (ps.sourceNode) ps.sourceNode.onended = null;
        ps.isPlaying = false;
        ps.sourceNode = null;
        ps.gainNode?.disconnect();
        ps.gainNode = null;
        ps.isMutedDueToSolo = false;
        ps.startTime = null;
        updateButtonUI(card, ps, false);
        card.classList.remove('playing', 'soloed', 'muted-by-solo');
      }
    }
    ps.isPlaying = false;
    ps.sourceNode = null;
    ps.startTime = null;
    ps.gainNode?.disconnect();
    ps.gainNode = null;
    ps.isMutedDueToSolo = false;
    updateButtonUI(card, ps, false);
    card.classList.remove('playing', 'soloed', 'muted-by-solo');

    if (getNumberPlayingLoops() === 0) quantizeReferenceTime = null;
  }

  const stopAllLoops = exceptCard => {
    loopPlayers.forEach((ps, card) => {
      if (card !== exceptCard && ps.isPlaying) stopLoop(card);
    });
  };

  // --- Solo Logic ---
  function activateSolo(card, ps) {
    if (!audioContext || !ps.isPlaying || !ps.gainNode) return console.warn('SOLO: Cannot activate.');
    console.log(`SOLO: Activating ${ps.src}`);
    isSoloActive = true; soloedCard = card;
    ps.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
    ps.isMutedDueToSolo = false;
    loopPlayers.forEach((oPs, oCard) => {
      if (oCard !== card && oPs.isPlaying && oPs.gainNode) {
        oPs.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.015);
        oPs.isMutedDueToSolo = true;
        oCard.classList.add('muted-by-solo');
        console.log(`SOLO: Muting ${oPs.src}`);
      } else if (oCard === card) oCard.classList.remove('muted-by-solo');
    });
    card.classList.add('soloed');
    updateButtonUI(card, ps, true);
  }

  function deactivateSolo() {
    if (!audioContext || !isSoloActive) return;
    console.log('SOLO: Deactivating solo.');
    isSoloActive = false; const prevSolo = soloedCard; soloedCard = null;
    loopPlayers.forEach((ps, card) => {
      if (ps.isMutedDueToSolo && ps.gainNode && ps.isPlaying) {
        ps.gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.015);
        console.log(`SOLO: Unmuting ${ps.src}`);
      }
      ps.isMutedDueToSolo = false;
      card.classList.remove('muted-by-solo', 'soloed');
      updateButtonUI(card, ps, ps.isPlaying);
    });
  }

  // --- Update UI ---
  function updateButtonUI(card, ps, playing) {
    if (!card || !ps?.button) return;
    const btn = ps.button, icon = ps.icon;
    const title = card.querySelector('h3')?.textContent.trim() ?? ps.src.split('/').pop();
    if (icon) {
      icon.classList.toggle('fa-play', !playing);
      icon.classList.toggle('fa-pause', playing);
    } else btn.textContent = playing ? 'Pause' : 'Play';
    btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title}`);
    card.classList.toggle('playing', playing);
  }

  // --- Setup click handlers ---
  loopPlayers.forEach((ps, card) => {
    card.addEventListener('click', async e => {
      if (!audioContext) return alert('Audio playback unavailable.');

      const altShift = e.altKey && e.shiftKey && !e.ctrlKey,
            shiftOnly = e.shiftKey && !e.altKey && !e.ctrlKey,
            normalClick = !e.shiftKey && !e.altKey && !e.ctrlKey;

      console.log(`CLICK: ${ps.src}. Alt:${e.altKey}, Shift:${e.shiftKey}, Ctrl:${e.ctrlKey}. Solo:${isSoloActive}. Playing:${ps.isPlaying}`);

      if (ps.isLoading) return console.log('Still loading, please wait.');
      if (ps.loadError && !ps.audioBuffer) return alert(`Error playing sample: ${ps.loadError.message}`);

      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); }
        catch { return alert('Could not activate audio playback.'); }
      }
      if (audioContext.state !== 'running') return alert('Audio system not ready.');

      if (altShift) {
        if (!isSoloActive) {
          if (ps.isPlaying) activateSolo(card, ps);
          else { await playLoop(card); ps.isPlaying && activateSolo(card, ps); }
        } else if (soloedCard === card) deactivateSolo();
        else {
          deactivateSolo();
          if (ps.isPlaying) activateSolo(card, ps);
          else { await playLoop(card); ps.isPlaying && activateSolo(card, ps); }
        }
        return;
      }
      if ((normalClick || shiftOnly) && isSoloActive && soloedCard !== card) deactivateSolo();

      if (ps.isPlaying) stopLoop(card);
      else {
        if (normalClick) stopAllLoops(card);
        await playLoop(card, { quantizeStart: quantizeEnabled && shiftOnly, shiftKey: shiftOnly });
      }
    });
  });

  console.log('End of DOMContentLoaded script execution.');
});

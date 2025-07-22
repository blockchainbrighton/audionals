// config.js
window.layer = { stars: true, moon: false, solar: false, clouds: false, shooting: false, land: false, aurora: false, lightning: false, meteor: false };

export const config = {
    shooting: { enabled: () => layer.shooting, life: 1200, spawnRate: 0.01, maxCount: 40, speedMin: 0.5, speedMax: 2, angleMin: -Math.PI * 0.7, angleMax: -Math.PI * 0.3, sizeStart: 1, sizeEnd: 1, colorMode: 'white', trailLen: 10, trailFadePow: 1, trail: true },
    meteor:   { enabled: () => layer.meteor, life: 1200, spawnRate: 0.005, maxCount: 20, speedMin: 1.5, speedMax: 3.5, angleMin: Math.PI * 0.2, angleMax: Math.PI * 0.4, sizeStart: 1.5, sizeEnd: 0.5, colorMode: 'fire', trailLen: 8, trailFadePow: 1.2, trail: true },
    comet:    { enabled: () => true, life: 4000, spawnRate: 0, maxCount: 5, speedMin: 0.05, speedMax: 0.2, edgeBias: [1,1,1,1], angleSpread: 0.4, sizeStart: 2.5, sizeEnd: 1, colorMode: 'white', trailLen: 30, trailFadePow: 0.8, trail: true },
    rocket:   { enabled: () => true, speed: 0.3, startX: 31, startY: 60, trailLen: 80, trailFadePow: 1, colorMode: 'fire' },
    aurora:   { enabled: () => layer.aurora, yBase: 5, bandCount: 3, ySpread: 3, amplitudeMin: 4, amplitudeMax: 7, speedMin: 0.01, speedMax: 0.04, waveFreq: 0.2, alpha: 0.15, colorMode: 'green', lineWidth: 1 },
    lightning:{ enabled: () => layer.lightning, chance: 0.003, forks: 8, forkJitter: 20, flashAlpha: 0.4, duration: 8, color: '#ffffff' },
    dayNight: { speed: 0.001, dayTop: '#87ceeb', dayHorizon: '#87ceeb', horizonPeakColor: '#ff6a00', peakTime: 0.6, nightTop: '#0f1414', nightHorizon: '#151415', sunColorStart: '#ffff32', sunColorEnd: '#ffc832' },
    moon:     { enabled: () => layer.moon, speed: 0.0001, yAmplitude: 60, radiusMin: 1, radiusMax: 5, color1: '#f0e68c', color2: '#dddddd', daytimeAlpha: 0.15 },
    solar:    { enabled: () => layer.solar, speed: 0.0002, sunRadius: 4, orbitalLineWidth: 1, orbitalLineOpacity: 0.1, planets: [ { r: 1, d: 8, s: 0.02, c: '#4ae', a: 0 }, { r: 1.5, d: 12, s: 0.015, c: '#e74', a: 0 }, { r: 1, d: 16, s: 0.01, c: '#fc0', a: 0 } ] },
    clouds:   { enabled: () => layer.clouds, count: 4, yMin: 8, yMax: 28, widthMin: 12, widthMax: 28, speedMin: 0.03, speedMax: 0.06, color: 'rgba(255,255,255,0.3)', waveAmp: 2 },
    stars:    { enabled: () => layer.stars, count: 35, twinkleSpeedMin: 0.01, twinkleSpeedMax: 0.04, minBrightness: 0.1 },
    land:     { enabled: () => layer.land, baseHeight: 32, amplitude: 6, random: 3, colorBack: '#0a1a0a', colorTop: '#0c2f0c' }
  };
  
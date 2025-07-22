// retroCanvas.js
import { config } from './config.js';

import { toggleSettingsPanel } from './settingsPanel.js';

const cvs = document.getElementById('gameCanvas'), ctx = cvs.getContext('2d');
let frame = 0, panel = null, lightning = 0, flash = 0, dayNightState = 'night', dayNightPhase = 1, nightAlpha = 1, uiVisible = false, lt = performance.now(), fc = 0;

const layer = window.layer;
const flyingObjects = [], launchingRockets = [];

let stars = [], moon = { prog: 0 }, solar = { prog: 0, planets: JSON.parse(JSON.stringify(config.solar.planets)) }, clouds = [], landPts = [], auroraBands = [];
const $ = id => document.getElementById(id), rand = (a, b) => a + Math.random() * (b - a), remap = (v, a1, a2, b1, b2) => b1 + (v - a1) * (b2 - b1) / (a2 - a1), hexToRgb = hex => hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b).substring(1).match(/.{2}/g).map(x => parseInt(x, 16)), lerpColor = (c1, c2, f) => { f = Math.max(0, Math.min(1, f)); return `rgb(${[0,1,2].map(i=>c1[i]+f*(c2[i]-c1[i])|0).join(',')})`; };

function toggle(k) { if (layer.hasOwnProperty(k)) { layer[k] = !layer[k]; updateButtonHighlights(); } }
const maybeSpawn = type => { const cfg = config[type]; if (cfg.enabled() && nightAlpha > 0 && flyingObjects.filter(o => o.type === type).length < cfg.maxCount && Math.random() < cfg.spawnRate) addFlyingObject(type); };
const launchRocket = () => { const cfg = config.rocket; launchingRockets.push({ x: cfg.startX, y: cfg.startY, trail: [] }); };
const launchComet = () => addFlyingObject('comet');
function addFlyingObject(type) {
  const cfg = config[type]; let x, y, vx, vy, angle;
  if (['shooting', 'meteor'].includes(type)) {
    angle = rand(cfg.angleMin, cfg.angleMax);
    const speed = rand(cfg.speedMin, cfg.speedMax);
    vx = Math.cos(angle) * speed; vy = (type === 'shooting' ? Math.abs(Math.sin(angle)) : Math.sin(angle)) * speed;
    x = rand(0, 64); y = 0;
  } else if (type === 'comet') {
    const edges = ['top', 'left', 'right', 'bottom'], w = cfg.edgeBias, t = w.reduce((a, b) => a + b, 0);
    let r = rand(0, t), edge = edges.find((_, i) => (r -= w[i]) <= 0) || 'top', s = rand(cfg.speedMin, cfg.speedMax);
    ({ top:   () => [rand(0,64), -5, rand(-cfg.angleSpread, cfg.angleSpread), s],
       left:  () => [-5, rand(0,64), s, rand(-cfg.angleSpread, cfg.angleSpread)],
       right: () => [69, rand(0,64), -s, rand(-cfg.angleSpread, cfg.angleSpread)],
       bottom:() => [rand(0,64), 69, rand(-cfg.angleSpread, cfg.angleSpread), -s] })[edge]().forEach((v,i)=>[x,y,vx,vy][i]=v);
  }
  flyingObjects.push({ type, x, y, vx, vy, life: cfg.life, sizeStart: cfg.sizeStart, sizeEnd: cfg.sizeEnd, trail: [] });
}
function resetScene() {
  stars = Array.from({length: config.stars.count}, () => ({ x: rand(0,64), y: rand(0,64), b: rand(0,1), ts: rand(config.stars.twinkleSpeedMin, config.stars.twinkleSpeedMax) }));
  clouds = Array.from({length: config.clouds.count}, () => ({ x: rand(-20,84), y: rand(config.clouds.yMin, config.clouds.yMax), w: rand(config.clouds.widthMin, config.clouds.widthMax), s: rand(config.clouds.speedMin, config.clouds.speedMax) }));
  landPts = Array.from({length:33}, (_,i) => ({ x: i*2, y: config.land.baseHeight + Math.sin(i*.5)*config.land.amplitude + rand(-config.land.random, config.land.random) }));
  auroraBands = Array.from({length: config.aurora.bandCount}, (_,i) => ({ y: config.aurora.yBase + i*config.aurora.ySpread, phase: i, amp: rand(config.aurora.amplitudeMin, config.aurora.amplitudeMax), speed: rand(config.aurora.speedMin, config.aurora.speedMax) }));
  flyingObjects.length = launchingRockets.length = 0; lightning = flash = 0; moon.prog = solar.prog = 0; solar.planets.forEach((p,i)=>Object.assign(p,config.solar.planets[i])); dayNightState='night'; dayNightPhase=1; updateButtonHighlights();
}
const startSunrise = () => { if(dayNightState==='night'){ dayNightState='sunrising'; updateButtonHighlights(); } };
const startSunset = () => { if(dayNightState==='day'){ dayNightState='sunsetting'; updateButtonHighlights(); } };

// --- Drawing & Animation ---
function draw() {
  frame++;
  if(dayNightState==='sunrising') { dayNightPhase -= config.dayNight.speed; if(dayNightPhase<=0){ dayNightPhase=0; dayNightState='day'; updateButtonHighlights(); } }
  else if(dayNightState==='sunsetting') { dayNightPhase += config.dayNight.speed; if(dayNightPhase>=1){ dayNightPhase=1; dayNightState='night'; updateButtonHighlights(); } }
  const dn = config.dayNight, grad = ctx.createLinearGradient(0,0,0,64), dayTopRgb=hexToRgb(dn.dayTop), dayHorRgb=hexToRgb(dn.dayHorizon), peakHorRgb=hexToRgb(dn.horizonPeakColor), nightTopRgb=hexToRgb(dn.nightTop), nightHorRgb=hexToRgb(dn.nightHorizon);
  grad.addColorStop(0, lerpColor(dayTopRgb, nightTopRgb, dayNightPhase));
  grad.addColorStop(1, dayNightPhase<dn.peakTime ? lerpColor(dayHorRgb, peakHorRgb, dayNightPhase/dn.peakTime) : lerpColor(peakHorRgb, nightHorRgb, (dayNightPhase-dn.peakTime)/(1-dn.peakTime)));
  ctx.fillStyle = grad; ctx.fillRect(0,0,64,64); nightAlpha = dayNightPhase > .3 ? remap(dayNightPhase, .3, 1, 0, 1) : 0; ctx.globalAlpha = 1;
  if(dayNightPhase<1){ let sunY=5+dayNightPhase*65, sunColor=lerpColor(hexToRgb(dn.sunColorStart),hexToRgb(dn.sunColorEnd),dayNightPhase); ctx.fillStyle=sunColor; ctx.beginPath(); ctx.arc(32,sunY,3,0,2*Math.PI); ctx.fill(); ctx.fillStyle=sunColor.replace('rgb','rgba').replace(')',',0.3)'); ctx.beginPath(); ctx.arc(32,sunY,4,0,2*Math.PI); ctx.fill(); }
  if(config.stars.enabled()&&nightAlpha>0) stars.forEach(s=>{ s.b+=s.ts; if(s.b>1||s.b<0)s.ts*=-1; const b=Math.max(config.stars.minBrightness,Math.abs(Math.sin(s.b*Math.PI))); ctx.fillStyle=`rgba(255,255,255,${b*nightAlpha})`; ctx.fillRect(s.x|0,s.y|0,1,1); });
  if(config.aurora.enabled()&&nightAlpha>0){ const ac=config.aurora,fa=ac.alpha*nightAlpha; ctx.lineWidth=ac.lineWidth; for(let x=0;x<64;x++) auroraBands.forEach(b=>{ const y=b.y+b.amp*Math.sin(x*ac.waveFreq+frame*b.speed+b.phase); ctx.strokeStyle=ac.colorMode==='rainbow'?`hsla(${(x*5+frame)%360},100%,70%,${fa})`:`rgba(0,255,128,${fa})`; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+ac.lineWidth); ctx.stroke(); }); ctx.lineWidth=1; }
  ['shooting','meteor','comet'].forEach(maybeSpawn);
  if(nightAlpha>0) for(let i=flyingObjects.length-1;i>=0;i--){const o=flyingObjects[i],cfg=config[o.type],lr=o.life/cfg.life*nightAlpha;o.life--;o.x+=o.vx;o.y+=o.vy;if(!cfg)continue;if(o.life<=0||o.x<-10||o.x>74||o.y<-10||o.y>74){flyingObjects.splice(i,1);continue;}const sz=remap(o.life/cfg.life,0,1,cfg.sizeEnd,cfg.sizeStart),isz=Math.max(1,sz|0);let c;switch(cfg.colorMode){case'fire':c=`rgba(255,${100+o.life/cfg.life*155},0,${lr})`;break;case'ice':c=`rgba(100,200,255,${lr})`;break;case'rainbow':c=`hsl(${(Date.now()/10)%360},100%,50%)`;break;case'gold':c=`rgba(255,215,0,${lr})`;break;case'silver':c=`rgba(192,192,192,${lr})`;break;default:c=`rgba(255,255,255,${lr})`;}if(cfg.trail){o.trail.unshift({x:o.x,y:o.y});if(o.trail.length>cfg.trailLen)o.trail.length=cfg.trailLen;o.trail.forEach((p,idx)=>{const ta=Math.pow(1-idx/cfg.trailLen,cfg.trailFadePow)*lr;let tc=c;ctx.fillStyle=tc.startsWith('hsl')?tc.replace(')',`,${ta})`).replace('hsl','hsla'):tc.replace(/,[\d.]+\)$/g,`,${ta})`);ctx.fillRect((p.x-sz/2)|0,(p.y-sz/2)|0,isz,isz);});}ctx.fillStyle=c.startsWith('hsl')?c:c.replace(/,[\d.]+\)$/g,`,${lr})`);ctx.fillRect((o.x-sz/2)|0,(o.y-sz/2)|0,isz,isz);}
  if(config.moon.enabled()){const mc=config.moon,ma=mc.daytimeAlpha+nightAlpha*(1-mc.daytimeAlpha);ctx.globalAlpha=ma;moon.prog=(moon.prog+mc.speed)%1;const arc=Math.sin(moon.prog*Math.PI),x=moon.prog*74-5,y=64-mc.yAmplitude+(1-arc)*mc.yAmplitude,r=remap(arc,0,1,mc.radiusMin,mc.radiusMax);ctx.fillStyle=mc.color1;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();ctx.fillStyle=mc.color2;ctx.beginPath();ctx.arc(x-1,y-1,Math.max(0,r-1),0,2*Math.PI);ctx.fill();ctx.globalAlpha=1;}
  if(config.clouds.enabled()){ctx.fillStyle=config.clouds.color;clouds.forEach(c=>{c.x-=c.s;if(c.x<-c.w)c.x=64+c.w;for(let i=0;i<c.w;i++)ctx.fillRect((c.x+i)|0,(c.y+Math.sin(i*.6)*config.clouds.waveAmp)|0,1,1);});}
  if(config.land.enabled()){ctx.fillStyle=config.land.colorBack;ctx.beginPath();ctx.moveTo(0,64);landPts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(64,64);ctx.closePath();ctx.fill();ctx.fillStyle=config.land.colorTop;for(let i=0;i<landPts.length-1;i++)ctx.fillRect(landPts[i].x,landPts[i].y|0,2,1);}
  if(config.lightning.enabled()){if(Math.random()<config.lightning.chance)lightning=flash=config.lightning.duration; if(flash>0){ctx.fillStyle=`rgba(255,255,255,${config.lightning.flashAlpha})`;ctx.fillRect(0,0,64,64);flash--;}if(lightning>0){ctx.strokeStyle=config.lightning.color.replace(')',',0.8)').replace('#','rgba('+hexToRgb(config.lightning.color).join(',')+',');ctx.beginPath();ctx.moveTo(32,0);for(let i=0;i<config.lightning.forks;i++)ctx.lineTo(32+(Math.random()-.5)*config.lightning.forkJitter,i*(64/config.lightning.forks));ctx.stroke();lightning--;}}
  if(config.solar.enabled()&&nightAlpha>.9){const sc=config.solar;ctx.globalAlpha=nightAlpha;solar.prog=(solar.prog+sc.speed)%1;const arc=Math.sin(solar.prog*Math.PI),sunX=solar.prog*84-10,sunY=80-arc*85,sunR=sc.sunRadius;ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,2*Math.PI);ctx.fill();ctx.fillStyle='rgba(255,204,0,0.3)';ctx.beginPath();ctx.arc(sunX,sunY,sunR+1,0,2*Math.PI);ctx.fill();ctx.lineWidth=sc.orbitalLineWidth;sc.planets.forEach(p=>{p.a=(p.a+p.s)%(2*Math.PI);const x=sunX+Math.cos(p.a)*p.d,y=sunY+Math.sin(p.a)*p.d;ctx.strokeStyle=`rgba(255,255,255,${sc.orbitalLineOpacity*nightAlpha})`;ctx.beginPath();ctx.arc(sunX,sunY,p.d,0,2*Math.PI);ctx.stroke();ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(x,y,p.r,0,2*Math.PI);ctx.fill();});ctx.globalAlpha=1;ctx.lineWidth=1;}
  if(config.rocket.enabled()){for(let i=launchingRockets.length-1;i>=0;i--){const r=launchingRockets[i],cfg=config.rocket;r.y-=cfg.speed;r.trail.unshift({x:r.x,y:r.y});if(r.trail.length>cfg.trailLen)r.trail.length=cfg.trailLen;r.trail.forEach((p,j)=>{const lr=1-j/r.trail.length,alpha=Math.pow(lr,cfg.trailFadePow);let c;switch(cfg.colorMode){case'fire':c=`rgba(255,${100+lr*155},0,${alpha})`;break;case'ice':c=`rgba(100,200,255,${alpha})`;break;case'rainbow':c=`hsla(${(Date.now()/10+j*2)%360},100%,70%,${alpha})`;break;default:c=`rgba(255,255,255,${alpha})`;}ctx.fillStyle=c;ctx.fillRect(p.x|0,p.y|0,1,1);});if(r.y<-30)launchingRockets.splice(i,1);}}
  updStatus(); requestAnimationFrame(draw);
}

// ---- UI / Button Setup ----
function updateButtonHighlights() {
  Object.entries(layer).forEach(([k,v]) => { const btn=$('btn-'+k); btn?.classList.toggle('active',v); });
  const sunriseBtn=$('btn-sunrise'),sunsetBtn=$('btn-sunset');
  sunriseBtn.classList.remove('active');sunsetBtn.classList.remove('active');
  sunriseBtn.disabled=dayNightState!=='night'; sunsetBtn.disabled=dayNightState!=='day';
  if(dayNightState==='sunrising'){sunriseBtn.classList.add('active');sunriseBtn.disabled=sunsetBtn.disabled=true;}
  else if(dayNightState==='sunsetting'){sunsetBtn.classList.add('active');sunsetBtn.disabled=true;}
}
const resetAll = () => { Object.keys(layer).forEach(k=>layer[k]=false); layer.stars=true; resetScene(); };

// ---- Event bindings, condensed ----
[
  ['stars'],['moon'],['solar'],['clouds'],['shooting'],['land'],['aurora'],['lightning'],['meteor']
].forEach(([k]) => $('btn-'+k).onclick=()=>toggle(k));
$('btn-sunrise').onclick=startSunrise; $('btn-sunset').onclick=startSunset;
$('btn-rocket').onclick=launchRocket; $('btn-comet').onclick=launchComet;
$('btn-reset').onclick=resetAll;

// --- UI Show/Hide logic (Ctrl+Shift+S toggles controls) ---
const controlsDiv = document.querySelector('.controls'), statusDiv = document.querySelector('.status');
function setUIVisible(v) {
  uiVisible = v;
  controlsDiv.style.display = statusDiv.style.display = v ? '' : 'none';
  if (!v) { $('settingsPanel')?.remove(); $('settingsBtn').textContent='Show Settings'; }
}
window.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='s') { setUIVisible(!uiVisible); e.preventDefault(); } });
$('settingsBtn').onclick=()=>{ if(uiVisible)toggleSettingsPanel(config); };
// Canvas click: shoot
cvs.addEventListener('click', e => {
  if (!config.rocket.enabled()) return;
  const rect = cvs.getBoundingClientRect(), x = ((e.clientX-rect.left)/rect.width*64)|0, y = ((e.clientY-rect.top)/rect.height*64)|0;
  flyingObjects.push({ type: 'shooting', x: 32, y: 60, vx: (x-32)*0.05, vy: (y-60)*0.05, life: config.shooting.life, sizeStart: 1.5, sizeEnd: .5, trail: [] });
});
// FPS/layer status
function updStatus() {
  fc++; const now = performance.now();
  if(now-lt>=1e3){$('fps').textContent=`FPS:${fc}`;fc=0;lt=now;$('layers').textContent=`Layers:${Object.keys(layer).filter(k=>layer[k]).join('+')||'none'}`;}
}
resetScene(); draw(); setUIVisible(false);

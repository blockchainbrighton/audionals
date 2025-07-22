// === config.js ===
const ANIMATION_CONFIG = { helmet:{mode:"fade"}, hud:{mode:"fade"} };
const SEED = 0;
const BASE_CFG = { sineWave:false, ecg:true, flashing:false, text:"AUDIONAUTS", fontSize:28 };

// === seedConfigs.js ===
const D_FONT='"Arial",sans-serif', D_COLOR="rgba(0,255,255,0.33)", D_STEP=28;
const autoSpeed=(step,chars,bar=9.22,div=1)=>step*chars/(bar/div);
const genBin=len=>[...Array(len)].map(()=>Math.random()<.5?0:1).join('');
const genHex=len=>[...Array(len)].map((_,i)=>i.toString(16).padStart(2,'0')).join(' ');
const SEED_CONFIGS=[{},
  {name:"Emergency Broadcast – Rebellion Call",text:"⚠️ ALERT // DSP TITANS ADVANCING // TAKE BACK THE AIRWAVES ⚠️",color:"rgba(255,0,0,0.7)",fontSize:26,step:28,speed:autoSpeed(28,57),flashing:true,flashSync:true,flashBeats:1,flashSyncBPM:104.15,flashDivision:1},
  {name:"On-Chain Cipher",text:"01000001 01110101 01100100 01101001 01101111 00100000 01010110 01101001 01100100 01100101 00100000",color:"rgba(0,255,80,0.4)",font:'"Fira Code",monospace',fontSize:24,step:26,speed:autoSpeed(26,99),glitch:0.8},
  {name:"Rainbow Rave Anthem",text:"⛓️ UNCHAIN 🪩 THE 🪩 SOUND 🎶 RETAKE 🪩 THE 🪩 FEED  ",fontSize:34,step:36,speed:40,rainbow:true,depth:0.1},
  {name:"Encrypted Whispers",text:"...gatekeeper static fading... pros reclaiming stems... hold the swing...",color:"rgba(200,220,255,0.15)",fontSize:22,step:24,speed:autoSpeed(24,70),glitch:1.5,depth:0.1},
  {name:"Sonic Freedom Wave (sine)",sineWave:true,color:"rgba(255,60,60,0.5)",fontSize:20,step:22,speed:autoSpeed(22,10,9.22,2),amplitude:20,frequency:0.25,lineWidth:2,depth:0.1},
  {name:"ECG – Beat of Revolution",ecg:true,heartbeatSpeed:0.5,peakOnBeat:true,color:"rgba(255,100,100,0.7)",speed:0.25,amplitude:45,cycleWidth:250,lineWidth:2,depth:0.1},
  {name:"Golden Block Confirmed",text:"SYSTEMS GREEN ✅ PRO PAY ROUTED ✅ BLOCK FINALIZED ",color:"rgba(255,215,0,0.4)",font:'"Times New Roman",serif',fontSize:24,step:26,speed:autoSpeed(26,52)},
  {name:"Minimal Pulse",text:"::::::::::::::::::::::::::::::::::::::::::::::::",color:"rgba(100,100,100,0.1)",fontSize:40,step:42,speed:autoSpeed(42,48),depth:0.1},
  {name:"Audionaut Dispatch",text:"🚀 AUDIONAUT // PRO NODE ONLINE – OWN YOUR MIX 🎧 ",color:"rgba(0,255,255,0.25)",font:'"Courier New",monospace',fontSize:28,step:30,speed:78,depth:0.1,effect:"none"},
  {name:"Celestial Harmony Rain",text:"🌌🔗🎧💎🎼🪐🚀🎶✨",fontSize:36,step:40,speed:autoSpeed(40,9,9.22,2),color:"rgba(255,200,0,0.5)",font:'"Segoe UI Emoji",sans-serif',depth:0.1,effect:"emojiRain"},
  {name:"Critical Rhythm Warning",text:"!!! WARNING // ROYALTY FLOW CRITICAL !!!",color:"rgba(255,0,0,0.8)",font:'"Impact",sans-serif',fontSize:32,step:46,speed:60,depth:0.1,effect:"flash"},
  {name:"Random Ledger Stream",text:genBin(200),color:"rgba(0,255,70,0.3)",font:'"Lucida Console",monospace',fontSize:24,step:26,speed:autoSpeed(26,200),depth:0.1,effect:"matrix"},
  {name:"Blockbeat Calibration",text:"…CALIBRATING PRO RIGHTS… DISTRIBUTION NODES PURGED…",font:'"Verdana",sans-serif',fontSize:30,step:34,speed:60,depth:0.1,effect:"rainbowWave"},
  {name:"Legacy System Debug",text:"▌▌▌▌▌▌ DISMANTLING GATEKEEPERS ▌▌▌▌▌▌",color:"rgba(0,255,0,0.2)",font:'"Press Start 2P",monospace',fontSize:20,step:22,speed:60,depth:0.1,effect:"scanline"},
  {name:"Neon Refrain",text:"⚡ DIRECT-TO-CHAIN // NO MIDDLEMEN ⚡",color:"rgba(255,0,255,0.6)",font:'"Arial Black",sans-serif',fontSize:25,step:27,speed:autoSpeed(27,38),depth:0.1,effect:"pulse"},
  {name:"Stealth Sync",text:"…satellite link secured… royalties rerouted…",color:"rgba(255,255,255,0.05)",font:'"Courier New",monospace',fontSize:28,step:30,speed:autoSpeed(30,50),depth:0.1,effect:"none"},
  {name:"Diagnostic Dump",text:genHex(100),color:"rgba(100,100,255,0.3)",font:'"Courier New",monospace',fontSize:32,step:34,speed:autoSpeed(34,299),depth:0.1,effect:"glitch"},
  {name:"Matrix Override",text:"🟩 DECENTRALISE PRO MIXDOWN 🟩 ",fontSize:26,step:28,speed:autoSpeed(28,30),color:"rgba(0,255,64,.33)",font:'bold 22px "Consolas",monospace',extra:{matrix:true}},
  {name:"Synthwave Uprising",text:"👾 SYNTHWAVE UPRISING // ROYALTIES REBOOTED 🚦 ",fontSize:24,step:26,speed:autoSpeed(26,44),color:"rgba(255,0,224,0.38)",font:'"Press Start 2P",monospace',extra:{shadow:"#ff00ff"}},
  {name:"Redline Burn",text:"⚠️ LEGACY CONTRACTS FOUND // AUTO-BURN START ⚠️ ",fontSize:32,step:36,speed:60,color:"rgba(255,24,24,0.8)",font:'"Arial Black",Arial,sans-serif',extra:{flash:true}},
  {name:"Mission – BlockRocket",text:"🛰️ BLOCKROCKET ENGAGED – LAUNCHING PRO PAYLOAD 🌌 ",fontSize:27,step:29,speed:60,color:"rgba(80,170,255,.33)",font:'"Orbitron",sans-serif',extra:{shadow:"#ffffff"}},
  {name:"Signal Jam",text:"↯ DRM STATIC NULLIFIED ↯ CHANNEL RESTORED ",fontSize:28,step:30,speed:60,color:"rgba(255,40,210,.30)",font:'"JetBrains Mono",monospace',extra:{glitch:true}},
  {name:"Airlock Pulse",text:"🚨 AIRLOCK OPEN – FLOOD THE BEAT 🚨 ",fontSize:30,step:32,speed:autoSpeed(32,36),color:"rgba(255,0,0,0.8)",font:'"Arial Black",Arial,sans-serif',extra:{strobe:true}},
  {name:"Royalty Relay",text:"💸 REAL-TIME SPLITS STREAMING 💸 ",fontSize:26,step:28,speed:autoSpeed(28,32),color:"rgba(0,255,200,0.35)",font:'"DM Mono",monospace',extra:{glow:true}},
  {name:"Chain Choir",text:"⛓️🎶 NODE VOICES UNITED 🎶⛓️ ",fontSize:24,step:26,speed:autoSpeed(26,28),color:"rgba(180,120,255,0.4)",font:'"Press Start 2P",monospace',extra:{echo:true}},
  {name:"Ledger Lantern",text:"🏮 TRANSPARENT PATH FOR PROS 🏮 ",fontSize:28,step:30,speed:autoSpeed(30,32),color:"rgba(255,165,0,0.45)",font:'"Lucida Console",monospace',extra:{scroll:true}},
  {name:"Spectral Sync",text:"…multi-chain ghosts in tune…",fontSize:28,step:30,speed:autoSpeed(30,30),color:"rgba(255,255,255,0.25)",font:'"Courier New",monospace',effect:"fade",depth:0.1},
  {name:"Neon Node Flux",text:"⚡ NODE COUNT 10K+ // THRUST MAX ⚡",fontSize:25,step:27,speed:autoSpeed(27,33),color:"rgba(0,255,255,0.6)",font:'"Arial Black",sans-serif',effect:"pulse"},
  {name:"Bassline Beacon",fontSize:31,step:22,speed:100,color:"rgba(0,0,0,0.75)",font:'"Impact",sans-serif',text:"🔊 FOLLOW THE BASS / 🔊 / FREEDOM FREQUENCY ",effect:"flash"},
  {name:"Bassline Beacon 2",fontSize:31,step:22,speed:100,color:"rgba(0,0,0,0.75)",font:'"Impact",sans-serif',text:"🎧 SHAPE THE FUTURE /🎼/ HONOUR THE ARTISTS ",effect:"flash"},
  {name:"Ouroboros Overdrive",text:"∞ LOOP THE LOOP // SOUND ETERNAL ",fontSize:26,step:28,speed:autoSpeed(28,33),color:"rgba(128,0,255,0.5)",font:'"Consolas",monospace',extra:{spin:true}}
];

// === state.js ===
const PLAYBACK_STATE = { isPlaying:false };

// === geometry.js ===
function updateGeometry(geom,cvs){geom.helmet={x:10,y:10,w:100,h:40};geom.visor={x:20,y:20,w:80,h:30}}

// === grain.js ===
function grain(ctx,geom,noise,nCtx,CFG){
  const {w,h}=geom.visor;noise.width=w;noise.height=h;
  const d=nCtx.createImageData(w,h);
  const alpha=CFG.flashing?40:18;
  for(let i=0;i<d.data.length;i+=4){
    const g=Math.random()*255|0;
    d.data[i]=d.data[i+1]=d.data[i+2]=g;
    d.data[i+3]=alpha;
  }
  nCtx.putImageData(d,0,0);
  nCtx.save();nCtx.globalCompositeOperation="destination-in";
  nCtx.beginPath();nCtx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);nCtx.fill();nCtx.restore();
  ctx.drawImage(noise,geom.visor.x,geom.visor.y);
}

// === curve.js ===
function curve(ctx,x,y,w,h){ctx.moveTo(x,y+h/2);ctx.bezierCurveTo(x+w/3,y,x+2*w/3,y+h,x+w,y+h/2)}

// === heartbeat.js ===
const HEARTBEAT_SETTINGS={bpm:104.15};
function beep(){if(typeof AudioContext!=="undefined"){const ctx=new AudioContext(),osc=ctx.createOscillator();osc.type="sine";osc.frequency.value=880;osc.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.05);osc.onended=()=>ctx.close()}}
function initECG(){return{beats:[],lastTime:0}}

// === flashUtils.js ===
function isFlashOn(state){return!!state.flashing}

// === setupState.js ===
function setupAnimationState(isPlaying,state,helmet,cvs){
  state.startTime=isPlaying?performance.now():0;
  state.helmet={fadeInTriggered:0,fadeOutTriggered:0};
  state.hud={fadeInTriggered:0,fadeOutTriggered:0};
  Object.entries({helmet,hud:cvs}).forEach(([key,el])=>{
    if(!el) return;
    el.style.transition='none';
    el.style.opacity=isPlaying?(ANIMATION_CONFIG[key]?.mode==='fade'?'0':'1'):'1';
  });
}

// === loop.js ===
function loop(ctx,cvs,geom,CFG,chars,helmet,noise,nCtx,state,lastHeartbeat,lastTime,pxOffset,charShift){
  return t=>{
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const o=geom.visor;
    ctx.save();ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.clip();
    if(CFG.sineWave){
      // sine placeholder
    }else if(CFG.ecg){
      ctx.strokeStyle="#0ff";ctx.lineWidth=2;ctx.beginPath();curve(ctx,o.x,o.y,o.w,o.h);ctx.stroke();
    }
    ctx.restore();
    if(CFG.flashing)grain(ctx,geom,noise,nCtx,CFG);
  };
}

// === index.js (Entry Point) ===
(()=>{
  const cfg={...BASE_CFG,...SEED_CONFIGS[SEED%SEED_CONFIGS.length]||{}};
  const cvs=document.getElementById("hud-canvas");
  const ctx=cvs.getContext("2d",{alpha:true});
  const noise=document.createElement("canvas");
  const nCtx=noise.getContext("2d",{willReadFrequently:true});
  const helmet=document.getElementById("helmet-overlay");
  const geom={helmet:{},visor:{}};
  const state={};
  updateGeometry(geom,cvs);
  setupAnimationState(false,state,helmet,cvs);

  // sync global state
  Object.defineProperty(window,'PLAYBACK_STATE',{get:()=>window.fxPlaybackState||{isPlaying:false},configurable:true});

  const draw=loop(ctx,cvs,geom,cfg,[],helmet,noise,nCtx,state,{},{},{},{});
  function frame(t){
    setupAnimationState(PLAYBACK_STATE.isPlaying,state,helmet,cvs);
    draw(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
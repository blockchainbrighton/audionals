import { Patchbay } from './patchbay.js';
import { ModuleLoader } from './modules.js';
import { UI } from './ui.js';
// FIX: Import the named 'start' function from tone's .mjs module
import { start as toneStart } from 'tone';

// UI Elements (remain the same)
const startButton = document.getElementById('start-button');
const container = document.getElementById('patchbay-container');
const addOscButton = document.getElementById('add-osc');
const addDelayButton = document.getElementById('add-delay');
const addEqButton = document.getElementById('add-eq');
const addPluginAButton = document.getElementById('add-plugin-a');
const addPluginBButton = document.getElementById('add-plugin-b');

// State variables (remain the same)
let audioContext = null;
let patchbay = null;
let loader = null;
let ui = null;

function enableAddButtons() {
    addOscButton.disabled = false;
    addDelayButton.disabled = false;
    addEqButton.disabled = false;
    addPluginAButton.disabled = false;
    addPluginBButton.disabled = false;
}

async function init() {
  try {
    console.log('Initializing Audio Context and Patchbay...');
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === 'suspended') {
        console.log('AudioContext suspended, resuming...');
        await audioContext.resume();
    }
    console.log('Audio Context state:', audioContext.state);

    if (audioContext.state !== 'running') {
        throw new Error(`AudioContext failed to start. State: ${audioContext.state}`);
    }

    patchbay = new Patchbay(audioContext);
    // ModuleLoader constructor now uses imported setContext/getContext from .mjs
    loader = new ModuleLoader(audioContext, patchbay);
    ui = new UI(patchbay, container);

    // FIX: Call the imported 'toneStart' function
    console.log("Starting Tone.js v15 internal state using imported start() (.mjs)...");
    await toneStart();
    console.log("Tone.js v15 started.");

    console.log('Preloading Oscillator module...');
    // ModuleLoader now uses named imports from .mjs
    const initialMod = await loader.loadToneOscillator();
    ui.createPanelForModule(initialMod);
    console.log('Initialization complete.');

    enableAddButtons();

  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.message.includes('AudioContext failed to start')) {
         alert("AudioContext could not be started. Please ensure audio is enabled in your browser/OS and try again.");
    } else {
         alert("Failed to initialize audio components. Check console for details.");
    }
    startButton.textContent = 'Start Audio';
    startButton.disabled = false;
  }
}

// startButton listener remains the same
startButton.addEventListener('click', async () => {
  if (audioContext) return;
  startButton.disabled = true;
  startButton.textContent = 'Initializing...';
  await init();

   if (audioContext && audioContext.state === 'running') {
       startButton.textContent = 'Audio Running';
   } else {
       startButton.textContent = 'Start Failed';
       startButton.disabled = false;
   }
});


// Add module button listeners remain the same
addOscButton.addEventListener('click', async ()=>{
  if (!loader || !ui) { console.warn("System not initialized"); return; }
  try {
      console.log("Adding Oscillator...");
      const mod = await loader.loadToneOscillator();
      ui.createPanelForModule(mod);
  } catch (error) { console.error("Failed to load Oscillator:", error); }
});
addDelayButton.addEventListener('click', async ()=>{
  if (!loader || !ui) { console.warn("System not initialized"); return; }
   try {
      console.log("Adding Delay...");
      const mod = await loader.loadToneDelay();
      ui.createPanelForModule(mod);
   } catch (error) { console.error("Failed to load Delay:", error); }
});
addEqButton.addEventListener('click', async ()=>{
  if (!loader || !ui) { console.warn("System not initialized"); return; }
  try {
      console.log("Adding EQ3...");
      const mod = await loader.loadToneEQ3();
      ui.createPanelForModule(mod);
  } catch (error) { console.error("Failed to load EQ3:", error); }
});
addPluginAButton.addEventListener('click', async ()=>{
  if (!loader || !ui) { console.warn("System not initialized"); return; }
  try {
      console.log("Adding Plugin A...");
      const url = 'https://ordinals.com/content/779997549398e3c67943f21b29b357b7bc845f4aa3b3367b87a9f0903bdccd5bi0';
      const mod = await loader.loadWamPlugin(url, 'Plugin A');
      ui.createPanelForModule(mod);
  } catch (error) { console.error("Failed to load Plugin A:", error); }
});
addPluginBButton.addEventListener('click', async ()=>{
  if (!loader || !ui) { console.warn("System not initialized"); return; }
  try {
      console.log("Adding Plugin B...");
      const url = 'https://ordinals.com/content/598a448d0e134e90855e6fba03d7b2e2610423f185ba513d3c1a8022a9d0d591i0';
      const mod = await loader.loadWamPlugin(url, 'Plugin B');
      ui.createPanelForModule(mod);
  } catch (error) { console.error("Failed to load Plugin B:", error); }
});
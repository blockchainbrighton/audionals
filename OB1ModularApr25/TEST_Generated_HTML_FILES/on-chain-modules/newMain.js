// --- START OF FILE main.js ---
// --- Module Imports ---
// Import core functionalities
import * as audio from "/content/fd2db7ac8153b198609b621e152d46c135ed0079bf68102f14137c579f988b95i0"; // Audio processing
import * as ui from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // UI updates and interactions
import * as midiHandler from "/content/0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0"; // MIDI device handling
import * as keyboardShortcuts from "/content/665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0"; // Keyboard shortcut handling

// Import specific utilities and components
import { initReferencePanel } from "/content/0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0"; // Function to initialize the reference panel
import { clamp, _isInputFocused, addListener, createElement } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // Utility functions

const DEFAULT_TEMPO=78,DEFAULT_PITCH=1,DEFAULT_VOLUME=1,DEFAULT_MULTIPLIER=1;
const MIN_TEMPO=1,MAX_TEMPO=400,MIN_PITCH=0.01,MAX_PITCH=10,MIN_VOLUME=0,MAX_VOLUME=1.5,MIN_MULT=1,MAX_MULT=8;

let appContainer,mainImage,playOnceBtn,loopToggleBtn,reverseToggleBtn,tempoSlider,pitchSlider,volumeSlider,multiplierSlider,controlsContainer,infoToggleBtn,referencePanel,errorMessageDiv,midiDeviceSelect,midiStatusSpan,controlsColumn,referenceColumn;

function findElements(){
  [['app',el=>appContainer=document.getElementById(el)],
   ['main-image',el=>mainImage=document.getElementById(el)],
   ['play-once-btn',el=>playOnceBtn=document.getElementById(el)],
   ['loop-toggle-btn',el=>loopToggleBtn=document.getElementById(el)],
   ['reverse-toggle-btn',el=>reverseToggleBtn=document.getElementById(el)],
   ['tempo-slider',el=>tempoSlider=document.getElementById(el)],
   ['pitch-slider',el=>pitchSlider=document.getElementById(el)],
   ['volume-slider',el=>volumeSlider=document.getElementById(el)],
   ['multiplier-slider',el=>multiplierSlider=document.getElementById(el)],
   ['controls-container',el=>controlsContainer=document.getElementById(el)],
   ['info-toggle-btn',el=>infoToggleBtn=document.getElementById(el)],
   ['reference-panel',el=>referencePanel=document.getElementById(el)],
   ['error-message',el=>errorMessageDiv=document.getElementById(el)],
   ['midi-device-select',el=>midiDeviceSelect=document.getElementById(el)],
   ['midi-status',el=>midiStatusSpan=document.getElementById(el)],
   ['.controls-column',sel=>controlsColumn=document.querySelector(sel)],
   ['.reference-column',sel=>referenceColumn=document.querySelector(sel)]
  ].forEach(([sel,set])=>set(sel));

  if(!appContainer||!controlsContainer||!errorMessageDiv||!mainImage||!controlsColumn){
    (document.getElementById('app')||document.body).innerHTML='<p style="color:red;padding:20px;">Fatal Error: Missing UI</p>';
    return false;
  }
  return true;
}

function validateAndFormatDataSource(data,prefix,name){
  if(!data||typeof data!=='string'||data.startsWith('/*')) throw new Error(`Missing or invalid ${name}`);
  return data.startsWith('data:')?data:prefix+data;
}

function handleSliderInput(event,audioSetter,uiUpdater,parser=parseFloat){
  const s=event.target,v=parser(s.value),min=parser(s.min),max=parser(s.max);
  if(isNaN(v)||isNaN(min)||isNaN(max)) return;
  const c=clamp(v,min,max);
  audioSetter(c);
  uiUpdater(c);
}

async function handleLoopToggle(){
  const loop=audio.getLoopingState();
  await audio.resumeContext();
  loop?audio.stopLoop():audio.startLoop();
  ui.updateLoopButton(audio.getLoopingState());
}

function toggleSideColumns(){
  controlsColumn.classList.toggle('hidden');
  referenceColumn?.classList.toggle('hidden');
}

function handleNoteOn(note,vel){
  const rate=audio.getPlaybackRateForNote(note);
  rate && audio.playSampleAtRate(rate,vel);
}

function handleMidiStateChange({status,message,devices,selectedDeviceId}){
  if(!midiDeviceSelect||!midiStatusSpan) return;
  midiStatusSpan.textContent = message || status;
  midiStatusSpan.style.color = /error|unsupported|unavailable/.test(status)?'var(--error-color)':'';

  midiDeviceSelect.innerHTML='';
  const placeholder = createElement('option',{
    value:'',
    textContent: status==='ready'?'-- Select MIDI Device --':'-- MIDI Unavailable --'
  });
  placeholder.disabled = true;
  midiDeviceSelect.appendChild(placeholder);

  if(status==='ready' && devices?.length){
    midiDeviceSelect.disabled=false;
    placeholder.disabled=false;
    devices.forEach(d=> midiDeviceSelect.appendChild(createElement('option',{value:d.id,textContent:d.name})) );
    midiDeviceSelect.value = selectedDeviceId || '';
    midiStatusSpan.textContent = selectedDeviceId && devices.find(d=>d.id===selectedDeviceId)
      ? `Connected: ${devices.find(d=>d.id===selectedDeviceId).name}`
      : 'MIDI devices available.';
  } else {
    midiDeviceSelect.disabled = true;
  }
}

async function initializeApp(){
  if(!findElements()) return;
  ui.init?.(); ui.clearError();

  let imageSrc,audioSrc;
  try{
    imageSrc = validateAndFormatDataSource(imageBase64,'data:image/jpeg;base64,','imageBase64');
    audioSrc = validateAndFormatDataSource(audioBase64_Opus,'data:audio/opus;base64,','audioBase64_Opus');
    ui.setImageSource(imageSrc);
  } catch(err){ ui.showError(err.message); return; }

  const ini={
    tempo: clamp(+tempoSlider.value||DEFAULT_TEMPO,MIN_TEMPO,MAX_TEMPO),
    pitch: clamp(+pitchSlider.value||DEFAULT_PITCH,MIN_PITCH,MAX_PITCH),
    volume: clamp(+volumeSlider.value||DEFAULT_VOLUME,MIN_VOLUME,MAX_VOLUME),
    mult: clamp(+multiplierSlider.value||DEFAULT_MULTIPLIER,MIN_MULT,MAX_MULT)
  };
  tempoSlider.value=ini.tempo;
  pitchSlider.value=ini.pitch;
  volumeSlider.value=ini.volume;
  multiplierSlider.value=ini.mult;

  midiHandler.init(handleNoteOn,()=>{},handleMidiStateChange);
  if(!(await audio.init(audioSrc,ini.tempo,ini.pitch))) return;
  audio.setVolume(ini.volume);

  referencePanel && initReferencePanel(referencePanel);
  keyboardShortcuts.init?.({ tempoSlider,pitchSlider,volumeSlider,multiplierSlider });

  setupEventListeners();

  ui.updateTempoDisplay(ini.tempo);
  ui.updatePitchDisplay(ini.pitch);
  ui.updateVolumeDisplay(ini.volume);
  ui.updateScheduleMultiplierDisplay(ini.mult);
  ui.updateLoopButton(audio.getLoopingState());
  ui.updateReverseButton(audio.getReverseState());
  ui.enableControls();
}

function setupEventListeners(){
  addListener(mainImage,'click',handleLoopToggle);
  addListener(playOnceBtn,'click',()=>audio.playOnce());
  addListener(loopToggleBtn,'click',handleLoopToggle);
  addListener(reverseToggleBtn,'click',()=>
    audio.resumeContext().then(()=>ui.updateReverseButton(audio.toggleReverse()))
  );

  addListener(tempoSlider,'input',e=>handleSliderInput(e,audio.setTempo,ui.updateTempoDisplay,parseInt));
  addListener(pitchSlider,'input',e=>handleSliderInput(e,audio.setGlobalPitch,ui.updatePitchDisplay));
  addListener(volumeSlider,'input',e=>handleSliderInput(e,audio.setVolume,ui.updateVolumeDisplay));
  addListener(multiplierSlider,'input',e=>handleSliderInput(e,audio.setScheduleMultiplier,ui.updateScheduleMultiplierDisplay,parseInt));

  addListener(midiDeviceSelect,'change',e=> midiHandler.selectDevice(e.target.value) );
  addListener(infoToggleBtn,'click',toggleSideColumns);

  window.addEventListener('keydown',e=>{
    if(e.repeat||_isInputFocused(e.target)) return;
    if(!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey){
      if(e.code==='Space'){ audio.playOnce(); e.preventDefault(); }
      if(e.key==='i'){ toggleSideColumns(); e.preventDefault(); }
      if(e.key==='r'){
        audio.resumeContext().then(()=>ui.updateReverseButton(audio.toggleReverse()));
        e.preventDefault();
      }
    }
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initializeApp);
else initializeApp();

// --- END OF FILE main.js ---
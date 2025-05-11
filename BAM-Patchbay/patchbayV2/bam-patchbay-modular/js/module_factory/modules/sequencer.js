// js/module_factory/modules/sequencer.js
import { audioCtx } from '../../audio_context.js';
import { getMasterBpm } from '../../shared_state.js'; // Import getMasterBpm

export function createSequencerModule(parent, moduleId) {
  const numSteps = 16;
  const steps = Array(numSteps).fill(false);
  let currentStep = 0; // Renamed from 'current' to avoid confusion
  let isPlayingLocally = false; // Sequencer's own playing state, controlled globally
  let currentBpm = getMasterBpm(); // Initialize with global BPM
  let stepIntervalMs = (60 / currentBpm / 4) * 1000; // 16th notes
  
  let nextStepTime = 0;
  const lookaheadMs = 25;     // How often we wake up to schedule
  const scheduleAheadTimeSec = 0.1; // How far ahead to schedule audio events

  let schedulerTimerId;

  const el = (tag, props = {}, style = {}) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    Object.assign(e.style, style);
    return e;
  };

  // --- Create UI Elements ---
  const stepsContainer = el('div', {}, { display: 'flex', marginTop: '5px', marginBottom: '5px' });
  const stepElements = Array.from({ length: numSteps }, (_, i) => {
    const stepDiv = el('div', {}, {
      width: '20px', height: '20px', border: '1px solid #555',
      marginRight: '2px', backgroundColor: '#333', cursor: 'pointer',
      boxSizing: 'border-box'
    });
    stepDiv.onclick = () => {
      steps[i] = !steps[i];
      stepDiv.style.backgroundColor = steps[i] ? 'orange' : '#333';
    };
    stepsContainer.appendChild(stepDiv);
    return stepDiv;
  });
  parent.appendChild(stepsContainer);

  const updateUI = () => {
    stepElements.forEach((stepDiv, i) => {
      if (isPlayingLocally && i === currentStep) {
        stepDiv.style.border = '2px solid yellow';
      } else {
        stepDiv.style.border = '1px solid #555';
      }
      if (!isPlayingLocally) {
         stepDiv.style.backgroundColor = steps[i] ? 'orange' : '#333';
      }
    });
  };

  // --- Scheduler Logic ---
  const scheduleStepAudio = (stepIndex, time) => {
    if (steps[stepIndex]) {
      // Trigger connected modules
      // **** ADD DIAGNOSTIC LOGGING HERE ****
      if (moduleInstance.connectedTriggers.length > 0) {
        console.log(`[Sequencer ${moduleId}] Step ${stepIndex} is active. Firing ${moduleInstance.connectedTriggers.length} connected triggers at time ${time.toFixed(3)}.`);
      }

      moduleInstance.connectedTriggers.forEach((triggerFn, idx) => {
        // **** MORE DIAGNOSTIC LOGGING ****
        console.log(`[Sequencer ${moduleId}] Attempting to call connectedTriggers[${idx}]. Type: ${typeof triggerFn}`, triggerFn);
        
        if (typeof triggerFn === 'function') {
          try {
            triggerFn(time);
          } catch (e) {
            console.error(`[Sequencer ${moduleId}] Error EXECUTING connected trigger function connectedTriggers[${idx}]:`, e, "Function was:", triggerFn);
          }
        } else {
          // This case should ideally be caught by connectTrigger, but as a safeguard:
          console.error(`[Sequencer ${moduleId}] SKIPPING connectedTriggers[${idx}] because it's NOT A FUNCTION. Value:`, triggerFn);
        }
      });
    }
  };

  const scheduler = () => {
    while (nextStepTime < audioCtx.currentTime + scheduleAheadTimeSec) {
      scheduleStepAudio(currentStep, nextStepTime);
      nextStepTime += stepIntervalMs / 1000;
      currentStep = (currentStep + 1) % numSteps;
    }
    updateUI(); 
    if (isPlayingLocally) {
      schedulerTimerId = setTimeout(scheduler, lookaheadMs);
    }
  };

  const setTempo = (newBpm) => {
    currentBpm = newBpm;
    stepIntervalMs = (60 / currentBpm / 4) * 1000;
    console.log(`[Sequencer ${moduleId}] Tempo set to ${currentBpm} BPM, interval ${stepIntervalMs.toFixed(2)}ms`);
  };

  const startSequence = () => {
    if (isPlayingLocally) return;
    if (audioCtx.state === 'suspended') {
      console.warn(`[Sequencer ${moduleId}] AudioContext is suspended when starting sequence.`);
    }
    isPlayingLocally = true;
    currentStep = 0;
    nextStepTime = audioCtx.currentTime + 0.05;
    
    // **** DIAGNOSTIC LOGGING ****
    console.log(`[Sequencer ${moduleId}] Starting sequence. Connected triggers:`, moduleInstance.connectedTriggers);

    scheduler();
    console.log(`[Sequencer ${moduleId}] Started by global play.`);
    updateUI();
  };

  const stopSequence = () => {
    if (!isPlayingLocally) return;
    isPlayingLocally = false;
    clearTimeout(schedulerTimerId);
    console.log(`[Sequencer ${moduleId}] Stopped by global play.`);
    updateUI();
  };

  updateUI();

  const moduleInstance = {
    id: moduleId,
    type: 'sequencer',
    element: parent,
    audioNode: null,
    setTempo,
    startSequence,
    stopSequence,
    connectedTriggers: [],
    
    // **** UPDATE connectTrigger METHOD ****
    connectTrigger: function(triggerFunctionToAdd) {
      console.log(`[Sequencer ${this.id}] connectTrigger called. Attempting to add:`, triggerFunctionToAdd);
      if (typeof triggerFunctionToAdd === 'function') {
        this.connectedTriggers.push(triggerFunctionToAdd);
        console.log(`[Sequencer ${this.id}] Successfully connected trigger. Total connected: ${this.connectedTriggers.length}`);
      } else {
        console.error(`[Sequencer ${this.id}] FAILED to connect trigger: Provided item is NOT A FUNCTION. Type: ${typeof triggerFunctionToAdd}. Received:`, triggerFunctionToAdd);
        // Optionally, you could throw an error here to make it fail loudly at connection time
        // throw new Error(`[Sequencer ${this.id}] Invalid item provided to connectTrigger. Expected function, got ${typeof triggerFunctionToAdd}.`);
      }
    },
    disconnectTrigger: function(triggerFunctionToRemove) {
      const initialLength = this.connectedTriggers.length;
      this.connectedTriggers = this.connectedTriggers.filter(fn => fn !== triggerFunctionToRemove);
      if (this.connectedTriggers.length < initialLength) {
          console.log(`[Sequencer ${this.id}] Disconnected a trigger. Total connected: ${this.connectedTriggers.length}`);
      } else {
          console.warn(`[Sequencer ${this.id}] disconnectTrigger: function not found in connectedTriggers.`, triggerFunctionToRemove);
      }
    }
  };

  return moduleInstance;
}
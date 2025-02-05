// stepSchedulers.js

(function () {
    "use strict";
  
    // Define a local log function that checks the global debug flag.
    const log = (msg, ...args) => {
      if (window.unifiedSequencerSettings && window.unifiedSequencerSettings.DEBUG) {
        console.log(msg, ...args);
      }
    };
  
    function startScheduler() {
      clearTimeout(timeoutId);
      window.unifiedSequencerSettings.audioContext.resume();
      startTime = window.unifiedSequencerSettings.audioContext.currentTime;
      nextStepTime = startTime;
      const currentBPM = window.unifiedSequencerSettings.getBPM();
      log(`[startScheduler] Starting scheduler at time ${startTime} with BPM: ${currentBPM}`);
      scheduleNextStep();
    }
  
    function scheduleNextStep() {
      const bpm = window.unifiedSequencerSettings.getBPM() || 105;
      stepDuration = 60 / bpm / 4;
      log(`[scheduleNextStep] BPM: ${bpm}, Step Duration: ${stepDuration}, Next step scheduled for: ${nextStepTime}`);
  
      const currentTime = window.unifiedSequencerSettings.audioContext.currentTime;
      const timeUntilNextStep = (nextStepTime - currentTime) * 1000;
      log(`[scheduleNextStep] Audio context time: ${currentTime}. Waiting ${timeUntilNextStep} ms until next step.`);
  
      timeoutId = setTimeout(() => {
        playStep();
        scheduleNextStep();
      }, timeUntilNextStep);
    }
  
    function pauseScheduler() {
      clearTimeout(timeoutId);
      window.unifiedSequencerSettings.audioContext.suspend();
      pauseTime = window.unifiedSequencerSettings.audioContext.currentTime;
      isPaused = true;
      log(`[pauseScheduler] Scheduler paused at ${pauseTime}`);
    }
  
    function resumeScheduler() {
      if (isPaused) {
        window.unifiedSequencerSettings.audioContext.resume();
        nextStepTime = window.unifiedSequencerSettings.audioContext.currentTime;
        isPaused = false;
        log(`[resumeScheduler] Scheduler resumed at ${nextStepTime}`);
      }
      scheduleNextStep();
    }
  
    function stopScheduler() {
      log('[stopScheduler] Stopping scheduler.');
      clearTimeout(timeoutId);
      window.unifiedSequencerSettings.sourceNodes.forEach((source, index) => {
        if (source && source.started) {
          source.stop();
          source.disconnect();
          window.unifiedSequencerSettings.sourceNodes[index] = null;
          log(`[stopScheduler] Stopped source node for channel ${index}`);
        }
      });
      currentStep = 0;
      beatCount = 1;
      barCount = 1;
      sequenceCount = 0;
      isPaused = false;
      pauseTime = 0;
      log('[stopScheduler] Scheduler and counters reset.');
    }
  
    function resetStepLights() {
      const buttons = document.querySelectorAll('.step-button');
      buttons.forEach(button => button.classList.remove('playing'));
    }
  
    // Expose functions if needed (or integrate within your module structure)
    window.startScheduler = startScheduler;
    window.scheduleNextStep = scheduleNextStep;
    window.pauseScheduler = pauseScheduler;
    window.resumeScheduler = resumeScheduler;
    window.stopScheduler = stopScheduler;
    window.resetStepLights = resetStepLights;
  })();
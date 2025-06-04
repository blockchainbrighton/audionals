/**
 * Timeline Manager
 * Manages timeline execution and automation scheduling
 */

import { MathUtils } from '../utils/index.js';

export class TimelineManager {
  constructor(effectManager, syncManager) {
    this.effectManager = effectManager;
    this.syncManager = syncManager;
    this.timeline = [];
    this.automations = [];
    this.isPlaying = false;
    this.timelineCompleteLogged = false;
    this.automationActiveState = {};
    this.lastLoggedBar = -1;
  }

  /**
   * Load timeline data
   * @param {Array} timelineData - Timeline commands
   */
  loadTimeline(timelineData) {
    this.timeline = Array.isArray(timelineData) ? [...timelineData] : [];
    this.clearAutomations();
    this.scheduleTimelineAutomations();
    this.logTimelineDetails();
  }

  /**
   * Schedule automations from timeline
   * @private
   */
  scheduleTimelineAutomations() {
    this.timeline.forEach(command => {
      this.scheduleAutomation({
        effect: command.effect,
        param: command.param,
        from: command.from,
        to: command.to,
        start: command.startBar ?? command.start ?? 0,
        end: command.endBar ?? command.end ?? 0,
        unit: 'bar',
        easing: command.easing || 'linear'
      });
    });
  }

  /**
   * Schedule a single automation
   * @param {Object} automation - Automation parameters
   */
  scheduleAutomation({ effect, param, from, to, start, end, unit = 'sec', easing = 'linear' }) {
    const startSec = unit === 'bar' ? this.syncManager.barsToSeconds(start) :
                     unit === 'beat' ? this.syncManager.beatsToSeconds(start) : start;
    const endSec = unit === 'bar' ? this.syncManager.barsToSeconds(end) :
                   unit === 'beat' ? this.syncManager.beatsToSeconds(end) : end;

    this.automations.push({
      effect,
      param,
      from,
      to,
      startSec,
      endSec,
      easing,
      done: false
    });
  }

  /**
   * Start timeline playback
   */
  start() {
    this.isPlaying = true;
    this.timelineCompleteLogged = false;
    this.automationActiveState = {};
    this.lastLoggedBar = -1;
    
    // Reset all automations
    this.automations.forEach(automation => {
      automation.done = false;
    });
  }

  /**
   * Stop timeline playback
   */
  stop() {
    this.isPlaying = false;
    this.clearAutomations();
  }

  /**
   * Update timeline automations
   * @param {number} currentTime - Current time in seconds
   * @param {Object} elapsed - Elapsed time information
   */
  update(currentTime, elapsed) {
    if (!this.isPlaying) return;

    this.processAutomations(currentTime);
    this.logBarProgress(elapsed);
  }

  /**
   * Process all active automations
   * @param {number} currentTime - Current time in seconds
   * @private
   */
  processAutomations(currentTime) {
    let hasActiveAutomations = false;

    for (const automation of this.automations) {
      if (automation.done || currentTime < automation.startSec) {
        continue;
      }

      let progress = (currentTime - automation.startSec) / (automation.endSec - automation.startSec);
      progress = Math.min(Math.max(progress, 0), 1);

      if (progress >= 1) {
        automation.done = true;
      }

      // Apply easing
      let easedProgress = progress;
      if (automation.easing === 'easeInOut') {
        easedProgress = MathUtils.easeInOut(progress);
      } else if (automation.easing === 'easeIn') {
        easedProgress = MathUtils.easeIn(progress);
      } else if (automation.easing === 'easeOut') {
        easedProgress = MathUtils.easeOut(progress);
      }

      // Handle special moveToTop parameter
      if (automation.param === 'moveToTop') {
        if (automation.to) {
          this.effectManager.moveEffectToTop(automation.effect);
        }
        hasActiveAutomations = true;
        continue;
      }

      // Apply normal automation
      const value = automation.from + (automation.to - automation.from) * easedProgress;
      this.effectManager.setEffectParameter(automation.effect, automation.param, value);
      hasActiveAutomations = true;
    }

    // Log completion
    if (!hasActiveAutomations && this.automations.length && !this.timelineCompleteLogged) {
      this.timelineCompleteLogged = true;
      console.log('[Timeline] Timeline completed.');
      this.logTimelineSummary();
    }
  }

  /**
   * Log bar progress and automation state changes
   * @param {Object} elapsed - Elapsed time information
   * @private
   */
  logBarProgress(elapsed) {
    const { bar } = elapsed;
    const barLogInterval = 4;

    if (bar !== this.lastLoggedBar) {
      if (bar % barLogInterval === 0) {
        console.log(`[Timeline] Bar ${bar}`);
      }
      this.lastLoggedBar = bar;

      // Log automation state changes
      this.automations.forEach(automation => {
        const key = `${automation.effect}_${automation.param}`;
        const startBar = automation.startSec / this.syncManager.barsToSeconds(1);
        const endBar = automation.endSec / this.syncManager.barsToSeconds(1);

        if (!this.automationActiveState[key] && Math.floor(startBar) === bar) {
          console.log(`[Timeline] Effect "${automation.effect}" param "${automation.param}" ACTIVATED at bar ${bar} (${automation.from} → ${automation.to})`);
          this.automationActiveState[key] = true;
        }

        if (this.automationActiveState[key] && Math.floor(endBar) === bar) {
          console.log(`[Timeline] Effect "${automation.effect}" param "${automation.param}" DEACTIVATED at bar ${bar}`);
          this.automationActiveState[key] = false;
        }
      });
    }
  }

  /**
   * Clear all automations
   */
  clearAutomations() {
    this.automations.length = 0;
    this.automationActiveState = {};
    this.timelineCompleteLogged = false;
  }

  /**
   * Get current timeline state
   * @returns {Object} Timeline state
   */
  getState() {
    return {
      timeline: [...this.timeline],
      automations: [...this.automations],
      isPlaying: this.isPlaying,
      activeAutomations: this.automations.filter(a => !a.done).length
    };
  }

  /**
   * Log timeline details
   * @private
   */
  logTimelineDetails() {
    if (!this.timeline.length) {
      console.log('[Timeline] (empty)');
      return;
    }

    console.log('[Timeline] Loaded Timeline:');
    console.log('  #  Effect       Param         From  To    Start End   Easing');
    
    this.timeline.forEach((cmd, i) => {
      const effect = String(cmd.effect).padEnd(10);
      const param = String(cmd.param).padEnd(12);
      const from = String(cmd.from).padEnd(5);
      const to = String(cmd.to).padEnd(5);
      const start = String(cmd.startBar ?? cmd.start ?? 0).padEnd(5);
      const end = String(cmd.endBar ?? cmd.end ?? 0).padEnd(5);
      const easing = cmd.easing || 'linear';
      
      console.log(`${String(i).padStart(2)}  ${effect} ${param} ${from} ${to} ${start} ${end} ${easing}`);
    });
  }

  /**
   * Log timeline summary
   * @private
   */
  logTimelineSummary() {
    const summary = this.automations.map(automation =>
      `- ${automation.effect}.${automation.param} | from ${automation.from} → ${automation.to} | ` +
      `${automation.startSec.toFixed(2)}s to ${automation.endSec.toFixed(2)}s (${automation.easing})`
    ).join('\n');
    
    console.log('[Timeline] Timeline Summary:\n' + summary);
  }

  /**
   * Export timeline as function string
   * @param {string} functionName - Function name
   * @returns {string} Timeline function string
   */
  exportAsFunction(functionName = 'customSavedTimeline') {
    const cleaned = this.timeline.map(({ effect, param, from, to, startBar, endBar, start, end, easing }) => ({
      effect,
      param,
      from,
      to,
      startBar: startBar ?? start ?? 0,
      endBar: endBar ?? end ?? 0,
      easing: easing || 'linear'
    }));

    const entries = cleaned.map(entry =>
      `  { effect: "${entry.effect}", param: "${entry.param}", from: ${
        typeof entry.from === 'string' ? `"${entry.from}"` : entry.from
      }, to: ${
        typeof entry.to === 'string' ? `"${entry.to}"` : entry.to
      }, startBar: ${entry.startBar}, endBar: ${entry.endBar}, easing: "${entry.easing}" }`
    ).join(',\n');

    return `// Exported timeline function\nexport function ${functionName}() {\n  return [\n${entries}\n  ];\n}\n`;
  }

  /**
   * Save timeline as downloadable file
   * @param {string} filename - Optional filename
   */
  saveTimeline(filename) {
    if (!this.timeline.length) {
      alert('No timeline data to save.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const functionName = `savedTimeline_${timestamp}`;
    const finalFilename = filename || `${functionName}.js`;
    const content = this.exportAsFunction(functionName);
    
    const blob = new Blob([content], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log(`[Timeline] Timeline saved as function "${functionName}"`);
  }
}

export default TimelineManager;


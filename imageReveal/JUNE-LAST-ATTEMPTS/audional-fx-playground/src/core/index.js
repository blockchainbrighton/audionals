// src/core/index.js

import Application from './Application.js';
import CanvasManager from './CanvasManager.js';
import StateManager from './StateManager.js';
import EventManager from './EventManager.js';


/**
 * Core Module Exports
 * Central export point for all core application modules
 */

export { Application, default as DefaultApplication } from './Application.js';
export { CanvasManager, default as DefaultCanvasManager } from './CanvasManager.js';
export { StateManager, default as DefaultStateManager } from './StateManager.js';
export { EventManager, default as DefaultEventManager } from './EventManager.js';

// Combined core object for convenience
export const Core = {
  Application,
  CanvasManager,
  StateManager,
  EventManager
};

export default Core;


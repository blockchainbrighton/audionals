/**
 * MothyG.js
 * Main Web Component for Mothy G Synthesizer
 * Love-inspired, VST-ready JavaScript synthesizer
 */

import { SynthEngine } from './SynthEngine.js';
import { PresetManager } from './PresetManager.js';
import { UIController } from './UIController.js';
import { Keyboard } from './Keyboard.js';

class MothyG extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initialize core components
    this.synthEngine = new SynthEngine();
    this.presetManager = new PresetManager();
    this.uiController = null;
    this.keyboard = null;
    this.initialized = false;
  }
  
  async connectedCallback() {
    await this.render();
    await this.init();
  }
  
  async render() {
    // Load styles inline
    const style = document.createElement('style');
    const cssResponse = await fetch(new URL('../assets/styles.css', import.meta.url).href);
    const cssText = await cssResponse.text();
    style.textContent = cssText;
    this.shadowRoot.appendChild(style);
    
    // Create main container
    const container = document.createElement('div');
    container.className = 'mothy-g';
    
    // Header
    const header = document.createElement('div');
    header.className = 'mothy-g-header';
    
    const title = document.createElement('h1');
    title.className = 'mothy-g-title';
    title.textContent = 'Mothy G';
    
    const subtitle = document.createElement('div');
    subtitle.className = 'mothy-g-subtitle';
    subtitle.textContent = 'Love-Inspired Synthesizer';
    
    header.appendChild(title);
    header.appendChild(subtitle);
    
    // Content container (will be populated by UIController)
    const content = document.createElement('div');
    content.id = 'content';
    
    // Keyboard container
    const keyboardContainer = document.createElement('div');
    keyboardContainer.className = 'keyboard-container';
    keyboardContainer.id = 'keyboard';
    
    // Start button (for audio context)
    const startButton = document.createElement('button');
    startButton.className = 'btn btn-primary';
    startButton.textContent = '♥ Click to Start ♥';
    startButton.style.display = 'block';
    startButton.style.margin = '20px auto';
    startButton.style.fontSize = '1.2rem';
    startButton.style.padding = '16px 32px';
    
    startButton.onclick = async () => {
      try {
        await this.start();
        startButton.style.display = 'none';
        content.style.display = 'block';
        keyboardContainer.style.display = 'block';
      } catch (error) {
        console.error('Failed to start Mothy G:', error);
        alert('Failed to start synthesizer. Please refresh and try again.');
      }
    };
    
    content.style.display = 'none';
    keyboardContainer.style.display = 'none';
    
    container.appendChild(header);
    container.appendChild(startButton);
    container.appendChild(content);
    container.appendChild(keyboardContainer);
    
    this.shadowRoot.appendChild(container);
    
    // Store references
    this.contentContainer = content;
    this.keyboardContainer = keyboardContainer;
    this.startButton = startButton;
  }
  
  async init() {
    try {
      // Initialize synth engine
      await this.synthEngine.init();
      
      // Initialize UI controller
      this.uiController = new UIController(
        this.contentContainer,
        this.synthEngine,
        this.presetManager
      );
      this.uiController.render();
      
      // Initialize keyboard
      this.keyboard = new Keyboard(
        this.keyboardContainer,
        (note, velocity) => this.playNote(note, velocity),
        (note) => this.stopNote(note)
      );
      
      this.initialized = true;
      console.log('Mothy G initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mothy G:', error);
      throw error;
    }
  }
  
  async start() {
    if (!this.initialized) {
      await this.init();
    }
    await this.synthEngine.start();
  }
  
  // Public API methods for external integration
  
  /**
   * Play a note
   * @param {number} note - MIDI note number (0-127)
   * @param {number} velocity - Note velocity (0-1)
   * @param {number} duration - Optional duration in seconds
   */
  playNote(note, velocity = 0.8, duration = null) {
    if (!this.initialized) {
      console.warn('Mothy G not initialized');
      return;
    }
    this.synthEngine.playNote(note, velocity, duration);
  }
  
  /**
   * Stop a note
   * @param {number} note - MIDI note number (0-127)
   */
  stopNote(note) {
    if (!this.initialized) return;
    this.synthEngine.stopNote(note);
  }
  
  /**
   * Stop all currently playing notes
   */
  stopAllNotes() {
    if (!this.initialized) return;
    this.synthEngine.stopAllNotes();
  }
  
  /**
   * Load a preset by name
   * @param {string} name - Preset name
   */
  loadPreset(name) {
    if (!this.initialized) return;
    const preset = this.presetManager.getPreset(name);
    if (preset) {
      this.uiController.loadPreset(preset);
    }
  }
  
  /**
   * Get all available presets
   * @returns {Array} Array of preset objects
   */
  getPresets() {
    return this.presetManager.getPresets();
  }
  
  /**
   * Get current synthesizer parameters
   * @returns {Object} Current parameter values
   */
  getCurrentParams() {
    if (!this.initialized) return null;
    return this.synthEngine.getCurrentParams();
  }
  
  /**
   * Update a synthesizer parameter
   * @param {string} param - Parameter name
   * @param {*} value - Parameter value
   */
  updateParam(param, value) {
    if (!this.initialized) return;
    this.synthEngine.updateParam(param, value);
  }
  
  /**
   * Save current settings as a new preset
   * @param {string} name - Preset name
   * @param {string} category - Preset category
   */
  savePreset(name, category = 'User') {
    if (!this.initialized) return;
    const params = this.synthEngine.getCurrentParams();
    return this.presetManager.savePreset(name, params, category);
  }
  
  /**
   * Check if synthesizer is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * Get the synth engine instance (for advanced usage)
   * @returns {SynthEngine}
   */
  getSynthEngine() {
    return this.synthEngine;
  }
  
  disconnectedCallback() {
    // Cleanup
    if (this.keyboard) {
      this.keyboard.destroy();
    }
    if (this.synthEngine) {
      this.synthEngine.dispose();
    }
  }
}

// Register the custom element
customElements.define('mothy-g', MothyG);

// Export for module usage
export default MothyG;

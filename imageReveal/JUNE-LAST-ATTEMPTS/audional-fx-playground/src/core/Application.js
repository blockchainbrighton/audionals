/**
 * Main Application Class
 * Central coordinator for the Audional FX Playground
 */

import { Config } from '../config/index.js';
import { EffectManager, EffectImplementations } from '../effects/index.js';
import { AudioManager, SyncManager } from '../audio/index.js';
import { TimelineManager } from '../timeline/index.js';
import { CanvasManager } from './CanvasManager.js';
import { StateManager } from './StateManager.js';
import { EventManager } from './EventManager.js';
import { PerformanceUtils, ImageUtils } from '../utils/index.js';

export class Application {
  constructor() {
    this.config = Config;
    this.initialized = false;
    this.isPlaying = false;
    this.timelinePlaying = false;
    this.animationId = null;
    
    // Core managers
    this.canvasManager = new CanvasManager();
    this.stateManager = new StateManager();
    this.eventManager = new EventManager();
    this.effectManager = new EffectManager();
    this.audioManager = new AudioManager();
    this.syncManager = new SyncManager(this.audioManager);
    this.timelineManager = new TimelineManager(this.effectManager, this.syncManager);
    
    // Bind methods
    this.handleResize = this.handleResize.bind(this);
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
    
    // Initialize performance monitoring
    PerformanceUtils.init(this.config.app.performance);
  }

  /**
   * Initialize the application
   * @param {Object} options - Initialization options
   */
  async initialize(options = {}) {
    if (this.initialized) {
      console.warn('[Application] Already initialized');
      return;
    }

    try {
      // Apply configuration overrides
      if (options.config) {
        Object.assign(this.config, options.config);
      }

      // Initialize managers
      await this.initializeManagers(options);
      
      // Setup DOM elements
      this.setupDOM();
      
      // Load and setup image
      await this.loadImage();
      
      // Register effect implementations
      this.registerEffectImplementations();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      await this.initializeUI();
      
      this.initialized = true;
      
      if (this.config.app.development.enableLogging) {
        console.log('[Application] Initialized successfully');
      }
      
    } catch (error) {
      console.error('[Application] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all managers
   * @private
   */
  async initializeManagers(options) {
    // Initialize audio manager
    this.audioManager.initialize({
      songUrl: options.songUrl || window.fxSongUrl,
      volume: options.volume
    });

    // Initialize sync manager
    this.syncManager.initialize({
      bpm: options.bpm || window.fxInitialBPM,
      beatsPerBar: options.beatsPerBar || window.fxInitialBeatsPerBar
    });

    // Initialize canvas manager
    this.canvasManager.initialize();

    // Initialize state manager
    this.stateManager.initialize();

    // Initialize event manager
    this.eventManager.initialize(this);
  }

  /**
   * Setup DOM elements
   * @private
   */
  setupDOM() {
    this.canvasElement = document.getElementById('main-canvas');
    this.canvasContainer = document.getElementById('canvas-container');
    this.loadingElement = document.getElementById('loading');
    this.errorElement = document.getElementById('error-message');
    this.fxButtonsContainer = document.getElementById('fx-btns');

    if (!this.canvasElement) {
      throw new Error('Canvas element not found');
    }

    this.canvasManager.setCanvas(this.canvasElement);
  }

  /**
   * Load and process image
   * @private
   */
  async loadImage() {
    try {
      const imageUrls = window.images || this.config.app.assets.defaultImages;
      const badgeUrls = window.badgeImages || this.config.app.assets.defaultBadgeImages;

      if (!imageUrls || !imageUrls.length) {
        throw new Error('No image URLs provided');
      }

      // Load main image
      const mainImage = await ImageUtils.loadImage(imageUrls[0]);

      // Load and compose with badge if available
      if (badgeUrls && badgeUrls.length && badgeUrls[0]) {
        const badgeImage = await ImageUtils.loadImage(badgeUrls[0]);
        const composedDataUrl = ImageUtils.composePFPWithBadge(
          mainImage, 
          badgeImage, 
          this.config.app.assets.badgePosition
        );
        this.image = await ImageUtils.createImageFromDataURL(composedDataUrl);
      } else {
        this.image = mainImage;
      }

      this.stateManager.setImageLoaded(true);
      this.hideLoading();
      this.canvasManager.drawImage(this.image);

    } catch (error) {
      console.error('[Application] Image loading failed:', error);
      this.stateManager.setImageError(true);
      this.showError();
    }
  }

  /**
   * Register effect implementations
   * @private
   */
  registerEffectImplementations() {
    Object.entries(EffectImplementations).forEach(([name, implementation]) => {
      this.effectManager.registerEffect(name, implementation);
    });
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    window.addEventListener('resize', this.handleResize);
    this.canvasElement.addEventListener('click', this.handleCanvasClick);
    
    // Audio event listeners
    this.audioManager.onPlay(() => {
      this.syncManager.start();
    });
    
    this.audioManager.onStop(() => {
      this.syncManager.stop();
    });
  }

  /**
   * Initialize UI components
   * @private
   */
  async initializeUI() {
    // This will be implemented when UI components are created
    // For now, we'll create basic effect buttons
    this.createEffectButtons();
    this.createTimelineUI();
  }

  /**
   * Handle window resize
   * @private
   */
  handleResize() {
    const containerSize = Math.min(
      window.innerHeight * this.config.app.canvas.defaultSize,
      window.innerWidth * this.config.app.canvas.defaultSize
    );

    this.canvasContainer.style.width = `${containerSize}px`;
    this.canvasContainer.style.height = `${containerSize}px`;

    this.canvasManager.resize(containerSize, containerSize);

    if (this.stateManager.isImageLoaded() && !this.isPlaying) {
      this.canvasManager.drawImage(this.image);
    }
  }

  /**
   * Handle canvas click
   * @private
   */
  handleCanvasClick() {
    if (this.stateManager.hasImageError()) return;

    if (this.timelinePlaying) {
      this.stopTimeline();
    } else {
      this.startTimeline();
    }
  }

  /**
   * Start timeline playback
   */
  startTimeline() {
    this.timelinePlaying = true;
    this.runEffectTimeline();
    this.audioManager.play();
  }

  /**
   * Stop timeline playback
   */
  stopTimeline() {
    this.timelinePlaying = false;
    this.stopEffects();
    this.timelineManager.stop();
    this.effectManager.clearAllEffects();
    this.updateButtonStates();
    this.audioManager.stop();
  }

  /**
   * Run effect timeline
   * @private
   */
  runEffectTimeline() {
    const timelineId = window.fxTimelineFunctionId || 0;
    const timelineFunction = this.timelineManager.getTimelineFunction?.(timelineId);
    
    if (timelineFunction) {
      const timelineData = timelineFunction();
      this.timelineManager.loadTimeline(timelineData);
      this.timelineManager.start();
    }

    this.startEffects();
  }

  /**
   * Start effects rendering
   * @private
   */
  startEffects() {
    this.isPlaying = true;
    this.syncManager.start();
    this.renderLoop();
  }

  /**
   * Stop effects rendering
   * @private
   */
  stopEffects() {
    this.isPlaying = false;
    this.syncManager.stop();
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.effectManager.clearAllEffects();
    this.canvasManager.drawImage(this.image);
    this.updateButtonStates();
  }

  /**
   * Main render loop
   * @private
   */
  renderLoop() {
    if (!this.isPlaying) return;

    const performance = PerformanceUtils.updateFPS();
    
    // Skip frame if auto-throttling is enabled
    if (performance.shouldSkipFrame) {
      this.animationId = requestAnimationFrame(this.renderLoop);
      return;
    }

    const elapsed = this.syncManager.getElapsed();
    const currentTime = elapsed.seconds;

    // Update timeline automations
    this.timelineManager.update(currentTime, elapsed);

    // Update effects
    this.effectManager.updateEffects(currentTime, elapsed);

    // Render effects
    this.renderEffects(currentTime);

    this.animationId = requestAnimationFrame(this.renderLoop);
  }

  /**
   * Render all effects
   * @private
   */
  renderEffects(currentTime) {
    const { width, height } = this.canvasManager.getDimensions();
    const { initialCtx, bufferCtxA, bufferCtxB, mainCtx } = this.canvasManager.getContexts();

    // Clear and draw initial image
    bufferCtxA.clearRect(0, 0, width, height);
    this.canvasManager.drawImage(this.image, bufferCtxA);

    // Render effects pipeline
    const finalCtx = this.effectManager.renderEffects(
      bufferCtxA, bufferCtxA, bufferCtxB, currentTime, width, height
    );

    // Draw final result to main canvas
    mainCtx.clearRect(0, 0, width, height);
    mainCtx.drawImage(finalCtx.canvas, 0, 0);
  }

  /**
   * Create effect buttons (placeholder)
   * @private
   */
  createEffectButtons() {
    // This will be implemented when UI components are created
    console.log('[Application] Effect buttons creation placeholder');
  }

  /**
   * Create timeline UI (placeholder)
   * @private
   */
  createTimelineUI() {
    // This will be implemented when UI components are created
    console.log('[Application] Timeline UI creation placeholder');
  }

  /**
   * Update button states (placeholder)
   * @private
   */
  updateButtonStates() {
    // This will be implemented when UI components are created
    console.log('[Application] Button states update placeholder');
  }

  /**
   * Show loading indicator
   * @private
   */
  showLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
    }
  }

  /**
   * Hide loading indicator
   * @private
   */
  hideLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  /**
   * Show error message
   * @private
   */
  showError() {
    this.hideLoading();
    if (this.errorElement) {
      this.errorElement.style.display = 'block';
    }
  }

  /**
   * Get application state
   * @returns {Object} Application state
   */
  getState() {
    return {
      initialized: this.initialized,
      isPlaying: this.isPlaying,
      timelinePlaying: this.timelinePlaying,
      imageLoaded: this.stateManager.isImageLoaded(),
      imageError: this.stateManager.hasImageError(),
      effects: this.effectManager.serialize(),
      timeline: this.timelineManager.getState(),
      sync: this.syncManager.getSyncInfo(),
      performance: PerformanceUtils.getMetrics()
    };
  }

  /**
   * Cleanup and destroy application
   */
  destroy() {
    this.stopEffects();
    this.audioManager.destroy();
    window.removeEventListener('resize', this.handleResize);
    
    if (this.canvasElement) {
      this.canvasElement.removeEventListener('click', this.handleCanvasClick);
    }
    
    this.initialized = false;
  }
}

export default Application;


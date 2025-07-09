// hudSystem.js - Comprehensive HUD system for visor programmability

import { $ } from './utils.js';

// HUD System Core
class HUDSystem {
  constructor() {
    this.components = new Map();
    this.animations = new Map();
    this.visorBounds = { x: 13, y: 19, width: 38, height: 28 };
    this.isActive = false;
    this.refreshRate = 60;
    this.animationFrame = null;
    this.lastUpdate = 0;
    
    this.globalSettings = {
      enableEffects: true,
      powerSaveMode: false,
      debugMode: false
    };
    
    this.init();
  }
  
  init() {
    this.createHUDLayer();
    this.setupEventListeners();
    console.log('HUD System initialized');
  }
  
  createHUDLayer() {
    // Create HUD canvas layer
    const gridBox = $('#gridBox');
    if (!gridBox) return;
    
    let hudLayer = $('#hudLayer');
    if (!hudLayer) {
      hudLayer = document.createElement('div');
      hudLayer.id = 'hudLayer';
      hudLayer.className = 'pixel-layer hud-layer';
      hudLayer.style.zIndex = '10';
      gridBox.appendChild(hudLayer);
    }
    
    this.hudLayer = hudLayer;
    this.updateVisorBounds();
  }
  
  updateVisorBounds(bounds = null) {
    if (bounds) {
      this.visorBounds = { ...bounds };
    } else if (window.enhancedState?.visorSettings) {
      this.visorBounds = { ...window.enhancedState.visorSettings };
    }
    
    // Update HUD layer positioning
    if (this.hudLayer) {
      const pixelSize = $('#gridBox').offsetWidth / (window.core?.SIZE || 64);
      Object.assign(this.hudLayer.style, {
        left: `${this.visorBounds.x * pixelSize}px`,
        top: `${this.visorBounds.y * pixelSize}px`,
        width: `${this.visorBounds.width * pixelSize}px`,
        height: `${this.visorBounds.height * pixelSize}px`,
        position: 'absolute',
        pointerEvents: 'none',
        overflow: 'hidden'
      });
    }
  }
  
  // Component Management
  addComponent(id, type, config) {
    const component = this.createComponent(type, config);
    if (component) {
      component.id = id;
      this.components.set(id, component);
      this.renderComponent(component);
      return component;
    }
    return null;
  }
  
  removeComponent(id) {
    const component = this.components.get(id);
    if (component) {
      if (component.element) {
        component.element.remove();
      }
      this.components.delete(id);
      return true;
    }
    return false;
  }
  
  updateComponent(id, config) {
    const component = this.components.get(id);
    if (component) {
      Object.assign(component.config, config);
      this.renderComponent(component);
      return true;
    }
    return false;
  }
  
  // Component Factory
  createComponent(type, config) {
    switch (type) {
      case 'scrollText':
        return new ScrollTextComponent(config);
      case 'statusBar':
        return new StatusBarComponent(config);
      case 'liveData':
        return new LiveDataComponent(config);
      case 'image':
        return new ImageComponent(config);
      case 'clock':
        return new ClockComponent(config);
      default:
        console.warn(`Unknown HUD component type: ${type}`);
        return null;
    }
  }
  
  // Rendering
  renderComponent(component) {
    if (!component || !this.hudLayer) return;
    
    // Remove existing element
    if (component.element) {
      component.element.remove();
    }
    
    // Create new element
    component.element = component.render();
    if (component.element) {
      this.hudLayer.appendChild(component.element);
    }
  }
  
  renderAll() {
    if (!this.hudLayer) return;
    
    this.hudLayer.innerHTML = '';
    this.components.forEach(component => {
      this.renderComponent(component);
    });
  }
  
  // Animation System
  startAnimation() {
    if (this.animationFrame) return;
    
    this.isActive = true;
    this.lastUpdate = performance.now();
    
    const animate = (timestamp) => {
      if (!this.isActive) return;
      
      const deltaTime = timestamp - this.lastUpdate;
      this.update(deltaTime);
      this.lastUpdate = timestamp;
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  stopAnimation() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  update(deltaTime) {
    // Update all components
    this.components.forEach(component => {
      if (component.update) {
        component.update(deltaTime);
      }
    });
    
    // Update animations
    this.animations.forEach(animation => {
      if (animation.update) {
        animation.update(deltaTime);
      }
    });
  }
  
  // Event Handling
  setupEventListeners() {
    // Listen for visor setting changes
    if (window.enhancedState) {
      // This would integrate with the visor controls
      document.addEventListener('visorSettingsChanged', () => {
        this.updateVisorBounds();
        this.renderAll();
      });
    }
    
    // Window resize
    window.addEventListener('resize', () => {
      this.updateVisorBounds();
      this.renderAll();
    });
  }
  
  // Configuration
  exportConfiguration() {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      visorBounds: this.visorBounds,
      globalSettings: this.globalSettings,
      components: Array.from(this.components.entries()).map(([id, component]) => ({
        id,
        type: component.constructor.name.replace('Component', '').toLowerCase(),
        config: component.config,
        position: component.position,
        size: component.size
      }))
    };
    
    return config;
  }
  
  importConfiguration(config) {
    try {
      // Clear existing components
      this.components.clear();
      
      // Apply global settings
      if (config.globalSettings) {
        Object.assign(this.globalSettings, config.globalSettings);
      }
      
      // Apply visor bounds
      if (config.visorBounds) {
        this.updateVisorBounds(config.visorBounds);
      }
      
      // Add components
      if (config.components) {
        config.components.forEach(componentConfig => {
          this.addComponent(
            componentConfig.id,
            componentConfig.type,
            {
              ...componentConfig.config,
              position: componentConfig.position,
              size: componentConfig.size
            }
          );
        });
      }
      
      this.renderAll();
      return true;
    } catch (e) {
      console.error('Failed to import HUD configuration:', e);
      return false;
    }
  }
}

// Base Component Class
class HUDComponent {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      position: { x: 0, y: 0, z: 1 },
      size: { width: 10, height: 5 },
      ...config
    };
    this.element = null;
    this.lastUpdate = 0;
  }
  
  render() {
    const element = document.createElement('div');
    element.className = 'hud-component';
    element.style.cssText = `
      position: absolute;
      left: ${this.config.position.x}px;
      top: ${this.config.position.y}px;
      width: ${this.config.size.width}px;
      height: ${this.config.size.height}px;
      z-index: ${this.config.position.z};
      font-family: monospace;
      font-size: 8px;
      line-height: 1;
      color: #00ff00;
      pointer-events: none;
    `;
    
    return element;
  }
  
  update(deltaTime) {
    // Override in subclasses
  }
}

// Scroll Text Component
class ScrollTextComponent extends HUDComponent {
  constructor(config) {
    super({
      text: 'TACTICAL SYSTEMS ONLINE',
      speed: 2,
      direction: 'left',
      color: '#00ff00',
      loop: true,
      ...config
    });
    
    this.scrollPosition = 0;
    this.textWidth = 0;
  }
  
  render() {
    const element = super.render();
    element.className += ' hud-scroll-text';
    element.style.color = this.config.color;
    element.style.overflow = 'hidden';
    element.style.whiteSpace = 'nowrap';
    
    const textElement = document.createElement('div');
    textElement.textContent = this.config.text;
    textElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      white-space: nowrap;
      transform: translateX(${this.scrollPosition}px);
      transition: transform 0.1s linear;
    `;
    
    element.appendChild(textElement);
    this.textElement = textElement;
    
    // Calculate text width
    setTimeout(() => {
      this.textWidth = textElement.offsetWidth;
    }, 0);
    
    return element;
  }
  
  update(deltaTime) {
    if (!this.config.enabled || !this.textElement) return;
    
    const speed = this.config.speed * (deltaTime / 16.67); // Normalize to 60fps
    
    if (this.config.direction === 'left') {
      this.scrollPosition -= speed;
      if (this.scrollPosition < -this.textWidth) {
        this.scrollPosition = this.config.size.width;
      }
    } else {
      this.scrollPosition += speed;
      if (this.scrollPosition > this.config.size.width) {
        this.scrollPosition = -this.textWidth;
      }
    }
    
    this.textElement.style.transform = `translateX(${this.scrollPosition}px)`;
  }
}

// Status Bar Component
class StatusBarComponent extends HUDComponent {
  constructor(config) {
    super({
      segments: 10,
      value: 100,
      maxValue: 100,
      fillColor: '#00ff00',
      emptyColor: '#003300',
      borderColor: '#ffffff',
      ...config
    });
  }
  
  render() {
    const element = super.render();
    element.className += ' hud-status-bar';
    element.style.border = `1px solid ${this.config.borderColor}`;
    
    const percentage = Math.max(0, Math.min(1, this.config.value / this.config.maxValue));
    const filledSegments = Math.floor(percentage * this.config.segments);
    
    for (let i = 0; i < this.config.segments; i++) {
      const segment = document.createElement('div');
      segment.style.cssText = `
        position: absolute;
        left: ${(i / this.config.segments) * 100}%;
        top: 0;
        width: ${(1 / this.config.segments) * 100}%;
        height: 100%;
        background-color: ${i < filledSegments ? this.config.fillColor : this.config.emptyColor};
        border-right: ${i < this.config.segments - 1 ? '1px solid ' + this.config.borderColor : 'none'};
      `;
      element.appendChild(segment);
    }
    
    return element;
  }
}

// Live Data Component
class LiveDataComponent extends HUDComponent {
  constructor(config) {
    super({
      dataSource: null,
      updateInterval: 5000,
      format: '{data}',
      fallbackText: 'NO DATA',
      color: '#ffff00',
      ...config
    });
    
    this.data = null;
    this.lastFetch = 0;
    this.isLoading = false;
  }
  
  render() {
    const element = super.render();
    element.className += ' hud-live-data';
    element.style.color = this.config.color;
    
    const displayText = this.formatData();
    element.textContent = displayText;
    
    return element;
  }
  
  formatData() {
    if (!this.data) return this.config.fallbackText;
    
    let formatted = this.config.format;
    if (typeof this.data === 'object') {
      Object.keys(this.data).forEach(key => {
        formatted = formatted.replace(`{${key}}`, this.data[key]);
      });
    } else {
      formatted = formatted.replace('{data}', this.data);
    }
    
    return formatted;
  }
  
  async fetchData() {
    if (!this.config.dataSource || this.isLoading) return;
    
    this.isLoading = true;
    try {
      const response = await fetch(this.config.dataSource);
      if (response.ok) {
        const data = await response.json();
        this.data = data;
        if (this.element) {
          this.element.textContent = this.formatData();
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live data:', e);
    } finally {
      this.isLoading = false;
    }
  }
  
  update(deltaTime) {
    if (!this.config.enabled || !this.config.dataSource) return;
    
    const now = Date.now();
    if (now - this.lastFetch > this.config.updateInterval) {
      this.fetchData();
      this.lastFetch = now;
    }
  }
}

// Image Component
class ImageComponent extends HUDComponent {
  constructor(config) {
    super({
      src: null,
      alt: 'HUD Image',
      opacity: 1.0,
      ...config
    });
  }
  
  render() {
    const element = super.render();
    element.className += ' hud-image';
    
    if (this.config.src) {
      const img = document.createElement('img');
      img.src = this.config.src;
      img.alt = this.config.alt;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        opacity: ${this.config.opacity};
      `;
      element.appendChild(img);
    }
    
    return element;
  }
}

// Clock Component
class ClockComponent extends HUDComponent {
  constructor(config) {
    super({
      format: 'HH:MM:SS',
      color: '#00ffff',
      timezone: 'local',
      ...config
    });
  }
  
  render() {
    const element = super.render();
    element.className += ' hud-clock';
    element.style.color = this.config.color;
    element.style.textAlign = 'center';
    
    this.updateTime();
    return element;
  }
  
  updateTime() {
    if (!this.element) return;
    
    const now = new Date();
    let timeString;
    
    switch (this.config.format) {
      case 'HH:MM:SS':
        timeString = now.toTimeString().slice(0, 8);
        break;
      case 'HH:MM':
        timeString = now.toTimeString().slice(0, 5);
        break;
      case 'MM:SS':
        timeString = now.toTimeString().slice(3, 8);
        break;
      default:
        timeString = now.toLocaleTimeString();
    }
    
    this.element.textContent = timeString;
  }
  
  update(deltaTime) {
    if (!this.config.enabled) return;
    
    // Update every second
    if (Date.now() - this.lastUpdate > 1000) {
      this.updateTime();
      this.lastUpdate = Date.now();
    }
  }
}

// HUD Configuration UI
class HUDConfigUI {
  constructor(hudSystem) {
    this.hudSystem = hudSystem;
    this.isVisible = false;
    this.init();
  }
  
  init() {
    this.createUI();
    this.setupEventListeners();
  }
  
  createUI() {
    // Create HUD config panel
    const panel = document.createElement('div');
    panel.id = 'hudConfigPanel';
    panel.className = 'hud-config-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-height: 600px;
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      display: none;
      overflow-y: auto;
    `;
    
    panel.innerHTML = `
      <div class="hud-config-header" style="padding: 16px; border-bottom: 1px solid #eee; background: #f5f5f5;">
        <h3 style="margin: 0; font-size: 1.1rem;">HUD Configuration</h3>
        <button id="hudConfigClose" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 1.2rem; cursor: pointer;">×</button>
      </div>
      <div class="hud-config-content" style="padding: 16px;">
        <div class="hud-config-section">
          <h4>Add Component</h4>
          <select id="hudComponentType">
            <option value="scrollText">Scroll Text</option>
            <option value="statusBar">Status Bar</option>
            <option value="liveData">Live Data</option>
            <option value="image">Image</option>
            <option value="clock">Clock</option>
          </select>
          <button id="hudAddComponent" class="btn btn-primary btn-sm">Add</button>
        </div>
        <div class="hud-config-section">
          <h4>Active Components</h4>
          <div id="hudComponentList"></div>
        </div>
        <div class="hud-config-section">
          <h4>Configuration</h4>
          <button id="hudExportConfig" class="btn btn-outline btn-sm">Export</button>
          <button id="hudImportConfig" class="btn btn-outline btn-sm">Import</button>
          <input type="file" id="hudImportFile" accept=".json" style="display: none;">
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    this.panel = panel;
  }
  
  setupEventListeners() {
    $('#hudConfigClose').onclick = () => this.hide();
    $('#hudAddComponent').onclick = () => this.addComponent();
    $('#hudExportConfig').onclick = () => this.exportConfig();
    $('#hudImportConfig').onclick = () => $('#hudImportFile').click();
    $('#hudImportFile').onchange = (e) => this.importConfig(e);
  }
  
  show() {
    this.isVisible = true;
    this.panel.style.display = 'block';
    this.updateComponentList();
  }
  
  hide() {
    this.isVisible = false;
    this.panel.style.display = 'none';
  }
  
  addComponent() {
    const type = $('#hudComponentType').value;
    const id = `component_${Date.now()}`;
    
    const defaultConfigs = {
      scrollText: { text: 'NEW TEXT', speed: 2, color: '#00ff00' },
      statusBar: { value: 75, maxValue: 100, segments: 10 },
      liveData: { fallbackText: 'LOADING...', color: '#ffff00' },
      image: { src: '', alt: 'HUD Image' },
      clock: { format: 'HH:MM:SS', color: '#00ffff' }
    };
    
    this.hudSystem.addComponent(id, type, defaultConfigs[type] || {});
    this.updateComponentList();
    
    if (window.showLayerFeedback) {
      window.showLayerFeedback(`Added ${type} component`, 'info');
    }
  }
  
  updateComponentList() {
    const list = $('#hudComponentList');
    if (!list) return;
    
    list.innerHTML = '';
    
    this.hudSystem.components.forEach((component, id) => {
      const item = document.createElement('div');
      item.className = 'hud-component-item';
      item.style.cssText = `
        padding: 8px;
        margin: 4px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f9f9f9;
      `;
      
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>${id}</strong> (${component.constructor.name.replace('Component', '')})</span>
          <button onclick="hudSystem.removeComponent('${id}'); hudConfigUI.updateComponentList();" class="btn btn-danger btn-sm">Remove</button>
        </div>
      `;
      
      list.appendChild(item);
    });
  }
  
  exportConfig() {
    const config = this.hudSystem.exportConfiguration();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), {
      download: `hud-config-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
      href: URL.createObjectURL(blob)
    });
    link.click();
    URL.revokeObjectURL(link.href);
    
    if (window.showLayerFeedback) {
      window.showLayerFeedback('HUD configuration exported', 'info');
    }
  }
  
  importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (this.hudSystem.importConfiguration(config)) {
          this.updateComponentList();
          if (window.showLayerFeedback) {
            window.showLayerFeedback('HUD configuration imported', 'info');
          }
        } else {
          throw new Error('Invalid configuration format');
        }
      } catch (error) {
        console.error('Failed to import HUD configuration:', error);
        if (window.showLayerFeedback) {
          window.showLayerFeedback('Failed to import configuration', 'error');
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
}

// Initialize and export
const hudSystem = new HUDSystem();
const hudConfigUI = new HUDConfigUI(hudSystem);

// Global access for debugging and integration
window.hudSystem = hudSystem;
window.hudConfigUI = hudConfigUI;

export { 
  HUDSystem, 
  HUDConfigUI,
  ScrollTextComponent,
  StatusBarComponent,
  LiveDataComponent,
  ImageComponent,
  ClockComponent,
  hudSystem,
  hudConfigUI
};


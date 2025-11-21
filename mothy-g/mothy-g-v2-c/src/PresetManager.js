/**
 * PresetManager.js
 * Manages preset storage, loading, and user preset banks
 */

import { DEFAULT_PRESETS } from './presets.js';

export class PresetManager {
  constructor() {
    this.presets = [];
    this.currentPreset = null;
    this.storageKey = 'mothyg_user_presets';
    this.loadPresets();
  }
  
  loadPresets() {
    // Load default presets
    this.presets = [...DEFAULT_PRESETS];
    
    // Load user presets from localStorage
    try {
      const userPresets = localStorage.getItem(this.storageKey);
      if (userPresets) {
        const parsed = JSON.parse(userPresets);
        this.presets = [...this.presets, ...parsed];
      }
    } catch (error) {
      console.error('Failed to load user presets:', error);
    }
  }
  
  getPresets() {
    return this.presets;
  }
  
  getPreset(name) {
    return this.presets.find(p => p.name === name);
  }
  
  getCurrentPreset() {
    return this.currentPreset;
  }
  
  setCurrentPreset(preset) {
    this.currentPreset = preset;
  }
  
  savePreset(name, params, category = 'User') {
    const preset = {
      name,
      category,
      params: { ...params },
      isUser: true,
      timestamp: Date.now()
    };
    
    // Check if preset with same name exists
    const existingIndex = this.presets.findIndex(p => p.name === name && p.isUser);
    
    if (existingIndex >= 0) {
      // Update existing preset
      this.presets[existingIndex] = preset;
    } else {
      // Add new preset
      this.presets.push(preset);
    }
    
    this.saveUserPresets();
    return preset;
  }
  
  deletePreset(name) {
    const index = this.presets.findIndex(p => p.name === name && p.isUser);
    if (index >= 0) {
      this.presets.splice(index, 1);
      this.saveUserPresets();
      return true;
    }
    return false;
  }
  
  saveUserPresets() {
    try {
      const userPresets = this.presets.filter(p => p.isUser);
      localStorage.setItem(this.storageKey, JSON.stringify(userPresets));
    } catch (error) {
      console.error('Failed to save user presets:', error);
    }
  }
  
  exportPresets() {
    const userPresets = this.presets.filter(p => p.isUser);
    const data = JSON.stringify(userPresets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mothy-g-presets.json';
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  async importPresets(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          
          if (!Array.isArray(imported)) {
            throw new Error('Invalid preset file format');
          }
          
          // Add imported presets
          imported.forEach(preset => {
            preset.isUser = true;
            preset.timestamp = Date.now();
            
            const existingIndex = this.presets.findIndex(p => p.name === preset.name && p.isUser);
            if (existingIndex >= 0) {
              this.presets[existingIndex] = preset;
            } else {
              this.presets.push(preset);
            }
          });
          
          this.saveUserPresets();
          resolve(imported.length);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
  
  getCategories() {
    const categories = new Set();
    this.presets.forEach(p => categories.add(p.category));
    return Array.from(categories).sort();
  }
  
  getPresetsByCategory(category) {
    return this.presets.filter(p => p.category === category);
  }
}

/**
 * B.A.M. HUD Programmer v2.0
 * Manages a complex, multi-layered HUD with programmable scenes.
 */
class HUDManager {
    constructor() {
        // --- DOM References ---
        this.visorHud = document.getElementById('visorHud');
        this.controlPanel = document.getElementById('controlPanel');
        this.editorSection = document.getElementById('editor-section');
        this.playlistContainer = document.getElementById('playlist-container');
        
        // --- State Management ---
        this.playlist = [];
        this.currentSceneIndex = -1;
        this.activeEditingSceneId = null;
        this.activeEditingLayerId = null;

        // --- Playback State ---
        this.isPlaying = false;
        this.isLooping = false;
        this.isShuffle = false;
        this.playbackTimeout = null;

        // --- Global Settings ---
        this.globals = {
            viewMode: 'normal', // 'normal' or 'mirrored'
        };

        this.init();
    }

    // --- INITIALIZATION ---
    init() {
        this.bindEvents();
        this.renderAll();
        console.log('B.A.M. HUD v2.0 Initialized.');
    }

    bindEvents() {
        // Use event delegation for main control panel actions
        this.controlPanel.addEventListener('click', this.handleControlClick.bind(this));
        // Use 'input' for real-time updates from sliders and text fields
        this.controlPanel.addEventListener('input', this.handleControlInput.bind(this));
        // Use 'change' for selects and file inputs
        this.controlPanel.addEventListener('change', this.handleControlChange.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    // --- EVENT HANDLERS ---
    handleControlClick(e) {
        const action = e.target.dataset.action;
        if (!action) return;

        // Stop propagation for buttons inside list items
        e.stopPropagation();

        const sceneId = e.target.closest('[data-scene-id]')?.dataset.sceneId;
        const layerId = e.target.closest('[data-layer-id]')?.dataset.layerId;

        // Actions map
        const actions = {
            'play': () => this.play(),
            'stop': () => this.stop(),
            'next': () => this.nextScene(),
            'prev': () => this.prevScene(),
            'toggle-loop': () => this.toggleLoop(),
            'toggle-shuffle': () => this.toggleShuffle(),
            'add-scene': () => this.addScene(),
            'clear-playlist': () => this.clearPlaylist(),
            'save-playlist': () => this.savePlaylist(),
            'load-demo': () => this.loadDemoPlaylist(),
            'select-scene': () => this.setActiveScene(sceneId),
            'delete-scene': () => this.deleteScene(sceneId),
            'add-layer': () => this.addLayer(sceneId),
            'select-layer': () => this.setActiveLayer(layerId),
            'delete-layer': () => this.deleteLayer(layerId),
            'move-scene-up': () => this.moveItemInArray(this.playlist, sceneId, -1),
            'move-scene-down': () => this.moveItemInArray(this.playlist, sceneId, 1),
            'move-layer-up': () => this.moveItemInArray(this.getActiveScene().layers, layerId, -1),
            'move-layer-down': () => this.moveItemInArray(this.getActiveScene().layers, layerId, 1),
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    handleControlInput(e) {
        const { key, value, type } = e.target.dataset;
        if (!key) return;

        let val = type === 'number' ? parseFloat(e.target.value) : e.target.value;
        if (key.includes('filter.')) val = parseFloat(e.target.value);

        if (this.updateProperty(key, val)) {
            this.livePreview();
        }
    }
    
    handleControlChange(e) {
        const { key, value, type } = e.target.dataset;

        // Handle file loading
        if (e.target.id === 'load-playlist-input') {
            this.loadPlaylist(e.target.files[0]);
            return;
        }

        if (!key) return;
        
        // Handle global and property updates
        if (key === 'viewMode') {
            this.globals.viewMode = e.target.value;
            this.visorHud.classList.toggle('mirrored', this.globals.viewMode === 'mirrored');
        } else if (this.updateProperty(key, e.target.value)) {
            this.livePreview();
        }
    }

    handleKeyPress(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.isPlaying ? this.stop() : this.play();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextScene();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.prevScene();
                break;
        }
    }
    
    // --- CORE PLAYBACK LOGIC ---
    play() {
        if (this.isPlaying || this.playlist.length === 0) return;
        this.isPlaying = true;

        if (this.currentSceneIndex < 0 || this.currentSceneIndex >= this.playlist.length) {
            this.currentSceneIndex = this.isShuffle ? Math.floor(Math.random() * this.playlist.length) : 0;
        }
        
        this.runCurrentScene();
        this.updatePlaybackControls();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.playbackTimeout);
        this.playbackTimeout = null;
        this.visorHud.innerHTML = ''; // Clear HUD on stop
        this.updatePlaybackControls();
        this.renderPlaylistUI(); // Deselect active item
    }

    nextScene() {
        if (this.playlist.length === 0) return;
        if (this.isShuffle) {
            this.currentSceneIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentSceneIndex++;
            if (this.currentSceneIndex >= this.playlist.length) {
                if (this.isLooping) {
                    this.currentSceneIndex = 0;
                } else {
                    this.stop();
                    return;
                }
            }
        }
        this.runCurrentScene(true);
    }
    
    prevScene() {
        if (this.playlist.length === 0 || this.isShuffle) return;
        this.currentSceneIndex--;
        if (this.currentSceneIndex < 0) {
            this.currentSceneIndex = this.isLooping ? this.playlist.length - 1 : 0;
        }
        this.runCurrentScene(true);
    }

    runCurrentScene(isNavigating = false) {
        if (this.currentSceneIndex < 0 || this.currentSceneIndex >= this.playlist.length) {
            this.stop();
            return;
        }
        
        clearTimeout(this.playbackTimeout);
        
        const scene = this.playlist[this.currentSceneIndex];
        this.renderHUD(scene);
        this.renderPlaylistUI(); // Highlight active scene

        // If playing, set timeout for the next scene
        if (this.isPlaying && !isNavigating) {
             this.playbackTimeout = setTimeout(() => this.nextScene(), scene.duration);
        }
    }

    livePreview() {
        // Renders the actively edited scene in the HUD without affecting playback state
        const scene = this.getActiveScene();
        if (scene) {
            this.renderHUD(scene);
        }
    }

    // --- DATA & STATE MANAGEMENT ---
    
    // UTILITIES
    generateId() { return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
    getActiveScene() { return this.playlist.find(s => s.id === this.activeEditingSceneId); }
    getActiveLayer() {
        const scene = this.getActiveScene();
        return scene ? scene.layers.find(l => l.id === this.activeEditingLayerId) : null;
    }
    moveItemInArray(array, itemId, direction) {
        const index = array.findIndex(item => item.id === itemId);
        if (index === -1) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= array.length) return;
        [array[index], array[newIndex]] = [array[newIndex], array[index]]; // Swap
        this.renderAll();
        this.livePreview();
    }

    // SCENE METHODS
    addScene() {
        const newScene = {
            id: this.generateId(),
            name: `Scene ${this.playlist.length + 1}`,
            duration: 5000,
            layers: []
        };
        this.playlist.push(newScene);
        this.setActiveScene(newScene.id);
    }

    deleteScene(sceneId) {
        this.playlist = this.playlist.filter(s => s.id !== sceneId);
        if (this.activeEditingSceneId === sceneId) {
            this.activeEditingSceneId = null;
            this.activeEditingLayerId = null;
        }
        this.renderAll();
    }

    setActiveScene(sceneId) {
        this.activeEditingSceneId = sceneId;
        this.activeEditingLayerId = null; // Reset layer selection when scene changes
        this.renderAll();
        this.livePreview();
    }

    // LAYER METHODS
    addLayer(sceneId) {
        const scene = this.getActiveScene();
        if (!scene) return;
        const newLayer = {
            id: this.generateId(),
            name: `Layer ${scene.layers.length + 1}`,
            type: 'text',
            content: 'Hello, B.A.M.',
            style: { // Default styles for a new layer
                x: 10, y: 40, width: 80, height: 20,
                opacity: 1, fontSize: 5, color: '#00ffd0',
                textAlign: 'center',
                transitionIn: 'fade', transitionOut: 'fade', transitionDuration: 0.5,
                animation: 'none', animationDuration: 8,
                filter: { blur: 0, brightness: 1, contrast: 1, saturate: 1, hue: 0 },
            }
        };
        scene.layers.push(newLayer);
        this.setActiveLayer(newLayer.id);
    }

    deleteLayer(layerId) {
        const scene = this.getActiveScene();
        if (!scene) return;
        scene.layers = scene.layers.filter(l => l.id !== layerId);
        if (this.activeEditingLayerId === layerId) {
            this.activeEditingLayerId = null;
        }
        this.renderAll();
        this.livePreview();
    }

    setActiveLayer(layerId) {
        this.activeEditingLayerId = layerId;
        this.renderEditorUI();
    }
    
    updateProperty(keyPath, value) {
        let targetObject = this.getActiveScene();
        let propertyName = keyPath;
        
        if (keyPath.startsWith('layer.')) {
            targetObject = this.getActiveLayer();
            propertyName = keyPath.substring(6); // remove "layer."
        }
        
        if (!targetObject) return false;

        // Handle nested properties like style.x or style.filter.blur
        const keys = propertyName.split('.');
        let current = targetObject;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
            if (current === undefined) return false;
        }
        current[keys[keys.length - 1]] = value;
        
        // After updating a property, re-render the relevant UI part
        this.renderEditorUI();
        return true;
    }

    // PLAYLIST & PRESET MANAGEMENT
    toggleLoop() { this.isLooping = !this.isLooping; this.updatePlaybackControls(); }
    toggleShuffle() { this.isShuffle = !this.isShuffle; this.updatePlaybackControls(); }
    clearPlaylist() {
        if (confirm('Are you sure you want to clear the entire playlist?')) {
            this.stop();
            this.playlist = [];
            this.currentSceneIndex = -1;
            this.activeEditingSceneId = null;
            this.activeEditingLayerId = null;
            this.renderAll();
            this.visorHud.innerHTML = '';
        }
    }
    savePlaylist() {
        const dataStr = JSON.stringify({ version: 2.1, playlist: this.playlist }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = `hud_preset_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }
    loadPlaylist(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.version >= 2 && Array.isArray(data.playlist)) {
                    this.stop();
                    this.playlist = data.playlist;
                    this.currentSceneIndex = -1;
                    this.activeEditingSceneId = null;
                    this.activeEditingLayerId = null;
                    this.renderAll();
                    alert('Playlist loaded successfully!');
                } else {
                    alert('Error: Invalid or outdated preset file format.');
                }
            } catch (error) {
                alert('Error parsing preset file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    loadDemoPlaylist() {
        const demo = {
  "version": 2.1,
  "playlist": [
    {
      "id": "scene_boot",
      "name": "Boot Sequence",
      "duration": 5000,
      "layers": [
        {
          "id": "layer_boot_video",
          "name": "BG Video",
          "type": "video",
          "content": "https://ordinals.com/content/c2beb99dbc32188e56ea2ca3750c99a6ce9145892678473b51802ce680cb5f16i0",
          "style": { "x": 0, "y": 0, "width": 100, "height": 100, "opacity": 0.3, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 2, "brightness": 1, "contrast": 1, "saturate": 1.2, "hue": 0 } }
        },
        {
          "id": "layer_boot_title",
          "name": "Title",
          "type": "text",
          "content": "B.A.M. HUD ONLINE",
          "style": { "x": 10, "y": 35, "width": 80, "height": 20, "opacity": 1, "fontSize": 10, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_boot_subtitle",
          "name": "Subtitle",
          "type": "text",
          "content": "LOADING ASSET MODULES...",
          "style": { "x": 10, "y": 55, "width": 80, "height": 10, "opacity": 0.8, "fontSize": 4, "color": "#fca311", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    },
    {
      "id": "scene_gif",
      "name": "Animated Asset",
      "duration": 7000,
      "layers": [
        {
          "id": "layer_gif_bg",
          "name": "BG",
          "type": "image",
          "content": "https://ordinals.com/content/09b4bbb0337af857d9afa934205fb820bb704596a00f2e7f5bb37195853eee32i0",
          "style": { "x": 0, "y": 0, "width": 100, "height": 100, "opacity": 0.05, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 5, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_gif_main",
          "name": "Lightning GIF",
          "type": "image",
          "content": "https://ordinals.com/content/e9e5f4862c1e486d07b4bb91c5b85edf8d044e0c0cdd1b235959be8bd49355d6i0",
          "style": { "x": 20, "y": 20, "width": 60, "height": 60, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "slide-down", "transitionOut": "slide-up", "transitionDuration": 0.8, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1.2, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_gif_scroll",
          "name": "Info Scroll",
          "type": "text",
          "content": "ASSET CLASS: ANIMATED // TYPE: GIF // ID: #457195",
          "style": { "x": 0, "y": 90, "width": 100, "height": 10, "opacity": 1, "fontSize": 3, "color": "#00ffd0", "textAlign": "left", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 0.5, "animation": "scroll", "animationDuration": 10, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    },
    {
      "id": "scene_ultra_rare",
      "name": "Rarity Scan",
      "duration": 8000,
      "layers": [
        {
          "id": "layer_rare_img",
          "name": "AI Original",
          "type": "image",
          "content": "https://ordinals.com/content/129ffaa02e85dea60fed32b84cd31436ccba1ff5b534fcb0b4efdddd2a0ddd05i0",
          "style": { "x": 15, "y": 15, "width": 70, "height": 70, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_rare_text",
          "name": "Rarity Text",
          "type": "text",
          "content": "RARITY SCAN: [ULTRA RARE]",
          "style": { "x": 10, "y": 5, "width": 80, "height": 10, "opacity": 1, "fontSize": 6, "color": "#e94560", "textAlign": "center", "transitionIn": "slide-down", "transitionOut": "slide-up", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1.5, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_rare_desc",
          "name": "Description",
          "type": "text",
          "content": "Source: Original Audionals Inscription",
          "style": { "x": 10, "y": 88, "width": 80, "height": 10, "opacity": 0.9, "fontSize": 3, "color": "#fca311", "textAlign": "center", "transitionIn": "slide-up", "transitionOut": "slide-down", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    },
    {
      "id": "scene_avif",
      "name": "HD Asset (AVIF)",
      "duration": 6000,
      "layers": [
        {
          "id": "layer_avif_1",
          "name": "Solemn 1",
          "type": "image",
          "content": "https://ordinals.com/content/2c762a593dc60bcd92169b07de5a60d588a94819d165178ca317d45e4eeb2b11i0",
          "style": { "x": 0, "y": 0, "width": 100, "height": 100, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 2, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1.2, "hue": 0 } }
        },
        {
          "id": "layer_avif_text",
          "name": "Format Text",
          "type": "text",
          "content": "SUBJECT: SOLEMN\nFORMAT: AVIF",
          "style": { "x": 65, "y": 70, "width": 30, "height": 20, "opacity": 0.8, "fontSize": 4, "color": "#FFFFFF", "textAlign": "right", "transitionIn": "slide-up", "transitionOut": "slide-down", "transitionDuration": 1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    },
    {
      "id": "scene_reel",
      "name": "Asset Reel",
      "duration": 7000,
      "layers": [
        {
          "id": "layer_reel_left",
          "name": "Audionals Logo",
          "type": "image",
          "content": "https://ordinals.com/content/72389b804f1f673caf52fea6e8f0733058b5605c879bea1938aa680f67fbe141i0",
          "style": { "x": 5, "y": 20, "width": 40, "height": 40, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "slide-up", "transitionOut": "fade", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_reel_right",
          "name": "Based.btc",
          "type": "image",
          "content": "https://ordinals.com/content/e716f0e3832dbdd818f2291ad8cb0395f3bbec4f5ba762c05108a719842c9f6di0",
          "style": { "x": 55, "y": 20, "width": 40, "height": 40, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "slide-up", "transitionOut": "fade", "transitionDuration": 0.7, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_reel_bottom_left",
          "name": "Vikings",
          "type": "image",
          "content": "https://ordinals.com/content/3a504956f370c0362e48f7a1daf53d51c250c3c0d2054eb0b018d60caad0be77i0",
          "style": { "x": 5, "y": 65, "width": 40, "height": 25, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "slide-up", "transitionOut": "fade", "transitionDuration": 0.9, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 180 } }
        },
        {
          "id": "layer_reel_bottom_right",
          "name": "Hathaway BTC",
          "type": "image",
          "content": "https://ordinals.com/content/a1491d4b9c780799f53cd93fe0e5cad4ece52e1e638dd74de44fe74514f00bcfi0",
          "style": { "x": 55, "y": 65, "width": 40, "height": 25, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "slide-up", "transitionOut": "fade", "transitionDuration": 1.1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        },
        {
          "id": "layer_reel_title",
          "name": "Title",
          "type": "text",
          "content": "COMMON & RARE ASSETS",
          "style": { "x": 10, "y": 5, "width": 80, "height": 10, "opacity": 1, "fontSize": 5, "color": "#FFFFFF", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    },
    {
      "id": "scene_loopout",
      "name": "End Sequence",
      "duration": 5000,
      "layers": [
        {
          "id": "layer_loopout_text",
          "name": "Text",
          "type": "text",
          "content": "SEQUENCE COMPLETE\nRE-INITIALIZING PLAYBACK",
          "style": { "x": 10, "y": 40, "width": 80, "height": 20, "opacity": 1, "fontSize": 6, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } }
        }
      ]
    }
  ]
};
        this.stop();
        this.playlist = demo.playlist;
        this.currentSceneIndex = -1;
        this.activeEditingSceneId = null;
        this.activeEditingLayerId = null;
        this.renderAll();
        alert('Asset Showcase Demo loaded!');
    }
    

    // --- RENDERING LOGIC ---

    /** The main render loop. Call this after any major state change. */
    renderAll() {
        this.renderPlaylistUI();
        this.renderEditorUI();
        this.updatePlaybackControls();
    }

    /** Renders the playlist of scenes in the control panel. */
    renderPlaylistUI() {
        let html = `<h4>Scenes (${this.playlist.length})</h4>`;
        if (this.playlist.length === 0) {
            html += `<div class="empty-state">No scenes in playlist.</div>`;
        } else {
            html += `<ul>${this.playlist.map((scene, index) => `
                <li class="list-item ${scene.id === this.activeEditingSceneId ? 'active' : ''} ${index === this.currentSceneIndex && this.isPlaying ? 'playing' : ''}" data-action="select-scene" data-scene-id="${scene.id}">
                    <span>${scene.name || `Scene ${index + 1}`}</span>
                    <div class="list-item-controls">
                        <button data-action="move-scene-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button data-action="move-scene-down" title="Move Down" ${index === this.playlist.length - 1 ? 'disabled' : ''}>▼</button>
                        <button class="delete-btn" data-action="delete-scene" title="Delete Scene">X</button>
                    </div>
                </li>`).join('')}</ul>`;
        }
        this.playlistContainer.innerHTML = html;
    }
    
    /** Renders the appropriate editor (scene or layer) based on current selection. */
    renderEditorUI() {
        const scene = this.getActiveScene();
        if (!scene) {
            this.editorSection.innerHTML = `<div class="empty-state">Select a scene to edit its properties and layers.</div>`;
            return;
        }

        let html = this.generateSceneEditorHTML(scene);
        const layer = this.getActiveLayer();
        if (layer) {
            html += this.generateLayerEditorHTML(layer);
        } else {
            html += `<div class="empty-state">Select a layer to edit, or add a new one.</div>`;
        }
        this.editorSection.innerHTML = html;
    }
    
    generateSceneEditorHTML(scene) {
        return `
            <fieldset>
                <legend>Scene: ${scene.name}</legend>
                <div class="control-group">
                    <label for="sceneName">Scene Name</label>
                    <input type="text" id="sceneName" data-key="name" value="${scene.name}">
                </div>
                <div class="control-group">
                    <label for="sceneDuration">Duration (ms) <span>${scene.duration}</span></label>
                    <input type="range" id="sceneDuration" data-key="duration" data-type="number" value="${scene.duration}" min="500" max="30000" step="100">
                </div>
                <div class="scene-editor-list">
                    <h4>Layers (${scene.layers.length})</h4>
                    <ul>${scene.layers.map((layer, index) => `
                        <li class="list-item ${layer.id === this.activeEditingLayerId ? 'active' : ''}" data-action="select-layer" data-layer-id="${layer.id}">
                            <span>${layer.name || `Layer ${index + 1}`}</span>
                            <div class="list-item-controls">
                               <button data-action="move-layer-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
                               <button data-action="move-layer-down" title="Move Down" ${index === scene.layers.length - 1 ? 'disabled' : ''}>▼</button>
                               <button class="delete-btn" data-action="delete-layer" title="Delete Layer">X</button>
                            </div>
                        </li>`).join('')}
                    </ul>
                </div>
                <button data-action="add-layer" data-scene-id="${scene.id}">Add New Layer</button>
            </fieldset>
        `;
    }

    generateLayerEditorHTML(layer) {
      const s = layer.style;
      const f = s.filter;
      // Note the data-key attributes like "layer.style.x" for easy updating
      return `
        <fieldset>
            <legend>Layer: ${layer.name}</legend>
            <div class="control-grid">
              <div class="control-group">
                  <label>Layer Name</label>
                  <input type="text" data-key="layer.name" value="${layer.name}">
              </div>
              <div class="control-group">
                  <label>Content Type</label>
                  <select data-key="layer.type" value="${layer.type}">
                      <option value="text" ${layer.type === 'text' ? 'selected':''}>Text</option>
                      <option value="image" ${layer.type === 'image' ? 'selected':''}>Image URL</option>
                      <option value="video" ${layer.type === 'video' ? 'selected':''}>Video URL</option>
                      <option value="url" ${layer.type === 'url' ? 'selected':''}>Website URL</option>
                  </select>
              </div>
            </div>
            <div class="control-group">
                <label>Content</label>
                <textarea data-key="layer.content">${layer.content}</textarea>
            </div>
            
            <h4>Position & Size</h4>
            <div class="control-grid">
                <div class="control-group"><label>X Pos (%) <span>${s.x}</span></label><input type="range" data-key="layer.style.x" data-type="number" value="${s.x}" min="0" max="100" step="1"></div>
                <div class="control-group"><label>Y Pos (%) <span>${s.y}</span></label><input type="range" data-key="layer.style.y" data-type="number" value="${s.y}" min="0" max="100" step="1"></div>
                <div class="control-group"><label>Width (%) <span>${s.width}</span></label><input type="range" data-key="layer.style.width" data-type="number" value="${s.width}" min="1" max="100" step="1"></div>
                <div class="control-group"><label>Height (%) <span>${s.height}</span></label><input type="range" data-key="layer.style.height" data-type="number" value="${s.height}" min="1" max="100" step="1"></div>
            </div>

            <h4>Appearance</h4>
            <div class="control-grid">
                <div class="control-group"><label>Opacity <span>${s.opacity}</span></label><input type="range" data-key="layer.style.opacity" data-type="number" value="${s.opacity}" min="0" max="1" step="0.05"></div>
                <div class="control-group"><label>Font Size (vmin) <span>${s.fontSize}</span></label><input type="range" data-key="layer.style.fontSize" data-type="number" value="${s.fontSize}" min="1" max="20" step="0.5"></div>
                <div class="control-group"><label>Color</label><input type="color" data-key="layer.style.color" value="${s.color}"></div>
                <div class="control-group"><label>Text Align</label><select data-key="layer.style.textAlign" value="${s.textAlign}"><option>left</option><option>center</option><option>right</option></select></div>
            </div>
            
            <h4>Animation & Transitions</h4>
            <div class="control-grid">
                <div class="control-group"><label>Transition In</label><select data-key="layer.style.transitionIn" value="${s.transitionIn}"><option>none</option><option>fade</option><option>slide-up</option><option>slide-down</option></select></div>
                <div class="control-group"><label>Transition Out</label><select data-key="layer.style.transitionOut" value="${s.transitionOut}"><option>none</option><option>fade</option><option>slide-up</option><option>slide-down</option></select></div>
                <div class="control-group" style="grid-column: 1 / -1;"><label>Transition Duration (s) <span>${s.transitionDuration}</span></label><input type="range" data-key="layer.style.transitionDuration" data-type="number" value="${s.transitionDuration}" min="0.1" max="5" step="0.1"></div>
                <div class="control-group"><label>Loop Animation</label><select data-key="layer.style.animation" value="${s.animation}"><option>none</option><option value="scroll">Scroll Left</option></select></div>
                <div class="control-group"><label>Anim Duration (s) <span>${s.animationDuration}</span></label><input type="range" data-key="layer.style.animationDuration" data-type="number" value="${s.animationDuration}" min="1" max="30" step="1"></div>
            </div>

            <h4>Visual Effects (Filters)</h4>
            <div class="control-grid">
              <div class="control-group"><label>Blur (px)<span>${f.blur}</span></label><input type="range" data-key="layer.style.filter.blur" value="${f.blur}" min="0" max="20" step="0.5"></div>
              <div class="control-group"><label>Brightness<span>${f.brightness}</span></label><input type="range" data-key="layer.style.filter.brightness" value="${f.brightness}" min="0" max="3" step="0.1"></div>
              <div class="control-group"><label>Contrast<span>${f.contrast}</span></label><input type="range" data-key="layer.style.filter.contrast" value="${f.contrast}" min="0" max="3" step="0.1"></div>
              <div class="control-group"><label>Saturate<span>${f.saturate}</span></label><input type="range" data-key="layer.style.filter.saturate" value="${f.saturate}" min="0" max="3" step="0.1"></div>
              <div class="control-group" style="grid-column: 1 / -1;"><label>Hue Rotate (deg)<span>${f.hue}</span></label><input type="range" data-key="layer.style.filter.hue" value="${f.hue}" min="0" max="360" step="1"></div>
            </div>
        </fieldset>
      `;
    }

    updatePlaybackControls() {
        document.getElementById('playBtn').classList.toggle('active', this.isPlaying);
        document.getElementById('loopBtn').classList.toggle('active', this.isLooping);
        document.getElementById('shuffleBtn').classList.toggle('active', this.isShuffle);
    }
    
    /** This is the heart of the visual output. It renders a scene's layers into the HUD. */
    renderHUD(scene) {
        this.visorHud.innerHTML = '';
        if (!scene) return;

        scene.layers.forEach(layer => {
            const el = document.createElement('div');
            el.className = 'hud-layer';

            // --- Generate Content Element ---
            let contentEl;
            switch(layer.type) {
                case 'image':
                    contentEl = document.createElement('img');
                    contentEl.src = layer.content;
                    break;
                case 'video':
                    contentEl = document.createElement('video');
                    contentEl.src = layer.content;
                    contentEl.autoplay = true;
                    contentEl.loop = true;
                    contentEl.muted = true; // Important for autoplay policy
                    contentEl.playsInline = true;
                    break;
                case 'url':
                    contentEl = document.createElement('iframe');
                    contentEl.src = layer.content;
                    contentEl.sandbox = 'allow-scripts allow-same-origin'; // Security
                    break;
                case 'text':
                default:
                    contentEl = document.createElement('p');
                    contentEl.textContent = layer.content;
            }
            el.appendChild(contentEl);

            // --- Apply Dynamic Styles ---
            const s = layer.style;
            const f = s.filter;
            el.style.left = `${s.x}%`;
            el.style.top = `${s.y}%`;
            el.style.width = `${s.width}%`;
            el.style.height = `${s.height}%`;
            el.style.fontSize = `${s.fontSize}vmin`;
            el.style.color = s.color;
            el.style.textAlign = s.textAlign;
            el.style.opacity = s.transitionIn === 'fade' ? 0 : 1; // Start invisible for fade
            el.style.transition = `all ${s.transitionDuration}s ease-in-out`;
            el.style.filter = `blur(${f.blur}px) brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) hue-rotate(${f.hue}deg)`;

            if (s.animation === 'scroll') {
                el.classList.add('scrolling-text');
                el.style.animationName = 'scroll-anim';
                el.style.animationDuration = `${s.animationDuration}s`;
                el.style.justifyContent = 'flex-start';
            }

            this.visorHud.appendChild(el);

            // --- Trigger Transition In ---
            // Use a timeout to allow the element to be added to the DOM first
            setTimeout(() => {
                if (s.transitionIn === 'fade') el.style.opacity = s.opacity;
                if (s.transitionIn === 'slide-up') el.style.transform = `translateY(-${s.height}%)`; // Example
                // Add more complex transitions here if needed
            }, 50);
        });
    }
}

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    window.hudApp = new HUDManager();
});
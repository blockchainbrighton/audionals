/**
 * B.A.M. HUD Programmer v2.2
 * Manages a complex, multi-layered HUD with programmable scenes,
 * dynamic playlist generation, and global visual controls.
 */
import { assetLibrary } from './asset_library.js';

class HUDManager {
    constructor() {
        // --- DOM References ---
        this.visorHud = document.getElementById('visorHud');
        this.controlPanel = document.getElementById('controlPanel');
        this.editorSection = document.getElementById('editor-section');
        this.playlistContainer = document.getElementById('playlist-container');
        this.globalOpacitySlider = document.getElementById('globalOpacitySlider');
        this.globalOpacityLabel = document.getElementById('globalOpacityLabel')?.querySelector('span'); // Safer query

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
            viewMode: 'normal',
            hudOpacity: 1, // Global opacity for the entire HUD
        };
        this.lastOpacity = 1; // Stores opacity state for the toggle button

        this.init();
    }

    // --- INITIALIZATION ---
    init() {
        this.bindEvents();
        this.renderAll();
        // Set initial HUD opacity on load, syncing the UI
        this.setHudOpacity(this.globals.hudOpacity, true);
        console.log('B.A.M. HUD v2.2 Initialized.');
    }

    bindEvents() {
        this.controlPanel.addEventListener('click', this.handleControlClick.bind(this));
        this.controlPanel.addEventListener('input', this.handleControlInput.bind(this));
        this.controlPanel.addEventListener('change', this.handleControlChange.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    // --- EVENT HANDLERS ---
    handleControlClick(e) {
        const action = e.target.dataset.action;
        if (!action) return;
        e.stopPropagation();

        const sceneId = e.target.closest('[data-scene-id]')?.dataset.sceneId;
        const layerId = e.target.closest('[data-layer-id]')?.dataset.layerId;

        const actions = {
            'play': () => this.play(),
            'stop': () => this.stop(),
            'next': () => this.nextScene(),
            'prev': () => this.prevScene(),
            'toggle-loop': () => this.toggleLoop(),
            'toggle-shuffle': () => this.toggleShuffle(),
            'toggle-hud-visibility': () => this.toggleHudVisibility(), // New action
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
            'generate-long-playlist': () => this.generatePlaylistFromLibrary(),
            'generate-themed-playlist': () => this.generatePlaylistFromLibrary({ collection: 'PUNX' }),
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    handleControlInput(e) {
        // Handle the global opacity slider separately for clarity
        if (e.target.id === 'globalOpacitySlider') {
            const newOpacity = parseFloat(e.target.value);
            this.setHudOpacity(newOpacity);
            // If user is actively sliding, this becomes the new "restore" point
            if (newOpacity > 0) {
                this.lastOpacity = newOpacity;
            }
            return;
        }

        // Handle property edits for scenes and layers
        const { key } = e.target.dataset;
        if (!key) return;
        const val = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
        if (this.updateProperty(key, val)) {
            this.livePreview();
        }
    }

    handleControlChange(e) {
        if (e.target.id === 'load-playlist-input') {
            this.loadPlaylist(e.target.files[0]);
            return;
        }

        const { key } = e.target.dataset;
        if (!key) return;

        if (key === 'viewMode') {
            this.globals.viewMode = e.target.value;
            this.visorHud.classList.toggle('mirrored', this.globals.viewMode === 'mirrored');
        } else if (this.updateProperty(key, e.target.value)) {
            this.livePreview();
        }
    }

    handleKeyPress(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        switch (e.key) {
            case ' ': e.preventDefault(); this.isPlaying ? this.stop() : this.play(); break;
            case 'ArrowRight': e.preventDefault(); this.nextScene(); break;
            case 'ArrowLeft': e.preventDefault(); this.prevScene(); break;
        }
    }

    // --- GLOBAL CONTROLS ---
    setHudOpacity(opacity, forceUpdateSlider = false) {
        const newOpacity = Math.max(0, Math.min(1, opacity));
        this.globals.hudOpacity = newOpacity;
        this.visorHud.style.opacity = newOpacity;
        if (this.globalOpacityLabel) {
            this.globalOpacityLabel.textContent = `${Math.round(newOpacity * 100)}%`;
        }
        if (forceUpdateSlider && this.globalOpacitySlider) {
            this.globalOpacitySlider.value = newOpacity;
        }
    }

    toggleHudVisibility() {
        if (this.globals.hudOpacity > 0) {
            this.lastOpacity = this.globals.hudOpacity;
            this.setHudOpacity(0, true);
        } else {
            this.setHudOpacity(this.lastOpacity, true);
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
        this.visorHud.innerHTML = '';
        this.updatePlaybackControls();
        this.renderPlaylistUI();
    }

    nextScene() {
        if (this.playlist.length === 0) return;
        if (this.isShuffle) {
            this.currentSceneIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentSceneIndex++;
            if (this.currentSceneIndex >= this.playlist.length) {
                if (this.isLooping) this.currentSceneIndex = 0;
                else { this.stop(); return; }
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
        this.renderPlaylistUI();
        if (this.isPlaying && !isNavigating) {
            this.playbackTimeout = setTimeout(() => this.nextScene(), scene.duration);
        }
    }

    livePreview() {
        const scene = this.getActiveScene();
        if (scene) this.renderHUD(scene);
    }

    // --- DATA & STATE MANAGEMENT ---
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
        [array[index], array[newIndex]] = [array[newIndex], array[index]];
        this.renderAll();
        this.livePreview();
    }

    addScene() {
        const newScene = { id: this.generateId(), name: `Scene ${this.playlist.length + 1}`, duration: 5000, layers: [] };
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
        this.activeEditingLayerId = null;
        this.renderAll();
        this.livePreview();
    }

    addLayer() {
        const scene = this.getActiveScene();
        if (!scene) return;
        const newLayer = {
            id: this.generateId(), name: `Layer ${scene.layers.length + 1}`, type: 'text', content: 'Hello, B.A.M.',
            style: {
                x: 10, y: 40, width: 80, height: 20, opacity: 1, fontSize: 5, color: '#00ffd0', textAlign: 'center',
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
            propertyName = keyPath.substring(6);
        }
        if (!targetObject) return false;
        const keys = propertyName.split('.');
        let current = targetObject;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
            if (current === undefined) return false;
        }
        current[keys[keys.length - 1]] = value;
        this.renderEditorUI();
        return true;
    }

    // --- PLAYLIST, PRESET, & GENERATION METHODS ---
    toggleLoop() { this.isLooping = !this.isLooping; this.updatePlaybackControls(); }
    toggleShuffle() { this.isShuffle = !this.isShuffle; this.updatePlaybackControls(); }

    // --- PLAYLIST, PRESET, & GENERATION METHODS ---

    /**
     * Generates a new, randomized playlist of a variable length (35-100 scenes).
     * Each scene is created by randomly selecting an asset and a line of commentary.
     * @param {object} filters - Optional filters to apply, e.g., { collection: 'PUNX' }.
     */
    generatePlaylistFromLibrary(filters = {}) {
        console.log('Generating new random playlist with filters:', filters);
        this.stop();

        // First, create the pool of assets to draw from based on filters.
        let assetPool = assetLibrary;
        if (filters.collection) {
            assetPool = assetLibrary.filter(a => a.collection === filters.collection);
        }
        if (filters.rarity) {
            assetPool = assetLibrary.filter(a => a.rarity === filters.rarity);
        }

        if (assetPool.length === 0) {
            alert('No assets found matching the filter criteria.');
            return;
        }

        const newPlaylist = [];
        // 1. Determine a random length for the new playlist.
        const minLength = 35;
        const maxLength = 100;
        const playlistLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

        // 2. Loop for the determined length, creating a random scene each time.
        for (let i = 0; i < playlistLength; i++) {
            // 3. Select a random asset from the pool.
            const asset = assetPool[Math.floor(Math.random() * assetPool.length)];

            const sceneName = `${asset.collection} - ${asset.name}`;
            let layerType = asset.type;
            if (['gif', 'avif'].includes(asset.type)) layerType = 'image';
            if (asset.type === 'html') layerType = 'url';
            let layerContent = asset.url;
            if (asset.type === 'text') layerContent = `[Text from ${asset.id}]\n${asset.name}`;

            // 4. Select a random line of commentary for the chosen asset.
            let chosenComment = `Rarity: ${asset.rarity}`; // Default fallback.
            if (asset.commentary && asset.commentary.length > 0) {
                const randomIndex = Math.floor(Math.random() * asset.commentary.length);
                chosenComment = asset.commentary[randomIndex];
            }
            const infoLayerContent = `[${asset.collection}] // ${asset.rarity}\n${chosenComment}`;

            // 5. Push the newly composed random scene to the playlist.
            newPlaylist.push({
                id: `gen_${asset.id}_${i}`, // Use loop index 'i' to ensure uniqueness
                name: sceneName,
                duration: 7000,
                layers: [{
                    id: `gen_layer_${asset.id}_${i}`,
                    name: asset.name,
                    type: layerType,
                    content: layerContent,
                    style: {
                        x: 10, y: 10, width: 80, height: 75, opacity: 1, fontSize: 4, color: '#00ffd0', textAlign: 'center',
                        transitionIn: 'fade', transitionOut: 'fade', transitionDuration: 0.8,
                        animation: 'none', animationDuration: 8, filter: { blur: 0, brightness: 1, contrast: 1, saturate: 1, hue: 0 }
                    }
                }, {
                    id: `gen_info_layer_${asset.id}_${i}`,
                    name: 'Info Text',
                    type: 'text',
                    content: infoLayerContent,
                    style: {
                        x: 5, y: 88, width: 90, height: 12, opacity: 0.9, fontSize: 3.5, color: '#fca311', textAlign: 'left',
                        transitionIn: 'slide-up', transitionOut: 'slide-down', transitionDuration: 0.5,
                        animation: 'none', animationDuration: 8, filter: { blur: 0, brightness: 1, contrast: 1, saturate: 1, hue: 0 }
                    }
                }]
            });
        }

        // Finally, update the application state with the new playlist.
        this.playlist = newPlaylist;
        this.currentSceneIndex = -1;
        this.activeEditingSceneId = null;
        this.activeEditingLayerId = null;
        this.renderAll();
        alert(`Generated a new random showcase with ${newPlaylist.length} scenes!`);
    }

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
        const dataStr = JSON.stringify({ version: 2.2, playlist: this.playlist, globals: this.globals }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = `hud_preset_${new Date().toISOString().slice(0, 10)}.json`;
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
                    // Restore global settings if they exist in the preset
                    if (data.globals) {
                        this.globals = { ...this.globals, ...data.globals };
                        this.setHudOpacity(this.globals.hudOpacity, true);
                        this.lastOpacity = this.globals.hudOpacity > 0 ? this.globals.hudOpacity : 1;
                        document.getElementById('hudMode').value = this.globals.viewMode;
                        this.visorHud.classList.toggle('mirrored', this.globals.viewMode === 'mirrored');
                    }
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
        const demo = { "version": 2.1, "playlist": [{ "id": "scene1", "name": "Intro Sequence", "duration": 6000, "layers": [{ "id": "layer1_1", "name": "Title Text", "type": "text", "content": "B.A.M. HUD\nSYSTEM ONLINE", "style": { "x": 10, "y": 35, "width": 80, "height": 30, "opacity": 1, "fontSize": 8, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } } }, { "id": "layer1_2", "name": "Scrolling Status", "type": "text", "content": "SYSTEM CHECK... OK | POWER... 100% | LINK... ESTABLISHED | Welcome, Pilot.", "style": { "x": 0, "y": 85, "width": 100, "height": 15, "opacity": 0.8, "fontSize": 3.5, "color": "#fca311", "textAlign": "left", "transitionIn": "slide-up", "transitionOut": "slide-down", "transitionDuration": 0.5, "animation": "scroll", "animationDuration": 15, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "hue": 0 } } }] }, { "id": "scene2", "name": "Video + Overlay", "duration": 10000, "layers": [{ "id": "layer2_1", "name": "Background Video", "type": "video", "content": "https://i.imgur.com/rF2aTce.mp4", "style": { "x": 0, "y": 0, "width": 100, "height": 100, "opacity": 0.4, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 1.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 1, "brightness": 1, "contrast": 1, "saturate": 1.5, "hue": 0 } } }, { "id": "layer2_2", "name": "Target Reticle", "type": "image", "content": "https://i.imgur.com/k9w42v3.png", "style": { "x": 25, "y": 25, "width": 50, "height": 50, "opacity": 1, "fontSize": 5, "color": "#00ffd0", "textAlign": "center", "transitionIn": "fade", "transitionOut": "fade", "transitionDuration": 0.5, "animation": "none", "animationDuration": 8, "filter": { "blur": 0, "brightness": 1.5, "contrast": 1, "saturate": 1, "hue": 0 } } }] }] };
        this.stop();
        this.playlist = demo.playlist;
        this.currentSceneIndex = -1;
        this.activeEditingSceneId = null;
        this.activeEditingLayerId = null;
        this.renderAll();
        alert('Simple Demo loaded!');
    }

    // --- RENDERING LOGIC ---
    renderAll() {
        this.renderPlaylistUI();
        this.renderEditorUI();
        this.updatePlaybackControls();
    }

    renderPlaylistUI() {
        let html = `<h4>Scenes (${this.playlist.length})</h4>`;
        if (this.playlist.length === 0) {
            html += `<div class="empty-state">No scenes in playlist.</div>`;
        } else {
            html += `<ul>${this.playlist.map((scene, index) => `<li class="list-item ${scene.id === this.activeEditingSceneId ? 'active' : ''} ${index === this.currentSceneIndex && this.isPlaying ? 'playing' : ''}" data-action="select-scene" data-scene-id="${scene.id}"><span>${scene.name || `Scene ${index + 1}`}</span><div class="list-item-controls"><button data-action="move-scene-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button><button data-action="move-scene-down" title="Move Down" ${index === this.playlist.length - 1 ? 'disabled' : ''}>▼</button><button class="delete-btn" data-action="delete-scene" title="Delete Scene">X</button></div></li>`).join('')}</ul>`;
        }
        this.playlistContainer.innerHTML = html;
    }

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
        return `<fieldset><legend>Scene: ${scene.name}</legend><div class="control-group"><label for="sceneName">Scene Name</label><input type="text" id="sceneName" data-key="name" value="${scene.name}"></div><div class="control-group"><label for="sceneDuration">Duration (ms) <span>${scene.duration}</span></label><input type="range" id="sceneDuration" data-key="duration" data-type="number" value="${scene.duration}" min="500" max="30000" step="100"></div><div class="scene-editor-list"><h4>Layers (${scene.layers.length})</h4><ul>${scene.layers.map((layer, index) => `<li class="list-item ${layer.id === this.activeEditingLayerId ? 'active' : ''}" data-action="select-layer" data-layer-id="${layer.id}"><span>${layer.name || `Layer ${index + 1}`}</span><div class="list-item-controls"><button data-action="move-layer-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button><button data-action="move-layer-down" title="Move Down" ${index === scene.layers.length - 1 ? 'disabled' : ''}>▼</button><button class="delete-btn" data-action="delete-layer" title="Delete Layer">X</button></div></li>`).join('')}</ul></div><button data-action="add-layer" data-scene-id="${scene.id}">Add New Layer</button></fieldset>`;
    }
    
    generateLayerEditorHTML(layer) {
        const s = layer.style;
        const f = s.filter;
        return `<fieldset><legend>Layer: ${layer.name}</legend><div class="control-grid"><div class="control-group"><label>Layer Name</label><input type="text" data-key="layer.name" value="${layer.name}"></div><div class="control-group"><label>Content Type</label><select data-key="layer.type" onchange="this.value=this.options[this.selectedIndex].value"><option value="text" ${layer.type === 'text' ? 'selected' : ''}>Text</option><option value="image" ${layer.type === 'image' ? 'selected' : ''}>Image URL</option><option value="video" ${layer.type === 'video' ? 'selected' : ''}>Video URL</option><option value="url" ${layer.type === 'url' ? 'selected' : ''}>Website URL</option></select></div></div><div class="control-group"><label>Content</label><textarea data-key="layer.content">${layer.content}</textarea></div><h4>Position & Size</h4><div class="control-grid"><div class="control-group"><label>X Pos (%) <span>${s.x}</span></label><input type="range" data-key="layer.style.x" data-type="number" value="${s.x}" min="0" max="100" step="1"></div><div class="control-group"><label>Y Pos (%) <span>${s.y}</span></label><input type="range" data-key="layer.style.y" data-type="number" value="${s.y}" min="0" max="100" step="1"></div><div class="control-group"><label>Width (%) <span>${s.width}</span></label><input type="range" data-key="layer.style.width" data-type="number" value="${s.width}" min="1" max="100" step="1"></div><div class="control-group"><label>Height (%) <span>${s.height}</span></label><input type="range" data-key="layer.style.height" data-type="number" value="${s.height}" min="1" max="100" step="1"></div></div><h4>Appearance</h4><div class="control-grid"><div class="control-group"><label>Opacity <span>${s.opacity}</span></label><input type="range" data-key="layer.style.opacity" data-type="number" value="${s.opacity}" min="0" max="1" step="0.05"></div><div class="control-group"><label>Font Size (vmin) <span>${s.fontSize}</span></label><input type="range" data-key="layer.style.fontSize" data-type="number" value="${s.fontSize}" min="1" max="20" step="0.5"></div><div class="control-group"><label>Color</label><input type="color" data-key="layer.style.color" value="${s.color}"></div><div class="control-group"><label>Text Align</label><select data-key="layer.style.textAlign" onchange="this.value=this.options[this.selectedIndex].value"><option value="left" ${s.textAlign === 'left' ? 'selected' : ''}>left</option><option value="center" ${s.textAlign === 'center' ? 'selected' : ''}>center</option><option value="right" ${s.textAlign === 'right' ? 'selected' : ''}>right</option></select></div></div><h4>Animation & Transitions</h4><div class="control-grid"><div class="control-group"><label>Transition In</label><select data-key="layer.style.transitionIn" onchange="this.value=this.options[this.selectedIndex].value"><option value="none" ${s.transitionIn === 'none' ? 'selected' : ''}>none</option><option value="fade" ${s.transitionIn === 'fade' ? 'selected' : ''}>fade</option><option value="slide-up" ${s.transitionIn === 'slide-up' ? 'selected' : ''}>slide-up</option><option value="slide-down" ${s.transitionIn === 'slide-down' ? 'selected' : ''}>slide-down</option></select></div><div class="control-group"><label>Transition Out</label><select data-key="layer.style.transitionOut" onchange="this.value=this.options[this.selectedIndex].value"><option value="none" ${s.transitionOut === 'none' ? 'selected' : ''}>none</option><option value="fade" ${s.transitionOut === 'fade' ? 'selected' : ''}>fade</option><option value="slide-up" ${s.transitionOut === 'slide-up' ? 'selected' : ''}>slide-up</option><option value="slide-down" ${s.transitionOut === 'slide-down' ? 'selected' : ''}>slide-down</option></select></div><div class="control-group" style="grid-column: 1 / -1;"><label>Transition Duration (s) <span>${s.transitionDuration}</span></label><input type="range" data-key="layer.style.transitionDuration" data-type="number" value="${s.transitionDuration}" min="0.1" max="5" step="0.1"></div><div class="control-group"><label>Loop Animation</label><select data-key="layer.style.animation" onchange="this.value=this.options[this.selectedIndex].value"><option value="none" ${s.animation === 'none' ? 'selected' : ''}>none</option><option value="scroll" ${s.animation === 'scroll' ? 'selected' : ''}>scroll</option></select></div><div class="control-group"><label>Anim Duration (s) <span>${s.animationDuration}</span></label><input type="range" data-key="layer.style.animationDuration" data-type="number" value="${s.animationDuration}" min="1" max="30" step="1"></div></div><h4>Visual Effects (Filters)</h4><div class="control-grid"><div class="control-group"><label>Blur (px)<span>${f.blur}</span></label><input type="range" data-key="layer.style.filter.blur" value="${f.blur}" min="0" max="20" step="0.5"></div><div class="control-group"><label>Brightness<span>${f.brightness}</span></label><input type="range" data-key="layer.style.filter.brightness" value="${f.brightness}" min="0" max="3" step="0.1"></div><div class="control-group"><label>Contrast<span>${f.contrast}</span></label><input type="range" data-key="layer.style.filter.contrast" value="${f.contrast}" min="0" max="3" step="0.1"></div><div class="control-group"><label>Saturate<span>${f.saturate}</span></label><input type="range" data-key="layer.style.filter.saturate" value="${f.saturate}" min="0" max="3" step="0.1"></div><div class="control-group" style="grid-column: 1 / -1;"><label>Hue Rotate (deg)<span>${f.hue}</span></label><input type="range" data-key="layer.style.filter.hue" value="${f.hue}" min="0" max="360" step="1"></div></div></fieldset>`;
    }

    updatePlaybackControls() {
        document.getElementById('playBtn').classList.toggle('active', this.isPlaying);
        document.getElementById('loopBtn').classList.toggle('active', this.isLooping);
        document.getElementById('shuffleBtn').classList.toggle('active', this.isShuffle);
    }

    renderHUD(scene) {
        this.visorHud.innerHTML = '';
        if (!scene) return;
        scene.layers.forEach(layer => {
            const el = document.createElement('div');
            el.className = 'hud-layer';
            let contentEl;
            switch (layer.type) {
                case 'image': contentEl = document.createElement('img'); contentEl.src = layer.content; break;
                case 'video': contentEl = document.createElement('video'); contentEl.src = layer.content; contentEl.autoplay = true; contentEl.loop = true; contentEl.muted = true; contentEl.playsInline = true; break;
                case 'url': contentEl = document.createElement('iframe'); contentEl.src = layer.content; contentEl.sandbox = 'allow-scripts allow-same-origin'; break;
                default: contentEl = document.createElement('p'); contentEl.textContent = layer.content;
            }
            el.appendChild(contentEl);
            const s = layer.style;
            const f = s.filter;
            Object.assign(el.style, {
                left: `${s.x}%`, top: `${s.y}%`, width: `${s.width}%`, height: `${s.height}%`,
                fontSize: `${s.fontSize}vmin`, color: s.color, textAlign: s.textAlign,
                opacity: s.transitionIn === 'fade' ? 0 : s.opacity,
                transition: `all ${s.transitionDuration}s ease-in-out`,
                filter: `blur(${f.blur}px) brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) hue-rotate(${f.hue}deg)`
            });
            if (s.animation === 'scroll') {
                el.classList.add('scrolling-text');
                el.style.animationName = 'scroll-anim';
                el.style.animationDuration = `${s.animationDuration}s`;
                el.style.justifyContent = 'flex-start';
            }
            this.visorHud.appendChild(el);
            setTimeout(() => {
                if (s.transitionIn === 'fade') el.style.opacity = s.opacity;
            }, 50);
        });
    }
}

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    window.hudApp = new HUDManager();
});
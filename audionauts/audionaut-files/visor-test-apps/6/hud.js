/**
 * B.A.M. HUD Programmer 2.0
 *
 * This script manages the entire HUD application, including state, UI,
 * playlist control, and real-time rendering of complex, multi-layered scenes.
 */
class HUDApp {
    // =======================================================
    // INITIALIZATION
    // =======================================================
  
    constructor() {
      this.bindDOM();
      this.initState();
      this.bindEvents();
      this.loadDefaultPlaylist(); // Start with a demo
    }
  
    /**
     * Caches all necessary DOM elements for performance and convenience.
     */
    bindDOM() {
      this.dom = {
        visorHud: document.getElementById('visorHud'),
        
        // Playback Controls
        playBtn: document.getElementById('playBtn'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        hudMode: document.getElementById('hudMode'),
        loopToggle: document.getElementById('loopToggle'),
        shuffleToggle: document.getElementById('shuffleToggle'),
        
        // Playlist UI
        playlistDisplay: document.getElementById('playlist'),
        addSceneBtn: document.getElementById('addSceneBtn'),
        clearBtn: document.getElementById('clearBtn'),
        loadDefaultBtn: document.getElementById('loadDefaultBtn'),
  
        // Presets
        saveBtn: document.getElementById('saveBtn'),
        loadFileInput: document.getElementById('loadFileInput'),
  
        // Scene & Layer Editor
        editorContainer: document.getElementById('editor-container'),
        sceneEditorTitle: document.getElementById('scene-editor-title'),
        sceneDurationInput: document.getElementById('sceneDurationInput'),
        sceneTransitionInput: document.getElementById('sceneTransitionInput'),
  
        layerList: document.getElementById('layer-list'),
        addLayerBtn: document.getElementById('addLayerBtn'),
  
        layerEditor: document.getElementById('layer-editor'),
        layerEditorTitle: document.getElementById('layer-editor-title'),
        layerType: document.getElementById('layerType'),
        layerContent: document.getElementById('layerContent'),
        layerX: document.getElementById('layerX'),
        layerXValue: document.getElementById('layerXValue'),
        layerY: document.getElementById('layerY'),
        layerYValue: document.getElementById('layerYValue'),
        layerW: document.getElementById('layerW'),
        layerWValue: document.getElementById('layerWValue'),
        layerH: document.getElementById('layerH'),
        layerHValue: document.getElementById('layerHValue'),
        layerAnimType: document.getElementById('layerAnimType'),
        layerAnimDir: document.getElementById('layerAnimDir'),
        layerAnimSpeed: document.getElementById('layerAnimSpeed'),
        layerAnimSpeedValue: document.getElementById('layerAnimSpeedValue'),
        layerFilterType: document.getElementById('layerFilterType'),
        layerFilterValue: document.getElementById('layerFilterValue'),
        layerFilterValueText: document.getElementById('layerFilterValueText'),
      };
    }
    
    /**
     * Sets up the initial state of the application.
     */
    initState() {
      this.playlist = [];
      this.currentSceneIndex = -1;
      this.selectedSceneIndex = -1;
      this.selectedLayerIndex = -1;
      this.isPlaying = false;
      this.isLooping = true;
      this.isShuffling = false;
      this.playTimeout = null;
      this.sceneCounter = 0; // For unique scene names
      this.layerCounter = 0; // For unique layer names
    }
  
    /**
     * Binds all event listeners for the application UI.
     */
    bindEvents() {
      // Playback
      this.dom.playBtn.addEventListener('click', () => this.togglePlay());
      this.dom.nextBtn.addEventListener('click', () => this.nextScene(true));
      this.dom.prevBtn.addEventListener('click', () => this.prevScene());
      this.dom.hudMode.addEventListener('change', (e) => this.dom.visorHud.classList.toggle('mirrored', e.target.value === 'mirrored'));
      this.dom.loopToggle.addEventListener('change', (e) => this.isLooping = e.target.checked);
      this.dom.shuffleToggle.addEventListener('change', (e) => this.isShuffling = e.target.checked);
      
      // Keyboard shortcuts for a "remote control" feel
      document.addEventListener('keydown', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; // Ignore if typing
          if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
          if (e.code === 'ArrowRight') this.nextScene(true);
          if (e.code === 'ArrowLeft') this.prevScene();
      });
  
      // Playlist
      this.dom.addSceneBtn.addEventListener('click', () => this.addScene());
      this.dom.clearBtn.addEventListener('click', () => this.clearPlaylist());
      this.dom.loadDefaultBtn.addEventListener('click', () => this.loadDefaultPlaylist());
  
      // Presets
      this.dom.saveBtn.addEventListener('click', () => this.savePlaylistToFile());
      this.dom.loadFileInput.addEventListener('change', (e) => this.loadPlaylistFromFile(e));
  
      // Scene Editor
      this.dom.sceneDurationInput.addEventListener('input', e => this.updateSceneProperty('duration', parseInt(e.target.value, 10)));
      this.dom.sceneTransitionInput.addEventListener('change', e => this.updateSceneProperty('transition', e.target.value));
  
      // Layer Editor
      this.dom.addLayerBtn.addEventListener('click', () => this.addLayer());
      
      // Live update all layer properties
      const liveUpdateFields = [
        { el: this.dom.layerType, prop: 'type' }, { el: this.dom.layerContent, prop: 'content' },
        { el: this.dom.layerX, prop: 'x' }, { el: this.dom.layerY, prop: 'y' },
        { el: this.dom.layerW, prop: 'width' }, { el: this.dom.layerH, prop: 'height' },
        { el: this.dom.layerAnimType, prop: 'animType' }, { el: this.dom.layerAnimDir, prop: 'animDir' },
        { el: this.dom.layerAnimSpeed, prop: 'animSpeed' }, { el: this.dom.layerFilterType, prop: 'filterType' },
        { el: this.dom.layerFilterValue, prop: 'filterValue' },
      ];
      
      liveUpdateFields.forEach(({el, prop}) => {
        el.addEventListener('input', e => this.updateLayerProperty(prop, e.target.value));
        el.addEventListener('change', e => this.updateLayerProperty(prop, e.target.value));
      });
    }
  
    // =======================================================
    // PLAYLIST & SCENE MANAGEMENT
    // =======================================================
  
    togglePlay() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        if (this.currentSceneIndex === -1) {
          this.nextScene();
        } else {
          this.playCurrentScene();
        }
        this.dom.playBtn.textContent = 'Pause';
        this.dom.playBtn.classList.add('active');
      } else {
        clearTimeout(this.playTimeout);
        this.dom.playBtn.textContent = 'Play';
        this.dom.playBtn.classList.remove('active');
      }
    }
  
    playCurrentScene() {
        if (!this.isPlaying || this.currentSceneIndex === -1) return;
  
        const scene = this.playlist[this.currentSceneIndex];
        this.renderSceneToHUD(scene);
        this.updatePlaylistUI(); // Highlight current scene
  
        clearTimeout(this.playTimeout);
        this.playTimeout = setTimeout(() => {
            this.nextScene();
        }, scene.duration);
    }
  
    nextScene(isManualSkip = false) {
      if (this.playlist.length === 0) return this.stop();
  
      if (this.currentSceneIndex !== -1) {
          this.transitionOutCurrentScene();
      }
      
      if (this.isShuffling && !isManualSkip) {
          this.currentSceneIndex = Math.floor(Math.random() * this.playlist.length);
      } else {
          this.currentSceneIndex++;
      }
  
      if (this.currentSceneIndex >= this.playlist.length) {
        if (this.isLooping) {
          this.currentSceneIndex = 0;
        } else {
          return this.stop();
        }
      }
      
      // Short delay to allow out-transition to complete before playing next
      setTimeout(() => this.playCurrentScene(), 500); 
    }
  
    prevScene() {
        if (this.playlist.length === 0) return;
        this.currentSceneIndex--;
        if (this.currentSceneIndex < 0) {
            this.currentSceneIndex = this.playlist.length - 1; // Wrap around
        }
        this.playCurrentScene();
    }
    
    stop() {
      this.isPlaying = false;
      this.currentSceneIndex = -1;
      clearTimeout(this.playTimeout);
      this.transitionOutCurrentScene();
      this.dom.playBtn.textContent = 'Play';
      this.dom.playBtn.classList.remove('active');
      this.updatePlaylistUI();
    }
    
    addScene() {
      this.sceneCounter++;
      const newScene = {
        id: Date.now(),
        name: `Scene ${this.sceneCounter}`,
        duration: 5000,
        transition: 'fade',
        layers: []
      };
      this.playlist.push(newScene);
      this.selectScene(this.playlist.length - 1);
    }
  
    removeScene(index) {
      this.playlist.splice(index, 1);
      if (this.currentSceneIndex === index) this.stop();
      if (this.currentSceneIndex > index) this.currentSceneIndex--;
      if (this.selectedSceneIndex === index) this.hideEditors();
      if (this.selectedSceneIndex > index) this.selectedSceneIndex--;
      this.updatePlaylistUI();
    }
  
    addLayer() {
        if (this.selectedSceneIndex === -1) return;
        this.layerCounter++;
        const newLayer = {
          id: Date.now(),
          name: `Layer ${this.layerCounter}`,
          type: 'text', content: 'New Layer',
          x: 50, y: 50, width: 80, height: 20, // Centered
          animType: 'none', animDir: 'left', animSpeed: 8,
          filterType: 'none', filterValue: '100'
        };
        this.playlist[this.selectedSceneIndex].layers.push(newLayer);
        this.selectLayer(this.playlist[this.selectedSceneIndex].layers.length - 1);
    }
  
    removeLayer(index) {
      if (this.selectedSceneIndex === -1) return;
      this.playlist[this.selectedSceneIndex].layers.splice(index, 1);
      if (this.selectedLayerIndex === index) this.dom.layerEditor.classList.add('hidden');
      if (this.selectedLayerIndex > index) this.selectedLayerIndex--;
      this.renderSceneEditor(); // Re-render layer list and check for live updates
    }
  
    clearPlaylist() {
      this.stop();
      this.initState();
      this.updatePlaylistUI();
      this.hideEditors();
    }
  
  
    // =======================================================
    // UI RENDERING & LIVE EDITING
    // =======================================================
  
    updatePlaylistUI() {
      this.dom.playlistDisplay.innerHTML = '<h4>Scene Queue</h4>';
      if(this.playlist.length === 0) {
          this.dom.playlistDisplay.innerHTML += `<p style="opacity:0.5; text-align:center;">Queue is empty.</p>`;
          return;
      }
      const ul = document.createElement('ul');
      this.playlist.forEach((scene, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        if (index === this.currentSceneIndex && this.isPlaying) li.classList.add('playing');
        if (index === this.selectedSceneIndex) li.classList.add('selected');
        
        li.innerHTML = `<span>${scene.name} (${scene.layers.length} layers)</span>
                        <div class="item-controls">
                          <button class="delete-btn" data-index="${index}">X</button>
                        </div>`;
  
        li.addEventListener('click', (e) => {
          if (!e.target.classList.contains('delete-btn')) {
            this.selectScene(index);
          }
        });
        li.querySelector('.delete-btn').addEventListener('click', () => this.removeScene(index));
        ul.appendChild(li);
      });
      this.dom.playlistDisplay.appendChild(ul);
    }
  
    selectScene(index) {
      this.selectedSceneIndex = index;
      this.selectedLayerIndex = -1; // Reset layer selection
      this.renderSceneEditor();
      this.updatePlaylistUI();
    }
    
    selectLayer(index) {
      this.selectedLayerIndex = index;
      this.renderLayerEditor();
      this.renderLayerListUI(); // To highlight selected layer
    }
  
    hideEditors() {
        this.selectedSceneIndex = -1;
        this.dom.editorContainer.classList.add('hidden');
        this.dom.layerEditor.classList.add('hidden');
    }
  
    renderSceneEditor() {
      if (this.selectedSceneIndex === -1) { this.hideEditors(); return; }
      
      const scene = this.playlist[this.selectedSceneIndex];
      this.dom.editorContainer.classList.remove('hidden');
      this.dom.layerEditor.classList.add('hidden'); // Hide layer editor until a layer is selected
  
      this.dom.sceneEditorTitle.textContent = `for "${scene.name}"`;
      this.dom.sceneDurationInput.value = scene.duration;
      this.dom.sceneTransitionInput.value = scene.transition;
  
      this.renderLayerListUI();
      this.liveUpdateCheck();
    }
  
    renderLayerListUI() {
        const scene = this.playlist[this.selectedSceneIndex];
        this.dom.layerList.innerHTML = '';
        scene.layers.forEach((layer, index) => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            if(index === this.selectedLayerIndex) item.classList.add('selected');
            item.innerHTML = `<span>${layer.name || 'Untitled Layer'}</span>
                              <div class="item-controls">
                                <button class="delete-btn" data-index="${index}">X</button>
                              </div>`;
            item.addEventListener('click', (e) => {
                if(!e.target.classList.contains('delete-btn')) this.selectLayer(index);
            });
            item.querySelector('.delete-btn').addEventListener('click', () => this.removeLayer(index));
            this.dom.layerList.appendChild(item);
        });
    }
  
    renderLayerEditor() {
      if (this.selectedLayerIndex === -1) { this.dom.layerEditor.classList.add('hidden'); return; }
  
      const layer = this.playlist[this.selectedSceneIndex].layers[this.selectedLayerIndex];
      this.dom.layerEditor.classList.remove('hidden');
      this.dom.layerEditorTitle.textContent = `for "${layer.name}"`;
      
      // Populate fields
      this.dom.layerType.value = layer.type;
      this.dom.layerContent.value = layer.content;
      
      this.dom.layerX.value = layer.x; this.dom.layerXValue.textContent = layer.x;
      this.dom.layerY.value = layer.y; this.dom.layerYValue.textContent = layer.y;
      this.dom.layerW.value = layer.width; this.dom.layerWValue.textContent = layer.width;
      this.dom.layerH.value = layer.height; this.dom.layerHValue.textContent = layer.height;
  
      this.dom.layerAnimType.value = layer.animType;
      this.dom.layerAnimDir.value = layer.animDir;
      this.dom.layerAnimSpeed.value = layer.animSpeed;
      this.dom.layerAnimSpeedValue.textContent = layer.animSpeed;
  
      this.dom.layerFilterType.value = layer.filterType;
      this.updateFilterValueUI(layer.filterType, layer.filterValue);
      this.dom.layerFilterValue.value = layer.filterValue;
  
      this.liveUpdateCheck();
    }
    
    updateSceneProperty(prop, value) {
        if(this.selectedSceneIndex === -1) return;
        this.playlist[this.selectedSceneIndex][prop] = value;
        this.liveUpdateCheck();
    }
  
    updateLayerProperty(prop, value) {
        if(this.selectedSceneIndex === -1 || this.selectedLayerIndex === -1) return;
        const layer = this.playlist[this.selectedSceneIndex].layers[this.selectedLayerIndex];
        layer[prop] = value;
        
        // Update linked UI elements (e.g. slider value text)
        if (['x','y','width','height', 'animSpeed'].includes(prop)) {
            this.dom[`layer${prop.charAt(0).toUpperCase() + prop.slice(1)}Value`].textContent = value;
        }
        if (prop === 'filterType') {
            this.updateFilterValueUI(value, layer.filterValue);
        }
        if (prop === 'filterValue') {
            this.updateFilterValueUI(layer.filterType, value, true);
        }
  
        this.liveUpdateCheck();
    }
    
    /** If the edited scene is currently playing, re-render it instantly */
    liveUpdateCheck() {
        if(this.isPlaying && this.currentSceneIndex === this.selectedSceneIndex) {
            this.renderSceneToHUD(this.playlist[this.currentSceneIndex]);
        }
    }
    
    /** Updates the filter slider's range and displayed value text */
    updateFilterValueUI(type, value, isUpdateTextOnly = false) {
      let min=0, max=200, step=1, unit='%', currentVal=value;
      switch(type) {
        case 'blur': max = 20; unit = 'px'; break;
        case 'hue-rotate': max = 360; unit = 'deg'; break;
        case 'invert': max=100; break;
        case 'none': max=0; currentVal=0; break;
      }
      if(!isUpdateTextOnly) {
          this.dom.layerFilterValue.min = min;
          this.dom.layerFilterValue.max = max;
          this.dom.layerFilterValue.step = step;
          this.dom.layerFilterValue.value = currentVal;
      }
      this.dom.layerFilterValueText.textContent = `${currentVal}${unit}`;
    }
  
  
    // =======================================================
    // HUD VISUAL RENDERING
    // =======================================================
    
    transitionOutCurrentScene() {
      const currentContainer = this.dom.visorHud.querySelector('.hud-scene-container');
      if (currentContainer) {
        const transition = currentContainer.dataset.transition;
        const duration = currentContainer.style.getPropertyValue('--transition-duration');
        
        currentContainer.classList.remove(`${transition}-in`, 'active');
        currentContainer.classList.add(`${transition}-out`);
        
        setTimeout(() => currentContainer.remove(), duration ? parseInt(duration) : 500);
      }
    }
  
    renderSceneToHUD(scene) {
      this.transitionOutCurrentScene();
  
      const sceneContainer = document.createElement('div');
      sceneContainer.className = 'hud-scene-container';
      sceneContainer.dataset.transition = scene.transition;
  
      // Apply transition timing, using a portion of total duration (e.g., 10%, max 500ms)
      const transitionDuration = Math.min(scene.duration * 0.1, 500);
      sceneContainer.style.setProperty('--transition-duration', `${transitionDuration}ms`);
  
      scene.layers.forEach(layer => {
        const layerEl = this.createLayerElement(layer);
        sceneContainer.appendChild(layerEl);
      });
      
      this.dom.visorHud.appendChild(sceneContainer);
  
      sceneContainer.classList.add(`${scene.transition}-in`, 'active');
    }
  
    createLayerElement(layer) {
      const el = document.createElement('div');
      el.className = 'hud-layer';
  
      // Position and Size
      el.style.setProperty('--x-pos', `${layer.x}%`);
      el.style.setProperty('--y-pos', `${layer.y}%`);
      el.style.setProperty('--w-size', `${layer.width}%`);
      el.style.setProperty('--h-size', `${layer.height}%`);
  
      // Content
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
              contentEl.muted = true; // Essential for autoplay
              break;
          case 'url':
              contentEl = document.createElement('iframe');
              contentEl.src = layer.content;
              break;
          case 'text':
          default:
              contentEl = document.createElement('p');
              contentEl.textContent = layer.content;
              break;
      }
      el.appendChild(contentEl);
      
      // Animation
      if (layer.animType === 'scroll') {
        contentEl.classList.add('anim-scroll');
        contentEl.style.setProperty('--anim-duration', `${layer.animSpeed}s`);
        contentEl.style.setProperty('--anim-name', `scroll-${layer.animDir}`);
      }
  
      // Visual Effect (Filter)
      let filterString = 'none';
      if(layer.filterType !== 'none') {
          const unit = {'blur': 'px', 'hue-rotate': 'deg'}[layer.filterType] || '%';
          filterString = `${layer.filterType}(${layer.filterValue}${unit})`;
      }
      el.style.setProperty('--filter', filterString);
  
      return el;
    }
    
    // =======================================================
    // PRESETS & DEMO
    // =======================================================
    
    savePlaylistToFile() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.playlist, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "hud-playlist.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  
    loadPlaylistFromFile(event) {
      const file = event.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedPlaylist = JSON.parse(e.target.result);
          if (Array.isArray(loadedPlaylist)) {
            this.clearPlaylist();
            this.playlist = loadedPlaylist;
            // Assign unique IDs if they're missing from old formats
            let sc=0, lc=0;
            this.playlist.forEach(s => { 
                s.id = s.id || Date.now() + ++sc; 
                s.layers.forEach(l => l.id = l.id || Date.now() + ++lc);
            });
            this.updatePlaylistUI();
            alert('Playlist loaded successfully!');
          } else {
            throw new Error('Invalid playlist format.');
          }
        } catch (error) {
          console.error("Failed to load playlist:", error);
          alert('Error: Could not load the file. Make sure it is a valid playlist JSON.');
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input to allow loading the same file again
    }
    
    /** Loads a rich demo playlist to showcase features. */
    loadDefaultPlaylist() {
      this.stop();
      this.clearPlaylist();
      const defaultPlaylist = [
        {
          "id": 1, "name": "System Boot", "duration": 4000, "transition": "fade",
          "layers": [
            { "id": 101, "name": "Boot Text", "type": "text", "content": "B.A.M. OS v2.0\nINITIALIZING HUD...", "x": 50, "y": 50, "width": 80, "height": 30, "animType": "none", "animDir": "left", "animSpeed": 8, "filterType": "none", "filterValue": 100 },
            { "id": 102, "name": "Loading Bar", "type": "text", "content": "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓", "x": 50, "y": 80, "width": 100, "height": 10, "animType": "none", "animDir": "left", "animSpeed": 8, "filterType": "blur", "filterValue": "1" }
          ]
        },
        {
          "id": 2, "name": "Video + Scroll", "duration": 10000, "transition": "slide-up",
          "layers": [
            { "id": 201, "name": "Background Video", "type": "video", "content": "https://i.imgur.com/z4T19B4.mp4", "x": 50, "y": 50, "width": 100, "height": 100, "animType": "none", "animDir": "left", "animSpeed": 8, "filterType": "saturate", "filterValue": 180 },
            { "id": 202, "name": "Scrolling News", "type": "text", "content": "MISSION ALERT: UNIDENTIFIED SIGNAL DETECTED IN SECTOR 7G. PROCEED WITH CAUTION. ALL SYSTEMS NOMINAL.", "x": 50, "y": 90, "width": 100, "height": 15, "animType": "scroll", "animDir": "left", "animSpeed": "15", "filterType": "none", "filterValue": 100 },
            { "id": 203, "name": "Corner Logo", "type": "image", "content": "https://i.imgur.com/gJZ4Vwm.png", "x": 10, "y": 12, "width": 15, "height": 15, "animType": "none", "animDir": "left", "animSpeed": 8, "filterType": "none", "filterValue": 100 }
          ]
        },
        {
          "id": 3, "name": "Glitch Effect", "duration": 5000, "transition": "fade",
          "layers": [
            { "id": 301, "name": "Web Content", "type": "url", "content": "https://glicol.org", "x": 50, "y": 50, "width": 100, "height": 100, "animType": "none", "animDir": "left", "animSpeed": 8, "filterType": "none", "filterValue": 100 },
            { "id": 302, "name": "Static Overlay", "type": "image", "content": "https://i.imgur.com/9C8A4f7.gif", "x": "50", "y": "50", "width": "100", "height": "100", "animType": "none", "animDir": "left", "animSpeed": "8", "filterType": "invert", "filterValue": "100" }
          ]
        }
      ];
      this.playlist = defaultPlaylist;
      this.updatePlaylistUI();
    }
  }
  
  // Instantiate the app to start it
  window.hudApp = new HUDApp();
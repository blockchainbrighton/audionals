// Project Manager Module
class ProjectManager {
    constructor(pixelCanvas, paletteManager, hudManager, toolManager) {
        this.pixelCanvas = pixelCanvas;
        this.paletteManager = paletteManager;
        this.hudManager = hudManager;
        this.toolManager = toolManager;
        
        this.currentProject = {
            name: 'helmet-design',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            metadata: {
                description: '',
                author: '',
                tags: []
            }
        };
        
        // DOM elements
        this.projectNameInput = DOMUtils.getElementById('projectName');
        this.projectDescInput = DOMUtils.getElementById('projectDescription');
        this.saveProjectBtn = DOMUtils.getElementById('saveProjectBtn');
        this.loadProjectBtn = DOMUtils.getElementById('loadProjectBtn');
        this.exportPngBtn = DOMUtils.getElementById('exportPngBtn');
        this.exportJsonBtn = DOMUtils.getElementById('exportJsonBtn');
        this.clearBtn = DOMUtils.getElementById('clearCanvasBtn');
        this.fileInput = DOMUtils.getElementById('fileInput');
        
        this.init();
    }

    /**
     * Initialize project manager
     */
    init() {
        this.setupProjectControls();
        this.setupFileInput();
        this.updateProjectInfo();
        
        console.log('ProjectManager initialized');
    }

    /**
     * Setup project controls
     */
    setupProjectControls() {
        // Project name input
        if (this.projectNameInput) {
            this.projectNameInput.value = this.currentProject.name;
            DOMUtils.addEventListener(this.projectNameInput, 'input', () => {
                this.currentProject.name = this.projectNameInput.value || 'untitled';
                this.currentProject.modified = new Date().toISOString();
            });
        }
        
        // Project description input
        if (this.projectDescInput) {
            DOMUtils.addEventListener(this.projectDescInput, 'input', () => {
                this.currentProject.metadata.description = this.projectDescInput.value;
                this.currentProject.modified = new Date().toISOString();
            });
        }
        
        // Save project button
        if (this.saveProjectBtn) {
            DOMUtils.addEventListener(this.saveProjectBtn, 'click', () => {
                this.saveProject();
            });
        }
        
        // Load project button
        if (this.loadProjectBtn) {
            DOMUtils.addEventListener(this.loadProjectBtn, 'click', () => {
                this.loadProject();
            });
        }
        
        // Export PNG button
        if (this.exportPngBtn) {
            DOMUtils.addEventListener(this.exportPngBtn, 'click', () => {
                this.exportPNG();
            });
        }
        
        // Export JSON button
        if (this.exportJsonBtn) {
            DOMUtils.addEventListener(this.exportJsonBtn, 'click', () => {
                this.exportJSON();
            });
        }
        
        // Clear canvas button
        if (this.clearBtn) {
            DOMUtils.addEventListener(this.clearBtn, 'click', () => {
                this.clearCanvas();
            });
        }
    }

    /**
     * Setup file input for loading projects
     */
    setupFileInput() {
        if (!this.fileInput) {
            // Create hidden file input
            this.fileInput = DOMUtils.createElement('input', {
                type: 'file',
                accept: '.json,.pixelart',
                style: 'display: none;'
            });
            document.body.appendChild(this.fileInput);
        }
        
        DOMUtils.addEventListener(this.fileInput, 'change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadProjectFromFile(file);
            }
        });
    }

    /**
     * Save current project
     */
    saveProject() {
        try {
            const projectData = this.generateProjectData();
            const filename = `${this.currentProject.name}.pixelart`;
            
            FileUtils.downloadJSON(projectData, filename);
            
            // Update project metadata
            this.currentProject.modified = new Date().toISOString();
            this.updateProjectInfo();
            
            eventManager.emit(EVENTS.PROJECT_SAVED, { 
                name: this.currentProject.name,
                filename 
            });
            
            console.log(`Project saved: ${filename}`);
            
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project. Please try again.');
        }
    }

    /**
     * Load project (trigger file picker)
     */
    loadProject() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    /**
     * Load project from file
     */
    async loadProjectFromFile(file) {
        try {
            const text = await FileUtils.readFileAsText(file);
            const projectData = JSON.parse(text);
            
            // Validate project data
            if (!this.validateProjectData(projectData)) {
                throw new Error('Invalid project file format');
            }
            
            // Load project data
            this.loadProjectData(projectData);
            
            eventManager.emit(EVENTS.PROJECT_LOADED, { 
                name: projectData.name,
                filename: file.name 
            });
            
            console.log(`Project loaded: ${file.name}`);
            
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file. Please check the file format.');
        }
    }

    /**
     * Export canvas as PNG
     */
    exportPNG() {
        try {
            const canvas = this.pixelCanvas.getCanvas();
            const filename = `${this.currentProject.name}.png`;
            
            // Create a scaled version for better quality
            const scaledCanvas = this.createScaledCanvas(canvas, 8); // 8x scale
            
            FileUtils.downloadCanvasAsPNG(scaledCanvas, filename);
            
            eventManager.emit(EVENTS.PNG_EXPORTED, { 
                name: this.currentProject.name,
                filename 
            });
            
            console.log(`PNG exported: ${filename}`);
            
        } catch (error) {
            console.error('Error exporting PNG:', error);
            alert('Error exporting PNG. Please try again.');
        }
    }

    /**
     * Export project as JSON
     */
    exportJSON() {
        try {
            const projectData = this.generateProjectData();
            const filename = `${this.currentProject.name}.json`;
            
            FileUtils.downloadJSON(projectData, filename);
            
            eventManager.emit(EVENTS.JSON_EXPORTED, { 
                name: this.currentProject.name,
                filename 
            });
            
            console.log(`JSON exported: ${filename}`);
            
        } catch (error) {
            console.error('Error exporting JSON:', error);
            alert('Error exporting JSON. Please try again.');
        }
    }

    /**
     * Clear canvas with confirmation
     */
    clearCanvas() {
        const confirmed = confirm('Are you sure you want to clear the canvas? This action cannot be undone.');
        
        if (confirmed) {
            this.pixelCanvas.clear();
            
            // Clear HUD elements
            if (this.hudManager) {
                this.hudManager.clearAllHUDElements();
            }
            
            // Clear tool history
            if (this.toolManager) {
                this.toolManager.clearHistory();
            }
            
            // Update project metadata
            this.currentProject.modified = new Date().toISOString();
            this.updateProjectInfo();
            
            eventManager.emit(EVENTS.CANVAS_CLEARED, {});
            
            console.log('Canvas cleared');
        }
    }

    /**
     * Generate complete project data
     */
    generateProjectData() {
        const projectData = {
            // Project metadata
            name: this.currentProject.name,
            version: this.currentProject.version,
            created: this.currentProject.created,
            modified: new Date().toISOString(),
            metadata: {
                description: this.projectDescInput?.value || '',
                author: this.currentProject.metadata.author,
                tags: this.currentProject.metadata.tags,
                canvasSize: this.pixelCanvas.gridSize,
                totalPixels: this.pixelCanvas.gridSize * this.pixelCanvas.gridSize
            },
            
            // Canvas data
            canvas: {
                gridSize: this.pixelCanvas.gridSize,
                pixelData: this.pixelCanvas.getPixelData(),
                backgroundColor: this.pixelCanvas.backgroundColor || 'transparent'
            },
            
            // Palette data
            palette: this.paletteManager ? this.paletteManager.exportPaletteConfig() : null,
            
            // HUD data
            hud: this.hudManager ? this.hudManager.exportHUDConfig() : null,
            
            // Tool data
            tools: this.toolManager ? this.toolManager.exportToolConfig() : null,
            
            // Application info
            application: {
                name: 'Pixel Art Helmet Designer',
                version: '1.0.0',
                format: 'pixelart-project'
            }
        };
        
        return projectData;
    }

    /**
     * Load project data into application
     */
    loadProjectData(projectData) {
        try {
            // Update current project info
            this.currentProject = {
                name: projectData.name || 'loaded-project',
                version: projectData.version || '1.0.0',
                created: projectData.created || new Date().toISOString(),
                modified: projectData.modified || new Date().toISOString(),
                metadata: projectData.metadata || {}
            };
            
            // Load canvas data
            if (projectData.canvas) {
                this.pixelCanvas.setPixelData(projectData.canvas.pixelData);
                
                if (projectData.canvas.backgroundColor) {
                    this.pixelCanvas.backgroundColor = projectData.canvas.backgroundColor;
                }
            }
            
            // Load palette data
            if (projectData.palette && this.paletteManager) {
                this.paletteManager.importPaletteConfig(projectData.palette);
            }
            
            // Load HUD data
            if (projectData.hud && this.hudManager) {
                this.hudManager.importHUDConfig(projectData.hud);
            }
            
            // Load tool data
            if (projectData.tools && this.toolManager) {
                this.toolManager.importToolConfig(projectData.tools);
            }
            
            // Update UI
            this.updateProjectInfo();
            
            // Clear file input
            if (this.fileInput) {
                this.fileInput.value = '';
            }
            
            console.log('Project data loaded successfully');
            
        } catch (error) {
            console.error('Error loading project data:', error);
            throw error;
        }
    }

    /**
     * Validate project data format
     */
    validateProjectData(data) {
        // Check required fields
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check for essential project structure
        if (!data.name || !data.canvas || !data.canvas.pixelData) {
            return false;
        }
        
        // Check canvas data structure
        if (!Array.isArray(data.canvas.pixelData)) {
            return false;
        }
        
        // Check application format
        if (data.application && data.application.format !== 'pixelart-project') {
            console.warn('Unknown project format, attempting to load anyway');
        }
        
        return true;
    }

    /**
     * Create scaled canvas for export
     */
    createScaledCanvas(sourceCanvas, scale) {
        const scaledCanvas = DOMUtils.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        
        scaledCanvas.width = sourceCanvas.width * scale;
        scaledCanvas.height = sourceCanvas.height * scale;
        
        // Disable image smoothing for pixel art
        scaledCtx.imageSmoothingEnabled = false;
        scaledCtx.webkitImageSmoothingEnabled = false;
        scaledCtx.mozImageSmoothingEnabled = false;
        scaledCtx.msImageSmoothingEnabled = false;
        
        // Draw scaled image
        scaledCtx.drawImage(
            sourceCanvas, 
            0, 0, sourceCanvas.width, sourceCanvas.height,
            0, 0, scaledCanvas.width, scaledCanvas.height
        );
        
        return scaledCanvas;
    }

    /**
     * Update project info display
     */
    updateProjectInfo() {
        // Update project name input
        if (this.projectNameInput) {
            this.projectNameInput.value = this.currentProject.name;
        }
        
        // Update project description
        if (this.projectDescInput) {
            this.projectDescInput.value = this.currentProject.metadata.description || '';
        }
        
        // Update project statistics
        this.updateProjectStats();
    }

    /**
     * Update project statistics
     */
    updateProjectStats() {
        const stats = {
            pixels: this.pixelCanvas ? this.pixelCanvas.getPixelCount() : 0,
            hudElements: this.hudManager ? this.hudManager.getHUDElements().length : 0,
            colorsUsed: this.pixelCanvas ? this.pixelCanvas.getUniqueColorCount() : 0,
            tool: this.toolManager ? this.toolManager.getCurrentTool() : 'brush',
            brushSize: this.toolManager ? this.toolManager.getBrushSize() : 1
        };
        
        // Update statistics display
        const statsElements = DOMUtils.querySelectorAll('.project-stats .stat-value');
        if (statsElements.length >= 5) {
            statsElements[0].textContent = `${stats.pixels}/4096`;
            statsElements[1].textContent = stats.hudElements;
            statsElements[2].textContent = stats.colorsUsed;
            statsElements[3].textContent = stats.tool;
            statsElements[4].textContent = `${stats.brushSize}px`;
        }
        
        eventManager.emit(EVENTS.UI_STATS_UPDATED, stats);
    }

    /**
     * Create new project
     */
    createNewProject(name = 'new-project') {
        // Confirm if current project has unsaved changes
        const confirmed = confirm('Create new project? Any unsaved changes will be lost.');
        
        if (confirmed) {
            // Clear canvas and reset everything
            this.clearCanvas();
            
            // Reset project info
            this.currentProject = {
                name: name,
                version: '1.0.0',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                metadata: {
                    description: '',
                    author: '',
                    tags: []
                }
            };
            
            // Reset managers to defaults
            if (this.paletteManager) {
                this.paletteManager.resetToDefaults();
            }
            
            if (this.toolManager) {
                this.toolManager.resetToDefaults();
            }
            
            // Update UI
            this.updateProjectInfo();
            
            eventManager.emit(EVENTS.PROJECT_CREATED, { name });
            
            console.log(`New project created: ${name}`);
        }
    }

    /**
     * Get current project info
     */
    getCurrentProject() {
        return { ...this.currentProject };
    }

    /**
     * Set project metadata
     */
    setProjectMetadata(metadata) {
        this.currentProject.metadata = { ...this.currentProject.metadata, ...metadata };
        this.currentProject.modified = new Date().toISOString();
        this.updateProjectInfo();
    }

    /**
     * Auto-save project to localStorage
     */
    autoSave() {
        try {
            const projectData = this.generateProjectData();
            const autoSaveKey = `pixelart_autosave_${this.currentProject.name}`;
            
            localStorage.setItem(autoSaveKey, JSON.stringify(projectData));
            localStorage.setItem('pixelart_last_autosave', autoSaveKey);
            
            console.log('Project auto-saved to localStorage');
            
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Load auto-saved project
     */
    loadAutoSave() {
        try {
            const lastAutoSaveKey = localStorage.getItem('pixelart_last_autosave');
            
            if (lastAutoSaveKey) {
                const autoSaveData = localStorage.getItem(lastAutoSaveKey);
                
                if (autoSaveData) {
                    const projectData = JSON.parse(autoSaveData);
                    
                    if (this.validateProjectData(projectData)) {
                        const confirmed = confirm('Auto-saved project found. Would you like to restore it?');
                        
                        if (confirmed) {
                            this.loadProjectData(projectData);
                            console.log('Auto-saved project restored');
                            return true;
                        }
                    }
                }
            }
            
        } catch (error) {
            console.warn('Failed to load auto-save:', error);
        }
        
        return false;
    }

    /**
     * Setup auto-save interval
     */
    setupAutoSave(intervalMinutes = 5) {
        setInterval(() => {
            this.autoSave();
        }, intervalMinutes * 60 * 1000);
        
        console.log(`Auto-save enabled (every ${intervalMinutes} minutes)`);
    }
}


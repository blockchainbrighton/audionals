// Harmonoids Game - Core Game Engine
class HarmonoidsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        
        // Game state
        this.gameRunning = false;
        this.harmonoids = [];
        this.selectedHarmonoids = [];
        this.level = null;
        this.stats = {
            total: 0,
            saved: 0,
            lost: 0
        };
        
        // Game settings
        // this.harmonoidSpawnRate = 60; // frames between spawns (REMOVED - Manual Spawn)
        this.harmonoidSpeed = 1;
        this.frameCount = 0;
        this.nextHarmonoidId = 0;
        this.dropCooldown = 30; // frames, e.g., 0.5 seconds at 60 FPS
        this.lastDropFrame = -this.dropCooldown; // Allow first drop immediately after game start
        this.playDropSoundEffect = true; // Control for the drop Harmonoid sound
        
        this.selectionBox = null;
        this.isDragging = false;
        
        this.setupEventListeners();
        this.createLevel(); // Create level structure initially
        this.updateStats(); // Initial UI update
        this.gameLoop();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 100; // Leave space for UI if UI is at bottom
                                                    // With UI on left, this can be window.innerHeight

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight; // Assuming full viewport canvas
            this.createLevel(); // Recreate level elements if they depend on canvas size
        });
        // Initial setup for canvas size, can be adjusted
        this.canvas.width = window.innerWidth * 0.98; // Slightly less than full for aesthetics
        this.canvas.height = window.innerHeight * 0.98; 
    }
    
    setupEventListeners() {
        // UI buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('dropHarmonoidBtn').addEventListener('click', () => {
            this.handleDropHarmonoid();
        });
        
        document.getElementById('pitchUpBtn').addEventListener('click', () => {
            this.adjustPitch(1);
        });
        
        document.getElementById('pitchDownBtn').addEventListener('click', () => {
            this.adjustPitch(-1);
        });
        
        document.getElementById('tempoUpBtn').addEventListener('click', () => {
            this.adjustTempo(0.2);
        });
        
        document.getElementById('tempoDownBtn').addEventListener('click', () => {
            this.adjustTempo(-0.2);
        });
        
        document.getElementById('audioToggleBtn').addEventListener('click', () => {
            this.toggleAudio();
        });
        
        // Canvas click for selection (single click)
        this.canvas.addEventListener('click', (e) => {
            // Prevent single click selection if a drag operation just finished
            if (this.dragJustFinished) {
                this.dragJustFinished = false;
                return;
            }
            this.handleCanvasClick(e);
        });
        
        // Canvas drag for marquee selection
        this.canvas.addEventListener('mousedown', (e) => {
            this.startSelection(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateSelection(e);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.endSelection(e);
        });
    }
    
    createLevel() {
        // Ensure consistent platform Y values after canvas resize
        const groundLevel = this.canvas.height - 50;
        this.level = {
            startX: 50,
            startY: groundLevel - 50, // Harmonoids start on a slightly elevated point or main ground
            endX: this.canvas.width - 100,
            endY: groundLevel - 50, // End point at similar elevation
            platforms: [
                { x: 0, y: groundLevel, width: this.canvas.width, height: 50 }, // Main ground
                { x: 200, y: groundLevel - 100, width: 200, height: 20 },
                { x: 500, y: groundLevel - 150, width: 200, height: 20 },
                { x: 800, y: groundLevel - 100, width: 200, height: 20 }
            ],
            harmonicGate: {
                x: this.canvas.width / 2 - 25,
                y: groundLevel - 150, // Gate positioned relevant to platforms
                width: 50,
                height: 150,
                requiredChord: [440, 550], // A4 and C#5 (major third)
                isOpen: false
            },
            resonanceFields: [
                {
                    x: 300,
                    y: groundLevel - 70, // y pos relative to ground
                    width: 100,
                    height: 60,
                    frequency: 440,
                    effect: 'speed_boost'
                },
                {
                    x: 700,
                    y: groundLevel - 70, // y pos relative to ground
                    width: 100,
                    height: 60,
                    frequency: 660,
                    effect: 'jump_boost'
                }
            ],
            dissonanceZones: [
                {
                    x: 450,
                    y: groundLevel - 50, // y pos relative to ground
                    width: 80,
                    height: 40,
                    maxDissonance: 0.5 
                }
            ]
        };
    }
    
    async startGame() { // Made async for audio initialization
        this.gameRunning = true;
        this.harmonoids = [];
        this.selectedHarmonoids = [];
        this.stats = { total: 0, saved: 0, lost: 0 };
        this.frameCount = 0;
        this.nextHarmonoidId = 0;
        this.lastDropFrame = -this.dropCooldown; // Reset cooldown
        
        // Attempt to initialize audio system (requires user interaction)
        if (!this.audioManager.isInitialized) {
            await this.audioManager.initialize();
        } else {
            await this.audioManager.resumeContext(); // Ensure it's active if already initialized
        }
        
        // Enable control buttons
        document.getElementById('dropHarmonoidBtn').disabled = !this.audioManager.isInitialized; // Only enable if audio is ready
        document.getElementById('pitchUpBtn').disabled = false;
        document.getElementById('pitchDownBtn').disabled = false;
        document.getElementById('tempoUpBtn').disabled = false;
        document.getElementById('tempoDownBtn').disabled = false;
        document.getElementById('startBtn').textContent = 'Restart';
        
        this.updateStats();
    }

    handleDropHarmonoid() {
        if (!this.gameRunning || !this.audioManager.isInitialized) {
            console.warn("Game not running or audio not initialized. Cannot drop Harmonoid.");
            // Optionally, tell user to press Start
            if(!this.gameRunning) alert("Please start the game first!");
            else if(!this.audioManager.isInitialized) alert("Audio system not ready. Please ensure audio is enabled and try restarting.");
            return;
        }

        if (this.frameCount < this.lastDropFrame + this.dropCooldown) {
            // console.log("Drop on cooldown"); // Can provide UI feedback
            return;
        }

        this.audioManager.resumeContext().then(() => {
            this.spawnHarmonoid();
            this.lastDropFrame = this.frameCount;
            if (this.playDropSoundEffect) {
                this.audioManager.playDropSound();
            }
        }).catch(err => {
            console.error("Could not resume audio context for drop:", err);
        });
    }
    
    spawnHarmonoid() {
        const harmonoid = new Harmonoid(
            this.nextHarmonoidId++,
            this.level.startX,
            this.level.startY,
            this.harmonoidSpeed,
            // Random base frequency, e.g., A3 to A4 for more musical range
            220 + Math.random() * 220 // 220Hz (A3) to 440Hz (A4)
        );
        this.harmonoids.push(harmonoid);
        this.stats.total++;
        
        // Create audio for the harmonoid
        this.audioManager.createHarmonoidSound(harmonoid.id, harmonoid.frequency);
        this.updateStats();
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.frameCount++;
        
        // Spawn new harmonoids (REMOVED - Manual Spawn)
        // if (this.frameCount % this.harmonoidSpawnRate === 0) {
        //     this.spawnHarmonoid();
        // }
        
        // Update harmonoids
        for (let i = this.harmonoids.length - 1; i >= 0; i--) {
            const harmonoid = this.harmonoids[i];
            harmonoid.update(this.level);
            
            // Apply resonance field effects
            this.applyResonanceEffects(harmonoid);
            
            // Check dissonance zones
            this.checkDissonanceZones(harmonoid);
            
            // Check if harmonoid reached the end
            if (harmonoid.x > this.level.endX && Math.abs(harmonoid.y - this.level.endY) < harmonoid.radius * 2) {
                this.stats.saved++;
                this.audioManager.removeHarmonoidSound(harmonoid.id);
                this.harmonoids.splice(i, 1);
                // Remove from selection if selected
                const selectedIndex = this.selectedHarmonoids.indexOf(harmonoid);
                if (selectedIndex > -1) this.selectedHarmonoids.splice(selectedIndex, 1);
            }
            // Check if harmonoid fell off the screen
            else if (harmonoid.y > this.canvas.height + harmonoid.radius * 2) { // Give some margin
                this.stats.lost++;
                this.audioManager.removeHarmonoidSound(harmonoid.id);
                this.harmonoids.splice(i, 1);
                const selectedIndex = this.selectedHarmonoids.indexOf(harmonoid);
                if (selectedIndex > -1) this.selectedHarmonoids.splice(selectedIndex, 1);
            }
        }
        
        this.updateHarmonicGate();
        this.updateStats();
    }
    
    updateHarmonicGate() {
        const gate = this.level.harmonicGate;
        // Accurate check for Harmonoids *inside* the gate's bounding box
        const harmonoidsInGate = this.harmonoids.filter(h =>
            h.x + h.radius > gate.x && 
            h.x - h.radius < gate.x + gate.width &&
            h.y + h.radius > gate.y && 
            h.y - h.radius < gate.y + gate.height
        );
        
        const wasOpen = gate.isOpen;
        
        if (harmonoidsInGate.length >= 2) { // gate.requiredChord.length
            const frequencies = harmonoidsInGate.map(h => h.frequency);
            // Simple check: if we have frequencies close to ALL required chord tones
            let allTonesFound = true;
            for (const requiredFreq of gate.requiredChord) {
                if (!frequencies.some(f => Math.abs(f - requiredFreq) < 20)) { // 20Hz tolerance
                    allTonesFound = false;
                    break;
                }
            }
            gate.isOpen = allTonesFound;
        } else {
            gate.isOpen = false;
        }
        
        if (wasOpen !== gate.isOpen) {
            this.audioManager.playGateSound(gate.isOpen);
        }
    }
    
    applyResonanceEffects(harmonoid) {
        this.level.resonanceFields.forEach(field => {
            if (harmonoid.x >= field.x && harmonoid.x <= field.x + field.width &&
                harmonoid.y >= field.y && harmonoid.y <= field.y + field.height) {
                
                const frequencyDiff = Math.abs(harmonoid.frequency - field.frequency);
                if (frequencyDiff < 30) { 
                    const resonanceStrength = 1 - (frequencyDiff / 30);
                    if (field.effect === 'speed_boost') harmonoid.applySpeedBoost(resonanceStrength);
                    else if (field.effect === 'jump_boost') harmonoid.applyJumpBoost(resonanceStrength);
                }
            }
        });
    }
    
    checkDissonanceZones(harmonoid) {
        this.level.dissonanceZones.forEach(zone => {
            if (harmonoid.x >= zone.x && harmonoid.x <= zone.x + zone.width &&
                harmonoid.y >= zone.y && harmonoid.y <= zone.y + zone.height) {
                
                const harmonoidsInZone = this.harmonoids.filter(h =>
                    h.x >= zone.x && h.x <= zone.x + zone.width &&
                    h.y >= zone.y && h.y <= zone.y + zone.height
                );
                
                if (harmonoidsInZone.length > 1) {
                    const frequencies = harmonoidsInZone.map(h => h.frequency);
                    const dissonance = this.audioManager.calculateDissonance(frequencies);
                    
                    if (dissonance > zone.maxDissonance) {
                        harmonoidsInZone.forEach(h => h.applyDissonanceEffect(dissonance));
                    }
                }
            }
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.level) this.drawLevel(); // Ensure level exists
        this.harmonoids.forEach(harmonoid => harmonoid.render(this.ctx, this.selectedHarmonoids.includes(harmonoid)));
        if (this.selectionBox) this.drawSelectionBox();
    }
    
    drawLevel() {
        const ctx = this.ctx;
        
        this.level.platforms.forEach(platform => {
            const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
            gradient.addColorStop(0, '#A0522D'); gradient.addColorStop(1, '#8B4513');
            ctx.fillStyle = gradient;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.strokeStyle = '#654321'; ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00FF00'; ctx.shadowBlur = 15;
        ctx.fillStyle = '#00FF00'; ctx.fillRect(this.level.startX - 10, this.level.startY - 20, 20, 20);
        ctx.shadowBlur = 0; ctx.fillStyle = 'white'; ctx.font = '12px Arial';
        ctx.fillText('START', this.level.startX, this.level.startY - 25);
        
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 15; // Changed end to gold
        ctx.fillStyle = '#FFD700'; ctx.fillRect(this.level.endX - 10, this.level.endY - 20, 20, 20);
        ctx.shadowBlur = 0; ctx.fillStyle = 'white';
        ctx.fillText('END', this.level.endX, this.level.endY - 25);
        
        const gate = this.level.harmonicGate;
        ctx.fillStyle = gate.isOpen ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
        ctx.strokeStyle = gate.isOpen ? '#00FF00' : '#FF0000'; ctx.lineWidth = 2;
        ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
        ctx.fillStyle = 'white'; ctx.font = '10px Arial';
        ctx.fillText(gate.requiredChord.map(f => Math.round(f)).join('-') + 'Hz', gate.x + gate.width / 2, gate.y - 5);
        ctx.fillText(gate.isOpen ? 'OPEN' : 'CLOSED', gate.x + gate.width / 2, gate.y + gate.height + 15);
        
        this.level.resonanceFields.forEach(field => {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; ctx.fillRect(field.x, field.y, field.width, field.height);
            ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2; ctx.strokeRect(field.x, field.y, field.width, field.height);
            ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(field.frequency)}Hz`, field.x + field.width / 2, field.y + 20);
            ctx.font = '8px Arial';
            ctx.fillText(field.effect.replace('_', ' ').toUpperCase(), field.x + field.width / 2, field.y + field.height - 10);
        });
        
        this.level.dissonanceZones.forEach(zone => {
            ctx.fillStyle = 'rgba(255, 0, 127, 0.2)'; ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.strokeStyle = '#FF007F'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            ctx.setLineDash([]); ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
            ctx.fillText('DISSONANCE', zone.x + zone.width / 2, zone.y + zone.height / 2 + 5);
        });
        ctx.textAlign = 'left'; // Reset alignment
    }
    
    drawSelectionBox() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect( this.selectionBox.startX, this.selectionBox.startY,
            this.selectionBox.endX - this.selectionBox.startX,
            this.selectionBox.endY - this.selectionBox.startY );
        ctx.setLineDash([]);
    }
    
    handleCanvasClick(e) {
        if (this.isDragging && this.selectionBox && (Math.abs(this.selectionBox.startX - this.selectionBox.endX) > 5 || Math.abs(this.selectionBox.startY - this.selectionBox.endY) > 5)) {
            // If it was a drag, endSelection will handle it.
            return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedHarmonoid = this.harmonoids.find(h => 
            Math.sqrt((x - h.x)**2 + (y - h.y)**2) < h.radius + 2 // Slightly larger click radius
        );
        
        if (clickedHarmonoid) {
            if (e.shiftKey) { // Hold shift to add/remove from selection
                const index = this.selectedHarmonoids.indexOf(clickedHarmonoid);
                if (index > -1) this.selectedHarmonoids.splice(index, 1);
                else this.selectedHarmonoids.push(clickedHarmonoid);
            } else { // Single click replaces selection
                this.selectedHarmonoids = [clickedHarmonoid];
            }
            this.audioManager.playSelectionSound();
        } else {
             if(!e.shiftKey) this.selectedHarmonoids = []; // Clear selection if clicking empty space without shift
        }
        this.updateStats();
    }
    
    startSelection(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.selectionBox = {
            startX: e.clientX - rect.left, startY: e.clientY - rect.top,
            endX: e.clientX - rect.left, endY: e.clientY - rect.top
        };
        this.isDragging = true;
        this.dragJustFinished = false;
    }
    
    updateSelection(e) {
        if (!this.isDragging || !this.selectionBox) return;
        const rect = this.canvas.getBoundingClientRect();
        this.selectionBox.endX = e.clientX - rect.left;
        this.selectionBox.endY = e.clientY - rect.top;
    }
    
    endSelection(e) {
        if (!this.isDragging || !this.selectionBox) {
            this.isDragging = false;
            return;
        }
        this.isDragging = false;
        this.dragJustFinished = true; // Flag to help distinguish from a single click

        const minX = Math.min(this.selectionBox.startX, this.selectionBox.endX);
        const maxX = Math.max(this.selectionBox.startX, this.selectionBox.endX);
        const minY = Math.min(this.selectionBox.startY, this.selectionBox.endY);
        const maxY = Math.max(this.selectionBox.startY, this.selectionBox.endY);
        
        // Only perform marquee selection if the box is of a minimum size
        if (maxX - minX > 5 || maxY - minY > 5) {
            const newlySelected = this.harmonoids.filter(h =>
                h.x >= minX && h.x <= maxX && h.y >= minY && h.y <= maxY
            );
            if (e.shiftKey) { // Add to current selection
                newlySelected.forEach(h => {
                    if (!this.selectedHarmonoids.includes(h)) this.selectedHarmonoids.push(h);
                });
            } else { // Replace current selection
                 this.selectedHarmonoids = newlySelected;
            }
            if (newlySelected.length > 0) this.audioManager.playSelectionSound();
        } // else it was probably a click, handled by handleCanvasClick if it hit something
        
        this.selectionBox = null;
        this.updateStats();
         setTimeout(() => { this.dragJustFinished = false; }, 0); // Reset flag shortly after
    }
    
    adjustPitch(direction) {
        if (this.selectedHarmonoids.length === 0) return;
        this.selectedHarmonoids.forEach(harmonoid => {
            harmonoid.adjustPitch(direction * 10); // Adjust by ~1 semitone (can be more precise)
            this.audioManager.updateHarmonoidFrequency(harmonoid.id, harmonoid.frequency);
        });
        // Optional: sound for applying pitch shift ability
    }
    
    adjustTempo(change) {
        if (this.selectedHarmonoids.length === 0) return;
        this.selectedHarmonoids.forEach(harmonoid => {
            harmonoid.adjustTempo(change);
        });
        // Optional: sound for applying tempo change ability
    }
    
    toggleAudio() {
        const isEnabled = this.audioManager.toggleAudio();
        document.getElementById('audioToggleBtn').textContent = `Audio: ${isEnabled ? 'ON' : 'OFF'}`;
        // If audio is being turned off, ensure drop harmonoid button is disabled
        if (!isEnabled) {
            document.getElementById('dropHarmonoidBtn').disabled = true;
        } else if (this.gameRunning && this.audioManager.isInitialized) {
            // If audio is turned back ON, and game is running, re-enable drop button.
            document.getElementById('dropHarmonoidBtn').disabled = false;
        }
    }
    
    updateStats() {
        document.getElementById('harmonoidCount').textContent = this.stats.total;
        document.getElementById('savedCount').textContent = this.stats.saved;
        document.getElementById('lostCount').textContent = this.stats.lost;
        document.getElementById('selectedCount').textContent = this.selectedHarmonoids.length;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Harmonoid class
class Harmonoid {
    constructor(id, x, y, speed, frequency) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.baseSpeed = speed;
        this.frequency = frequency; // Current frequency
        this.baseFrequency = frequency; // Original frequency, useful for relative pitch shifts
        this.radius = 8;
        this.color = this.getColorFromFrequency(frequency);
        this.vx = speed; // Initial direction right
        this.vy = 0;
        this.onGround = false;
        this.gravity = 0.3;
        
        this.effectState = { type: null, timer: 0, strength: 0 }; // Simplified effect management
    }
    
    getColorFromFrequency(freq) {
        // Map frequency (e.g., 100Hz to 1000Hz) to hue (0 to 360)
        // A common musical range is A2 (110Hz) to A5 (880Hz)
        const minFreq = 110;
        const maxFreq = 880;
        const hue = Math.max(0, Math.min(360, ((freq - minFreq) / (maxFreq - minFreq)) * 300)); // Limit hue range
        return `hsl(${hue}, 80%, 60%)`;
    }
    
    update(level) {
        // Apply effects based on effectState
        let currentSpeed = this.speed;
        if (this.effectState.timer > 0) {
            this.effectState.timer--;
            if (this.effectState.type === 'speed_boost') {
                currentSpeed *= (1 + this.effectState.strength);
            } else if (this.effectState.type === 'dissonance') {
                currentSpeed *= (1 - Math.min(0.8, this.effectState.strength)); // Slow down, max 80%
                 if (Math.random() < this.effectState.strength * 0.05) { // Chance to reverse direction
                    this.vx = -this.vx;
                }
            }
            if (this.effectState.timer <= 0) this.effectState.type = null;
        }
        this.vx = (this.vx > 0 ? 1 : -1) * currentSpeed;


        // Apply gravity
        if (!this.onGround) {
            this.vy += this.gravity;
        } else {
            this.vy = 0; // Stop vertical movement if on ground
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Collision with platforms
        this.onGround = false;
        level.platforms.forEach(platform => {
            // Check for landing on top of platform
            if (this.x + this.radius > platform.x && this.x - this.radius < platform.x + platform.width && // Horizontal overlap
                this.y + this.radius >= platform.y && this.y + this.radius - this.vy <= platform.y) { // Vertical landing: current pos is on/below, prev pos was above
                this.y = platform.y - this.radius;
                this.vy = 0;
                this.onGround = true;
            }
        });
        
        // Check harmonic gate collision (block if closed)
        const gate = level.harmonicGate;
        if (!gate.isOpen &&
            this.x + this.radius > gate.x && this.x - this.radius < gate.x + gate.width &&
            this.y + this.radius > gate.y && this.y - this.radius < gate.y + gate.height) {
            // If moving towards the gate, bounce back.
            if ((this.vx > 0 && this.x < gate.x + gate.width/2) || (this.vx < 0 && this.x > gate.x + gate.width/2)) {
                 this.vx = -this.vx * 0.5; // Bounce with reduced speed
                 this.x += this.vx * 2; // Move slightly away to prevent sticking
            }
        }
        
        // Simple AI: turn around at edges of the first platform (main ground)
        if (this.onGround && (this.x - this.radius <= 0 || this.x + this.radius >= level.platforms[0].width)) {
            this.vx = -this.vx;
            this.x = Math.max(this.radius, Math.min(this.x, level.platforms[0].width - this.radius)); // Prevent going off-screen
        }
    }
    
    adjustPitch(changeInHz) { // Changed to absolute Hz change for easier musical steps
        this.frequency = Math.max(100, Math.min(1000, this.frequency + changeInHz));
        this.color = this.getColorFromFrequency(this.frequency);
    }
    
    adjustTempo(speedMultiplierChange) { // change is additive to baseSpeed e.g. 0.2 or -0.2
        this.speed = Math.max(0.2, Math.min(3, this.baseSpeed + speedMultiplierChange));
        // Note: vx will be updated in the main update loop based on currentSpeed.
        // if this method should change it instantly: this.vx = (this.vx > 0 ? 1 : -1) * this.speed;
    }

    _applyEffect(type, strength, duration) {
        this.effectState = { type, strength, timer: duration };
    }
    
    applySpeedBoost(strength) {
        this._applyEffect('speed_boost', strength, 60); // Effect for 60 frames (1 sec)
    }
    
    applyJumpBoost(strength) {
        if (this.onGround && this.effectState.type !== 'jump_boost') { // Prevent spamming jump
            this.vy = -Math.min(8, 3 + 5 * strength); // Jump velocity, max reasonable jump
            this.onGround = false; // Important: leave the ground
            this._applyEffect('jump_boost', strength, 10); // Short duration for jump state itself
        }
    }
    
    applyDissonanceEffect(dissonanceLevel) {
        this._applyEffect('dissonance', Math.min(1, dissonanceLevel), 120); // Dissonance for 2 secs
    }
    
    render(ctx, isSelected) {
        let currentFillColor = this.color;
        let shadowColor = null;

        if (this.effectState.timer > 0) {
            switch(this.effectState.type) {
                case 'speed_boost': currentFillColor = '#FFD700'; shadowColor = currentFillColor; break;
                case 'jump_boost': currentFillColor = '#32CD32'; shadowColor = currentFillColor; break; // Lime Green
                case 'dissonance': currentFillColor = '#DC143C'; shadowColor = currentFillColor; break; // Crimson
            }
        }
        
        if (shadowColor) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 10;
        }
        
        ctx.fillStyle = currentFillColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0; // Reset shadow
        
        if (isSelected) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw frequency indicator
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.roundRect(this.x - 15, this.y - this.radius - 20, 30, 12, 3); // using roundRect if available or simulate
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(this.frequency), this.x, this.y - this.radius - 11);
        ctx.textAlign = 'left'; // Reset alignment
    }
}
// Helper for roundRect if not natively supported (basic browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x+r, y);
        this.arcTo(x+w, y,   x+w, y+h, r);
        this.arcTo(x+w, y+h, x,   y+h, r);
        this.arcTo(x,   y+h, x,   y,   r);
        this.arcTo(x,   y,   x+w, y,   r);
        this.closePath();
        return this;
    }
}


// Initialize game when page loads
window.addEventListener('load', () => {
    new HarmonoidsGame();
});
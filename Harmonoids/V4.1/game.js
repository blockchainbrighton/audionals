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
        this.harmonoidSpawnRate = 60; // frames between spawns
        this.harmonoidSpeed = 1;
        this.frameCount = 0;
        this.nextHarmonoidId = 0;
        
        this.setupEventListeners();
        this.createLevel();
        this.gameLoop();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 100; // Leave space for UI
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 100;
        });
    }
    
    setupEventListeners() {
        // UI buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
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
        
        // Canvas click for selection
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // Canvas drag for selection
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
        this.level = {
            startX: 50,
            startY: this.canvas.height - 100,
            endX: this.canvas.width - 100,
            endY: this.canvas.height - 100,
            platforms: [
                { x: 0, y: this.canvas.height - 50, width: this.canvas.width, height: 50 },
                { x: 200, y: this.canvas.height - 150, width: 200, height: 20 },
                { x: 500, y: this.canvas.height - 200, width: 200, height: 20 },
                { x: 800, y: this.canvas.height - 150, width: 200, height: 20 }
            ],
            harmonicGate: {
                x: this.canvas.width / 2 - 25,
                y: this.canvas.height - 200,
                width: 50,
                height: 150,
                requiredChord: [440, 550], // A4 and C#5 (major third)
                isOpen: false
            },
            resonanceFields: [
                {
                    x: 300,
                    y: this.canvas.height - 120,
                    width: 100,
                    height: 60,
                    frequency: 440,
                    effect: 'speed_boost'
                },
                {
                    x: 700,
                    y: this.canvas.height - 120,
                    width: 100,
                    height: 60,
                    frequency: 660,
                    effect: 'jump_boost'
                }
            ],
            dissonanceZones: [
                {
                    x: 450,
                    y: this.canvas.height - 100,
                    width: 80,
                    height: 40,
                    maxDissonance: 0.5
                }
            ]
        };
    }
    
    startGame() {
        this.gameRunning = true;
        this.harmonoids = [];
        this.selectedHarmonoids = [];
        this.stats = { total: 0, saved: 0, lost: 0 };
        this.frameCount = 0;
        this.nextHarmonoidId = 0;
        
        // Initialize audio system (requires user interaction)
        this.audioManager.initialize();
        
        // Enable control buttons
        document.getElementById('pitchUpBtn').disabled = false;
        document.getElementById('pitchDownBtn').disabled = false;
        document.getElementById('tempoUpBtn').disabled = false;
        document.getElementById('tempoDownBtn').disabled = false;
        document.getElementById('startBtn').textContent = 'Restart';
        
        this.updateStats();
    }
    
    spawnHarmonoid() {
        const harmonoid = new Harmonoid(
            this.nextHarmonoidId++,
            this.level.startX,
            this.level.startY,
            this.harmonoidSpeed,
            440 + Math.random() * 220 // Random base frequency between 440-660 Hz
        );
        this.harmonoids.push(harmonoid);
        this.stats.total++;
        
        // Create audio for the harmonoid
        this.audioManager.createHarmonoidSound(harmonoid.id, harmonoid.frequency);
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.frameCount++;
        
        // Spawn new harmonoids
        if (this.frameCount % this.harmonoidSpawnRate === 0) {
            this.spawnHarmonoid();
        }
        
        // Update harmonoids
        for (let i = this.harmonoids.length - 1; i >= 0; i--) {
            const harmonoid = this.harmonoids[i];
            harmonoid.update(this.level);
            
            // Apply resonance field effects
            this.applyResonanceEffects(harmonoid);
            
            // Check dissonance zones
            this.checkDissonanceZones(harmonoid);
            
            // Check if harmonoid reached the end
            if (harmonoid.x > this.level.endX && harmonoid.y >= this.level.endY - 20) {
                this.harmonoids.splice(i, 1);
                this.stats.saved++;
                // Remove from selection if selected
                const selectedIndex = this.selectedHarmonoids.indexOf(harmonoid);
                if (selectedIndex > -1) {
                    this.selectedHarmonoids.splice(selectedIndex, 1);
                }
                // Remove audio
                this.audioManager.removeHarmonoidSound(harmonoid.id);
            }
            // Check if harmonoid fell off the screen
            else if (harmonoid.y > this.canvas.height) {
                this.harmonoids.splice(i, 1);
                this.stats.lost++;
                // Remove from selection if selected
                const selectedIndex = this.selectedHarmonoids.indexOf(harmonoid);
                if (selectedIndex > -1) {
                    this.selectedHarmonoids.splice(selectedIndex, 1);
                }
                // Remove audio
                this.audioManager.removeHarmonoidSound(harmonoid.id);
            }
        }
        
        // Check harmonic gate
        this.updateHarmonicGate();
        
        this.updateStats();
    }
    
    updateHarmonicGate() {
        const gate = this.level.harmonicGate;
        const nearbyHarmonoids = this.harmonoids.filter(h => 
            Math.abs(h.x - (gate.x + gate.width/2)) < 100 && 
            Math.abs(h.y - (gate.y + gate.height/2)) < 50
        );
        
        const wasOpen = gate.isOpen;
        
        if (nearbyHarmonoids.length >= 2) {
            const frequencies = nearbyHarmonoids.map(h => h.frequency);
            // Simple check: if we have frequencies close to the required chord
            const hasRequiredFreq1 = frequencies.some(f => Math.abs(f - gate.requiredChord[0]) < 20);
            const hasRequiredFreq2 = frequencies.some(f => Math.abs(f - gate.requiredChord[1]) < 20);
            gate.isOpen = hasRequiredFreq1 && hasRequiredFreq2;
        } else {
            gate.isOpen = false;
        }
        
        // Play sound if gate state changed
        if (wasOpen !== gate.isOpen) {
            this.audioManager.playGateSound(gate.isOpen);
        }
    }
    
    applyResonanceEffects(harmonoid) {
        this.level.resonanceFields.forEach(field => {
            // Check if harmonoid is in the resonance field
            if (harmonoid.x >= field.x && harmonoid.x <= field.x + field.width &&
                harmonoid.y >= field.y && harmonoid.y <= field.y + field.height) {
                
                // Check if harmonoid's frequency resonates with the field
                const frequencyDiff = Math.abs(harmonoid.frequency - field.frequency);
                if (frequencyDiff < 30) { // Within resonance range
                    const resonanceStrength = 1 - (frequencyDiff / 30);
                    
                    if (field.effect === 'speed_boost') {
                        harmonoid.applySpeedBoost(resonanceStrength);
                    } else if (field.effect === 'jump_boost') {
                        harmonoid.applyJumpBoost(resonanceStrength);
                    }
                }
            }
        });
    }
    
    checkDissonanceZones(harmonoid) {
        this.level.dissonanceZones.forEach(zone => {
            // Check if harmonoid is in the dissonance zone
            if (harmonoid.x >= zone.x && harmonoid.x <= zone.x + zone.width &&
                harmonoid.y >= zone.y && harmonoid.y <= zone.y + zone.height) {
                
                // Get all harmonoids in this zone
                const harmonoidsInZone = this.harmonoids.filter(h =>
                    h.x >= zone.x && h.x <= zone.x + zone.width &&
                    h.y >= zone.y && h.y <= zone.y + zone.height
                );
                
                if (harmonoidsInZone.length > 1) {
                    const frequencies = harmonoidsInZone.map(h => h.frequency);
                    const dissonance = this.audioManager.calculateDissonance(frequencies);
                    
                    if (dissonance > zone.maxDissonance) {
                        // Apply dissonance effect (slow down or confuse harmonoids)
                        harmonoidsInZone.forEach(h => {
                            h.applyDissonanceEffect(dissonance);
                        });
                    }
                }
            }
        });
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw level
        this.drawLevel();
        
        // Draw harmonoids
        this.harmonoids.forEach(harmonoid => {
            harmonoid.render(this.ctx, this.selectedHarmonoids.includes(harmonoid));
        });
        
        // Draw selection box if dragging
        if (this.selectionBox) {
            this.drawSelectionBox();
        }
    }
    
    drawLevel() {
        const ctx = this.ctx;
        
        // Draw platforms with gradient
        this.level.platforms.forEach(platform => {
            const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
            gradient.addColorStop(0, '#A0522D');
            gradient.addColorStop(1, '#8B4513');
            ctx.fillStyle = gradient;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Add platform border
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        // Draw start point with glow
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.level.startX - 10, this.level.startY - 20, 20, 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START', this.level.startX, this.level.startY - 25);
        
        // Draw end point with glow
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.level.endX - 10, this.level.endY - 20, 20, 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.fillText('END', this.level.endX, this.level.endY - 25);
        
        // Draw harmonic gate
        const gate = this.level.harmonicGate;
        ctx.fillStyle = gate.isOpen ? '#00FF00' : '#FF0000';
        ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText('GATE', gate.x + 10, gate.y - 5);
        ctx.fillText(gate.isOpen ? 'OPEN' : 'CLOSED', gate.x + 5, gate.y + gate.height + 15);
        
        // Draw resonance fields
        this.level.resonanceFields.forEach(field => {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.fillRect(field.x, field.y, field.width, field.height);
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(field.x, field.y, field.width, field.height);
            ctx.fillStyle = 'white';
            ctx.font = '8px Arial';
            ctx.fillText(`${field.frequency}Hz`, field.x + 5, field.y + 15);
            ctx.fillText(field.effect, field.x + 5, field.y + 25);
        });
        
        // Draw dissonance zones
        this.level.dissonanceZones.forEach(zone => {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            ctx.setLineDash([]);
            ctx.fillStyle = 'white';
            ctx.font = '8px Arial';
            ctx.fillText('DISSONANCE', zone.x + 5, zone.y + 15);
        });
    }
    
    drawSelectionBox() {
        if (!this.selectionBox) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            this.selectionBox.startX,
            this.selectionBox.startY,
            this.selectionBox.endX - this.selectionBox.startX,
            this.selectionBox.endY - this.selectionBox.startY
        );
        ctx.setLineDash([]);
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find harmonoid at click position
        const clickedHarmonoid = this.harmonoids.find(h => 
            x >= h.x - h.radius && x <= h.x + h.radius &&
            y >= h.y - h.radius && y <= h.y + h.radius
        );
        
        if (clickedHarmonoid) {
            // Toggle selection
            const index = this.selectedHarmonoids.indexOf(clickedHarmonoid);
            if (index > -1) {
                this.selectedHarmonoids.splice(index, 1);
            } else {
                this.selectedHarmonoids.push(clickedHarmonoid);
            }
            // Play selection sound
            this.audioManager.playSelectionSound();
        } else {
            // Clear selection if clicking empty space
            this.selectedHarmonoids = [];
        }
    }
    
    startSelection(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.selectionBox = {
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top
        };
        this.isDragging = true;
    }
    
    updateSelection(e) {
        if (!this.isDragging || !this.selectionBox) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.selectionBox.endX = e.clientX - rect.left;
        this.selectionBox.endY = e.clientY - rect.top;
    }
    
    endSelection(e) {
        if (!this.isDragging || !this.selectionBox) return;
        
        // Select harmonoids within selection box
        const minX = Math.min(this.selectionBox.startX, this.selectionBox.endX);
        const maxX = Math.max(this.selectionBox.startX, this.selectionBox.endX);
        const minY = Math.min(this.selectionBox.startY, this.selectionBox.endY);
        const maxY = Math.max(this.selectionBox.startY, this.selectionBox.endY);
        
        this.selectedHarmonoids = this.harmonoids.filter(h =>
            h.x >= minX && h.x <= maxX && h.y >= minY && h.y <= maxY
        );
        
        this.selectionBox = null;
        this.isDragging = false;
    }
    
    adjustPitch(direction) {
        this.selectedHarmonoids.forEach(harmonoid => {
            harmonoid.adjustPitch(direction * 50); // Adjust by 50 Hz
            // Update audio frequency
            this.audioManager.updateHarmonoidFrequency(harmonoid.id, harmonoid.frequency);
        });
    }
    
    adjustTempo(change) {
        this.selectedHarmonoids.forEach(harmonoid => {
            harmonoid.adjustTempo(change);
        });
    }
    
    resetHarmonoidEffects() {
        this.harmonoids.forEach(harmonoid => {
            harmonoid.resetEffects();
        });
    }
    
    toggleAudio() {
        const isEnabled = this.audioManager.toggleAudio();
        document.getElementById('audioToggleBtn').textContent = `Audio: ${isEnabled ? 'ON' : 'OFF'}`;
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
        this.frequency = frequency;
        this.baseFrequency = frequency;
        this.radius = 8;
        this.color = this.getColorFromFrequency(frequency);
        this.vx = speed;
        this.vy = 0;
        this.onGround = false;
        this.gravity = 0.3;
        
        // Effect states
        this.speedBoostActive = false;
        this.jumpBoostActive = false;
        this.dissonanceEffect = 0;
        this.effectTimer = 0;
    }
    
    getColorFromFrequency(freq) {
        // Map frequency to color (simple hue mapping)
        const hue = ((freq - 220) / 440) * 360;
        return `hsl(${hue % 360}, 70%, 60%)`;
    }
    
    update(level) {
        // Decay effects over time
        if (this.effectTimer > 0) {
            this.effectTimer--;
            if (this.effectTimer <= 0) {
                this.speedBoostActive = false;
                this.jumpBoostActive = false;
                this.dissonanceEffect = 0;
            }
        }
        
        // Apply gravity
        if (!this.onGround) {
            this.vy += this.gravity;
        }
        
        // Apply dissonance effect (confusion)
        if (this.dissonanceEffect > 0) {
            // Random direction changes due to dissonance
            if (Math.random() < this.dissonanceEffect * 0.1) {
                this.vx = -this.vx;
            }
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Collision with platforms
        this.onGround = false;
        level.platforms.forEach(platform => {
            if (this.x >= platform.x && this.x <= platform.x + platform.width &&
                this.y + this.radius >= platform.y && this.y + this.radius <= platform.y + platform.height + 10) {
                this.y = platform.y - this.radius;
                this.vy = 0;
                this.onGround = true;
            }
        });
        
        // Check harmonic gate collision
        const gate = level.harmonicGate;
        if (!gate.isOpen &&
            this.x + this.radius >= gate.x && this.x - this.radius <= gate.x + gate.width &&
            this.y + this.radius >= gate.y && this.y - this.radius <= gate.y + gate.height) {
            // Bounce back from closed gate
            this.vx = -Math.abs(this.vx) * 0.5;
        }
        
        // Simple AI: turn around at edges or obstacles
        if (this.x <= 0 || this.x >= level.platforms[0].width) {
            this.vx = -this.vx;
        }
    }
    
    adjustPitch(change) {
        this.frequency = Math.max(100, Math.min(1000, this.frequency + change));
        this.color = this.getColorFromFrequency(this.frequency);
    }
    
    adjustTempo(change) {
        this.speed = Math.max(0.1, Math.min(3, this.baseSpeed + change));
        this.vx = this.vx > 0 ? this.speed : -this.speed;
    }
    
    applySpeedBoost(strength) {
        this.speedBoostActive = true;
        this.effectTimer = 60; // Effect lasts for 60 frames
        const boostMultiplier = 1 + strength;
        this.vx = this.vx > 0 ? this.speed * boostMultiplier : -this.speed * boostMultiplier;
    }
    
    applyJumpBoost(strength) {
        if (this.onGround && !this.jumpBoostActive) {
            this.jumpBoostActive = true;
            this.effectTimer = 30;
            this.vy = -5 * strength; // Jump with strength-based velocity
        }
    }
    
    applyDissonanceEffect(dissonanceLevel) {
        this.dissonanceEffect = Math.min(1, dissonanceLevel);
        this.effectTimer = 120; // Effect lasts longer
    }
    
    resetEffects() {
        this.speedBoostActive = false;
        this.jumpBoostActive = false;
        this.dissonanceEffect = 0;
        this.effectTimer = 0;
        this.vx = this.vx > 0 ? this.speed : -this.speed;
    }
    
    render(ctx, isSelected) {
        // Draw harmonoid
        let fillColor = this.color;
        
        // Modify color based on active effects
        if (this.speedBoostActive) {
            fillColor = '#FFD700'; // Gold for speed boost
        } else if (this.jumpBoostActive) {
            fillColor = '#00FF00'; // Green for jump boost
        } else if (this.dissonanceEffect > 0) {
            fillColor = '#FF0000'; // Red for dissonance
        }
        
        // Add glow effect for active effects
        if (this.speedBoostActive || this.jumpBoostActive || this.dissonanceEffect > 0) {
            ctx.shadowColor = fillColor;
            ctx.shadowBlur = 10;
        }
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw selection indicator
        if (isSelected) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw frequency indicator with better styling
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - 15, this.y - this.radius - 20, 30, 12);
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(this.frequency), this.x, this.y - this.radius - 10);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new HarmonoidsGame();
});


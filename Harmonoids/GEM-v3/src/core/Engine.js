import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

import { Renderer } from './Renderer.js';
import { Physics } from './Physics.js';
import { Input } from './Input.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { MusicLogic } from '../audio/MusicLogic.js';
import { HUD } from '../ui/HUD.js';
import { Harmonoid } from '../entities/Harmonoid.js';
import { Bassoid } from '../entities/Bassoids.js';
import { Glissoid } from '../entities/Glissoids.js';
import { Percussoid } from '../entities/Percussoids.js';
import { Droneoid } from '../entities/Droneoids.js';
import { HarmonicGate } from '../mechanics/Gates.js';
import { DissonanceZone } from '../mechanics/DissonanceZone.js';
import { ResonanceField } from '../mechanics/ResonanceField.js';
import { FrequencyBridge, AmplitudeFan, PhaseShiftPortal, EchoChamber, GenericPlatform, ExitZone, StartZone, Obstacle } from '../mechanics/EnvObjects.js';

/**
 * @typedef {'pending' | 'playing' | 'paused' | 'levelComplete' | 'gameOver'} GameState
 */

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const LEVEL_URL = '/levels/level01.json'; // Path relative to root

class Engine {
    /** @type {Renderer} */
    renderer;
    /** @type {Physics} */
    physics;
    /** @type {Input} */
    input;
    /** @type {AudioEngine} */
    audioEngine;
    /** @type {MusicLogic} */
    musicLogic;
    /** @type {HUD} */
    hud;

    /** @type {GameState} */
    gameState = 'pending';
    /** @type {object | null} */
    currentLevelData = null;
    /** @type {Harmonoid[]} */
    harmonoids = [];
    /** @type {any[]} */
    environmentalObjects = [];
    /** @type {Harmonoid | null} */
    selectedHarmonoid = null;
    /** @type {Harmonoid[]} */
    selectedHarmonoids = [];


    gameTime = 0;
    tempo = 1.0; // Game speed multiplier
    
    // Game mode
    /** @type {'procession' | 'manual_drop'} */
    gameMode = 'procession';
    processionSpawnTimer = 0;
    processionSpawnIndex = 0;

    // Stats
    savedCount = 0;
    lostCount = 0;
    totalSpawned = 0;
    requiredToSavePercentage = 0.5; // Default, can be overridden by level

    // Player musical actions resources
    resonanceFieldsLeft = 3;
    maxResonanceFields = 3;

    constructor() {
        this.renderer = new Renderer(GAME_WIDTH, GAME_HEIGHT, document.getElementById('game-canvas'));
        this.physics = new Physics();
        this.audioEngine = new AudioEngine();
        this.musicLogic = new MusicLogic(this.audioEngine);
        this.input = new Input(this.renderer.app.view, this);
        this.hud = new HUD(this);

        this.physics.world.gravity.y = 1; // Standard gravity

        // Load shared puzzle from URL hash if present
        if (window.location.hash && window.location.hash.length > 1) {
            try {
                const decodedJson = atob(window.location.hash.substring(1));
                this.currentLevelData = JSON.parse(decodedJson);
                console.log("Loaded level from URL hash.");
            } catch (e) {
                console.error("Failed to load level from URL hash, falling back to default:", e);
                this.loadLevel(LEVEL_URL);
            }
        } else {
            this.loadLevel(LEVEL_URL);
        }

        // Collision handling
        Matter.Events.on(this.physics.engine, 'collisionStart', this.handleCollisions.bind(this));

        // Set initial tempo for display
        this.hud.updateTempoDisplay(this.tempo);

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    async loadLevel(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load level: ${response.statusText}`);
            this.currentLevelData = await response.json();
            this.setupLevel();
        } catch (error) {
            console.error("Error loading level:", error);
            // TODO: Display error to user
        }
    }

    setupLevel() {
        if (!this.currentLevelData) return;

        this.cleanupLevel(); // Clear previous level objects

        this.musicLogic.setKey(this.currentLevelData.key || 'C', this.currentLevelData.mode || 'major');
        this.requiredToSavePercentage = this.currentLevelData.rescueTargetPercentage || 0.5;

        // Setup static environment objects
        this.currentLevelData.platforms?.forEach(p => {
            const platform = new GenericPlatform(this, p.x, p.y, p.width, p.height, p.isStatic !== false, p.options);
            this.environmentalObjects.push(platform);
        });

        this.currentLevelData.harmonicGates?.forEach(g => {
            const gate = new HarmonicGate(this, g.x, g.y, g.width, g.height, g.requiredChordNotes, g.options);
            this.environmentalObjects.push(gate);
            this.hud.updateGateChordDisplay(gate.requiredNotes);
        });

        this.currentLevelData.dissonanceZones?.forEach(z => {
            const zone = new DissonanceZone(this, z.x, z.y, z.width, z.height, z.options);
            this.environmentalObjects.push(zone);
        });

        this.currentLevelData.frequencyBridges?.forEach(b => {
            const bridge = new FrequencyBridge(this, b.x, b.y, b.width, b.height, b.requiredTriad, b.options);
            this.environmentalObjects.push(bridge);
        });
        
        this.currentLevelData.amplitudeFans?.forEach(f => {
            const fan = new AmplitudeFan(this, f.x, f.y, f.width, f.height, f.liftForce, f.options);
            this.environmentalObjects.push(fan);
        });

        this.currentLevelData.phaseShiftPortals?.forEach(p => {
            const portalA = this.environmentalObjects.find(obj => obj.id === p.portalAId);
            const portalB = this.environmentalObjects.find(obj => obj.id === p.portalBId);

            if (!portalA) {
                 const portal = new PhaseShiftPortal(this, p.portalA.x, p.portalA.y, p.portalA.width, p.portalA.height, p.id + '_A', p.teleportTargetFrequency, p.portalA.options);
                 this.environmentalObjects.push(portal);
            }
            if (!portalB) {
                 const portal = new PhaseShiftPortal(this, p.portalB.x, p.portalB.y, p.portalB.width, p.portalB.height, p.id + '_B', p.teleportTargetFrequency, p.portalB.options);
                 this.environmentalObjects.push(portal);
            }
            // Link portals (This logic assumes portals are created based on this config. Need to be careful here)
            // This example linking logic needs refinement or portal creation must create both pair.
            // For now, portals find their pair by looking for another portal with matching teleportTargetFrequency.
        });
        
        this.currentLevelData.echoChambers?.forEach(e => {
            const chamber = new EchoChamber(this, e.x, e.y, e.width, e.height, e.delayTime, e.feedback, e.options);
            this.environmentalObjects.push(chamber);
        });

        this.currentLevelData.obstacles?.forEach(o => {
            const obstacle = new Obstacle(this, o.x, o.y, o.width, o.height, o.type, o.options);
            this.environmentalObjects.push(obstacle);
        });
        
        // Start and Exit zones
        const startData = this.currentLevelData.startZone;
        if(startData) {
            const startZone = new StartZone(this, startData.x, startData.y, startData.width, startData.height);
            this.environmentalObjects.push(startZone);
            this.defaultSpawnPosition = { x: startData.x + startData.width / 2, y: startData.y + startData.height / 2 };
        } else {
            this.defaultSpawnPosition = {x: 50, y: 50}; // Fallback
        }


        const exitData = this.currentLevelData.exitZone;
        if(exitData) {
            const exitZone = new ExitZone(this, exitData.x, exitData.y, exitData.width, exitData.height);
            this.environmentalObjects.push(exitZone);
        }

        this.resetGameState();
        console.log("Level setup complete.");
        this.hud.updateResonanceFieldsLeft(this.resonanceFieldsLeft);
    }

    cleanupLevel() {
        this.harmonoids.forEach(h => h.destroy());
        this.harmonoids = [];
        this.environmentalObjects.forEach(obj => obj.destroy?.());
        this.environmentalObjects = [];
        // Additional cleanup (renderer, physics specific if needed)
        this.renderer.clear();
        this.physics.clear();
        this.audioEngine.stopAllSounds();
    }


    resetGameState() {
        this.savedCount = 0;
        this.lostCount = 0;
        this.totalSpawned = 0;
        this.processionSpawnIndex = 0;
        this.processionSpawnTimer = 0;
        this.resonanceFieldsLeft = this.maxResonanceFields; // Reset resonance fields
        this.hud.updateStats(this.savedCount, this.lostCount, this.totalSpawned, this.selectedHarmonoids.length);
        this.hud.updateResonanceFieldsLeft(this.resonanceFieldsLeft);
        this.hud.updateGateChordDisplay(this.environmentalObjects.find(o => o instanceof HarmonicGate)?.requiredNotes || []);
        
        // Ensure walls are created for every level load
        this.createBounds();
    }

    createBounds() {
        const thickness = 50;
        this.physics.addStaticBody(-thickness / 2, GAME_HEIGHT / 2, thickness, GAME_HEIGHT); // Left wall
        this.physics.addStaticBody(GAME_WIDTH + thickness / 2, GAME_HEIGHT / 2, thickness, GAME_HEIGHT); // Right wall
        this.physics.addStaticBody(GAME_WIDTH / 2, -thickness / 2, GAME_WIDTH + thickness*2, thickness); // Top wall (optional, often Harmonoids fall from top)
        this.physics.addStaticBody(GAME_WIDTH / 2, GAME_HEIGHT + thickness / 2, GAME_WIDTH + thickness*2, thickness); // Bottom floor / kill zone
    }

    startGame() {
        if (this.gameState === 'playing') return;
        this.gameState = 'playing';
        this.hud.setButtonState('start-pause-button', 'Pause');
        this.audioEngine.start(); // Ensure AudioContext is running
        console.log("Game started");
    }

    pauseGame() {
        if (this.gameState !== 'playing') return;
        this.gameState = 'paused';
        this.hud.setButtonState('start-pause-button', 'Resume');
        this.audioEngine.suspend();
        console.log("Game paused");
    }

    resumeGame() {
        if (this.gameState !== 'paused') return;
        this.gameState = 'playing';
        this.hud.setButtonState('start-pause-button', 'Pause');
        this.audioEngine.resume();
        console.log("Game resumed");
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        } else if (this.gameState === 'pending' || this.gameState === 'levelComplete' || this.gameState === 'gameOver') {
            this.startGame();
            if (this.gameState === 'levelComplete' || this.gameState === 'gameOver') {
                 if(this.currentLevelData) this.setupLevel(); // Reload current level data.
                 else this.loadLevel(LEVEL_URL); // Or load default.
            }
        }
    }
    
    toggleGameMode() {
        if (this.gameMode === 'procession') {
            this.gameMode = 'manual_drop';
            this.hud.setButtonState('mode-toggle-button', 'Mode: Manual Drop');
            this.hud.setButtonEnabled('manual-drop-button', true);
        } else {
            this.gameMode = 'procession';
            this.hud.setButtonState('mode-toggle-button', 'Mode: Procession');
            this.hud.setButtonEnabled('manual-drop-button', false);
        }
    }

    /**
     * @param {number} [x]
     * @param {number} [y]
     * @param {string} [type]
     */
    spawnHarmonoid(x, y, type = 'standard') {
        if (this.harmonoids.length >= 128) { // Max audio nodes limit
            console.warn("Max Harmonoid limit reached. Cannot spawn more.");
            return;
        }
        const spawnPos = {
            x: x ?? this.defaultSpawnPosition.x,
            y: y ?? this.defaultSpawnPosition.y,
        };

        let harmonoid;
        const harmonoidId = `h_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
        switch(type.toLowerCase()) {
            case 'bassoid': harmonoid = new Bassoid(this, harmonoidId, spawnPos.x, spawnPos.y); break;
            case 'glissoid': harmonoid = new Glissoid(this, harmonoidId, spawnPos.x, spawnPos.y); break;
            case 'percussoid': harmonoid = new Percussoid(this, harmonoidId, spawnPos.x, spawnPos.y); break;
            case 'droneoid': harmonoid = new Droneoid(this, harmonoidId, spawnPos.x, spawnPos.y); break;
            default: harmonoid = new Harmonoid(this, harmonoidId, spawnPos.x, spawnPos.y); break;
        }
        
        this.harmonoids.push(harmonoid);
        this.totalSpawned++;
        this.hud.updateStats(this.savedCount, this.lostCount, this.totalSpawned, this.selectedHarmonoids.length);
        // console.log(`Spawned ${type} Harmonoid at ${spawnPos.x}, ${spawnPos.y}`);
    }

    handleProcessionSpawning(deltaTime) {
        if (this.gameMode !== 'procession' || !this.currentLevelData?.processionSpawns) return;

        const spawns = this.currentLevelData.processionSpawns;
        if (this.processionSpawnIndex >= spawns.length) return; // All spawned

        this.processionSpawnTimer += deltaTime;
        const nextSpawn = spawns[this.processionSpawnIndex];

        if (this.processionSpawnTimer >= nextSpawn.time) {
            this.spawnHarmonoid(
                nextSpawn.x || this.defaultSpawnPosition.x, 
                nextSpawn.y || this.defaultSpawnPosition.y, 
                nextSpawn.type
            );
            this.processionSpawnIndex++;
            // Do not reset timer to 0 here, instead subtract the time of the event,
            // or reset and assume deltaTime is small enough that overshooting is fine.
            // For simplicity with variable deltaTimes, we'll just move to next if time is met.
        }
    }

    /**
     * @param {Harmonoid} harmonoid
     */
    harmonoidSaved(harmonoid) {
        this.savedCount++;
        this.removeHarmonoid(harmonoid);
        this.checkLevelEndConditions();
    }

    /**
     * @param {Harmonoid} harmonoid
     */
    harmonoidLost(harmonoid) {
        this.lostCount++;
        this.removeHarmonoid(harmonoid);
        this.checkLevelEndConditions();
    }
    
    /**
     * @param {Harmonoid} harmonoid
     */
    removeHarmonoid(harmonoid) {
        harmonoid.destroy();
        this.harmonoids = this.harmonoids.filter(h => h !== harmonoid);
        this.selectedHarmonoids = this.selectedHarmonoids.filter(h => h !== harmonoid);
        if(this.selectedHarmonoid === harmonoid) this.selectedHarmonoid = null;

        this.hud.updateStats(this.savedCount, this.lostCount, this.totalSpawned, this.selectedHarmonoids.length);
        this.musicLogic.updateActiveHarmonoids(this.harmonoids);
    }


    checkLevelEndConditions() {
        if (this.processionSpawnIndex >= (this.currentLevelData?.processionSpawns?.length || 0) && this.harmonoids.length === 0) {
             // All spawned and all resolved (saved or lost)
            if (this.savedCount / this.totalSpawned >= this.requiredToSavePercentage) {
                this.gameState = 'levelComplete';
                console.log("Level Complete!");
                alert("Level Complete! Harmonics Earned: " + this.savedCount * 10);
                this.hud.setButtonState('start-pause-button', 'Next Level (Restart)');
            } else {
                this.gameState = 'gameOver';
                console.log("Game Over!");
                alert("Game Over. Not enough Harmonoids saved.");
                 this.hud.setButtonState('start-pause-button', 'Retry');
            }
        }
    }


    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.gameTime += deltaTime;
        const scaledDeltaTime = deltaTime * this.tempo;

        this.input.update(); // Process continuous inputs if any

        this.handleProcessionSpawning(scaledDeltaTime);

        // Update Harmonoids
        this.harmonoids.forEach(h => {
            h.update(scaledDeltaTime);
            // Basic boundary check / kill zone
            if (h.body.position.y > GAME_HEIGHT + 50 || h.body.position.y < -100 || h.body.position.x < -50 || h.body.position.x > GAME_WIDTH + 50) {
                console.log(`Harmonoid ${h.id} lost (out of bounds)`);
                this.harmonoidLost(h);
            }
        });

        // Update Environmental Objects
        this.environmentalObjects.forEach(obj => obj.update?.(scaledDeltaTime));
        
        // Update Physics
        this.physics.update(scaledDeltaTime);

        // Update Audio based on Harmonoids and MusicLogic
        this.musicLogic.updateActiveHarmonoids(this.harmonoids.filter(h => !h.isMuted));
        const harmonyScore = this.musicLogic.calculateOverallHarmony();
        this.audioEngine.setGlobalReverbMix(harmonyScore);
        // Potentially update background pads based on harmony score here
        
        // Check for interactions between Harmonoids and environmental objects
        // This could be through collision events or proximity checks
        this.checkInteractions();

        // Check game over/win conditions (could be tied to specific objectives)
        this.checkLevelEndConditions();
    }

    checkInteractions() {
        // Example: Dissonance Zones checking contained Harmonoids
        this.environmentalObjects.filter(obj => obj instanceof DissonanceZone).forEach(zone => {
            const harmonoidsInZone = this.harmonoids.filter(h => 
                Matter.Bounds.contains(zone.body.bounds, h.body.position) && !h.isMuted
            );
            zone.checkHarmonoids(harmonoidsInZone);
        });
         // Amplitude Fan check
        this.environmentalObjects.filter(obj => obj instanceof AmplitudeFan).forEach(fan => {
            const harmonoidsAboveFan = this.harmonoids.filter(h => {
                // AABB check for being "above" the fan's area
                return h.body.position.x >= fan.body.position.x - fan.width / 2 &&
                       h.body.position.x <= fan.body.position.x + fan.width / 2 &&
                       h.body.position.y < fan.body.position.y && // Above
                       h.body.position.y > fan.body.position.y - 200; // Within a certain height range
            });
           fan.applyLift(harmonoidsAboveFan);
        });

        // Echo Chamber checks
        this.environmentalObjects.filter(obj => obj instanceof EchoChamber).forEach(chamber => {
            const harmonoidsInChamber = this.harmonoids.filter(h => 
                Matter.Bounds.contains(chamber.body.bounds, h.body.position) && !h.isMuted && h.isPlayingSound
            );
            chamber.processHarmonoids(harmonoidsInChamber);
        });

        // Frequency Bridge Checks
        this.environmentalObjects.filter(obj => obj instanceof FrequencyBridge).forEach(bridge => {
            const harmonoidsOnBridge = this.harmonoids.filter(h => 
                this.physics.areBodiesTouching(h.body, bridge.platformBody) && !h.isMuted
            );
            bridge.checkHarmonoids(harmonoidsOnBridge);
        });
    }

    handleCollisions(event) {
        const pairs = event.pairs;
        pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            let harmonoid, object;
            
            if (bodyA.gameObject && bodyA.gameObject instanceof Harmonoid) {
                harmonoid = bodyA.gameObject;
                object = bodyB.gameObject;
            } else if (bodyB.gameObject && bodyB.gameObject instanceof Harmonoid) {
                harmonoid = bodyB.gameObject;
                object = bodyA.gameObject;
            }

            if (harmonoid && object) {
                // Harmonoid collided with an environmental object
                harmonoid.onCollision(object, pair);
                object.onCollision?.(harmonoid, pair); // if object has specific collision logic

                if (object instanceof ExitZone) {
                    this.harmonoidSaved(harmonoid);
                } else if (object instanceof HarmonicGate) {
                    // Gate will check overlapping harmonoids continuously, collision can be a trigger
                    object.checkHarmonoidsOnGate(); // Re-check when a new one touches
                } else if (object instanceof Obstacle && object.type === 'lowFreqPlate' && harmonoid instanceof Bassoid) {
                     // Bassoid might trigger its ability if it lands on or collides strongly with the plate
                     // Bassoid.activateAbility() might check collision context
                } else if (object.isRhythmPad && harmonoid instanceof Percussoid && pair.collision.normal.y < -0.5) { // Landing
                    harmonoid.landedOnRhythmPad(object);
                }

            } else if (bodyA.gameObject instanceof Harmonoid && bodyB.gameObject instanceof Harmonoid) {
                // Harmonoid collided with another Harmonoid
                bodyA.gameObject.onCollision(bodyB.gameObject, pair);
                bodyB.gameObject.onCollision(bodyA.gameObject, pair);
            } else if (bodyA.isKillZone || bodyB.isKillZone) { // Special property for bottom bounds or traps
                const h = bodyA.isKillZone ? bodyB.gameObject : bodyA.gameObject;
                if (h instanceof Harmonoid) this.harmonoidLost(h);
            }
        });
    }
    
    render() {
        this.renderer.clear(); // Not always needed if Pixi updates everything correctly

        // Render Environmental Objects first (background elements)
        this.environmentalObjects.forEach(obj => obj.render(this.renderer));
        
        // Render Harmonoids
        this.harmonoids.forEach(h => h.render(this.renderer));
        
        // Any other top-layer rendering (e.g. effects for Resonance Fields, if not part of objects themselves)
    }

    gameLoop(currentTime) {
        // Convert time to seconds
        const deltaTime = Math.min((currentTime - (this.lastTime || currentTime)) / 1000, 0.1); // Cap delta time
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    handleCanvasClick(x, y) {
        if (this.placingResonanceField) {
            this.placeResonanceFieldAt(x,y);
            this.placingResonanceField = false;
            this.hud.setButtonState('place-resonance-field-button', 'Place Resonance Field (R)');
            return;
        }

        // Try to select a Harmonoid
        const clickedHarmonoid = this.harmonoids.find(h => {
            // Simple AABB check against sprite, or use physics point query if sprites are irregular
            const bounds = h.sprite.getBounds();
            return x >= bounds.x && x <= bounds.x + bounds.width &&
                   y >= bounds.y && y <= bounds.y + bounds.height;
        });

        if (clickedHarmonoid) {
            if (this.input.isShiftDown) { // Multi-select with Shift
                if (this.selectedHarmonoids.includes(clickedHarmonoid)) {
                    this.selectedHarmonoids = this.selectedHarmonoids.filter(h => h !== clickedHarmonoid);
                } else {
                    this.selectedHarmonoids.push(clickedHarmonoid);
                }
            } else { // Single select
                this.selectedHarmonoids.forEach(h => h.setSelected(false));
                this.selectedHarmonoids = [clickedHarmonoid];
            }
            
            this.selectedHarmonoids.forEach(h => h.setSelected(true));
            this.selectedHarmonoid = this.selectedHarmonoids.length > 0 ? this.selectedHarmonoids[0] : null; // Keep track of the first selected one for single-target abilities
            console.log(`Selected ${this.selectedHarmonoids.length} Harmonoid(s).`);
        } else {
            // Clicked on empty space, deselect all
            this.selectedHarmonoids.forEach(h => h.setSelected(false));
            this.selectedHarmonoids = [];
            this.selectedHarmonoid = null;
            console.log("Deselected all Harmonoids.");
        }
        this.hud.updateStats(this.savedCount, this.lostCount, this.totalSpawned, this.selectedHarmonoids.length);
        this.hud.updateAbilitiesPanel(this.selectedHarmonoid);
    }
    
    // Player musical actions implementations
    applyToSelected(action) {
        if (this.selectedHarmonoids.length > 0) {
            this.selectedHarmonoids.forEach(h => action(h));
            this.musicLogic.updateActiveHarmonoids(this.harmonoids.filter(h => !h.isMuted)); // Re-calculate harmony
            if (this.selectedHarmonoid) this.hud.updateAbilitiesPanel(this.selectedHarmonoid);
        } else {
            console.warn("No Harmonoid selected for action.");
        }
    }

    pitchShiftSelected(semitones) { this.applyToSelected(h => h.changePitch(semitones)); }
    toggleMuteSelected() { this.applyToSelected(h => h.toggleMute()); }
    toggleSoloSelected() { 
        if(this.selectedHarmonoids.length > 0) {
            // If any selected are not soloed, solo all selected. Otherwise, unsolo all selected.
            const shouldSolo = this.selectedHarmonoids.some(h => !h.isSoloed);
            
            // First, unsolo ALL harmonoids if we are initiating a new solo group
            if (shouldSolo) {
                this.harmonoids.forEach(h => {
                    if (!this.selectedHarmonoids.includes(h)) h.unsoloImplicitly();
                });
            }
            
            this.selectedHarmonoids.forEach(h => {
                if (shouldSolo) h.solo();
                else h.unsolo();
            });
            this.musicLogic.updateActiveHarmonoids(this.harmonoids.filter(h => !h.isMuted));
            if (this.selectedHarmonoid) this.hud.updateAbilitiesPanel(this.selectedHarmonoid);
        }
    }
    setWaveformSelected(waveform) { this.applyToSelected(h => h.setWaveform(waveform)); }
    applyArpeggiatorSweep(value) { this.applyToSelected(h => h.setArpeggioOffset(value)); } // This is a temporary pitch offset based on slider

    changeTempo(delta) {
        this.tempo = Math.max(0.25, Math.min(4.0, this.tempo + delta));
        this.hud.updateTempoDisplay(this.tempo);
        console.log(`Tempo changed to: ${this.tempo}x`);
    }
    
    toggleQuantize() {
        this.musicLogic.toggleQuantize();
        this.hud.updateQuantizeButton(this.musicLogic.isQuantizeEnabled);
        console.log(`Rhythm Quantize: ${this.musicLogic.isQuantizeEnabled ? 'ON' : 'OFF'}`);
        // This would affect how Harmonoids start/stop sounds or align to a beat.
        // Implementation is more complex, might need a global beat clock.
        // For now, it's a conceptual toggle.
    }
    
    globalKeyChange(semitones) {
        this.musicLogic.shiftGlobalKey(semitones);
        this.harmonoids.forEach(h => {
            h.baseNote += semitones; // Adjust base note
            h.setFrequency(this.musicLogic.getFrequencyForNote(h.baseNote + h.pitchOffset + h.arpeggioOffset));
        });
        // Update gates' required notes display potentially
        console.log(`Global key changed by ${semitones} semitones.`);
        this.environmentalObjects.filter(o => o instanceof HarmonicGate).forEach(g => this.hud.updateGateChordDisplay(g.requiredNotes));
    }

    requestPlaceResonanceField() {
        if (this.resonanceFieldsLeft > 0) {
            this.placingResonanceField = true;
            this.hud.setButtonState('place-resonance-field-button', 'Placing... (Click on Map)');
            console.log("Ready to place Resonance Field. Click on game area.");
        } else {
            console.warn("No Resonance Fields left.");
        }
    }
    
    placeResonanceFieldAt(x, y) {
        if (this.resonanceFieldsLeft <= 0) return;

        const field = new ResonanceField(this, x, y, 150, 50); // Example size
        this.environmentalObjects.push(field);
        this.resonanceFieldsLeft--;
        this.hud.updateResonanceFieldsLeft(this.resonanceFieldsLeft);
        console.log(`Placed Resonance Field at ${x}, ${y}. Left: ${this.resonanceFieldsLeft}`);
    }

    // Accessibility Toggles
    toggleAssistMode() { 
        this.assistMode = !this.assistMode; 
        this.hud.setButtonState('assist-mode-toggle', `Assist Mode: ${this.assistMode ? 'ON' : 'OFF'}`);
        if (this.assistMode) this.changeTempo(-0.25); // Example: slow down game by 25%
        else this.changeTempo( (1.0 / (this.tempo / (this.tempo+0.25))) - this.tempo  ); // Needs correct reversion
        // This is a very basic assist. A real one would be more nuanced.
    }
    toggleColorblindPalette() { 
        this.colorblindMode = !this.colorblindMode;
        this.hud.setButtonState('colorblind-palette-toggle', `Colorblind: ${this.colorblindMode ? 'ON' : 'OFF'}`);
        // Renderer would need to use different color maps.
        this.renderer.setColorblindMode(this.colorblindMode);
        this.harmonoids.forEach(h => h.updateColor()); // Force color update
    }
    toggleAudioOnlyHighContrast() {
        this.audioHighContrast = !this.audioHighContrast;
        this.hud.setButtonState('audio-only-toggle', `Audio High Contrast: ${this.audioHighContrast ? 'ON' : 'OFF'}`);
        // This implies special visual cues for audio events, or simplifying visuals.
        // e.g. flash screen on important sound, stronger visual cues for frequencies if colors are hard to distinguish
        if (this.audioHighContrast) {
            this.renderer.setHighContrastMode(true);
        } else {
            this.renderer.setHighContrastMode(false);
        }
    }
}

// Initialize the game
window.gameEngine = new Engine();
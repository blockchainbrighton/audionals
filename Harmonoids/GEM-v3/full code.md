
<!-- /index.html -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Harmonoids: Symphony of Survival</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="src/ui/Panels.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <div id="ui-overlay">
            <div id="hud" class="panel">
                <button id="start-pause-button">Start</button>
                <button id="mode-toggle-button">Mode: Procession</button>
                <button id="manual-drop-button" disabled>Manual Drop</button>
                <div id="stats-display">
                    Saved: <span id="saved-count">0</span> |
                    Lost: <span id="lost-count">0</span> |
                    Total: <span id="total-count">0</span> |
                    Selected: <span id="selected-count">0</span>
                </div>
                <div id="gate-chord-display">Next Gate: <span id="chord-info">-</span></div>
            </div>

            <div id="abilities-panel" class="panel">
                <h4>Abilities (Selected)</h4>
                <button id="pitch-shift-up-button">Pitch Up (S)</button>
                <button id="pitch-shift-down-button">Pitch Down (A)</button>
                <button id="tempo-up-button">Tempo +</button>
                <button id="tempo-down-button">Tempo -</button>
                <button id="mute-button">Mute (M)</button>
                <button id="solo-button">Solo (O)</button>
                <div>
                    <label for="arpeggiator-slider">Arpeggiator:</label>
                    <input type="range" id="arpeggiator-slider" min="-12" max="12" value="0" step="1">
                    <span id="arpeggiator-value">0</span> st
                </div>
                <button id="quantize-toggle-button">Quantize: OFF</button>
                <div>
                    Waveform:
                    <select id="waveform-select">
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                        <option value="sawtooth">Sawtooth</option>
                    </select>
                </div>
                <button id="global-key-change-button">Global Key Change (+1 st)</button>
            </div>

            <div id="environment-panel" class="panel">
                <h4>Environment</h4>
                <button id="place-resonance-field-button">Place Resonance Field (R)</button>
                <span>Fields left: <span id="resonance-fields-left">3</span></span>
            </div>

            <div id="accessibility-panel" class="panel">
                <h4>Accessibility</h4>
                <button id="assist-mode-toggle">Assist Mode: OFF</button>
                <button id="colorblind-palette-toggle">Colorblind: OFF</button>
                <button id="audio-only-toggle">Audio High Contrast: OFF</button>
            </div>
        </div>
    </div>

    <script type="module" src="src/core/Engine.js"></script>
</body>
</html>
```

<!-- /style.css -->
```css
body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 0;
    background-color: #1a1a1a;
    color: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
}

#game-container {
    position: relative;
    border: 2px solid #444;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

#game-canvas {
    display: block;
}

#ui-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Allow clicks to pass through to canvas by default */
}
```

<!-- /src/core/Engine.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';
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
```

<!-- /src/core/Input.js -->
```javascript
export class Input {
    /** @type {HTMLElement} */
    targetElement;
    /** @type {import('./Engine.js').Engine} */
    engine;

    /** @type {Set<string>} */
    keysPressed = new Set();
    isShiftDown = false;
    isCtrlDown = false;
    isAltDown = false;

    /**
     * @param {HTMLCanvasElement} targetElement
     * @param {import('./Engine.js').Engine} gameEngine
     */
    constructor(targetElement, gameEngine) {
        this.targetElement = targetElement;
        this.engine = gameEngine;

        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events on canvas for selection / interaction
        this.targetElement.addEventListener('click', this.handleMouseClick.bind(this));
        // Add mousedown, mouseup, mousemove later if needed for dragging, etc.
    }

    /** @param {KeyboardEvent} event */
    handleKeyDown(event) {
        this.keysPressed.add(event.key.toLowerCase());
        this.isShiftDown = event.shiftKey;
        this.isCtrlDown = event.ctrlKey;
        this.isAltDown = event.altKey;

        // Hotkeys that are not tied to UI buttons (or can also be)
        switch (event.key.toLowerCase()) {
            case 'p':
                this.engine.togglePause();
                break;
            case 'r': // Place Resonance Field (if not placing)
                 if (!this.engine.placingResonanceField) this.engine.requestPlaceResonanceField();
                 break;
            // Harmonoid specific shortcuts tied to HUD for clarity.
            // A/S for pitch, M for Mute, O for Solo can be handled by HUD listeners for better UX.
            case 'a': 
                this.engine.pitchShiftSelected(-1);
                break;
            case 's':
                this.engine.pitchShiftSelected(1);
                break;
            case 'm':
                this.engine.toggleMuteSelected();
                break;
            case 'o': // 'o' for solo, like in DAWs
                this.engine.toggleSoloSelected();
                break;
        }
    }

    /** @param {KeyboardEvent} event */
    handleKeyUp(event) {
        this.keysPressed.delete(event.key.toLowerCase());
        this.isShiftDown = event.shiftKey;
        this.isCtrlDown = event.ctrlKey;
        this.isAltDown = event.altKey;
    }

    /** @param {MouseEvent} event */
    handleMouseClick(event) {
        const rect = this.targetElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.engine.handleCanvasClick(x, y);
    }
    
    update() {
        // For continuous key presses, if needed (e.g. holding a key to move camera)
        // This game concept doesn't immediately require it for core mechanics,
        // but useful for future expansions.
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.targetElement.removeEventListener('click', this.handleMouseClick);
    }
}
```

<!-- /src/core/Renderer.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';

export class Renderer {
    /** @type {PIXI.Application} */
    app;
    /** @type {PIXI.Container} */
    stage; // Main container for game objects

    colorblindMode = false;
    highContrastMode = false;

    // Color palettes
    // Standard: based on a rainbow spectrum or musical relationships
    // Colorblind: Use perceptually distinct colors, e.g., from viridis or cividis
    // Frequencies mapping to hue: C=0 (red), C#=30, D=60 ... B=330
    // Base HSL: S=100%, L=50%
    standardPalette = Array(12).fill(null).map((_, i) => `hsl(${i * 30}, 100%, 50%)`);
    // Example: Blue/Orange + varying lightness/shapes
    colorblindPalette = [ 
        '#0072B2', // Blue
        '#D55E00', // Orange
        '#009E73', // Greenish teal
        '#CC79A7', // Pinkish Purple
        '#F0E442', // Yellow
        '#56B4E9', // Sky Blue
        '#E69F00', // Vermillion (lighter orange)
        // Add more, potentially varying lightness or using symbols for very similar colors
        // For simplicity in demo, reuse some with slight variation or accept fewer unique visual tones
        '#0072B2', '#D55E00', '#009E73', '#CC79A7', '#F0E442' 
    ].slice(0,12); // ensure 12 distinct values


    /**
     * @param {number} width
     * @param {number} height
     * @param {HTMLCanvasElement} canvasElement
     */
    constructor(width, height, canvasElement) {
        this.app = new PIXI.Application();
        
        // IIFE to initialize Pixi app
        (async () => {
            await this.app.init({
                canvas: canvasElement,
                width: width,
                height: height,
                backgroundColor: 0x2c2c2c, // Dark grey background
                antialias: true,
                autoDensity: true, // Handles high-resolution displays
                resolution: window.devicePixelRatio || 1,
            });
        })();
        
        this.stage = this.app.stage;

        // Basic graphic styles to reuse
        this.graphicsCache = new Map();
    }

    /**
     * Gets a color based on a musical note index (0-11 for C to B) and current palette.
     * @param {number} noteIndex - 0 (C) to 11 (B).
     * @returns {PIXI.ColorSource} The color for the note.
     */
    getColorForNoteIndex(noteIndex) {
        const palette = this.colorblindMode ? this.colorblindPalette : this.standardPalette;
        const colorStr = palette[noteIndex % 12];
        return PIXI.Color.shared.setValue(colorStr).toNumber();
    }

    /**
     * Creates or retrieves a shared PIXI.Graphics object for simple shapes.
     * Helps reduce object creation for common visuals.
     * @param {string} key A unique key for the graphic type (e.g., "circle_red_10px")
     * @param {() => PIXI.Graphics} creationFunction Function to create the Graphics if not cached.
     * @returns {PIXI.Graphics}
     */
    getSharedGraphics(key, creationFunction) {
        if (!this.graphicsCache.has(key)) {
            this.graphicsCache.set(key, creationFunction());
        }
        return this.graphicsCache.get(key).clone(); // Clone for individual use if modifications are expected
                                                  // Or manage textures from a single Graphics object
    }

    /** @param {PIXI.DisplayObject} displayObject */
    add(displayObject) {
        this.stage.addChild(displayObject);
    }

    /** @param {PIXI.DisplayObject} displayObject */
    remove(displayObject) {
        if (displayObject && displayObject.parent) {
            displayObject.parent.removeChild(displayObject);
            displayObject.destroy(); // Destroy to free resources
        }
    }

    clear() {
        // This is usually not needed as Pixi handles updates.
        // If we were dynamically adding/removing ALL children each frame:
        // while(this.stage.children[0]) {
        //    this.stage.removeChild(this.stage.children[0]).destroy();
        // }
    }
    
    setColorblindMode(enabled) {
        this.colorblindMode = enabled;
        // Existing sprites would need to update their colors.
        // This could be done via an event or by iterating through game objects.
    }

    setHighContrastMode(enabled) {
        this.highContrastMode = enabled;
        // In high contrast, might change background, simplify shapes, add outlines.
        if (enabled) {
            this.app.renderer.background.color = 0x000000; // Black
            // Visuals within entities will need to adapt
        } else {
            this.app.renderer.background.color = 0x2c2c2c; // Default dark grey
        }
    }

    // Rendering loop is typically handled by Pixi's ticker or main game loop calling app.render()
    // But our engine calls it, so no need for app.ticker here.
}
```

<!-- /src/core/Physics.js -->
```javascript
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

export class Physics {
    /** @type {Matter.Engine} */
    engine;
    /** @type {Matter.World} */
    world;
    // Runner is not strictly needed if we manually call Engine.update in our game loop
    // /** @type {Matter.Runner} */
    // runner;

    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        // this.runner = Matter.Runner.create(); // Not using internal runner
        
        // Set default gravity, can be adjusted
        this.world.gravity.y = 1; 
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addStaticBody(x, y, width, height, options = {}) {
        const body = Matter.Bodies.rectangle(x, y, width, height, { ...options, isStatic: true });
        Matter.World.add(this.world, body);
        return body;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addCircularBody(x, y, radius, options = {}) {
        const body = Matter.Bodies.circle(x, y, radius, options);
        Matter.World.add(this.world, body);
        return body;
    }
    
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addRectangularBody(x, y, width, height, options = {}) {
        const body = Matter.Bodies.rectangle(x, y, width, height, options);
        Matter.World.add(this.world, body);
        return body;
    }
    

    /** @param {Matter.Body | Matter.Composite} bodyOrComposite */
    removeBody(bodyOrComposite) {
        Matter.World.remove(this.world, bodyOrComposite);
    }

    clear() {
        Matter.World.clear(this.world, false); // false to keep default constraints/composites
        Matter.Engine.clear(this.engine);
    }

    /** @param {number} deltaTime Sseconds */
    update(deltaTime) {
        // Matter.js uses milliseconds for its delta in Engine.update
        Matter.Engine.update(this.engine, deltaTime * 1000);
    }
    
    /**
     * Checks if two Matter.js bodies are currently touching (overlapping or in contact).
     * This is a simplified check often good enough for gameplay logic after collision events.
     * For precise contact points, use collision events.
     * @param {Matter.Body} bodyA
     * @param {Matter.Body} bodyB
     * @returns {boolean}
     */
    areBodiesTouching(bodyA, bodyB) {
        if (!bodyA || !bodyB) return false;
        const collisions = Matter.Query.collides(bodyA, [bodyB]);
        return collisions.length > 0;
    }

    /**
     * @param {Matter.Body} body
     * @param {Matter.Vector} force
     * @param {Matter.Vector} [point]
     */
    applyForce(body, force, point = body.position) {
        Matter.Body.applyForce(body, point, force);
    }

    /**
     * @param {Matter.Body} body
     * @param {Matter.Vector} velocity
     */
    setVelocity(body, velocity) {
        Matter.Body.setVelocity(body, velocity);
    }

    /**
     * @param {Matter.Body} body
     * @param {number} angle
     */
    setAngle(body, angle) {
        Matter.Body.setAngle(body, angle);
    }

    /**
     * @param {Matter.Body} body
     * @param {number} angularVelocity
     */
    setAngularVelocity(body, angularVelocity) {
        Matter.Body.setAngularVelocity(body, angularVelocity);
    }
}
```

<!-- /src/audio/AudioEngine.js -->
```javascript
const MAX_OSCILLATORS = 128; // Global limit

export class AudioEngine {
    /** @type {AudioContext | null} */
    audioContext = null;
    /** @type {GainNode | null} */
    masterGain = null;
    /** @type {ConvolverNode | null} */
    reverbNode = null;
    /** @type {GainNode | null} */
    reverbSendGain = null;
    /** @type {GainNode | null} */
    reverbWetGain = null;
    /** @type {GainNode | null} */
    reverbDryGain = null;
    
    /** @type {GainNode | null} */
    backgroundPadGain = null;
    /** @type {OscillatorNode | null} */
    padOsc1 = null;
    /** @type {OscillatorNode | null} */
    padOsc2 = null;

    /** @type {Map<string, {osc: OscillatorNode, gain: GainNode, type: OscillatorType, baseFreq: number, currentFreq: number,isPlaying: boolean, detuneOsc?: OscillatorNode }>} */
    activeOscillators = new Map();
    /** @type {Array<{osc: OscillatorNode, gain: GainNode, detuneOsc?: OscillatorNode}>} */
    oscillatorPool = []; // For simple pooling, not fully implemented for complexity

    constructor() {
        // Defer AudioContext creation until user interaction
    }

    async start() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume(); // Resume if suspended

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.audioContext.currentTime); // Default master volume
            
            // Setup Reverb
            this.reverbNode = this.audioContext.createConvolver();
            this.reverbSendGain = this.audioContext.createGain(); // For sending signals to reverb
            this.reverbDryGain = this.audioContext.createGain(); // For direct signal
            this.reverbWetGain = this.audioContext.createGain(); // For reverberated signal

            this.reverbSendGain.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbWetGain);
            
            this.reverbDryGain.connect(this.masterGain);
            this.reverbWetGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.setGlobalReverbMix(0.5); // Initial reverb mix (0 = dry, 1 = wet)
            this.loadImpulseResponseForReverb('/assets/impulse/default_reverb.wav'); // Placeholder path

            // Setup background pads (simple example)
            this.backgroundPadGain = this.audioContext.createGain();
            this.backgroundPadGain.gain.setValueAtTime(0.0, this.audioContext.currentTime); // Start muted
            this.backgroundPadGain.connect(this.masterGain);
            // this.setupBackgroundPads(); // Start them softly later based on harmony

            console.log("AudioEngine started.");
        } catch (e) {
            console.error("Failed to initialize AudioContext:", e);
            // Potentially show a message to the user that audio cannot be enabled.
        }
    }

    async loadImpulseResponseForReverb(url) {
        if (!this.audioContext || !this.reverbNode) return;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load impulse response');
            const arrayBuffer = await response.arrayBuffer();
            this.audioContext.decodeAudioData(arrayBuffer, 
                (buffer) => {
                    if (this.reverbNode) this.reverbNode.buffer = buffer;
                    console.log("Impulse response loaded for reverb.");
                },
                (e) => { console.error("Error decoding impulse response:", e); }
            );
        } catch (error) {
            console.warn("Could not load impulse response for reverb:", error.message, "Reverb will be dry.");
             // If impulse is not found or fails to load, reverb won't work as intended.
             // Fallback: Reverb node might pass through dry if buffer is null.
        }
    }
    
    setupBackgroundPads(baseFreq = 110) { // A2
        if (!this.audioContext || !this.backgroundPadGain) return;
        if(this.padOsc1 || this.padOsc2) {
            this.padOsc1.stop(); this.padOsc2.stop();
        }

        this.padOsc1 = this.audioContext.createOscillator();
        this.padOsc1.type = 'sine';
        this.padOsc1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        
        this.padOsc2 = this.audioContext.createOscillator();
        this.padOsc2.type = 'sine';
        this.padOsc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime); // Perfect fifth
        this.padOsc2.detune.setValueAtTime(5, this.audioContext.currentTime); // Slight detune

        const padFilter = this.audioContext.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(400, this.audioContext.currentTime);

        this.padOsc1.connect(padFilter);
        this.padOsc2.connect(padFilter);
        padFilter.connect(this.backgroundPadGain);

        this.padOsc1.start();
        this.padOsc2.start();
        this.backgroundPadGain.gain.setTargetAtTime(0.1, this.audioContext.currentTime, 0.5); // Fade in pads
    }


    /**
     * @param {number} mix - 0 (mostly dry) to 1 (mostly wet/darker reverb). Affects reverb parameters.
     */
    setGlobalReverbMix(mix) { // Mix is 0 (dissonant, darker reverb) to 1 (harmonious, lighter reverb)
        if (!this.audioContext || !this.reverbDryGain || !this.reverbWetGain) return;
        // This 'mix' is from harmony calculation where higher is better harmony.
        // For dissonance (low mix value), we want more wet/dark reverb.
        // For harmony (high mix value), we want less wet/brighter reverb.
        const wetLevel = (1 - mix) * 0.6; // Dissonance = more reverb (e.g. 0.6 when mix is 0)
        const dryLevel = 1.0; // Keep dry fairly constant or slightly reduced by wet.

        this.reverbWetGain.gain.setTargetAtTime(wetLevel, this.audioContext.currentTime, 0.1);
        this.reverbDryGain.gain.setTargetAtTime(dryLevel, this.audioContext.currentTime, 0.1);
        
        // Adjust background pad volume based on harmony
        if (this.backgroundPadGain) {
            const padVolume = mix * 0.15; // Harmonious = louder pads
             this.backgroundPadGain.gain.setTargetAtTime(padVolume, this.audioContext.currentTime, 0.5);
             if (mix > 0.6 && (!this.padOsc1 || !this.padOsc2)) {
                this.setupBackgroundPads(); // Start pads if good harmony achieved and not already playing
             } else if (mix < 0.3 && (this.padOsc1 || this.padOsc2)) {
                this.backgroundPadGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.5); // Fade out
                // Optionally stop oscillators after fadeout
             }
        }
    }


    /**
     * @param {string} id Unique ID for the sound source
     * @param {number} frequency
     * @param {OscillatorType} type
     * @param {number} initialVolume
     * @param {boolean} isPercussive
     * @param {boolean} useDetune Adds a second slightly detuned oscillator for richness
     */
    playSound(id, frequency, type = 'sine', initialVolume = 0.5, isPercussive = false, useDetune = false) {
        if (!this.audioContext || !this.reverbSendGain || this.activeOscillators.size >= MAX_OSCILLATORS) {
            if(this.activeOscillators.size >= MAX_OSCILLATORS) console.warn("Max oscillator count reached.");
            return;
        }
        if (this.activeOscillators.has(id)) {
            this.updateSound(id, frequency, type); // Just update if already playing
            return;
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        let detuneOsc = null;

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0, this.audioContext.currentTime); // Start silent

        osc.connect(gain);
        gain.connect(this.reverbSendGain); // Send to reverb
        gain.connect(this.reverbDryGain); // Send to dry path as well

        if (useDetune) {
            detuneOsc = this.audioContext.createOscillator();
            detuneOsc.type = type;
            detuneOsc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            detuneOsc.detune.setValueAtTime(5, this.audioContext.currentTime); // 5 cents detune
            detuneOsc.connect(gain);
            detuneOsc.start();
        }
        
        osc.start();

        if (isPercussive) {
            // Quick attack and decay for percussive sounds
            gain.gain.linearRampToValueAtTime(initialVolume, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2); // Fast decay
             // Schedule stop for percussive sounds to free up oscillator
            osc.stop(this.audioContext.currentTime + 0.3);
            if(detuneOsc) detuneOsc.stop(this.audioContext.currentTime + 0.3);
            osc.onended = () => { this.activeOscillators.delete(id); }; // Clean up map entry
        } else {
            // Smooth fade-in for sustained sounds
            gain.gain.linearRampToValueAtTime(initialVolume, this.audioContext.currentTime + 0.05);
        }
        
        this.activeOscillators.set(id, { osc, gain, type, baseFreq: frequency, currentFreq: frequency, isPlaying: true, detuneOsc });
    }

    /**
     * @param {string} id
     */
    stopSound(id) {
        if (!this.audioContext) return;
        const sound = this.activeOscillators.get(id);
        if (sound && sound.isPlaying) {
            sound.gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05); // Smooth fade-out
            sound.osc.stop(this.audioContext.currentTime + 0.1);
            if (sound.detuneOsc) sound.detuneOsc.stop(this.audioContext.currentTime + 0.1);
            sound.isPlaying = false; 
            // Remove from map once fully stopped, use onended event if available
            sound.osc.onended = () => {
                this.activeOscillators.delete(id);
                // console.log(`Oscillator ${id} stopped and removed.`);
            };
        }
    }

    stopAllSounds() {
        if (!this.audioContext) return;
        this.activeOscillators.forEach((sound, id) => {
            this.stopSound(id);
        });
        // Stop background pads if they are running
        if (this.padOsc1) this.padOsc1.stop();
        if (this.padOsc2) this.padOsc2.stop();
        this.padOsc1 = null; this.padOsc2 = null;
        if (this.backgroundPadGain) this.backgroundPadGain.gain.setValueAtTime(0, this.audioContext.currentTime);

        this.activeOscillators.clear();
    }


    /**
     * @param {string} id
     * @param {number} [frequency]
     * @param {OscillatorType} [type]
     * @param {number} [volume]
     */
    updateSound(id, frequency, type, volume) {
        if (!this.audioContext) return;
        const sound = this.activeOscillators.get(id);
        if (sound && sound.isPlaying) {
            if (frequency !== undefined) {
                sound.osc.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.01); // Smooth transition for pitch
                if(sound.detuneOsc) sound.detuneOsc.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.01);
                sound.currentFreq = frequency;
            }
            if (type !== undefined && sound.type !== type) {
                sound.osc.type = type;
                if(sound.detuneOsc) sound.detuneOsc.type = type;
                sound.type = type;
            }
            if (volume !== undefined) {
                sound.gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.02);
            }
        }
    }

    suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
            console.log("AudioContext suspended.");
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            console.log("AudioContext resumed.");
        }
    }
}
```

<!-- /src/audio/MusicLogic.js -->
```javascript
// A4 frequency
export const A4_HZ = 440;
// Note names
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Basic interval consonance/dissonance scoring (simplified)
 * Key: semitone difference, Value: score (higher is more consonant)
 * These are subjective and simplified.
 */
const INTERVAL_SCORES = {
    0: 10, // Unison
    1: 1,  // Minor Second (Dissonant)
    2: 5,  // Major Second
    3: 7,  // Minor Third
    4: 8,  // Major Third
    5: 9,  // Perfect Fourth
    6: 2,  // Tritone (Dissonant)
    7: 10, // Perfect Fifth
    8: 7,  // Minor Sixth
    9: 8,  // Major Sixth
    10: 4, // Minor Seventh
    11: 6, // Major Seventh
    12: 10 // Octave
};

export class MusicLogic {
    /** @type {import('./AudioEngine.js').AudioEngine} */
    audioEngine;
    /** @type {import('../entities/Harmonoid.js').Harmonoid[]} */
    activeHarmonoids = [];

    globalKeyRootNote = 60; // MIDI C4
    currentKey = 'C';
    currentMode = 'major'; // major, minor, etc. (conceptual for now)
    
    isQuantizeEnabled = false; // Rhythm quantization state

    /**
     * @param {import('./AudioEngine.js').AudioEngine} audioEngine
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
    }
    
    /**
     * Converts a MIDI note number to frequency.
     * @param {number} midiNote MIDI note number (A4 = 69)
     * @returns {number} Frequency in Hz
     */
    midiToFrequency(midiNote) {
        return A4_HZ * Math.pow(2, (midiNote - 69) / 12);
    }

    /**
     * Gets frequency for a note relative to the current global key.
     * Example: note 0 is root, note 7 is a perfect fifth above root.
     * @param {number} noteOffsetInSemitones Number of semitones from the current global key's root.
     * @returns {number} Frequency in Hz
     */
    getFrequencyForNote(noteOffsetInSemitones) {
        return this.midiToFrequency(this.globalKeyRootNote + noteOffsetInSemitones);
    }
    
    /**
     * Get note name from MIDI number.
     * @param {number} midiNote
     * @returns {string}
     */
    getNoteName(midiNote) {
        const noteIndex = midiNote % 12;
        const octave = Math.floor(midiNote / 12) - 1; // MIDI C0 is octave -1 for standard C4 convention
        return NOTE_NAMES[noteIndex] + octave;
    }

    /**
     * Converts frequency to the closest MIDI note number.
     * @param {number} frequency Frequency in Hz.
     * @returns {number} MIDI note number.
     */
    frequencyToMidi(frequency) {
        return Math.round(12 * Math.log2(frequency / A4_HZ) + 69);
    }


    /**
     * @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoids
     */
    updateActiveHarmonoids(harmonoids) {
        this.activeHarmonoids = harmonoids.filter(h => h.isPlayingSound && !h.isMuted);
    }

    /**
     * Calculates an overall harmony score based on active harmonoids' frequencies.
     * Score: 0 (max dissonance) to 1 (max consonance/harmony).
     * @returns {number} Harmony score.
     */
    calculateOverallHarmony() {
        if (this.activeHarmonoids.length < 2) {
            return 0.75; // Neutral or slightly positive if solo or few
        }

        const frequencies = this.activeHarmonoids.map(h => h.currentFrequency).sort((a,b) => a - b);
        const midiNotes = frequencies.map(f => this.frequencyToMidi(f));

        let totalScore = 0;
        let pairCount = 0;

        for (let i = 0; i < midiNotes.length; i++) {
            for (let j = i + 1; j < midiNotes.length; j++) {
                let interval = Math.abs(midiNotes[i] - midiNotes[j]) % 12;
                totalScore += INTERVAL_SCORES[interval] || 0;
                pairCount++;
            }
        }
        
        if (pairCount === 0) return 0.75; // Default if no pairs (e.g. all unison)
        
        // Normalize score (max score for a pair is 10)
        const averageScore = totalScore / pairCount;
        return Math.max(0, Math.min(1, averageScore / 10)); // Normalize to 0-1 range
    }

    /**
     * Checks if a set of provided frequencies/notes form a specific chord.
     * @param {number[]} currentNotes (MIDI note numbers) of Harmonoids.
     * @param {number[]} targetChordNotes (relative to a root, or absolute MIDI notes).
     * @param {boolean} relative Is targetChordNotes relative intervals from a root, or absolute MIDI notes?
     * @param {number} [rootNote] MIDI root note, if targetChordNotes are relative intervals.
     * @returns {boolean} True if the chord is matched.
     */
    checkChord(currentNotes, targetChordNotes, relative = true, rootNote = this.globalKeyRootNote) {
        if (currentNotes.length < targetChordNotes.length) return false;

        const currentNoteSet = new Set(currentNotes.map(n => n % 12)); // Check pitch classes

        let requiredPitchClasses;
        if (relative) {
            requiredPitchClasses = targetChordNotes.map(interval => (rootNote + interval) % 12);
        } else {
            requiredPitchClasses = targetChordNotes.map(note => note % 12);
        }
        
        const requiredSet = new Set(requiredPitchClasses);
        
        // Check if all required pitch classes are present in the current notes
        for (const requiredPc of requiredSet) {
            if (!currentNoteSet.has(requiredPc)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} key like "C", "Db", "G#", etc.
     * @param {string} mode like "major", "minor" (conceptual for now)
     */
    setKey(key, mode) {
        const noteIndex = NOTE_NAMES.indexOf(key.toUpperCase().replace('FLAT', 'b').replace('SHARP', '#')); // Normalize accidentals
        if (noteIndex !== -1) {
            this.currentKey = NOTE_NAMES[noteIndex]; // Use canonical name
            // Assuming C4 is MIDI 60. Set key relative to that.
            // This logic is simplified. A full key system might pick a specific octave C (e.g., C3, C4) as globalKeyRootNote.
            // For now, let's say 'C' maps to globalKeyRootNote being a C in some octave (e.g. C4=60)
            // and other keys adjust this globalKeyRootNote.
            // E.g., if globalKeyRootNote default is C4 (60), and we set key to G,
            // new globalKeyRootNote becomes G4 (67).
            const baseCNote = Math.floor(this.globalKeyRootNote / 12) * 12; // C in the octave of current root
            this.globalKeyRootNote = baseCNote + noteIndex;
            this.currentMode = mode;
            console.log(`Key set to ${this.currentKey} ${this.currentMode} (root MIDI: ${this.globalKeyRootNote})`);
        } else {
            console.warn(`Invalid key: ${key}`);
        }
    }

    /**
     * Shifts the global key by a number of semitones.
     * @param {number} semitones The number of semitones to shift.
     */
    shiftGlobalKey(semitones) {
        this.globalKeyRootNote += semitones;
        // Update currentKey string
        const newRootIndex = this.globalKeyRootNote % 12;
        this.currentKey = NOTE_NAMES[newRootIndex];
        console.log(`Global key shifted by ${semitones}. New key root: ${this.getNoteName(this.globalKeyRootNote)}`);
    }

    toggleQuantize() {
        this.isQuantizeEnabled = !this.isQuantizeEnabled;
        // This would hook into a global timing system (beat clock) if implemented.
        // Harmonoids' actions (play/stop sound) would then align to this clock.
    }
}
```

<!-- /src/entities/Harmonoid.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';
import { NOTE_NAMES } from '../audio/MusicLogic.js';

const BASE_NOTE_MIDI = 60; // C4, Harmonoids will adjust from this
const HARMONOID_RADIUS = 15;

export class Harmonoid {
    /** @type {import('../core/Engine.js').Engine} */
    engine;
    /** @type {string} */
    id;
    /** @type {string} */
    type = 'standard';
    /** @type {PIXI.Graphics} */
    sprite;
    /** @type {Matter.Body} */
    body;
    
    // Musical properties
    baseNote; // MIDI note number
    pitchOffset = 0; // Semitones from baseNote
    arpeggioOffset = 0; // Temporary pitch offset from arpeggiator
    /** @type {OscillatorType} */
    waveform = 'sine';
    currentFrequency = 0;
    volume = 0.5;

    isMuted = false;
    isSoloed = false; // True if this harmonoid is part of the active solo group
    isImplicitlyMuted = false; // True if another harmonoid is soloed and this one isn't selected
    isPlayingSound = false;

    // State
    isSelected = false;
    targetColor = 0xffffff; // Default color before note assigned
    
    // Droneoid specific for hover platform:
    isHoverPlatform = false; // Is it currently acting as a platform?


    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {string} id
     * @param {number} x
     * @param {number} y
     * @param {number} initialNoteOffset // Semitones from C4
     */
    constructor(gameEngine, id, x, y, initialNoteOffset = 0) {
        this.engine = gameEngine;
        this.id = id;
        
        this.baseNote = BASE_NOTE_MIDI + initialNoteOffset;

        // Create physics body
        this.body = this.engine.physics.addCircularBody(x, y, HARMONOID_RADIUS, {
            restitution: 0.2,
            friction: 0.1,
            density: 0.001, // Typical Matter.js density
            label: `harmonoid_${this.id}`
        });
        this.body.gameObject = this; // Link back to game object

        // Create PIXI sprite
        this.sprite = new PIXI.Graphics();
        this.drawSprite(); // Initial draw
        this.engine.renderer.add(this.sprite);

        this.setFrequencyFromNote();
        this.playSound(); // Start playing its passive tone
    }

    drawSprite() {
        this.sprite.clear();

        // Base color based on note
        const noteIndex = (this.baseNote + this.pitchOffset + this.arpeggioOffset) % 12;
        this.targetColor = this.engine.renderer.getColorForNoteIndex(noteIndex);
        
        if (this.isMuted || this.isImplicitlyMuted) {
            this.sprite.fill(0x808080); // Grey if muted
        } else {
            this.sprite.fill({color:this.targetColor, alpha: this.isSoloed ? 1.0 : 0.8});
        }
        
        this.sprite.stroke({width:this.isSelected ? 3 : 1, color: this.isSelected ? 0xFFFFFF : 0xAAAAAA, alpha:0.9});
        
        // Shape based on waveform (conceptual)
        switch(this.waveform) {
            case 'square':
                this.sprite.rect(-HARMONOID_RADIUS, -HARMONOID_RADIUS, HARMONOID_RADIUS * 2, HARMONOID_RADIUS * 2).fill();
                break;
            case 'sawtooth': // Triangle for sawtooth
                this.sprite.moveTo(0, -HARMONOID_RADIUS);
                this.sprite.lineTo(HARMONOID_RADIUS, HARMONOID_RADIUS);
                this.sprite.lineTo(-HARMONOID_RADIUS, HARMONOID_RADIUS);
                this.sprite.closePath().fill();
                break;
            case 'sine':
            default:
                this.sprite.circle(0, 0, HARMONOID_RADIUS).fill();
                break;
        }
        
        if(this.isSoloed && !this.isMuted && !this.isImplicitlyMuted){
            // Simple solo indicator: smaller inner circle of different color
            this.sprite.circle(0,0, HARMONOID_RADIUS*0.4).fill(0xFFFF00);
        }

        if(this.isHoverPlatform){ // Droneoid hover platform visual
             this.sprite.rect(-HARMONOID_RADIUS*1.5, -HARMONOID_RADIUS*0.3, HARMONOID_RADIUS*3, HARMONOID_RADIUS*0.6).fill(0xAAAAFF);
        }

    }

    updateColor() { // Called if global color settings change
        this.drawSprite();
    }

    setFrequencyFromNote() {
        const finalNote = this.baseNote + this.pitchOffset + this.arpeggioOffset;
        this.currentFrequency = this.engine.musicLogic.midiToFrequency(finalNote);
        if (this.isPlayingSound) {
            this.engine.audioEngine.updateSound(this.id, this.currentFrequency, this.waveform);
        }
        this.drawSprite(); // Update color which depends on note
    }

    playSound(isPercussive = false, useDetune = false) {
        if (!this.engine.audioEngine.audioContext) {
            // console.warn("AudioContext not ready, cannot play sound for " + this.id);
            return; // Audio context not ready
        }
        if (this.isMuted || this.isImplicitlyMuted) {
             if(this.isPlayingSound) this.stopSoundInternal(); // Ensure actual sound node is stopped
            return;
        }
        this.engine.audioEngine.playSound(this.id, this.currentFrequency, this.waveform, this.volume, isPercussive, useDetune);
        this.isPlayingSound = true;
    }

    stopSoundInternal() { // Internal stop, doesn't change isMuted status
        this.engine.audioEngine.stopSound(this.id);
        this.isPlayingSound = false;
    }

    changePitch(semitones) {
        this.pitchOffset += semitones;
        // Add octave wrapping or limits if desired
        // Example: Keep within 2 octaves of base
        // this.pitchOffset = Math.max(-24, Math.min(24, this.pitchOffset));
        this.setFrequencyFromNote();
        console.log(`${this.id} pitch changed to ${this.engine.musicLogic.getNoteName(this.baseNote + this.pitchOffset)}`);
    }

    /** @param {OscillatorType} waveform */
    setWaveform(waveform) {
        this.waveform = waveform;
        this.setFrequencyFromNote(); // This will call updateSound if playing
        this.drawSprite(); // Update shape
        console.log(`${this.id} waveform set to ${this.waveform}`);
    }
    
    setArpeggioOffset(semitones) {
        this.arpeggioOffset = semitones;
        this.setFrequencyFromNote();
    }

    toggleMute() {
        if (this.isMuted) this.unmute();
        else this.mute();
    }

    mute() {
        this.isMuted = true;
        this.stopSoundInternal();
        this.drawSprite();
        console.log(`${this.id} muted.`);
        if (this.type === 'droneoid') this.tryToggleHoverPlatform();
    }

    unmute() {
        this.isMuted = false;
        if (!this.isImplicitlyMuted) this.playSound(); // Only play if not implicitly muted by solo
        this.drawSprite();
        console.log(`${this.id} unmuted.`);
        if (this.type === 'droneoid') this.tryToggleHoverPlatform();
    }

    solo() {
        this.isSoloed = true;
        this.isImplicitlyMuted = false; // Solved entity is never implicitly muted
        if(!this.isMuted) this.playSound(); // Ensure it plays sound
        this.drawSprite();
        console.log(`${this.id} soloed.`);
        this.engine.harmonoids.forEach(h => {
            if (h !== this && !h.isSoloed) h.becomeImplicitlyMuted();
        });
        if (this.type === 'droneoid') this.tryToggleHoverPlatform();
    }

    unsolo() {
        this.isSoloed = false;
        this.drawSprite();
        console.log(`${this.id} un-soloed.`);
        
        // Check if any other Harmonoid is still soloed
        const anotherSoloExists = this.engine.harmonoids.some(h => h.isSoloed && h !== this);
        if (!anotherSoloExists) {
            // If no other solo exists, unmute all implicitly muted Harmonoids
            this.engine.harmonoids.forEach(h => h.endImplicitMute());
        } else {
            // If other solos still exist, this one might become implicitly muted
            this.becomeImplicitlyMuted();
        }
        if (this.type === 'droneoid') this.tryToggleHoverPlatform();
    }
    
    // Called when another Harmonoid is soloed and this one is not part of the (new) solo group
    becomeImplicitlyMuted() {
        if (!this.isSoloed) { // Only non-soloed harmonoids become implicitly muted
            this.isImplicitlyMuted = true;
            this.stopSoundInternal();
            this.drawSprite();
        }
    }

    // Called when solo mode ends for all, or this entity becomes soloed itself
    endImplicitMute() {
        if (this.isImplicitlyMuted) {
            this.isImplicitlyMuted = false;
            if (!this.isMuted) this.playSound(); // Play sound if not explicitly muted
            this.drawSprite();
        }
    }

    // Called by engine when this is unselected and soloing another, to clear solo state if it was part of selection but not *the* one soloed
    unsoloImplicitly() {
        if(this.isSoloed) {
            this.isSoloed = false;
            this.becomeImplicitlyMuted(); // May become implicitly muted if another is still soloed.
            this.drawSprite();
            if (this.type === 'droneoid') this.tryToggleHoverPlatform();
        }
    }

    /** @param {boolean} selected */
    setSelected(selected) {
        this.isSelected = selected;
        this.drawSprite();
    }

    /** @param {number} deltaTime */
    update(deltaTime) {
        // Sync sprite with physics body
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        this.sprite.rotation = this.body.angle;

        if(this.isHoverPlatform) {
             // Custom logic if needed for hover behavior e.g. slight bobbing
        }

        // Custom behaviors for subclasses would go here or override this.
        this.performSpecialAbility(); // Empty for base, overridden by subs.
    }

    performSpecialAbility() { /* Base class does nothing */ }

    render() {
        // Sprite is already on stage, PIXI handles its rendering.
        // Update necessary if sprite properties changed outside 'update' e.g. color, visibility
        // This method is here for consistency but might not do much for simple graphics.
        // Could be used for debug draws:
        // this.engine.renderer.debugDrawText(this.id, this.sprite.x, this.sprite.y - 20);
    }

    /**
     * @param {any} otherObject The object it collided with (could be another Harmonoid or an EnvObject)
     * @param {Matter.Pair} pair The collision pair details from Matter.js
     */
    onCollision(otherObject, pair) {
        // console.log(`${this.id} collided with ${otherObject?.id || otherObject?.label || 'something'}`);
        // Specific collision responses are handled by subclasses or game engine.
    }

    // To be called by Droneoid subclass
    tryToggleHoverPlatform() {
        // Overridden in Droneoid
    }


    destroy() {
        this.stopSoundInternal();
        this.engine.renderer.remove(this.sprite);
        this.engine.physics.removeBody(this.body);
        // Remove from any selections or lists in engine if not handled there
    }
}
```

<!-- /src/entities/Bassoids.js -->
```javascript
import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';


const BASSOID_RADIUS_FACTOR = 1.2; // Bassoids are slightly larger
const VIBRATION_RANGE = 100; // Range of vibration effect
const VIBRATION_FORCE = 0.05; // Force applied by vibration

export class Bassoid extends Harmonoid {
    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {string} id
     * @param {number} x
     * @param {number} y
     */
    constructor(gameEngine, id, x, y) {
        super(gameEngine, id, x, y, -12); // 1 octave below C4 default (i.e. C3)
        this.type = 'bassoid';
        this.volume = 0.6; // Bassoids are a bit louder

        // Larger physics body for Bassoids
        Matter.Body.scale(this.body, BASSOID_RADIUS_FACTOR, BASSOID_RADIUS_FACTOR);
        // Sprite update handled by its draw method, assuming it uses body's radius or a fixed one scaled internally.
        // Re-drawing with new scale:
        this.sprite.scale.set(BASSOID_RADIUS_FACTOR, BASSOID_RADIUS_FACTOR);

        this.setFrequencyFromNote(); // Recalculate frequency based on new baseNote
        if(!this.isMuted && !this.isImplicitlyMuted) this.playSound(false, true); // Play with detune for richness
    }

    // Bassoids specific ability
    vibrateObstacles() {
        if (this.isMuted || this.isImplicitlyMuted) return;

        console.log(`${this.id} (Bassoid) is vibrating!`);
        // Ability Flash: quick change in color or outline
        const originalColor = this.targetColor;
        this.sprite.tint = 0xFF0000; // Flash red
        setTimeout(() => { this.sprite.tint = originalColor; }, 100);

        // Find nearby "lowFreqPlate" obstacles and apply force
        this.engine.environmentalObjects.forEach(obj => {
            if (obj.type === 'lowFreqPlate' && obj.body) {
                const distance = Matter.Vector.magnitude(
                    Matter.Vector.sub(obj.body.position, this.body.position)
                );
                if (distance < VIBRATION_RANGE) {
                    // Apply a small, upward and random horizontal force to topple/move it
                    const forceMagnitude = VIBRATION_FORCE * (1 - distance/VIBRATION_RANGE); // Stronger if closer
                    const force = { 
                        x: (Math.random() - 0.5) * forceMagnitude * 0.5, // Slight random horizontal
                        y: -forceMagnitude // Upward push
                    }; 
                    console.log(`Applying force to ${obj.id} from Bassoid ${this.id}`);
                    this.engine.physics.applyForce(obj.body, force);
                }
            }
        });
    }

    performSpecialAbility() {
        // Bassoids might vibrate automatically on strong landing or player trigger
        // For demo, let's make it player-triggered or on significant impact.
        // This needs an explicit trigger for now. A special key could call this on selected Bassoid.
        // Or, a "landing" check in onCollision could trigger it for Bassoids specifically.
    }
    
    /**
     * @param {any} otherObject
     * @param {Matter.Pair} pair
     */
    onCollision(otherObject, pair) {
        super.onCollision(otherObject, pair);
        // If Bassoid lands heavily on something, or specifically a lowFreqPlate
        if (pair.collision.normal.y < -0.7 && pair.collision.depth > 2) { // Strong vertical impact (landing)
             if(otherObject.type === 'lowFreqPlate' || otherObject.isPlatform){ // Collided with a plate or platform
                 this.vibrateObstacles();
             }
        }
    }

    drawSprite() {
        super.drawSprite(); // Call base draw
        // Add Bassoid specific visual flair if needed
        // Example: slightly thicker outline or an additional marking
        this.sprite.graphicsData.forEach(g => {
            if(g.shape instanceof PIXI.Circle) g.lineStyle.width = (this.isSelected ? 4: 2); // Thicker outline
        });
    }
}
```

<!-- /src/entities/Glissoids.js -->
```javascript
import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';


const GLISSOID_RADIUS_FACTOR = 0.8; // Glissoids are smaller
const SLOPE_ACCELERATION_FORCE = 0.0005;

export class Glissoid extends Harmonoid {
    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {string} id
     * @param {number} x
     * @param {number} y
     */
    constructor(gameEngine, id, x, y) {
        super(gameEngine, id, x, y, 0); // Standard C4 pitch range
        this.type = 'glissoid';
        this.waveform = 'sine'; // Default, but will glide
        this.volume = 0.45;

        // Smaller physics body for Glissoids, good for 1-tile gaps
        // If tile is 30px, radius must be <15. Original is 15.
        Matter.Body.scale(this.body, GLISSOID_RADIUS_FACTOR, GLISSOID_RADIUS_FACTOR); 
        // this.body.friction = 0.01; // Glissoids are slippery
        // this.body.frictionAir = 0.005;
        Matter.Body.set(this.body, {friction: 0.01, frictionAir: 0.005});


        this.sprite.scale.set(GLISSOID_RADIUS_FACTOR);
        
        this.glideTargetFrequency = this.currentFrequency;
        this.isGliding = false;

        this.setFrequencyFromNote();
        if(!this.isMuted && !this.isImplicitlyMuted) this.playSound();
    }

    // Glissoid specific: continuous pitch glide effect
    startGlide(targetPitchOffset) {
        const targetNote = this.baseNote + targetPitchOffset + this.arpeggioOffset;
        this.glideTargetFrequency = this.engine.musicLogic.midiToFrequency(targetNote);
        this.isGliding = true;
        // Pitch is updated in main update loop smoothly.
    }

    /** @param {number} semitones */
    changePitch(semitones) { // Override to make it glide
        this.pitchOffset += semitones;
        // this.pitchOffset = Math.max(-24, Math.min(24, this.pitchOffset));
        this.startGlide(this.pitchOffset); // Trigger glide to the new pitch
        console.log(`${this.id} (Glissoid) starting glide to ${this.engine.musicLogic.getNoteName(this.baseNote + this.pitchOffset)}`);
    }

    /** @param {number} deltaTime */
    update(deltaTime) {
        super.update(deltaTime);

        if (this.isGliding && this.isPlayingSound) {
            const freqDiff = this.glideTargetFrequency - this.currentFrequency;
            if (Math.abs(freqDiff) < 0.1) { // Threshold to stop glide
                this.currentFrequency = this.glideTargetFrequency;
                this.isGliding = false;
            } else {
                this.currentFrequency += freqDiff * 0.1; // Glide speed factor (0.1 means 10% of diff per update)
            }
            this.engine.audioEngine.updateSound(this.id, this.currentFrequency);
            this.drawSprite(); // Update color which depends on current frequency (or base note)
        }

        // Accelerate on slopes
        this.accelerateOnSlopes();
    }

    accelerateOnSlopes() {
        if (this.body.speed > 0.5 && Math.abs(this.body.velocity.x) > Math.abs(this.body.velocity.y * 0.5)) { // Moving somewhat horizontally
            // Check if on a slope. This requires raycasting or analyzing collision normals.
            // Simplified: if horizontal velocity is significant and it's on ground, apply small force.
            // More accurate check: If colliding and contact normal is not vertical
            if (this.body.isSensor /* not great way */ || this.engine.physics.world.gravity.y === 0 ) return; // Makes no sense in no grav or if it's a sensor
            
            // Matter.js doesn't directly expose continuous contact normals easily outside of collision events.
            // We can check if there is a support point that's not flat.
            // A simpler approximation: if it has horizontal velocity and is on 'ground'.
            // This is not a perfect slope detection, just a general speed boost if moving on ground.
            // A more robust way would be to check collision contact points and their normals.
            
            // Crude slope check: if it's moving horizontally fast, and there's a slight tilt in movement direction...
            if (Math.abs(this.body.velocity.x) > 1 && this.body.velocity.y !== 0) { // It's moving and potentially on a slope
                const direction = Math.sign(this.body.velocity.x);
                this.engine.physics.applyForce(this.body, { x: direction * SLOPE_ACCELERATION_FORCE * this.body.mass, y: 0 });
            }
        }
    }


    drawSprite() {
        super.drawSprite(); // Call base draw
        // Glissoid specific visual: maybe a slightly elongated or teardrop shape if not a circle.
        // For simplicity, sticking to scaled circle/rect/triangle but with distinct behavior.
        // Change alpha to look more 'slippery' or 'fast'.
        this.sprite.alpha = (this.isMuted || this.isImplicitlyMuted) ? 0.5 : 0.9;
    }
}
```

<!-- /src/entities/Percussoids.js -->
```javascript
import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

const PERCUSSIVE_SHOCKWAVE_RANGE = 80;

export class Percussoid extends Harmonoid {
    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {string} id
     * @param {number} x
     * @param {number} y
     */
    constructor(gameEngine, id, x, y) {
        super(gameEngine, id, x, y, 0); // Default pitch range
        this.type = 'percussoid';
        this.volume = 0.7; // Percussive sounds can be prominent
        
        // Percussoids might be denser or have different restitution
        Matter.Body.set(this.body, { restitution: 0.1, density: 0.0015 });

        // No continuous sound. Sound is triggered on landing/action.
        // So, stop the initial sound from Harmonoid constructor.
        this.stopSoundInternal(); 
        this.isPlayingSound = false; // Explicitly set, as it's event-driven

        this.landedSinceSpawn = false;
    }
    
    // Override playSound to always be percussive
    playSound() {
        if (!this.engine.audioEngine.audioContext || this.isMuted || this.isImplicitlyMuted) {
            return; 
        }
        // The 'pop' sound comes from its percussive envelope.
        // It doesn't have a continuous tone, so 'playSound' for Percussoid means "make the pop".
        this.engine.audioEngine.playSound(this.id, this.currentFrequency, this.waveform, this.volume, true, false); // True for percussive
        this.isPlayingSound = true; // Momentarily
        setTimeout(() => {this.isPlayingSound = false;}, 200); // Corresponds to percussive sound length

        this.createShockwaveVisual();
        this.triggerRhythmPads();
    }

    createShockwaveVisual() {
        // Visual effect for shockwave
        const shockwave = new PIXI.Graphics()
            .circle(0, 0, PERCUSSIVE_SHOCKWAVE_RANGE * 0.1)
            .stroke({width: 3, color: this.targetColor, alpha: 0.8});
        shockwave.x = this.body.position.x;
        shockwave.y = this.body.position.y;
        this.engine.renderer.add(shockwave);

        let scale = 0.1;
        const animateShockwave = () => {
            if (scale >= 1) {
                this.engine.renderer.remove(shockwave);
                return;
            }
            scale += 0.1; // Animation speed
            shockwave.scale.set(scale);
            shockwave.alpha = 1 - scale;
            requestAnimationFrame(animateShockwave);
        };
        animateShockwave();
    }

    triggerRhythmPads() {
        // Find nearby "rhythmPad" objects and activate them
        this.engine.environmentalObjects.forEach(obj => {
            if (obj.isRhythmPad && obj.body) { // Check for a specific flag on EnvObjects
                const distance = Matter.Vector.magnitude(
                    Matter.Vector.sub(obj.body.position, this.body.position)
                );
                if (distance < PERCUSSIVE_SHOCKWAVE_RANGE) {
                    obj.trigger?.(this); // Call trigger method on the rhythm pad
                    console.log(`Percussoid ${this.id} triggered rhythm pad ${obj.id}`);
                }
            }
        });
    }

    /**
     * @param {any} otherObject
     * @param {Matter.Pair} pair
     */
    onCollision(otherObject, pair) {
        super.onCollision(otherObject, pair);
        // Shockwave on landing
        // Check if it's a downward collision (landing) and with significant impact
        const normalY = pair.collision.normal.y; // Normal of the collision FROM otherObject TO this Harmonoid
        const impactVelocity = pair.collision.speed; // Relative speed at collision

        if (normalY < -0.5 && impactVelocity > 1.0) { // Landing on a surface with some force
            if(!this.landedSinceSpawn || this.engine.gameTime > (this.lastLandingTime || 0) + 0.5){ // Debounce
                this.playSound(); // This is the 'pop' and shockwave trigger
                this.lastLandingTime = this.engine.gameTime;
                this.landedSinceSpawn = true; // for auto-play on first land
            }
            
             // Check if the otherObject is a rhythm pad
            if (otherObject.isRhythmPad) {
                this.landedOnRhythmPad(otherObject);
            }
        }
    }
    
    landedOnRhythmPad(padObject){
         // Percussoids might have special interactions with rhythm pads
        console.log(`${this.id} landed on rhythm pad ${padObject.id}`);
        // Pad object itself might react. TriggerRhythmPads is broader.
    }
    

    // Percussoids don't maintain a continuous tone. changePitch only sets up for next pop.
    changePitch(semitones) {
        this.pitchOffset += semitones;
        this.setFrequencyFromNote(); // Update currentFrequency for the next pop
        this.drawSprite(); // Color might change based on new potential pitch
    }

    /** @param {OscillatorType} waveform */
    setWaveform(waveform) { // Change waveform for next pop
        this.waveform = waveform;
        this.drawSprite(); // Shape might change
    }
    
    mute() {
        super.mute(); // Calls base mute logic, stops sound.
    }
    unmute() {
        super.unmute(); // Calls base unmute logic. Doesn't auto-play.
    }

    update(deltaTime){
        super.update(deltaTime);
        // For first spawn and no user action, make a pop sound on first land
        if (!this.landedSinceSpawn && this.body.velocity.y == 0 && this.engine.physics.areBodiesTouching(this.body, this.engine.physics.world.bodies.find(b=>b.isStatic && b.position.y > this.body.position.y - 5) ) ){
            // This is a rough check for first contact with ground, onCollision is better
        }

    }

    drawSprite() {
        super.drawSprite(); // Call base draw
        // Percussoid visual: Maybe spikier if 'square' or 'sawtooth' is selected for its pop
        if (this.waveform === 'square' && this.sprite.graphicsData[0]?.shape instanceof PIXI.Circle) { // If default circle drawn
             this.sprite.clear().rect(-15, -15, 30, 30).fill(this.targetColor); // make it a square if square pop
        }
    }
}

```

<!-- /src/entities/Droneoids.js -->
```javascript
import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';


export class Droneoid extends Harmonoid {
    originalGravityScale;
    isHovering = false;
    
    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {string} id
     * @param {number} x
     * @param {number} y
     */
    constructor(gameEngine, id, x, y) {
        super(gameEngine, id, x, y, 0); // Sustained organ, default pitch range
        this.type = 'droneoid';
        this.waveform = 'sawtooth'; // Organ-like usually richer, sawtooth or custom
        this.volume = 0.4;
        
        this.originalGravityScale = this.body.gravityScale === undefined ? 1 : this.body.gravityScale ; // Store original if Matter had per-body gravity scale
                                                                                                         // Matter.js doesn't have body.gravityScale, world gravity applies to all.
                                                                                                         // So we need to toggle static state or apply counter-gravity force.
        
        this.setFrequencyFromNote();
        if(!this.isMuted && !this.isImplicitlyMuted) this.playSound(false, true); // Play sustained sound, detuned for organ feel
    }

    tryToggleHoverPlatform() {
        // Hover when solo-muted: This means (isSoloed AND isMuted) OR (isSoloed AND isImplicitlyMuted if not self)
        // Simplified for demo: hover if (isSoloed AND isMuted)
        const shouldHover = this.isSoloed && this.isMuted;

        if (shouldHover && !this.isHovering) {
            this.startHovering();
        } else if (!shouldHover && this.isHovering) {
            this.stopHovering();
        }
    }

    startHovering() {
        this.isHovering = true;
        this.isHoverPlatform = true; // Visual flag for Harmonoid.js drawSprite
        Matter.Body.setStatic(this.body, true); // Become a temporary static platform
        this.drawSprite(); // Update visual to indicate platform state
        console.log(`${this.id} (Droneoid) started hovering, is now a platform.`);
    }

    stopHovering() {
        this.isHovering = false;
        this.isHoverPlatform = false;
        Matter.Body.setStatic(this.body, false); // Revert to dynamic body
        // Restore velocity if needed, or let it fall
        Matter.Body.setVelocity(this.body, {x:0, y:0}); // Stop movement before falling
        this.drawSprite();
        console.log(`${this.id} (Droneoid) stopped hovering.`);
    }

    // Override mute/solo functions to check for hover condition
    mute() {
        super.mute();
        this.tryToggleHoverPlatform();
    }
    unmute() {
        super.unmute();
        this.tryToggleHoverPlatform();
    }
    solo() {
        super.solo();
        this.tryToggleHoverPlatform();
    }
    unsolo() {
        super.unsolo();
        this.tryToggleHoverPlatform();
    }
     unsoloImplicitly() {
        super.unsoloImplicitly();
        this.tryToggleHoverPlatform();
    }

    update(deltaTime) {
        // If it's set to static due to hovering, the base Harmonoid update for physics position won't apply movement.
        // But the sprite position will still correctly map to the (now static) body position.
        super.update(deltaTime); 
        // Droneoids might have a slight bobbing visual effect when hovering, handled in drawSprite or here with small position tweaks if not static physics based.
        // If using setStatic, physics handles it.
    }
    
    drawSprite() {
        super.drawSprite(); // Calls base Harmonoid drawing logic including hover platform state.
        // Add Droneoid specific visual flair if needed, e.g. different particle effect, aura when hovering.
        if (this.isHovering) {
            this.sprite.alpha = 0.9;
            // This could also be a separate visual element managed by the Droneoid
        }
    }
}
```

<!-- /src/mechanics/Gates.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

const GATE_CHECK_INTERVAL = 500; // ms

export class HarmonicGate {
    /** @type {import('../core/Engine.js').Engine} */
    engine;
    id;
    /** @type {Matter.Body} */
    body; // Physics body, could be a sensor or a solid barrier
    /** @type {PIXI.Graphics} */
    sprite;
    
    /** @type {number[]} MIDI notes relative to key root, or absolute MIDI notes if gate specified so */
    requiredNotes; // e.g., [0, 4, 7] for a major triad if relative to root. Or [60, 64, 67] for absolute Cmaj.
    isRelativeChord = true; // default behavior: chord relative to current level key
    isOpen = false;
    
    lastCheckTime = 0;
    /** @type {import('../entities/Harmonoid.js').Harmonoid[]} */
    harmonoidsOnGate = []; // Harmonoids currently touching/inside the gate area

    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number[]} requiredChordNotes Array of MIDI note numbers or intervals
     * @param {object} [options] Matter.js body options and gate specific options
     */
    constructor(gameEngine, x, y, width, height, requiredChordNotes, options = {}) {
        this.engine = gameEngine;
        this.id = `gate_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
        this.requiredNotes = requiredChordNotes;
        this.isRelativeChord = options.isRelativeChord !== undefined ? options.isRelativeChord : true;
        
        this.body = this.engine.physics.addStaticBody(x, y, width, height, {
            isSensor: true, // Sensor initially, becomes solid when closed (or vice-versa)
            label: `harmonic_gate_${this.id}`,
            ...options
        });
        this.body.gameObject = this;

        this.sprite = new PIXI.Graphics();
        this.drawSprite(width, height);
        this.sprite.x = x;
        this.sprite.y = y;
        this.engine.renderer.add(this.sprite);

        // If it starts closed and solid, set body accordingly
        if(!this.isOpen) {
            //Matter.Body.setStatic(this.body, true); // Ensure it's static
            //this.body.isSensor = false; // Make it solid
            // This logic of open/closed sensor/solid depends on gate design.
            // For this demo: Gate is a sensor. Opening it means "requirement met",
            // could trigger another connected object (e.g. a door elsewhere).
            // For simplicity, the gate itself doesn't block, it just reports its state.
        }
    }

    drawSprite(width, height) {
        this.sprite.clear();
        this.sprite.rect(-width/2, -height/2, width, height)
            .fill(this.isOpen ? 0x00FF00 : 0xFF0000, 0.3) // Green if open, Red if closed
            .stroke({width: 2, color: this.isOpen ? 0x00AA00 : 0xAA0000 });

        // Display required chord visually (simplified)
        const text = new PIXI.Text({
            text: this.getChordSymbol(), 
            style: { fontFamily: 'Arial', fontSize: 14, fill: 0xFFFFFF, align: 'center' }
        });
        text.anchor.set(0.5);
        text.y = -height/2 - 10;
        this.sprite.addChild(text);
    }
    
    getChordSymbol() {
        // Display notes using MusicLogic. Could be e.g. "Cmaj" or "Dm7" with more logic.
        // For now, list relative intervals or note names.
        return this.requiredNotes.map(n => {
             if (this.isRelativeChord) return `+${n}st`;
             return this.engine.musicLogic.getNoteName(n);
        }).join(', ');
    }

    /**
     * Periodically checks or is triggered by collision changes.
     */
    update(deltaTime) {
        this.engine.gameTime = (this.engine.gameTime || 0) + deltaTime;
        if (this.engine.gameTime > this.lastCheckTime + GATE_CHECK_INTERVAL/1000) {
            this.checkHarmonoidsOnGate();
            this.lastCheckTime = this.engine.gameTime;
        }
    }
    
    // Call this method upon collision events or periodically
    checkHarmonoidsOnGate() {
        this.harmonoidsOnGate = this.engine.harmonoids.filter(h => 
            !h.isMuted && !h.isImplicitlyMuted && this.engine.physics.areBodiesTouching(h.body, this.body)
        );

        const currentNotes = this.harmonoidsOnGate.map(h => h.baseNote + h.pitchOffset + h.arpeggioOffset);
        
        const rootNote = this.isRelativeChord ? this.engine.musicLogic.globalKeyRootNote : undefined;
        const chordMatched = this.engine.musicLogic.checkChord(currentNotes, this.requiredNotes, this.isRelativeChord, rootNote);

        if (chordMatched && !this.isOpen) {
            this.openGate();
        } else if (!chordMatched && this.isOpen) {
            this.closeGate();
        }
    }

    openGate() {
        this.isOpen = true;
        // this.body.isSensor = true; // Make it passable
        // Or trigger an external action if the gate itself is not a physical barrier.
        this.drawSprite(this.body.vertices[2].x - this.body.vertices[0].x, this.body.vertices[2].y - this.body.vertices[0].y); // Redraw with new state (size might need storing)
        console.log(`Gate ${this.id} opened! Chord: ${this.getChordSymbol()}`);
        // Potentially trigger a "boss arena" state change or something similar
    }

    closeGate() {
        this.isOpen = false;
        // this.body.isSensor = false; // Make it solid again
        this.drawSprite(this.body.vertices[2].x - this.body.vertices[0].x, this.body.vertices[2].y - this.body.vertices[0].y); // Redraw
        console.log(`Gate ${this.id} closed.`);
    }
    
    render(renderer){
        // Sprite position and state are updated elsewhere.
        // Gate may have animation when opening/closing
    }

    /** @param {import('../entities/Harmonoid.js').Harmonoid} harmonoid */
    onCollision(harmonoid, pair) {
        // Harmonoid enters/leaves gate sensor area
        // this.checkHarmonoidsOnGate(); // Can be more responsive here
    }

    destroy() {
        this.engine.renderer.remove(this.sprite);
        this.engine.physics.removeBody(this.body);
    }
}
```

<!-- /src/mechanics/DissonanceZone.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

export class DissonanceZone {
    /** @type {import('../core/Engine.js').Engine} */
    engine;
    id;
    /** @type {Matter.Body} */
    body; // Sensor body defining the area
    /** @type {PIXI.Graphics} */
    sprite;
    
    currentDissonanceScore = 0; // 0 (harmonious) to 1 (dissonant)

    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {object} [options] Matter.js body options
     */
    constructor(gameEngine, x, y, width, height, options = {}) {
        this.engine = gameEngine;
        this.id = `dissonance_zone_${Date.now()}`;
        
        this.body = this.engine.physics.addStaticBody(x, y, width, height, {
            isSensor: true,
            label: `dissonance_zone_${this.id}`,
            ...options
        });
        this.body.gameObject = this;

        this.sprite = new PIXI.Graphics();
        this.drawSprite(width, height);
        this.sprite.x = x;
        this.sprite.y = y;
        this.engine.renderer.add(this.sprite);
    }

    drawSprite(width, height) {
        this.sprite.clear();
        // Visual representation of dissonance: more intense color/animation with higher score
        const intensity = Math.min(1, this.currentDissonanceScore * 2); // Amplify for visual effect
        const color = PIXI.Color.shared.setValue([1, 1 - intensity, 1 - intensity]).toNumber(); // Shifts from white to red
        
        this.sprite.rect(-width/2, -height/2, width, height)
            .fill({color:color, alpha:0.1 + intensity * 0.3}) // Semi-transparent, more opaque with dissonance
            .stroke({width:1 + intensity * 3, color:color, alpha:0.5 + intensity * 0.5});

        // Maybe add some particle effects or shader if renderer supports it
        if (this.currentDissonanceScore > 0.5 && Math.random() > 0.8) { // Erratic lines for high dissonance
            this.sprite.moveTo((Math.random() -0.5) * width, (Math.random() -0.5) * height)
                       .lineTo((Math.random() -0.5) * width, (Math.random() -0.5) * height)
                       .stroke({width:1, color:0xFF0000, alpha:Math.random() * 0.5});
        }
    }
    
    /**
     * To be called by the engine's update loop or checkInteractions.
     * @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoidsInZone
     */
    checkHarmonoids(harmonoidsInZone) {
        if (harmonoidsInZone.length < 2) {
            this.currentDissonanceScore = 0;
        } else {
            const frequencies = harmonoidsInZone.map(h => h.currentFrequency);
            // Use MusicLogic to calculate dissonance. MusicLogic's calculateOverallHarmony returns 0-1 (1 is good harmony).
            // So dissonance is 1 - harmony_score.
            const tempMusicLogic = this.engine.musicLogic; // or a temporary instance with these harmonoids
            const activeHarmonoidsSnapshot = tempMusicLogic.activeHarmonoids; // Save state
            tempMusicLogic.activeHarmonoids = harmonoidsInZone;
            const harmonyScore = tempMusicLogic.calculateOverallHarmony();
            tempMusicLogic.activeHarmonoids = activeHarmonoidsSnapshot; // Restore state
            
            this.currentDissonanceScore = 1 - harmonyScore;
        }
        
        // Apply effects based on dissonance score
        if (this.currentDissonanceScore > 0.7) { // High dissonance
            harmonoidsInZone.forEach(h => {
                // Make them move erratically (small random forces)
                if (Math.random() < 0.1) { // Apply force infrequently
                     const force = { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 };
                     this.engine.physics.applyForce(h.body, force);
                }
                 // Potentially detune them slightly or affect their volume
            });
        }

        this.drawSprite(this.body.vertices[2].x - this.body.vertices[0].x, this.body.vertices[2].y - this.body.vertices[0].y); // Redraw with new score visualization
    }
    
    render(renderer) {
        // Sprite managed. Effects could be updated here.
    }

    destroy() {
        this.engine.renderer.remove(this.sprite);
        this.engine.physics.removeBody(this.body);
    }
}
```

<!-- /src/mechanics/ResonanceField.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

const FIELD_DURATION = 15; // seconds
const FIELD_RADIUS = 100; // pixels

export class ResonanceField {
    /** @type {import('../core/Engine.js').Engine} */
    engine;
    id;
    /** @type {Matter.Body} */
    body; // Sensor body defining the area
    /** @type {PIXI.Graphics} */
    sprite;
    
    creationTime;
    isActive = true;

    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {number} duration // in seconds
     */
    constructor(gameEngine, x, y, radius = FIELD_RADIUS, duration = FIELD_DURATION) {
        this.engine = gameEngine;
        this.id = `resonance_field_${Date.now()}`;
        this.creationTime = this.engine.gameTime;
        this.duration = duration;
        
        this.body = this.engine.physics.addStaticBody(x, y, radius * 2, radius * 0.5, { // Making it a flat-ish rectangle for "field on ground"
            isSensor: true,
            label: `resonance_field_${this.id}`,
        });
        this.body.gameObject = this;

        this.sprite = new PIXI.Graphics();
        this.drawSprite(radius);
        this.sprite.x = x;
        this.sprite.y = y;
        this.engine.renderer.add(this.sprite);
    }

    drawSprite(radius) {
        this.sprite.clear();
        const lifeLeft = Math.max(0, 1 - (this.engine.gameTime - this.creationTime) / this.duration);
        
        this.sprite.circle(0,0, radius * lifeLeft) // Shrinks over time
            .fill({color: 0x00FFFF, alpha:0.1 + lifeLeft * 0.3}) // Cyan, fades out
            .stroke({width:1 + lifeLeft * 2, color:0x00FFFF, alpha:0.3 + lifeLeft * 0.4});
    }
    
    /** @param {number} deltaTime */
    update(deltaTime) {
        if (!this.isActive) return;

        if (this.engine.gameTime > this.creationTime + this.duration) {
            this.deactivate();
            return;
        }

        // Effect of the field: Amplify sounds of Harmonoids within, or attract them
        this.engine.harmonoids.forEach(h => {
            if (!h.isMuted && !h.isImplicitlyMuted && Matter.Bounds.contains(this.body.bounds, h.body.position)) {
                // Amplify sound (temporary volume boost) - this part is tricky with AudioEngine node management
                // For now, a conceptual effect: Maybe they become 'louder' conceptually or slightly change behavior
                // h.volume = Math.min(1.0, h.baseVolume + 0.2); // Needs baseVolume property and reset
                
                // Attract Harmonoids (apply a gentle force towards center of field)
                 const forceDirection = Matter.Vector.sub(this.body.position, h.body.position);
                 const distance = Matter.Vector.magnitude(forceDirection);
                 if (distance > 5) { // Don't apply if very close
                    const forceMagnitude = 0.0001 * h.body.mass; // Small attractive force
                    const force = Matter.Vector.mult(Matter.Vector.normalise(forceDirection), forceMagnitude);
                    this.engine.physics.applyForce(h.body, force);
                 }
            } else {
                // Reset effect if they leave and were affected (e.g. h.volume = h.baseVolume;)
            }
        });
        
        this.drawSprite(FIELD_RADIUS);
    }
    
    deactivate() {
        this.isActive = false;
        console.log(`Resonance Field ${this.id} expired.`);
        this.destroy(); // Remove from game
    }
    
    render(renderer) {}

    destroy() {
        this.isActive = false;
        const idx = this.engine.environmentalObjects.indexOf(this);
        if (idx > -1) this.engine.environmentalObjects.splice(idx, 1);
        this.engine.renderer.remove(this.sprite);
        this.engine.physics.removeBody(this.body);
    }
}
```

<!-- /src/mechanics/EnvObjects.js -->
```javascript
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';

// --- Base Class for Static Environmental Objects ---
export class EnvObject {
    /** @type {import('../core/Engine.js').Engine} */
    engine;
    id;
    /** @type {Matter.Body} */
    body;
    /** @type {PIXI.Graphics | PIXI.Sprite} */
    sprite;
    type = 'generic';
    isPlatform = true; // Most basic env objects are platforms

    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {boolean} isStatic For physics
     * @param {object} [options] Matter.js body options and custom options
     */
    constructor(gameEngine, x, y, width, height, isStatic = true, options = {}) {
        this.engine = gameEngine;
        this.id = options.id || `${this.type}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
        
        const bodyOptions = {
            isStatic: isStatic,
            label: `${this.type}_${this.id}`,
            friction: options.friction || 0.5, // Default friction for platforms
            ...options
        };
        this.body = this.engine.physics.addRectangularBody(x, y, width, height, bodyOptions);
        this.body.gameObject = this; // Link back

        this.sprite = new PIXI.Graphics();
        this.drawSprite(width, height, options.color || 0x888888); // Default grey
        this.sprite.x = x;
        this.sprite.y = y;
        this.engine.renderer.add(this.sprite);
    }

    drawSprite(width, height, color) {
        this.sprite.clear().rect(-width/2, -height/2, width, height).fill(color);
    }

    update(deltaTime) { /* Base objects are static, may not need update */ }
    render(renderer) { /* Sprite already on stage */ }
    
    /** @param {import('../entities/Harmonoid.js').Harmonoid} harmonoid */
    onCollision(harmonoid, pair) { /* Base behavior */ }

    destroy() {
        this.engine.renderer.remove(this.sprite);
        this.engine.physics.removeBody(this.body);
        const idx = this.engine.environmentalObjects.indexOf(this);
        if (idx > -1) this.engine.environmentalObjects.splice(idx, 1);
    }
}

// --- Specific Environmental Objects ---

export class GenericPlatform extends EnvObject {
    constructor(gameEngine, x, y, width, height, isStatic = true, options = {}) {
        super(gameEngine, x, y, width, height, isStatic, {...options, color: options.color || 0x777788});
        this.type = 'platform';
    }
}

export class Obstacle extends EnvObject { // e.g. topple-able by Bassoids
    /**
     * @param {import('../core/Engine.js').Engine} gameEngine
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {string} obstacleType e.g. 'lowFreqPlate', 'breakableWall'
     * @param {object} [options]
     */
    constructor(gameEngine, x, y, width, height, obstacleType, options = {}) {
        // Obstacles are often dynamic (not static)
        super(gameEngine, x, y, width, height, options.isStatic === undefined ? false : options.isStatic, options);
        this.type = obstacleType; // e.g. 'lowFreqPlate' for Bassoids
        this.isPlatform = false; // Obstacles are not primarily for standing on
        
        // Specific visuals for obstacle types
        let color = 0xAA6633; // Default brown
        if (this.type === 'lowFreqPlate') color = 0x505070; // Dark purplish grey
        this.drawSprite(width, height, color);
    }
     // Obstacles might have health or break conditions
}

export class StartZone extends EnvObject {
    constructor(gameEngine, x, y, width, height, options = {}) {
        super(gameEngine, x, y, width, height, true, { isSensor: true, ...options, color: 0x00FF00 });
        this.type = 'startZone';
        this.isPlatform = false;
        this.drawSprite(width, height, 0x00CC00, 0.3);
    }
    drawSprite(width, height, color, alpha = 0.3){
        super.drawSprite(width, height, color);
        this.sprite.alpha = alpha;
    }
}
export class ExitZone extends EnvObject {
    constructor(gameEngine, x, y, width, height, options = {}) {
        super(gameEngine, x, y, width, height, true, { isSensor: true, ...options, color: 0x0000FF });
        this.type = 'exitZone';
        this.isPlatform = false;
        this.drawSprite(width, height, 0x0000CC, 0.3);
    }
    drawSprite(width, height, color, alpha = 0.3){
        super.drawSprite(width, height, color);
        this.sprite.alpha = alpha;
    }
     /** @param {import('../entities/Harmonoid.js').Harmonoid} harmonoid */
    onCollision(harmonoid, pair) {
        // Engine handles saving Harmonoid when it enters this zone.
        // Visual feedback maybe.
        console.log(`${harmonoid.id} reached ExitZone ${this.id}.`);
    }
}

export class FrequencyBridge extends EnvObject {
    /** @type {number[]} Required MIDI notes (absolute or relative, see HarmonicGate) */
    requiredTriad;
    isSolid = false; // Starts intangible or closed
    platformBody; // The actual solid part of the bridge

    constructor(gameEngine, x, y, width, height, requiredTriad, options = {}) {
        // Main body is a sensor to detect harmonoids for activation
        super(gameEngine, x, y, width, height, true, { isSensor: true, ...options, color: 0xFFFF00});
        this.type = 'frequencyBridge';
        this.isPlatform = false; // The sensor part is not the platform
        this.requiredTriad = requiredTriad;
        this.isRelativeChord = options.isRelativeChord !== undefined ? options.isRelativeChord : true;

        // Create the actual platform part (initially sensor or very thin / disabled)
        // For demo, let's make it visually distinct when active/inactive.
        // Actual solidity change done by toggling its isSensor or by removing/adding
        this.platformBody = this.engine.physics.addRectangularBody(x, y, width, height, {
            isStatic: true,
            isSensor: !this.isSolid, // Start as sensor if not solid
            label: `bridge_platform_${this.id}`
        });
        this.platformBody.gameObject = this; // So it can be identified

        // Visuals reflect activation state
        this.sprite.alpha = 0.2; // Main sensor sprite semi-transparent

        this.platformSprite = new PIXI.Graphics();
        this.platformSprite.x = x;
        this.platformSprite.y = y;
        this.engine.renderer.add(this.platformSprite);
        this.drawPlatformSprite(width, height);
    }

    drawPlatformSprite(width, height){
        this.platformSprite.clear();
        if(this.isSolid) {
            this.platformSprite.rect(-width/2, -height/2, width, height).fill(0xAAAAFF); // Solid blueish
        } else {
            this.platformSprite.rect(-width/2, -height/2, width, height)
                .stroke({width: 2, color: 0xAAAAFF, alpha: 0.5, alignment:0}); // Dashed or faint outline
        }
    }

    /** @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoidsOnBridge */
    checkHarmonoids(harmonoidsOnBridge) {
        const currentNotes = harmonoidsOnBridge
            .filter(h => !h.isMuted && !h.isImplicitlyMuted)
            .map(h => h.baseNote + h.pitchOffset + h.arpeggioOffset);
        
        const rootNote = this.isRelativeChord ? this.engine.musicLogic.globalKeyRootNote : undefined;
        const triadFormed = this.engine.musicLogic.checkChord(currentNotes, this.requiredTriad, this.isRelativeChord, rootNote);

        if (triadFormed && !this.isSolid) {
            this.setSolid(true);
        } else if (!triadFormed && this.isSolid) {
            this.setSolid(false);
        }
    }
    
    setSolid(solidState) {
        this.isSolid = solidState;
        this.platformBody.isSensor = !this.isSolid;
        // Might need to re-add/remove or update categories for physics changes to take full effect consistently.
        // For now, toggling isSensor is simplest.
        if(this.isSolid){
            // Hack to force re-evaluation of collisions if sensor state change is not enough.
            // Not generally recommended but can work.
            Matter.Body.setStatic(this.platformBody, true); // ensure it's static.
        }
        this.drawPlatformSprite(this.platformBody.vertices[1].x - this.platformBody.vertices[0].x, this.platformBody.vertices[2].y - this.platformBody.vertices[1].y);
        console.log(`FrequencyBridge ${this.id} is now ${this.isSolid ? 'SOLID' : 'PASSABLE'}`);
    }

    update(deltaTime) {
        // checkHarmonoids is called by Engine based on proximity/collision.
    }
    
    destroy() {
        super.destroy();
        this.engine.renderer.remove(this.platformSprite);
        this.engine.physics.removeBody(this.platformBody);
    }
}

export class AmplitudeFan extends EnvObject {
    liftForce; // Max lift force
    constructor(gameEngine, x, y, width, height, liftForce = 0.05, options = {}) {
        super(gameEngine, x, y, width, height, true, {isSensor: true, ...options, color: 0x00AAFF}); // Sensor body
        this.type = 'amplitudeFan';
        this.isPlatform = false;
        this.liftForce = liftForce;
        this.sprite.alpha = 0.4;
        // Visuals could include animated particles rising
    }

    /** @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoidsInVicinity */
    applyLift(harmonoidsInVicinity) {
        let totalAmplitude = 0;
        harmonoidsInVicinity.forEach(h => {
            if (!h.isMuted && !h.isImplicitlyMuted && h.isPlayingSound) {
                totalAmplitude += h.volume; // Sum of volumes of active harmonoids above
            }
        });

        if (totalAmplitude > 0.1) { // Threshold to activate fan
            const currentLift = Math.min(this.liftForce, totalAmplitude * 0.02); // Scale lift by total volume
            harmonoidsInVicinity.forEach(h => {
                // Apply upward force if harmonoid is directly above fan's effective area
                // The check for harmonoidsInVicinity should be accurate for "above fan".
                // For this demo, we assume Engine passes correct list of harmonoidsInVicinity.
                 this.engine.physics.applyForce(h.body, { x: 0, y: -currentLift * h.body.mass });
            });
            this.visualizeWind(currentLift);
        } else {
            this.visualizeWind(0);
        }
    }

    visualizeWind(strength) {
        // Simple visual: adjust alpha or add some quick particles
        this.sprite.alpha = 0.3 + Math.min(0.5, strength * 10); 
        if (strength > 0.01 && Math.random() > 0.5) {
            const p = new PIXI.Graphics().circle(0,0,Math.random()*3+1).fill(0xCCEEFF);
            p.x = this.sprite.x + (Math.random() - 0.5) * (this.sprite.width * 0.8);
            p.y = this.sprite.y - Math.random() * 20;
            this.engine.renderer.add(p);
            // Simple particle animation
            let life = 0;
            const animate = () => {
                p.y -= strength * 100 * (Math.random()*0.5 + 0.5); // Faster with more strength
                p.alpha = 1 - (life / 30);
                life++;
                if (life > 30) this.engine.renderer.remove(p);
                else requestAnimationFrame(animate);
            };
            animate();
        }
    }

    // update logic is handled by engine calling applyLift with correct Harmonoids.
}

export class PhaseShiftPortal extends EnvObject {
    targetPortalId = null; // ID of the paired portal
    /** @type {PhaseShiftPortal | null} */
    linkedPortal = null;
    teleportTargetFrequency; // Specific frequency or note index to trigger teleport
    cooldown = 2000; // 2s cooldown after teleport
    lastTeleportTime = 0;

    constructor(gameEngine, x, y, width, height, id, teleportTargetFrequency, options = {}) {
        super(gameEngine, x, y, width, height, true, { isSensor: true, ...options, color: 0xFF00FF});
        this.id = id; // Use provided ID for linking
        this.type = 'phaseShiftPortal';
        this.isPlatform = false;
        this.teleportTargetFrequency = teleportTargetFrequency; // For demo, teleport on matching frequency
        this.sprite.alpha = 0.6;
    }

    tryLinkPortals() {
        if (this.linkedPortal) return;
        // Find another portal to link to. For simplicity, based on having the same targetFrequency and not being itself.
        // Or use specific link IDs from level data. (Latter is better for complex levels)
        const otherPortals = this.engine.environmentalObjects.filter(
            obj => obj instanceof PhaseShiftPortal && obj.id !== this.id && obj.teleportTargetFrequency === this.teleportTargetFrequency
        );
        if (otherPortals.length > 0) {
            this.linkedPortal = otherPortals[0];
            otherPortals[0].linkedPortal = this; // Ensure two-way link
            console.log(`Portal ${this.id} linked with ${this.linkedPortal.id}`);
        } else {
             console.warn(`Portal ${this.id} could not find a pair with target frequency ${this.teleportTargetFrequency}.`);
        }
    }
    
    /** @param {import('../entities/Harmonoid.js').Harmonoid} harmonoid */
    onCollision(harmonoid, pair) {
        if (!this.linkedPortal) this.tryLinkPortals(); // Attempt to link on first interaction if not already.
        if (!this.linkedPortal || (this.engine.gameTime < this.lastTeleportTime + this.cooldown/1000)) return;

        // Teleport if Harmonoid's frequency (or specific waveform/phase in advanced version) matches
        const harmonoidNote = harmonoid.baseNote + harmonoid.pitchOffset + harmonoid.arpeggioOffset;
        const targetNote = this.engine.musicLogic.frequencyToMidi(this.teleportTargetFrequency);
        
        // Using pitch class match for robustness to octave
        if ((harmonoidNote % 12) === (targetNote % 12) && !harmonoid.isMuted && !harmonoid.isImplicitlyMuted) {
            console.log(`Harmonoid ${harmonoid.id} trying to teleport from ${this.id} to ${this.linkedPortal.id}`);
            // Teleport to linked portal's position
            Matter.Body.setPosition(harmonoid.body, { x: this.linkedPortal.body.position.x, y: this.linkedPortal.body.position.y - 30 }); // شويه فوق عشان ما يعلق
            Matter.Body.setVelocity(harmonoid.body, { x: 0, y: 0 }); // Reset velocity after teleport

            this.lastTeleportTime = this.engine.gameTime;
            this.linkedPortal.lastTeleportTime = this.engine.gameTime; // Sync cooldown

            // Visual effect for teleport
            this.playTeleportEffect(harmonoid.body.position);
            this.linkedPortal.playTeleportEffect(this.linkedPortal.body.position);
        }
    }

    playTeleportEffect(position) {
        const flash = new PIXI.Graphics().circle(position.x, position.y, 40).fill(0xFFFFFF);
        flash.alpha = 0.8;
        this.engine.renderer.add(flash);
        setTimeout(() => this.engine.renderer.remove(flash), 150);
    }
}

export class EchoChamber extends EnvObject {
    delayTime; // in seconds
    feedback; // 0 to <1 for feedback gain
    /** @type {Array<{originalSound: {id: string, freq:number, wave:OscillatorType, vol:number}, playTime: number, sourcePosition: Matter.Vector}>} */
    echoQueue = [];
    maxEchoes = 5; // Limit number of echoes in queue to prevent overload

    constructor(gameEngine, x, y, width, height, delayTime = 0.5, feedback = 0.3, options = {}) {
        super(gameEngine, x, y, width, height, true, {isSensor: true, ...options, color: 0x66DDFF});
        this.type = 'echoChamber';
        this.isPlatform = false;
        this.delayTime = delayTime;
        this.feedback = feedback; // How much of the echo feeds back into itself.
        this.sprite.alpha = 0.2;
    }

    /**
     * Called by engine for harmonoids inside chamber
     * @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoidsInChamber
     */
    processHarmonoids(harmonoidsInChamber) {
        harmonoidsInChamber.forEach(h => {
            // Check if this specific sound instance hasn't been queued recently to avoid spamming from sustained notes
            if (!h.isMuted && h.isPlayingSound && this.echoQueue.length < this.maxEchoes) {
                const existingEcho = this.echoQueue.find(e => e.originalSound.id === h.id && Math.abs(this.engine.gameTime - (e.playTime - this.delayTime)) < 0.1);
                if (!existingEcho) { // Add new echo if not recently added
                    this.echoQueue.push({
                        originalSound: { id: h.id, freq: h.currentFrequency, wave: h.waveform, vol: h.volume * 0.7}, // Echoes are slightly quieter
                        playTime: this.engine.gameTime + this.delayTime,
                        sourcePosition: {x: h.body.position.x, y: h.body.position.y } // For potential remote gate triggering from a position
                    });
                }
            }
        });
    }

    update(deltaTime) {
        const currentTime = this.engine.gameTime;
        for (let i = this.echoQueue.length - 1; i >= 0; i--) {
            const echo = this.echoQueue[i];
            if (currentTime >= echo.playTime) {
                // Play the echo as a one-shot sound effect from the AudioEngine pool
                // This needs a way to play temporary sounds not tied to a Harmonoid.
                const echoId = `echo_${echo.originalSound.id}_${Date.now()}`;
                this.engine.audioEngine.playSound(echoId, echo.originalSound.freq, echo.originalSound.wave, echo.originalSound.vol, true); // Play as percussive (short)
                
                this.visualizeEcho(echo.sourcePosition);

                // For "remote gate" triggering:
                // Check if this echo's sound can trigger any HarmonicGate
                // This is complex. Simplified: a gate might listen for specific frequencies occurring anywhere.
                // For now, just play the sound.
                
                // Feedback loop (conceptual, actual audio routing for feedback is complex and risky)
                if (this.feedback > 0 && Math.random() < this.feedback && this.echoQueue.length < this.maxEchoes) {
                     this.echoQueue.push({
                         originalSound: { ...echo.originalSound, vol: echo.originalSound.vol * this.feedback }, // Feedback echo is quieter
                         playTime: currentTime + this.delayTime,
                         sourcePosition: this.body.position // Feedback originates from chamber center
                     });
                }

                this.echoQueue.splice(i, 1); // Remove played echo
            }
        }
    }
    
    visualizeEcho(position) {
        const echoVisual = new PIXI.Graphics().circle(0,0,5).fill(0xFFFFFF,0.7);
        echoVisual.x = position.x;
        echoVisual.y = position.y;
        this.engine.renderer.add(echoVisual);
        let lifetime = 0;
        const animate = () => {
            echoVisual.scale.set(1 + lifetime * 0.1);
            echoVisual.alpha = 0.7 - (lifetime * 0.02);
            lifetime++;
            if (lifetime > 30 || echoVisual.alpha <=0) this.engine.renderer.remove(echoVisual);
            else requestAnimationFrame(animate);
        };
        animate();
    }
}
```

<!-- /src/ui/HUD.js -->
```javascript
export class HUD {
    /** @type {import('../core/Engine.js').Engine} */
    engine;

    // Main HUD elements
    /** @type {HTMLButtonElement} */ startPauseButton;
    /** @type {HTMLButtonElement} */ modeToggleButton;
    /** @type {HTMLButtonElement} */ manualDropButton;
    /** @type {HTMLSpanElement} */ savedCountEl;
    /** @type {HTMLSpanElement} */ lostCountEl;
    /** @type {HTMLSpanElement} */ totalCountEl;
    /** @type {HTMLSpanElement} */ selectedCountEl;
    /** @type {HTMLSpanElement} */ gateChordInfoEl;

    // Abilities Panel elements
    /** @type {HTMLButtonElement} */ pitchUpButton;
    /** @type {HTMLButtonElement} */ pitchDownButton;
    /** @type {HTMLButtonElement} */ tempoUpButton;
    /** @type {HTMLButtonElement} */ tempoDownButton;
    /** @type {HTMLButtonElement} */ muteButton;
    /** @type {HTMLButtonElement} */ soloButton;
    /** @type {HTMLInputElement} */ arpeggiatorSlider;
    /** @type {HTMLSpanElement} */ arpeggiatorValueEl;
    /** @type {HTMLButtonElement} */ quantizeButton;
    /** @type {HTMLSelectElement} */ waveformSelect;
    /** @type {HTMLButtonElement} */ globalKeyChangeButton;

    // Environment Panel elements
    /** @type {HTMLButtonElement} */ placeResonanceFieldButton;
    /** @type {HTMLSpanElement} */ resonanceFieldsLeftEl;
    
    // Accessibility Panel elements
    /** @type {HTMLButtonElement} */ assistModeButton;
    /** @type {HTMLButtonElement} */ colorblindButton;
    /** @type {HTMLButtonElement} */ audioContrastButton;


    /** @param {import('../core/Engine.js').Engine} gameEngine */
    constructor(gameEngine) {
        this.engine = gameEngine;
        this.initDOMElements();
        this.bindEvents();
        this.updateAbilitiesPanel(null); // Initialize disabled
    }

    initDOMElements() {
        // Main HUD
        this.startPauseButton = document.getElementById('start-pause-button');
        this.modeToggleButton = document.getElementById('mode-toggle-button');
        this.manualDropButton = document.getElementById('manual-drop-button');
        this.savedCountEl = document.getElementById('saved-count');
        this.lostCountEl = document.getElementById('lost-count');
        this.totalCountEl = document.getElementById('total-count');
        this.selectedCountEl = document.getElementById('selected-count');
        this.gateChordInfoEl = document.getElementById('chord-info');

        // Abilities Panel
        this.pitchUpButton = document.getElementById('pitch-shift-up-button');
        this.pitchDownButton = document.getElementById('pitch-shift-down-button');
        this.tempoUpButton = document.getElementById('tempo-up-button');
        this.tempoDownButton = document.getElementById('tempo-down-button');
        this.muteButton = document.getElementById('mute-button');
        this.soloButton = document.getElementById('solo-button');
        this.arpeggiatorSlider = document.getElementById('arpeggiator-slider');
        this.arpeggiatorValueEl = document.getElementById('arpeggiator-value');
        this.quantizeButton = document.getElementById('quantize-toggle-button');
        this.waveformSelect = document.getElementById('waveform-select');
        this.globalKeyChangeButton = document.getElementById('global-key-change-button');

        // Environment Panel
        this.placeResonanceFieldButton = document.getElementById('place-resonance-field-button');
        this.resonanceFieldsLeftEl = document.getElementById('resonance-fields-left');
        
        // Accessibility
        this.assistModeButton = document.getElementById('assist-mode-toggle');
        this.colorblindButton = document.getElementById('colorblind-palette-toggle');
        this.audioContrastButton = document.getElementById('audio-only-toggle');

        // Ensure all UI panels are pointer-event enabled
        document.querySelectorAll('.panel').forEach(panel => {
            panel.style.pointerEvents = 'auto';
        });
    }

    bindEvents() {
        // Main HUD
        this.startPauseButton.addEventListener('click', () => this.engine.togglePause());
        this.modeToggleButton.addEventListener('click', () => this.engine.toggleGameMode());
        this.manualDropButton.addEventListener('click', () => this.engine.spawnHarmonoid(undefined, undefined, 'standard')); // Example spawn type

        // Abilities
        this.pitchUpButton.addEventListener('click', () => this.engine.pitchShiftSelected(1));
        this.pitchDownButton.addEventListener('click', () => this.engine.pitchShiftSelected(-1));
        this.tempoUpButton.addEventListener('click', () => this.engine.changeTempo(0.25));
        this.tempoDownButton.addEventListener('click', () => this.engine.changeTempo(-0.25));
        this.muteButton.addEventListener('click', () => this.engine.toggleMuteSelected());
        this.soloButton.addEventListener('click', () => this.engine.toggleSoloSelected());
        this.arpeggiatorSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.arpeggiatorValueEl.textContent = value;
            this.engine.applyArpeggiatorSweep(value);
        });
        this.quantizeButton.addEventListener('click', () => this.engine.toggleQuantize());
        this.waveformSelect.addEventListener('change', (e) => this.engine.setWaveformSelected(e.target.value));
        this.globalKeyChangeButton.addEventListener('click', () => this.engine.globalKeyChange(1)); // Example: Shift up by 1 semitone

        // Environment
        this.placeResonanceFieldButton.addEventListener('click', () => this.engine.requestPlaceResonanceField());
        
        // Accessibility
        this.assistModeButton.addEventListener('click', () => this.engine.toggleAssistMode());
        this.colorblindButton.addEventListener('click', () => this.engine.toggleColorblindPalette());
        this.audioContrastButton.addEventListener('click', () => this.engine.toggleAudioOnlyHighContrast());
    }

    /**
     * @param {number} saved
     * @param {number} lost
     * @param {number} total
     * @param {number} selected
     */
    updateStats(saved, lost, total, selected) {
        this.savedCountEl.textContent = saved;
        this.lostCountEl.textContent = lost;
        this.totalCountEl.textContent = total;
        this.selectedCountEl.textContent = selected;
    }

    /** @param {number[]} gateNotes (MIDI intervals or absolute) */
    updateGateChordDisplay(gateNotes) {
        if (!gateNotes || gateNotes.length === 0) {
            this.gateChordInfoEl.textContent = '-';
            return;
        }
        // This needs more info from the gate (isRelative, current key root if relative)
        // For simplicity, just list the numbers
        const displayNotes = gateNotes.map(n => {
            // Assuming relative for now, music logic needs to formalize representation
            return this.engine.musicLogic.getNoteName(this.engine.musicLogic.globalKeyRootNote + n);
        }).join(', ');
        this.gateChordInfoEl.textContent = displayNotes;
    }

    /** @param {import('../entities/Harmonoid.js').Harmonoid | null} selectedHarmonoid */
    updateAbilitiesPanel(selectedHarmonoid) {
        const isHarmonoidSelected = selectedHarmonoid !== null;
        this.pitchUpButton.disabled = !isHarmonoidSelected;
        this.pitchDownButton.disabled = !isHarmonoidSelected;
        this.muteButton.disabled = !isHarmonoidSelected;
        this.soloButton.disabled = !isHarmonoidSelected;
        this.arpeggiatorSlider.disabled = !isHarmonoidSelected;
        this.waveformSelect.disabled = !isHarmonoidSelected;

        if (isHarmonoidSelected) {
            this.muteButton.textContent = selectedHarmonoid.isMuted ? 'Unmute (M)' : 'Mute (M)';
            this.soloButton.textContent = selectedHarmonoid.isSoloed ? 'Unsolo (O)' : 'Solo (O)';
            this.waveformSelect.value = selectedHarmonoid.waveform;
            this.arpeggiatorSlider.value = selectedHarmonoid.arpeggioOffset; // Sync slider
            this.arpeggiatorValueEl.textContent = selectedHarmonoid.arpeggioOffset;
        } else {
             this.muteButton.textContent = 'Mute (M)';
             this.soloButton.textContent = 'Solo (O)';
        }
    }
    
    updateTempoDisplay(tempo) {
        // No specific tempo display element in HTML, but could update button text or a label
        this.tempoUpButton.textContent = `Tempo + (${tempo.toFixed(2)}x)`;
        this.tempoDownButton.textContent = `Tempo - (${tempo.toFixed(2)}x)`;
    }

    updateQuantizeButton(isQuantized) {
        this.quantizeButton.textContent = `Quantize: ${isQuantized ? 'ON' : 'OFF'}`;
    }
    
    updateResonanceFieldsLeft(count) {
        this.resonanceFieldsLeftEl.textContent = count;
        this.placeResonanceFieldButton.disabled = count <= 0 || this.engine.placingResonanceField;
    }

    /**
     * @param {string} buttonId ID of the button element
     * @param {string} text Text to set for the button
     */
    setButtonState(buttonId, text) {
        const button = document.getElementById(buttonId);
        if (button) button.textContent = text;
    }
    
    /**
     * @param {string} buttonId ID of the button element
     * @param {boolean} enabled True to enable, false to disable
     */
    setButtonEnabled(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button instanceof HTMLButtonElement) button.disabled = !enabled;
    }
}
```

<!-- /src/ui/Panels.css -->
```css
.panel {
    position: absolute;
    background-color: rgba(50, 50, 50, 0.85);
    border: 1px solid #777;
    border-radius: 5px;
    padding: 10px;
    color: #f0f0f0;
    font-size: 12px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
    pointer-events: auto; /* Make panels clickable */
}

#hud {
    top: 10px;
    left: 10px;
    width: calc(100% - 30px); /* Responsive width */
    display: flex;
    gap: 10px;
    align-items: center;
}

#stats-display, #gate-chord-display {
    margin-left: auto; /* Pushes these to the right */
    padding: 5px;
    background-color: rgba(0,0,0,0.3);
    border-radius: 3px;
}


#abilities-panel {
    bottom: 10px;
    left: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-width: 200px;
}

#abilities-panel h4 {
    margin-top: 0;
    margin-bottom: 5px;
    text-align: center;
}

#abilities-panel button, #abilities-panel select {
    padding: 4px 6px;
    font-size: 11px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}
#abilities-panel button:hover:not(:disabled) {
    background-color: #45a049;
}
#abilities-panel button:disabled {
    background-color: #555;
    cursor: not-allowed;
}

#arpeggiator-slider {
    width: calc(100% - 30px); /* Full width minus label space */
    vertical-align: middle;
}


#environment-panel {
    bottom: 10px;
    right: 10px;
    max-width: 200px;
}
#environment-panel h4 { margin-top: 0; margin-bottom: 5px; text-align: center;}
#environment-panel button { margin-bottom: 5px; }

#accessibility-panel {
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}
#accessibility-panel h4 { margin-top: 0; margin-bottom: 5px; text-align: center;}
#accessibility-panel button { width: 100%;}


/* Common button style */
button {
    padding: 6px 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}
button:hover:not(:disabled) {
    background-color: #0056b3;
}
button:disabled {
    background-color: #555;
    cursor: not-allowed;
}

select {
    padding: 4px;
    border-radius: 3px;
    border: 1px solid #666;
    background-color: #333;
    color: #f0f0f0;
}
```

<!-- /levels/level01.json -->
```json
{
    "levelName": "Harmonic Genesis",
    "key": "C",
    "mode": "major",
    "rescueTargetPercentage": 0.6,
    "processionSpawns": [
        {"time": 1, "type": "standard", "x": 80, "y": 50},
        {"time": 3, "type": "standard", "x": 100, "y": 50},
        {"time": 5, "type": "bassoid", "x": 70, "y": 50},
        {"time": 7, "type": "glissoid", "x": 90, "y": 50},
        {"time": 9, "type": "percussoid", "x": 60, "y": 50},
        {"time": 11, "type": "droneoid", "x": 110, "y": 50}
    ],
    "startZone": {"x": 100, "y": 100, "width": 150, "height": 50},
    "exitZone": {"x": 1180, "y": 650, "width": 100, "height": 100},
    "platforms": [
        {"x": 200, "y": 680, "width": 400, "height": 40},
        {"x": 600, "y": 600, "width": 300, "height": 30},
        {"x": 950, "y": 550, "width": 250, "height": 30},
        {"x": 400, "y": 450, "width": 150, "height": 20, "options": {"angle": -0.2}}, 
        {"x": 700, "y": 350, "width": 100, "height": 20, "options": {"isStatic": false, "friction": 0.05}}
    ],
    "harmonicGates": [
        {
            "x": 750, "y": 500, "width": 80, "height": 150, 
            "requiredChordNotes": [0, 4, 7], "isRelativeChord": true, 
            "options": {"label": "MajorTriadGate"}
        }
    ],
    "dissonanceZones": [
        {"x": 500, "y": 200, "width": 200, "height": 150, "options": {}}
    ],
    "frequencyBridges": [
        {
            "x": 300, "y": 300, "width": 200, "height": 20, 
            "requiredTriad": [0, 7], "isRelativeChord": true, "options": {}
        }
    ],
    "amplitudeFans": [
        {"x": 900, "y": 400, "width": 100, "height": 30, "liftForce": 0.03, "options": {}}
    ],
    "phaseShiftPortals": [
        { 
            "id": "portal_pair_1",
            "teleportTargetFrequency": 440,
            "portalA": {"x": 150, "y": 500, "width": 30, "height": 60, "options": {}},
            "portalB": {"x": 1000, "y": 200, "width": 30, "height": 60, "options": {}}
        }
    ],
    "echoChambers": [
        {"x": 1100, "y": 350, "width": 150, "height": 200, "delayTime": 0.3, "feedback": 0.2, "options": {}}
    ],
    "obstacles": [
        {"x": 450, "y": 650, "width": 50, "height": 50, "type": "lowFreqPlate", "options": {"isStatic": false, "mass": 5}},
        {"x": 650, "y": 300, "width": 20, "height": 20, "type": "rhythmPad", "options": {"isStatic": true, "isSensor":true, "customId":"rp1"}}
    ],
    "bossArenas": []
}
```

<!-- /tests/HarmonicGate.test.js -->
```javascript
/**
 * @jest-environment jsdom
 */
import { MusicLogic, A4_HZ, NOTE_NAMES } from '../src/audio/MusicLogic';
import { HarmonicGate } from '../src/mechanics/Gates'; // Path might need adjustment based on test setup
import { Engine } from '../src/core/Engine'; // Mock or minimal version for context

// Minimal mocks for Engine and dependencies if not using full JSDOM setup with modules
// For a real setup, you might mock `Engine` more thoroughly or parts of it.
jest.mock('../src/core/Engine', () => {
    return {
        Engine: jest.fn().mockImplementation(() => ({
            musicLogic: new MusicLogic(mockAudioEngine), // use actual musicLogic
            gameTime: 0,
            // Mock other necessary engine parts
            physics: {
                areBodiesTouching: jest.fn().mockReturnValue(true) // Assume Harmonoids are touching for gate check
            },
            renderer: { add: jest.fn(), remove: jest.fn() },
            environmentalObjects: [],
            harmonoids: []
        }))
    };
});

const mockAudioEngine = {
    playSound: jest.fn(),
    stopSound: jest.fn(),
    updateSound: jest.fn(),
    audioContext: { // Mock AudioContext if MusicLogic or others need it deeply
        currentTime: 0,
        createGain: jest.fn(() => ({ gain: { setValueAtTime: jest.fn() }, connect: jest.fn() })),
        // ... other AC methods
    }
};


describe('HarmonicGate Chord Matching', () => {
    let musicLogic;
    let mockEngineInstance;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine); // Use the actual MusicLogic
        // Default key to C Major for consistent testing. MIDI C4 = 60
        musicLogic.setKey('C', 'major'); // globalKeyRootNote will be 60
        
        mockEngineInstance = {
             musicLogic: musicLogic,
             gameTime: 0,
             physics: { areBodiesTouching: jest.fn().mockReturnValue(true) },
             renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
             harmonoids: [] // will be populated per test
        };
        mockEngineInstance.physics.addStaticBody = jest.fn(()=>({gameObject: null, vertices: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}]}));
    });

    // Helper to create mock Harmonoid objects
    const createMockHarmonoid = (baseNote, pitchOffset = 0, arpeggioOffset = 0) => ({
        id: `h_${Math.random()}`,
        baseNote,
        pitchOffset,
        arpeggioOffset,
        isMuted: false,
        isImplicitlyMuted: false,
        body: {} // mock physics body
    });

    test('should correctly match a C Major triad (relative)', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0, 0, 10, 10, [0, 4, 7], { isRelativeChord: true });
        
        // Harmonoids forming C Major (C4, E4, G4) => MIDI 60, 64, 67
        // musicLogic.globalKeyRootNote is 60 (C4)
        // Relative notes 0, 4, 7 from root C4 = C4, E4, G4
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4 (root + 0)
            createMockHarmonoid(64), // E4 (root + 4)
            createMockHarmonoid(67)  // G4 (root + 7)
        ];
        
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should not match with incorrect notes for C Major triad (relative)', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(63), // D#4 (Incorrect)
            createMockHarmonoid(67)  // G4
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false);
    });
    
    test('should correctly match an F Major triad (absolute MIDI notes)', () => {
        // F Major: F4, A4, C5 => MIDI 65, 69, 72
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [65, 69, 72], { isRelativeChord: false });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(65), // F4
            createMockHarmonoid(69), // A4
            createMockHarmonoid(72)  // C5
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should handle more Harmonoids than required notes if they form the chord', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(64), // E4
            createMockHarmonoid(67), // G4
            createMockHarmonoid(72)  // C5 (Octave of root, still part of C major harmony)
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should not match if not enough Harmonoids for the chord', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(64)  // E4
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false);
    });
    
    test('should respect muted Harmonoids', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), 
            createMockHarmonoid(64, 0, 0), 
            { ...createMockHarmonoid(67), isMuted: true } // G4 is muted
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false); // G4 is muted, chord not complete
    });

    test('gate toggles state correctly', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4], { isRelativeChord: true }); // Requires C, E
        mockEngineInstance.harmonoids = [createMockHarmonoid(60), createMockHarmonoid(64)];
        
        gate.checkHarmonoidsOnGate(); // Open
        expect(gate.isOpen).toBe(true);

        mockEngineInstance.harmonoids = [createMockHarmonoid(60)]; // E leaves
        gate.checkHarmonoidsOnGate(); // Close
        expect(gate.isOpen).toBe(false);
    });
});
```

<!-- /tests/DissonanceZone.test.js -->
```javascript
/**
 * @jest-environment jsdom
 */
import { MusicLogic } from '../src/audio/MusicLogic';
import { DissonanceZone } from '../src/mechanics/DissonanceZone';

// Minimal mocks
jest.mock('../src/core/Engine', () => {
     return {
        Engine: jest.fn().mockImplementation(() => ({
            musicLogic: new MusicLogic(mockAudioEngine),
            physics: { applyForce: jest.fn() },
            renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
            // ...
        }))
    };
});
const mockAudioEngine = { /* as defined in HarmonicGate.test.js */ };

describe('DissonanceZone Score Algorithm', () => {
    let musicLogic;
    let mockEngineInstance;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine);
        musicLogic.setKey('C', 'major');
         mockEngineInstance = {
             musicLogic: musicLogic,
             physics: { applyForce: jest.fn() },
             renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
             // ... other engine parts DissonanceZone might need directly
        };
        mockEngineInstance.physics.addStaticBody = jest.fn(()=>({gameObject: null, vertices: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}]}));
    });

    const createMockHarmonoidWithFreq = (frequency) => ({
        id: `h_freq_${frequency}`,
        currentFrequency: frequency,
        isMuted: false,
        isImplicitlyMuted: false,
        body: { mass:1 } // for force application test
    });

    test('should calculate low dissonance (high harmony score) for consonant intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(67)), // G4 (Perfect Fifth)
        ];
        zone.checkHarmonoids(harmonoids);
        // Harmony for P5 is 1.0 (score 10/10). Dissonance = 1 - 1.0 = 0.0
        expect(zone.currentDissonanceScore).toBeCloseTo(0.0); 
    });

    test('should calculate high dissonance (low harmony score) for dissonant intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(61)), // C#4 (Minor Second)
        ];
        zone.checkHarmonoids(harmonoids);
        // Harmony for m2 is 0.1 (score 1/10). Dissonance = 1 - 0.1 = 0.9
        expect(zone.currentDissonanceScore).toBeCloseTo(0.9);
    });

    test('should have zero dissonance for a single Harmonoid or no Harmonoids', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        zone.checkHarmonoids([createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60))]);
        expect(zone.currentDissonanceScore).toBe(0);
        
        zone.checkHarmonoids([]);
        expect(zone.currentDissonanceScore).toBe(0);
    });
    
    test('should calculate moderate dissonance for mixed intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        // C4, E4 (Major Third, score 8), G#4 (Augmented Fifth from C, Tritone from E)
        // C4 (60), E4 (64), G#4 (68)
        // Intervals: (60,64) -> M3 (score 8). (60,68) -> A5/m6 (score 7 for m6). (64,68) -> M3 (score 8)
        // Avg score: (8+7+8)/3 = 23/3 = 7.66. Harmony: 0.766. Dissonance: 0.233
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(64)), // E4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(68)), // G#4 / Ab4
        ];
        zone.checkHarmonoids(harmonoids);
        expect(zone.currentDissonanceScore).toBeCloseTo(1 - ((8+7+8)/3 / 10), 2); // Dissonance approx 0.23
    });

    test('should apply erratic forces to Harmonoids in high dissonance', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
         const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(61)), // C#4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(62)), // D4 (Cluster)
        ];
        // This should create high dissonance.
        // C-C# (m2, score 1), C-D (M2, score 5), C#-D (m2, score 1)
        // Avg (1+5+1)/3 = 7/3 = 2.33. Harmony 0.233. Dissonance = 0.767
        
        // Mock Math.random to make force application predictable for test
        const mockMath = Object.create(global.Math);
        mockMath.random = () => 0.05; // Always triggers force if threshold is 0.1
        global.Math = mockMath;

        zone.checkHarmonoids(harmonoids);
        expect(zone.currentDissonanceScore).toBeGreaterThan(0.7); // Ensure high dissonance
        
        // Check if applyForce was called (assuming Math.random allows it)
        expect(mockEngineInstance.physics.applyForce).toHaveBeenCalled();
        // Can check how many times if Math.random makes it certain. Here, 3 harmonoids, potentially 3 calls.
        expect(mockEngineInstance.physics.applyForce.mock.calls.length).toBeGreaterThanOrEqual(1);

        // Restore Math.random
        global.Math = Object.getPrototypeOf(mockMath);
    });
});
```

<!-- /tests/Physics.test.js -->
```javascript
/**
 * @jest-environment jsdom
 */
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';
import { Physics } from '../src/core/Physics'; // Assuming direct import possible

describe('Physics System Tests', () => {
    let physics;

    beforeEach(() => {
        physics = new Physics();
    });

    test('Harmonoid should not fall through a thin static platform', () => {
        // Create a thin platform
        const platform = physics.addStaticBody(300, 500, 200, 5, { label: 'thinPlatform' }); // 5px high

        // Create a "Harmonoid" body above it
        const harmonoidBody = physics.addCircularBody(300, 450, 15, { label: 'harmonoid' }); // 15px radius

        // Simulate a few steps of the physics engine
        for (let i = 0; i < 100; i++) { // Simulate for enough time for it to fall and settle
            physics.update(16 / 1000); // Simulate 16ms ticks
        }
        
        // Check if the Harmonoid is resting on or very near the platform surface
        // Platform surface Y = 500 - height/2 = 500 - 2.5 = 497.5
        // Harmonoid bottom Y = position.y + radius = position.y + 15
        const platformTopY = platform.position.y - platform.bounds.min.y; // Simpler: platform.bounds.min.y
        const harmonoidBottomY = harmonoidBody.position.y + 15;

        // Expect Harmonoid's bottom to be at or slightly above platform's top surface.
        // There might be slight penetration or separation due to Matter.js solver iterations and restitution.
        expect(harmonoidBottomY).toBeLessThanOrEqual(platform.bounds.min.y + 1.0); // Check it's not significantly below (e.g. allowing 1px penetration)
        expect(harmonoidBody.position.y).toBeLessThan(platform.position.y + 15 + 5); // Check it's generally above the platform center
                                                                                     // (Harmonoid center should be above platform center - platform_height/2 - harmonoid_radius)
        
        // A more robust check: ensure the vertical velocity is near zero after settling.
        expect(harmonoidBody.velocity.y).toBeCloseTo(0, 1); // Velocity should be very small after settling

        // Check that it's not below the platform's center by a large margin
        expect(harmonoidBody.position.y).toBeLessThan(platform.position.y + platform.circleRadius + (5 /*platform height*/)/2 + 15 /*harmonoid radius*/ );

        // More specific position check (y position of harmonoid should be roughly platformY - platformHeight/2 - harmonoidRadius)
        const expectedRestY = platform.position.y - (5/2) - 15;
        expect(harmonoidBody.position.y).toBeCloseTo(expectedRestY, 0); // Tolerance for settling. 0 precision for y.

    });

    test('Dynamic body should fall due to gravity', () => {
        const dynamicBody = physics.addRectangularBody(100, 100, 20, 20);
        const initialY = dynamicBody.position.y;

        for (let i = 0; i < 50; i++) {
            physics.update(16 / 1000);
        }

        expect(dynamicBody.position.y).toBeGreaterThan(initialY);
    });
    
    test('Static body should not move due to gravity or applied force', () => {
        const staticBody = physics.addStaticBody(100, 100, 50, 50);
        const initialPos = { ...staticBody.position };

        // Apply force (should be ignored for static bodies if not specifically handled)
        Matter.Body.applyForce(staticBody, staticBody.position, { x: 0.1, y: 0.1 });
        
        for (let i = 0; i < 50; i++) {
            physics.update(16 / 1000);
        }

        expect(staticBody.position.x).toBe(initialPos.x);
        expect(staticBody.position.y).toBe(initialPos.y);
        expect(staticBody.velocity.x).toBe(0);
        expect(staticBody.velocity.y).toBe(0);
    });
});
```

<!-- /tests/Fuzz.test.js -->
```javascript
/**
 * @jest-environment jsdom
 */
import { MusicLogic } from '../src/audio/MusicLogic';

// Minimal mock for AudioEngine if MusicLogic instantiation requires it
const mockAudioEngine = { /* ... */ };

describe('MusicLogic Harmony Fuzz Testing', () => {
    let musicLogic;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine);
    });

    // Property-based fuzz test for calculateOverallHarmony
    test('calculateOverallHarmony should return a score between 0 and 1 for random frequency clusters', () => {
        const NUM_TEST_CASES = 100;
        const MAX_HARMONOIDS = 10;
        const MAX_MIDI_NOTE = 80; // Realistic upper MIDI note
        const MIN_MIDI_NOTE = 40; // Realistic lower MIDI note

        for (let i = 0; i < NUM_TEST_CASES; i++) {
            const numHarmonoids = Math.floor(Math.random() * MAX_HARMONOIDS) + 1; // 1 to MAX_HARMONOIDS
            const mockHarmonoids = [];

            for (let j = 0; j < numHarmonoids; j++) {
                const randomMidiNote = Math.floor(Math.random() * (MAX_MIDI_NOTE - MIN_MIDI_NOTE + 1)) + MIN_MIDI_NOTE;
                mockHarmonoids.push({
                    id: `h_fuzz_${j}`,
                    currentFrequency: musicLogic.midiToFrequency(randomMidiNote),
                    isPlayingSound: true,
                    isMuted: false,
                    isImplicitlyMuted: false
                });
            }
            
            musicLogic.updateActiveHarmonoids(mockHarmonoids);
            const harmonyScore = musicLogic.calculateOverallHarmony();

            expect(harmonyScore).toBeGreaterThanOrEqual(0);
            expect(harmonyScore).toBeLessThanOrEqual(1);
            // Could add more specific assertions if there are known edge cases or invariants
            // e.g. if all frequencies are identical, score should be 1 (or via interval table, unison = 10 -> 1.0)
        }
    });

    test('calculateOverallHarmony with unison frequencies should be max harmony', () => {
        const freq = musicLogic.midiToFrequency(60); // C4
        const harmonoids = [
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false },
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false  },
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false  }
        ];
        musicLogic.updateActiveHarmonoids(harmonoids);
        const harmonyScore = musicLogic.calculateOverallHarmony();
        // Unison pairs should score 10. (10/10 = 1.0)
        expect(harmonyScore).toBeCloseTo(1.0); 
    });

    test('checkChord handles various inputs robustly', () => {
        const NUM_TEST_CASES = 50;
        musicLogic.setKey('C','major'); // root = 60

        for (let i = 0; i < NUM_TEST_CASES; i++) {
            const numCurrentNotes = Math.floor(Math.random() * 5) +1; // 1-5 current notes
            const numTargetNotes = Math.floor(Math.random() * 3) +1; // 1-3 target notes

            const currentNotes = Array.from({length: numCurrentNotes}, () => Math.floor(Math.random()*24) + 50); // Random MIDI notes
            const targetChordNotesRelative = Array.from({length: numTargetNotes}, () => Math.floor(Math.random()*12)); // Random relative intervals
            const targetChordNotesAbsolute = Array.from({length: numTargetNotes}, () => Math.floor(Math.random()*24)+50);

            // Test relative chord check
            let resultRelative = false;
            expect(() => {
                 resultRelative = musicLogic.checkChord(currentNotes, targetChordNotesRelative, true, musicLogic.globalKeyRootNote);
            }).not.toThrow();
            expect(typeof resultRelative).toBe('boolean');

            // Test absolute chord check
            let resultAbsolute = false;
            expect(() => {
                 resultAbsolute = musicLogic.checkChord(currentNotes, targetChordNotesAbsolute, false);
            }).not.toThrow();
            expect(typeof resultAbsolute).toBe('boolean');
        }

         // Test empty inputs
        expect(musicLogic.checkChord([], [0,4,7])).toBe(false);
        expect(musicLogic.checkChord([60,64,67], [])).toBe(true); // An empty requirement is always met if currentNotes exists.
                                                                // Depending on definition, could be false. Current definition of checking FOR required should be true.
        expect(musicLogic.checkChord([], [])).toBe(true); 
    });

});
```

<!-- /README.md -->
```markdown
# Harmonoids: Symphony of Survival

Harmonoids is a 2-D browser puzzle-platformer where you guide a procession of musical creatures (Harmonoids) to safety. Your actions are musical: change pitch, tempo, waveform, and manipulate the environment through sound-based mechanics.

This is a client-side only game built with Vanilla HTML/CSS/JavaScript (ES Modules), PixiJS for rendering, and Matter.js for physics.

## Features Demoed

This version aims to showcase all core mechanics in a single demo level:

*   **Harmonoids (4 types + Standard):**
    *   **Standard:** Basic sine-wave tone.
    *   **Bassoids:** Low octave tone, can vibrate low-frequency plates.
    *   **Glissoids:** Portamento glide, can slip through 1-tile gaps and accelerate on slopes.
    *   **Percussoids:** Percussive pop on landing, triggers rhythm pads with a shockwave.
    *   **Droneoids:** Sustained organ-like tone, can hover and become a temporary platform when solo-muted.
*   **Player Musical Actions:**
    *   Pitch Shift (selected Harmonoids ± semitones) - Keys `A` (down) / `S` (up) or UI
    *   Tempo Change (global game speed ±)
    *   Create Resonance Field (click to place, limited quantity) - Key `R` or UI
    *   Mute / Solo (selected Harmonoids) - Keys `M` (mute) / `O` (solo) or UI
    *   Arpeggiator Sweep (selected Harmonoids, temporary pitch offset via slider)
    *   Rhythm Quantize toggle (conceptual, UI toggle present)
    *   Waveform Morph (selected Harmonoids: sine, square, sawtooth)
    *   One-shot Global Key Change (shifts all active notes and musical context)
*   **Game Modes:**
    *   **Procession Mode:** Harmonoids auto-spawn based on level data.
    *   **Manual Drop Mode:** Player spawns Harmonoids via a button.
*   **Environmental "Toys":**
    *   **Harmonic Gate:** Opens if Harmonoids on/in it form a specific chord.
    *   **Dissonance Zone:** Area where conflicting Harmonoid frequencies create visual chaos and can affect Harmonoid behavior. Score based on dissonance.
    *   **Frequency Bridge:** Becomes solid if Harmonoids on it sustain a specific triad.
    *   **Amplitude Fan:** Lifts Harmonoids based on the collective volume of those above it.
    *   **Phase-Shift Portals:** Teleports Harmonoids if their frequency matches a target (simplified from true phase).
    *   **Echo Chamber:** Captures sounds and re-emits them with a delay.
*   **Meta System Stubs:**
    *   Harmonics currency: Tracked via "Saved" count, no actual upgrade store yet.
    *   Boss arenas: Conceptual, level might contain a "gate" that represents a harmony challenge.
    *   Shareable puzzles via URL Hash: Level can be loaded from a base64 encoded JSON in the URL hash (`#BASE64_JSON_LEVEL_DATA`).

## How to Run

1.  Ensure you have a modern web browser (Chrome, Firefox, Edge, Safari).
2.  You need a simple HTTP server to serve the files correctly due to ES Module security restrictions (CORS). `npx http-server` is a good choice.
    *   If you don't have Node.js/npm, you can install it from [nodejs.org](https://nodejs.org/).
    *   Once Node.js is installed, open a terminal or command prompt in the root directory of this game.
    *   Run the command: `npx http-server .`
3.  Open your browser and navigate to the address provided by `http-server` (usually `http://localhost:8080` or similar).

## Controls

*   **Mouse Click:** Select Harmonoid / Place Resonance Field (when active).
*   **Shift + Mouse Click:** Add/Remove Harmonoid from multi-selection.
*   **P:** Toggle Pause/Resume game.
*   **R:** Activate "Place Resonance Field" mode (then click on map).
*   **A:** Pitch Shift selected Harmonoid(s) DOWN by 1 semitone.
*   **S:** Pitch Shift selected Harmonoid(s) UP by 1 semitone.
*   **M:** Toggle Mute for selected Harmonoid(s).
*   **O:** Toggle Solo for selected Harmonoid(s). (Note: 'O' often used for Solo in DAWs).
*   **UI Buttons:** Most actions are also available through the on-screen UI panels.

## Level JSON Schema (`/levels/level01.json`)

The level file is a JSON object with the following main properties:

*   `levelName`: (string) Display name of the level.
*   `key`: (string) Musical key of the level (e.g., "C", "G#", "Bb").
*   `mode`: (string) Musical mode (e.g., "major", "minor"). Affects harmony calculations.
*   `rescueTargetPercentage`: (number, 0.0-1.0) Fraction of spawned Harmonoids needed to win.
*   `processionSpawns`: (array of objects) Defines auto-spawning Harmonoids.
    *   `time`: (number) Game time (seconds) to spawn.
    *   `type`: (string) Type of Harmonoid (e.g., "standard", "bassoid").
    *   `x`, `y`: (number, optional) Spawn coordinates. Defaults to StartZone or fixed point.
*   `startZone`: (object) Defines the Harmonoid spawn area.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
*   `exitZone`: (object) Defines the goal area.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
*   `platforms`: (array of objects) Static or dynamic platforms.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
    *   `options`: (object, optional) Matter.js body options (e.g., `isStatic`, `angle`, `friction`).
*   `harmonicGates`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `requiredChordNotes`: (array of numbers) MIDI note intervals (if `isRelativeChord` true) or absolute MIDI notes.
    *   `isRelativeChord`: (boolean, optional, default true) Whether `requiredChordNotes` are relative to level key root.
    *   `options`: (object, optional) Matter.js options.
*   `dissonanceZones`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `options`: (object, optional)
*   `frequencyBridges`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `requiredTriad`: (array of numbers) MIDI notes for activation (see `HarmonicGate`).
    *   `isRelativeChord`: (boolean, optional, default true)
    *   `options`: (object, optional)
*   `amplitudeFans`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `liftForce`: (number) Max upward force.
    *   `options`: (object, optional)
*   `phaseShiftPortals`: (array of objects) Defines a pair of portals.
    *   `id`: (string) A unique group ID for this pair of portals.
    *   `teleportTargetFrequency`: (number) The frequency (in Hz) that a Harmonoid must emit to use the portal.
    *   `portalA`: (object) `x, y, width, height, options` for the first portal.
    *   `portalB`: (object) `x, y, width, height, options` for the second portal.
*   `echoChambers`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `delayTime`: (number) Echo delay in seconds.
    *   `feedback`: (number, 0-1) Echo feedback gain.
    *   `options`: (object, optional)
*   `obstacles`: (array of objects) General interactive physics objects.
    *   `x`, `y`, `width`, `height`: (number)
    *   `type`: (string) e.g., "lowFreqPlate", "rhythmPad", "breakable".
    *   `options`: (object, optional) (e.g. `isStatic`, `mass`, `customId`).

## Development & Quality

*   **Code Style:** Adheres to ES2023, TypeScript-like JSDoc, DRY, KISS, single-responsibility principles.
*   **Testing:** Jest tests are provided for some core logic in the `/tests/` directory. To run tests:
    1.  `npm install --save-dev jest jest-environment-jsdom` (if not already present and you want to modify/run tests via npm)
    2.  Configure `package.json` (not included in this deliverable) or run Jest directly: `npx jest`
*   **Linting (Recommended):**
    Use ESLint with a configuration like `airbnb-base`. Example `.eslintrc.json`:
    ```json
    {
        "env": { "browser": true, "es2021": true, "jest": true },
        "extends": "airbnb-base",
        "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
        "rules": {
            "import/extensions": ["error", "always"], // for ES Modules with full paths
            "no-console": "warn", // Allow console for demo purposes
            "class-methods-use-this": "off" // Can be verbose for simple classes
        }
    }
    ```
*   **Git Hooks Sample (for `.git/hooks/pre-commit`):**
    Make this file executable (`chmod +x .git/hooks/pre-commit`).
    ```sh
    #!/bin/sh
    # Example: Lint staged JavaScript files before commit
    # npx eslint --fix $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx)$')
    # For this project specifically:
    npx eslint src/**/*.js tests/**/*.test.js
    
    # To run tests before commit (optional):
    # npx jest
    # if [ $? -ne 0 ]; then
    #  echo "Jest tests failed. Commit aborted."
    #  exit 1
    # fi
    exit 0 
    ```

## Future Extensibility Notes

*   **Audio:** The `AudioEngine` can be expanded with more complex synthesis, effects (filters, distortion), and more robust oscillator pooling/voice management. Using `AudioBufferSourceNode` for complex/sampled sounds.
*   **Visuals:** `Renderer` can incorporate shaders, particle systems, and more detailed sprites.
*   **Physics:** More complex physics interactions, custom collision filtering, soft bodies.
*   **AI:** More sophisticated Harmonoid behaviors, pathfinding.
*   **Meta-Systems:**
    *   **Worlds & Progression:** Implement a system for multiple levels grouped by musical keys/modes, unlocking new abilities or Harmonoid types.
    *   **Bosses:** Design "Cacophony Beast" or "Drone Golem" with unique mechanics requiring specific harmonic solutions.
    *   **Upgrades:** Integrate "Harmonics" currency with a system to purchase upgrades (e.g., more Resonance Fields, ability enhancements).
    *   **WebRTC Co-op:** Split-screen or networked co-op could be added, where players control different aspects of the musical manipulation or groups of Harmonoids. Audio synchronization would be a challenge.

This codebase provides a strong foundation for further development of "Harmonoids: Symphony of Survival."
```
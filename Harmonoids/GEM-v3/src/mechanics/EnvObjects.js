import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

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
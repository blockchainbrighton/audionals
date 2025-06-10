import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

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
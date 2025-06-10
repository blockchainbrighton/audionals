import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';


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
import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';


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
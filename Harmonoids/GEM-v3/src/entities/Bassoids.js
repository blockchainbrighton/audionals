import { Harmonoid } from './Harmonoid.js';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';


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
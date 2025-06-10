import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

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
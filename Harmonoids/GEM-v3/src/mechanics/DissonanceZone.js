import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

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
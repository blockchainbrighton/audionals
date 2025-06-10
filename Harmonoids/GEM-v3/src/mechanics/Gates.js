import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

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
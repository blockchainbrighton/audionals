import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';
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
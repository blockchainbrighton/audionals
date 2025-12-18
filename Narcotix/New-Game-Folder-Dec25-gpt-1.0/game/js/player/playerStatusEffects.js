// js/player/playerStatusEffects.js

export const statusEffectsProperties = {
    statusEffects: [],
};

export function initStatusEffects() {
    // 'this' refers to player object
    this.statusEffects = [];
    this.updatePlayerStatusDisplay(); 
}

export function applyStatusEffect(name, duration, data = {}) {
    // 'this' refers to player object
    this.statusEffects = this.statusEffects.filter(e => e.name !== name || (e.name === "C-Burst" && e.data.speedMultiplier > data.speedMultiplier));
    
    const effect = { name, duration, remainingTime: duration, data };

    if (name === "System Glitch") { this.game.utils.addMessage("System Glitch! Input matrix scrambled!"); }
    else if (name === "Ghosting") { this.game.utils.addMessage("Ghosting active. Evading sensors...");}
    else if (name === "Kaos Frenzy") {
        this.game.utils.addMessage("KAOS FRENZY! Unleash the absurd!");
        this.game.enemyManager.list.forEach(e => {
            if (this.game.utils.distance(this.x, this.y, e.x, e.y) < e.detectionRange * 2.5) e.alertToPosition(this.x, this.y);
        });
    }
    else if (name === "Sys-Marked") { this.game.utils.addMessage("System mark acquired! Hostiles prioritizing your signature."); }

    this.statusEffects.push(effect);
    this.updatePlayerStatusDisplay(); 
}

export function updateStatusEffects(deltaTime) {
    // 'this' refers to player object
    let changed = false;
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
        const e = this.statusEffects[i];
        e.remainingTime -= deltaTime * 1000;
        if (e.remainingTime <= 0) {
            this.game.utils.addMessage(`Effect "${e.name}" expired.`);
            this.statusEffects.splice(i, 1);
            changed = true;
        }
    }

    const speedBoosts = this.statusEffects.filter(e => e.name === "C-Burst" || e.name === "Kaos Frenzy");
    let maxMultiplier = 1;
    if(speedBoosts.length > 0) {
        maxMultiplier = Math.max(...speedBoosts.map(sb => sb.data.speedMultiplier || 1)); // Ensure default of 1 if speedMultiplier is missing
    }
    const newSpeed = this.baseSpeed * maxMultiplier;
    if (this.speed !== newSpeed) {
        this.speed = newSpeed; 
        changed = true; 
    }

    if (changed) {
        this.updatePlayerStatusDisplay(); 
    }
}

export function hasStatusEffect(name) {
    // 'this' refers to player object
    return this.statusEffects.some(e => e.name === name);
}

export function isStealthed() {
    // 'this' refers to player object
    return this.hasStatusEffect("Ghosting");
}

export function isConfused() {
    // 'this' refers to player object
    return this.hasStatusEffect("System Glitch");
}

export function updatePlayerStatusDisplay() {
    // 'this' refers to player object
    const s = document.getElementById('playerStatus');
    if (!s) return;
    if (!this.statusEffects) return; 
    s.textContent = this.statusEffects.length > 0 ? this.statusEffects.map(e => `${e.name}(${Math.ceil(e.remainingTime/1000)}s)`).join(', ') : "Nominal";
}
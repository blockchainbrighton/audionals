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

    // Aggregate Modifiers
    let totalSpeedMult = 1.0;
    let totalDmgMult = 1.0;
    let totalDefMult = 1.0;
    let totalScaleMult = 1.0;
    
    // Physics / Time Overrides
    let activeCollisionMode = 'STANDARD';
    let timeDilation = 1.0;
    
    // Aura Logic
    let activeDamageAura = 0;
    let magneticRange = 0;

    // Apply Gang Modifiers
    if (this.gang) {
        if (this.gang.SpeedMod) totalSpeedMult *= this.gang.SpeedMod;
        if (this.gang.DamageMod) totalDmgMult *= this.gang.DamageMod;
        if (this.gang.DefenseMod) totalDefMult *= this.gang.DefenseMod;
    }

    for (const e of this.statusEffects) {
        if (e.data.speedMultiplier) totalSpeedMult *= e.data.speedMultiplier;
        if (e.data.damageMultiplier) totalDmgMult *= e.data.damageMultiplier;
        if (e.data.defenseMultiplier) totalDefMult *= e.data.defenseMultiplier;
        if (e.data.renderScale) totalScaleMult *= e.data.renderScale;
        
        // Handle New Mechanics
        if (e.data.collisionMode) activeCollisionMode = e.data.collisionMode;
        if (e.data.timeScale) timeDilation = e.data.timeScale;
        if (e.data.damageAura) activeDamageAura = Math.max(activeDamageAura, e.data.damageAura);
        if (e.data.magneticRange) magneticRange = Math.max(magneticRange, e.data.magneticRange);
    }

    // Apply Physics/Time
    const prevCollisionMode = this.collisionMode;
    this.collisionMode = activeCollisionMode;
    
    // Apply Scale
    if (this.renderScale !== totalScaleMult) {
        this.renderScale = totalScaleMult;
        changed = true;
    }

    // Check for "Unstuck" requirement when phasing ends
    if (prevCollisionMode !== 'STANDARD' && activeCollisionMode === 'STANDARD') {
        this.ensureSafePosition();
    }

    if (this.game.timeScale !== timeDilation) {
        this.game.timeScale = timeDilation; // Apply global time scale
    }

    // Process Auras (Tick based)
    if (activeDamageAura > 0) {
        // Simple tick throttle - every 0.5s
        const now = Date.now();
        if (!this._lastAuraTick || now - this._lastAuraTick > 500) {
            this._lastAuraTick = now;
            this.game.enemyManager.list.forEach(enemy => {
                if (this.game.utils.distance(this.x, this.y, enemy.x, enemy.y) < 100) { // 100px radius
                    enemy.takeDamage(activeDamageAura);
                    this.game.particleManager.createEffect(enemy.x, enemy.y, 'spark', 3);
                }
            });
        }
    }
    
    if (magneticRange > 0) {
        // Magnetism: Pull items towards player
        this.game.entities.forEach(ent => {
             // Basic check if it's an item (WorldItem class)
             if (ent.itemData) {
                 const dist = this.game.utils.distance(this.x, this.y, ent.x, ent.y);
                 if (dist < magneticRange) {
                     // Pull
                     const angle = Math.atan2(this.y - ent.y, this.x - ent.x);
                     ent.x += Math.cos(angle) * 5; // Pull speed
                     ent.y += Math.sin(angle) * 5;
                 }
             }
        });
    }

    // Apply Speed
    const newSpeed = this.baseSpeed * totalSpeedMult;
    if (this.speed !== newSpeed) {
        this.speed = newSpeed;
        changed = true;
    }

    // Apply Damage & Defense Modifiers (Store on player for combat module to use)
    if (this.damageMultiplier !== totalDmgMult) {
        this.damageMultiplier = totalDmgMult;
        changed = true;
    }
    if (this.defenseMultiplier !== totalDefMult) {
        this.defenseMultiplier = totalDefMult;
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
    const effList = document.getElementById('activeEffectsList');
    
    if (s) {
        let statusText = "Nominal";
        if (this.statusEffects.length > 0) statusText = "Modified";
        if (this.gang) statusText = `[${this.gang.GangName}] ` + statusText;
        s.textContent = statusText;
    }

    if (effList) {
        if (this.statusEffects.length === 0) {
            effList.innerHTML = '<div style="color:#555;">No active subroutines.</div>';
        } else {
            effList.innerHTML = this.statusEffects.map(e => {
                const time = Math.ceil(e.remainingTime/1000);
                let color = '#0F0'; // Good
                // Heuristic for bad effects
                if (e.name.includes('Toxic') || e.name.includes('Glitch') || e.name.includes('Sluggish')) color = '#F66';
                
                // Add details if available (e.g., multipliers)
                let details = [];
                if (e.data.speedMultiplier) details.push(`SPD x${e.data.speedMultiplier}`);
                if (e.data.damageMultiplier) details.push(`DMG x${e.data.damageMultiplier}`);
                if (e.data.defenseMultiplier) details.push(`DEF x${e.data.defenseMultiplier}`);
                if (e.data.renderScale) details.push(`SCALE x${e.data.renderScale}`);
                if (e.data.timeScale) details.push(`TIME x${e.data.timeScale}`);
                if (e.data.collisionMode && e.data.collisionMode !== 'STANDARD') details.push(`${e.data.collisionMode}`);
                
                const detailStr = details.length > 0 ? ` <span style="color:#CCC;">(${details.join(', ')})</span>` : '';

                return `<div style="display:flex; justify-content:space-between; color:${color};">
                    <span>${e.name}${detailStr}</span>
                    <span>${time}s</span>
                </div>`;
            }).join('');
        }
    }
}
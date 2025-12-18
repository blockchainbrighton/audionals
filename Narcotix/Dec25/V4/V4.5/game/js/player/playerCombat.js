// js/player/playerCombat.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types

export const combatProperties = {
    lastAttackTime: 0,
    isReloading: false,
    reloadStartTime: 0,
    reloadDuration: 0,
    activeReloadTriggered: false,
};

export function initCombat() {
    // 'this' refers to player object
    this.lastAttackTime = 0;
    if (!this.equippedWeapon) {
        this.equipWeaponById(Weapons.UNARMED_STATS.id);
    }
}

export function attack() {
    // 'this' refers to player object
    if (!this.equippedWeapon) {
        this.game.utils.addMessage("No weapon equipped!");
        if (!this.equippedWeapon) this.equipWeaponById(Weapons.UNARMED_STATS.id);
        if (!this.equippedWeapon) return; 
    }

    const now = Date.now();
    if (now - this.lastAttackTime < this.equippedWeapon.attackSpeed) return;

    if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        if (this.equippedWeapon.currentAmmo <= 0) {
            this.game.utils.addMessage(`${this.equippedWeapon.name} is empty! Press 'R' to reload.`);
            this.lastAttackTime = now; 
            return;
        }
        this.equippedWeapon.currentAmmo--;
    }

    this.lastAttackTime = now;
    this.startAttackAnim(); // Trigger visual animation

    // Play Sound
    if (this.game.soundManager) this.game.soundManager.playShoot();

    // this.game.utils.addMessage(`${this.equippedWeapon.name} deployed!`); // Too spammy?
    let attacked = false;

    // Apply Damage Multiplier
    const damageMult = this.damageMultiplier || 1.0;
    let finalDamage = Math.floor(this.equippedWeapon.damage * damageMult);

    // Apply Gang Luck (Critical Hit)
    let isCrit = false;
    if (this.gang && this.gang.LuckMod) {
        if (Math.random() < this.gang.LuckMod) {
            isCrit = true;
            finalDamage *= 2; 
        }
    }

    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;

    if (this.equippedWeapon.type === Weapons.weaponTypes.MELEE || this.equippedWeapon.type === Weapons.weaponTypes.UNARMED) {
        this.game.enemyManager.list.forEach(enemy => {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            if (this.game.utils.distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) < this.equippedWeapon.effectiveRange) {
                const wasAlive = enemy.currentHp > 0;
                enemy.takeDamage(finalDamage);
                
                if (wasAlive && enemy.currentHp <= 0) {
                    this.applyOnKillEffect(); // Trigger Gang Effect
                }

                if (this.game.particleManager) {
                     this.game.particleManager.createEffect(enemyCenterX, enemyCenterY, 'blood', 10);
                }
                if (isCrit && this.game.floatingTextManager) {
                    this.game.floatingTextManager.addText(enemyCenterX, enemyCenterY - 20, "CRIT!", '#FFFF00');
                }
                attacked = true;
            }
        });
    } else if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        // RANGED ATTACK LOGIC (Mouse Aim)
        
        // Use this.aimAngle (calculated in playerCore from mouse pos)
        const aimAngle = this.aimAngle || 0;
        
        const cosA = Math.cos(aimAngle);
        const sinA = Math.sin(aimAngle);

        // --- Spawn Visual Projectile (Tracer) ---
        if (this.game.projectileManager && typeof this.game.projectileManager.addProjectile === 'function') {
            const projectileSpeed = 800; // Pixels per second
            
            // Calculate Muzzle Position (Top-Down)
            // Offset roughly to the "right" side of body (where gun is drawn)
            // Forward offset + Side offset
            const fwdOffset = this.width * 0.6; 
            const sideOffset = this.width * 0.3; // Right side
            
            // Rotate offset vector by aimAngle
            // Rotated vector: x' = x*cos - y*sin, y' = x*sin + y*cos
            // BUT our "base" is aiming Right (0).
            // Forward is X, Side (Right) is Y+ (in canvas coords).
            // So relative point is (fwdOffset, sideOffset).
            
            const muzzleX = playerCenterX + (fwdOffset * cosA - sideOffset * sinA);
            const muzzleY = playerCenterY + (fwdOffset * sinA + sideOffset * cosA);

            const vx = cosA * projectileSpeed;
            const vy = sinA * projectileSpeed;

            this.game.projectileManager.addProjectile({
                x: muzzleX,
                y: muzzleY,
                vx: vx,
                vy: vy,
                size: this.equippedWeapon.projectileType === 'bullet_heavy' ? 4 : 3, 
                color: this.equippedWeapon.projectileColor || '#FFFF00', 
                maxLife: (this.equippedWeapon.effectiveRange / projectileSpeed) * 1000, 
                owner: 'player',
                damage: 0 // Visual only
            });
        }
        // --- End Visual Projectile ---


        // Hitscan Logic
        // Find enemies within cone of aimAngle
        const sortedEnemies = [...this.game.enemyManager.list].sort((a, b) =>
            this.game.utils.distance(playerCenterX, playerCenterY, a.x + a.width / 2, a.y + a.height / 2) -
            this.game.utils.distance(playerCenterX, playerCenterY, b.x + b.width / 2, b.y + b.height / 2)
        );
        
        for (const enemy of sortedEnemies) {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const distToEnemy = this.game.utils.distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);

            if (distToEnemy < this.equippedWeapon.effectiveRange) {
                // Check angle
                const angleToEnemy = Math.atan2(enemyCenterY - playerCenterY, enemyCenterX - playerCenterX);
                
                // Difference between aimAngle and angleToEnemy
                let angleDiff = Math.abs(aimAngle - angleToEnemy);
                // Handle wrap-around (PI to -PI)
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                // Cone (e.g., 0.2 radians ~ 11 degrees)
                const accuracy = this.equippedWeapon.accuracyCone || 0.2;
                
                if (angleDiff < accuracy) { 
                    const wasAlive = enemy.currentHp > 0;
                    enemy.takeDamage(finalDamage);
                    
                    if (wasAlive && enemy.currentHp <= 0) {
                        this.applyOnKillEffect(); // Trigger Gang Effect
                    }
                    
                    if (this.game.particleManager) {
                        this.game.particleManager.createEffect(enemyCenterX, enemyCenterY, 'blood', 8);
                    }
                    if (isCrit && this.game.floatingTextManager) {
                        this.game.floatingTextManager.addText(enemyCenterX, enemyCenterY - 20, "CRIT!", '#FFFF00');
                    }

                    this.game.utils.addMessage(`Hit ${enemy.name || 'target'} for ${finalDamage}${isCrit ? ' (CRIT!)' : ''}!`);
                    attacked = true;
                    break; // Bullet hits first target (no penetration for now)
                }
            }
        }
        
        if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
            this.game.hud.updateWeaponInfo(this.equippedWeapon);
        } else {
            this.renderInventory(); 
        }
    }

    if (!attacked && this.equippedWeapon.type === Weapons.weaponTypes.RANGED){
         // this.game.utils.addMessage("...Shot went wide."); // Optional spam
    }
}

export function reloadEquippedWeapon() {
    // 'this' refers to player object
    if (!this.equippedWeapon || this.equippedWeapon.type !== Weapons.weaponTypes.RANGED) {
        this.game.utils.addMessage("No reloadable weapon equipped.");
        return;
    }
    if (this.equippedWeapon.currentAmmo >= this.equippedWeapon.ammoCapacity) {
        this.game.utils.addMessage("Clip full.");
        return;
    }
    if (this.isReloading) {
        this.attemptActiveReload();
        return;
    }

    // START RELOAD
    this.isReloading = true;
    this.reloadStartTime = Date.now();
    this.reloadDuration = 2000; // 2 seconds default
    this.activeReloadTriggered = false;
    
    this.game.utils.addMessage("Reloading... Press 'R' in the zone!");
}

export function attemptActiveReload() {
    if (!this.isReloading || this.activeReloadTriggered) return;

    const elapsed = Date.now() - this.reloadStartTime;
    const progress = elapsed / this.reloadDuration;

    // Sweet spot: 50% to 70%
    if (progress >= 0.5 && progress <= 0.7) {
        this.game.utils.addMessage("PERFECT RELOAD! Damage Boost!");
        this.applyStatusEffect("Active Reload Boost", 5000, { damageMultiplier: 1.5 });
        this.completeReload();
        if(this.game.soundManager) this.game.soundManager.playPickup(); 
    } else {
        this.game.utils.addMessage("Jam! Reload delayed.");
        this.reloadDuration += 1000; // Penalty
        this.activeReloadTriggered = true; 
    }
}

export function updateReload(dt) {
    if (!this.isReloading) return;

    if (Date.now() - this.reloadStartTime >= this.reloadDuration) {
        this.completeReload();
    }
}

export function completeReload() {
    this.isReloading = false;
    if (Weapons.reloadWeapon(this.equippedWeapon, this)) {
        this.game.utils.addMessage("Reload Complete.");
         if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
            this.game.hud.updateWeaponInfo(this.equippedWeapon);
        } else {
            this.renderInventory(); 
        }
    } else {
        this.game.utils.addMessage("Reload Failed (Out of ammo).");
    }
}

export function takeDamage(amount) {
    const defMult = this.defenseMultiplier || 1.0;
    const finalDamage = Math.ceil(amount * defMult);
    
    this.hp -= finalDamage;

    // Show floating text
    if (this.game.floatingTextManager) {
        this.game.floatingTextManager.addText(
            this.x + this.width / 2, 
            this.y, 
            `-${finalDamage}`, 
            '#FF0000'
        );
    }
    
    if (this.game.soundManager) this.game.soundManager.playDamage();

    this.game.utils.addMessage(`Xperient integrity compromised by ${finalDamage}! Vitality: ${this.hp}/${this.maxHp}`);
    if (this.hp <= 0) { 
        this.hp = 0; 
        this.game.gameOver(); 
    }
    this.game.hud.update();
}

export function heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.game.hud.update();
}

export function applyOnKillEffect() {
    // 'this' refers to player object
    if (!this.gang || !this.gang.OnKillEffect || this.gang.OnKillEffect === 'None') return;

    const effect = this.gang.OnKillEffect;
    this.game.utils.addMessage(`[KILL TRIGGER] ${effect} activated!`);

    switch(effect) {
        case 'HealSmall':
            this.heal(10);
            break;
        case 'GainSpeed':
            this.applyStatusEffect("Speed Rush", 5000, { speedMultiplier: 1.3 });
            break;
        case 'GainShield':
            this.applyStatusEffect("Shield", 10000, { defenseMultiplier: 0.5 });
            break;
        case 'RandomTeleportBurst':
            // Teleport slightly
            this.x += (Math.random() - 0.5) * 100;
            this.y += (Math.random() - 0.5) * 100;
            this.game.utils.addMessage("Glitch-step executed.");
            break;
        case 'ReduceCooldown':
            // Logic to reduce cooldowns
            this.game.utils.addMessage("Systems overclocked.");
            break;
        case 'ConfusePulse':
            // AoE Confuse? Requires access to enemies list
            this.game.utils.addMessage("Disorienting signal broadcast.");
            break;
        case 'CritBoost':
            this.applyStatusEffect("Crit Surge", 5000, { luckMultiplier: 2.0 }); // Hypothetical
            break;
        // Add other cases as needed from CSV
        case 'DropData':
             // Chance to spawn xdata
             if(Math.random() < 0.3) {
                 this.game.itemManager.dropItem({id: 'xdata_fragment', name: 'Data', type: 'quest_item'}, this.x, this.y);
             }
             break;
        default:
            console.log("Unknown OnKillEffect:", effect);
    }
}
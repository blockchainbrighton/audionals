// js/player/playerCombat.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types

export const combatProperties = {
    // These will now be primarily derived from the equipped weapon
    // attackPower: 10, // (deprecated, use weapon.damage)
    // attackCooldown: 500, // (deprecated, use weapon.attackSpeed)
    lastAttackTime: 0,
    // attackRange: 0, // (deprecated, use weapon.effectiveRange)
};

export function initCombat() {
    // 'this' refers to player object
    this.lastAttackTime = 0;
    // Default to unarmed if no weapon is somehow equipped.
    // player.init should handle equipping unarmed initially.
    if (!this.equippedWeapon) {
        this.equipWeaponById(Weapons.UNARMED_STATS.id);
    }
}

export function attack() {
    // 'this' refers to player object
    if (!this.equippedWeapon) {
        this.game.utils.addMessage("No weapon equipped!");
        // Fallback to unarmed if something went wrong during init
        if (!this.equippedWeapon) this.equipWeaponById(Weapons.UNARMED_STATS.id);
        if (!this.equippedWeapon) return; // Still no weapon, critical error
    }

    const now = Date.now();
    if (now - this.lastAttackTime < this.equippedWeapon.attackSpeed) return;

    if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        if (this.equippedWeapon.currentAmmo <= 0) {
            this.game.utils.addMessage(`${this.equippedWeapon.name} is empty! Press 'R' to reload.`);
            // Optional: click sound or visual cue for empty weapon
            this.lastAttackTime = now; // Still consume "cooldown" to prevent spamming empty checks
            return;
        }
        this.equippedWeapon.currentAmmo--;
    }

    this.lastAttackTime = now;
    this.startAttackAnim(); // Trigger visual animation from playerCharacterDesign

    this.game.utils.addMessage(`${this.equippedWeapon.name} deployed!`);
    let attacked = false;

    if (this.equippedWeapon.type === Weapons.weaponTypes.MELEE || this.equippedWeapon.type === Weapons.weaponTypes.UNARMED) {
        this.game.enemyManager.list.forEach(enemy => {
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            if (this.game.utils.distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) < this.equippedWeapon.effectiveRange) {
                enemy.takeDamage(this.equippedWeapon.damage);
                attacked = true;
            }
        });
    } else if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        // RANGED ATTACK LOGIC
        // For simplicity, this will be a "hitscan" attack towards the mouse cursor or a general direction.
        // A full projectile system is more complex.
        
        // Determine target direction (e.g., mouse position relative to player)
        // This requires mouse tracking, which is typically in a game.inputManager
        // Let's assume game.input.mouseWorldX and game.input.mouseWorldY exist
        let targetX, targetY;
        if (this.game.input && this.game.input.mouseWorldX !== undefined) {
            targetX = this.game.input.mouseWorldX;
            targetY = this.game.input.mouseWorldY;
        } else { // Fallback: attack in a default forward direction (e.g., right)
            targetX = this.x + this.width / 2 + this.equippedWeapon.effectiveRange;
            targetY = this.y + this.height / 2;
        }

        // Simplistic hitscan: check first enemy in line of sight up to weapon range
        // More advanced: raycast or create a projectile entity
        const playerShooterX = this.x + this.width / 2;
        const playerShooterY = this.y + this.height / 2; // Or from weapon muzzle

        // Sort enemies by distance to player to hit the closest one in the line of fire
        const sortedEnemies = [...this.game.enemyManager.list].sort((a, b) =>
            this.game.utils.distance(playerShooterX, playerShooterY, a.x + a.width / 2, a.y + a.height / 2) -
            this.game.utils.distance(playerShooterX, playerShooterY, b.x + b.width / 2, b.y + b.height / 2)
        );
        
        for (const enemy of sortedEnemies) {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const distToEnemy = this.game.utils.distance(playerShooterX, playerShooterY, enemyCenterX, enemyCenterY);

            if (distToEnemy < this.equippedWeapon.effectiveRange) {
                // Check if enemy is roughly in the direction of targetX, targetY
                // This is a very simplified line of sight / cone check
                const angleToTarget = Math.atan2(targetY - playerShooterY, targetX - playerShooterX);
                const angleToEnemy = Math.atan2(enemyCenterY - playerShooterY, enemyCenterX - playerShooterX);
                const angleDiff = Math.abs(angleToTarget - angleToEnemy);

                // Allow a small cone of fire (e.g., 15 degrees = ~0.26 radians)
                if (angleDiff < 0.26 || angleDiff > Math.PI * 2 - 0.26) { 
                    enemy.takeDamage(this.equippedWeapon.damage);
                    this.game.utils.addMessage(`Hit ${enemy.name || 'target'} for ${this.equippedWeapon.damage}!`);
                    attacked = true;
                    // In a real projectile system, you might have penetration or hit only one target.
                    // For hitscan, usually one target is hit.
                    break; 
                }
            }
        }
        // Update HUD for ammo count
        if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
            this.game.hud.updateWeaponInfo(this.equippedWeapon);
        } else {
            this.renderInventory(); // Fallback to re-render inventory which shows ammo
        }
    }

    if (!attacked) {
        if (this.equippedWeapon.type === Weapons.weaponTypes.MELEE || this.equippedWeapon.type === Weapons.weaponTypes.UNARMED) {
            this.game.utils.addMessage("...Swing hit nothing but air.");
        } else if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
            this.game.utils.addMessage("...Shot went wide.");
        }
    }
}

export function reloadEquippedWeapon() {
    // 'this' refers to player object
    if (this.equippedWeapon && this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        if (Weapons.reloadWeapon(this.equippedWeapon, this)) {
            // Optional: Update HUD specifically for weapon info if you have one
            if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
                this.game.hud.updateWeaponInfo(this.equippedWeapon);
            } else {
                this.renderInventory(); // Re-render inventory to show updated ammo
            }
        }
    } else {
        this.game.utils.addMessage("No reloadable weapon equipped or not a ranged weapon.");
    }
}


export function takeDamage(amount) {
    this.hp -= amount;
    this.game.utils.addMessage(`Xperient integrity compromised by ${amount}! Vitality: ${this.hp}/${this.maxHp}`);
    if (this.hp <= 0) { 
        this.hp = 0; 
        this.game.gameOver(); 
    }
    this.game.hud.update();
}

export function heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.game.utils.addMessage(`Nanites repaired ${amount} Vitality. Current: ${this.hp}/${this.maxHp}`);
    this.game.hud.update();
}
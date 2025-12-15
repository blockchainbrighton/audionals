// js/player/playerCombat.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types

export const combatProperties = {
    lastAttackTime: 0,
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
        let targetX, targetY;
        // Use mouse world coords if available from game.input module
        if (this.game.input && this.game.input.mouseWorldX !== undefined && this.game.input.mouseWorldY !== undefined) {
            targetX = this.game.input.mouseWorldX;
            targetY = this.game.input.mouseWorldY;
        } else { // Fallback: attack in player's facing direction
            const aimDistance = this.equippedWeapon.effectiveRange * 0.8; // Arbitrary distance to aim at
            targetX = (this.x + this.width / 2) + (this.facingDirection * aimDistance);
            targetY = this.y + this.height / 2; // Aim straight ahead
        }

        // --- Spawn Visual Projectile (Tracer) ---
        if (this.game.projectileManager && typeof this.game.projectileManager.addProjectile === 'function') {
            const projectileSpeed = 800; // Pixels per second, adjust as needed
            // Approx. muzzle position (could be refined if frontHandX/Y were accessible here)
            const muzzleOffsetX = this.facingDirection * (this.width / 2 + 10); // Small offset in front
            const muzzleOffsetY = this.height * 0.35; // Approx. hand height from player y
            
            const shooterX = this.x + this.width / 2 + muzzleOffsetX;
            const shooterY = this.y + muzzleOffsetY;

            const dirX = targetX - shooterX;
            const dirY = targetY - shooterY;
            const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
            const vx = (dirX / len) * projectileSpeed;
            const vy = (dirY / len) * projectileSpeed;

            this.game.projectileManager.addProjectile({
                x: shooterX,
                y: shooterY,
                vx: vx,
                vy: vy,
                size: this.equippedWeapon.projectileType === 'bullet_heavy' ? 4 : 3, // Example size
                color: this.equippedWeapon.projectileColor || '#FFFF00', // Weapon could define this
                maxLife: (this.equippedWeapon.effectiveRange / projectileSpeed) * 1000, // Lifetime based on range
                owner: 'player',
                damage: 0 // Visual only, damage via hitscan below
            });
        }
        // --- End Visual Projectile ---


        // Simplistic hitscan for damage:
        const playerShooterX = this.x + this.width / 2;
        const playerShooterY = this.y + this.height / 2; 

        const sortedEnemies = [...this.game.enemyManager.list].sort((a, b) =>
            this.game.utils.distance(playerShooterX, playerShooterY, a.x + a.width / 2, a.y + a.height / 2) -
            this.game.utils.distance(playerShooterX, playerShooterY, b.x + b.width / 2, b.y + b.height / 2)
        );
        
        for (const enemy of sortedEnemies) {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const distToEnemy = this.game.utils.distance(playerShooterX, playerShooterY, enemyCenterX, enemyCenterY);

            if (distToEnemy < this.equippedWeapon.effectiveRange) {
                const angleToTarget = Math.atan2(targetY - playerShooterY, targetX - playerShooterX);
                const angleToEnemy = Math.atan2(enemyCenterY - playerShooterY, enemyCenterX - playerShooterX);
                
                let angleDiff = Math.abs(angleToTarget - angleToEnemy);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff; // Normalize to 0-PI

                // Cone of fire (e.g., 15 degrees = ~0.26 radians on either side)
                if (angleDiff < (this.equippedWeapon.accuracyCone || 0.26)) { 
                    enemy.takeDamage(this.equippedWeapon.damage);
                    this.game.utils.addMessage(`Hit ${enemy.name || 'target'} for ${this.equippedWeapon.damage}!`);
                    attacked = true;
                    break; 
                }
            }
        }
        
        if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
            this.game.hud.updateWeaponInfo(this.equippedWeapon);
        } else {
            this.renderInventory(); 
        }
    }

    if (!attacked && this.equippedWeapon.type !== Weapons.weaponTypes.RANGED) { // Melee miss message handled separately for ranged
        this.game.utils.addMessage("...Swing hit nothing but air.");
    } else if (!attacked && this.equippedWeapon.type === Weapons.weaponTypes.RANGED){
         this.game.utils.addMessage("...Shot went wide.");
    }
}

export function reloadEquippedWeapon() {
    // 'this' refers to player object
    if (this.equippedWeapon && this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
        if (Weapons.reloadWeapon(this.equippedWeapon, this)) {
            if (this.game.hud && typeof this.game.hud.updateWeaponInfo === 'function') {
                this.game.hud.updateWeaponInfo(this.equippedWeapon);
            } else {
                this.renderInventory(); 
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
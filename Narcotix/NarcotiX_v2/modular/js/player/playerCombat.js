// js/playerCombat.js

export const combatProperties = {
    attackPower: 10,
    attackCooldown: 500,
    lastAttackTime: 0,
    attackRange: 0, // Will be initialized based on TILE_SIZE
};

export function initCombat() {
    // 'this' refers to player object
    this.attackRange = this.game.config.TILE_SIZE * 1.1;
    // Reset combat properties to defaults
    this.attackPower = combatProperties.attackPower;
    this.attackCooldown = combatProperties.attackCooldown;
    this.lastAttackTime = 0; // Reset last attack time
}

export function attack() {
    // 'this' refers to player object
    if (Date.now() - this.lastAttackTime < this.attackCooldown) return;
    this.lastAttackTime = Date.now();
    this.game.utils.addMessage("Melee Disruptor Field Online!");
    let attacked = false;
    this.game.enemyManager.list.forEach(enemy => {
        // Ensure player width/height are available if used for center calculation
        const playerCenterX = this.x + (this.width || 0) / 2;
        const playerCenterY = this.y + (this.height || 0) / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;

        if (this.game.utils.distance(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) < this.attackRange) {
            enemy.takeDamage(this.attackPower);
            attacked = true;
        }
    });
    if (!attacked) this.game.utils.addMessage("...Disruptor Field hit static.");
}

export function takeDamage(amount) {
    // 'this' refers to player object
    this.hp -= amount;
    this.game.utils.addMessage(`Xperient integrity compromised by ${amount}! Vitality: ${this.hp}/${this.maxHp}`);
    if (this.hp <= 0) { 
        this.hp = 0; 
        this.game.gameOver(); 
    }
    this.game.hud.update(); // Update main HUD (health bar, etc.)
}

export function heal(amount) {
    // 'this' refers to player object
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.game.utils.addMessage(`Nanites repaired ${amount} Vitality. Current: ${this.hp}/${this.maxHp}`);
    this.game.hud.update(); // Update main HUD
}
// js/player/playerCore.js
import * as weapons from './playerWeapons.js'; // For UNARMED_STATS default range

export const coreProperties = {
    x: 0, y: 0,
    width: 0, height: 0,
    color: '#3F3', char: '웃',
    speed: 150, baseSpeed: 150,
    hp: 100, maxHp: 100, money: 150,
};

export function initCore(gameInstance) {
    this.game = gameInstance;
    this.width = this.game.config.TILE_SIZE * 0.7;
    this.height = this.game.config.TILE_SIZE * 0.7;

    this.x = this.game.config.TILE_SIZE * (this.game.config.MAP_WIDTH_TILES / 2);
    this.y = this.game.config.TILE_SIZE * (this.game.config.MAP_HEIGHT_TILES / 2);
    this.hp = coreProperties.maxHp;
    this.money = coreProperties.money;
    this.speed = coreProperties.baseSpeed;
    this.baseSpeed = coreProperties.baseSpeed;
    
    // No longer setting equippedWeapon here, player.js init handles it
    // this.equippedWeapon = weapons.getWeaponData(weapons.UNARMED_STATS.id, this.game.config);


    this.game.camera.x = this.x - this.game.camera.width / 2;
    this.game.camera.y = this.y - this.game.camera.height / 2;
}

export function renderCore() {
    // 'this' refers to player object
    this.game.ctx.save(); // Save context for transformations and alpha changes

    // Update animation state (includes limb and weapon attack animation)
    // Ensure game.deltaTime is correctly passed or accessible for updateAnimation
    if (this.game && typeof this.game.deltaTime === 'number') {
        this.updateAnimation(this.game.deltaTime);
    } else {
        this.updateAnimation(1/60); // Fallback deltaTime if not available
    }


    // Apply stealth and status effect visual changes for the new character design
    // These might influence how renderDetails draws the character (e.g., alpha for stealth)
    let playerAlpha = 1.0;
    let isPulsing = false;

    if (this.isStealthed()) {
        playerAlpha = 0.4; // Apply alpha for stealth to the whole character
    }
    if (this.hasStatusEffect("Kaos Frenzy") || this.hasStatusEffect("C-Burst")) {
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.3 + 0.7;
        playerAlpha = Math.min(playerAlpha, pulse); // Combine with stealth alpha if needed, or choose one
        isPulsing = true;
    }
    this.game.ctx.globalAlpha = playerAlpha;

    // --- REMOVE OLD CHARACTER DRAWING ---
    // this.game.ctx.fillStyle = playerColor; // playerColor was based on this.color
    // this.game.ctx.font = `${this.game.config.TILE_SIZE * 0.9}px Arial`;
    // this.game.ctx.textAlign = 'center';
    // this.game.ctx.textBaseline = 'middle';
    // this.game.ctx.fillText(this.char, this.x + this.width / 2, this.y + this.height / 2 + this.game.config.TILE_SIZE * 0.05);
    // --- END OF REMOVAL ---

    // Render character details (limbs, held weapon, and potentially a new body)
    // This function in playerCharacterDesign.js will now be solely responsible for drawing the player.
    if (typeof this.renderDetails === 'function') {
        // Pass the context and any state like pulsing or specific colors if renderDetails needs them
        this.renderDetails(this.game.ctx /*, { isPulsing: isPulsing } */);
    } else {
        // Fallback if renderDetails is somehow missing, draw a simple box
        this.game.ctx.fillStyle = this.color;
        this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
        console.warn("Player renderDetails function not found!");
    }

    this.game.ctx.globalAlpha = 1.0; // Reset global alpha

    // Health bar (can remain as is, drawn relative to player's x,y)
    if (this.hp < this.maxHp) {
        const barY = this.y - 7; // Adjust position if needed based on new character height
        this.game.ctx.fillStyle = 'red';
        this.game.ctx.fillRect(this.x, barY, this.width, 5);
        this.game.ctx.fillStyle = '#0F0';
        this.game.ctx.fillRect(this.x, barY, this.width * (this.hp / this.maxHp), 5);
    }
    this.game.ctx.restore(); // Restore context
}

export function handleInputMovement(deltaTime) {
    if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'INVENTORY_OPEN' && this.game.gameState !== 'QUESTLOG_OPEN') return;
    let dx = 0, dy = 0;
    if (this.game.keysPressed['w'] || this.game.keysPressed['ArrowUp']) dy -= 1;
    if (this.game.keysPressed['s'] || this.game.keysPressed['ArrowDown']) dy += 1;
    if (this.game.keysPressed['a'] || this.game.keysPressed['ArrowLeft']) dx -= 1;
    if (this.game.keysPressed['d'] || this.game.keysPressed['ArrowRight']) dx += 1;

    if (this.isConfused()) { let temp = dx; dx = dy; dy = -temp; }

    if (dx !== 0 || dy !== 0) {
        this.isMoving = true; // Set flag for animation system

        if (dx !== 0 && dy !== 0) { const fact = Math.sqrt(0.5); dx *= fact; dy *= fact; }

        const currentSpeed = this.speed; 
        const tileProps = this.game.mapManager.getTilePropertiesAt(this.x + this.width/2, this.y + this.height/2);
        const effectiveSpeed = currentSpeed * (tileProps ? tileProps.speedModifier : 1);

        let nextX = this.x + dx * effectiveSpeed * deltaTime;
        let nextY = this.y + dy * effectiveSpeed * deltaTime;

        if (!this.checkCollision({ x: nextX, y: this.y, width: this.width, height: this.height })) this.x = nextX;
        if (!this.checkCollision({ x: this.x, y: nextY, width: this.width, height: this.height })) this.y = nextY;

        this.x = Math.max(this.width/2, Math.min(this.x, this.game.config.MAP_WIDTH_TILES * this.game.config.TILE_SIZE - this.width*1.5));
        this.y = Math.max(this.height/2, Math.min(this.y, this.game.config.MAP_HEIGHT_TILES * this.game.config.TILE_SIZE - this.height*1.5));
        
        this.pickupItems();
    } else {
        this.isMoving = false; // Not moving
    }
}

export function checkCollision(rect) {
    const corners = [ { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height }];
    for (const corner of corners) if (this.game.mapManager.isColliding(corner.x, corner.y)) return true;
    return false;
}

export function payMoney(amount) {
    if (this.money >= amount) {
        this.money -= amount;
        this.game.hud.update();
        return true;
    }
    return false;
}
export function earnMoney(amount) {
    this.money += amount;
    this.game.utils.addMessage(`Creds Acquired: ${amount}c.`);
    this.game.hud.update();
}
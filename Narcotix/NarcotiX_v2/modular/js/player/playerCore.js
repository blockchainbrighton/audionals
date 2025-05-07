// js/player/playerCore.js
import * as weapons from './playerWeapons.js'; // For UNARMED_STATS default range

export const coreProperties = {
    x: 0, y: 0,
    width: 0, height: 0,
    color: '#3F3', char: '웃',
    speed: 150, baseSpeed: 150,
    hp: 100, maxHp: 100, money: 150,
    // facingDirection and lastDeltaX will be mixed in from playerCharacterDesign
};

export function initCore(gameInstance) {
    this.game = gameInstance;
    this.width = this.game.config.TILE_SIZE * 0.7;
    this.height = this.game.config.TILE_SIZE * 0.7;

    this.x = this.game.config.TILE_SIZE * (this.game.config.MAP_WIDTH_TILES / 2);
    this.y = this.game.config.TILE_SIZE * (this.game.config.MAP_HEIGHT_TILES / 2);
    this.hp = coreProperties.maxHp; // Uses the maxHp from coreProperties defaults
    this.money = coreProperties.money;
    this.speed = coreProperties.baseSpeed;
    this.baseSpeed = coreProperties.baseSpeed;
    
    this.game.camera.x = this.x - this.game.camera.width / 2;
    this.game.camera.y = this.y - this.game.camera.height / 2;
}

export function renderCore() {
    // 'this' refers to player object
    this.game.ctx.save(); 

    if (this.game && typeof this.game.deltaTime === 'number') {
        this.updateAnimation(this.game.deltaTime);
    } else {
        this.updateAnimation(1/60); 
    }

    let playerAlpha = 1.0;
    if (this.isStealthed()) {
        playerAlpha = 0.4; 
    }
    if (this.hasStatusEffect("Kaos Frenzy") || this.hasStatusEffect("C-Burst")) {
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.3 + 0.7;
        playerAlpha = Math.min(playerAlpha, pulse); 
    }
    this.game.ctx.globalAlpha = playerAlpha;

    if (typeof this.renderDetails === 'function') {
        this.renderDetails(this.game.ctx);
    } else {
        this.game.ctx.fillStyle = this.color;
        this.game.ctx.fillRect(this.x, this.y, this.width, this.height);
        console.warn("Player renderDetails function not found!");
    }

    this.game.ctx.globalAlpha = 1.0; // Reset global alpha

    if (this.hp < this.maxHp) {
        const barY = this.y - 10; // Adjusted Y position for better visibility above head
        const barWidth = this.width * 0.8;
        const barX = this.x + (this.width - barWidth) / 2; // Centered health bar
        this.game.ctx.fillStyle = 'red';
        this.game.ctx.fillRect(barX, barY, barWidth, 5);
        this.game.ctx.fillStyle = '#0F0';
        this.game.ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), 5);
    }
    this.game.ctx.restore(); 
}

export function handleInputMovement(deltaTime) {
    if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'INVENTORY_OPEN' && this.game.gameState !== 'QUESTLOG_OPEN') return;
    
    let inputDx = 0, inputDy = 0; // Raw directional input
    if (this.game.keysPressed['w'] || this.game.keysPressed['ArrowUp']) inputDy -= 1;
    if (this.game.keysPressed['s'] || this.game.keysPressed['ArrowDown']) inputDy += 1;
    if (this.game.keysPressed['a'] || this.game.keysPressed['ArrowLeft']) inputDx -= 1;
    if (this.game.keysPressed['d'] || this.game.keysPressed['ArrowRight']) inputDx += 1;

    // Update facingDirection based on horizontal input (before confusion)
    // this.facingDirection is part of playerCharacterDesignProperties mixed into player
    if (inputDx > 0) this.facingDirection = 1;
    else if (inputDx < 0) this.facingDirection = -1;
    // If inputDx is 0, facingDirection remains unchanged (player faces last direction).

    let moveDx = inputDx;
    let moveDy = inputDy;

    if (this.isConfused()) { 
        let temp = moveDx; 
        moveDx = moveDy; 
        moveDy = -temp; 
    }

    if (moveDx !== 0 || moveDy !== 0) {
        this.isMoving = true; 

        let normalizedDx = moveDx;
        let normalizedDy = moveDy;
        if (moveDx !== 0 && moveDy !== 0) { 
            const fact = Math.sqrt(0.5); 
            normalizedDx *= fact; 
            normalizedDy *= fact; 
        }
        this.lastDeltaX = normalizedDx; // Store normalized dx for potential animation use

        const currentSpeed = this.speed; 
        const tileProps = this.game.mapManager.getTilePropertiesAt(this.x + this.width/2, this.y + this.height/2);
        const effectiveSpeed = currentSpeed * (tileProps ? tileProps.speedModifier : 1);

        let nextX = this.x + normalizedDx * effectiveSpeed * deltaTime;
        let nextY = this.y + normalizedDy * effectiveSpeed * deltaTime;

        if (!this.checkCollision({ x: nextX, y: this.y, width: this.width, height: this.height })) this.x = nextX;
        if (!this.checkCollision({ x: this.x, y: nextY, width: this.width, height: this.height })) this.y = nextY;

        this.x = Math.max(0, Math.min(this.x, this.game.config.MAP_WIDTH_TILES * this.game.config.TILE_SIZE - this.width));
        this.y = Math.max(0, Math.min(this.y, this.game.config.MAP_HEIGHT_TILES * this.game.config.TILE_SIZE - this.height));
        
        this.pickupItems();
    } else {
        this.isMoving = false; 
        this.lastDeltaX = 0;
    }
}

export function checkCollision(rect) {
    // Consider player's feet and center mass for collision, not just all corners,
    // if finer control over collision is desired. For now, corners are fine.
    const corners = [ 
        { x: rect.x, y: rect.y }, 
        { x: rect.x + rect.width, y: rect.y }, 
        { x: rect.x, y: rect.y + rect.height }, 
        { x: rect.x + rect.width, y: rect.y + rect.height }
    ];
    // Center point for collision against smaller obstacles
    // const centerX = rect.x + rect.width / 2;
    // const centerY = rect.y + rect.height / 2;
    // if (this.game.mapManager.isColliding(centerX, centerY)) return true;


    for (const corner of corners) {
        if (this.game.mapManager.isColliding(corner.x, corner.y)) return true;
    }
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
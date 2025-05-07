// js/player/playerCore.js

export const coreProperties = {
    x: 0, y: 0,
    width: 0, height: 0,
    color: '#3F3', char: '웃',
    speed: 150, baseSpeed: 150,
    hp: 100, maxHp: 100, money: 150,
};

export function initCore(gameInstance) {
    this.game = gameInstance; // 'this' will be the player object
    this.width = this.game.config.TILE_SIZE * 0.7;
    this.height = this.game.config.TILE_SIZE * 0.7;

    // Reset core properties to defaults from coreProperties or initial values
    this.x = this.game.config.TILE_SIZE * (this.game.config.MAP_WIDTH_TILES / 2);
    this.y = this.game.config.TILE_SIZE * (this.game.config.MAP_HEIGHT_TILES / 2);
    this.hp = coreProperties.maxHp; // Use value from coreProperties
    this.money = coreProperties.money; // Use value from coreProperties
    this.speed = coreProperties.baseSpeed; // Initialize speed
    this.baseSpeed = coreProperties.baseSpeed;

    this.game.camera.x = this.x - this.game.camera.width / 2;
    this.game.camera.y = this.y - this.game.camera.height / 2;
}

export function renderCore() {
    // 'this' refers to player object
    this.game.ctx.fillStyle = this.isStealthed() ? 'rgba(50, 255, 50, 0.4)' : this.color;
    if (this.hasStatusEffect("Kaos Frenzy") || this.hasStatusEffect("C-Burst")) {
         const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.3 + 0.7;
         this.game.ctx.globalAlpha = pulse;
    }
    this.game.ctx.font = `${this.game.config.TILE_SIZE * 0.9}px Arial`;
    this.game.ctx.textAlign = 'center';
    this.game.ctx.textBaseline = 'middle';
    this.game.ctx.fillText(this.char, this.x + this.width / 2, this.y + this.height / 2 + this.game.config.TILE_SIZE * 0.05);
    this.game.ctx.globalAlpha = 1.0;

    if (this.hp < this.maxHp) {
        const barY = this.y - 7;
        this.game.ctx.fillStyle = 'red';
        this.game.ctx.fillRect(this.x, barY, this.width, 5);
        this.game.ctx.fillStyle = '#0F0';
        this.game.ctx.fillRect(this.x, barY, this.width * (this.hp / this.maxHp), 5);
    }
}

export function handleInputMovement(deltaTime) {
    // 'this' refers to player object
    if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'INVENTORY_OPEN' && this.game.gameState !== 'QUESTLOG_OPEN') return;
    let dx = 0, dy = 0;
    if (this.game.keysPressed['w'] || this.game.keysPressed['ArrowUp']) dy -= 1;
    if (this.game.keysPressed['s'] || this.game.keysPressed['ArrowDown']) dy += 1;
    if (this.game.keysPressed['a'] || this.game.keysPressed['ArrowLeft']) dx -= 1;
    if (this.game.keysPressed['d'] || this.game.keysPressed['ArrowRight']) dx += 1;

    if (this.isConfused()) { let temp = dx; dx = dy; dy = -temp; }

    if (dx !== 0 || dy !== 0) {
        if (dx !== 0 && dy !== 0) { const fact = Math.sqrt(0.5); dx *= fact; dy *= fact; }

        // player.speed is dynamically updated by the status effect system
        const currentSpeed = this.speed; 
        const tileProps = this.game.mapManager.getTilePropertiesAt(this.x + this.width/2, this.y + this.height/2);
        const effectiveSpeed = currentSpeed * (tileProps ? tileProps.speedModifier : 1);

        let nextX = this.x + dx * effectiveSpeed * deltaTime;
        let nextY = this.y + dy * effectiveSpeed * deltaTime;

        if (!this.checkCollision({ x: nextX, y: this.y, width: this.width, height: this.height })) this.x = nextX;
        if (!this.checkCollision({ x: this.x, y: nextY, width: this.width, height: this.height })) this.y = nextY;

        this.x = Math.max(this.width/2, Math.min(this.x, this.game.config.MAP_WIDTH_TILES * this.game.config.TILE_SIZE - this.width*1.5));
        this.y = Math.max(this.height/2, Math.min(this.y, this.game.config.MAP_HEIGHT_TILES * this.game.config.TILE_SIZE - this.height*1.5));
        
        this.pickupItems(); // Calls an inventory method
    }
}

export function checkCollision(rect) {
    // 'this' refers to player object
    const corners = [ { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height }];
    for (const corner of corners) if (this.game.mapManager.isColliding(corner.x, corner.y)) return true;
    return false;
}

export function payMoney(amount) {
    // 'this' refers to player object
    if (this.money >= amount) {
        this.money -= amount;
        this.game.hud.update();
        return true;
    }
    return false;
}
export function earnMoney(amount) {
    // 'this' refers to player object
    this.money += amount;
    this.game.utils.addMessage(`Creds Acquired: ${amount}c.`);
    this.game.hud.update();
}
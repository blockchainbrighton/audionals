// js/player/playerCore.js
import * as weapons from './playerWeapons.js'; // For UNARMED_STATS default range

export const coreProperties = {
    x: 0, y: 0,
    width: 0, height: 0,
    color: '#3F3', char: '웃',
    speed: 150, baseSpeed: 150,
    hp: 100, maxHp: 100, money: 150,
    collisionMode: 'STANDARD', // STANDARD, FLIGHT, GHOST
    // facingDirection and lastDeltaX will be mixed in from playerCharacterDesign
    aimAngle: 0 // New property for mouse aim
};

export function initCore(gameInstance) {
    this.game = gameInstance;
    this.width = this.game.config.TILE_SIZE * 0.7;
    this.height = this.game.config.TILE_SIZE * 0.7;

    // Start in Safehouse Interior (5, 5)
    this.x = this.game.config.TILE_SIZE * 5;
    this.y = this.game.config.TILE_SIZE * 5;
    
    this.hp = coreProperties.maxHp; 
    this.money = coreProperties.money;
    this.speed = coreProperties.baseSpeed;
    this.baseSpeed = coreProperties.baseSpeed;
    this.defaultBaseSpeed = coreProperties.baseSpeed; // Store default for Admin/Resets
    this.collisionMode = 'STANDARD';
    
    this.aimAngle = 0;

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
        const barY = this.y - 10; 
        const barWidth = this.width * 0.8;
        const barX = this.x + (this.width - barWidth) / 2; 
        this.game.ctx.fillStyle = 'red';
        this.game.ctx.fillRect(barX, barY, barWidth, 5);
        this.game.ctx.fillStyle = '#0F0';
        this.game.ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), 5);
    }
    this.game.ctx.restore(); 
}

export function handleInputMovement(deltaTime) {
    if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'INVENTORY_OPEN' && this.game.gameState !== 'QUESTLOG_OPEN') return;

    // 1. AIMING Logic (Mouse)
    // Center of player in world coords
    const pcx = this.x + this.width / 2;
    const pcy = this.y + this.height / 2;
    // Mouse coords are already updated in game.render loop to world coords
    const mx = this.game.input.mouse.x;
    const my = this.game.input.mouse.y;
    
    // Calculate angle from player to mouse
    this.aimAngle = Math.atan2(my - pcy, mx - pcx);

    // Update facingDirection based on Aim Angle (Left or Right side)
    // Angle ranges from -PI to PI.
    // Right: -PI/2 to PI/2. Left: > PI/2 or < -PI/2.
    if (Math.abs(this.aimAngle) > Math.PI / 2) {
        this.facingDirection = -1;
    } else {
        this.facingDirection = 1;
    }


    // 2. MOVEMENT Logic (Absolute WASD)
    let inputDx = 0, inputDy = 0;

    if (this.game.input.isActive('MOVE_UP')) inputDy -= 1;
    if (this.game.input.isActive('MOVE_DOWN')) inputDy += 1;
    if (this.game.input.isActive('MOVE_LEFT')) inputDx -= 1;
    if (this.game.input.isActive('MOVE_RIGHT')) inputDx += 1;

    // Confusion effect logic (swap axes)
    if (this.isConfused()) {
        const temp = inputDx;
        inputDx = inputDy;
        inputDy = -temp;
    }

    if (Math.abs(inputDx) > 0 || Math.abs(inputDy) > 0) {
        this.isMoving = true;

        let normalizedDx = inputDx;
        let normalizedDy = inputDy;
        const magnitude = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
        if (magnitude > 1) {
            normalizedDx /= magnitude;
            normalizedDy /= magnitude;
        }

        this.lastDeltaX = normalizedDx; // Still tracking for animation if needed

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
        this.game.interact(true); 
    } else {
        this.isMoving = false;
        this.lastDeltaX = 0;
    }
}

export function checkCollision(rect) {
    if (this.collisionMode === 'GHOST') return false; // Phase through everything

    const corners = [ 
        { x: rect.x, y: rect.y }, 
        { x: rect.x + rect.width, y: rect.y }, 
        { x: rect.x, y: rect.y + rect.height }, 
        { x: rect.x + rect.width, y: rect.y + rect.height }
    ];

    for (const corner of corners) {
        // Standard Map Collision (Walls)
        if (this.game.mapManager.isColliding(corner.x, corner.y)) return true;
        
        // Special Tile Checks (Water, Pits)
        const tileProps = this.game.mapManager.getTilePropertiesAt(corner.x, corner.y);
        if (tileProps) {
            // Flight ignores pits/water/slow zones (assuming slow zones are floor based)
            if (this.collisionMode === 'FLIGHT') {
                if (tileProps.wall) return true; // Still hit high walls
                // Ignore 'restricted' or 'slow' if flying? Maybe.
                // For now, flight just ensures we don't fall in pits if we add logic for that later.
            } else {
                // Standard mode checks
                // If we add 'pit' or 'water' logic that kills/blocks:
                // if (tileProps.type === 'pit') return true; 
            }
        }
    }
    return false;
}

export function findNearestSafeSpot(radius = 5) {
    const startX = this.x;
    const startY = this.y;
    const tileSize = this.game.config.TILE_SIZE;

    // Spiral search
    for (let r = 1; r <= radius; r++) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const dx = Math.cos(angle) * (r * tileSize);
            const dy = Math.sin(angle) * (r * tileSize);
            const targetX = startX + dx;
            const targetY = startY + dy;

            // Temporarily set mode to standard to check standard collision
            const prevMode = this.collisionMode;
            this.collisionMode = 'STANDARD';
            const isColliding = this.checkCollision({ x: targetX, y: targetY, width: this.width, height: this.height });
            this.collisionMode = prevMode;

            if (!isColliding) {
                return { x: targetX, y: targetY };
            }
        }
    }
    return null;
}

export function ensureSafePosition() {
    // Check if currently stuck in STANDARD mode
    const prevMode = this.collisionMode;
    this.collisionMode = 'STANDARD';
    const stuck = this.checkCollision({ x: this.x, y: this.y, width: this.width, height: this.height });
    this.collisionMode = prevMode;

    if (stuck) {
        this.game.utils.addMessage("Phase shift destabilized! Ejecting from matter...");
        const safeSpot = this.findNearestSafeSpot(5); // Search radius of 5 tiles
        if (safeSpot) {
            this.x = safeSpot.x;
            this.y = safeSpot.y;
        } else {
            // Last resort: Respawn at Safehouse
            this.game.utils.addMessage("Matter ejection failed. Emergency recall.");
            this.x = this.game.config.TILE_SIZE * 5;
            this.y = this.game.config.TILE_SIZE * 5;
            this.takeDamage(20); // Penalty
        }
    }
}

export function payMoney(amount) {
    if (this.money >= amount) {
        this.money -= amount;
        this.game.events.emit('PLAYER_STATS_UPDATED', this);
        return true;
    }
    return false;
}
export function earnMoney(amount) {
    this.money += amount;
    this.game.utils.addMessage(`Creds Acquired: ${amount}c.`);
    this.game.events.emit('PLAYER_STATS_UPDATED', this);
}
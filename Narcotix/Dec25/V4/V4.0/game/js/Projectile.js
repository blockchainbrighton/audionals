import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(game, options) {
        super(game, options.x, options.y, options.size, options.size, options.color);
        this.vx = options.vx;
        this.vy = options.vy;
        this.maxLife = options.maxLife; // in ms
        this.creationTime = Date.now();
        this.owner = options.owner;
        this.damage = options.damage;
        this.id = this.game.utils.generateId('proj_');
        this.type = 'projectile'; // Distinguish from others
    }

    update(deltaTime) {
        const now = Date.now();
        if (now - this.creationTime > this.maxLife) {
            this.markedForDeletion = true;
            return;
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Boundary check
        const mapWidth = this.game.config.MAP_WIDTH_TILES * this.game.config.TILE_SIZE;
        const mapHeight = this.game.config.MAP_HEIGHT_TILES * this.game.config.TILE_SIZE;
        if (this.x < -this.width || this.x > mapWidth + this.width || this.y < -this.height || this.y > mapHeight + this.height) {
            this.markedForDeletion = true;
        }
    }

    render(ctx) {
        if (!this.game.utils.checkCameraVisibility(this, this.game.camera)) return;

        ctx.save();
        // Tracer effect
        const tailLength = this.width * 3; 
        const prevX = this.x - (this.vx * (this.game.deltaTime || 0.016) * 2);
        const prevY = this.y - (this.vy * (this.game.deltaTime || 0.016) * 2);
        
        ctx.lineWidth = this.width;
        ctx.lineCap = "round";
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.restore();
    }
}

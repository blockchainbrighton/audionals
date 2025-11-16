export class Bullet {
    constructor(x, y, targetX, targetY, damage, range, color, type) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.maxRange = range;
        this.color = color;
        this.type = type;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const len = Math.hypot(dx, dy) || 1;
        this.vx = (dx / len) * 0.6;
        this.vy = (dy / len) * 0.6;
        this.traveled = 0;
        this.trail = [{x, y}, {x, y}];
    }

    update() {
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 5) this.trail.shift();
        
        this.x += this.vx;
        this.y += this.vy;
        this.traveled = Math.hypot(this.x - this.startX, this.y - this.startY);
        
        return this.traveled < this.maxRange;
    }

    checkCollision(enemies) {
        for (let enemy of enemies) {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist < enemy.size + 1.5) {
                return enemy;
            }
        }
        return null;
    }
}

export class DamageNumber {
    constructor(x, y, damage, color = '#ff0') {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.color = color;
        this.life = 1.0;
        this.vy = -0.8;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }
}

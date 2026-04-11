// js/particleManager.js
export const particleManager = {
    game: null,
    particles: [],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.particles = [];
    },

    /**
     * Spawns particles for a specific effect.
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {string} type - 'blood', 'spark', 'smoke', 'heal'
     * @param {number} count - Number of particles
     */
    createEffect: function(x, y, type, count = 10) {
        let color = '#FFF';
        let speed = 50;
        let life = 0.5;
        let size = 2;
        let gravity = 0;

        switch(type) {
            case 'blood':
                color = '#F00';
                speed = 100;
                life = 0.8;
                size = 3;
                gravity = 200;
                break;
            case 'spark':
                color = '#FF0';
                speed = 150;
                life = 0.3;
                size = 2;
                gravity = 100;
                break;
            case 'smoke':
                color = '#888';
                speed = 20;
                life = 1.5;
                size = 5;
                gravity = -20; // Float up
                break;
            case 'heal':
                color = '#0F0';
                speed = 40;
                life = 1.0;
                size = 3;
                gravity = -50;
                break;
        }

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: life + Math.random() * 0.2, // Variance
                maxLife: life,
                color: color,
                size: size * (0.8 + Math.random() * 0.4),
                gravity: gravity,
                type: type
            });
        }
    },

    update: function(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += p.gravity * deltaTime; // Apply gravity

            // Ground friction / stop
            // Simple floor check? (Optional, maybe overkill for now)
        }
    },

    render: function(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
};

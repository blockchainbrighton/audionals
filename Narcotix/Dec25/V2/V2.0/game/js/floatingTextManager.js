// js/floatingTextManager.js

export const floatingTextManager = {
    game: null,
    texts: [],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.texts = [];
    },

    /**
     * Spawns a floating text at the given coordinates.
     * @param {number} x - World X position.
     * @param {number} y - World Y position.
     * @param {string} text - The text to display (e.g., "120").
     * @param {string} color - CSS color string (default: white).
     */
    addText: function(x, y, text, color = '#FFF') {
        this.texts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: 1.0, // Seconds
            vy: -30, // Move up speed (pixels/sec)
            id: Date.now() + Math.random()
        });
    },

    update: function(deltaTime) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life -= deltaTime;
            t.y += t.vy * deltaTime;
            
            if (t.life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    },

    render: function(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Font size could scale slightly with damage? For now, fixed.
        ctx.font = 'bold 16px "Courier New", monospace';
        
        this.texts.forEach(t => {
            // Fade out effect
            ctx.globalAlpha = Math.max(0, t.life); 
            
            // Text Outline for readability
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(t.text, t.x, t.y);
            
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        });
        
        ctx.restore();
    }
};

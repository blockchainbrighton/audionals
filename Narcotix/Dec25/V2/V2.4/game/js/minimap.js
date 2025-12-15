// js/minimap.js

export const minimap = {
    game: null,
    width: 200,
    height: 200,
    scaleX: 1,
    scaleY: 1,
    x: 10, // Will be calculated in render or init to be top-right
    y: 10,
    cachedMapCanvas: null,
    needsRedraw: true,

    init: function(gameInstance) {
        this.game = gameInstance;
        
        // Calculate scale based on map size
        // We want the whole map to fit in width/height
        const mapW = this.game.config.MAP_WIDTH_TILES;
        const mapH = this.game.config.MAP_HEIGHT_TILES;
        
        this.scaleX = this.width / mapW;
        this.scaleY = this.height / mapH;
        
        // Create offscreen canvas for static map elements
        this.cachedMapCanvas = document.createElement('canvas');
        this.cachedMapCanvas.width = this.width;
        this.cachedMapCanvas.height = this.height;
        
        this.cacheStaticMap();
    },

    cacheStaticMap: function() {
        const ctx = this.cachedMapCanvas.getContext('2d');
        ctx.fillStyle = '#000'; // Background
        ctx.fillRect(0, 0, this.width, this.height);

        const mapW = this.game.config.MAP_WIDTH_TILES;
        const mapH = this.game.config.MAP_HEIGHT_TILES;

        // Draw walls and static tiles
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const tileData = this.game.mapManager.getTileData(x, y);
                if (!tileData) continue;

                const drawX = Math.floor(x * this.scaleX);
                const drawY = Math.floor(y * this.scaleY);
                // Make sure we draw at least 1 pixel
                const w = Math.max(1, Math.ceil(this.scaleX));
                const h = Math.max(1, Math.ceil(this.scaleY));

                if (tileData.type === 'WALL' || tileData.type === 'WALL_TOP') {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(drawX, drawY, w, h);
                } else if (tileData.type === 'FLOOR' || tileData.type === 'FLOOR_ALT') {
                    ctx.fillStyle = '#111'; // Slightly lighter than bg
                    ctx.fillRect(drawX, drawY, w, h);
                } else if (tileData.type === 'WATER' || tileData.type === 'COOLANT_RESERVOIR') {
                    ctx.fillStyle = '#00F';
                    ctx.fillRect(drawX, drawY, w, h);
                } else if (tileData.type === 'SHOP_FLOOR' || tileData.type === 'XEMIST_FLOOR') {
                    ctx.fillStyle = '#330';
                    ctx.fillRect(drawX, drawY, w, h);
                }
            }
        }
    },

    render: function(ctx) {
        if (!this.game) return;

        // Position: Top Right with padding
        const posX = this.game.canvas.width - this.width - 20;
        const posY = 20;

        // 1. Draw Background/Cached Map
        ctx.save();
        
        // Border
        ctx.strokeStyle = '#0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(posX - 2, posY - 2, this.width + 4, this.height + 4);
        
        // Background (Cached)
        ctx.drawImage(this.cachedMapCanvas, posX, posY);

        // 2. Draw Items (Cyan dots)
        ctx.fillStyle = '#0FF';
        this.game.itemManager.onMapItems.forEach(item => {
            // Convert world coords to tile coords first, then scale
            const tileX = item.x / this.game.config.TILE_SIZE;
            const tileY = item.y / this.game.config.TILE_SIZE;
            const mx = posX + tileX * this.scaleX;
            const my = posY + tileY * this.scaleY;
            ctx.fillRect(mx, my, 2, 2);
        });

        // 3. Draw Enemies (Red dots)
        ctx.fillStyle = '#F00';
        this.game.enemyManager.list.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const tileX = enemy.x / this.game.config.TILE_SIZE;
                const tileY = enemy.y / this.game.config.TILE_SIZE;
                const mx = posX + tileX * this.scaleX;
                const my = posY + tileY * this.scaleY;
                ctx.fillRect(mx - 1, my - 1, 3, 3);
            }
        });

        // 4. Draw Player (Green Dot / Arrow)
        const pTileX = this.game.player.x / this.game.config.TILE_SIZE;
        const pTileY = this.game.player.y / this.game.config.TILE_SIZE;
        const pmx = posX + pTileX * this.scaleX;
        const pmy = posY + pTileY * this.scaleY;

        ctx.fillStyle = '#0F0';
        ctx.beginPath();
        ctx.arc(pmx, pmy, 3, 0, Math.PI * 2);
        ctx.fill();

        // 5. Draw Camera View Rectangle (Viewport)
        const camTileX = this.game.camera.x / this.game.config.TILE_SIZE;
        const camTileY = this.game.camera.y / this.game.config.TILE_SIZE;
        const camW = this.game.camera.width / this.game.config.TILE_SIZE;
        const camH = this.game.camera.height / this.game.config.TILE_SIZE;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            posX + camTileX * this.scaleX,
            posY + camTileY * this.scaleY,
            camW * this.scaleX,
            camH * this.scaleY
        );

        ctx.restore();
    }
};

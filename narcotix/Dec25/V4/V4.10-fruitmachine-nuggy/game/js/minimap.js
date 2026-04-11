// js/minimap.js
import { TILE_TYPES } from './mapManager.js';

export const minimap = {
    game: null,
    width: 200,
    height: 200,
    scaleX: 1,
    scaleY: 1,
    cachedMapCanvas: null,
    canvas: null,
    ctx: null,

    init: function(gameInstance) {
        this.game = gameInstance;
        
        // Get external canvas
        this.canvas = document.getElementById('minimapCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        } else {
            console.error("Minimap canvas not found!");
            return;
        }

        // Calculate scale based on map size
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
        if (!this.cachedMapCanvas) return;
        const ctx = this.cachedMapCanvas.getContext('2d');
        ctx.fillStyle = '#000'; // Background
        ctx.fillRect(0, 0, this.width, this.height);

        // Access map dimensions from mapManager's current data, not config (which is just max/overworld size)
        // Interior maps are smaller.
        const mapData = this.game.mapManager.data;
        if (!mapData) return;
        
        const mapH = mapData.length;
        const mapW = mapData[0].length;

        // Recalculate scale for the active map so it fills the minimap window
        this.scaleX = this.width / mapW;
        this.scaleY = this.height / mapH;

        this.findPOIs(); // Cache locations for indicators

        // Draw tiles
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const tile = mapData[y][x];
                if (!tile) continue;

                const drawX = Math.floor(x * this.scaleX);
                const drawY = Math.floor(y * this.scaleY);
                const w = Math.ceil(this.scaleX);
                const h = Math.ceil(this.scaleY);

                let color = '#111'; // Default floor

                if (tile.type === TILE_TYPES.FIREWALL || tile.type === TILE_TYPES.SECURE_DATA_SILO_WALL) {
                    color = '#444';
                } else if (tile.type === TILE_TYPES.DATA_STREAM) {
                    color = '#222';
                } else if (tile.type === TILE_TYPES.COOLANT_RESERVOIR) {
                    color = '#004';
                } else if (tile.type === TILE_TYPES.XLOUNGE_INTERIOR || tile.type === TILE_TYPES.XLOUNGE_STASH_ENTRANCE) {
                    color = '#505'; // Purple tint
                } 
                
                // Specific Locations (Overrides)
                if (tile.interactionType === 'xlounge_stash' || tile.type === TILE_TYPES.XLOUNGE_STASH_ENTRANCE) color = '#F0F'; // Magenta
                else if (tile.interactionType === 'exchange_node' || tile.type === TILE_TYPES.EXCHANGE_NODE_ENTRANCE) color = '#0FF'; // Aqua
                else if (tile.interactionType === 'bar' || tile.type === TILE_TYPES.BAR_ENTRANCE) color = '#F80'; // Orange
                else if (tile.interactionType === 'armoury' || tile.type === TILE_TYPES.ARMOURY_ENTRANCE) color = '#F00'; // Red
                else if (tile.interactionType === 'casino' || tile.type === TILE_TYPES.CASINO_ENTRANCE) color = '#0F0'; // Green
                else if (tile.interactionType === 'xemist_contact' || tile.type === TILE_TYPES.XEMIST_CONTACT_POINT) color = '#FF0'; // Yellow

                ctx.fillStyle = color;
                ctx.fillRect(drawX, drawY, w, h);
            }
        }
    },

    render: function() {
        if (!this.game || !this.ctx) return;

        const ctx = this.ctx;
        
        // Clear external canvas
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Background/Cached Map
        ctx.drawImage(this.cachedMapCanvas, 0, 0);

        // 2. Draw Items (Cyan dots)
        ctx.fillStyle = '#0FF';
        this.game.itemManager.onMapItems.forEach(item => {
            const tileX = item.x / this.game.config.TILE_SIZE;
            const tileY = item.y / this.game.config.TILE_SIZE;
            const mx = tileX * this.scaleX;
            const my = tileY * this.scaleY;
            ctx.fillRect(mx, my, 2, 2);
        });

        // 3. Draw Enemies (Red dots)
        ctx.fillStyle = '#F00';
        this.game.enemyManager.list.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const tileX = enemy.x / this.game.config.TILE_SIZE;
                const tileY = enemy.y / this.game.config.TILE_SIZE;
                const mx = tileX * this.scaleX;
                const my = tileY * this.scaleY;
                ctx.fillRect(mx - 1, my - 1, 3, 3);
            }
        });

        // 4. Draw Player (Green Dot)
        const pTileX = this.game.player.x / this.game.config.TILE_SIZE;
        const pTileY = this.game.player.y / this.game.config.TILE_SIZE;
        const pmx = pTileX * this.scaleX;
        const pmy = pTileY * this.scaleY;

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
            camTileX * this.scaleX,
            camTileY * this.scaleY,
            camW * this.scaleX,
            camH * this.scaleY
        );

        // 6. Draw Directional Indicators (Compass for POIs)
        // Only if we are in the OVERWORLD (otherwise it's confusing inside buildings)
        if (this.game.mapManager.currentMapId === 'overworld') {
            const pois = [
                { type: 'xlounge_stash', color: '#F0F' },
                { type: 'exchange_node', color: '#0FF' }, // Finds ANY shop
                { type: 'bar', color: '#F80' },
                { type: 'armoury', color: '#F00' },
                { type: 'casino', color: '#0F0' },
                { type: 'xemist_contact', color: '#FF0' }
            ];

            // We need to find the locations of these POIs on the current map
            // Since we don't store them in a handy list, we scan the map data once or use cached logic.
            // Scanning 250x250 every frame is bad. 
            // Better: `mapManager` should cache POI locations when generating map.
            // Fallback: If `game.mapManager.poiLocations` exists (we added it in map gen), use it.
            
            // Let's assume we can access the POI locations from mapManager if we update it, 
            // OR we scan once and cache in minimap on `cacheStaticMap`.
            
            if (this.poiCache) {
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const radius = Math.min(this.width, this.height) / 2 - 5; // 5px padding

                this.poiCache.forEach(poi => {
                    // Check if POI is visible on minimap (it always is since minimap covers whole world)
                    // But user asked for indicators on periphery. 
                    // This implies the minimap might be zoomed in? 
                    // No, currently minimap shows WHOLE map.
                    // If minimap shows whole map, you can SEE the dots.
                    // Maybe the user means on the main Game HUD (screen edges)?
                    // "spots on the periphery of the map that point to each building... based on the coloured spot that points at it in the HUD"
                    // Re-reading: "point to each building... based on the coloured spot that points at it in the HUD"
                    // This likely means directional arrows on the MAIN SCREEN (HUD), not the minimap canvas itself, 
                    // OR indicators on the minimap border if the minimap was zoomed in.
                    
                    // Since my minimap shows the entire 250x250 map scaled down to 200x200px, 
                    // the dots are visible. 
                    // BUT, 250 tiles into 200 pixels means 1 pixel = 1.25 tiles. It's tiny.
                    // Maybe the dots are too small to see?
                    // Let's add larger indicators on the minimap border for clarity?
                    // Or maybe the user means actual HUD arrows on the main screen?
                    
                    // "spots on the periphery of the map" -> likely Minimap periphery if the user considers the minimap "the map".
                    // But if the minimap shows everything, pointing "to" them on the periphery is redundant unless they are off-screen.
                    // They are NOT off-screen on the minimap.
                    
                    // However, if the user means "On the HUD, pointing to off-screen locations", that's a different feature.
                    // "based on the coloured spot that points at it in the HUD" suggests existing feature? 
                    // There are no existing spots in the HUD.
                    
                    // Interpretation: Add Directional Arrows to the MAIN GAME HUD (Canvas or overlay) pointing to these locations.
                    // BUT the prompt says "on the periphery of the map".
                    // Let's assume the user wants Directional Indicators on the MAIN SCREEN (HUD).
                    
                    // I will implement this in `hud.js` or `game.js` render loop, not minimap.js.
                    // Wait, `minimap.js` renders to `minimapCanvas`.
                    // The prompt says "mark all locations on the minimap" (previous prompt).
                    // This prompt says "spots on the periphery of the map".
                    
                    // Let's add a Compass/Directional System to the MAIN VIEW.
                });
            }
        }
    },

    // Cache POIs during static map caching for efficiency
    findPOIs: function() {
        this.poiCache = [];
        const mapData = this.game.mapManager.data;
        if (!mapData) return;
        
        for (let y = 0; y < mapData.length; y++) {
            for (let x = 0; x < mapData[0].length; x++) {
                const tile = mapData[y][x];
                if (tile.interactionType) {
                    let color = null;
                    if (tile.interactionType === 'xlounge_stash') color = '#F0F';
                    else if (tile.interactionType === 'exchange_node') color = '#0FF';
                    else if (tile.interactionType === 'bar') color = '#F80';
                    else if (tile.interactionType === 'armoury') color = '#F00';
                    else if (tile.interactionType === 'casino') color = '#0F0';
                    else if (tile.interactionType === 'xemist_contact') color = '#FF0';
                    
                    if (color) {
                        this.poiCache.push({ x: x * this.game.config.TILE_SIZE, y: y * this.game.config.TILE_SIZE, color: color, type: tile.interactionType });
                    }
                }
            }
        }
    }
};

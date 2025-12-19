import { TILE_PROPERTIES, TILE_TYPES } from '../mapManager.js';
import { drawExpression, renderPill } from '../utils.js'; // Rendering helpers
import * as PWeapons from '../player/playerWeapons.js';

export const RenderSystem = {
    game: null,

    init: function(gameInstance) {
        this.game = gameInstance;
    },

    render: function() {
        const ctx = this.game.ctx;
        const canvas = this.game.canvas;
        const camera = this.game.camera;

        // 1. Clear Screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        
        // 2. Camera Transform
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // 3. Render Map
        this.renderMap(ctx);
        this.game.zoneManager.render(); // Keep zone render in manager for now or move it? Let's keep it for phase 1

        // 4. Render Entities (Sorted by Y)
        const renderList = [
            this.game.player,
            ...this.game.itemManager.onMapItems,
            ...this.game.enemyManager.list,
            ...(this.game.projectileManager.projectiles || []) // If projectiles exist
        ];
        
        // If projectiles aren't in game.entities, we need to ensure we catch everything.
        // game.js unified entities list: game.entities = [player, ...items, ...enemies].
        // But projectiles might be separate in some logic? 
        // game.js: this.entities.forEach(e => e.render(this.ctx));
        // RenderSystem should replace that loop.
        
        // Let's use game.entities if it's reliable, or rebuild it.
        // game.js re-builds it on map switch.
        // However, Projectiles are updated in game.js but not explicitly in game.entities?
        // game.js: this.projectileManager.update(scaledDt) -> Projectile.js updates position.
        // Projectiles need to be rendered.
        // Let's add them to the list if they expose x/y.
        
        const allEntities = [...this.game.entities];
        if (this.game.projectileManager && this.game.projectileManager.projectiles) {
            allEntities.push(...this.game.projectileManager.projectiles);
        }

        allEntities.sort((a, b) => (a.y + a.height) - (b.y + b.height));

        allEntities.forEach(entity => {
            if (entity.markedForDeletion) return;
            this.renderEntity(ctx, entity);
        });

        // 5. FX
        this.game.particleManager.render(ctx);
        this.game.questManager.renderQuestMarkers();
        this.game.floatingTextManager.render(ctx);

        ctx.restore();

        // 6. UI Overlay
        this.game.hud.renderOverlay(ctx);
        this.game.minimap.render(); // Minimap handles its own canvas
        
        // Game Over Screen
        if (this.game.gameState === 'GAME_OVER') {
            this.renderGameOver(ctx, canvas);
        }
    },

    renderMap: function(ctx) {
        const mapManager = this.game.mapManager;
        const { startCol, endCol, startRow, endRow } = this.game.getVisibleTiles();
        const tileSize = this.game.config.TILE_SIZE;
        const mapData = mapManager.data;
        
        const mapH = mapData.length;
        const mapW = mapData[0].length;

        const sR = Math.max(0, startRow);
        const eR = Math.min(mapH, endRow);
        const sC = Math.max(0, startCol);
        const eC = Math.min(mapW, endCol);
        
        for (let r = sR; r < eR; r++) {
            for (let c = sC; c < eC; c++) {
                const tile = mapData[r][c];
                const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
                ctx.fillStyle = tileDef.color;
                ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

                // Render Location Labels / Doors
                if (tile.interactionType) {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#FFF';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 2;
                    let label = "";
                    switch(tile.interactionType) {
                        case 'exchange_node': label = "SHOP"; break;
                        case 'xlounge_stash': label = "STASH"; break;
                        case 'xemist_contact': label = "QUEST"; break;
                        case 'bar': label = "BAR"; break;
                        case 'armoury': label = "GUNS"; break;
                        case 'casino': label = "SLOTS"; break;
                        default: label = "ENTRANCE";
                    }
                    ctx.fillText(label, c * tileSize + tileSize / 2, r * tileSize - 2);
                    ctx.shadowBlur = 0; 
                }
                
                if (tile.isDoor) {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#FF0';
                    ctx.textAlign = 'center';
                    ctx.fillText(tile.targetMap === 'overworld' ? "EXIT" : "ENTER", c * tileSize + tileSize / 2, r * tileSize + tileSize/2);
                }
            }
        }
    },

    renderEntity: function(ctx, entity) {
        if (!this.game.utils.checkCameraVisibility(entity, this.game.camera)) return;

        // Player
        if (entity === this.game.player) {
            this.renderPlayer(ctx, entity);
            return;
        }

        // Enemy
        if (entity.typeId && entity.hp) { // Duck typing for Enemy
            this.renderEnemy(ctx, entity);
            return;
        }

        // WorldItem
        if (entity.itemData) {
            this.renderWorldItem(ctx, entity);
            return;
        }

        // Projectile
        if (entity.vx !== undefined && entity.vy !== undefined) {
            // Projectile usually simple rect or circle
            ctx.fillStyle = entity.color || '#FF0';
            ctx.beginPath();
            ctx.arc(entity.x, entity.y, entity.size || 3, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Fallback
        ctx.fillStyle = entity.color || '#FFF';
        ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
    },

    renderPlayer: function(ctx, player) {
        // Delegate to player's render logic (which should be moved here eventually, but calling it on object is okay for now if we extracted the drawing logic)
        // Ideally we move renderCharacterDetails logic here.
        // For now, let's call the existing method but wrapped.
        if (player.render) {
            player.render(); // This calls playerCore.renderCore which calls renderDetails
        }
    },

    renderEnemy: function(ctx, enemy) {
        ctx.fillStyle = enemy.color;
        ctx.font = `${this.game.config.TILE_SIZE * 0.9}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.char, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + this.game.config.TILE_SIZE * 0.1);

        // Health Bar
        if (enemy.currentHp < enemy.hp) {
            const bY = enemy.y - 6;
            const bH = 4;
            ctx.fillStyle = '#500';
            ctx.fillRect(enemy.x, bY, enemy.width, bH);
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, bY, enemy.width * (enemy.currentHp / enemy.hp), bH);
        }
    },

    renderWorldItem: function(ctx, worldItem) {
        const item = worldItem.itemData;
        const w = worldItem.width;
        const h = worldItem.height;
        const x = worldItem.x;
        const y = worldItem.y;

        if (item.id && item.id.includes('pill')) {
            const pillData = {
                name: item.name,
                colors: {
                    primary: item.nftTraits ? item.nftTraits.hex1 : '#00FFFF',
                    secondary: item.nftTraits ? item.nftTraits.hex2 : '#0000FF'
                },
                expression: item.nftTraits ? item.nftTraits.expression : null
            };
            const pillHeight = h * 0.6; 
            const pillY = y + (h - pillHeight) / 2;
            
            renderPill(ctx, x, pillY, w, pillHeight, pillData);
            return; 
        }

        // Walkman
        if (item.id === 'walkman') {
            const imgPath = 'artwork/walkman.svg';
            if (this.game.itemManager.itemImages) {
                 if (!this.game.itemManager.itemImages[imgPath]) {
                    this.game.itemManager.itemImages[imgPath] = new Image();
                    this.game.itemManager.itemImages[imgPath].src = imgPath;
                }
                const img = this.game.itemManager.itemImages[imgPath];
                if (img.complete && img.naturalHeight !== 0) {
                    ctx.drawImage(img, x, y, w, h);
                    return;
                }
            }
        }

        // Generic / Weapon
        let charToRender = '?'; 
        let color = worldItem.color || '#FFF';

        if (item.type === 'weapon') {
            const wData = PWeapons.getWeaponData(item.weaponId, this.game.config);
            charToRender = item.char || wData?.char || 'W';
            color = this.game.config.COLORS.ITEM_WEAPON;
        } else if (item.type === 'ammo') {
            charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'a';
            color = this.game.config.COLORS.ITEM_AMMO;
        } else if (item.type === 'consumable') {
            if(item.id === 'nanite_repair') charToRender='+';
            else if(item.id.includes('adrena_rush') || item.id.includes('injector')) charToRender='>';
            else if(item.id.includes('kaos')) charToRender='!';
            else charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'c';
            color = this.game.config.COLORS.ITEM_GENERIC;
        } else if (item.type === 'quest_item') {
            if(item.id.includes('xdata')) charToRender='Җ';
            else charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'q';
        }

        ctx.fillStyle = color;
        ctx.font = `${this.game.config.TILE_SIZE*0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charToRender, x + w/2, y + h/2 + this.game.config.TILE_SIZE*0.1);
    },

    renderGameOver: function(ctx, canvas) {
        ctx.fillStyle = this.game.config.COLORS.UI_OVERLAY;
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = this.game.config.COLORS.UI_TEXT_ERROR;
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('S Y S T E M _ F A I L U R E', canvas.width/2, canvas.height/2 - 20);
        ctx.font = '24px Courier New';
        ctx.fillStyle = this.game.config.COLORS.UI_TEXT_PROMPT;
        ctx.fillText('Press R to Re-initialize Sequence', canvas.width/2, canvas.height/2 + 30);
    }
};

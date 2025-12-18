import { Entity } from './Entity.js';
import * as PWeapons from './player/playerWeapons.js';

export class WorldItem extends Entity {
    constructor(game, x, y, width, height, itemData) {
        super(game, x, y, width, height, itemData.color);
        this.itemData = itemData; 
        // Mixin for compatibility with existing logic that expects flat properties
        Object.assign(this, itemData);
        // Ensure x/y/width/height from arguments override itemData if present (they shouldn't be in itemData usually but just in case)
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    render(ctx) {
        if (!this.game.utils.checkCameraVisibility(this, this.game.camera)) return;

        const item = this.itemData;

        // Check if it's a pill (Generic or NFT)
        if (item.id && item.id.includes('pill')) {
            const pillData = {
                name: item.name,
                colors: {
                    primary: item.nftTraits ? item.nftTraits.hex1 : '#00FFFF', // Default Cyan
                    secondary: item.nftTraits ? item.nftTraits.hex2 : '#0000FF' // Default Blue
                },
                expression: item.nftTraits ? item.nftTraits.expression : null
            };
            const pillHeight = this.height * 0.6; 
            const pillY = this.y + (this.height - pillHeight) / 2; // Center vertically
            
            this.game.utils.renderPill(ctx, this.x, pillY, this.width, pillHeight, pillData);
            return; 
        }

        // Render Walkman SVG
        if (item.id === 'walkman') {
            const imgPath = 'artwork/walkman.svg';
            // Access cache from itemManager if possible, or implement simple cache here?
            // Let's assume itemManager still has the cache or we use a global imageLoader.
            // Using game.itemManager.itemImages for now as it's existing.
            if (this.game.itemManager.itemImages) {
                 if (!this.game.itemManager.itemImages[imgPath]) {
                    this.game.itemManager.itemImages[imgPath] = new Image();
                    this.game.itemManager.itemImages[imgPath].src = imgPath;
                }
                const img = this.game.itemManager.itemImages[imgPath];
                if (img.complete && img.naturalHeight !== 0) {
                    ctx.drawImage(img, this.x, this.y, this.width, this.height);
                    return;
                }
            }
        }

        let charToRender = '?'; 

        if (item.type === 'weapon') {
            charToRender = item.char || PWeapons.getWeaponData(item.weaponId, this.game.config)?.char || 'W';
        } else if (item.type === 'ammo') {
            // itemDefinitions access via game.itemManager
            charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'a';
        } else if (item.type === 'consumable') {
            if(item.id === 'nanite_repair') charToRender='+';
            else if(item.id.includes('adrena_rush') || item.id.includes('injector')) charToRender='>';
            else if(item.id.includes('kaos')) charToRender='!';
            else charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'c';
        } else if (item.type === 'quest_item') {
            if(item.id.includes('xdata')) charToRender='Җ';
            else charToRender = this.game.itemManager.itemDefinitions[item.id]?.char || 'q';
        }

        ctx.fillStyle = this.itemData.color || (item.type === 'weapon' ? this.game.config.COLORS.ITEM_WEAPON : (item.type === 'ammo' ? this.game.config.COLORS.ITEM_AMMO : this.game.config.COLORS.ITEM_GENERIC));
        ctx.font = `${this.game.config.TILE_SIZE*0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charToRender, this.x + this.width/2, this.y + this.height/2 + this.game.config.TILE_SIZE*0.1);
    }

    update(dt) {
        // Items might have animations or logic later
    }
}

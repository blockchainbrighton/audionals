import { GAME_CONFIG } from './config.js';

export class Map {
    constructor(width, height) {
        this.width = Number(width) || GAME_CONFIG.MAP_WIDTH;
        this.height = Number(height) || GAME_CONFIG.MAP_HEIGHT;
        this.tiles = [];
        this.stashHouses = [];
        this.enterableBuildings = [];
        this.generate();
    }

    toTileCoord(value) {
        return Math.floor(Number(value));
    }

    generate() {
        this.tiles = Array(this.height).fill(null).map(() => Array(this.width).fill(1));
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let tile;
                if (x % 8 === 0 || y % 8 === 0) {
                    tile = 0;
                } else if (Math.random() < 0.12) {
                    tile = 2;
                } else if (Math.random() < 0.08) {
                    tile = 3;
                } else if (Math.random() < 0.05) {
                    tile = 6;
                } else {
                    tile = 1;
                }
                this.tiles[y][x] = tile;
            }
        }
        this.placeSpecialTiles();
    }

    placeSpecialTiles() {
        for (let i = 0; i < 6; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.tiles[y]?.[x] === 1) {
                this.tiles[y][x] = 4;
            }
        }

        for (let i = 0; i < 4; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.tiles[y]?.[x] !== 2) {
                this.tiles[y][x] = 5;
                this.stashHouses.push({ x, y, id: i, inventory: [] });
            }
        }

        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.tiles[y]?.[x] !== 2 && this.tiles[y]?.[x] !== 5) {
                this.tiles[y][x] = 6;
                this.enterableBuildings.push({ x, y, id: i, occupied: false, name: `Building ${i + 1}` });
            }
        }
    }

    getTile(x, y) {
        const tileX = this.toTileCoord(x);
        const tileY = this.toTileCoord(y);
        const terrain = GAME_CONFIG.TERRAIN_TYPES;
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return terrain[2];
        }
        const tileIndex = this.tiles[tileY]?.[tileX] ?? 1;
        return terrain[tileIndex] || terrain[1];
    }

    isPassable(x, y) {
        const tile = this.getTile(x, y);
        return tile?.passable ?? false;
    }

    getSpeedModifier(x, y) {
        const tile = this.getTile(x, y);
        return tile?.speed ?? 1.0;
    }

    isBuilding(x, y) {
        const tileX = this.toTileCoord(x);
        const tileY = this.toTileCoord(y);
        return this.tiles[tileY]?.[tileX] === 6;
    }

    getBuildingAt(x, y) {
        const tileX = this.toTileCoord(x);
        const tileY = this.toTileCoord(y);
        return this.enterableBuildings.find(b => b.x === tileX && b.y === tileY);
    }
}

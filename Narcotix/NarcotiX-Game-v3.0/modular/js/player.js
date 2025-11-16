import { GAME_CONFIG } from './config.js';

export class Player {
    constructor(x, y, nftCollection) {
        this.x = Number(x) || 30;
        this.y = Number(y) || 30;
        this.size = 8;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.maxArmor = 100;
        this.cash = 500;
        this.score = 0;
        this.baseSpeed = GAME_CONFIG.PLAYER_BASE_SPEED;
        this.speed = this.baseSpeed;
        this.stealth = 0;
        this.luck = 0;
        this.inventory = [];
        this.maxInventory = 25;
        this.territory = new Set();
        this.income = 0;
        this.statusEffects = [];
        this.selectedPill = null;
        this.selectedWeapon = null;
        this.currentWeapon = 'fists';
        this.weapons = { fists: { ammo: -1, maxAmmo: -1, name: 'FISTS' } };
        this.ownedNFTs = this.generateStarterNFTs(nftCollection);
        this.lastTerritoryClaim = 0;
        this.nftCollection = nftCollection;
        this.inBuilding = false;
        this.buildingTimer = 0;
        this.shelterTime = 0;
        this.buildingUses = 0;
        this.enemiesDefeated = 0;
        this.reloadTimer = 0;
    }

    generateStarterNFTs(nftCollection) {
        const owned = [];
        owned.push(...nftCollection.getPillsByRarity('legendary').slice(0, 2));
        owned.push(...nftCollection.getPillsByRarity('epic').slice(0, 3));
        owned.push(...nftCollection.getPillsByRarity('rare').slice(0, 5));
        while (owned.length < 15) {
            const pill = nftCollection.getRandomPill();
            if (!owned.find(p => p.id === pill.id)) {
                owned.push(pill);
            }
        }
        return owned;
    }

    move(dx, dy, map) {
        if (this.reloadTimer > 0) return;
        const speedMod = map.getSpeedModifier(this.x + dx, this.y + dy);
        const effectMultiplier = this.hasEffect('SPEED') ? GAME_CONFIG.SPEED_EFFECT_MULTIPLIER : 1;
        const finalSpeed = this.speed * speedMod * effectMultiplier;
        
        if (map.isPassable(this.x + dx, this.y + dy)) {
            this.x += dx * finalSpeed;
            this.y += dy * finalSpeed;
            this.claimTerritory();
            this.updateBuildingStatus(map);
        }
    }

    updateBuildingStatus(map) {
        if (map.isBuilding(this.x, this.y)) {
            if (!this.inBuilding) {
                this.inBuilding = true;
                this.shelterTime = GAME_CONFIG.BUILDING_SHELTER_TIME;
            }
        } else {
            this.inBuilding = false;
            this.shelterTime = 0;
        }
    }

    claimTerritory() {
        const now = Date.now();
        if (now - this.lastTerritoryClaim < GAME_CONFIG.TERRITORY_CLAIM_DELAY) return;
        this.lastTerritoryClaim = now;

        const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
        if (!this.territory.has(tileKey)) {
            this.territory.add(tileKey);
            this.updateIncome();
        }
    }

    updateIncome() {
        this.income = Math.floor(this.territory.size * 0.4);
    }

    addToInventory(pill) {
        if (this.inventory.length >= this.maxInventory) return false;
        this.inventory.push(pill);
        this.score += pill.marketValue;
        return true;
    }

    consumePill(pill) {
        if (!pill) return;
        const multiplier = pill.rarity === 'legendary' ? 4 : pill.rarity === 'epic' ? 2.5 : pill.rarity === 'rare' ? 1.8 : 1;
        this.statusEffects.push({
            type: pill.effect,
            duration: pill.duration * multiplier,
            maxDuration: pill.duration * multiplier,
            potency: pill.potency * multiplier,
            pill: pill
        });

        if (pill.sideEffect !== 'NONE') {
            this.statusEffects.push({
                type: pill.sideEffect,
                duration: Math.floor(pill.duration * 0.6),
                maxDuration: Math.floor(pill.duration * 0.6),
                potency: 1,
                pill: pill
            });
        }

        const idx = this.inventory.indexOf(pill);
        if (idx > -1) this.inventory.splice(idx, 1);
    }

    updateStatusEffects() {
        this.speed = this.baseSpeed;
        this.stealth = 0;
        this.luck = 0;
        this.maxHealth = 100;
        this.armor = Math.max(0, this.armor - 0.05);

        this.statusEffects = this.statusEffects.filter(effect => {
            effect.duration -= 0.016;
            if (effect.duration <= 0) return false;

            switch(effect.type) {
                case 'SPEED': this.speed += effect.potency * 0.08; break;
                case 'STRENGTH': this.maxHealth = 100 + effect.potency * 15; break;
                case 'STEALTH': this.stealth = Math.min(100, effect.potency * 20); break;
                case 'LUCK': this.luck = effect.potency * 15; break;
                case 'ARMOR': this.armor = Math.min(this.maxArmor, effect.potency * 10); break;
                case 'HEALTH': this.health = Math.min(this.maxHealth, this.health + effect.potency * 0.3); break;
            }
            return true;
        });

        if (this.reloadTimer > 0) {
            this.reloadTimer -= 16;
        }

        if (this.inBuilding && this.shelterTime > 0) {
            this.shelterTime -= 16;
        }
    }

    hasEffect(type) {
        return this.statusEffects.some(e => e.type === type);
    }

    takeDamage(amount) {
        const armorReduction = Math.min(this.armor, amount * 0.5);
        this.armor -= armorReduction;
        const remainingDamage = amount - armorReduction;
        const stealthReduction = remainingDamage * (this.stealth / 200);
        const actualDamage = Math.floor(remainingDamage - stealthReduction);
        
        this.health -= actualDamage;
        if (this.health <= 0) this.respawn();
        return actualDamage;
    }

    respawn() {
        this.health = this.maxHealth;
        this.armor = 0;
        this.x = Math.floor(Math.random() * GAME_CONFIG.MAP_WIDTH);
        this.y = Math.floor(Math.random() * GAME_CONFIG.MAP_HEIGHT);
        this.cash = Math.max(0, this.cash - 200);
        this.territory.clear();
        this.statusEffects = [];
        this.inBuilding = false;
        this.inventory = this.inventory.slice(0, 5);
    }

    sellPill(pill) {
        const value = Math.floor(pill.marketValue * (1 + this.luck / 100));
        this.cash += value;
        const idx = this.inventory.indexOf(pill);
        if (idx > -1) this.inventory.splice(idx, 1);
        return value;
    }

    addWeapon(weaponType) {
        if (!this.weapons[weaponType]) {
            const weaponData = GAME_CONFIG.WEAPON_TYPES[weaponType];
            this.weapons[weaponType] = {
                ammo: weaponData.ammo,
                maxAmmo: weaponData.ammo,
                name: weaponData.name
            };
        }
    }

    fireWeapon(targetX, targetY) {
        const weaponData = GAME_CONFIG.WEAPON_TYPES[this.currentWeapon];
        const weapon = this.weapons[this.currentWeapon];
        
        if (weapon.ammo === 0) return null;
        if (weapon.ammo > 0) weapon.ammo = Math.max(0, weapon.ammo - 1);
        
        return {
            x: this.x,
            y: this.y,
            targetX,
            targetY,
            damage: weaponData.damage,
            range: weaponData.range,
            speed: 0.6,
            color: weaponData.color,
            type: this.currentWeapon
        };
    }

    reloadWeapon() {
        const weapon = this.weapons[this.currentWeapon];
        if (weapon.ammo !== -1 && weapon.ammo < weapon.maxAmmo && this.reloadTimer <= 0) {
            this.reloadTimer = 2000;
            weapon.ammo = weapon.maxAmmo;
            return true;
        }
        return false;
    }

    switchWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = weaponType;
            return true;
        }
        return false;
    }
}

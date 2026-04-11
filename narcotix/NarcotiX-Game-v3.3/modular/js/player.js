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
        this.weapons = { fists: { ammo: -1, maxAmmo: -1, ammoReserve: -1, name: 'FISTS' } };
        this.ownedNFTs = this.generateStarterNFTs(nftCollection);
        this.lastTerritoryClaim = 0;
        this.nftCollection = nftCollection;
        this.inBuilding = false;
        this.buildingTimer = 0;
        this.shelterTime = 0;
        this.buildingUses = 0;
        this.enemiesDefeated = 0;
        this.reloadTimer = 0;
        this.baseVisionRange = GAME_CONFIG.PLAYER_VISION_RANGE;
        this.visionRange = this.baseVisionRange;
        this.damageMultiplier = 1;
        this.chaosIntensity = 0;
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.sprinting = false;
        this.isMoving = false;
        this.wasSprintingThisFrame = false;
        this.hiredAllies = 0;
        this.onDamage = null;
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

    move(dx, dy, map, deltaSeconds = 0.016) {
        if (this.reloadTimer > 0) return;
        if (dx === 0 && dy === 0) return;

        const inputMagnitude = Math.hypot(dx, dy) || 1;
        const dirX = dx / inputMagnitude;
        const dirY = dy / inputMagnitude;

        const effectMultiplier = this.hasEffect('SPEED') ? GAME_CONFIG.SPEED_EFFECT_MULTIPLIER : 1;
        const frameScalar = deltaSeconds * 60;
        const terrainSpeed = map.getSpeedModifier(this.x, this.y);
        const sprintActive = this.sprinting && this.stamina > 0;
        const sprintMultiplier = sprintActive ? GAME_CONFIG.SPRINT_MULTIPLIER : 1;
        const travelDistance = this.speed * terrainSpeed * effectMultiplier * sprintMultiplier * frameScalar;
        const axisStep = (dirX !== 0 && dirY !== 0) ? travelDistance * Math.SQRT1_2 : travelDistance;
        
        let moved = false;
        if (dirX !== 0) {
            const candidateX = this.x + dirX * axisStep;
            if (map.isPassable(candidateX, this.y)) {
                this.x = candidateX;
                moved = true;
            }
        }

        if (dirY !== 0) {
            const candidateY = this.y + dirY * axisStep;
            if (map.isPassable(this.x, candidateY)) {
                this.y = candidateY;
                moved = true;
            }
        }
        
        if (moved) {
            this.claimTerritory();
            this.updateBuildingStatus(map);
        }
        this.isMoving = moved;
        this.wasSprintingThisFrame = sprintActive && moved;
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
        if (!pill || this.inventory.length >= this.maxInventory) return false;
        this.inventory.push(pill);
        this.score += pill.marketValue;
        return true;
    }

    consumePill(pill) {
        if (!pill) return false;
        const idx = this.inventory.indexOf(pill);
        if (idx === -1) return false;

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

        this.inventory.splice(idx, 1);
        return true;
    }

    updateStatusEffects(deltaSeconds = 0.016, deltaMs = 16) {
        const frameScalar = deltaSeconds * 60;
        this.speed = this.baseSpeed;
        this.stealth = 0;
        this.luck = 0;
        this.maxHealth = 100;
        this.damageMultiplier = 1;
        this.visionRange = this.baseVisionRange;
        this.chaosIntensity = 0;
        const armorDecayPerSecond = 3;
        this.armor = Math.max(0, this.armor - armorDecayPerSecond * deltaSeconds);

        this.statusEffects = this.statusEffects.filter(effect => {
            effect.duration -= deltaSeconds;
            if (effect.duration <= 0) return false;

            switch(effect.type) {
                case 'SPEED':
                    this.speed += effect.potency * 0.08;
                    break;
                case 'STRENGTH':
                    this.maxHealth += effect.potency * 15;
                    this.damageMultiplier += effect.potency * 0.12;
                    break;
                case 'STEALTH':
                    this.stealth = Math.min(100, this.stealth + effect.potency * 20);
                    break;
                case 'LUCK':
                    this.luck = Math.min(100, this.luck + effect.potency * 15);
                    break;
                case 'ARMOR':
                    this.armor = Math.min(this.maxArmor, Math.max(this.armor, effect.potency * 10));
                    break;
                case 'HEALTH':
                    this.health = Math.min(this.maxHealth, this.health + effect.potency * 0.3 * frameScalar);
                    break;
                case 'VISION':
                    this.visionRange += effect.potency * 5;
                    break;
                case 'CHAOS':
                    this.chaosIntensity += effect.potency * 0.5;
                    break;
            }
            return true;
        });

        if (this.reloadTimer > 0) {
            this.reloadTimer = Math.max(0, this.reloadTimer - deltaMs);
        }

        if (this.inBuilding && this.shelterTime > 0) {
            this.shelterTime = Math.max(0, this.shelterTime - deltaMs);
        }

        if (this.wasSprintingThisFrame && this.stamina > 0) {
            this.stamina = Math.max(0, this.stamina - GAME_CONFIG.STAMINA_DRAIN_RATE * deltaSeconds);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + GAME_CONFIG.STAMINA_REGEN_RATE * deltaSeconds);
        }
        if (this.stamina <= 0) {
            this.sprinting = false;
        }

        this.wasSprintingThisFrame = false;
        this.isMoving = false;
    }

    hasEffect(type) {
        return this.statusEffects.some(e => e.type === type);
    }

    setSprinting(active) {
        this.sprinting = !!active && this.stamina > 5;
    }

    addAmmo(weaponType, amount) {
        const weapon = this.weapons[weaponType];
        if (!weapon || weapon.ammoReserve === -1) return false;
        weapon.ammoReserve += amount;
        return true;
    }

    addArmor(amount) {
        this.armor = Math.min(this.maxArmor, this.armor + amount);
        return true;
    }

    recordHire() {
        this.hiredAllies = (this.hiredAllies || 0) + 1;
    }

    takeDamage(amount) {
        const armorReduction = Math.min(this.armor, amount * 0.5);
        this.armor -= armorReduction;
        const remainingDamage = amount - armorReduction;
        const stealthReduction = remainingDamage * (this.stealth / 200);
        const actualDamage = Math.floor(remainingDamage - stealthReduction);
        
        this.health -= actualDamage;
        if (this.onDamage) {
            this.onDamage(actualDamage);
        }
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
                ammoReserve: weaponData.ammo * 3,
                name: weaponData.name
            };
        }
    }

    fireWeapon(targetX, targetY) {
        const weaponData = GAME_CONFIG.WEAPON_TYPES[this.currentWeapon];
        const weapon = this.weapons[this.currentWeapon];
        if (!weaponData || !weapon) return null;
        
        if (weapon.ammo === 0) return null;
        if (weapon.ammo > 0) weapon.ammo = Math.max(0, weapon.ammo - 1);

        let finalTargetX = targetX;
        let finalTargetY = targetY;
        if (this.chaosIntensity > 0) {
            const chaosSpread = this.chaosIntensity * 0.1;
            finalTargetX += (Math.random() - 0.5) * chaosSpread;
            finalTargetY += (Math.random() - 0.5) * chaosSpread;
        }
        
        return {
            x: this.x,
            y: this.y,
            targetX: finalTargetX,
            targetY: finalTargetY,
            damage: weaponData.damage * this.damageMultiplier,
            range: weaponData.range,
            speed: 0.6,
            color: weaponData.color,
            type: this.currentWeapon
        };
    }

    reloadWeapon() {
        const weapon = this.weapons[this.currentWeapon];
        if (!weapon || weapon.ammo === -1 || this.reloadTimer > 0) return false;
        if (weapon.ammoReserve <= 0) return false;
        const needed = weapon.maxAmmo - weapon.ammo;
        if (needed <= 0) return false;
        const toLoad = Math.min(needed, weapon.ammoReserve);
        this.reloadTimer = 2000;
        weapon.ammo += toLoad;
        weapon.ammoReserve -= toLoad;
        return true;
    }

    switchWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = weaponType;
            return true;
        }
        return false;
    }
}

import { GAME_CONFIG, TIPS } from './config.js';

const SHOP_PROFILES = [
    {
        key: 'arms',
        label: 'Arms Dealer',
        pillSlots: 4,
        weapons: ['pistol', 'shotgun', 'rifle'],
        ammoTypes: ['pistol', 'shotgun', 'rifle'],
        armorTiers: [40, 80],
        services: ['thug']
    },
    {
        key: 'defense',
        label: 'Fortified Safehouse',
        pillSlots: 6,
        weapons: ['pistol'],
        ammoTypes: ['pistol'],
        armorTiers: [25, 60, 100],
        services: ['bodyguard']
    },
    {
        key: 'merc',
        label: 'Mercenary Den',
        pillSlots: 3,
        weapons: ['shotgun', 'rifle'],
        ammoTypes: ['shotgun', 'rifle'],
        armorTiers: [50, 90],
        services: ['thug', 'elite']
    },
    {
        key: 'chemist',
        label: 'Underground Lab',
        pillSlots: 10,
        weapons: ['pistol'],
        ammoTypes: [],
        armorTiers: [20, 40],
        services: []
    }
];

const SHOP_SERVICES = {
    thug: {
        id: 'thug',
        name: 'Hire Thug',
        price: 900,
        stats: { damage: 15, range: 6, speed: 0.045, color: '#0ff', fireRate: 1.3 }
    },
    bodyguard: {
        id: 'bodyguard',
        name: 'Hire Bodyguard',
        price: 1200,
        stats: { damage: 18, range: 7, speed: 0.04, color: '#5ff', fireRate: 1.5 }
    },
    elite: {
        id: 'elite',
        name: 'Hire Elite',
        price: 1800,
        stats: { damage: 25, range: 8, speed: 0.05, color: '#a0f', fireRate: 1.8 }
    }
};

export class Car {
    constructor(map) {
        const spawn = Car.findSpawn(map);
        this.x = spawn.x;
        this.y = spawn.y;
        this.direction = spawn.direction;
        this.speed = 0.12;
        this.color = '#5555ff';
        this.size = 14;
    }

    static findSpawn(map) {
        for (let attempt = 0; attempt < 200; attempt++) {
            const x = Math.floor(Math.random() * map.width);
            const y = Math.floor(Math.random() * map.height);
            if (map.isStreet(x, y)) {
                const direction = Math.random() < 0.5 ? (Math.random() < 0.5 ? 'horizontal' : 'vertical') : 'horizontal';
                return { x: x + 0.5, y: y + 0.5, direction };
            }
        }
        return { x: 1, y: 1, direction: 'horizontal' };
    }

    update(map, deltaSeconds = 0.016) {
        const frameScalar = deltaSeconds * 60;
        const step = this.speed * frameScalar;
        let moved = false;

        if (this.direction === 'horizontal') {
            moved = this.tryMove(map, step, 0) || this.tryMove(map, -step, 0);
        } else {
            moved = this.tryMove(map, 0, step) || this.tryMove(map, 0, -step);
        }

        if (!moved) {
            this.direction = this.direction === 'horizontal' ? 'vertical' : 'horizontal';
        }
    }

    tryMove(map, stepX, stepY) {
        const nextX = this.x + stepX;
        const nextY = this.y + stepY;
        if (map.isStreet(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
            return true;
        }
        return false;
    }
}

const PEDESTRIAN_CLASSES = [
    { key: 'civilian', color: '#cccccc', speed: 0.03 },
    { key: 'hustler', color: '#ff8800', speed: 0.045 },
    { key: 'buyer', color: '#33ffaa', speed: 0.035 },
    { key: 'dealer', color: '#ff33aa', speed: 0.04 }
];

export class Pedestrian {
    constructor(map, nftCollection) {
        this.map = map;
        this.nftCollection = nftCollection;
        const spawn = Pedestrian.findSpawn(map);
        this.x = spawn.x;
        this.y = spawn.y;
        this.chooseClass();
        this.wanderTarget = this.randomTarget();
        this.cooldown = 0;
        this.desiredEffect = null;
        this.offerValue = 0;
        this.assignBuyerProfile();
        this.fulfilled = false;
        this.tradeActive = false;
        this.snoozeUntil = 0;
    }

    static findSpawn(map) {
        for (let attempts = 0; attempts < 200; attempts++) {
            const x = Math.random() * map.width;
            const y = Math.random() * map.height;
            if (map.isPassable(x, y)) return { x, y };
        }
        return { x: 1, y: 1 };
    }


    chooseClass() {
        this.profile = PEDESTRIAN_CLASSES[Math.floor(Math.random() * PEDESTRIAN_CLASSES.length)];
        this.speed = this.profile.speed;
        this.color = this.profile.color;
        this.type = this.profile.key;
        this.isBuyer = this.type === 'buyer';
    }

    assignBuyerProfile() {
        if (!this.isBuyer) return;
        const effects = ['SPEED', 'STRENGTH', 'STEALTH', 'VISION', 'LUCK', 'ARMOR', 'HEALTH'];
        this.desiredEffect = effects[Math.floor(Math.random() * effects.length)];
        this.offerValue = 200 + Math.floor(Math.random() * 400);
    }

    randomTarget() {
        return {
            x: Math.min(this.map.width - 1, Math.max(1, this.x + (Math.random() - 0.5) * 8)),
            y: Math.min(this.map.height - 1, Math.max(1, this.y + (Math.random() - 0.5) * 8))
        };
    }

    update(deltaSeconds = 0.016) {
        const frameScalar = deltaSeconds * 60;
        const dx = this.wanderTarget.x - this.x;
        const dy = this.wanderTarget.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const currentTile = this.map.getTile(this.x, this.y);
        const terrainFactor = currentTile.name === 'water' ? 0.4 : currentTile.name === 'grass' ? 0.8 : 1;
        const stepX = (dx / dist) * this.speed * terrainFactor * frameScalar;
        const stepY = (dy / dist) * this.speed * terrainFactor * frameScalar;

        if (!this.map.isPassable(this.x + stepX, this.y)) {
            this.wanderTarget = this.randomTarget();
        } else {
            this.x += stepX;
        }
        if (!this.map.isPassable(this.x, this.y + stepY)) {
            this.wanderTarget = this.randomTarget();
        } else {
            this.y += stepY;
        }

        if (Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y) < 1) {
            this.wanderTarget = this.randomTarget();
        }
    }
}
export class Enemy {
    constructor(x, y, type, nftCollection) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        this.type = type;
        this.stats = { ...GAME_CONFIG.ENEMY_TYPES[type] };
        this.color = this.stats?.color || '#f00';
        this.state = 'patrol';
        this.nftCollection = nftCollection;
        this.lastPillDrop = 0;
        this.detectionTimer = 0;
        this.patrolPath = this.generatePatrolPath();
        this.currentWaypoint = 0;
        this.lastAttackTime = 0;
    }

    moveWithCollision(map, stepX, stepY) {
        let moved = false;
        if (stepX !== 0) {
            const nextX = this.x + stepX;
            if (map.isPassable(nextX, this.y)) {
                this.x = nextX;
                moved = true;
            }
        }
        if (stepY !== 0) {
            const nextY = this.y + stepY;
            if (map.isPassable(this.x, nextY)) {
                this.y = nextY;
                moved = true;
            }
        }
        return moved;
    }

    seekTarget(map, targetX, targetY, speed) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const len = Math.hypot(dx, dy) || 1;
        const primaryStep = { x: (dx / len) * speed, y: (dy / len) * speed };
        if (this.moveWithCollision(map, primaryStep.x, primaryStep.y)) return true;

        const candidates = [
            { x: primaryStep.x, y: 0 },
            { x: 0, y: primaryStep.y },
            { x: primaryStep.x * 0.5, y: primaryStep.y * 0.5 },
            { x: primaryStep.y, y: primaryStep.x },
            { x: -primaryStep.y, y: primaryStep.x }
        ];
        for (const step of candidates) {
            if (this.moveWithCollision(map, step.x, step.y)) {
                return true;
            }
        }
        return false;
    }

    generatePatrolPath() {
        const path = [];
        const numPoints = Math.floor(Math.random() * 4) + 3;
        for (let i = 0; i < numPoints; i++) {
            path.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y + (Math.random() - 0.5) * 20
            });
        }
        return path;
    }

    update(player, map, deltaSeconds = 0.016, worldState = {}) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const playerInBuilding = player.inBuilding;
        const frameScalar = deltaSeconds * 60;
        const wantedLevel = worldState.wantedLevel || 0;
        
        let shouldChase = false;
        const detectionActive = this.stats.detectionRange > 0 && dist < this.stats.detectionRange && !player.hasEffect('STEALTH') && !playerInBuilding;
        const policeEligible = this.type === 'police' && (worldState.crimeBroadcast || this.alerted);
        
        if (detectionActive && (this.type !== 'police' || wantedLevel > 0 || policeEligible)) {
            this.detectionTimer += deltaSeconds;
            if (this.detectionTimer >= GAME_CONFIG.DETECTION_TIME_REQUIRED) {
                shouldChase = true;
                if (this.type === 'police' && this.detectionTimer >= GAME_CONFIG.DETECTION_TIME_REQUIRED) {
                    this.alerted = true;
                }
            }
        } else {
            this.detectionTimer = Math.max(0, this.detectionTimer - deltaSeconds * 2);
        }

        if (shouldChase && !playerInBuilding) {
            this.state = 'chase';
        } else if (this.stats.patrol) {
            this.state = 'patrol';
        } else {
            this.state = 'idle';
        }

        switch(this.state) {
            case 'chase':
                if (!playerInBuilding) {
                    const chaseSpeed = this.stats.speed * frameScalar;
                    this.seekTarget(map, player.x, player.y, chaseSpeed);
                }
                break;
            
            case 'patrol':
                if (this.patrolPath.length > 0) {
                    const waypoint = this.patrolPath[this.currentWaypoint];
                    const dx = waypoint.x - this.x;
                    const dy = waypoint.y - this.y;
                    const len = Math.hypot(dx, dy) || 1;
                    
                    if (len < 1.5) {
                        this.currentWaypoint = (this.currentWaypoint + 1) % this.patrolPath.length;
                    } else {
                        const patrolSpeed = this.stats.speed * 0.7 * frameScalar;
                        this.seekTarget(map, waypoint.x, waypoint.y, patrolSpeed);
                    }
                }
                break;
            
            case 'idle':
                if (Math.random() < 0.003 * frameScalar) {
                    const stepX = (Math.random() - 0.5) * 0.3 * frameScalar;
                    const stepY = (Math.random() - 0.5) * 0.3 * frameScalar;
                    this.moveWithCollision(map, stepX, stepY);
                }
                break;
        }

        if (dist < 2 && !playerInBuilding && Date.now() - this.lastAttackTime > 1500) {
            player.takeDamage(this.stats.damage);
            this.lastAttackTime = Date.now();
        }
    }

    dropLoot() {
        const now = Date.now();
        if (now - this.lastPillDrop < 3000) return null;
        this.lastPillDrop = now;

        const dropChance = this.type === 'boss' ? 0.9 : this.type === 'police' ? 0.4 : 0.6;
        return Math.random() < dropChance ? this.nftCollection.getRandomPill() : null;
    }

    get size() {
        return this.type === 'boss' ? 12 : 8;
    }
}

export class Shop {
    constructor(x, y, nftCollection) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        this.inventory = [];
        this.weapons = [];
        this.ammoPacks = [];
        this.armorItems = [];
        this.services = [];
        this.profile = SHOP_PROFILES[Math.floor(Math.random() * SHOP_PROFILES.length)] || SHOP_PROFILES[0];
        this.nftCollection = nftCollection;
        this.restock();
        this.lastRestock = Date.now();
    }

    restock() {
        this.inventory = [];
        this.weapons = [];
        this.ammoPacks = [];
        this.armorItems = [];
        this.services = [];
        
        const pillSlots = this.profile.pillSlots || 6;
        for (let i = 0; i < pillSlots; i++) {
            const pill = this.nftCollection.getRandomPill();
            const price = Math.floor(pill.marketValue * (0.7 + Math.random() * 0.6));
            this.inventory.push({ pill, price });
        }

        const weaponTypes = this.profile.weapons || [];
        weaponTypes.forEach(weapon => {
            const weaponData = GAME_CONFIG.WEAPON_TYPES[weapon];
            if (weaponData) {
                const variance = 0.8 + Math.random() * 0.6;
                const price = Math.floor((weaponData.damage * 55 + weaponData.range * 25) * variance);
                this.weapons.push({ type: weapon, price, data: weaponData });
            }
        });

        const ammoTypes = this.profile.ammoTypes || [];
        ammoTypes.forEach(type => {
            const pack = this.createAmmoPack(type);
            if (pack) this.ammoPacks.push(pack);
        });

        const armorTiers = this.profile.armorTiers || [];
        armorTiers.forEach(amount => {
            const price = Math.floor(amount * 12 + Math.random() * amount * 2);
            this.armorItems.push({ amount, price });
        });

        const services = this.profile.services || [];
        services.forEach(id => {
            const service = SHOP_SERVICES[id];
            if (service) {
                this.services.push({
                    id: service.id,
                    name: service.name,
                    price: service.price,
                    stats: { ...service.stats }
                });
            }
        });
    }

    createAmmoPack(weaponType) {
        const weaponData = GAME_CONFIG.WEAPON_TYPES[weaponType];
        if (!weaponData || weaponData.ammo <= 0) return null;
        const multiplier = 1 + Math.floor(Math.random() * 3);
        const amount = weaponData.ammo * multiplier;
        const price = Math.floor(amount * weaponData.damage * 1.8);
        return {
            type: weaponType,
            amount,
            price,
            label: `${weaponData.name} Ammo (+${amount})`
        };
    }

    update() {
        const now = Date.now();
        if (now - this.lastRestock > 90000) {
            this.restock();
            this.lastRestock = now;
        }
    }
}

export class Ally {
    constructor(x, y, config = {}) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        this.speed = config.speed ?? 0.05;
        this.damage = config.damage ?? 15;
        this.range = config.range ?? 6;
        this.color = config.color ?? '#0ff';
        this.cooldown = 0;
        this.fireRate = config.fireRate ?? 1.2;
        this.formationAngle = Math.random() * Math.PI * 2;
    }

    moveWithCollision(map, stepX, stepY) {
        if (stepX !== 0) {
            const nextX = this.x + stepX;
            if (map.isPassable(nextX, this.y)) {
                this.x = nextX;
            }
        }
        if (stepY !== 0) {
            const nextY = this.y + stepY;
            if (map.isPassable(this.x, nextY)) {
                this.y = nextY;
            }
        }
    }

    update(map, player, enemies, deltaSeconds = 0.016) {
        const frameScalar = deltaSeconds * 60;
        const orbitRadius = 2 + Math.sin(this.formationAngle) * 0.3;
        const targetX = player.x + Math.cos(this.formationAngle) * orbitRadius;
        const targetY = player.y + Math.sin(this.formationAngle) * orbitRadius;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const len = Math.hypot(dx, dy) || 1;
        const step = this.speed * frameScalar * 0.8;
        this.moveWithCollision(map, (dx / len) * step, (dy / len) * step);
        this.formationAngle += deltaSeconds * 0.6;

        this.cooldown = Math.max(0, this.cooldown - deltaSeconds);
        if (this.cooldown > 0 || enemies.length === 0) return null;

        let closest = null;
        let closestDist = Infinity;
        enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < closestDist && dist <= this.range) {
                closest = enemy;
                closestDist = dist;
            }
        });

        if (closest) {
            this.cooldown = 1 / this.fireRate;
            return { target: closest, damage: this.damage, color: this.color };
        }
        return null;
    }
}

export class QuestSystem {
    constructor() {
        this.activeQuests = [];
        this.completedQuests = 0;
        this.storyProgress = 0;
        this.generateQuests();
    }

    generateQuests() {
        this.activeQuests = [
            {
                id: 1, title: "Territory Expansion", desc: "Control 75 tiles of territory to establish your presence",
                target: 75, current: 0, reward: 2000, type: 'territory', story: "The streets are watching. Make your mark."
            },
            {
                id: 2, title: "Pill Collector", desc: "Collect 15 unique pills to expand your inventory",
                target: 15, current: 0, reward: 1000, type: 'collect', story: "Knowledge is power. Each pill teaches you something new."
            },
            {
                id: 3, title: "Survivalist", desc: "Reach a score of 10000 through strategic gameplay",
                target: 10000, current: 0, reward: 3000, type: 'score', story: "In this world, only the smart survive."
            },
            {
                id: 4, title: "Building Master", desc: "Use enterable buildings 10 times to escape enemies",
                target: 10, current: 0, reward: 1500, type: 'shelter', story: "Every building could be your sanctuary... or your tomb."
            },
            {
                id: 5, title: "Weapon Specialist", desc: "Defeat 20 enemies using different weapon types",
                target: 20, current: 0, reward: 2500, type: 'combat', story: "Firepower speaks louder than words in the underground."
            }
        ];
    }

    updateQuests(player) {
        this.activeQuests.forEach(quest => {
            switch(quest.type) {
                case 'territory': quest.current = player.territory.size; break;
                case 'collect': quest.current = player.inventory.length; break;
                case 'score': quest.current = player.score; break;
                case 'shelter': quest.current = player.buildingUses || 0; break;
                case 'combat': quest.current = player.enemiesDefeated || 0; break;
            }

            if (quest.current >= quest.target && !quest.completed) {
                this.completeQuest(quest, player);
            }
        });
    }

    completeQuest(quest, player) {
        player.cash += quest.reward;
        player.score += quest.reward * 3;
        quest.completed = true;
        this.completedQuests++;
        this.storyProgress++;
        this.generateNewQuest();
    }

    generateNewQuest() {
        const newQuests = [
            {
                id: Date.now(), title: "Drug Lord", desc: "Control 200 tiles of territory",
                target: 200, current: 0, reward: 5000, type: 'territory', story: "You're becoming a legend in the underground."
            },
            {
                id: Date.now() + 1, title: "Master Chemist", desc: "Collect 5 legendary pills",
                target: 5, current: 0, reward: 4000, type: 'legendary', story: "The most powerful substances are also the most dangerous."
            }
        ];
        
        if (this.activeQuests.length < 7) {
            this.activeQuests.push(newQuests[Math.floor(Math.random() * newQuests.length)]);
        }
    }
}

export class TipsSystem {
    constructor() {
        this.currentTip = 0;
        this.tips = TIPS;
        this.lastTipChange = Date.now();
        this.tipInterval = 15000;
    }

    update() {
        const now = Date.now();
        if (now - this.lastTipChange > this.tipInterval) {
            this.currentTip = (this.currentTip + 1) % this.tips.length;
            this.lastTipChange = now;
            this.displayTip();
        }
    }

    displayTip() {
        const tipContent = document.getElementById('tipContent');
        const tipCounter = document.getElementById('tipCounter');
        
        if (tipContent && tipCounter) {
            tipContent.textContent = this.tips[this.currentTip];
            tipCounter.textContent = this.currentTip + 1;
        }
    }

    initialize() {
        document.getElementById('totalTips').textContent = this.tips.length;
        this.displayTip();
    }
}

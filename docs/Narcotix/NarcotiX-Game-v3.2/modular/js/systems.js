import { GAME_CONFIG, TIPS } from './config.js';

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

    update(player, map, deltaSeconds = 0.016) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const playerInBuilding = player.inBuilding;
        const frameScalar = deltaSeconds * 60;
        
        let shouldChase = false;
        if (this.stats.detectionRange > 0 && dist < this.stats.detectionRange && !player.hasEffect('STEALTH') && !playerInBuilding) {
            this.detectionTimer += deltaSeconds;
            if (this.detectionTimer >= GAME_CONFIG.DETECTION_TIME_REQUIRED) {
                shouldChase = true;
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
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const chaseSpeed = this.stats.speed * frameScalar;
                    this.x += (dx / len) * chaseSpeed;
                    this.y += (dy / len) * chaseSpeed;
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
                        this.x += (dx / len) * patrolSpeed;
                        this.y += (dy / len) * patrolSpeed;
                    }
                }
                break;
            
            case 'idle':
                if (Math.random() < 0.003 * frameScalar) {
                    this.x += (Math.random() - 0.5) * 0.3 * frameScalar;
                    this.y += (Math.random() - 0.5) * 0.3 * frameScalar;
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
        this.nftCollection = nftCollection;
        this.restock();
        this.lastRestock = Date.now();
    }

    restock() {
        this.inventory = [];
        this.weapons = [];
        
        for (let i = 0; i < 12; i++) {
            const pill = this.nftCollection.getRandomPill();
            const price = Math.floor(pill.marketValue * (0.7 + Math.random() * 0.6));
            this.inventory.push({ pill, price });
        }

        const weaponTypes = ['pistol', 'shotgun', 'rifle'];
        weaponTypes.forEach(weapon => {
            const weaponData = GAME_CONFIG.WEAPON_TYPES[weapon];
            const price = Math.floor(weaponData.damage * 50 + weaponData.range * 20);
            this.weapons.push({ type: weapon, price, data: weaponData });
        });
    }

    update() {
        const now = Date.now();
        if (now - this.lastRestock > 90000) {
            this.restock();
            this.lastRestock = now;
        }
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

import { GAME_CONFIG } from './config.js';
import { NFTCollection } from './nft.js';
import { Map } from './map.js';
import { Player } from './player.js';
import { Bullet, DamageNumber } from './combat.js';
import { Enemy, Shop, QuestSystem, TipsSystem, Ally, Car, Pedestrian } from './systems.js';

class NarcotiXGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.crosshair = document.getElementById('crosshair');
        
        this.canvas.width = GAME_CONFIG.MAP_WIDTH * GAME_CONFIG.TILE_SIZE;
        this.canvas.height = GAME_CONFIG.MAP_HEIGHT * GAME_CONFIG.TILE_SIZE;

        this.nftCollection = new NFTCollection();
        this.map = new Map(GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);
        this.player = new Player(GAME_CONFIG.MAP_WIDTH / 2, GAME_CONFIG.MAP_HEIGHT / 2, this.nftCollection);
        this.player.onDamage = (amount) => this.handlePlayerDamage(amount);
        
        this.enemies = [];
        this.shops = [];
        this.allies = [];
        this.cars = [];
        this.pedestrians = [];
        this.questSystem = new QuestSystem();
        this.tipsSystem = new TipsSystem();
        this.keys = {};
        this.lastTime = 0;
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.droppedPills = [];
        this.bullets = [];
        this.explosions = [];
        this.damageNumbers = [];
        this.hitBursts = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        this.lastFireTime = 0;
        this.lastReloadTime = 0;
        this.damageOverlay = 0;
        this.cameraShake = 0;
        this.wantedLevel = 0;
        this.lastCrimeTime = 0;
        this.wantedDecayTimer = 0;
        this.crimeBroadcast = false;
        this.activeBuyer = null;
        this.activeShop = null;
        this.pauseReasons = new Set();

        this.bindButtonEvents();
        this.initialize();
    }

    bindButtonEvents() {
        document.getElementById('closeInvBtn').onclick = () => this.toggleInventory();
        document.getElementById('usePillBtn').onclick = () => this.consumePill();
        document.getElementById('equipWeaponBtn').onclick = () => this.equipWeapon();
        document.getElementById('closeShopBtn').onclick = () => this.closeShop();
        document.getElementById('closeLegendBtn').onclick = () => this.closeLegend();
        document.getElementById('closeTradeBtn').onclick = () => this.closeTradePanel();
    }

    initialize() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (this.crosshair) this.crosshair.style.display = 'block';
        }, 2000);

        for (let i = 0; i < 6; i++) {
            const spawn = this.getValidSpawnPoint(GAME_CONFIG.MIN_SPAWN_DISTANCE, GAME_CONFIG.MAP_WIDTH / 2, GAME_CONFIG.MAP_HEIGHT / 2);
            const x = spawn.x;
            const y = spawn.y;
            const types = ['thug', 'rogue', 'police'];
            const type = i < 1 ? 'boss' : types[Math.floor(Math.random() * types.length)];
            this.enemies.push(new Enemy(x, y, type, this.nftCollection));
        }

        this.map.stashHouses.forEach(shopData => {
            this.shops.push(new Shop(shopData.x, shopData.y, this.nftCollection));
        });

        for (let i = 0; i < 6; i++) {
            this.cars.push(new Car(this.map));
        }

        for (let i = 0; i < 25; i++) {
            this.pedestrians.push(new Pedestrian(this.map, this.nftCollection));
        }

        this.player.ownedNFTs.forEach(pill => {
            this.player.addToInventory(pill);
        });
        this.player.addWeapon('pistol');

        this.setupEventListeners();
        this.tipsSystem.initialize();
        this.gameLoop();
    }

    setupEventListeners() {
        const weaponHotkeys = ['fists', 'pistol', 'shotgun', 'rifle'];

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            
            if (/^[1-9]$/.test(key)) {
                const requested = weaponHotkeys[Number(key) - 1];
                if (requested && this.player.weapons[requested]) {
                    this.player.switchWeapon(requested);
                }
                return;
            }
            
            switch(key) {
                case 'i':
                    this.toggleInventory();
                    break;
                case 'e':
                    this.interact();
                    break;
                case 'q':
                    this.toggleQuestPanel();
                    break;
                case ' ':
                    this.consumePill();
                    break;
                case 'k':
                    this.toggleLegend();
                    break;
                case 'r':
                    this.reloadWeapon();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const displayX = e.clientX - rect.left;
            const displayY = e.clientY - rect.top;
            this.mouseX = displayX * scaleX;
            this.mouseY = displayY * scaleY;
            this.mouseWorldX = (this.camera.x + this.mouseX) / GAME_CONFIG.TILE_SIZE;
            this.mouseWorldY = (this.camera.y + this.mouseY) / GAME_CONFIG.TILE_SIZE;
            
            if (this.crosshair) {
                this.crosshair.style.left = `${displayX - 10}px`;
                this.crosshair.style.top = `${displayY - 10}px`;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.fireWeapon();
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const canvasX = (e.clientX - rect.left) * scaleX;
            const canvasY = (e.clientY - rect.top) * scaleY;
            const x = (this.camera.x + canvasX) / GAME_CONFIG.TILE_SIZE;
            const y = (this.camera.y + canvasY) / GAME_CONFIG.TILE_SIZE;
            this.handleCanvasClick(x, y);
        });
    }

    handleCanvasClick(x, y) {
        this.droppedPills = this.droppedPills.filter(pill => {
            const dist = Math.hypot(pill.x - x, pill.y - y);
            if (dist < 1.5) {
                if (this.player.addToInventory(pill)) {
                    this.createParticle(pill.x, pill.y, '+PILL', '#0f0');
                    return false;
                }
            }
            return true;
        });
    }

    autoCollectPills() {
        const radius = 1.6;
        this.droppedPills = this.droppedPills.filter(pill => {
            const dist = Math.hypot(pill.x - this.player.x, pill.y - this.player.y);
            if (dist < radius) {
                if (this.player.addToInventory(pill)) {
                    this.createParticle(pill.x, pill.y, '+PILL', '#0f0');
                    this.updateInventoryUI();
                    return false;
                }
            }
            return true;
        });
    }

    toggleInventory() {
        const panel = document.getElementById('inventoryPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        this.updateInventoryUI();
    }

    toggleQuestPanel() {
        const panel = document.getElementById('questPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    updateInventoryUI() {
        const grid = document.getElementById('inventoryGrid');
        const count = document.getElementById('invCount');
        grid.innerHTML = '';
        count.textContent = this.player.inventory.length;

        this.player.inventory.forEach((pill) => {
            const div = document.createElement('div');
            div.className = `pill rarity-${pill.rarity}`;
            div.style.borderColor = pill.color;
            div.style.boxShadow = pill.rarity === 'legendary' ? `0 0 ${8 * pill.visualTrait.glowIntensity}px ${pill.color}` : 'none';
            div.textContent = pill.name.substring(0, 6);
            div.title = `${pill.name}\nEffect: ${pill.effect}\nRarity: ${pill.rarity}\nValue: $${pill.marketValue}\nDuration: ${pill.duration}s\nSide Effect: ${pill.sideEffect}`;
            div.onclick = () => {
                this.player.selectedPill = pill;
                document.querySelectorAll('.pill').forEach(p => p.style.borderWidth = '1px');
                div.style.borderWidth = '3px';
            };
            grid.appendChild(div);
        });
    }

    interact() {
        this.shops.forEach(shop => {
            const dist = Math.hypot(this.player.x - shop.x, this.player.y - shop.y);
            if (dist < 3) {
                this.openShop(shop);
            }
        });

        const building = this.map.getBuildingAt(this.player.x, this.player.y);
        if (building) {
            this.player.buildingUses++;
            this.player.inBuilding = true;
            this.player.shelterTime = GAME_CONFIG.BUILDING_SHELTER_TIME;
            this.createParticle(this.player.x, this.player.y, 'BUILDING SECURED!', '#0f0');
        }
    }

    openShop(shop) {
        const panel = document.getElementById('shopPanel');
        panel.style.display = 'block';
        const profileLabel = (shop.profile && shop.profile.label) ? shop.profile.label : 'Stash House';
        const title = panel.querySelector('h3');
        if (title) {
            title.textContent = `🏪 ${profileLabel}`;
        }
        this.activeShop = shop;
        this.pauseGame('shop');
        
        const inv = document.getElementById('shopInventory');
        inv.innerHTML = `<p style="color: #888; margin: 0 0 6px;">${profileLabel}</p>`;
        inv.innerHTML += '<h4 style="color: #f0f;">Sell Your Pills:</h4>';

        this.player.inventory.forEach(pill => {
            const price = Math.floor(pill.marketValue * 0.8);
            const btn = document.createElement('button');
            btn.textContent = `${pill.name.substring(0, 15)} - $${price}`;
            btn.onclick = () => {
                const soldPrice = this.player.sellPill(pill);
                this.createParticle(this.player.x, this.player.y, `+$${soldPrice}`, '#ff0');
                this.updateUI();
                this.openShop(shop);
            };
            inv.appendChild(btn);
        });

        inv.innerHTML += '<h4 style="color: #0f0;">Buy New Pills:</h4>';
        shop.inventory.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = `${item.pill.name.substring(0, 15)} - $${item.price}`;
            btn.onclick = () => {
                if (this.player.cash < item.price) {
                    this.createParticle(this.player.x, this.player.y, 'NEED MORE CASH', '#f00');
                    return;
                }
                if (!this.player.addToInventory(item.pill)) {
                    this.createParticle(this.player.x, this.player.y, 'INVENTORY FULL', '#f00');
                    return;
                }
                this.player.cash -= item.price;
                this.updateUI();
                this.updateInventoryUI();
                this.createParticle(this.player.x, this.player.y, `+${item.pill.name.substring(0, 10)}`, '#0f0');
            };
            inv.appendChild(btn);
        });

        inv.innerHTML += '<h4 style="color: #f00;">Buy Weapons:</h4>';
        shop.weapons.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = `${item.data.name} - $${item.price} (DMG: ${item.data.damage})`;
            btn.onclick = () => {
                if (this.player.cash < item.price) {
                    this.createParticle(this.player.x, this.player.y, 'NEED MORE CASH', '#f00');
                    return;
                }
                if (this.player.weapons[item.type]) {
                    this.createParticle(this.player.x, this.player.y, 'ALREADY OWNED', '#ff0');
                    return;
                }
                this.player.cash -= item.price;
                this.player.addWeapon(item.type);
                this.updateUI();
                this.createParticle(this.player.x, this.player.y, `+${item.data.name}`, '#f0f');
            };
            inv.appendChild(btn);
        });

        const ammoPacks = shop.ammoPacks || [];
        const armorItems = shop.armorItems || [];
        const services = shop.services || [];

        if (ammoPacks.length > 0 || armorItems.length > 0) {
            inv.innerHTML += '<h4 style="color: #0ff;">Ammo & Armor:</h4>';
        }

        ammoPacks.forEach(pack => {
            const weaponData = GAME_CONFIG.WEAPON_TYPES[pack.type];
            const btn = document.createElement('button');
            btn.textContent = `${pack.label} - $${pack.price}`;
            btn.onclick = () => {
                if (this.player.cash < pack.price) {
                    this.createParticle(this.player.x, this.player.y, 'NEED MORE CASH', '#f00');
                    return;
                }
                if (!weaponData || !this.player.weapons[pack.type]) {
                    this.createParticle(this.player.x, this.player.y, 'NEED WEAPON FIRST', '#f00');
                    return;
                }
                if (this.player.addAmmo(pack.type, pack.amount)) {
                    this.player.cash -= pack.price;
                    this.updateUI();
                    this.createParticle(this.player.x, this.player.y, `+${pack.amount} AMMO`, '#0ff');
                } else {
                    this.createParticle(this.player.x, this.player.y, 'CANNOT LOAD', '#f00');
                }
            };
            inv.appendChild(btn);
        });

        armorItems.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = `Armor +${item.amount} - $${item.price}`;
            btn.onclick = () => {
                if (this.player.cash < item.price) {
                    this.createParticle(this.player.x, this.player.y, 'NEED MORE CASH', '#f00');
                    return;
                }
                this.player.cash -= item.price;
                this.player.addArmor(item.amount);
                this.updateUI();
                this.createParticle(this.player.x, this.player.y, '+ARMOR', '#0ff');
            };
            inv.appendChild(btn);
        });

        if (services.length > 0) {
            inv.innerHTML += '<h4 style="color: #ffa500;">Hire Muscle:</h4>';
            services.forEach(service => {
                const btn = document.createElement('button');
                btn.textContent = `${service.name} - $${service.price}`;
                btn.onclick = () => {
                    if (this.player.cash < service.price) {
                        this.createParticle(this.player.x, this.player.y, 'NEED MORE CASH', '#f00');
                        return;
                    }
                    this.player.cash -= service.price;
                    this.addAlly(service.stats);
                    this.updateUI();
                    this.createParticle(this.player.x, this.player.y, service.name.toUpperCase(), '#ffa500');
                };
                inv.appendChild(btn);
            });
        }
    }

    closeShop() {
        document.getElementById('shopPanel').style.display = 'none';
        this.activeShop = null;
        this.resumeGame('shop');
    }

    openTradePanel(buyer) {
        if (!buyer) return;
        this.activeBuyer = buyer;
        const panel = document.getElementById('tradePanel');
        const details = document.getElementById('tradeDetails');
        const options = document.getElementById('tradeOptions');
        panel.style.display = 'block';

        const matches = this.player.inventory.filter(p => p.effect === buyer.desiredEffect);
        details.innerHTML = `
            <p><strong>Buyer wants:</strong> ${buyer.desiredEffect}</p>
            <p><strong>Offer:</strong> $${buyer.offerValue} + tip (20% of pill value)</p>
            <p><em>Get close and pick a pill to trade.</em></p>
        `;

        options.innerHTML = '';
        if (matches.length === 0) {
            const msg = document.createElement('div');
            msg.style.color = '#ff0';
            msg.textContent = 'You have no pills with that effect.';
            options.appendChild(msg);
        } else {
            matches.forEach(pill => {
                const btn = document.createElement('button');
                btn.textContent = `${pill.name.substring(0, 14)} ($${pill.marketValue})`;
                btn.onclick = () => this.sellPillToBuyer(buyer, pill);
                options.appendChild(btn);
            });
        }
        this.pauseGame('trade');
    }

    closeTradePanel() {
        const panel = document.getElementById('tradePanel');
        panel.style.display = 'none';
        this.activeBuyer = null;
        this.resumeGame('trade');
    }

    sellPillToBuyer(buyer, pill) {
        if (!buyer || !pill) return;
        const salePrice = buyer.offerValue + Math.floor(pill.marketValue * 0.2);
        const idx = this.player.inventory.indexOf(pill);
        if (idx > -1) this.player.inventory.splice(idx, 1);
        this.player.cash += salePrice;
        this.player.score += salePrice;
        buyer.fulfilled = true;
        this.pedestrians = this.pedestrians.filter(p => p !== buyer);
        this.createParticle(buyer.x, buyer.y, `SOLD ${buyer.desiredEffect}!`, '#33ffaa');
        this.updateInventoryUI();
        this.updateUI();
        this.closeTradePanel();
    }

    toggleLegend() {
        const panel = document.getElementById('legendPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    closeLegend() {
        document.getElementById('legendPanel').style.display = 'none';
    }

    consumePill() {
        if (!this.player.selectedPill) {
            this.createParticle(this.player.x, this.player.y, 'SELECT A PILL', '#f00');
            return;
        }

        const pillColor = this.player.selectedPill.color || '#fff';
        const consumed = this.player.consumePill(this.player.selectedPill);
        this.player.selectedPill = null;

        if (consumed) {
            this.createParticle(this.player.x, this.player.y, 'CONSUMED!', pillColor);
            this.updateInventoryUI();
            this.updateUI();
        } else {
            this.createParticle(this.player.x, this.player.y, 'NOT AVAILABLE', '#f00');
            this.updateInventoryUI();
        }
    }

    equipWeapon() {
        const weapons = Object.keys(this.player.weapons);
        const currentIndex = weapons.indexOf(this.player.currentWeapon);
        const nextIndex = (currentIndex + 1) % weapons.length;
        this.player.currentWeapon = weapons[nextIndex];
        this.updateUI();
    }

    handlePlayerDamage(amount) {
        this.damageOverlay = Math.min(1, this.damageOverlay + amount / 80);
        this.cameraShake = Math.min(8, this.cameraShake + amount * 0.05);
        this.createParticle(this.player.x, this.player.y, `-${Math.floor(amount)}`, '#f55');
    }

    addAlly(config = {}) {
        const ally = new Ally(this.player.x, this.player.y, config);
        this.allies.push(ally);
        this.player.recordHire();
        this.createParticle(this.player.x, this.player.y, 'ALLY HIRED', '#0ff');
    }

    pauseGame(reason) {
        if (reason) this.pauseReasons.add(reason);
    }

    resumeGame(reason) {
        if (reason) this.pauseReasons.delete(reason);
    }

    isPaused() {
        return this.pauseReasons.size > 0;
    }

    registerCrime(severity = 1, position = { x: this.player.x, y: this.player.y }) {
        this.wantedLevel = Math.min(GAME_CONFIG.MAX_WANTED_LEVEL, this.wantedLevel + severity);
        this.lastCrimeTime = Date.now();
        this.wantedDecayTimer = 0;
        this.crimeBroadcast = true;
        this.cameraShake = Math.min(10, this.cameraShake + severity * 0.5);
        this.damageOverlay = Math.min(1, this.damageOverlay + 0.1 * severity);
        this.enemies.forEach(enemy => {
            if (enemy.type === 'police') {
                const dist = Math.hypot(enemy.x - position.x, enemy.y - position.y);
                if (dist < enemy.stats.detectionRange * 1.2) {
                    enemy.alerted = true;
                }
            }
        });
    }

    reportGunshot(position = { x: this.player.x, y: this.player.y }) {
        let witnessed = false;
        this.enemies.forEach(enemy => {
            if (enemy.type === 'police') {
                const dist = Math.hypot(enemy.x - position.x, enemy.y - position.y);
                if (dist < enemy.stats.detectionRange && !this.player.hasEffect('STEALTH')) {
                    enemy.alerted = true;
                    witnessed = true;
                }
            }
        });
        if (witnessed) {
            this.registerCrime(1, position);
        }
    }

    fireWeapon() {
        const now = Date.now();
        const weaponData = GAME_CONFIG.WEAPON_TYPES[this.player.currentWeapon];
        
        if (now - this.lastFireTime < weaponData.cooldown || this.player.reloadTimer > 0) return;
        
        const bullet = this.player.fireWeapon(this.mouseWorldX, this.mouseWorldY);
        if (bullet) {
            this.bullets.push(new Bullet(bullet.x, bullet.y, bullet.targetX, bullet.targetY, 
                                       bullet.damage, bullet.range, bullet.color, bullet.type));
            this.lastFireTime = now;
            this.createParticle(this.player.x, this.player.y, 'FIRE!', bullet.color);
            this.reportGunshot({ x: this.player.x, y: this.player.y });
        }
    }

    reloadWeapon() {
        const now = Date.now();
        if (now - this.lastReloadTime < 500) return;
        
        if (this.player.reloadWeapon()) {
            this.lastReloadTime = now;
            this.createParticle(this.player.x, this.player.y, 'RELOADING...', '#ff0');
        }
    }

    createParticle(x, y, text, color) {
        this.particles.push({ x, y, text, color, life: 1.0, vy: -0.5 });
    }

    createExplosion(x, y) {
        this.explosions.push({ x, y, life: 0.5 });
    }

    createDamageNumber(x, y, damage, color = '#ff0') {
        this.damageNumbers.push(new DamageNumber(x, y, damage, color));
    }

    createBang(x, y) {
        this.hitBursts.push({ x, y, life: 0.4 });
    }

    applyDamageToEnemy(enemy, damage, color = '#ff0') {
        if (!enemy) return;
        const previousHp = enemy.stats.hp;
        enemy.stats.hp -= damage;
        const dealt = Math.max(0, previousHp - Math.max(0, enemy.stats.hp));
        if (dealt > 0) {
            this.createDamageNumber(enemy.x, enemy.y, dealt, color);
        }
        if (enemy.stats.hp <= 0) {
            const loot = enemy.dropLoot();
            if (loot) {
                loot.x = enemy.x;
                loot.y = enemy.y;
                this.droppedPills.push(loot);
            }
            const idx = this.enemies.indexOf(enemy);
            if (idx > -1) this.enemies.splice(idx, 1);
            this.player.enemiesDefeated++;
            this.createParticle(enemy.x, enemy.y, 'ELIMINATED!', '#f00');
        }
    }

    updateParticles(deltaSeconds, deltaFactor) {
        this.particles = this.particles.filter(p => {
            p.life -= deltaSeconds;
            p.y += p.vy * deltaFactor;
            return p.life > 0;
        });

        this.explosions = this.explosions.filter(e => {
            e.life -= deltaSeconds;
            return e.life > 0;
        });

        this.damageNumbers = this.damageNumbers.filter(d => d.update(deltaSeconds, deltaFactor));

        this.hitBursts = this.hitBursts.filter(b => {
            const fadePerSecond = 1.8;
            b.life -= fadePerSecond * deltaSeconds;
            return b.life > 0;
        });
    }

    updateBullets(deltaFactor) {
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.update(deltaFactor)) {
                return false;
            }

            const hitEnemy = bullet.checkCollision(this.enemies);
            if (hitEnemy) {
                this.createExplosion(bullet.x, bullet.y);
                this.applyDamageToEnemy(hitEnemy, bullet.damage, bullet.color);
                this.createBang(hitEnemy.x, hitEnemy.y);
                return false;
            }
            return true;
        });
    }

    updateUI() {
        document.getElementById('score').textContent = this.player.score;
        document.getElementById('cash').textContent = this.player.cash;
        document.getElementById('territory').textContent = this.player.territory.size;
        document.getElementById('income').textContent = this.player.income;
        document.getElementById('health').textContent = Math.floor(this.player.health);
        document.getElementById('maxHealth').textContent = this.player.maxHealth;
        document.getElementById('armor').textContent = Math.floor(this.player.armor);
        document.getElementById('maxArmor').textContent = this.player.maxArmor;
        document.getElementById('speed').textContent = this.player.speed.toFixed(1);
        document.getElementById('stealth').textContent = this.player.stealth;
        document.getElementById('luck').textContent = this.player.luck;
        document.getElementById('visionRange').textContent = Math.round(this.player.visionRange);
        document.getElementById('stamina').textContent = Math.round(this.player.stamina);
        document.getElementById('wantedLevel').textContent = '★'.repeat(this.wantedLevel) || '0';
        
        const weapon = this.player.weapons[this.player.currentWeapon];
        const weaponConfig = GAME_CONFIG.WEAPON_TYPES[this.player.currentWeapon] || { name: this.player.currentWeapon };
        const ammoDisplay = !weapon || weapon.ammo === -1
            ? '∞'
            : `${weapon.ammo}/${weapon.ammoReserve ?? 0}`;
        document.getElementById('currentWeapon').textContent = `${weaponConfig.name} (${ammoDisplay})`;

        const effectsDiv = document.getElementById('activeEffects');
        effectsDiv.innerHTML = '';
        this.player.statusEffects.forEach(effect => {
            const badge = document.createElement('div');
            badge.className = 'effect-badge';
            badge.textContent = `${effect.type} (${Math.ceil(effect.duration)}s)`;
            effectsDiv.appendChild(badge);
        });

        const questDiv = document.getElementById('questList');
        questDiv.innerHTML = '';
        this.questSystem.activeQuests.forEach(quest => {
            const div = document.createElement('div');
            div.style.fontSize = '11px';
            div.style.marginBottom = '8px';
            div.style.opacity = quest.completed ? '0.5' : '1';
            div.innerHTML = `<strong>${quest.title}</strong><br>${quest.desc}<br>Progress: ${quest.current}/${quest.target}<br><em style=\"color: #888;\">${quest.story}</em>`;
            questDiv.appendChild(div);
        });
    }

    handleInput(deltaSeconds) {
        if (this.player.reloadTimer > 0) return;
        
        const reversed = this.player.hasEffect('REVERSED_CONTROLS');
        const dir = reversed ? -1 : 1;
        let dx = 0, dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy = -1 * dir;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1 * dir;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1 * dir;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1 * dir;

        const sprintRequested = !!this.keys['shift'];
        this.player.setSprinting(sprintRequested);

        if (dx !== 0 || dy !== 0) {
            this.player.move(dx, dy, this.map, deltaSeconds);
        }
    }

    updateEnemies(deltaSeconds) {
        const worldState = {
            wantedLevel: this.wantedLevel,
            crimeBroadcast: this.crimeBroadcast
        };
        this.enemies.forEach(enemy => {
            enemy.update(this.player, this.map, deltaSeconds, worldState);
        });

        if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE && this.enemies.length < 12) {
            const spawn = this.getValidSpawnPoint(GAME_CONFIG.MIN_SPAWN_DISTANCE / 2, this.player.x, this.player.y);
            const { x, y } = spawn;
            const types = ['thug', 'rogue', 'police'];
            this.enemies.push(new Enemy(x, y, types[Math.floor(Math.random() * types.length)], this.nftCollection));
        }
    }

    updateAllies(deltaSeconds) {
        this.allies = this.allies.filter(ally => {
            const attack = ally.update(this.map, this.player, this.enemies, deltaSeconds);
            if (attack && attack.target) {
                this.applyDamageToEnemy(attack.target, attack.damage, attack.color);
            }
            return true;
        });
    }

    updateCars(deltaSeconds) {
        this.cars.forEach(car => car.update(this.map, deltaSeconds));
    }

    updatePedestrians(deltaSeconds) {
        this.pedestrians.forEach(ped => ped.update(deltaSeconds));
        if (this.pedestrians.length < 25 && Math.random() < 0.01) {
            this.pedestrians.push(new Pedestrian(this.map, this.nftCollection));
        }
    }

    checkBuyerCollisions() {
        if (this.activeBuyer && (!this.pedestrians.includes(this.activeBuyer) ||
            Math.hypot(this.player.x - this.activeBuyer.x, this.player.y - this.activeBuyer.y) > 1.5)) {
            this.closeTradePanel();
        }

        if (this.activeBuyer) return;
        const nearbyBuyer = this.pedestrians.find(ped =>
            ped.isBuyer &&
            !ped.fulfilled &&
            Math.hypot(this.player.x - ped.x, this.player.y - ped.y) < 0.9
        );
        if (nearbyBuyer) {
            this.openTradePanel(nearbyBuyer);
        }
    }

    checkShopProximity() {
        if (!this.activeShop) return;
        const dist = Math.hypot(this.player.x - this.activeShop.x, this.player.y - this.activeShop.y);
        if (dist > 3.5) {
            this.closeShop();
        }
    }

    updateWanted(deltaSeconds) {
        if (this.wantedLevel <= 0) return;
        this.wantedDecayTimer += deltaSeconds * 1000;
        if (Date.now() - this.lastCrimeTime < GAME_CONFIG.WANTED_DECAY_INTERVAL) return;
        if (this.wantedDecayTimer >= GAME_CONFIG.WANTED_DECAY_INTERVAL) {
            this.wantedLevel = Math.max(0, this.wantedLevel - GAME_CONFIG.WANTED_DECAY_AMOUNT);
            this.wantedDecayTimer = 0;
            if (this.wantedLevel === 0) {
                this.crimeBroadcast = false;
            }
        }
    }

    getValidSpawnPoint(minDistance = GAME_CONFIG.MIN_SPAWN_DISTANCE, centerX = GAME_CONFIG.MAP_WIDTH / 2, centerY = GAME_CONFIG.MAP_HEIGHT / 2) {
        let attempts = 0;
        while (attempts < 200) {
            const x = Math.random() * GAME_CONFIG.MAP_WIDTH;
            const y = Math.random() * GAME_CONFIG.MAP_HEIGHT;
            const dist = Math.hypot(x - centerX, y - centerY);
            if (dist >= minDistance && this.map.isPassable(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        for (let ty = 0; ty < this.map.height; ty++) {
            for (let tx = 0; tx < this.map.width; tx++) {
                const sampleX = tx + 0.5;
                const sampleY = ty + 0.5;
                if (this.map.isPassable(sampleX, sampleY)) {
                    return { x: sampleX, y: sampleY };
                }
            }
        }
        return { x: centerX, y: centerY };
    }

    passiveIncome() {
        const now = Date.now();
        if (!this.lastIncomeTime) this.lastIncomeTime = now;
        if (now - this.lastIncomeTime > 60000) {
            this.player.cash += this.player.income;
            this.lastIncomeTime = now;
            this.createParticle(this.player.x, this.player.y, `+$${this.player.income}`, '#0f0');
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const camX = this.player.x * GAME_CONFIG.TILE_SIZE - this.canvas.width / 2;
        const camY = this.player.y * GAME_CONFIG.TILE_SIZE - this.canvas.height / 2;
        this.camera = { x: camX, y: camY };

        const shakeX = (Math.random() - 0.5) * this.cameraShake;
        const shakeY = (Math.random() - 0.5) * this.cameraShake;
        ctx.save();
        ctx.translate(-camX + shakeX, -camY + shakeY);

        const startX = Math.max(0, Math.floor(camX / GAME_CONFIG.TILE_SIZE));
        const startY = Math.max(0, Math.floor(camY / GAME_CONFIG.TILE_SIZE));
        const endX = Math.min(this.map.width, startX + Math.ceil(this.canvas.width / GAME_CONFIG.TILE_SIZE) + 2);
        const endY = Math.min(this.map.height, startY + Math.ceil(this.canvas.height / GAME_CONFIG.TILE_SIZE) + 2);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.map.getTile(x, y);
                ctx.fillStyle = tile.color;
                ctx.fillRect(x * GAME_CONFIG.TILE_SIZE, y * GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                
                if (tile.special === 'building') {
                    ctx.strokeStyle = '#ccc';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x * GAME_CONFIG.TILE_SIZE, y * GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                    ctx.setLineDash([]);
                    ctx.lineWidth = 1;
                }
                
                if (tile.special === 'shop') {
                    ctx.fillStyle = '#00ffff';
                    ctx.font = 'bold 16px monospace';
                    ctx.fillText('$', x * GAME_CONFIG.TILE_SIZE + 12, y * GAME_CONFIG.TILE_SIZE + 24);
                }
                
                ctx.strokeStyle = '#222';
                ctx.strokeRect(x * GAME_CONFIG.TILE_SIZE, y * GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
            }
        }

        this.player.territory.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            if (x >= startX && x < endX && y >= startY && y < endY) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.08)';
                ctx.fillRect(x * GAME_CONFIG.TILE_SIZE, y * GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
            }
        });

        this.cars.forEach(car => {
            ctx.fillStyle = car.color;
            ctx.beginPath();
            ctx.arc(car.x * GAME_CONFIG.TILE_SIZE, car.y * GAME_CONFIG.TILE_SIZE, car.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 1;
        });

        this.pedestrians.forEach(ped => {
            ctx.fillStyle = ped.color;
            ctx.beginPath();
            ctx.arc(ped.x * GAME_CONFIG.TILE_SIZE, ped.y * GAME_CONFIG.TILE_SIZE, ped.isBuyer ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();
            if (ped.isBuyer && ped.desiredEffect) {
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(ped.desiredEffect.substring(0, 1), ped.x * GAME_CONFIG.TILE_SIZE - 3, ped.y * GAME_CONFIG.TILE_SIZE + 3);
            }
        });

        this.droppedPills.forEach(pill => {
            ctx.fillStyle = pill.color;
            ctx.beginPath();
            ctx.arc(pill.x * GAME_CONFIG.TILE_SIZE, pill.y * GAME_CONFIG.TILE_SIZE, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        this.allies.forEach(ally => {
            ctx.fillStyle = ally.color;
            ctx.beginPath();
            ctx.arc(ally.x * GAME_CONFIG.TILE_SIZE, ally.y * GAME_CONFIG.TILE_SIZE, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        });

        this.bullets.forEach(bullet => {
            ctx.strokeStyle = bullet.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(bullet.trail[0].x * GAME_CONFIG.TILE_SIZE, bullet.trail[0].y * GAME_CONFIG.TILE_SIZE);
            for (let i = 1; i < bullet.trail.length; i++) {
                ctx.lineTo(bullet.trail[i].x * GAME_CONFIG.TILE_SIZE, bullet.trail[i].y * GAME_CONFIG.TILE_SIZE);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = bullet.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x * GAME_CONFIG.TILE_SIZE, bullet.y * GAME_CONFIG.TILE_SIZE, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        this.explosions.forEach(explosion => {
            ctx.save();
            ctx.globalAlpha = explosion.life * 2;
            const gradient = ctx.createRadialGradient(
                explosion.x * GAME_CONFIG.TILE_SIZE, explosion.y * GAME_CONFIG.TILE_SIZE, 0,
                explosion.x * GAME_CONFIG.TILE_SIZE, explosion.y * GAME_CONFIG.TILE_SIZE, 30
            );
            gradient.addColorStop(0, '#ff0');
            gradient.addColorStop(0.5, '#f00');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(explosion.x * GAME_CONFIG.TILE_SIZE, explosion.y * GAME_CONFIG.TILE_SIZE, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        this.enemies.forEach(enemy => {
            const distToPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
            
            if (distToPlayer < this.player.visionRange || enemy.state === 'chase') {
                if (enemy.detectionTimer > 0 && enemy.detectionTimer < GAME_CONFIG.DETECTION_TIME_REQUIRED) {
                    ctx.fillStyle = `rgba(255, 165, 0, ${0.3 + enemy.detectionTimer * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(enemy.x * GAME_CONFIG.TILE_SIZE, enemy.y * GAME_CONFIG.TILE_SIZE, enemy.size + 10, 0, Math.PI * 2);
                    ctx.fill();
                } else if (enemy.state === 'chase') {
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(enemy.x * GAME_CONFIG.TILE_SIZE, enemy.y * GAME_CONFIG.TILE_SIZE, enemy.stats.detectionRange * GAME_CONFIG.TILE_SIZE, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(enemy.x * GAME_CONFIG.TILE_SIZE + 2, enemy.y * GAME_CONFIG.TILE_SIZE + 2, enemy.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x * GAME_CONFIG.TILE_SIZE, enemy.y * GAME_CONFIG.TILE_SIZE, enemy.size, 0, Math.PI * 2);
                ctx.fill();
                
                const healthPercent = Math.max(0, enemy.stats.hp) / GAME_CONFIG.ENEMY_TYPES[enemy.type].hp;
                const barWidth = 24;
                ctx.fillStyle = '#400';
                ctx.fillRect(enemy.x * GAME_CONFIG.TILE_SIZE - barWidth/2, enemy.y * GAME_CONFIG.TILE_SIZE - enemy.size - 12, barWidth, 3);
                ctx.fillStyle = '#0f0';
                ctx.fillRect(enemy.x * GAME_CONFIG.TILE_SIZE - barWidth/2, enemy.y * GAME_CONFIG.TILE_SIZE - enemy.size - 12, barWidth * healthPercent, 3);
            }
        });

        this.hitBursts.forEach(burst => {
            const alpha = Math.max(0, burst.life * 2.5);
            const radius = 10 + (0.4 - burst.life) * 20;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(burst.x * GAME_CONFIG.TILE_SIZE, burst.y * GAME_CONFIG.TILE_SIZE, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('BANG!', burst.x * GAME_CONFIG.TILE_SIZE - 18, burst.y * GAME_CONFIG.TILE_SIZE - radius - 4);
            ctx.restore();
        });

        this.shops.forEach(shop => {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(shop.x * GAME_CONFIG.TILE_SIZE - 10, shop.y * GAME_CONFIG.TILE_SIZE - 10, 20, 20);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(shop.x * GAME_CONFIG.TILE_SIZE - 10, shop.y * GAME_CONFIG.TILE_SIZE - 10, 20, 20);
            ctx.lineWidth = 1;
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('$', shop.x * GAME_CONFIG.TILE_SIZE - 4, shop.y * GAME_CONFIG.TILE_SIZE + 4);
        });

        if (this.player.inBuilding) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(this.player.x * GAME_CONFIG.TILE_SIZE - 5, this.player.y * GAME_CONFIG.TILE_SIZE - 5, 10, 10);
            
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.player.x * GAME_CONFIG.TILE_SIZE, this.player.y * GAME_CONFIG.TILE_SIZE, this.player.size + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(this.player.x * GAME_CONFIG.TILE_SIZE + 2, this.player.y * GAME_CONFIG.TILE_SIZE + 2, this.player.size, 0, Math.PI * 2);
        ctx.fill();
        
        const playerColor = this.player.hasEffect('STEALTH') ? 'rgba(255, 255, 0, 0.7)' : '#ff0';
        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.arc(this.player.x * GAME_CONFIG.TILE_SIZE, this.player.y * GAME_CONFIG.TILE_SIZE, this.player.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;

        if (this.player.reloadTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('RELOADING...', this.player.x * GAME_CONFIG.TILE_SIZE - 30, this.player.y * GAME_CONFIG.TILE_SIZE - 20);
        }

        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(p.text, p.x * GAME_CONFIG.TILE_SIZE, p.y * GAME_CONFIG.TILE_SIZE);
            ctx.restore();
        });

        ctx.restore();

        if (this.damageOverlay > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${this.damageOverlay * 0.35})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }
    }

    gameLoop(timestamp = 0) {
        const defaultFrame = 1000 / 60;
        const deltaTime = this.lastTime ? timestamp - this.lastTime : defaultFrame;
        this.lastTime = timestamp;
        const clampedDelta = Math.max(0, Math.min(deltaTime, 100));
        const deltaSeconds = (clampedDelta || defaultFrame) / 1000;
        const deltaMs = clampedDelta || defaultFrame;
        const deltaFactor = deltaMs / defaultFrame || 1;

        if (!this.isPaused()) {
            this.handleInput(deltaSeconds);
            this.player.updateStatusEffects(deltaSeconds, deltaMs);
            this.updateEnemies(deltaSeconds);
            this.updateAllies(deltaSeconds);
            this.updateCars(deltaSeconds);
            this.updatePedestrians(deltaSeconds);
            this.checkBuyerCollisions();
            this.checkShopProximity();
            this.updateWanted(deltaSeconds);
            this.autoCollectPills();
            this.updateBullets(deltaFactor);
            this.shops.forEach(shop => shop.update());
            this.questSystem.updateQuests(this.player);
            this.tipsSystem.update();
            this.updateParticles(deltaSeconds, deltaFactor);
            this.passiveIncome();
            this.damageOverlay = Math.max(0, this.damageOverlay - deltaSeconds * 1.5);
            this.cameraShake = Math.max(0, this.cameraShake - deltaSeconds * 12);
        } else {
            this.checkBuyerCollisions();
            this.checkShopProximity();
        }

        this.render();
        this.updateUI();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

const bootGame = () => {
    try {
        new NarcotiXGame();
    } catch (error) {
        console.error('Game initialization failed:', error);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `<h1 style="color: #f00;">ERROR</h1><p>${error.message}</p><p>Check console for details.</p>`;
            loadingScreen.style.display = 'flex';
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGame);
} else {
    bootGame();
}

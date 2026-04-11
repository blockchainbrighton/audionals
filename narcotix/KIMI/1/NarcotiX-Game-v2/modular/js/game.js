import { GAME_CONFIG } from './config.js';
import { NFTCollection } from './nft.js';
import { Map } from './map.js';
import { Player } from './player.js';
import { Bullet, DamageNumber } from './combat.js';
import { Enemy, Shop, QuestSystem, TipsSystem } from './systems.js';

const ENEMY_WEAPON_MAP = Object.freeze({
    thug: 'pistol',
    rogue: 'shotgun',
    police: 'rifle',
    boss: 'rifle'
});

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
        
        this.enemies = [];
        this.shops = [];
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
        this.hudAlerts = [];
        this.session = { start: Date.now(), cashEarned: 0, enemiesDefeated: 0 };
        this.lastCash = this.player.cash;
        this.lastTerritory = this.player.territory.size;
        this.lastIncome = this.player.income;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        this.lastFireTime = 0;
        this.lastReloadTime = 0;

        this.bindButtonEvents();
        this.initialize();
    }

    bindButtonEvents() {
        document.getElementById('closeInvBtn').onclick = () => this.toggleInventory();
        document.getElementById('usePillBtn').onclick = () => this.consumePill();
        document.getElementById('equipWeaponBtn').onclick = () => this.equipWeapon();
        document.getElementById('sortInventoryBtn').onclick = () => this.sortInventory();
        document.getElementById('closeShopBtn').onclick = () => this.closeShop();
        document.getElementById('closeLegendBtn').onclick = () => this.closeLegend();
    }

    initialize() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (this.crosshair) this.crosshair.style.display = 'block';
        }, 2000);

        for (let i = 0; i < 6; i++) {
            let x, y, dist;
            let attempts = 0;
            do {
                x = Math.random() * GAME_CONFIG.MAP_WIDTH;
                y = Math.random() * GAME_CONFIG.MAP_HEIGHT;
                dist = Math.hypot(x - GAME_CONFIG.MAP_WIDTH/2, y - GAME_CONFIG.MAP_HEIGHT/2);
                attempts++;
            } while (dist < GAME_CONFIG.MIN_SPAWN_DISTANCE && attempts < 50);
            
            const types = ['thug', 'rogue', 'police'];
            const type = i < 1 ? 'boss' : types[Math.floor(Math.random() * types.length)];
            this.enemies.push(new Enemy(x, y, type, this.nftCollection));
        }

        this.map.stashHouses.forEach(shopData => {
            this.shops.push(new Shop(shopData.x, shopData.y, this.nftCollection));
        });

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

    sortInventory() {
        const rarityRank = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        this.player.inventory.sort((a, b) => {
            const rarityDiff = (rarityRank[b.rarity] ?? 0) - (rarityRank[a.rarity] ?? 0);
            if (rarityDiff !== 0) return rarityDiff;
            return b.marketValue - a.marketValue;
        });
        this.updateInventoryUI();
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
        
        const inv = document.getElementById('shopInventory');
        inv.innerHTML = '<h4 style="color: #f0f;">Sell Your Pills:</h4>';

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
                if (this.player.cash >= item.price) {
                    this.player.cash -= item.price;
                    this.player.addToInventory(item.pill);
                    this.updateUI();
                    this.createParticle(this.player.x, this.player.y, `+${item.pill.name.substring(0, 10)}`, '#0f0');
                }
            };
            inv.appendChild(btn);
        });

        inv.innerHTML += '<h4 style="color: #f00;">Buy Weapons:</h4>';
        shop.weapons.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = `${item.data.name} - $${item.price} (DMG: ${item.data.damage})`;
            btn.onclick = () => {
                if (this.player.cash >= item.price) {
                    this.player.cash -= item.price;
                    this.player.addWeapon(item.type);
                    this.updateUI();
                    this.createParticle(this.player.x, this.player.y, `+${item.data.name}`, '#f0f');
                }
            };
            inv.appendChild(btn);
        });
    }

    closeShop() {
        document.getElementById('shopPanel').style.display = 'none';
    }

    toggleLegend() {
        const panel = document.getElementById('legendPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    closeLegend() {
        document.getElementById('legendPanel').style.display = 'none';
    }

    consumePill() {
        if (this.player.selectedPill) {
            this.player.consumePill(this.player.selectedPill);
            this.createParticle(this.player.x, this.player.y, 'CONSUMED!', this.player.selectedPill.color);
            this.updateInventoryUI();
            this.updateUI();
        }
    }

    equipWeapon() {
        const weapons = Object.keys(this.player.weapons);
        const currentIndex = weapons.indexOf(this.player.currentWeapon);
        const nextIndex = (currentIndex + 1) % weapons.length;
        this.player.currentWeapon = weapons[nextIndex];
        this.updateUI();
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

    addHudAlert(text, color = '#00ffff') {
        this.hudAlerts.push({ text, color, expires: Date.now() + 3000 });
        if (this.hudAlerts.length > 8) {
            this.hudAlerts = this.hudAlerts.slice(-8);
        }
    }

    renderHudAlerts() {
        const container = document.getElementById('hudAlerts');
        if (!container) return;
        const now = Date.now();
        this.hudAlerts = this.hudAlerts.filter(alert => alert.expires > now);
        container.innerHTML = '';
        this.hudAlerts.slice(-4).forEach(alert => {
            const div = document.createElement('div');
            div.className = 'hud-alert';
            div.style.color = alert.color;
            div.textContent = alert.text;
            container.appendChild(div);
        });
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.life -= 0.016;
            p.y += p.vy;
            return p.life > 0;
        });

        this.explosions = this.explosions.filter(e => {
            e.life -= 0.016;
            return e.life > 0;
        });

        this.damageNumbers = this.damageNumbers.filter(d => d.update());

        this.hitBursts = this.hitBursts.filter(b => {
            b.life -= 0.03;
            return b.life > 0;
        });
    }

    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.update()) {
                return false;
            }

            const hitEnemy = bullet.checkCollision(this.enemies);
            if (hitEnemy) {
                const damage = hitEnemy.stats.hp - Math.max(0, hitEnemy.stats.hp - bullet.damage);
                hitEnemy.stats.hp -= bullet.damage;
                this.createExplosion(bullet.x, bullet.y);
                this.createDamageNumber(hitEnemy.x, hitEnemy.y, damage, bullet.color);
                this.createBang(hitEnemy.x, hitEnemy.y);
                
                if (hitEnemy.stats.hp <= 0) {
                    const loot = hitEnemy.dropLoot();
                    if (loot) {
                        loot.x = hitEnemy.x;
                        loot.y = hitEnemy.y;
                        this.droppedPills.push(loot);
                    }
                    this.enemies.splice(this.enemies.indexOf(hitEnemy), 1);
                    this.player.enemiesDefeated++;
                    this.session.enemiesDefeated++;
                    this.createParticle(hitEnemy.x, hitEnemy.y, 'ELIMINATED!', '#f00');
                }
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
        
        const weapon = this.player.weapons[this.player.currentWeapon];
        const weaponName = GAME_CONFIG.WEAPON_TYPES[this.player.currentWeapon].name;
        const ammo = weapon.ammo === -1 ? '∞' : weapon.ammo;
        document.getElementById('currentWeapon').textContent = `${weaponName} (${ammo})`;

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

        this.handleStatAlerts();
        this.updateSessionStats();
        this.renderHudAlerts();
    }

    handleStatAlerts() {
        const cashVal = this.player.cash;
        if (cashVal !== this.lastCash) {
            const diff = cashVal - this.lastCash;
            if (diff !== 0) {
                const sign = diff > 0 ? '+' : '';
                this.addHudAlert(`${sign}$${diff} cash`, diff > 0 ? '#0f0' : '#ff4444');
                if (diff > 0) {
                    this.session.cashEarned += diff;
                }
            }
            this.lastCash = cashVal;
        }

        const territoryVal = this.player.territory.size;
        if (territoryVal > this.lastTerritory) {
            const diff = territoryVal - this.lastTerritory;
            this.addHudAlert(`+${diff} territory`, '#0f0');
            this.lastTerritory = territoryVal;
        }

        const incomeVal = this.player.income;
        if (incomeVal !== this.lastIncome) {
            const diff = incomeVal - this.lastIncome;
            const sign = diff > 0 ? '+' : '';
            this.addHudAlert(`${sign}$${diff} income`, diff > 0 ? '#00ffff' : '#ffae00');
            this.lastIncome = incomeVal;
        }
    }

    updateSessionStats() {
        const elapsedSeconds = Math.floor((Date.now() - this.session.start) / 1000);
        const timeEl = document.getElementById('sessionTime');
        const cashEl = document.getElementById('sessionCash');
        const killEl = document.getElementById('sessionKills');
        if (timeEl) timeEl.textContent = this.formatDuration(elapsedSeconds);
        if (cashEl) cashEl.textContent = this.session.cashEarned;
        if (killEl) killEl.textContent = this.session.enemiesDefeated;
    }

    handleInput() {
        if (this.player.reloadTimer > 0) return;
        
        const reversed = this.player.hasEffect('REVERSED_CONTROLS');
        const dir = reversed ? -1 : 1;
        let dx = 0, dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy = -1 * dir;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1 * dir;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1 * dir;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1 * dir;

        if (dx !== 0 || dy !== 0) {
            this.player.move(dx, dy, this.map);
        }
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            enemy.update(this.player, this.map);
        });

        if (Math.random() < GAME_CONFIG.ENEMY_SPAWN_RATE && this.enemies.length < 12) {
            let x, y, dist;
            let attempts = 0;
            do {
                x = Math.random() * GAME_CONFIG.MAP_WIDTH;
                y = Math.random() * GAME_CONFIG.MAP_HEIGHT;
                dist = Math.hypot(x - this.player.x, y - this.player.y);
                attempts++;
            } while (dist < GAME_CONFIG.MIN_SPAWN_DISTANCE / 2 && attempts < 50);

            const types = ['thug', 'rogue', 'police'];
            this.enemies.push(new Enemy(x, y, types[Math.floor(Math.random() * types.length)], this.nftCollection));
        }
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

        ctx.save();
        ctx.translate(-camX, -camY);

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

        this.droppedPills.forEach(pill => {
            ctx.fillStyle = pill.color;
            ctx.beginPath();
            ctx.arc(pill.x * GAME_CONFIG.TILE_SIZE, pill.y * GAME_CONFIG.TILE_SIZE, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
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
            
            if (distToPlayer < GAME_CONFIG.PLAYER_VISION_RANGE || enemy.state === 'chase') {
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
    }

    gameLoop(timestamp = 0) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.handleInput();
        this.player.updateStatusEffects();
        this.updateEnemies();
        this.updateBullets();
        this.shops.forEach(shop => shop.update());
        this.questSystem.updateQuests(this.player);
        this.tipsSystem.update();
        this.updateParticles();
        this.passiveIncome();

        this.render();
        this.updateUI();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

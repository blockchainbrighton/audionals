export const player = {
    game: null,
    x: 0, y: 0, 
    width: 0, height: 0, 
    color: '#3F3', char: '웃',
    speed: 150, baseSpeed: 150, 
    hp: 100, maxHp: 100, money: 150,
    inventory: { items: [], capacity: 10 },
    abilities: [],
    statusEffects: [], 
    attackPower: 10, attackCooldown: 500, lastAttackTime: 0, 
    attackRange: 0,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.width = this.game.config.TILE_SIZE * 0.7;
        this.height = this.game.config.TILE_SIZE * 0.7;
        this.attackRange = this.game.config.TILE_SIZE * 1.1;

        this.x = this.game.config.TILE_SIZE * (this.game.config.MAP_WIDTH_TILES / 2);
        this.y = this.game.config.TILE_SIZE * (this.game.config.MAP_HEIGHT_TILES / 2);
        
        this.game.camera.x = this.x - this.game.camera.width / 2;
        this.game.camera.y = this.y - this.game.camera.height / 2;
        
        this.hp = this.maxHp; 
        this.money = 150; 
        this.inventory.items = []; 
        this.statusEffects = [];
        this.abilities = [
            { name: "Clock Cycle Burst", key: '1', cooldown: 30000, duration: 5000, lastUsedTime: 0, effect: () => { this.applyStatusEffect("C-Burst", 5000, { speedMultiplier: 2 }); this.game.utils.addMessage("Clock Cycle Burst Activated!"); }},
            { name: "Ghost Packet", key: '2', cooldown: 60000, duration: 10000, lastUsedTime: 0, effect: () => { this.applyStatusEffect("Ghosting", 10000); this.game.utils.addMessage("Ghost Packet Engaged. Hostiles may lose track."); }},
            { name: "Emergency Nano-Flush", key: '3', cooldown: 90000, duration: 0, lastUsedTime: 0, effect: () => { this.heal(25); this.game.utils.addMessage("Nano-Flush Initiated! +25 Vitality"); }}
        ];
        this.abilities.forEach(ab => ab.lastUsedTime = -ab.cooldown); // Make available at start
        
        const firstAid = this.game.itemManager.createItemById('nanite_repair'); 
        if (firstAid) this.addItem(firstAid);
        this.updateAbilityStatusDisplay();
        this.updatePlayerStatusDisplay();
    },

    render: function() {
        this.game.ctx.fillStyle = this.isStealthed() ? 'rgba(50, 255, 50, 0.4)' : this.color;
        if (this.hasStatusEffect("Kaos Frenzy") || this.hasStatusEffect("C-Burst")) {
             const pulse = Math.abs(Math.sin(Date.now() / 200)) * 0.3 + 0.7;
             this.game.ctx.globalAlpha = pulse;
        }
        this.game.ctx.font = `${this.game.config.TILE_SIZE * 0.9}px Arial`; 
        this.game.ctx.textAlign = 'center'; 
        this.game.ctx.textBaseline = 'middle';
        this.game.ctx.fillText(this.char, this.x + this.width / 2, this.y + this.height / 2 + this.game.config.TILE_SIZE * 0.05);
        this.game.ctx.globalAlpha = 1.0;

        if (this.hp < this.maxHp) {
            const barY = this.y - 7;
            this.game.ctx.fillStyle = 'red'; 
            this.game.ctx.fillRect(this.x, barY, this.width, 5);
            this.game.ctx.fillStyle = '#0F0'; 
            this.game.ctx.fillRect(this.x, barY, this.width * (this.hp / this.maxHp), 5);
        }
    },

    handleInput: function(deltaTime) {
        if (this.game.gameState !== 'PLAYING' && this.game.gameState !== 'INVENTORY_OPEN' && this.game.gameState !== 'QUESTLOG_OPEN') return;
        let dx = 0, dy = 0;
        if (this.game.keysPressed['w'] || this.game.keysPressed['ArrowUp']) dy -= 1; 
        if (this.game.keysPressed['s'] || this.game.keysPressed['ArrowDown']) dy += 1;
        if (this.game.keysPressed['a'] || this.game.keysPressed['ArrowLeft']) dx -= 1; 
        if (this.game.keysPressed['d'] || this.game.keysPressed['ArrowRight']) dx += 1;

        if (this.isConfused()) { let temp = dx; dx = dy; dy = -temp; } 

        if (dx !== 0 || dy !== 0) {
            if (dx !== 0 && dy !== 0) { const fact = Math.sqrt(0.5); dx *= fact; dy *= fact; }
           
            const currentSpeed = this.speed * (this.statusEffects.find(e => e.name === "C-Burst" || e.name === "Kaos Frenzy")?.data.speedMultiplier || 1);
            const tileProps = this.game.mapManager.getTilePropertiesAt(this.x + this.width/2, this.y + this.height/2);
            const effectiveSpeed = currentSpeed * (tileProps ? tileProps.speedModifier : 1);

            let nextX = this.x + dx * effectiveSpeed * deltaTime;
            let nextY = this.y + dy * effectiveSpeed * deltaTime;

            if (!this.checkCollision({ x: nextX, y: this.y, width: this.width, height: this.height })) this.x = nextX;
            if (!this.checkCollision({ x: this.x, y: nextY, width: this.width, height: this.height })) this.y = nextY;
           
            this.x = Math.max(this.width/2, Math.min(this.x, this.game.config.MAP_WIDTH_TILES * this.game.config.TILE_SIZE - this.width*1.5));
            this.y = Math.max(this.height/2, Math.min(this.y, this.game.config.MAP_HEIGHT_TILES * this.game.config.TILE_SIZE - this.height*1.5));
            this.pickupItems();
        }
    },

    checkCollision: function(rect) {
        const corners = [ { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height }];
        for (const corner of corners) if (this.game.mapManager.isColliding(corner.x, corner.y)) return true;
        return false;
    },

    attack: function() {
        if (Date.now() - this.lastAttackTime < this.attackCooldown) return; 
        this.lastAttackTime = Date.now();
        this.game.utils.addMessage("Melee Disruptor Field Online!"); 
        let attacked = false;
        this.game.enemyManager.list.forEach(enemy => {
            if (this.game.utils.distance(this.x + this.width/2, this.y + this.height/2, enemy.x + enemy.width/2, enemy.y + enemy.height/2) < this.attackRange) {
                enemy.takeDamage(this.attackPower); 
                attacked = true;
            }
        });
        if (!attacked) this.game.utils.addMessage("...Disruptor Field hit static.");
    },

    takeDamage: function(amount) { 
        this.hp -= amount; 
        this.game.utils.addMessage(`Xperient integrity compromised by ${amount}! Vitality: ${this.hp}/${this.maxHp}`); 
        if (this.hp <= 0) { this.hp = 0; this.game.gameOver(); } 
        this.game.hud.update(); 
    },

    heal: function(amount) { 
        this.hp = Math.min(this.hp + amount, this.maxHp); 
        this.game.utils.addMessage(`Nanites repaired ${amount} Vitality. Current: ${this.hp}/${this.maxHp}`); 
        this.game.hud.update(); 
    },

    addItem: function(item) {
        if (this.inventory.items.length >= this.inventory.capacity && (!item.stackable || !this.inventory.items.find(i => i.id === item.id))) { 
            this.game.utils.addMessage("Data-Stash at capacity!"); 
            return false; 
        }
        const existing = this.inventory.items.find(i => i.id === item.id && item.stackable);
        if (existing) existing.quantity = (existing.quantity || 1) + (item.quantity || 1); 
        else this.inventory.items.push({...item});
        
        this.game.utils.addMessage(`Acquired ${item.name} (x${item.quantity || 1}). Stored.`); 
        this.renderInventory(); 
        this.game.hud.update(); 
        return true;
    },

    removeItem: function(itemId, quantity = 1) {
        const idx = this.inventory.items.findIndex(i => i.id === itemId);
        if (idx > -1) { 
            const item = this.inventory.items[idx]; 
            if (item.quantity && item.quantity > quantity) item.quantity -= quantity; 
            else this.inventory.items.splice(idx, 1); 
            this.renderInventory(); 
            this.game.hud.update(); 
            return true; 
        } 
        return false;
    },

    hasItem: function(itemId, quantity = 1) { 
        const item = this.inventory.items.find(i => i.id === itemId); 
        return item && (item.quantity || 1) >= quantity; 
    },

    useItem: function(itemIndex) {
        const item = this.inventory.items[itemIndex];
        if (item) { 
            if (item.effect) item.effect(this); // 'this' here refers to player object
            else this.game.utils.addMessage(`${item.name} has no direct activation routine.`); 
            
            if (item.type === 'consumable') this.removeItem(item.id); 
            else this.game.utils.addMessage(`Activated ${item.name}.`); 
            
            this.renderInventory(); 
            this.game.hud.update(); 
        }
    },

    pickupItems: function() {
        for (let i = this.game.itemManager.onMapItems.length - 1; i >= 0; i--) {
            const itemOnMap = this.game.itemManager.onMapItems[i];
            if (this.game.utils.AABBCollision(this, itemOnMap)) { 
                const itemToAdd = this.game.itemManager.createItemById(itemOnMap.id, itemOnMap.quantity);
                if (this.addItem(itemToAdd)) {
                    this.game.itemManager.onMapItems.splice(i, 1);
                } else {
                    this.game.utils.addMessage(`Cannot acquire ${itemOnMap.name}. Stash full?`);
                }
            }
        }
    },

    renderInventory: function() {
        const invDiv = document.getElementById('inventoryItems'); 
        if (!invDiv) return;
        invDiv.innerHTML = '';
        if (this.inventory.items.length === 0) { 
            invDiv.innerHTML = '<p>Stash empty. Go acquire some... assets.</p>'; 
            return; 
        }
        this.inventory.items.forEach((item, index) => {
            const itemDiv = document.createElement('div'); 
            itemDiv.className = 'inventoryItem';
            let content = `${item.name} (x${item.quantity || 1}) - <i>${item.description}</i>`;
            if(item.type === 'consumable' || item.effect) { 
                content += `<button class="button button-use" style="float:right;" onclick="game.player.useItem(${index})">Use</button>`; 
            }
            itemDiv.innerHTML = content; 
            invDiv.appendChild(itemDiv);
        });
    },

    useAbility: function(key) {
        const ability = this.abilities.find(a => a.key === key); 
        if (!ability) return;
        const now = Date.now();
        if (now - ability.lastUsedTime >= ability.cooldown) { 
            ability.effect(); // Calls the effect function which might use 'this' referring to player
            ability.lastUsedTime = now; 
            this.updateAbilityStatusDisplay(); 
        } else { 
            this.game.utils.addMessage(`${ability.name} subroutine recharging: ${Math.ceil((ability.cooldown - (now - ability.lastUsedTime)) / 1000)}s`); 
        }
    },
    
    updateAbilityCooldowns: function() { // deltaTime not directly used, but called in update loop
        this.updateAbilityStatusDisplay(); 
    },

    updateAbilityStatusDisplay: function() {
        const div = document.getElementById('abilityStatus');
        if (!div) return;
        div.innerHTML = 'Subroutines: ' + this.abilities.map(ab => {
            const cdLeft = Math.max(0, ab.cooldown - (Date.now() - ab.lastUsedTime));
            return `${ab.name} (${ab.key}) ${cdLeft > 0 ? `(RCHG ${Math.ceil(cdLeft/1000)}s)`: '(RDY)'}`;
        }).join(' | ');
    },

    applyStatusEffect: function(name, duration, data = {}) {
        this.statusEffects = this.statusEffects.filter(e => e.name !== name || (e.name === "C-Burst" && e.data.speedMultiplier > data.speedMultiplier)); 
        const effect = { name, duration, remainingTime: duration, data };
        
        if (name === "System Glitch") { this.game.utils.addMessage("System Glitch! Input matrix scrambled!"); }
        else if (name === "Ghosting") { this.game.utils.addMessage("Ghosting active. Evading sensors...");}
        else if (name === "Kaos Frenzy") { 
            this.game.utils.addMessage("KAOS FRENZY! Unleash the absurd!"); 
            this.game.enemyManager.list.forEach(e => { 
                if (this.game.utils.distance(this.x, this.y, e.x, e.y) < e.detectionRange * 2.5) e.alertToPosition(this.x, this.y); 
            });
        }
        else if (name === "Sys-Marked") { this.game.utils.addMessage("System mark acquired! Hostiles prioritizing your signature."); }
        
        this.statusEffects.push(effect); 
        this.updatePlayerStatusDisplay();
    },

    updateStatusEffects: function(deltaTime) {
        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const e = this.statusEffects[i]; 
            e.remainingTime -= deltaTime * 1000;
            if (e.remainingTime <= 0) { 
                this.game.utils.addMessage(`Effect "${e.name}" expired.`); 
                this.statusEffects.splice(i, 1); 
                this.updatePlayerStatusDisplay(); 
            }
        }
        const speedBoosts = this.statusEffects.filter(e => e.name === "C-Burst" || e.name === "Kaos Frenzy");
        let maxMultiplier = 1;
        if(speedBoosts.length > 0) maxMultiplier = Math.max(...speedBoosts.map(sb => sb.data.speedMultiplier));
        this.speed = this.baseSpeed * maxMultiplier;

        this.updatePlayerStatusDisplay();
    },

    hasStatusEffect: function(name) { return this.statusEffects.some(e => e.name === name); },
    isStealthed: function() { return this.hasStatusEffect("Ghosting"); },
    isConfused: function() { return this.hasStatusEffect("System Glitch"); },

    updatePlayerStatusDisplay: function() {
        const s = document.getElementById('playerStatus');
        if (!s) return;
        s.textContent = this.statusEffects.length > 0 ? this.statusEffects.map(e => `${e.name}(${Math.ceil(e.remainingTime/1000)}s)`).join(', ') : "Nominal";
    },

    payMoney: function(amount) { 
        if (this.money >= amount) { 
            this.money -= amount; 
            this.game.hud.update(); 
            return true; 
        } 
        return false; 
    },
    earnMoney: function(amount) { 
        this.money += amount; 
        this.game.utils.addMessage(`Creds Acquired: ${amount}c.`); 
        this.game.hud.update(); 
    }
};
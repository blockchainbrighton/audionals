import { Entity } from './Entity.js';

export class Enemy extends Entity {
    constructor(game, typeId, x, y, def, patrolPath = []) {
        super(game, x, y, game.config.TILE_SIZE * 0.8, game.config.TILE_SIZE * 0.8, def.color);
        
        this.typeId = typeId;
        this.name = def.name;
        this.char = def.char;
        this.hp = def.hp;
        this.currentHp = def.hp;
        this.speed = def.speed;
        this.damage = def.damage;
        this.damageType = def.damageType || 'kinetic';
        this.detectionRange = def.detectionRange;
        this.attackRange = def.attackRange;
        this.ai = def.ai;
        this.loot = def.loot;
        this.isBoss = def.isBoss || false;
        this.attackEffect = def.attackEffect;

        this.id = `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // AI State
        this.aiState = 'PATROL';
        this.currentPatrolIndex = 0;
        this.patrolPath = patrolPath;
        this.target = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;
        this.alertedPosition = null;
        this.facingX = 0;
        this.facingY = 1;
        this.wanderTarget = null;
    }

    update(dt) {
        this.updateAI(dt);
    }

    render(ctx) {
        if (!this.game.utils.checkCameraVisibility(this, this.game.camera)) return;

        // STEALTH VISUALS
        let alpha = 1.0;
        if (this.ai === 'stealth' && this.aiState !== 'ATTACK') {
             const dist = this.game.utils.distance(this.x, this.y, this.game.player.x, this.game.player.y);
             if (dist < 150) alpha = 0.4 + (150 - dist)/150 * 0.4; // Fade in as player gets closer
             else alpha = 0.05; // Almost invisible shimmer
        }
        
        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = this.color;
        ctx.font = `${this.game.config.TILE_SIZE * 0.9}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, this.x + this.width / 2, this.y + this.height / 2 + this.game.config.TILE_SIZE * 0.1);

        // Health Bar (Hide if full stealth)
        if (this.currentHp < this.hp && alpha > 0.2) {
            const bY = this.y - 6;
            const bH = 4;
            ctx.fillStyle = '#500';
            ctx.fillRect(this.x, bY, this.width, bH);
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, bY, this.width * (this.currentHp / this.hp), bH);
        }
        
        ctx.restore();
    }

    takeDamage(amt, damageType = 'kinetic') {
        let finalAmt = amt;
        
        // Apply Specific Resistances
        if (this.resistances && this.resistances[damageType]) {
            finalAmt = Math.ceil(amt * (1.0 - this.resistances[damageType]));
        }

        this.currentHp -= finalAmt;

        // Show floating text
        if (this.game.floatingTextManager) {
            this.game.floatingTextManager.addText(
                this.x + this.width / 2,
                this.y,
                `${finalAmt}`,
                damageType === 'energy' ? '#0FF' : (damageType === 'bio' ? '#0F0' : '#FFF') 
            );
        }

        // Play Hit Sound
        this.game.events.emit('PLAYER_HIT'); // Reusing player hit sound for now, or add ENEMY_HIT event

        this.game.utils.addMessage(`${this.name} integrity failing (-${finalAmt}).`);
        if (this.currentHp <= 0) this.die();
        else if (this.aiState !== 'CHASE' && this.aiState !== 'ATTACK' && !this.game.player.isStealthed()) {
            this.aiState = 'CHASE';
            this.target = this.game.player;
            this.game.utils.addMessage(`${this.name} detected hostile Xperient signature!`);
        }
    }

    die() {
        this.game.utils.addMessage(`${this.name} neutralized!`);
        this.markedForDeletion = true; // Mark for removal
        this.game.events.emit('ENEMY_KILLED', this); // Emit event for progression

        const lootDrop = this.loot();
        if (lootDrop) {
            if (lootDrop.money) this.game.player.earnMoney(lootDrop.money);
            if (lootDrop.item) {
                let itemObj = lootDrop.item;
                
                // If it's just a string ID, try to create the item object
                if (typeof itemObj === 'string') {
                    let resolved = this.game.itemManager.createItemById(itemObj);
                    if (!resolved) resolved = this.game.itemManager.createWeaponItem(itemObj);
                    if (!resolved && itemObj.includes('ammo')) resolved = this.game.itemManager.createAmmoItem(itemObj, 24);
                    itemObj = resolved;
                }

                if (itemObj) {
                    this.game.itemManager.dropItem(itemObj, this.x, this.y);
                    this.game.utils.addMessage(`${this.name} jettisoned: ${itemObj.name}.`);
                }
            }
        }
        this.game.questManager.notifyEnemyDefeated(this);
        this.game.zoneManager.notifyEnemyDefeatedInZone(this);
    }

    updateAI(dt) {
        if (this.game.player.isStealthed() && this.target === this.game.player && this.aiState !== 'ATTACK') {
            if (this.game.utils.distance(this.x, this.y, this.game.player.x, this.game.player.y) > this.detectionRange * 0.85) {
                this.target = null;
                this.aiState = 'PATROL';
                this.alertedPosition = null;
                this.game.utils.addMessage(`${this.name} lost Xperient signature...`);
            }
        }

        const distToPlayer = this.game.utils.distance(this.x, this.y, this.game.player.x, this.game.player.y);

        if (this.alertedPosition) {
            const dAlert = this.game.utils.distance(this.x, this.y, this.alertedPosition.x, this.alertedPosition.y);
            if (dAlert < this.game.config.TILE_SIZE * 0.8) {
                this.alertedPosition = null;
                if (this.aiState !== 'CHASE' && this.aiState !== 'ATTACK') this.aiState = 'PATROL';
            } else {
                this.moveTo(this.alertedPosition.x, this.alertedPosition.y, dt);
                return;
            }
        }

        // FOV Check
        let inFOV = false;
        if (!this.game.player.isStealthed()) {
            const dx = (this.game.player.x + this.game.player.width / 2) - (this.x + this.width / 2);
            const dy = (this.game.player.y + this.game.player.height / 2) - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;
                // Dot product
                const dot = nx * this.facingX + ny * this.facingY;
                // 0.5 is 60 degrees either side (120 total), 0.707 is 45 (90 total)
                if (dot > 0.5) inFOV = true;
            }
        }

        const isAlerted = (this.aiState === 'CHASE' || this.aiState === 'ATTACK');
        const canSeePlayer = (!this.game.player.isStealthed() && (isAlerted || inFOV));
        const detectionRadius = (this.game.player.hasStatusEffect("Sys-Marked")) ? this.detectionRange * 1.5 : this.detectionRange;

        if (this.aiState === 'ATTACK') {
            if (distToPlayer > this.attackRange * 1.2 || (this.target && this.target.hp <= 0)) {
                this.aiState = 'CHASE';
            }
            if (!this.target || this.target.hp <= 0) {
                this.aiState = 'PATROL';
                this.target = null;
            }
        } else if (this.aiState === 'CHASE') {
            if (!this.target || this.target.hp <= 0 || (!canSeePlayer && distToPlayer > detectionRadius * 1.2)) {
                this.aiState = 'PATROL';
                this.target = null;
            } else if (distToPlayer <= this.attackRange) this.aiState = 'ATTACK';
        } else {
            // Idle/Patrol State Transition Logic
            if (this.ai === 'stealth') {
                 // Stalker Logic: Detects player through walls/distance (sense) but doesn't "Alert" loudly until close
                 if (distToPlayer <= detectionRadius) {
                     this.aiState = 'CHASE';
                     this.target = this.game.player;
                     // No alert sound yet, silent stalk
                 }
            } else {
                // Standard Logic
                if (canSeePlayer && distToPlayer <= detectionRadius) {
                    this.aiState = 'CHASE';
                    this.target = this.game.player;
                    this.game.soundManager.playEnemyAlert(this.x, this.y); // Alert sound
                    this.game.utils.addMessage(`${this.name} locked on Xperient signature!`);
                }
            }
        }

        switch (this.aiState) {
            case 'PATROL':
                if (this.patrolPath && this.patrolPath.length > 0) {
                    const pt = this.patrolPath[this.currentPatrolIndex];
                    if (this.game.utils.distance(this.x, this.y, pt.x, pt.y) < this.game.config.TILE_SIZE / 2) this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
                    this.moveTo(pt.x, pt.y, dt);
                } else {
                    if (Math.random() < 0.01 * (1 / (dt || 0.016)) || !this.wanderTarget) {
                        this.wanderTarget = {
                            x: this.x + (Math.random() - 0.5) * this.game.config.TILE_SIZE * 5,
                            y: this.y + (Math.random() - 0.5) * this.game.config.TILE_SIZE * 5
                        };
                    }
                    if (this.wanderTarget) {
                        if (this.game.utils.distance(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y) < this.game.config.TILE_SIZE / 2 || this.game.mapManager.isColliding(this.wanderTarget.x, this.wanderTarget.y)) this.wanderTarget = null;
                        else this.moveTo(this.wanderTarget.x, this.wanderTarget.y, dt);
                    }
                }
                break;
            case 'CHASE':
                if (this.target) this.moveTo(this.target.x, this.target.y, dt);
                break;
            case 'ATTACK':
                if (this.target && this.target.hp > 0 && Date.now() - this.lastAttackTime >= this.attackCooldown) {
                    this.lastAttackTime = Date.now();
                    if (this.attackEffect) this.attackEffect(this.target);
                    else this.target.takeDamage(this.damage, this.damageType);
                }
                break;
        }
    }

    moveTo(tx, ty, dt) {
        const dx = tx - this.x,
            dy = ty - this.y;
        const distVal = Math.sqrt(dx * dx + dy * dy);
        if (distVal < 1) return;

        // Update Facing
        this.facingX = dx / distVal;
        this.facingY = dy / distVal;

        const mx = this.facingX * this.speed * dt,
            my = this.facingY * this.speed * dt;
        if (!this.checkMapCollision({
                x: this.x + mx,
                y: this.y,
                width: this.width,
                height: this.height
            })) this.x += mx;
        if (!this.checkMapCollision({
                x: this.x,
                y: this.y + my,
                width: this.width,
                height: this.height
            })) this.y += my;
    }

    checkMapCollision(rect) {
        const c = [{
            x: rect.x,
            y: rect.y
        }, {
            x: rect.x + rect.width,
            y: rect.y
        }, {
            x: rect.x,
            y: rect.y + rect.height
        }, {
            x: rect.x + rect.width,
            y: rect.y + rect.height
        }];
        for (const cn of c) {
            if (this.game.mapManager.isColliding(cn.x, cn.y)) return true;
            // Check for restricted zones
            const tileProps = this.game.mapManager.getTilePropertiesAt(cn.x, cn.y);
            if (tileProps && tileProps.restricted) return true;
        }
        return false;
    }

    alertToPosition(x, y) {
        this.alertedPosition = {
            x,
            y
        };
        if (this.aiState !== 'CHASE' && this.aiState !== 'ATTACK') {
            this.aiState = 'CHASE';
            this.game.soundManager.playEnemyAlert(this.x, this.y); // Alert sound
            this.game.utils.addMessage(`${this.name} detected anomaly at Xperient position!`);
        } else {
            this.aiState = 'CHASE';
        }
    }
}

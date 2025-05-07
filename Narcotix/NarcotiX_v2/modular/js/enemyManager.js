// --- START OF FILE js/enemyManager.js ---
import { TILE_TYPES } from './mapManager.js'; // Import TILE_TYPES

export const enemyManager = {
    game: null,
    enemyTypes: {},
    list: [], // was 'enemies'

    init: function(gameInstance) {
        this.game = gameInstance;
        this.initEnemyTypes();
        this.list = [];
    },

    initEnemyTypes: function() {
        this.enemyTypes = {
            'enforcer': { name: "System Enforcer", char: 'E', color: '#F66', hp: 30, speed: 80, damage: 5, detectionRange: this.game.config.TILE_SIZE * 5, attackRange: this.game.config.TILE_SIZE * 0.9, ai: 'basic_melee', loot: () => { const r=Math.random(); if (r < 0.5) return { money: Math.floor(r*20)+5 }; if (r < 0.7) return { item: this.game.itemManager.createItemById('narcotix_pill') }; return null;}},
            'warden': { name: "Zone Warden", char: 'W', color: '#C00', hp: 100, speed: 60, damage: 15, detectionRange: this.game.config.TILE_SIZE * 7, attackRange: this.game.config.TILE_SIZE * 1, ai: 'guard_area', loot: () => ({ money: Math.floor(Math.random()*50)+25, item: (Math.random() < 0.5 ? this.game.itemManager.createItemById('nanite_repair') : this.game.itemManager.createItemById('adrena_rush_injector')) }), isBoss: true},
            'drone': { name: "Meta-Patrol Unit", char: 'd', color: '#88F', hp: 20, speed: 120, damage: 0, detectionRange: this.game.config.TILE_SIZE * 8, attackRange: this.game.config.TILE_SIZE * 1.5, ai: 'tagger', attackEffect: (player)=>{ player.applyStatusEffect("Sys-Marked", 30000); this.game.utils.addMessage("Meta-Patrol Unit tagged your signature!"); }, loot: () => (Math.random() < 0.2 ? {money: Math.floor(Math.random()*5)+1} : null)}
        };
    },

    createEnemy: function(typeId, x, y, patrolPath=[]) {
        const def = this.enemyTypes[typeId];
        if(!def) return null;

        const enemyInstance = {
            game: this.game, 
            id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            typeId, x, y,
            width: this.game.config.TILE_SIZE * 0.8,
            height: this.game.config.TILE_SIZE * 0.8,
            ...def, 
            currentHp: def.hp,
            aiState: 'PATROL', currentPatrolIndex:0, patrolPath,
            target: null, lastAttackTime: 0, attackCooldown: 1000,
            alertedPosition: null, isBoss: def.isBoss || false,

            takeDamage: function(amt) {
                this.currentHp -= amt;
                this.game.utils.addMessage(`${this.name} integrity failing (-${amt}).`);
                if (this.currentHp <= 0) this.die();
                else if(this.aiState !== 'CHASE' && this.aiState !== 'ATTACK' && !this.game.player.isStealthed()) {
                    this.aiState='CHASE';
                    this.target=this.game.player;
                    this.game.utils.addMessage(`${this.name} detected hostile Xperient signature!`);
                }
            },
            die: function() {
                this.game.utils.addMessage(`${this.name} neutralized!`);
                this.game.enemyManager.list = this.game.enemyManager.list.filter(e => e.id !== this.id);
                const lootDrop = this.loot(); 
                if(lootDrop){
                    if(lootDrop.money) this.game.player.earnMoney(lootDrop.money);
                    if(lootDrop.item){
                        this.game.itemManager.onMapItems.push({
                            ...lootDrop.item,
                            x:this.x, y:this.y,
                            width: this.game.config.TILE_SIZE*0.8, height: this.game.config.TILE_SIZE*0.8
                        });
                        this.game.utils.addMessage(`${this.name} jettisoned: ${lootDrop.item.name}.`);
                    }
                }
                this.game.questManager.notifyEnemyDefeated(this);
                this.game.zoneManager.notifyEnemyDefeatedInZone(this);
            },
            updateAI: function(dt) {
                if (this.game.player.isStealthed() && this.target === this.game.player && this.aiState !== 'ATTACK') {
                    if (this.game.utils.distance(this.x,this.y,this.game.player.x,this.game.player.y) > this.detectionRange * 0.85) {
                        this.target = null; this.aiState = 'PATROL'; this.alertedPosition = null;
                        this.game.utils.addMessage(`${this.name} lost Xperient signature...`);
                    }
                }

                const distToPlayer = this.game.utils.distance(this.x,this.y,this.game.player.x,this.game.player.y);

                if(this.alertedPosition){
                    const dAlert=this.game.utils.distance(this.x,this.y,this.alertedPosition.x,this.alertedPosition.y);
                    if(dAlert<this.game.config.TILE_SIZE*0.8){
                        this.alertedPosition=null;
                        if (this.aiState !== 'CHASE' && this.aiState !== 'ATTACK') this.aiState='PATROL';
                    }else{
                        this.moveTo(this.alertedPosition.x,this.alertedPosition.y,dt); return;
                    }
                }

                const canSeePlayer = (!this.game.player.isStealthed() || (this.target === this.game.player && distToPlayer < this.detectionRange * 0.6));
                const detectionRadius = (this.game.player.hasStatusEffect("Sys-Marked")) ? this.detectionRange * 1.5 : this.detectionRange;

                if(this.aiState === 'ATTACK'){
                    if(distToPlayer > this.attackRange * 1.2 || (this.target && this.target.hp <= 0)) {this.aiState = 'CHASE';}
                    if(!this.target || this.target.hp <=0) {this.aiState = 'PATROL'; this.target = null;}
                }
                else if(this.aiState === 'CHASE'){
                    if(!this.target || this.target.hp <= 0 || (!canSeePlayer && distToPlayer > detectionRadius * 1.2)){this.aiState = 'PATROL'; this.target = null;}
                    else if(distToPlayer <= this.attackRange) this.aiState = 'ATTACK';
                }
                else {
                    if(canSeePlayer && distToPlayer <= detectionRadius){
                        this.aiState = 'CHASE'; this.target = this.game.player;
                        this.game.utils.addMessage(`${this.name} locked on Xperient signature!`);
                    }
                }

                switch(this.aiState){
                    case 'PATROL':
                        if(this.patrolPath && this.patrolPath.length>0){
                            const pt=this.patrolPath[this.currentPatrolIndex];
                            if(this.game.utils.distance(this.x,this.y,pt.x,pt.y)<this.game.config.TILE_SIZE/2) this.currentPatrolIndex=(this.currentPatrolIndex+1)%this.patrolPath.length;
                            this.moveTo(pt.x,pt.y,dt);
                        } else {
                            if(Math.random()<0.01*(1/(dt||0.016)) || !this.wanderTarget){ 
                                this.wanderTarget={x:this.x+(Math.random()-0.5)*this.game.config.TILE_SIZE*5,y:this.y+(Math.random()-0.5)*this.game.config.TILE_SIZE*5};
                            }
                            if(this.wanderTarget){
                                if(this.game.utils.distance(this.x,this.y,this.wanderTarget.x,this.wanderTarget.y)<this.game.config.TILE_SIZE/2 || this.game.mapManager.isColliding(this.wanderTarget.x, this.wanderTarget.y)) this.wanderTarget=null;
                                else this.moveTo(this.wanderTarget.x,this.wanderTarget.y,dt);
                            }
                        } break;
                    case 'CHASE': if(this.target) this.moveTo(this.target.x,this.target.y,dt); break;
                    case 'ATTACK':
                        if(this.target && this.target.hp > 0 && Date.now()-this.lastAttackTime>=this.attackCooldown){
                            this.lastAttackTime=Date.now();
                            if(this.attackEffect) this.attackEffect(this.target); 
                            else this.target.takeDamage(this.damage);
                        } break;
                }
            },
            moveTo: function(tx,ty,dt){
                const dx=tx-this.x, dy=ty-this.y;
                const distVal=Math.sqrt(dx*dx+dy*dy);
                if(distVal<1)return;
                const mx=(dx/distVal)*this.speed*dt, my=(dy/distVal)*this.speed*dt;
                if(!this.checkMapCollision({x:this.x+mx,y:this.y,width:this.width,height:this.height}))this.x+=mx;
                if(!this.checkMapCollision({x:this.x,y:this.y+my,width:this.width,height:this.height}))this.y+=my;
            },
            checkMapCollision: function(rect){
                const c=[{x:rect.x,y:rect.y},{x:rect.x+rect.width,y:rect.y},{x:rect.x,y:rect.y+rect.height},{x:rect.x+rect.width,y:rect.y+rect.height}];
                for(const cn of c) if(this.game.mapManager.isColliding(cn.x,cn.y)) return true;
                return false;
            },
            alertToPosition(x,y){
                this.alertedPosition={x,y};
                if(this.aiState !== 'CHASE' && this.aiState !== 'ATTACK'){
                    this.aiState='CHASE';
                    this.game.utils.addMessage(`${this.name} detected anomaly at Xperient position!`);
                } else {
                    this.aiState='CHASE';
                }
            }
        };
        return enemyInstance;
    },

    spawnEnemy: function(typeId, tileX, tileY, patrolPath=[]) {
        const newE=this.createEnemy(typeId, tileX*this.game.config.TILE_SIZE, tileY*this.game.config.TILE_SIZE, patrolPath.map(p=>({x:p.x*this.game.config.TILE_SIZE,y:p.y*this.game.config.TILE_SIZE})));
        if(newE) this.list.push(newE);
    },

    spawnInitialEnemies: function() {
        this.list=[];
        this.spawnEnemy('enforcer',15,15,[{x:14,y:14},{x:16,y:14},{x:16,y:16},{x:14,y:16}]);
        this.spawnEnemy('enforcer',20,25);
        this.spawnEnemy('drone',25,10);

        const bossX=this.game.config.MAP_WIDTH_TILES-10, bossY=this.game.config.MAP_HEIGHT_TILES-10;
        this.spawnEnemy('warden', bossX, bossY);
        const doc = this.game.itemManager.createItemById('xdata_fragment');
        if(doc) this.game.itemManager.onMapItems.push({...doc, x:bossX*this.game.config.TILE_SIZE, y:(bossY-1)*this.game.config.TILE_SIZE, width:this.game.config.TILE_SIZE*0.8, height:this.game.config.TILE_SIZE*0.8});

        for(let r=0;r<this.game.config.MAP_HEIGHT_TILES;r++){
            for(let c=0;c<this.game.config.MAP_WIDTH_TILES;c++){
                const tileData = this.game.mapManager.getTileData(c,r);
                if(tileData && tileData.type === TILE_TYPES.HOSTILE_SPAWN_VECTOR && Math.random()<0.3) { // Corrected access and added null check
                    this.spawnEnemy(Math.random()<0.7?'enforcer':'drone',c,r);
                }
            }
        }
    },

    updateEnemies: function(dt) {
        for(let i=this.list.length-1;i>=0;i--) this.list[i].updateAI(dt);
    },

    renderEnemies: function() {
        this.list.forEach(e => {
            if(e.x+e.width > this.game.camera.x && e.x < this.game.camera.x + this.game.camera.width &&
               e.y+e.height > this.game.camera.y && e.y < this.game.camera.y + this.game.camera.height){

                this.game.ctx.fillStyle=e.color;
                this.game.ctx.font=`${this.game.config.TILE_SIZE*0.9}px Arial`;
                this.game.ctx.textAlign='center';
                this.game.ctx.textBaseline='middle';
                this.game.ctx.fillText(e.char, e.x+e.width/2, e.y+e.height/2+this.game.config.TILE_SIZE*0.1);

                if(e.currentHp<e.hp){
                    const bY=e.y-6, bH=4;
                    this.game.ctx.fillStyle='#500';
                    this.game.ctx.fillRect(e.x,bY,e.width,bH);
                    this.game.ctx.fillStyle=e.color;
                    this.game.ctx.fillRect(e.x,bY,e.width*(e.currentHp/e.hp),bH);
                }
            }
        });
    }
};
// --- END OF FILE js/enemyManager.js ---
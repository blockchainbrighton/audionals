export const zoneManager = {
    game: null,
    zones:[], 
    controlDurationThreshold:30000, 
    passiveIncomeInterval:60000,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.zones=[ 
            {id:'zone_epsilon',name:"Corrupted Zone Epsilon",x:12*this.game.config.TILE_SIZE,y:12*this.game.config.TILE_SIZE,width:6*this.game.config.TILE_SIZE,height:6*this.game.config.TILE_SIZE,isControlledByPlayer:false,controlTimer:0,incomeTimer:0,enemiesInZone:0,initialEnemiesToClear:2, incomeValue: 75},
            {id:'exchange_fringe',name:"Exchange Node Fringe",x:5*this.game.config.TILE_SIZE,y:5*this.game.config.TILE_SIZE,width:12*this.game.config.TILE_SIZE,height:12*this.game.config.TILE_SIZE,isControlledByPlayer:false,controlTimer:0,incomeTimer:0,enemiesInZone:0,initialEnemiesToClear:3, incomeValue: 120}
        ]; 
        this.zones.forEach(z=>this.updateEnemyCountInZone(z));
    },

    update: function(dt){
        this.zones.forEach(z=>{
            this.updateEnemyCountInZone(z); 
            if(z.enemiesInZone===0 && !z.isControlledByPlayer){
                z.controlTimer+=dt*1000; 
                if(z.controlTimer>=this.controlDurationThreshold){
                    z.isControlledByPlayer=true;
                    z.incomeTimer=0;
                    this.game.utils.addMessage(`Zone "${z.name}" Secured. Yielding passive compounds (Creds).`);
                }
            }else if(z.enemiesInZone>0 && z.isControlledByPlayer){
                z.isControlledByPlayer=false;
                z.controlTimer=0;
                this.game.utils.addMessage(`Zone "${z.name}" integrity compromised by hostiles!`);
            } 
            if(z.isControlledByPlayer){
                z.incomeTimer+=dt*1000; 
                if(z.incomeTimer>=this.passiveIncomeInterval){
                    const inc= z.incomeValue || 50;
                    this.game.player.earnMoney(inc);
                    this.game.utils.addMessage(`+${inc}c compound yield from ${z.name}.`);
                    z.incomeTimer=0;
                }
            }
        });
    },

    updateDailyZoneResets: function(){
        this.zones.forEach(z=>{
            if(z.isControlledByPlayer||z.enemiesInZone===0){
                if(Math.random()<0.4){
                    this.respawnEnemiesInZone(z,Math.ceil(z.initialEnemiesToClear/2)+Math.floor(Math.random()*2)); 
                    this.game.utils.addMessage(`System entities repopulating ${z.name}!`); 
                    z.isControlledByPlayer=false;
                    z.controlTimer=0;
                }
            }
        });
    },

    respawnEnemiesInZone:function(z,cnt){
        for(let i=0;i<cnt;i++){
            let att=0,spawned=false; 
            while(att<10&&!spawned){
                const sX=z.x+Math.random()*z.width;
                const sY=z.y+Math.random()*z.height; 
                if(!this.game.mapManager.isColliding(sX,sY)){
                    this.game.enemyManager.spawnEnemy(Math.random()<0.7?'enforcer':'drone',Math.floor(sX/this.game.config.TILE_SIZE),Math.floor(sY/this.game.config.TILE_SIZE));
                    spawned=true;
                }
                att++;
            }
        }
        this.updateEnemyCountInZone(z);
    },

    updateEnemyCountInZone:function(z){
        let cnt=0;
        this.game.enemyManager.list.forEach(e=>{
            if(this.isEnemyInZone(e,z))cnt++;
        });
        z.enemiesInZone=cnt;
    },

    isEnemyInZone:function(e,z){
        const eX=e.x+e.width/2,eY=e.y+e.height/2; 
        return eX>=z.x&&eX<=z.x+z.width&&eY>=z.y&&eY<=z.y+z.height;
    },

    getZoneById:function(id){return this.zones.find(z=>z.id===id);},
    
    notifyEnemyDefeatedInZone:function(e){ 
        // This logic seems to be mostly handled by questManager's notifyEnemyDefeated.
        // If specific zone logic is needed beyond quest updates, it would go here.
        // For now, just re-evaluating enemy count should be enough.
        this.zones.forEach(z => {
            if (this.isEnemyInZone(e, z)) {
                this.updateEnemyCountInZone(z);
            }
        });
    },

    render:function(){
        this.zones.forEach(z=>{
            if(z.x+z.width > this.game.camera.x && z.x < this.game.camera.x + this.game.camera.width && 
               z.y+z.height > this.game.camera.y && z.y < this.game.camera.y + this.game.camera.height){
                this.game.ctx.globalAlpha=0.15; 
                let col; 
                if(z.isControlledByPlayer)col='rgba(0,255,0,0.5)'; 
                else if(z.enemiesInZone>0)col='rgba(255,0,0,0.5)'; 
                else col='rgba(255,255,0,0.4)';
                this.game.ctx.fillStyle=col;
                this.game.ctx.fillRect(z.x,z.y,z.width,z.height);
                this.game.ctx.globalAlpha=0.6;
                this.game.ctx.fillStyle='#EEE';
                this.game.ctx.font='10px Courier New';
                this.game.ctx.textAlign='center';
                this.game.ctx.fillText(z.name,z.x+z.width/2,z.y+12);
                this.game.ctx.globalAlpha=1.0;
            }
        });
    }
};
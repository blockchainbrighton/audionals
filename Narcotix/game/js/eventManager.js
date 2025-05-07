// --- START OF FILE js/eventManager.js ---
import { TILE_TYPES } from './mapManager.js'; // Import TILE_TYPES

export const eventManager = {
    game: null,
    activeEvent: null,
    eventCheckInterval:20000,
    lastEventCheckTime:0,
    possibleEvents: [],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.activeEvent = null;
        this.lastEventCheckTime = 0;
        this.defineEvents();
    },

    defineEvents: function() {
        const self = this; 
        this.possibleEvents = [
            {name:"System Integrity Sweep",duration:60000,
                start:function(){
                    self.game.utils.addMessage("EVENT: System Integrity Sweep Active! Increased Meta-Patrol Unit presence.");
                    const q=Math.floor(Math.random()*4);
                    let sX=0,sY=0;
                    let qW=self.game.config.MAP_WIDTH_TILES/2, qH=self.game.config.MAP_HEIGHT_TILES/2;
                    if(q===1)sX=self.game.config.MAP_WIDTH_TILES/2;
                    if(q===2)sY=self.game.config.MAP_HEIGHT_TILES/2;
                    if(q===3){sX=self.game.config.MAP_WIDTH_TILES/2;sY=self.game.config.MAP_HEIGHT_TILES/2;}
                    for(let i=0;i<3+Math.floor(Math.random()*3);i++){
                        const rX=Math.floor(sX+Math.random()*qW),rY=Math.floor(sY+Math.random()*qH);
                        if(!self.game.mapManager.isColliding(rX*self.game.config.TILE_SIZE,rY*self.game.config.TILE_SIZE)) {
                            self.game.enemyManager.spawnEnemy('drone',rX,rY);
                        }
                    }
                    return{q};
                },
                end:function(data){self.game.utils.addMessage("EVENT: System Integrity Sweep Concluded.");}
            },
            {name:"Xemist Airdrop",duration:90000,
                start:function(){
                    let dX,dY,p=false;
                    for(let i=0;i<20;i++){
                        dX=Math.floor(Math.random()*self.game.config.MAP_WIDTH_TILES);
                        dY=Math.floor(Math.random()*self.game.config.MAP_HEIGHT_TILES);
                        const tileDataForEvent = self.game.mapManager.getTileData(dX, dY);
                        if(tileDataForEvent && !self.game.mapManager.isColliding(dX*self.game.config.TILE_SIZE,dY*self.game.config.TILE_SIZE) &&
                           tileDataForEvent.type !== TILE_TYPES.COOLANT_RESERVOIR){ // Corrected access and added null check
                            p=true;break;
                        }
                    }
                    if(!p){dX=self.game.config.MAP_WIDTH_TILES/2;dY=self.game.config.MAP_HEIGHT_TILES/2;}
                    const itemPool=['nanite_repair','adrena_rush_injector','kaos_elixir'];
                    const vItm=itemPool[Math.floor(Math.random()*itemPool.length)];
                    const qty=1;
                    const sId=`sd_${Date.now()}`;
                    self.game.itemManager.onMapItems.push({
                        id:vItm,
                        name:self.game.itemManager.itemDefinitions[vItm].name,
                        x:dX*self.game.config.TILE_SIZE,y:dY*self.game.config.TILE_SIZE,
                        width:self.game.config.TILE_SIZE,height:self.game.config.TILE_SIZE,
                        char:'X',color:'#0F0',isEventItem:true,eventItemId:sId,quantity:qty
                    });
                    self.game.utils.addMessage(`EVENT: Xemist Airdrop detected at grid (${dX},${dY})! Contains: ${self.game.itemManager.itemDefinitions[vItm].name}.`);
                    return{eventItemId:sId, dropX: dX, dropY: dY};
                },
                end:function(data){
                    self.game.itemManager.onMapItems = self.game.itemManager.onMapItems.filter(itm=>!(itm.isEventItem&&itm.eventItemId===data.eventItemId));
                    self.game.utils.addMessage("EVENT: Xemist Airdrop secured or degraded.");
                }
            },
            {name:"Exchange Volatility Spike",duration:120000,
                start:function(){
                    const comId='narcotix_pill';
                    if(!self.game.itemManager.itemDefinitions[comId]) return null;
                    const pM=1.4+Math.random()*0.4;
                    self.game.utils.addMessage(`EVENT: Volatility Spike for ${self.game.itemManager.itemDefinitions[comId].name}! Liquidation prices are ${Math.round(pM*100-100)}% higher!`);
                    return{targetItem:comId,priceMultiplier:pM};
                },
                end:function(data){self.game.utils.addMessage(`EVENT: Volatility Spike for ${self.game.itemManager.itemDefinitions[data.targetItem].name} has normalized.`);}
            }
        ];
    },

    update: function(dt){
        const now=Date.now();
        if(this.activeEvent){
            if(now>=this.activeEvent.endTime){
                if(this.activeEvent.definition.end)this.activeEvent.definition.end(this.activeEvent.data);
                this.activeEvent=null;
            }
        }else{
            if(now-this.lastEventCheckTime>=this.eventCheckInterval){
                this.lastEventCheckTime=now;
                if(Math.random()<0.2)this.triggerRandomEvent();
            }
        }
    },

    triggerRandomEvent: function(){
        if(this.activeEvent||this.possibleEvents.length===0)return;
        const eDef=this.possibleEvents[Math.floor(Math.random()*this.possibleEvents.length)];
        const eData=eDef.start?eDef.start():{};
        if(eData===null)return;
        this.activeEvent={definition:eDef,startTime:Date.now(),endTime:Date.now()+eDef.duration,data:eData};
        this.game.utils.addMessage(`Event Initialized: ${eDef.name}`);
    },

    isEventActive: function(eName){return this.activeEvent&&this.activeEvent.definition.name===eName;},

    getActiveEventDetails: function(){
        if(this.activeEvent)return{name:this.activeEvent.definition.name,...this.activeEvent.data};
        return null;
    }
};
// --- END OF FILE js/eventManager.js ---
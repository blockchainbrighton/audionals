export const questManager = {
    game: null,
    availableQuests: [], 
    activeQuests: [],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.availableQuests = [];
        this.activeQuests = [];
        this.defineQuests();
    },

    defineQuests: function() {
        // 'this' inside quest methods (onAccept, checkCompletion) will refer to the quest object itself.
        // They will need to access 'this.game' via the questManager instance.
        const self = this; // To access questManager.game inside quest methods

        this.availableQuests = [
            {id:'q_deliver_xdata',title:"Hot XData Packet Delivery",giverId:'glitch_codex',description:"A priority XData packet (5 NarcotiX Pills) needs to reach the Xemist Den. Discretion paramount.",type:'DELIVER_ITEM_TO_NPC',itemToDeliverId:'narcotix_pill',quantity:5,targetNPCId:'xemist_den',reward:{money:100, item:this.game.itemManager.createItemById('nanite_repair',1)},isCompleted:false,isAccepted:false,
                onAccept:function(){const item=self.game.itemManager.createItemById('narcotix_pill',5); item.name += " (Secure Packet)"; item.questItem=true; if(self.game.player.addItem(item)){self.game.utils.addMessage("Glitch_Codex transfers secure packet.");return true;}else{self.game.utils.addMessage("Insufficient Stash capacity for packet!");return false;}},
                checkCompletion:function(){return false;} // Completion is handled at delivery
            },
            {id:'q_defrag_zone',title:"Defrag Corrupted Zone Epsilon",giverId:'glitch_codex',description:"Corrupted Zone Epsilon (NW of XLounge Stash) is overrun by 2 System Enforcers. Sanitize the area.",type:'CLEAR_ZONE',targetZoneId:'zone_epsilon',targetEnemyType:'enforcer',requiredKills:2,currentKills:0,reward:{money:150,item:self.game.itemManager.createItemById('adrena_rush_injector')},isCompleted:false,isAccepted:false,
                onAccept:function(){self.game.utils.addMessage("Protocol: Defrag Zone Epsilon - ACCEPTED.");return true;},
                checkCompletion:function(){return this.currentKills>=this.requiredKills;}
            },
            {id:'q_retrieve_formula',title:"Retrieve Leaked Xemist Formula",giverId:'glitch_codex',description:"A Zone Warden (SE Quadrant) is holding a critical XData Fragment. Secure it and return to Glitch_Codex.",type:'FIND_ITEM',itemToFindId:'xdata_fragment',reward:{money:250,item:self.game.itemManager.createItemById('kaos_elixir')},isCompleted:false,isAccepted:false,
                onAccept:function(){self.game.utils.addMessage("Protocol: Retrieve XData Fragment - ACCEPTED.");return true;},
                checkCompletion:function(){return self.game.player.hasItem(this.itemToFindId);}
            }
        ];
        this.renderQuestLog();
    },

    interactWithQuestGiver: function(giverId){
        const activeReadyForTurnIn = this.activeQuests.find(q=>(q.giverId===giverId || q.type==='FIND_ITEM' && q.giverId===giverId) && q.checkCompletion && q.checkCompletion() && !q.isCompleted);
        if(activeReadyForTurnIn) { this.completeQuest(activeReadyForTurnIn); return;}

        const avail=this.availableQuests.filter(q=>q.giverId===giverId && !q.isAccepted && !q.isCompleted);
        if(avail.length>0){
            const qOffer=avail[0]; 
            const accept=confirm(`[${giverId}]: Encrypted transmission incoming...\nProtocol: ${qOffer.title}\nObjective: "${qOffer.description}"\nReward on completion: ${this.getRewardString(qOffer.reward)}\n:: Accept Transmission?`); 
            if(accept) this.acceptQuest(qOffer);
        }
        else if(this.activeQuests.some(q=>q.giverId===giverId)) this.game.utils.addMessage(`[${giverId}]: Active protocol ${this.activeQuests.find(q=>q.giverId===giverId).title} is still pending.`); 
        else this.game.utils.addMessage(`[${giverId}]: No further protocols available. Standby.`);
    },

    getRewardString:function(r){
        let s="";
        if(r.money)s+=`${r.money}c `; 
        if(r.item)s+=`${r.item.name}(x${r.item.quantity||1})`; 
        return s.trim()||"System Acknowledgment";
    },

    acceptQuest: function(q){
        if(q.onAccept && !q.onAccept()){return;} 
        q.isAccepted=true; 
        this.activeQuests.push(q); 
        const idx=this.availableQuests.findIndex(aq=>aq.id===q.id);
        if(idx>-1)this.availableQuests.splice(idx,1);
        this.game.utils.addMessage(`Protocol "${q.title}" accepted. Details in log.`);
        this.renderQuestLog();
        this.game.hud.update();
    },

    completeQuest: function(q){
        q.isCompleted=true;
        this.game.utils.addMessage(`Protocol "${q.title}" completed! Reward: ${this.getRewardString(q.reward)}`); 
        if(q.reward.money)this.game.player.earnMoney(q.reward.money); 
        if(q.reward.item){
            const iR=this.game.itemManager.createItemById(q.reward.item.id,q.reward.item.quantity);
            if(iR)this.game.player.addItem(iR);
        } 
        if((q.type==='DELIVER_ITEM_TO_NPC'||q.type==='FIND_ITEM') && (q.itemToDeliverId || q.itemToFindId)) {
            this.game.player.removeItem(q.itemToDeliverId||q.itemToFindId, q.quantity||1);
        }
        this.activeQuests=this.activeQuests.filter(aq=>aq.id!==q.id);
        this.renderQuestLog();
        this.game.hud.update();
    },

    notifyEnemyDefeated: function(e){
        this.activeQuests.forEach(q=>{
            if(q.type==='CLEAR_ZONE' && !q.isCompleted){
                if(q.targetEnemyType && e.typeId !== q.targetEnemyType) return; 
                const zone=this.game.zoneManager.getZoneById(q.targetZoneId); 
                if(zone && this.game.zoneManager.isEnemyInZone(e,zone)){
                    q.currentKills=(q.currentKills||0)+1;
                    this.game.utils.addMessage(`Protocol(${q.title}): ${q.currentKills}/${q.requiredKills} hostiles neutralized in ${zone.name}.`);
                    if(q.checkCompletion && q.checkCompletion()){
                        this.game.utils.addMessage(`Objective for "${q.title}" achieved! Report to ${q.giverId}.`);
                    }
                }
            }
        }); 
        this.renderQuestLog();
        this.game.hud.update();
    },

    checkDeliverQuestAtShop: function(shopId) {
        const qToDeliver = this.activeQuests.find(q=>q.type==='DELIVER_ITEM_TO_NPC'&&q.targetNPCId===shopId&&!q.isCompleted);
        if(qToDeliver){
            const itemDef = this.game.itemManager.itemDefinitions[qToDeliver.itemToDeliverId];
            const itemNameForQuest = itemDef ? (itemDef.name + (qToDeliver.itemToDeliverId === 'narcotix_pill' ? " (Secure Packet)" : "")) : qToDeliver.itemToDeliverId;

            if(this.game.player.hasItem(qToDeliver.itemToDeliverId, qToDeliver.quantity)){
                 if(confirm(`Deliver ${qToDeliver.quantity}x ${itemNameForQuest} for Protocol "${qToDeliver.title}" to this contact?`)){
                    this.completeQuest(qToDeliver);
                    return true;
                }
            } else {
                this.game.utils.addMessage(`Need ${qToDeliver.quantity}x ${itemNameForQuest} for Protocol "${qToDeliver.title}".`); 
                return false; 
            }
        } 
        return false;
    },

    isItemDeliverableToShop: function(itemId, shopId) {
        return this.activeQuests.some(q => q.type === 'DELIVER_ITEM_TO_NPC' && q.itemToDeliverId === itemId && q.targetNPCId === shopId && !q.isCompleted);
    },

    renderQuestLog: function(){
        const div=document.getElementById('activeQuestsDisplay');
        if (!div) return;
        div.innerHTML='';
        const hudQuestTitle = document.getElementById('activeQuestTitle');
        if (!hudQuestTitle) return;

        if(this.activeQuests.length===0){
            div.innerHTML='<p>No active protocols. Interface with Xemist contacts for new directives.</p>'; 
            hudQuestTitle.textContent="None"; 
            return;
        }
       
        this.activeQuests.forEach(q=>{
            const qDiv=document.createElement('div');
            qDiv.className='questItem';
            let stat="";
            const itemToDeliverDef = q.itemToDeliverId ? this.game.itemManager.itemDefinitions[q.itemToDeliverId] : null;
            const itemToFindDef = q.itemToFindId ? this.game.itemManager.itemDefinitions[q.itemToFindId] : null;

            if(q.type==='CLEAR_ZONE') stat=` (${q.currentKills||0}/${q.requiredKills||'N/A'} hostiles)`;
            else if(q.type==='FIND_ITEM') stat = this.game.player.hasItem(q.itemToFindId) ? ` (${itemToFindDef?itemToFindDef.name:q.itemToFindId} Acquired!)` : ` (${itemToFindDef?itemToFindDef.name:q.itemToFindId} Not Secured)`;
            else if(q.type==='DELIVER_ITEM_TO_NPC') {
                 const playerQty = this.game.player.inventory.items.find(i=>i.id===q.itemToDeliverId)?.quantity || 0;
                 const itemNameForQuest = itemToDeliverDef ? (itemToDeliverDef.name + (q.itemToDeliverId === 'narcotix_pill' ? " (Secure Packet)" : "")) : q.itemToDeliverId;
                 stat = playerQty >= q.quantity ? ` (${itemNameForQuest} Ready for Transfer)` : ` (Need ${q.quantity - playerQty} more ${itemNameForQuest})`;
            }
            if(q.checkCompletion && q.checkCompletion() && (q.type !== 'DELIVER_ITEM_TO_NPC') ) stat+=" (Return to Contact!)";
            else if (q.checkCompletion && q.checkCompletion() && q.type === 'DELIVER_ITEM_TO_NPC') stat += " (Deliver to Target Node!)";
            
            qDiv.innerHTML=`<b>${q.title}</b>: <i>${q.description}</i>${stat}`;
            div.appendChild(qDiv);
        });
        const firstActive = this.activeQuests[0];
        hudQuestTitle.textContent = firstActive.title.substring(0,20) + (firstActive.title.length > 20 ? "..." : "");
    },

    renderQuestMarkers: function(){
        this.availableQuests.forEach(q=>{
            if(!q.isAccepted){
                const gLoc=this.findLocation(q.giverId, 'xemist_contact');
                if(gLoc)this.drawMarker(gLoc.x,gLoc.y,"!","yellow");
            }
        }); 
        this.activeQuests.forEach(q=>{
            if(!q.isCompleted){
                let tLoc;let markerChar="?"; let markerCol="white"; 
                if(q.type==='DELIVER_ITEM_TO_NPC'){
                    tLoc=this.findLocation(q.targetNPCId, 'exchange_node'); 
                    markerCol="cyan";
                }else if(q.type==='CLEAR_ZONE'){
                    const z=this.game.zoneManager.getZoneById(q.targetZoneId);
                    if(z)tLoc={x:z.x+z.width/2,y:z.y+z.height/2}; 
                    markerChar="X";markerCol="red";
                }else if(q.type==='FIND_ITEM'){
                    const itm=this.game.itemManager.onMapItems.find(i=>i.id===q.itemToFindId);
                    if(itm)tLoc={x:itm.x,y:itm.y};
                    else{
                        const b=this.game.enemyManager.list.find(e=>e.isBoss && e.typeId === 'warden'); 
                        if(b && !this.game.player.hasItem(q.itemToFindId))tLoc={x:b.x,y:b.y};
                    } 
                    markerChar="Җ"; markerCol="lightblue"; // Was Җ, but using * to match legend
                } 
                if(q.checkCompletion && q.checkCompletion()){
                    const gLoc=this.findLocation(q.giverId, 'xemist_contact');
                    if(gLoc){tLoc=gLoc; markerChar="?"; markerCol="lime";}
                } 
                if(tLoc)this.drawMarker(tLoc.x,tLoc.y,markerChar,markerCol);
            }
        });
    },

    findLocation: function(targetId, interactionType){ // Simplified: interactionTargetId on tile must match targetId
        for(let r=0; r < this.game.config.MAP_HEIGHT_TILES; r++){
            for(let c=0; c < this.game.config.MAP_WIDTH_TILES; c++){
                const tileData = this.game.mapManager.getTileData(c,r);
                if (tileData && tileData.interactionType === interactionType && tileData.interactionTargetId === targetId) {
                    return{x:c*this.game.config.TILE_SIZE+this.game.config.TILE_SIZE/2, y:r*this.game.config.TILE_SIZE+this.game.config.TILE_SIZE/2};
                }
            }
        } 
        return null;
    },

    drawMarker: function(wX,wY,char,col){
        if(wX > this.game.camera.x - this.game.config.TILE_SIZE && 
           wX < this.game.camera.x + this.game.camera.width + this.game.config.TILE_SIZE && 
           wY > this.game.camera.y - this.game.config.TILE_SIZE && 
           wY < this.game.camera.y + this.game.camera.height + this.game.config.TILE_SIZE){
            this.game.ctx.fillStyle=col;
            this.game.ctx.font=`bold ${this.game.config.TILE_SIZE*0.9}px Arial`;
            this.game.ctx.textAlign='center';
            this.game.ctx.textBaseline='bottom';
            this.game.ctx.fillText(char,wX,wY-this.game.config.TILE_SIZE/2);
        }
    },
};
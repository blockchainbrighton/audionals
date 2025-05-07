export const shopManager = {
    game: null,
    shops: {},

    init: function(gameInstance) {
        this.game = gameInstance;
        this.shops = {
            'central_exchange': {name:"Central Exchange Node", welcome:"Accessing Central Exchange... Verified Xperient. Trade at will.", inventory:[{itemId:'nanite_repair',stock:10,basePriceModifier:1.0},{itemId:'adrena_rush_injector',stock:5,basePriceModifier:1.0},{itemId:'narcotix_pill',stock:Infinity,basePriceModifier:1.0}], buys:['narcotix_pill']},
            'xemist_den': {name:"Xemist Den Interface", welcome:"Signal acquired. This is a... restricted channel. What d'you need?", inventory:[{itemId:'narcotix_pill',stock:Infinity,basePriceModifier:0.8},{itemId:'kaos_elixir',stock:3,basePriceModifier:1.2}], buys:['narcotix_pill','xdata_fragment']},
            'xlounge_personal': {name:"XLounge (Personal Stash I/O)", welcome:"XLounge Stash Verified. All assets digital. No physical weapons permitted past this interface.", inventory:[{itemId:'nanite_repair', stock:3, basePriceModifier:0.9}], buys:[]}
        };
    },

    getPriceFluctuationModifier: function(itemId){
        const iDef = this.game.itemManager.itemDefinitions[itemId]; 
        if(!iDef || iDef.type!=='commodity') return 1.0; 
        let mod=1.0; 
        if(itemId==='narcotix_pill') mod *= this.game.isDayTime ? 0.9 : 1.3; 
        if(this.game.randomEventManager.isEventActive('Volatility Spike')){
            const ed = this.game.randomEventManager.getActiveEventDetails(); 
            if(ed && ed.targetItem===itemId) mod *= ed.priceMultiplier;
        } 
        return mod;
    },

    getShopItemPrice: function(shopId, itemId){
        const s = this.shops[shopId];
        const iDef = this.game.itemManager.itemDefinitions[itemId];
        const entry = s.inventory.find(si => si.itemId === itemId); 
        if(!iDef || !entry) return 0; 
        let p = iDef.buyPrice * entry.basePriceModifier * this.getPriceFluctuationModifier(itemId); 
        return Math.ceil(p);
    },

    getPlayerSellPrice:function(shopId, itemId){
        const s = this.shops[shopId];
        const iDef = this.game.itemManager.itemDefinitions[itemId]; 
        if(!iDef || (!s.buys.includes(iDef.id) && !s.buys.includes(iDef.type))) return 0; 
        return Math.floor(iDef.sellPrice * this.getPriceFluctuationModifier(itemId));
    },

    populateShopUI: function(shopId){
        const shop = this.shops[shopId];
        const shopNameEl = document.getElementById('shopName');
        if (shopNameEl) shopNameEl.textContent = shop.name;
        
        const shopWelcomeEl = document.getElementById('shopWelcomeMessage');
        if (shopWelcomeEl) shopWelcomeEl.textContent = shop.welcome;

        const sItemsDiv = document.getElementById('shopItemsForSale');
        const pItemsDiv = document.getElementById('playerItemsToSell');
        if (!sItemsDiv || !pItemsDiv) return;

        sItemsDiv.innerHTML = ''; pItemsDiv.innerHTML = '';

        if (shop.inventory.length === 0 && shopId !== 'xlounge_personal') {
            sItemsDiv.innerHTML = "<p>No assets available on this node currently.</p>";
        } else if (shop.inventory.length === 0 && shopId === 'xlounge_personal') {
            sItemsDiv.innerHTML = "<p>Stash node is clean. Secure more assets.</p>";
        }
        
        shop.inventory.forEach(entry => {
            const iDef = this.game.itemManager.itemDefinitions[entry.itemId];
            if(iDef){
                const p = this.getShopItemPrice(shopId,entry.itemId);
                const div=document.createElement('div');
                div.className='shopItem'; 
                div.innerHTML=`${iDef.name} - ${p}c (Stock: ${entry.stock > 9000 ? "Abundant" : entry.stock}) <button class="button" onclick="game.shopManager.buyItem('${shopId}','${entry.itemId}')">Acquire</button>`; 
                sItemsDiv.appendChild(div);
            }
        });
       
        let canSellSomething = false;
        this.game.player.inventory.items.forEach(pItem => {
            let sellPriceToThisVendor = this.getPlayerSellPrice(shopId,pItem.id);
            // Quest item delivery is handled by questManager, this part is for regular selling
            if(sellPriceToThisVendor > 0 || (pItem.questItem && this.shops[shopId].buys.includes(pItem.id)) ){
                canSellSomething=true; 
                const div=document.createElement('div');
                div.className='shopItem';
                div.innerHTML=`${pItem.name} (x${pItem.quantity||1}) - Liquidate for ${sellPriceToThisVendor}c each <button class="button button-sell" onclick="game.shopManager.sellItem('${shopId}','${pItem.id}',1)">Sell 1</button>`;
                if((pItem.quantity||1)>1){
                    div.innerHTML+=`<button class="button button-sell" style="margin-left:5px;" onclick="game.shopManager.sellItem('${shopId}','${pItem.id}',${pItem.quantity||1})">Sell All</button>`;
                }
                pItemsDiv.appendChild(div);
            }
        });
        if (!canSellSomething) pItemsDiv.innerHTML = "<p>This node is not acquiring these asset types.</p>";
    },

    buyItem: function(shopId, itemId){
        const s = this.shops[shopId];
        const iDef = this.game.itemManager.itemDefinitions[itemId];
        const entry = s.inventory.find(si => si.itemId === itemId); 
        if(!iDef || !entry || entry.stock<=0){
            this.game.utils.addMessage("Asset unavailable from this node.");
            return;
        }
        const p = this.getShopItemPrice(shopId,itemId); 
        if(this.game.player.payMoney(p)){
            if(this.game.player.addItem(this.game.itemManager.createItemById(itemId))){
                entry.stock--;
                this.game.utils.addMessage(`Acquired ${iDef.name} for ${p}c.`);
                this.populateShopUI(shopId);
            } else {
                this.game.player.earnMoney(p); // Refund
                this.game.utils.addMessage("Data-Stash full. Transaction reversed.");
            }
        }else {
            this.game.utils.addMessage("Insufficient Creds for this asset.");
        }
    },

    sellItem: function(shopId, itemId, qty){
        const iDef = this.game.itemManager.itemDefinitions[itemId]; 
        if(!iDef || !this.game.player.hasItem(itemId,qty)){
            this.game.utils.addMessage(`Asset count mismatch: ${qty}x ${iDef.name}.`);
            return;
        } 
        const pPI = this.getPlayerSellPrice(shopId,itemId); 
        if(pPI > 0 || (iDef.type === 'quest_item' && this.shops[shopId].buys.includes(itemId))){
            this.game.player.removeItem(itemId,qty);
            const tot = (pPI * qty) || 0;
            this.game.player.earnMoney(tot);
            this.game.utils.addMessage(`Liquidated ${qty}x ${iDef.name} for ${tot}c.`); 
            const entry = this.shops[shopId].inventory.find(si => si.itemId === itemId); 
            if(entry && this.game.itemManager.itemDefinitions[itemId].type !== 'quest_item') entry.stock += qty; 
            this.populateShopUI(shopId);
        }else {
            this.game.utils.addMessage("Node not acquiring this asset type currently.");
        }
    }
};
import { imageLoader } from '../core/imageLoader.js';
import { shopDefinitions } from '../data/shops.js'; // Import centralized shops
import { UIFactory } from '../ui/UIFactory.js'; // Import UIFactory

export const shopManager = {
    game: null,
    shops: {},

    init: function(gameInstance) {
        this.game = gameInstance;
        this.shops = { ...shopDefinitions };
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
        
        // Apply Gang Price Mod (Discount)
        if (this.game.player.gang && this.game.player.gang.PriceMod) {
            p *= this.game.player.gang.PriceMod;
        }

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
                const imgUrl = UIFactory.getItemImageUrl(iDef, imageLoader);

                const buyBtn = UIFactory.createButtonString('Acquire', `game.shopManager.buyItem('${shopId}','${entry.itemId}')`, 'button-small');

                const card = UIFactory.createItemCardDOM({
                    imageUrl: imgUrl,
                    name: iDef.name,
                    subtext: `${p}c (Stock: ${entry.stock > 9000 ? "Abundant" : entry.stock})`,
                    actionButtons: buyBtn,
                    onClickFunc: () => this.game.showItemDetails(iDef)
                });
                // Add specific styling wrapper if needed, or rely on UIFactory standard
                // Current CSS for .shopItem might be different?
                // The current code used .shopItem which had display:flex etc.
                // UIFactory produces .inventory-item-card. 
                // We should ensure CSS matches or add class.
                // Reusing inventory card style is good for consistency.
                sItemsDiv.appendChild(card);
            }
        });
       
        let canSellSomething = false;
        this.game.player.inventory.items.forEach(pItem => {
            let sellPriceToThisVendor = this.getPlayerSellPrice(shopId,pItem.id);
            // Quest item delivery is handled by questManager, this part is for regular selling
            if(sellPriceToThisVendor > 0 || (pItem.questItem && this.shops[shopId].buys.includes(pItem.id)) ){
                canSellSomething=true; 
                
                const imgUrl = UIFactory.getItemImageUrl(pItem, imageLoader);

                let sellBtns = UIFactory.createButtonString('Sell 1', `game.shopManager.sellItem('${shopId}','${pItem.id}',1)`, 'button-sell');
                if ((pItem.quantity||1)>1) {
                    sellBtns += UIFactory.createButtonString('Sell All', `game.shopManager.sellItem('${shopId}','${pItem.id}',${pItem.quantity||1})`, 'button-sell');
                }

                const card = UIFactory.createItemCardDOM({
                    imageUrl: imgUrl,
                    name: pItem.name,
                    qty: pItem.quantity||1,
                    subtext: `${sellPriceToThisVendor}c each`,
                    actionButtons: sellBtns,
                    onClickFunc: () => this.game.showItemDetails(pItem)
                });
                
                pItemsDiv.appendChild(card);
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
                this.game.events.emit('ITEM_BOUGHT', { itemId: itemId, shopId: shopId, cost: p });
                this.populateShopUI(shopId);
            } else {
                this.game.player.earnMoney(p); // Refund
                this.game.utils.addMessage("Data-Stash full. Transaction reversed.");
            }
        }else {
            this.game.utils.addMessage("Insufficient Cycles for this asset.");
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

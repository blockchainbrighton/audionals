// js/stashManager.js
import { imageLoader } from './imageLoader.js';

export const stashManager = {
    game: null,

    init: function(gameInstance) {
        this.game = gameInstance;
    },

    openStash: function() {
        this.game.gameState = 'STASH_MENU';
        this.renderStashUI();
        
        const ui = document.getElementById('stashInterface');
        if (ui) ui.style.display = 'block';
        
        // Hide other UIs
        const inv = document.getElementById('inventoryDisplay');
        if (inv) inv.style.display = 'none';
        const quest = document.getElementById('questLog');
        if (quest) quest.style.display = 'none';
    },

    closeStash: function() {
        this.game.gameState = 'PLAYING';
        const ui = document.getElementById('stashInterface');
        if (ui) ui.style.display = 'none';
    },

    renderStashUI: function() {
        const pList = document.getElementById('playerStashItems');
        const sList = document.getElementById('houseStashItems');
        
        if (!pList || !sList) return;
        
        pList.innerHTML = '';
        sList.innerHTML = '';

        // Helper to resolve image URL
        const getImg = (item) => {
            let url = item.imageUrl;
            if (!url) {
                if (item.type === 'weapon' && item.weaponId) {
                    url = `artwork/${item.weaponId}.svg`;
                } else {
                    url = `artwork/${item.id}.svg`;
                }
            }
            if (item.nftTraits && item.nftTraits.id) {
                 url = imageLoader.getUrl(item.nftTraits.id) || url;
            }
            return url;
        };

        // Player Inventory (Left)
        this.game.player.inventory.items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'inventoryItem';
            div.style.cursor = 'pointer';
            div.onclick = () => this.game.showItemDetails(item); // Click to inspect

            const imgUrl = getImg(item);
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center;">
                        <div class="item-icon-container" style="width:32px; height:32px; margin-right:8px;">
                            <img src="${imgUrl}" class="item-icon" onerror="this.src='artwork/narcotix_pill.svg';">
                        </div>
                        <span><b>${item.name}</b> (x${item.quantity||1})</span>
                    </div>
                    <button class="button button-small" onclick="event.stopPropagation(); game.stashManager.storeItem(${index})">Store &gt;</button>
                </div>
            `;
            pList.appendChild(div);
        });
        
        // Stash Inventory (Right)
        this.game.player.stash.items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'inventoryItem';
            div.style.cursor = 'pointer';
            div.onclick = () => this.game.showItemDetails(item); // Click to inspect

            const imgUrl = getImg(item);

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="button button-small" onclick="event.stopPropagation(); game.stashManager.retrieveItem(${index})">&lt; Retrieve</button>
                    <div style="display:flex; align-items:center; justify-content:flex-end; text-align:right;">
                        <span style="margin-right:8px;"><b>${item.name}</b> (x${item.quantity||1})</span>
                        <div class="item-icon-container" style="width:32px; height:32px;">
                            <img src="${imgUrl}" class="item-icon" onerror="this.src='artwork/narcotix_pill.svg';">
                        </div>
                    </div>
                </div>
            `;
            sList.appendChild(div);
        });

        // Capacity Indicators
        const pCap = document.getElementById('playerStashCap');
        if (pCap) pCap.textContent = `${this.game.player.inventory.items.length}/${this.game.player.inventory.capacity}`;
        
        const sCap = document.getElementById('houseStashCap');
        if (sCap) sCap.textContent = `${this.game.player.stash.items.length}/${this.game.player.stash.capacity}`;
    },

    storeItem: function(index) {
        const playerInv = this.game.player.inventory;
        const stashInv = this.game.player.stash;
        
        if (index < 0 || index >= playerInv.items.length) return;
        
        const item = playerInv.items[index];
        
        // Check Stash Capacity
        if (stashInv.items.length >= stashInv.capacity && (!item.stackable || !stashInv.items.find(i => i.id === item.id))) {
            this.game.utils.addMessage("Stash is full!");
            return;
        }

        // Add to Stash
        const existing = stashInv.items.find(i => i.id === item.id && item.stackable);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        } else {
            // Clone item to avoid reference issues
            stashInv.items.push({ ...item });
        }

        // Handle side effects (e.g. Walkman deactivation)
        this.game.player.handleItemRemoval(item);

        // Remove from Player
        playerInv.items.splice(index, 1);
        
        this.renderStashUI();
        if (this.game.soundManager) this.game.soundManager.playUI();
    },

    retrieveItem: function(index) {
        const playerInv = this.game.player.inventory;
        const stashInv = this.game.player.stash;
        
        if (index < 0 || index >= stashInv.items.length) return;
        
        const item = stashInv.items[index];
        
        // Check Player Capacity
        if (playerInv.items.length >= playerInv.capacity && (!item.stackable || !playerInv.items.find(i => i.id === item.id))) {
            this.game.utils.addMessage("Inventory is full!");
            return;
        }

        // Add to Player
        const existing = playerInv.items.find(i => i.id === item.id && item.stackable);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        } else {
            playerInv.items.push({ ...item });
        }

        // Remove from Stash
        stashInv.items.splice(index, 1);
        
        this.renderStashUI();
        if (this.game.soundManager) this.game.soundManager.playUI();
    }
};

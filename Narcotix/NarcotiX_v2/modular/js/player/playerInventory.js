// js/player/playerInventory.js

export const inventoryProperties = {
    inventory: { items: [], capacity: 10 },
};

export function initInventory() {
    // 'this' refers to player object
    this.inventory.items = []; // Reset items
    this.inventory.capacity = inventoryProperties.inventory.capacity; // Reset capacity
    
    const firstAid = this.game.itemManager.createItemById('nanite_repair');
    if (firstAid) this.addItem(firstAid); // this.addItem is defined below
}

export function addItem(item) {
    // 'this' refers to player object
    if (this.inventory.items.length >= this.inventory.capacity && (!item.stackable || !this.inventory.items.find(i => i.id === item.id))) {
        this.game.utils.addMessage("Data-Stash at capacity!");
        return false;
    }
    const existing = this.inventory.items.find(i => i.id === item.id && item.stackable);
    if (existing) existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    else this.inventory.items.push({...item, quantity: item.quantity || 1}); // Ensure quantity exists

    this.game.utils.addMessage(`Acquired ${item.name} (x${item.quantity || 1}). Stored.`);
    this.renderInventory();
    this.game.hud.update();
    return true;
}

export function removeItem(itemId, quantity = 1) {
    // 'this' refers to player object
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
}

export function hasItem(itemId, quantity = 1) {
    // 'this' refers to player object
    const item = this.inventory.items.find(i => i.id === itemId);
    return item && (item.quantity || 1) >= quantity;
}

export function useItem(itemIndex) {
    // 'this' refers to player object
    const item = this.inventory.items[itemIndex];
    if (item) {
        if (item.effect) item.effect(this); // Pass player object (this) to the item effect
        else this.game.utils.addMessage(`${item.name} has no direct activation routine.`);

        if (item.type === 'consumable') this.removeItem(item.id); // removeItem by ID, assumes quantity 1 for consumables if not specified.
        // If consumables could have quantity > 1 and 'use' uses one, then removeItem(item.id, 1)
        // current removeItem removes all or specified quantity from a stack. Let's assume consumable use implies one unit of it.
        // if (item.type === 'consumable') this.removeItem(item.id, 1);
        else this.game.utils.addMessage(`Activated ${item.name}.`);

        this.renderInventory();
        this.game.hud.update();
    }
}

export function pickupItems() {
    // 'this' refers to player object
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
}

export function renderInventory() {
    // 'this' refers to player object
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
        if(item.type === 'consumable' || (item.effect && typeof item.effect === 'function')) { // Check if effect is a function
            content += `<button class="button button-use" style="float:right;" onclick="game.player.useItem(${index})">Use</button>`;
        }
        itemDiv.innerHTML = content;
        invDiv.appendChild(itemDiv);
    });
}
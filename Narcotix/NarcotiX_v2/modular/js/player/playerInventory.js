// js/player/playerInventory.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types

export const inventoryProperties = {
    inventory: { items: [], capacity: 10 },
};

export function initInventory() {
    this.inventory.items = [];
    this.inventory.capacity = inventoryProperties.inventory.capacity;
    
    const firstAid = this.game.itemManager.createItemById('nanite_repair'); // Assuming itemManager exists
    if (firstAid) this.addItem(firstAid);

    // Example: Add a weapon and some ammo to inventory for testing
    // These would normally be found or bought
    const testPistolItem = this.game.itemManager.createWeaponItem('pistol');
    if (testPistolItem) this.addItem(testPistolItem);
    
    const testAmmoItem = this.game.itemManager.createAmmoItem(Weapons.ammoItemIds.bullet_light, 24);
    if (testAmmoItem) this.addItem(testAmmoItem);
}

export function addItem(item) {
    if (this.inventory.items.length >= this.inventory.capacity && (!item.stackable || !this.inventory.items.find(i => i.id === item.id))) {
        this.game.utils.addMessage("Data-Stash at capacity!");
        return false;
    }
    const existing = this.inventory.items.find(i => i.id === item.id && item.stackable);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    } else {
        this.inventory.items.push({...item, quantity: item.quantity || 1});
    }

    this.game.utils.addMessage(`Acquired ${item.name} (x${item.quantity || 1}). Stored.`);
    this.renderInventory();
    this.game.hud.update();
    return true;
}

export function removeItem(itemId, quantity = 1) {
    const idx = this.inventory.items.findIndex(i => i.id === itemId);
    if (idx > -1) {
        const item = this.inventory.items[idx];
        if (item.quantity && item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            this.inventory.items.splice(idx, 1);
        }
        this.renderInventory();
        this.game.hud.update();
        return true;
    }
    return false;
}

export function hasItem(itemId, quantity = 1) {
    const item = this.inventory.items.find(i => i.id === itemId);
    return item && (item.quantity || 0) >= quantity; // Ensure quantity check handles undefined quantity by treating as 0
}

export function useItem(itemIndex) {
    // 'this' refers to player object
    const item = this.inventory.items[itemIndex];
    if (item) {
        if (item.type === 'weapon') {
            this.equipWeaponById(item.weaponId, itemIndex); // Pass itemIndex to remove it from inventory if equipped
        } else if (item.effect) {
            item.effect(this); // Pass player object (this) to the item effect
            if (item.type === 'consumable') {
                this.removeItem(item.id, 1); // Consume one
            } else {
                this.game.utils.addMessage(`Activated ${item.name}.`);
            }
        } else {
            this.game.utils.addMessage(`${item.name} has no direct activation routine.`);
        }
        // renderInventory and hud.update are often called by equipWeapon or removeItem
        // but call them here too just in case of other item types.
        this.renderInventory(); 
        this.game.hud.update();
    }
}

/**
 * Equips a weapon by its ID.
 * @param {string} weaponId - The ID of the weapon to equip (from playerWeapons.js).
 * @param {number} [itemIndexInInventory=-1] - Optional: if equipping from an inventory slot, its index.
 *                                            If provided and weapon is successfully equipped,
 *                                            the item will be removed from general inventory.
 */
export function equipWeaponById(weaponId, itemIndexInInventory = -1) {
    // 'this' refers to player object
    const weaponData = Weapons.getWeaponData(weaponId, this.game.config);
    if (weaponData) {
        // If currently holding a weapon (not unarmed) and it's an item, "unequip" it back to inventory
        if (this.equippedWeapon && this.equippedWeapon.id !== Weapons.UNARMED_STATS.id && this.equippedWeapon.isInventoryItem) {
            const oldWeaponItem = {
                ...this.game.itemManager.createWeaponItem(this.equippedWeapon.id), // Recreate item definition
                // Preserve ammo if it's a ranged weapon
                ...(this.equippedWeapon.type === Weapons.weaponTypes.RANGED && {
                    currentAmmo: this.equippedWeapon.currentAmmo,
                    // Note: This assumes itemManager.createWeaponItem can be extended or the created item can be modified
                })
            };
             if (oldWeaponItem.name === "Unarmed") { /* Do nothing, unarmed is not an item */ }
             else if (!this.addItem(oldWeaponItem)) { // Try to add back to inventory
                this.game.utils.addMessage(`Inventory full. Cannot unequip ${this.equippedWeapon.name}.`);
                // Optional: drop item on ground if inventory is full
                // this.game.itemManager.dropItem(oldWeaponItem, this.x, this.y);
                // For now, prevent equipping new weapon if old one can't be stored
                return false; 
            }
        }
        
        this.equippedWeapon = weaponData;
        this.equippedWeapon.isInventoryItem = (weaponId !== Weapons.UNARMED_STATS.id); // Mark if it's an item from inventory

        // If this weapon was taken from an inventory slot, remove it from there
        if (itemIndexInInventory > -1 && this.equippedWeapon.isInventoryItem) {
            const item = this.inventory.items[itemIndexInInventory];
            // If the equipped weapon is ranged, transfer its current ammo from the item to the equippedWeapon stats
            if (item.type === 'weapon' && item.weaponId === weaponId && weaponData.type === Weapons.weaponTypes.RANGED) {
                 this.equippedWeapon.currentAmmo = item.currentAmmo !== undefined ? item.currentAmmo : weaponData.ammoCapacity;
            }
            this.inventory.items.splice(itemIndexInInventory, 1);
        }


        this.game.utils.addMessage(`Equipped ${this.equippedWeapon.name}.`);
        this.renderInventory(); // Update inventory display
        this.game.hud.update();   // Update HUD (e.g., if it shows current weapon)
        return true;
    } else {
        this.game.utils.addMessage(`Weapon data for ID "${weaponId}" not found.`);
        return false;
    }
}

export function unequipWeapon() {
    // 'this' refers to player object
    if (this.equippedWeapon && this.equippedWeapon.id !== Weapons.UNARMED_STATS.id) {
        const currentEquipped = this.equippedWeapon;
        if (currentEquipped.isInventoryItem) {
             const itemToReturn = {
                ...this.game.itemManager.createWeaponItem(currentEquipped.id),
                ...(currentEquipped.type === Weapons.weaponTypes.RANGED && {
                    currentAmmo: currentEquipped.currentAmmo,
                })
            };
            if (!this.addItem(itemToReturn)) {
                this.game.utils.addMessage(`Inventory full. Cannot unequip ${currentEquipped.name}. Dropping.`);
                this.game.itemManager.dropItem(itemToReturn, this.x, this.y); // Assumes dropItem exists
            } else {
                this.game.utils.addMessage(`Unequipped ${currentEquipped.name}, returned to stash.`);
            }
        }
        this.equipWeaponById(Weapons.UNARMED_STATS.id); // Revert to unarmed
        this.renderInventory();
        this.game.hud.update();
    } else {
        this.game.utils.addMessage("Nothing to unequip or already unarmed.");
    }
}


export function pickupItems() {
    for (let i = this.game.itemManager.onMapItems.length - 1; i >= 0; i--) {
        const itemOnMap = this.game.itemManager.onMapItems[i];
        if (this.game.utils.AABBCollision(this, itemOnMap)) {
            let itemToAdd = null;
    
            if (itemOnMap.type === 'weapon' && itemOnMap.weaponId) {
                itemToAdd = this.game.itemManager.createWeaponItem(itemOnMap.weaponId);
                if (itemToAdd && itemOnMap.currentAmmo !== undefined) { // Ensure itemToAdd was created
                    itemToAdd.currentAmmo = itemOnMap.currentAmmo; // Preserve ammo from map item
                }
            } else if (itemOnMap.type === 'ammo' && itemOnMap.id) {
                itemToAdd = this.game.itemManager.createAmmoItem(itemOnMap.id, itemOnMap.quantity);
            } else if (itemOnMap.id) { // For other items like consumables
                itemToAdd = this.game.itemManager.createItemById(itemOnMap.id, itemOnMap.quantity);
            }
    
            if (itemToAdd && this.addItem(itemToAdd)) { // Ensure itemToAdd is not null
                this.game.itemManager.onMapItems.splice(i, 1); // Or call this.game.itemManager.removeItemFromMap(itemOnMap);
            } else if (itemToAdd) { // Item created but couldn't be added (e.g. inventory full)
                this.game.utils.addMessage(`Cannot acquire ${itemOnMap.name}. Stash full?`);
            } else {
                // This case means itemOnMap was malformed or create function failed
                console.warn("Could not create item from map object:", itemOnMap);
                this.game.itemManager.onMapItems.splice(i, 1); // Remove malformed item from map
            }
        }
    }
}

export function renderInventory() {
    const invDiv = document.getElementById('inventoryItems');
    if (!invDiv) return;
    invDiv.innerHTML = '';

    // Display Equipped Weapon
    if (this.equippedWeapon) {
        const equippedDiv = document.createElement('div');
        equippedDiv.className = 'inventoryItem equippedWeaponDisplay';
        let equippedContent = `<b>Equipped:</b> ${this.equippedWeapon.name}`;
        if (this.equippedWeapon.type === Weapons.weaponTypes.RANGED) {
            equippedContent += ` (${this.equippedWeapon.currentAmmo}/${this.equippedWeapon.ammoCapacity})`;
        }
        if (this.equippedWeapon.id !== Weapons.UNARMED_STATS.id) {
            equippedContent += `<button class="button button-unequip" style="float:right;" onclick="game.player.unequipWeapon()">Unequip</button>`;
        }
        equippedDiv.innerHTML = equippedContent;
        invDiv.appendChild(equippedDiv);
    }


    if (this.inventory.items.length === 0) {
        invDiv.innerHTML += '<p>Stash empty. Go acquire some... assets.</p>';
        return;
    }
    this.inventory.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventoryItem';
        let content = `${item.name} (x${item.quantity || 1})`;
        if (item.type === 'weapon' && item.weaponId && Weapons.weaponsData[item.weaponId].type === Weapons.weaponTypes.RANGED) {
            content += ` [${item.currentAmmo !== undefined ? item.currentAmmo : Weapons.weaponsData[item.weaponId].ammoCapacity}/${Weapons.weaponsData[item.weaponId].ammoCapacity}]`;
        }
        content += ` - <i>${item.description || Weapons.getWeaponData(item.weaponId)?.description || 'No description.'}</i>`;

        if (item.type === 'weapon') {
            content += `<button class="button button-equip" style="float:right;" onclick="game.player.useItem(${index})">Equip</button>`;
        } else if (item.type === 'consumable' || (item.effect && typeof item.effect === 'function')) {
            content += `<button class="button button-use" style="float:right;" onclick="game.player.useItem(${index})">Use</button>`;
        }
        itemDiv.innerHTML = content;
        invDiv.appendChild(itemDiv);
    });
}
// js/player/playerInventory.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types

export const inventoryProperties = {
    inventory: { items: [], capacity: 10 },
};

export function initInventory() {
    this.inventory.items = [];
    this.inventory.capacity = inventoryProperties.inventory.capacity;
    
    const firstAid = this.game.itemManager.createItemById('nanite_repair'); 
    if (firstAid) this.addItem(firstAid);

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
    return item && (item.quantity || 0) >= quantity;
}

export function useItem(itemIndex) {
    // 'this' refers to player object
    const item = this.inventory.items[itemIndex];
    if (item) {
        if (item.type === 'weapon') {
            this.equipWeaponById(item.weaponId, itemIndex); 
        } else if (item.effect) {
            item.effect(this); 
            if (item.type === 'consumable') {
                this.removeItem(item.id, 1); 
            } else {
                this.game.utils.addMessage(`Activated ${item.name}.`);
            }
        } else {
            this.game.utils.addMessage(`${item.name} has no direct activation routine.`);
        }
        this.renderInventory(); 
        this.game.hud.update();
    }
}

export function equipWeaponById(weaponId, itemIndexInInventory = -1) {
    // 'this' refers to player object
    const weaponData = Weapons.getWeaponData(weaponId, this.game.config);
    if (weaponData) {
        if (this.equippedWeapon && this.equippedWeapon.id !== Weapons.UNARMED_STATS.id && this.equippedWeapon.isInventoryItem) {
            const oldWeaponItem = {
                ...this.game.itemManager.createWeaponItem(this.equippedWeapon.id), 
                ...(this.equippedWeapon.type === Weapons.weaponTypes.RANGED && {
                    currentAmmo: this.equippedWeapon.currentAmmo,
                })
            };
             if (oldWeaponItem.name === "Unarmed") { /* Do nothing */ }
             else if (!this.addItem(oldWeaponItem)) { 
                this.game.utils.addMessage(`Inventory full. Cannot unequip ${this.equippedWeapon.name}. Dropping.`);
                // Assuming game.itemManager.dropItem exists and can handle this oldWeaponItem structure
                if (this.game.itemManager && typeof this.game.itemManager.dropItem === 'function') {
                     this.game.itemManager.dropItem(oldWeaponItem, this.x, this.y);
                } else {
                    this.game.utils.addMessage(`Critical: Drop item function missing. ${this.equippedWeapon.name} lost.`);
                }
                // Proceed with equipping new, old one is dropped or lost.
            }
        }
        
        this.equippedWeapon = weaponData;
        this.equippedWeapon.isInventoryItem = (weaponId !== Weapons.UNARMED_STATS.id); 

        if (itemIndexInInventory > -1 && this.equippedWeapon.isInventoryItem) {
            const item = this.inventory.items[itemIndexInInventory];
            if (item.type === 'weapon' && item.weaponId === weaponId && weaponData.type === Weapons.weaponTypes.RANGED) {
                 this.equippedWeapon.currentAmmo = item.currentAmmo !== undefined ? item.currentAmmo : weaponData.ammoCapacity;
            }
            this.inventory.items.splice(itemIndexInInventory, 1);
        }

        this.game.utils.addMessage(`Equipped ${this.equippedWeapon.name}.`);
        this.renderInventory(); 
        this.game.hud.update();   
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
                if (this.game.itemManager && typeof this.game.itemManager.dropItem === 'function') {
                    this.game.itemManager.dropItem(itemToReturn, this.x, this.y);
                } else {
                     this.game.utils.addMessage(`Critical: Drop item function missing. ${currentEquipped.name} lost.`);
                }
            } else {
                this.game.utils.addMessage(`Unequipped ${currentEquipped.name}, returned to stash.`);
            }
        }
        this.equipWeaponById(Weapons.UNARMED_STATS.id); 
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
                if (itemToAdd && itemOnMap.currentAmmo !== undefined) { 
                    itemToAdd.currentAmmo = itemOnMap.currentAmmo; 
                }
            } else if (itemOnMap.type === 'ammo' && itemOnMap.id) {
                itemToAdd = this.game.itemManager.createAmmoItem(itemOnMap.id, itemOnMap.quantity);
            } else if (itemOnMap.id) { 
                itemToAdd = this.game.itemManager.createItemById(itemOnMap.id, itemOnMap.quantity);
            }
    
            if (itemToAdd && this.addItem(itemToAdd)) { 
                this.game.itemManager.onMapItems.splice(i, 1); 
            } else if (itemToAdd) { 
                this.game.utils.addMessage(`Cannot acquire ${itemOnMap.name}. Stash full?`);
            } else {
                console.warn("Could not create item from map object:", itemOnMap);
                this.game.itemManager.onMapItems.splice(i, 1); 
            }
        }
    }
}

export function renderInventory() {
    const invDiv = document.getElementById('inventoryItems');
    if (!invDiv) return;
    invDiv.innerHTML = '';

    let equippedDiv = null; // Declare here

    if (this.equippedWeapon) {
        equippedDiv = document.createElement('div'); // Assign here
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
        const p = document.createElement('p');
        p.textContent = 'Stash empty. Go acquire some... assets.';
        
        // Check if equippedDiv exists AND if it's a child of invDiv before trying to insertAfter.
        // If invDiv has no children (meaning equippedDiv wasn't added or doesn't exist), just append p.
        if (equippedDiv && invDiv.contains(equippedDiv)) {
            equippedDiv.insertAdjacentElement('afterend', p);
        } else {
            invDiv.appendChild(p);
        }
        return;
    }

    this.inventory.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventoryItem';
        let content = `${item.name} (x${item.quantity || 1})`;
        if (item.type === 'weapon' && item.weaponId && Weapons.weaponsData[item.weaponId] && Weapons.weaponsData[item.weaponId].type === Weapons.weaponTypes.RANGED) {
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
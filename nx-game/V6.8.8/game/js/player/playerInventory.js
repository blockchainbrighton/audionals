// js/player/playerInventory.js
import * as Weapons from './playerWeapons.js'; // Import for weapon data and types
import { imageLoader } from '../core/imageLoader.js';
import { UIFactory } from '../ui/UIFactory.js'; // Import UIFactory

export const inventoryProperties = {
    inventory: { items: [], capacity: 10 },
    stash: { items: [], capacity: 50 },
};

export function initInventory() {
    this.inventory.items = [];
    this.inventory.capacity = inventoryProperties.inventory.capacity;
    
    this.stash.items = [];
    this.stash.capacity = inventoryProperties.stash.capacity;
    
    // Starting items now go to STASH for the tutorial
    const firstAid = this.game.itemManager.createItemById('nanite_repair'); 
    if (firstAid) this.stash.items.push(firstAid);

    const testPistolItem = this.game.itemManager.createWeaponItem('pistol');
    if (testPistolItem) this.stash.items.push(testPistolItem);
    
    const testAmmoItem = this.game.itemManager.createAmmoItem(Weapons.ammoItemIds.bullet_light, 24);
    if (testAmmoItem) this.stash.items.push(testAmmoItem);
}

export function addItem(item) {
    if (this.inventory.items.length >= this.inventory.capacity && (!item.stackable || !this.inventory.items.find(i => i.id === item.id))) {
        this.game.utils.addMessage(`[SYS] INVENTORY FULL (10/10). Cannot pick up ${item.name}. Press 'I' to drop items.`);
        return false;
    }
    
    let storedItem = null;
    const existing = this.inventory.items.find(i => i.id === item.id && item.stackable);
    
    if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        storedItem = existing;
    } else {
        storedItem = {...item, quantity: item.quantity || 1};
        this.inventory.items.push(storedItem);
    }

    // Set player's face expression from the first pill picked up
    if (!this.faceExpression && item.nftTraits && item.nftTraits.expression && item.nftTraits.expression !== 'None') {
        this.faceExpression = item.nftTraits.expression;
        this.game.utils.addMessage(`Face Expression adopted: ${this.faceExpression}`);
    }

    this.game.events.emit('ITEM_PICKUP', item);

    this.game.utils.addMessage(`Acquired ${item.name} (x${item.quantity || 1}). Stored.`);
    this.renderInventory();
    this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);

    // Show details for interesting items without pausing (gameplay continues)
    // Now includes NFT items (traits), weapons, gadgets, consumables, and quest items
    // Use storedItem so HUD finds it in inventory and shows action buttons
    if (item.nftTraits || item.type === 'weapon' || item.type === 'gadget' || item.type === 'consumable' || item.type === 'quest_item') {
        this.game.showItemDetails(storedItem);
    }
    
    return true;
}

export function handleItemRemoval(item) {
    // 'this' refers to player object
    if (item.id === 'walkman' && this.hasWalkmanActive) {
        this.hasWalkmanActive = false;
        this.game.utils.addMessage("Walkman Disconnected.");
        this.game.events.emit('WALKMAN_STATE_CHANGED', this.hasWalkmanActive);
    }

    // Note: Equipped weapons are removed from the inventory list upon equipping.
    // Therefore, they cannot be dropped or stashed while equipped.
    // The user must unequip them first (returning them to inventory) to perform those actions.
    // Thus, no explicit 'unequip' logic is needed here for weapons.
}

export function removeItem(itemId, quantity = 1) {
    const idx = this.inventory.items.findIndex(i => i.id === itemId);
    if (idx > -1) {
        const item = this.inventory.items[idx];
        this.handleItemRemoval(item); // Check for side effects like Walkman
        if (item.quantity && item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            this.inventory.items.splice(idx, 1);
        }
        this.renderInventory();
        this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);
        return true;
    }
    return false;
}

export function dropItem(index) {
    // 'this' refers to player object
    const item = this.inventory.items[index];
    if (item) {
        this.handleItemRemoval(item); // Check for side effects like Walkman

        // Drop it on the ground
        if (this.game.itemManager && typeof this.game.itemManager.dropItem === 'function') {
            this.game.itemManager.dropItem(item, this.x, this.y);
        }
        
        // Remove from inventory
        // removeItem uses ID, which removes all quantity usually if not specified, 
        // but let's just splice it out to match the exact slot index used.
        // Or better, use removeItem to ensure consistent logic if it handles equipping logic etc?
        // removeItem(id, quantity) decrements.
        // If we drop the stack, we remove the whole stack.
        // Let's use splice for direct index manipulation which is safer for "this specific item slot"
        
        this.inventory.items.splice(index, 1);
        
        this.game.utils.addMessage(`Dropped ${item.name}.`);
        this.renderInventory();
        this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);
        this.game.hideItemDetails(); // Close the window
    }
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
            } else if (item.type === 'gadget') {
                // Do not remove
            } else {
                this.game.utils.addMessage(`Activated ${item.name}.`);
            }
        } else {
            this.game.utils.addMessage(`${item.name} has no direct activation routine.`);
        }
        this.renderInventory(); 
        this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);
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
        this.game.events.emit('WEAPON_UPDATED', this.equippedWeapon); // Emit weapon update
        this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);   
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
        this.game.events.emit('PLAYER_INVENTORY_UPDATED', this.inventory);
    } else {
        this.game.utils.addMessage("Nothing to unequip or already unarmed.");
    }
}


export function pickupItems() {
    const now = Date.now();
    // Initialize warning timestamp if needed
    if (!this.lastFullInventoryWarning) this.lastFullInventoryWarning = 0;

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
            
            // Pass traits if it's an NFT
            if (itemToAdd && itemOnMap.nftTraits) {
                itemToAdd.nftTraits = itemOnMap.nftTraits;
                itemToAdd.color = itemOnMap.color; // Pass color too
                itemToAdd.imageUrl = itemOnMap.imageUrl;
            }
    
            if (itemToAdd) {
                // --- IMMEDIATE GANG INITIATION ON PICKUP ---
                if (!this.gang && (itemToAdd.id === 'narcotix_pill' || (itemToAdd.nftTraits && itemToAdd.nftTraits.expression))) {
                    if (itemToAdd.nftTraits && itemToAdd.nftTraits.expression) {
                        // NFT Pill: Join specific gang
                        this.joinExpressionGang(itemToAdd.nftTraits.expression, itemToAdd.nftTraits.hex1);
                    } else {
                        // Generic Pill: Join random gang
                        if (this.game.expressionData && this.game.expressionData.length > 0) {
                            const randomGang = this.game.expressionData[Math.floor(Math.random() * this.game.expressionData.length)];
                            this.joinExpressionGang(randomGang.ExpressionSymbol, "#2196F3"); // Default Blue
                        }
                    }
                }
                // -------------------------------------------

                // Check capacity before calling addItem to handle spam prevention logic, 
                // OR just call addItem and let it return false. 
                // But addItem logs the message. We want to suppress that message if it's spamming.
                
                const isFull = this.inventory.items.length >= this.inventory.capacity && (!itemToAdd.stackable || !this.inventory.items.find(i => i.id === itemToAdd.id));
                
                if (isFull) {
                    // Only log if 2 seconds have passed
                    if (now - this.lastFullInventoryWarning > 2000) {
                        this.addItem(itemToAdd); // This triggers the log
                        this.lastFullInventoryWarning = now;
                    }
                    // Else, do nothing (suppress spam)
                } else {
                    if (this.addItem(itemToAdd)) { 
                        if (itemOnMap.markedForDeletion !== undefined) itemOnMap.markedForDeletion = true; // Mark entity for deletion
                        this.game.itemManager.onMapItems.splice(i, 1); 
                    } else {
                        // Other error (shouldn't happen often if capacity check passed)
                        console.warn("Could not create item from map object:", itemOnMap);
                        if (itemOnMap.markedForDeletion !== undefined) itemOnMap.markedForDeletion = true; // Mark entity for deletion
                        this.game.itemManager.onMapItems.splice(i, 1); 
                    }
                }
            }
        }
    }
}

export function renderInventory() {
    const invDiv = document.getElementById('inventoryItems');
    if (!invDiv) return;
    invDiv.innerHTML = '';

    // --- Equipped Weapon Section ---
    if (this.equippedWeapon) {
        // Reuse UIFactory concept or keep distinct? 
        // Equipped card is slightly different layout (no actions except unequip, specific header).
        // Let's keep it manual for now to match exactly or adapt UIFactory.
        // UIFactory is flexible.
        
        const weaponImg = UIFactory.getItemImageUrl({ id: this.equippedWeapon.id, weaponId: this.equippedWeapon.id, type: 'weapon' }, imageLoader);
        
        const actionBtn = this.equippedWeapon.id !== Weapons.UNARMED_STATS.id 
            ? UIFactory.createButtonString('Unequip', 'game.player.unequipWeapon()', 'button-small') 
            : '';

        const card = UIFactory.createItemCardDOM({
            imageUrl: weaponImg,
            name: `EQUIPPED: ${this.equippedWeapon.name}`,
            subtext: this.equippedWeapon.type === Weapons.weaponTypes.RANGED ? `Ammo: ${this.equippedWeapon.currentAmmo}/${this.equippedWeapon.ammoCapacity}` : 'Melee',
            actionButtons: actionBtn,
            borderColor: '#3F3' // Special border for equipped
        });
        // Override class for specific styling if needed, or add style
        card.classList.add('inventory-equipped-card');
        invDiv.appendChild(card);
    }

    // --- Inventory List ---
    if (this.inventory.items.length === 0) {
        const p = document.createElement('div');
        p.className = 'empty-inventory-msg';
        p.textContent = 'Stash empty. Go acquire some... assets.';
        invDiv.appendChild(p);
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'inventory-list';

    this.inventory.items.forEach((item, index) => {
        const imgUrl = UIFactory.getItemImageUrl(item, imageLoader);

        let actionBtns = '';
        if (item.type === 'weapon') {
            actionBtns += UIFactory.createButtonString('Equip', `game.player.useItem(${index})`, 'button-small');
        } else if (item.type === 'consumable' || (item.effect && typeof item.effect === 'function')) {
            actionBtns += UIFactory.createButtonString('Use', `game.player.useItem(${index})`, 'button-small');
        }
        
        actionBtns += UIFactory.createButtonString('Info', `game.player.inspectItem(${index})`, 'button-small');
        actionBtns += UIFactory.createButtonString('Drop', `game.player.dropItem(${index})`, 'button-small button-danger');

        const card = UIFactory.createItemCardDOM({
            imageUrl: imgUrl,
            name: item.name,
            qty: item.quantity || 1,
            desc: item.description,
            actionButtons: actionBtns,
            onClickFunc: () => game.player.inspectItem(index)
        });
        
        listContainer.appendChild(card);
    });

    invDiv.appendChild(listContainer);
}

export function inspectItem(index) {
    const item = this.inventory.items[index];
    if (item) {
        this.game.showItemDetails(item);
        // Also close inventory so user can see the side panel clearly?
        // User asked: "return to default view and then if a pill is clicked in the inventory the same display area can be used."
        // This implies the inventory might stay open OR the user sees the side panel.
        // If the inventory is a modal covering the screen, they can't see the side panel.
        // The inventory IS a modal currently (#inventoryDisplay { position: fixed... }).
        // So we MUST close the inventory to show the side panel context.
        this.game.toggleInventory(); 
    }
}
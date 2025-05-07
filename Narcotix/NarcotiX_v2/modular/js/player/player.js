// js/player/player.js
// This file now acts as an aggregator for player-related modules.

import * as core from './playerCore.js';
import * as inventory from './playerInventory.js';
import * as abilities from './playerAbilities.js';
import * as statusEffects from './playerStatusEffects.js';
import * as combat from './playerCombat.js';

export const player = {
    game: null, // Will be set in init

    // Spread properties from sub-modules
    // Ensures player object has x, y, hp, inventory object, abilities array etc. directly accessible
    ...core.coreProperties,
    ...inventory.inventoryProperties, // This sets player.inventory = { items: [], capacity: 10 }
    ...abilities.abilitiesProperties, // This sets player.abilities = []
    ...statusEffects.statusEffectsProperties, // This sets player.statusEffects = []
    ...combat.combatProperties,


    init: function(gameInstance) {
        // Initialize core properties and link game instance
        core.initCore.call(this, gameInstance); // Sets this.game, dimensions, position, hp, money

        // Initialize other modules. These functions expect 'this' to be the player object.
        combat.initCombat.call(this);       // Sets attack range, power, cooldown
        inventory.initInventory.call(this); // Sets up inventory, adds initial item
        abilities.initAbilities.call(this);   // Sets up abilities, calls its display update
        statusEffects.initStatusEffects.call(this); // Sets up status effects, calls its display update
        
        // Note: Initial HUD updates for money/HP are implicitly handled by core.initCore (or by heal/takeDamage if values change).
        // Ability display and status effect display are handled by their respective init functions.
        // game.hud.update() is called where necessary by sub-modules (e.g., addItem, takeDamage, heal).
    },

    // Assign methods from modules, binding them to 'this' player object implicitly
    render: core.renderCore,
    handleInput: core.handleInputMovement, 
    checkCollision: core.checkCollision,
    payMoney: core.payMoney,
    earnMoney: core.earnMoney,

    addItem: inventory.addItem,
    removeItem: inventory.removeItem,
    hasItem: inventory.hasItem,
    useItem: inventory.useItem,
    pickupItems: inventory.pickupItems,
    renderInventory: inventory.renderInventory,

    useAbility: abilities.useAbility,
    updateAbilityCooldowns: abilities.updateAbilityCooldowns,
    updateAbilityStatusDisplay: abilities.updateAbilityStatusDisplay, // For abilities text list

    applyStatusEffect: statusEffects.applyStatusEffect,
    updateStatusEffects: statusEffects.updateStatusEffects,
    hasStatusEffect: statusEffects.hasStatusEffect,
    isStealthed: statusEffects.isStealthed,
    isConfused: statusEffects.isConfused,
    updatePlayerStatusDisplay: statusEffects.updatePlayerStatusDisplay, // For status effects text list

    attack: combat.attack,
    takeDamage: combat.takeDamage,
    heal: combat.heal,
};
// js/player/player.js
// This file now acts as an aggregator for player-related modules.

import * as core from './playerCore.js';
import * as inventory from './playerInventory.js';
import * as abilities from './playerAbilities.js';
import * as statusEffects from './playerStatusEffects.js';
import *as combat from './playerCombat.js';
import * as characterDesign from './playerCharacterDesign.js'; // New
import * as weapons from './playerWeapons.js'; // New (for constants if needed, actual data in playerWeapons.js)

export const player = {
    game: null, // Will be set in init

    // Spread properties from sub-modules
    ...core.coreProperties,
    ...inventory.inventoryProperties,
    ...abilities.abilitiesProperties,
    ...statusEffects.statusEffectsProperties,
    ...combat.combatProperties,
    ...characterDesign.characterDesignProperties, // New

    equippedWeapon: null, // To store the currently equipped weapon object

    init: function(gameInstance) {
        core.initCore.call(this, gameInstance); // Sets this.game, dimensions, position, hp, money
        
        // Initialize equippedWeapon with unarmed stats
        this.equipWeaponById(weapons.UNARMED_STATS.id); // Equip unarmed by default

        combat.initCombat.call(this);       // Sets attack range (now from weapon), power, cooldown
        inventory.initInventory.call(this); // Sets up inventory, adds initial item
        abilities.initAbilities.call(this);   // Sets up abilities
        statusEffects.initStatusEffects.call(this); // Sets up status effects
        characterDesign.initCharacterDesign.call(this); // New: init limb/animation properties

        // Initial HUD updates are handled by sub-modules or their init functions.
    },

    // Core Methods
    render: core.renderCore,
    handleInput: core.handleInputMovement, 
    checkCollision: core.checkCollision,
    payMoney: core.payMoney,
    earnMoney: core.earnMoney,

    // Inventory Methods
    addItem: inventory.addItem,
    removeItem: inventory.removeItem,
    hasItem: inventory.hasItem,
    useItem: inventory.useItem, // Will be modified to handle equipping weapons
    pickupItems: inventory.pickupItems,
    renderInventory: inventory.renderInventory,
    equipWeaponById: inventory.equipWeaponById, // New dedicated method
    unequipWeapon: inventory.unequipWeapon,     // New dedicated method

    // Abilities Methods
    useAbility: abilities.useAbility,
    updateAbilityCooldowns: abilities.updateAbilityCooldowns,
    updateAbilityStatusDisplay: abilities.updateAbilityStatusDisplay,

    // Status Effects Methods
    applyStatusEffect: statusEffects.applyStatusEffect,
    updateStatusEffects: statusEffects.updateStatusEffects,
    hasStatusEffect: statusEffects.hasStatusEffect,
    isStealthed: statusEffects.isStealthed,
    isConfused: statusEffects.isConfused,
    updatePlayerStatusDisplay: statusEffects.updatePlayerStatusDisplay,

    // Combat Methods
    attack: combat.attack,
    takeDamage: combat.takeDamage,
    heal: combat.heal,
    reload: combat.reloadEquippedWeapon, // New

    // Character Design & Animation Methods (New)
    updateAnimation: characterDesign.updateCharacterAnimation,
    renderDetails: characterDesign.renderCharacterDetails, // For limbs and weapon
    startAttackAnim: characterDesign.startAttackAnimation, // To trigger visual attack
};
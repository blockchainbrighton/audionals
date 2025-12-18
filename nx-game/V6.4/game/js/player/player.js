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
    gang: null, // Store current Expression Gang

    init: function(gameInstance) {
        core.initCore.call(this, gameInstance); // Sets this.game, dimensions, position, hp, money
        
        // Initialize equippedWeapon with unarmed stats
        this.equipWeaponById(weapons.UNARMED_STATS.id); // Equip unarmed by default
        
        this.gang = null; // Reset gang on init

        combat.initCombat.call(this);       // Sets attack range (now from weapon), power, cooldown
        inventory.initInventory.call(this); // Sets up inventory, adds initial item
        abilities.initAbilities.call(this);   // Sets up abilities
        statusEffects.initStatusEffects.call(this); // Sets up status effects
        characterDesign.initCharacterDesign.call(this); // New: init limb/animation properties

        // Initial HUD updates are handled by sub-modules or their init functions.
    },

    // --- Gang Logic ---
    joinExpressionGang: function(expressionSymbol, primaryColor) {
        if (this.gang) return; // Already in a gang

        const gangData = this.game.expressionData ? this.game.expressionData.find(r => r.ExpressionSymbol === expressionSymbol) : null;
        if (gangData) {
            this.gang = gangData;
            this.game.utils.addMessage(`You have been initiated into: ${gangData.GangName}!`);
            this.game.utils.addMessage(`"${gangData.Description}"`);
            
            // Visual Updates
            this.faceExpression = expressionSymbol;
            if (primaryColor) {
                this.color = primaryColor;
                this.bodyColor = primaryColor; // Update character design prop
            }
            
            // Parse Modifiers (CSVs are strings)
            this.gang.HpMod = parseFloat(gangData.HpMod) || 1.0;
            this.gang.SpeedMod = parseFloat(gangData.SpeedMod) || 1.0;
            this.gang.DamageMod = parseFloat(gangData.DamageMod) || 1.0;
            this.gang.DefenseMod = parseFloat(gangData.DefenseMod) || 1.0;
            this.gang.PriceMod = parseFloat(gangData.PriceMod) || 1.0;
            this.gang.LuckMod = parseFloat(gangData.LuckMod) || 0.0;
            
            // Extended Attributes
            this.gang.AggressionBias = parseFloat(gangData.AggressionBias) || 0.5;
            this.gang.Archetype = gangData.Archetype || 'Unknown';
            this.gang.SynergyTags = gangData.SynergyTags ? gangData.SynergyTags.split('|') : [];
            this.gang.OnKillEffect = gangData.OnKillEffect || 'None';
            this.gang.SoundProfile = gangData.SoundProfile || 'Default';

            // Apply Stats Immediately
            // 1. HP Scaling
            const oldMax = this.maxHp;
            this.maxHp = Math.floor(core.coreProperties.maxHp * this.gang.HpMod);
            this.hp = Math.floor(this.hp * (this.maxHp / oldMax)); // Maintain % health

            // 2. Speed Scaling
            // Base speed comes from coreProperties (150). Apply mod.
            // Note: Status effects apply multipliers on top of 'this.speed', so updating base 'this.speed' works.
            this.speed = Math.floor(core.coreProperties.baseSpeed * this.gang.SpeedMod);
            
            this.updatePlayerStatusDisplay();
            
            // 3. Update HUD
            this.game.events.emit('PLAYER_GANG_UPDATED', this.gang);
        } else {
            console.warn(`Gang data not found for expression: ${expressionSymbol}`);
        }
    },

    // Core Methods
    update: function(dt) { /* Player update logic is mostly handled by handleInput and separate managers, this stub prevents game loop errors */ },
    render: core.renderCore,
    handleInput: core.handleInputMovement, 
    checkCollision: core.checkCollision,
    findNearestSafeSpot: core.findNearestSafeSpot,
    ensureSafePosition: core.ensureSafePosition,
    payMoney: core.payMoney,
    earnMoney: core.earnMoney,

    // Inventory Methods
    addItem: inventory.addItem,
    removeItem: inventory.removeItem,
    handleItemRemoval: inventory.handleItemRemoval, // Handle side effects of removal
    hasItem: inventory.hasItem,
    useItem: inventory.useItem, // Will be modified to handle equipping weapons
    dropItem: inventory.dropItem, // Enable dropping items
    inspectItem: inventory.inspectItem, // Inspect functionality
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
    updateReload: combat.updateReload, // New Active Reload Update
    attemptActiveReload: combat.attemptActiveReload,
    completeReload: combat.completeReload,
    applyOnKillEffect: combat.applyOnKillEffect, // New

    // Character Design & Animation Methods (New)
    updateAnimation: characterDesign.updateCharacterAnimation,
    renderDetails: characterDesign.renderCharacterDetails, // For limbs and weapon
    startAttackAnim: characterDesign.startAttackAnimation, // To trigger visual attack
};
import * as PWeapons from '../player/playerWeapons.js';

export const itemDefinitions = {
    // Consumables & Quest Items
    'narcotix_pill': { 
        id: 'narcotix_pill', 
        name: "Data Packet (Generic)", 
        description: "A raw data fragment for the Betav3rse. Execute for unpredictable runtime effects.", 
        type: 'consumable', 
        buyPrice: 20, 
        sellPrice: 15, 
        stackable: true, 
        nftTraits: { hex1: "#E0E0E0", hex2: "#2196F3" }, // White/Blue for map consistency
        effect: (player) => { 
            const game = player.game;
            const r = Math.random(); 
            game.utils.addMessage("Executing Packet..."); 
            
            // Gang Initiation for Generic Pills (Random)
            if (!player.gang && game.expressionData && game.expressionData.length > 0) {
                const randomGang = game.expressionData[Math.floor(Math.random() * game.expressionData.length)];
                // Use generic pill color for initialization visual
                player.joinExpressionGang(randomGang.ExpressionSymbol, "#2196F3");
            }

            if (r < 0.3) { player.applyStatusEffect("System Glitch", 10000); game.utils.addMessage("...Input Desync Detected!"); } 
            else if (r < 0.6) {player.heal(10); game.utils.addMessage("...Optimization Complete: +10 Integrity.");} 
            else {player.takeDamage(5); game.utils.addMessage("...Runtime Error: -5 Integrity!");} 
        }
    },
    'nanite_repair': { 
        id: 'nanite_repair', 
        name: "Integrity Patch", 
        description: "Restores 50 Integrity. Self-compiling.", 
        type: 'consumable', 
        buyPrice: 100, 
        sellPrice: 40, 
        stackable: true, 
        effect: (player) => player.heal(50) 
    },
    'adrena_rush_injector': { 
        id: 'adrena_rush_injector', 
        name: "Overclock Script", 
        description: "Temporary +50% clock speed. Causes heat.", 
        type: 'consumable', 
        buyPrice: 75, 
        sellPrice: 30, 
        stackable: true, 
        effect: (player) => player.applyStatusEffect("C-Burst", 10000, { speedMultiplier: 1.5 }) 
    },
    'kaos_elixir': { 
        id: 'kaos_elixir', 
        name: "Entropy Virus", 
        description: "Pure, distilled chaos. +30% Speed. TRIGGERS FIREWALLS.", 
        type: 'consumable', 
        buyPrice: 150, 
        sellPrice: 60, 
        stackable: false, 
        effect: (player) => { player.applyStatusEffect("Kaos Frenzy", 15000, { speedMultiplier: 1.3 }); }
    },
    'xdata_fragment': { 
        id: 'xdata_fragment', 
        name: "Corrupted XData Fragment", 
        description: "Highly sensitive, likely illicit. Needed by a Compiler.", 
        type: 'quest_item', 
        buyPrice: 0, 
        sellPrice: 0, 
        stackable: false 
    },
    'walkman': { 
        id: 'walkman', 
        name: "Audio Daemon", 
        description: "Background process for audio modulation. Filters system noise.", 
        type: 'gadget', 
        buyPrice: 500, 
        sellPrice: 200, 
        stackable: false, 
        char: '♫',
        imageUrl: "artwork/walkman.svg",
        nftTraits: {
            hex1: "#00FFFF", // Cyan
            hex2: "#FF00FF", // Magenta
            effect: "Dynamic Audio Environment",
            sideEffect: "Zone-Based Mood Modulation"
        },
        effect: (player) => {
            player.hasWalkmanActive = !player.hasWalkmanActive;
            const state = player.hasWalkmanActive ? "RUNNING" : "TERMINATED";
            player.game.utils.addMessage(`Audio Daemon: ${state}`);
            
            const controls = document.getElementById('walkmanControls');
            if (player.hasWalkmanActive) {
                player.game.showItemDetails(player.game.itemManager.itemDefinitions['walkman']);
                player.game.utils.addMessage("Audio Daemon generating soundscape based on environment.");
                if(controls) controls.style.display = 'block';
            } else {
                if(controls) controls.style.display = 'none';
            }
            if (player.game.soundManager) player.game.soundManager.updateMusicState();
        }
    },

    // Ammo Definitions
    [PWeapons.ammoItemIds.bullet_light]: { // e.g., 'ammo_light_rounds'
        id: PWeapons.ammoItemIds.bullet_light,
        name: "Standard Bit Stream",
        description: "Standard data packets for light emitters.",
        type: 'ammo',
        stackable: true,
        buyPrice: 50, // For a stack, or per bullet? Let's say for a clip/pack.
        sellPrice: 20,
        char: '∙', // Character for ammo on map
    },
    'ammo_energy_cell': {
        id: 'ammo_energy_cell',
        name: "High-Voltage Cells",
        description: "Power cells for Arc weaponry.",
        type: 'ammo',
        stackable: true,
        buyPrice: 80,
        sellPrice: 30,
        char: '⚡',
        imageUrl: "artwork/ammo_light_rounds.svg" // Placeholder
    },
    'ammo_glitch_charge': {
        id: 'ammo_glitch_charge',
        name: "Glitch Charge",
        description: "Unstable data packet for Glitch weaponry.",
        type: 'ammo',
        stackable: true,
        buyPrice: 150,
        sellPrice: 50,
        char: '☢',
        imageUrl: "artwork/ammo_light_rounds.svg" // Placeholder
    }
};

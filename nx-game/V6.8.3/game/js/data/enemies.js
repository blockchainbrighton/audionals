export const enemyDefinitions = {
    'enforcer': { 
        name: "System Enforcer", 
        char: 'E', 
        color: '#F66', 
        hp: 30, 
        speed: 80, 
        damage: 5, 
        damageType: 'kinetic', 
        detectionRange: 160, // TILE_SIZE * 5 (assuming 32) -> 160. Will resolve logic in Enemy.js
        attackRange: 28.8,   // TILE_SIZE * 0.9 -> 28.8
        ai: 'basic_melee', 
        loot: function() { 
            const r = Math.random(); 
            if (r < 0.5) return { money: Math.floor(r * 20) + 5 }; 
            if (r < 0.7) return { item: this.game.itemManager.createItemById('narcotix_pill') }; 
            return null;
        }
    },
    'warden': { 
        name: "Zone Warden", 
        char: 'W', 
        color: '#C00', 
        hp: 100, 
        speed: 60, 
        damage: 15, 
        damageType: 'kinetic', 
        detectionRange: 224, // TILE_SIZE * 7
        attackRange: 32,     // TILE_SIZE * 1
        ai: 'guard_area', 
        isBoss: true,
        loot: function() { 
            return { 
                money: Math.floor(Math.random() * 50) + 25, 
                item: (Math.random() < 0.5 ? this.game.itemManager.createItemById('nanite_repair') : this.game.itemManager.createItemById('adrena_rush_injector')) 
            }; 
        }
    },
    'drone': { 
        name: "Meta-Patrol Unit", 
        char: 'd', 
        color: '#88F', 
        hp: 20, 
        speed: 120, 
        damage: 0, 
        damageType: 'bio', 
        detectionRange: 256, // TILE_SIZE * 8
        attackRange: 48,     // TILE_SIZE * 1.5
        ai: 'tagger', 
        attackEffect: function(player) { 
            player.applyStatusEffect("Sys-Marked", 30000); 
            this.game.utils.addMessage("Meta-Patrol Unit tagged your signature!"); 
        }, 
        loot: function() { 
            return (Math.random() < 0.2 ? { money: Math.floor(Math.random() * 5) + 1 } : null); 
        }
    },
    'drone_scout': { 
        name: "Security Drone", 
        char: 's', 
        color: '#F99', 
        hp: 15, 
        speed: 100, 
        damage: 3, 
        damageType: 'kinetic', 
        detectionRange: 160, 
        attackRange: 120, 
        ai: 'basic_melee', // Will move to attack range and "zap"
        loot: function() { 
            return { money: 10, item: "pistol_ammo_light" }; 
        }
    }
};

// js/player/playerAbilities.js

export const abilitiesProperties = {
    abilities: [],
};

export function initAbilities() {
    // 'this' refers to player object
    this.abilities = [
        { name: "Clock Cycle Burst", key: '1', cooldown: 30000, duration: 5000, lastUsedTime: 0, effect: () => { this.applyStatusEffect("C-Burst", 5000, { speedMultiplier: 2 }); this.game.utils.addMessage("Clock Cycle Burst Activated!"); }},
        { name: "Ghost Packet", key: '2', cooldown: 60000, duration: 10000, lastUsedTime: 0, effect: () => { this.applyStatusEffect("Ghosting", 10000); this.game.utils.addMessage("Ghost Packet Engaged. Hostiles may lose track."); }},
        { name: "Emergency Nano-Flush", key: '3', cooldown: 90000, duration: 0, lastUsedTime: 0, effect: () => { this.heal(25); this.game.utils.addMessage("Nano-Flush Initiated! +25 Vitality"); }}
    ];
    this.abilities.forEach(ab => ab.lastUsedTime = -ab.cooldown); // Make available at start
    this.updateAbilityStatusDisplay();
}

export function useAbility(key) {
    // 'this' refers to player object
    const ability = this.abilities.find(a => a.key === key);
    if (!ability) return;
    const now = Date.now();
    if (now - ability.lastUsedTime >= ability.cooldown) {
        ability.effect.call(this); // Ensure 'this' in ability effect refers to player
        ability.lastUsedTime = now;
        this.updateAbilityStatusDisplay();
    } else {
        this.game.utils.addMessage(`${ability.name} subroutine recharging: ${Math.ceil((ability.cooldown - (now - ability.lastUsedTime)) / 1000)}s`);
    }
}

export function updateAbilityCooldowns() {
    // 'this' refers to player object
    this.updateAbilityStatusDisplay();
}

export function updateAbilityStatusDisplay() {
    // 'this' refers to player object
    const div = document.getElementById('abilityStatus');
    if (!div) return;
    if (!this.abilities) return; // Guard against call before init
    div.innerHTML = 'Subroutines: ' + this.abilities.map(ab => {
        const cdLeft = Math.max(0, ab.cooldown - (Date.now() - ab.lastUsedTime));
        return `${ab.name} (${ab.key}) ${cdLeft > 0 ? `(RCHG ${Math.ceil(cdLeft/1000)}s)`: '(RDY)'}`;
    }).join(' | ');
}
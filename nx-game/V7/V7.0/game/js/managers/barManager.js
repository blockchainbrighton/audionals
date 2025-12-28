export const barManager = {
    game: null,

    init: function(gameInstance) {
        this.game = gameInstance;
    },

    renderUI: function(container, actions) {
        container.innerHTML = `
            <p>The air smells of ozone and synthetic gin. A drone bartender polishes a glass.</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button class="button" onclick="game.barManager.buyDrink('synth_ale', 10)">Buy Synth-Ale (10c) - Heal 10</button>
                <button class="button" onclick="game.barManager.buyDrink('neon_shot', 25)">Buy Neon Shot (25c) - Speed Boost</button>
                <button class="button" onclick="game.barManager.buyDrink('data_tonic', 50)">Buy Data Tonic (50c) - Restore Energy</button>
            </div>
        `;
        actions.innerHTML = `<button class="button" onclick="game.exitLocation()">Leave Bar</button>`;
    },

    buyDrink: function(type, cost) {
        if(this.game.player.payMoney(cost)) {
            if(type === 'synth_ale') { 
                this.game.player.heal(10); 
                this.game.utils.addMessage("Refreshing."); 
            }
            if(type === 'neon_shot') { 
                this.game.player.applyStatusEffect("Speed Boost", 10000, {speedMultiplier:1.2}); 
                this.game.utils.addMessage("Systems accelerating!"); 
            }
            if(type === 'data_tonic') { 
                this.game.player.energy = Math.min(this.game.player.maxEnergy, this.game.player.energy + 20); 
                this.game.utils.addMessage("Energy restored."); 
            }
        } else {
            this.game.utils.addMessage("Insufficient Cycles.");
        }
    }
};

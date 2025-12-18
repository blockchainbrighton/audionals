export const stashManager = {
    game: null,
    contents: [],
    capacity: 50,

    init(gameInstance) {
        this.game = gameInstance;
        this.contents = [];
        this.render();
    },

    open() {
        const panel = document.getElementById('stashInterface');
        if (!panel) return;
        this.render();
        panel.style.display = 'block';
        this.gameStateBefore = this.game.gameState;
        this.game.gameState = 'STASH_OPEN';
    },

    close() {
        const panel = document.getElementById('stashInterface');
        if (panel) panel.style.display = 'none';
        if (this.game.gameState === 'STASH_OPEN') {
            this.game.gameState = 'PLAYING';
        }
    },

    depositFromInventory(index) {
        if (this.contents.length >= this.capacity) {
            this.game.utils.addMessage("XLounge stash is full (50 items).");
            return;
        }
        const playerInv = this.game.player.inventory.items;
        if (!playerInv[index]) return;
        const [removed] = playerInv.splice(index, 1);
        if (!removed) return;
        const storedCopy = JSON.parse(JSON.stringify(removed));
        this.contents.push(storedCopy);
        this.game.utils.addMessage(`${removed.name} moved to XLounge stash.`);
        this.game.player.renderInventory();
        this.game.hud.update();
        this.render();
    },

    withdrawToInventory(index) {
        const item = this.contents[index];
        if (!item) return;
        const clone = JSON.parse(JSON.stringify(item));
        if (this.game.player.addItem(clone)) {
            this.contents.splice(index, 1);
            this.game.utils.addMessage(`${item.name} retrieved from stash.`);
            this.render();
        } else {
            this.game.utils.addMessage("Stash retrieval failed: inventory full.");
        }
    },

    render() {
        const playerList = document.getElementById('stashPlayerItems');
        const stashList = document.getElementById('stashStoredItems');
        if (playerList) {
            playerList.innerHTML = '';
            if (this.game.player.inventory.items.length === 0) {
                playerList.innerHTML = '<p>No items to deposit.</p>';
            } else {
                this.game.player.inventory.items.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'inventoryItem';
                    div.innerHTML = `
                        ${item.name} (x${item.quantity || 1})
                        <button class="button button-sell" style="float:right;" onclick="game.stashManager.depositFromInventory(${index})">Store</button>
                    `;
                    playerList.appendChild(div);
                });
            }
        }
        if (stashList) {
            stashList.innerHTML = '';
            if (this.contents.length === 0) {
                stashList.innerHTML = '<p>Stash empty.</p>';
            } else {
                this.contents.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'inventoryItem';
                    div.innerHTML = `
                        ${item.name} (x${item.quantity || 1})
                        <button class="button button-use" style="float:right;" onclick="game.stashManager.withdrawToInventory(${index})">Withdraw</button>
                    `;
                    stashList.appendChild(div);
                });
            }
        }
        const countSpan = document.getElementById('stashCount');
        if (countSpan) countSpan.textContent = `${this.contents.length}/${this.capacity}`;
    }
};

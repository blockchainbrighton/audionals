import { game } from './game.js';
import * as config from './config.js'; // For initial canvas setup

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = config.VIEWPORT_WIDTH_TILES * config.TILE_SIZE;
canvas.height = config.VIEWPORT_HEIGHT_TILES * config.TILE_SIZE;

let lastTime = 0;
let fps = 0;
let frameCount = 0;
const fpsUpdateInterval = 1000; // ms
let lastFpsUpdateTime = 0;

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    game.keysPressed[key] = true;

    if (key === 'escape') {
        const shopInterfaceEl = document.getElementById('shopInterface');
        const inventoryDisplayEl = document.getElementById('inventoryDisplay');
        const questLogEl = document.getElementById('questLog');

        if (shopInterfaceEl && shopInterfaceEl.style.display === 'block') game.closeShop();
        else if (inventoryDisplayEl && inventoryDisplayEl.style.display === 'block') game.toggleInventory();
        else if (questLogEl && questLogEl.style.display === 'block') game.toggleQuestLog();
        else if (game.gameState === 'PLAYING') { 
            game.utils.addMessage("Pause sequence (ESC)... Resuming operations."); // Basic pause concept
        }
        return; 
    }

    if (game.gameState === 'GAME_OVER' && key === 'r') { game.restartGame(); return;}
    if (game.gameState === 'SHOP_MENU') return; 

    if (key >= '1' && key <= '3') game.player.useAbility(key);
    if (key === 'i') game.toggleInventory();
    if (key === 'j') game.toggleQuestLog();
    
    if (game.gameState === 'PLAYING' || game.gameState === 'INVENTORY_OPEN' || game.gameState === 'QUESTLOG_OPEN') {
        if (key === 'e') game.interact();
        if (key === ' ') { e.preventDefault(); game.player.attack(); }
    }
});

window.addEventListener('keyup', (e) => { 
    game.keysPressed[e.key.toLowerCase()] = false; 
});

// --- Game Loop ---
function gameLoop(currentTime) {
    const deltaTime = Math.min(0.1, (currentTime - lastTime) / 1000); // Cap deltaTime
    lastTime = currentTime;

    frameCount++;
    if (currentTime - lastFpsUpdateTime > fpsUpdateInterval) {
        fps = Math.round(frameCount / ((currentTime - lastFpsUpdateTime)/1000));
        frameCount = 0; 
        lastFpsUpdateTime = currentTime;
        const fpsDisplayEl = document.getElementById('fpsDisplay');
        if (fpsDisplayEl) fpsDisplayEl.textContent = fps;
    }
   
    game.update(deltaTime);
    game.render();
    requestAnimationFrame(gameLoop);
}

// --- Initialization ---
window.onload = () => {
    game.init(canvas, ctx);
    window.game = game; // Expose game to global scope for HTML onclicks

    lastTime = performance.now(); 
    lastFpsUpdateTime = lastTime;
    requestAnimationFrame(gameLoop);
};
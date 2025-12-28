import { game } from './game.js';
import * as config from './config.js'; // For initial canvas setup
import { parseCSV } from './utils.js';

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
// Moved to InputManager and game.js setupInput()

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
window.onload = async () => {
    // 0. Set Version Display
    const verEl = document.getElementById('gameVersion');
    if (verEl) verEl.textContent = `${config.GAME_VERSION}`;

    // 1. Load NFT Metadata
    try {
        const response = await fetch('narcotix-collection-metadata.csv');
        if (response.ok) {
            const text = await response.text();
            game.collectionData = parseCSV(text);
            console.log(`[SYS] Loaded ${game.collectionData.length} NFT records.`);
        } else {
            console.error("[SYS] Failed to load NFT metadata:", response.status);
            game.collectionData = [];
        }
    } catch (e) {
        console.error("[SYS] Error loading NFT metadata:", e);
        game.collectionData = [];
    }

    // 2. Load Pill Taxonomy (Optional/Independent)
    try {
        const response = await fetch('pill_effects_taxonomy.csv');
        if (response.ok) {
            const text = await response.text();
            game.pillTaxonomy = parseCSV(text);
            console.log(`[SYS] Loaded ${game.pillTaxonomy.length} Pill Taxonomy records.`);
        } else {
            console.warn("[SYS] Failed to load Pill Taxonomy (using defaults):", response.status);
            game.pillTaxonomy = [];
        }
    } catch (e) {
        console.warn("[SYS] Error loading Pill Taxonomy:", e);
        game.pillTaxonomy = [];
    }

    // 3. Load Extended Expression Data
    try {
        const response = await fetch('extended_expressions.csv');
        if (response.ok) {
            const text = await response.text();
            game.expressionData = parseCSV(text);
            console.log(`[SYS] Loaded ${game.expressionData.length} Expression Gang records.`);
        } else {
            console.warn("[SYS] Failed to load Expression Data:", response.status);
            game.expressionData = [];
        }
    } catch (e) {
        console.warn("[SYS] Error loading Expression Data:", e);
        game.expressionData = [];
    }

    game.init(canvas, ctx);
    window.game = game; // Expose game to global scope for HTML onclicks

    lastTime = performance.now(); 
    lastFpsUpdateTime = lastTime;
    requestAnimationFrame(gameLoop);
};
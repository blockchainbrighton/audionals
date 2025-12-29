export const TILE_SIZE = 32;
export const MAP_WIDTH_TILES = 250;
export const MAP_HEIGHT_TILES = 250;
export const VIEWPORT_WIDTH_TILES = 25;
export const VIEWPORT_HEIGHT_TILES = 17;

export const TICKS_PER_GAME_MINUTE = 1; 
export const GAME_MINUTES_PER_DAY = 24 * 60;

export const MAX_MESSAGES = 10;
export const TUTORIAL_DISPLAY_TIME = 5000; // Default

// Game Version - UPDATE THIS ON EVERY NEW VERSION DEPLOYMENT
export const GAME_VERSION = "V6.8.0";

// Camera Config
export const CAMERA_ZOOM_DEFAULT = 1.0;
export const CAMERA_ZOOM_MIN = 0.5;
export const CAMERA_ZOOM_MAX = 2.0;
export const CAMERA_ZOOM_SPEED = 0.1;

// Interaction Config
export const INTERACTION_COOLDOWN_MS = 2000;
export const LOCATION_TRANSITION_DELAY_MS = 800;

// UI Colors
export const COLORS = {
    PLAYER: '#3F3',
    ENEMY: '#F33',
    ITEM_NFT: '#FFD700',
    ITEM_GENERIC: '#0FF',
    ITEM_WEAPON: '#CCC',
    ITEM_AMMO: '#FAD02C',
    UI_OVERLAY: 'rgba(0,0,0,0.85)',
    UI_TEXT_ERROR: 'red',
    UI_TEXT_PROMPT: '#0FF'
};
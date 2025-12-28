// js/InputManager.js
export const InputManager = {
    game: null,
    keys: {},        // Current state of all keys
    prevKeys: {},    // Previous frame state (for justPressed)
    mouse: { x: 0, y: 0, screenX: 0, screenY: 0, leftDown: false },
    
    // Action Mappings
    bindings: {
        'MOVE_UP': ['w', 'arrowup'],
        'MOVE_DOWN': ['s', 'arrowdown'],
        'MOVE_LEFT': ['a', 'arrowleft'],
        'MOVE_RIGHT': ['d', 'arrowright'],
        'INTERACT': ['e'],
        'RELOAD': ['r'],
        'ATTACK': [' '], // Spacebar
        'ABILITY_1': ['1'],
        'ABILITY_2': ['2'],
        'ABILITY_3': ['3'],
        'TOGGLE_INVENTORY': ['i'],
        'TOGGLE_QUESTS': ['j'],
        'CLOSE_UI': ['escape'],
        'RESTART': ['r'], // Context dependent
        
        // UI / Admin
        'UI_EQUIP': ['e'],
        'UI_USE': ['u'],
        'UI_DROP': ['d'],
        'UI_CLOSE': ['c'],
        'ADMIN_POIS': ['a'],
        'ADMIN_SPEED': ['s']
    },

    init: function(gameInstance) {
        this.game = gameInstance;
        this.setupListeners();
    },

    setupListeners: function() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k]) return; // Ignore repeats for triggers
            
            this.keys[k] = true;
            
            // Prevent default scrolling for Space/Arrows
            if([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
                // e.preventDefault(); // Optional, might block page scrolling
            }
            
            this.game.events.emit('INPUT_KEYDOWN', k); // Emit raw for specific listeners if needed

            // Check bindings and emit Action
            for (const [action, keys] of Object.entries(this.bindings)) {
                if (keys.includes(k)) {
                    this.game.events.emit('ACTION_TRIGGERED', action);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            this.keys[k] = false;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.leftDown = true;
                // Only attack if clicking canvas
                if (e.target.id === 'gameCanvas') {
                    this.game.events.emit('INPUT_MOUSEDOWN', { x: this.mouse.x, y: this.mouse.y });
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.game.canvas) return;
            const rect = this.game.canvas.getBoundingClientRect();
            const scaleX = this.game.canvas.width / rect.width;
            const scaleY = this.game.canvas.height / rect.height;

            this.mouse.screenX = (e.clientX - rect.left) * scaleX;
            this.mouse.screenY = (e.clientY - rect.top) * scaleY;
            
            // Update World Pos
            if (this.game.camera) {
                this.mouse.x = (this.mouse.screenX / this.game.camera.zoom) + this.game.camera.x;
                this.mouse.y = (this.mouse.screenY / this.game.camera.zoom) + this.game.camera.y;
            }
        });
        
        window.addEventListener('wheel', (e) => {
            this.game.events.emit('INPUT_WHEEL', Math.sign(e.deltaY));
        });
    },

    update: function() {
        // Called every frame to update prevKeys if we implemented justPressed logic frame-based
        // For now, simple state is enough.
        // Update mouse world pos if camera moved
        if (this.game.camera && this.mouse.screenX !== undefined) {
             this.mouse.x = (this.mouse.screenX / this.game.camera.zoom) + this.game.camera.x;
             this.mouse.y = (this.mouse.screenY / this.game.camera.zoom) + this.game.camera.y;
        }
        
        // Sync game.mouse for backwards compatibility
        if (this.game.mouse) {
            this.game.mouse.x = this.mouse.x;
            this.game.mouse.y = this.mouse.y;
            this.game.mouse.screenX = this.mouse.screenX;
            this.game.mouse.screenY = this.mouse.screenY;
        }
    },

    isActive: function(action) {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some(k => this.keys[k]);
    },
    
    // For checking raw keys if needed (e.g. 1-9 for admin speed)
    isKeyActive: function(key) {
        return !!this.keys[key.toLowerCase()];
    }
};

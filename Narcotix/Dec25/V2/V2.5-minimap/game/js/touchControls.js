// --- START OF FILE js/touchControls.js ---
export const touchControls = {
    game: null,
    joystick: {
        active: false,
        baseX: 0, baseY: 0, // Center of the joystick base
        stickX: 0, stickY: 0, // Center of the movable stick
        radiusBase: 60,     // Radius of the joystick base
        radiusStick: 30,    // Radius of the stick
        maxDisplacement: 40, // How far the stick can move from base center
        touchId: null,      // To track the specific touch for the joystick
        inputDx: 0,         // Normalized direction x (-1 to 1)
        inputDy: 0          // Normalized direction y (-1 to 1)
    },
    isTouchDevice: false,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        if (!this.isTouchDevice) {
            const overlay = document.getElementById('touchControlsOverlay');
            if (overlay) overlay.style.display = 'none'; // Hide HTML buttons if not touch
            return; // Don't setup listeners if not a touch device
        }
        console.log("Touch device detected, initializing touch controls.");

        this.setupJoystickArea();
        this.setupButtonListeners();
    },

    setupJoystickArea: function() {
        // Define joystick activation zone (e.g., bottom-left quadrant)
        this.joystick.zone = {
            x: 0,
            y: this.game.canvas.height / 2,
            width: this.game.canvas.width / 2,
            height: this.game.canvas.height / 2
        };

        this.game.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        this.game.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        this.game.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
        this.game.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), false);
    },

    setupButtonListeners: function() {
        document.getElementById('touchAttack')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.player.attack(); });
        document.getElementById('touchInteract')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.interact(); });
        document.getElementById('touchAbility1')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.player.useAbility('1'); });
        document.getElementById('touchAbility2')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.player.useAbility('2'); });
        document.getElementById('touchAbility3')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.player.useAbility('3'); });
        document.getElementById('touchInventory')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.toggleInventory(); });
        document.getElementById('touchQuestLog')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.toggleQuestLog(); });
    },

    handleTouchStart: function(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchX = touch.clientX - this.game.canvas.offsetLeft;
            const touchY = touch.clientY - this.game.canvas.offsetTop;

            // Check if touch is within joystick zone and no joystick is active
            if (!this.joystick.active &&
                touchX >= this.joystick.zone.x && touchX <= this.joystick.zone.x + this.joystick.zone.width &&
                touchY >= this.joystick.zone.y && touchY <= this.joystick.zone.y + this.joystick.zone.height) {

                this.joystick.active = true;
                this.joystick.touchId = touch.identifier;
                this.joystick.baseX = touchX;
                this.joystick.baseY = touchY;
                this.joystick.stickX = touchX;
                this.joystick.stickY = touchY;
                this.updateJoystickInput(touchX, touchY);
                break; // Assign first touch in zone to joystick
            }
        }
    },

    handleTouchMove: function(event) {
        event.preventDefault();
        if (!this.joystick.active) return;

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            if (touch.identifier === this.joystick.touchId) {
                const touchX = touch.clientX - this.game.canvas.offsetLeft;
                const touchY = touch.clientY - this.game.canvas.offsetTop;
                this.updateJoystickInput(touchX, touchY);
                break;
            }
        }
    },

    handleTouchEnd: function(event) {
        event.preventDefault();
        if (!this.joystick.active) return;

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            if (touch.identifier === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.touchId = null;
                this.joystick.inputDx = 0;
                this.joystick.inputDy = 0;
                this.joystick.stickX = this.joystick.baseX; // Reset stick
                this.joystick.stickY = this.joystick.baseY;
                break;
            }
        }
    },

    updateJoystickInput: function(touchX, touchY) {
        let deltaX = touchX - this.joystick.baseX;
        let deltaY = touchY - this.joystick.baseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.joystick.maxDisplacement) {
            const ratio = this.joystick.maxDisplacement / distance;
            deltaX *= ratio;
            deltaY *= ratio;
        }

        this.joystick.stickX = this.joystick.baseX + deltaX;
        this.joystick.stickY = this.joystick.baseY + deltaY;

        // Normalize input for game logic
        this.joystick.inputDx = deltaX / this.joystick.maxDisplacement;
        this.joystick.inputDy = deltaY / this.joystick.maxDisplacement;
        // Clamp to ensure it's within -1 to 1, even with potential floating point inaccuracies
        this.joystick.inputDx = Math.max(-1, Math.min(1, this.joystick.inputDx));
        this.joystick.inputDy = Math.max(-1, Math.min(1, this.joystick.inputDy));

    },

    render: function(ctx) {
        if (!this.isTouchDevice || !this.joystick.active) return;

        ctx.save();
        // Draw joystick base
        ctx.beginPath();
        ctx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radiusBase, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.fill();

        // Draw joystick stick
        ctx.beginPath();
        ctx.arc(this.joystick.stickX, this.joystick.stickY, this.joystick.radiusStick, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.fill();
        ctx.restore();
    }
};
// --- END OF FILE js/touchControls.js ---
export class Input {
    /** @type {HTMLElement} */
    targetElement;
    /** @type {import('./Engine.js').Engine} */
    engine;

    /** @type {Set<string>} */
    keysPressed = new Set();
    isShiftDown = false;
    isCtrlDown = false;
    isAltDown = false;

    /**
     * @param {HTMLCanvasElement} targetElement
     * @param {import('./Engine.js').Engine} gameEngine
     */
    constructor(targetElement, gameEngine) {
        this.targetElement = targetElement;
        this.engine = gameEngine;

        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events on canvas for selection / interaction
        this.targetElement.addEventListener('click', this.handleMouseClick.bind(this));
        // Add mousedown, mouseup, mousemove later if needed for dragging, etc.
    }

    /** @param {KeyboardEvent} event */
    handleKeyDown(event) {
        this.keysPressed.add(event.key.toLowerCase());
        this.isShiftDown = event.shiftKey;
        this.isCtrlDown = event.ctrlKey;
        this.isAltDown = event.altKey;

        // Hotkeys that are not tied to UI buttons (or can also be)
        switch (event.key.toLowerCase()) {
            case 'p':
                this.engine.togglePause();
                break;
            case 'r': // Place Resonance Field (if not placing)
                 if (!this.engine.placingResonanceField) this.engine.requestPlaceResonanceField();
                 break;
            // Harmonoid specific shortcuts tied to HUD for clarity.
            // A/S for pitch, M for Mute, O for Solo can be handled by HUD listeners for better UX.
            case 'a': 
                this.engine.pitchShiftSelected(-1);
                break;
            case 's':
                this.engine.pitchShiftSelected(1);
                break;
            case 'm':
                this.engine.toggleMuteSelected();
                break;
            case 'o': // 'o' for solo, like in DAWs
                this.engine.toggleSoloSelected();
                break;
        }
    }

    /** @param {KeyboardEvent} event */
    handleKeyUp(event) {
        this.keysPressed.delete(event.key.toLowerCase());
        this.isShiftDown = event.shiftKey;
        this.isCtrlDown = event.ctrlKey;
        this.isAltDown = event.altKey;
    }

    /** @param {MouseEvent} event */
    handleMouseClick(event) {
        const rect = this.targetElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.engine.handleCanvasClick(x, y);
    }
    
    update() {
        // For continuous key presses, if needed (e.g. holding a key to move camera)
        // This game concept doesn't immediately require it for core mechanics,
        // but useful for future expansions.
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.targetElement.removeEventListener('click', this.handleMouseClick);
    }
}
export class HackingGame {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.onComplete = null;
        
        // Game State
        this.difficulty = 1; // 1 to 3
        this.cursorPos = 0; // 0.0 to 1.0
        this.cursorSpeed = 1.0; // Units per second
        this.direction = 1; // 1 or -1
        
        this.targetZoneStart = 0.4;
        this.targetZoneWidth = 0.2;
        
        this.successes = 0;
        this.requiredSuccesses = 3;
        this.fails = 0;
        this.maxFails = 1;
        
        this.isLocked = false; // Cooldown after hit
        this.lockTimer = 0;
    }

    start(difficulty = 1, onCompleteCallback) {
        this.active = true;
        this.difficulty = difficulty;
        this.onComplete = onCompleteCallback;
        
        this.successes = 0;
        this.fails = 0;
        this.cursorPos = 0;
        this.direction = 1;
        this.isLocked = false;
        
        // Difficulty Tuning
        this.requiredSuccesses = 3;
        this.maxFails = 3 - difficulty; // Dif 1: 2 fails, Dif 3: 0 fails
        if (this.maxFails < 0) this.maxFails = 0;

        this.baseSpeed = 1.0 + (difficulty * 0.5);
        this.cursorSpeed = this.baseSpeed;
        
        this.targetZoneWidth = 0.25 - (difficulty * 0.05); // Narrower at higher diff
        this.randomizeTarget();
        
        // Pause Main Game
        this.game.paused = true;
        
        this.game.utils.addMessage("[ SYSTEM ] INTRUSION DETECTED. BYPASS PROTOCOL INITIATED.");
    }

    randomizeTarget() {
        // Random pos between 0.1 and 0.9 - width
        const min = 0.1;
        const max = 0.9 - this.targetZoneWidth;
        this.targetZoneStart = min + Math.random() * (max - min);
    }

    update(dt) {
        if (!this.active) return;

        if (this.isLocked) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.isLocked = false;
                this.randomizeTarget();
                this.cursorSpeed = this.baseSpeed + (this.successes * 0.5); // Faster each stage
                this.cursorPos = 0; // Reset pos
            }
            return;
        }

        // Move Cursor
        this.cursorPos += this.cursorSpeed * this.direction * dt;
        
        // Bounce
        if (this.cursorPos >= 1.0) {
            this.cursorPos = 1.0;
            this.direction = -1;
        } else if (this.cursorPos <= 0.0) {
            this.cursorPos = 0.0;
            this.direction = 1;
        }

        // Input Handling is done via Game Input -> calls this.attemptHit()
    }

    attemptHit() {
        if (!this.active || this.isLocked) return;

        const hit = this.cursorPos >= this.targetZoneStart && 
                    this.cursorPos <= (this.targetZoneStart + this.targetZoneWidth);

        if (hit) {
            this.successes++;
            if (this.game.soundManager) this.game.soundManager.playPowerUp(); // Success sound
            
            if (this.successes >= this.requiredSuccesses) {
                this.finish(true);
            } else {
                this.isLocked = true;
                this.lockTimer = 0.5; // Short pause
            }
        } else {
            this.fails++;
            if (this.game.soundManager) this.game.soundManager.playError();
            
            if (this.fails > this.maxFails) {
                this.finish(false);
            } else {
                this.isLocked = true; // Punishment pause
                this.lockTimer = 0.5;
            }
        }
    }

    finish(success) {
        this.active = false;
        this.game.paused = false;
        
        if (success) {
            this.game.utils.addMessage("[ SYSTEM ] ACCESS GRANTED.");
        } else {
            this.game.utils.addMessage("[ SYSTEM ] ACCESS DENIED. LOCKOUT INITIATED.");
        }

        if (this.onComplete) {
            this.onComplete(success);
        }
    }

    render(ctx) {
        if (!this.active) return;

        const w = this.game.canvas.width;
        const h = this.game.canvas.height;

        // Overlay BG
        ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
        ctx.fillRect(0, 0, w, h);

        // Frame
        const boxW = 400;
        const boxH = 200;
        const boxX = (w - boxW) / 2;
        const boxY = (h - boxH) / 2;

        ctx.strokeStyle = '#0F0';
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Title
        ctx.font = '20px "Courier New"';
        ctx.fillStyle = '#0F0';
        ctx.textAlign = 'center';
        ctx.fillText("BYPASS PROTOCOL", w/2, boxY + 30);

        // Progress
        ctx.font = '14px "Courier New"';
        ctx.fillText(`KEYFRAGS: ${this.successes}/${this.requiredSuccesses} | ATTEMPTS: ${this.maxFails - this.fails + 1}`, w/2, boxY + 50);

        // Bar Container
        const barW = 300;
        const barH = 30;
        const barX = (w - barW) / 2;
        const barY = boxY + 100;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Target Zone
        const zoneX = barX + (this.targetZoneStart * barW);
        const zoneW = this.targetZoneWidth * barW;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(zoneX, barY, zoneW, barH);
        ctx.strokeStyle = '#0F0';
        ctx.strokeRect(zoneX, barY, zoneW, barH);

        // Cursor
        const cursorX = barX + (this.cursorPos * barW);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(cursorX - 2, barY - 5, 4, barH + 10);
        
        // Instructions
        ctx.fillStyle = '#AAA';
        ctx.font = '12px "Courier New"';
        ctx.fillText("PRESS [SPACE] TO LOCK SIGNAL", w/2, boxY + 160);
    }
}

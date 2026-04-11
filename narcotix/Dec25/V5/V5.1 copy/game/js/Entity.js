export class Entity {
    constructor(game, x, y, width, height, color) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color || '#FFF';
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        // Base update logic (can be overridden)
    }

    render(ctx) {
        // Basic rendering (can be overridden)
        // Check visibility against camera
        if (this.game.utils.checkCameraVisibility(this, this.game.camera)) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

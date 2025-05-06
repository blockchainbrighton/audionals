// effects/fade.js
export const fadeEffects = {
    /**
     * Black → Image
     */
    fadeIn(ctx, canvas, img, p) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Image layer
      if (img) {
        ctx.globalAlpha = p;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
  
      // Black overlay (fades out)
      if (1 - p > 0) {
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 1 - p;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    },
  
    /**
     * Image → Black
     */
    fadeOut(ctx, canvas, img, p) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Image layer (fades out)
      if (img) {
        ctx.globalAlpha = 1 - p;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
  
      // Black overlay (fades in)
      if (p > 0) {
        ctx.fillStyle = 'black';
        ctx.globalAlpha = p;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    }
  };
  
  export default fadeEffects;            // convenient default
  
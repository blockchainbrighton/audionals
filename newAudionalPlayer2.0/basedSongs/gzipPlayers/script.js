window.addEventListener('load', function() {
    // Apply styles to body and canvas-container
    document.body.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: black;
        position: relative;
    `;

    const container = document.getElementById('canvas-container');
    container.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        position: relative;
    `;

    // Move the canvas into the container and apply styles
    const canvas = document.querySelector('canvas');
    if (canvas) {
        container.appendChild(canvas);
        canvas.style.cssText = `
            display: block;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            max-width: 100%;
            max-height: 100%;
        `;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
});

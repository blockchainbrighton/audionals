// visualEffect.js

let canvas;
let canvasCenterX;
let canvasCenterY;
let gl;
let program;
let cursorPosition = 1.3;
let startTime = performance.now(); // Ensure startTime is initialized
let phaseTimer = 0; // Initialize a phase timer
let reverseDirection = false; // Initialize reverseDirection
let timeSpeedMultiplier = 1.0; // Initialize timeSpeedMultiplier
let cursorSpeedMultiplier = 1.0; // Initialize cursorSpeedMultiplier
let visualTime = 0; // Initialize visualTime



function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let rect = canvas.getBoundingClientRect();
    canvasCenterX = rect.left + rect.width / 2;
    canvasCenterY = rect.top + rect.height / 2;
    console.log(`Canvas resized. Center: (${canvasCenterX}, ${canvasCenterY})`); // Debug log for canvas center
}

function render() {
    let currentTime = performance.now();
    let frameTime = (currentTime - startTime) / 1000.0; // Convert ms to seconds
    visualTime += (reverseDirection ? -1 : 1) * frameTime * timeSpeedMultiplier;
    console.log(`Current Time: ${currentTime.toFixed(2)}, Frame Time: ${frameTime.toFixed(2)}, Visual Time: ${visualTime.toFixed(2)}`);

    resizeCanvas();
    if (!gl) {
        console.error('WebGL context is not available.');
        return;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    // Clamp cursorPosition before sending it to the shader
    let clampedCursorPosition = clamp(cursorPosition * cursorSpeedMultiplier, 0.1, 5.0);
    console.log(`Cursor Position: ${cursorPosition}, Clamped: ${clampedCursorPosition}`); // Debug log for cursor position

    // Update uniforms for resolution, time, and cursor position
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
    const iTimeLocation = gl.getUniformLocation(program, 'iTime');
    gl.uniform1f(iTimeLocation, visualTime);
    const cursorPosLocation = gl.getUniformLocation(program, 'cursorPos');
    gl.uniform1f(cursorPosLocation, clampedCursorPosition);

    // Clear the canvas and draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

    // Reset startTime for the next frame
    startTime = currentTime;

    requestAnimationFrame(render);
}



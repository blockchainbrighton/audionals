// Initialize variables
let canvas, canvasCenterX, canvasCenterY, gl, program;
let cursorPosition = 1.3, lastTime = performance.now(), phaseTimer = 0;
let reverseDirection = false, timeSpeedMultiplier = 1.0, cursorSpeedMultiplier = 1.0, visualTime = 0;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
};

const resizeCanvas = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let rect = canvas.getBoundingClientRect();
    [canvasCenterX, canvasCenterY] = [rect.left + rect.width / 2, rect.top + rect.height / 2];
};

const updateUniforms = () => {
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
    const iTimeLocation = gl.getUniformLocation(program, 'iTime');
    gl.uniform1f(iTimeLocation, visualTime);
    const cursorPosLocation = gl.getUniformLocation(program, 'cursorPos');
    gl.uniform1f(cursorPosLocation, clamp(cursorPosition * cursorSpeedMultiplier, 0.1, 5.0));
};

function render() {
    const currentTime = performance.now();
    const frameTime = (currentTime - lastTime) / 1000.0; // Convert ms to seconds
    visualTime += (reverseDirection ? -1 : 1) * frameTime * timeSpeedMultiplier;
    lastTime = currentTime; // Update lastTime for the next frame

    if (!gl) {
        console.error('WebGL context is not available.');
        return;
    }
    resizeCanvas();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    updateUniforms(); // Update all uniforms

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

    requestAnimationFrame(render);
}

// Initialization and event listeners (assuming they're defined elsewhere)

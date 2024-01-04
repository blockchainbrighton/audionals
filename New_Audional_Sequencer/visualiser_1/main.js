let canvas;
let canvasCenterX;
let canvasCenterY;
let gl;
let program;
let startTime;
let cursorPosition = 1.3;

const vertexShaderSource = `
    attribute vec2 a_position;
    
    void main() {
        gl_Position = vec4(a_position, 0, 1);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 iResolution;
    uniform highp float iTime;
    uniform float cursorPos;

    vec3 palette( float t) {
        vec3 a = vec3(0.2, 0.9, 0.1);
        vec3 b = vec3(1.0, 0.9, 0.5);
        vec3 c = vec3(0.6, 2.8, 1.4);
        vec3 d = vec3(3.138, 3.138, -0.25);

        return a + b * cos(4.28318 * (c * t + d));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
        vec2 uv0 = uv;
        vec3 finalColor = vec3(0.0);

        for (float i = 0.0; i < 4.0; i++) {
            uv = fract(uv * cursorPos) - 0.5;
            float d = length(uv) * exp(-length(uv0));

            vec3 color = palette(length(uv0) + i * 0.3 + iTime * 0.3);

            d = sin(d * 8.0 + iTime) / 8.0;
            d = abs(d);

            d = pow(0.01 / d, 1.8);

            finalColor += color * d;
        }

        gl_FragColor = vec4(finalColor, 0.4);
    }
`;

// Initialize variables for audio-reactive elements
let barCount = 0;
let beatCount = 0;
let isPlaying = false;

// Add an event listener to the BroadcastChannel
const sequencerChannel = new BroadcastChannel('sequencerChannel');
sequencerChannel.onmessage = (event) => {
    const { type, data } = event.data;
    switch(type) {
        case 'bar':
            handleBarMessage(data);
            break;
        case 'beat':
            handleBeatMessage(data);
            break;
        case 'pause':
            handlePauseMessage();
            break;
        case 'resume':
            handleResumeMessage();
            break;
        case 'stop':
            handleStopMessage();
            break;
        case 'play':
            handlePlayMessage(data);
            break;
        default:
            console.log(`Unhandled message type: ${type}`);
    }
};

// Define the message handling functions
function handleBarMessage(data) {
    barCount = data.bar;
    // Add any visual changes/effects for bar changes here
}

function handleBeatMessage(data) {
    beatCount = data.beat;
    barCount = data.bar; // Optional: Update bar count if included in the beat message
    // Add any visual changes/effects for beat changes here
}

function handlePauseMessage() {
    isPlaying = false;
    // Add any visual changes/effects for pause here
}

function handleResumeMessage() {
    isPlaying = true;
    // Add any visual changes/effects for resume here
}

function handleStopMessage() {
    isPlaying = false;
    beatCount = 0;
    barCount = 0;
    // Add any visual changes/effects for stop here
}

function handlePlayMessage(data) {
    isPlaying = true;
    // Optionally update the beatCount and barCount if included in the play message
    if(data.beat !== undefined) {
        beatCount = data.beat;
    }
    if(data.bar !== undefined) {
        barCount = data.bar;
    }
    // Add any visual changes/effects for play here
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
}

function updateCursorPosition(clientX, clientY) {
    const dx = clientX - canvasCenterX;
    const dy = clientY - canvasCenterY;
    const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(canvasCenterX * canvasCenterX + canvasCenterY * canvasCenterY);
    cursorPosition = 0.5 + 2.0 * ((maxDistance - distanceToCenter) / maxDistance);
}

function handleMouseMove(e) {
    updateCursorPosition(e.clientX, e.clientY);
}

function handleTouchMove(e) {
    let touch = e.touches[0];
    updateCursorPosition(touch.clientX, touch.clientY);
}

function render() {
    resizeCanvas();
    if (!gl) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);

    const iTimeLocation = gl.getUniformLocation(program, 'iTime');
    gl.uniform1f(iTimeLocation, (performance.now() - startTime) / 1000.0);

    const cursorPosLocation = gl.getUniformLocation(program, 'cursorPos');
    gl.uniform1f(cursorPosLocation, cursorPosition);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0
        ]),
        gl.STATIC_DRAW
    );

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    startTime = performance.now();
    render();
});

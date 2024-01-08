// visualSettingsListener.js

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
    uniform float palettePhase;  // Declare this as a uniform

    vec3 palette(float t, float phase) {
        if (phase == 0.0) {
            vec3 a = vec3(0.2, 0.9, 0.1);
            vec3 b = vec3(1.0, 0.9, 0.5);
            vec3 c = vec3(0.6, 2.8, 1.4);
            vec3 d = vec3(3.138, 3.138, -0.25);
            return a + b * cos(4.28318 * (c * t + d));
        } else if (phase == 1.0) {
            vec3 a = vec3(0.5, 0.1, 0.9);
            vec3 b = vec3(0.8, 0.5, 0.2);
            vec3 c = vec3(1.2, 0.8, 0.6);
            vec3 d = vec3(0.8, 3.138, 0.25);
            return a + b * cos(4.28318 * (c * t + d));
        } else if (phase == 2.0) {
            vec3 a = vec3(0.3, 0.5, 0.6);
            vec3 b = vec3(0.7, 0.3, 0.1);
            vec3 c = vec3(1.1, 0.7, 1.2);
            vec3 d = vec3(1.9, 2.3, 0.2);
            return a + b * cos(4.28318 * (c * t + d));
        } else if (phase == 3.0) {
            vec3 a = vec3(0.4, 0.2, 0.8);
            vec3 b = vec3(0.9, 0.6, 0.3);
            vec3 c = vec3(0.5, 1.9, 0.7);
            vec3 d = vec3(2.138, 1.138, 0.25);
            return a + b * cos(4.28318 * (c * t + d));
        } else if (phase == 4.0) {
            vec3 a = vec3(0.1, 0.8, 0.3);
            vec3 b = vec3(0.6, 0.4, 0.7);
            vec3 c = vec3(1.3, 0.6, 0.9);
            vec3 d = vec3(1.138, 2.838, 0.75);
            return a + b * cos(4.28318 * (c * t + d));
        } else if (phase == 5.0) { // Greyscale
            float grey = mod(t, 1.0); // Simple greyscale based on time mod 1.0
            return vec3(grey, grey, grey);
        } else if (phase == 6.0) { // Inverted Greyscale
            float grey = 1.0 - mod(t, 1.0); // Inverted greyscale based on time mod 1.0
            return vec3(grey, grey, grey);
        }
        // Fallback to first phase colors
        return vec3(0.2, 0.9, 0.1) + vec3(1.0, 0.9, 0.5) * cos(4.28318 * (vec3(0.6, 2.8, 1.4) * t + vec3(3.138, 3.138, -0.25)));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
        vec2 uv0 = uv;
        vec3 finalColor = vec3(0.0);

        float timeAdjusted = iTime * 0.3;
        float uv0Length = length(uv0);
        for (float i = 0.0; i < 4.0; i++) {           
            uv = fract(uv * cursorPos) - 0.5;
            float d = length(uv) * exp(-uv0Length);

            vec3 color = palette(uv0Length + i * 0.3 + timeAdjusted, palettePhase);

            d = sin(d * 8.0 + iTime) / 8.0;
            d = abs(d);

            d = pow(0.01 / d, 1.8);

            finalColor += color * d;
        }

        gl_FragColor = vec4(finalColor, 0.4);
    }
`;


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

    // Set initial canvas size and calculate maxDistance
    resizeCanvas();
    maxDistance = Math.sqrt(canvasCenterX * canvasCenterX + canvasCenterY * canvasCenterY);

    window.addEventListener('resize', function() {
        resizeCanvas(); // This function is defined in visualEffect.js
        maxDistance = Math.sqrt(canvasCenterX * canvasCenterX + canvasCenterY * canvasCenterY);
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    canvas.addEventListener('click', function() {
        console.log("Canvas clicked. Reverse direction: ", !reverseDirection);  // Add a log to confirm the click is registered
        reverseDirection = !reverseDirection;
    });
    
    startTime = performance.now();
    render();
});


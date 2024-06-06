// colourSettings.js


// Define the color palette
const colorPalette = {
    primary: ["#FFA500", "#FF5733", "#FFD700", "#FF7F50", "#20B2AA", "#7FFF00", "#00FF00", "#00FA9A", "#00FFFF"],
    secondary: ["orange", "blue", "lightseagreen", "darkorange", "#00001E", "#43111E", "red", "green", "yellow", "purple", "pink", "cyan", "magenta", "lime", "teal", "maroon", "navy", "olive", "silver", "gold", "indigo"],
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};

// Function to get a random color from a palette
function getRandomColor(palette) {
    const colors = palette.flat();
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColor : falseColor;
}

// Function to get HSL color
function getHslColor(a, factor) {
    return `hsl(${a % factor * 360}, 100%, 50%)`;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(255, 165, 0, ${distance})`;
}

// Main function to get colors
function getColors(o, a, l) {
    return [
        getRandomColor([colorPalette.primary, colorPalette.secondary]),
        getRandomColor([colorPalette.primary, colorPalette.secondary]),
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.05, getRandomColor([colorPalette.secondary]), "black"),
        getRandomColor([colorPalette.hslColors]),
        Math.abs(Math.sin(a / 3000)) < 0.5 ? "purple" : "orange",
        getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 0.05, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 1000, "purple", "orange"),
        getConditionalColor(l[0].x, l[0].y, 345, "#FFA500", "black"),
        getConditionalColor(l[0].x, l[0].y, 0.0111, "orange", "black"),
        getDynamicRgb(l[0].x, l[0].y, l[1].x, l[1].y),
        getConditionalColor(l[0].x, l[0].y, 15, "orange", "blue"),
        getConditionalColor(l[0].x, l[0].y, 280, "lightseagreen", "darkorange"),
        getConditionalColor(l[0].x, l[0].y, 111, "#00001E", "black"),
        getConditionalColor(l[0].x, l[0].y, 120, "#43111E", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 95, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "green", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "yellow", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "purple", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "pink", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "cyan", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "magenta", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "lime", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "teal", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "maroon", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "navy", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "olive", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "silver", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "gold", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "indigo", "black"),
        getConditionalColor(l[0].x, l[0].y, 100, "#FF5733", "black"),
        getConditionalColor(l[0].x, l[0].y, 90, "#FFD700", "black"),
        getConditionalColor(l[0].x, l[0].y, 80, "#FF7F50", "black"),
        getConditionalColor(l[0].x, l[0].y, 70, "#20B2AA", "black"),
        getConditionalColor(l[0].x, l[0].y, 60, "#7FFF00", "black"),
        getConditionalColor(l[0].x, l[0].y, 50, "#00FF00", "black"),
        getConditionalColor(l[0].x, l[0].y, 40, "#00FA9A", "black"),
        getConditionalColor(l[0].x, l[0].y, 30, "#00FFFF", "black"),
        getConditionalColor(l[0].x, l[0].y, 20, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 10, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 5, "#4682B4", "black"),
        getConditionalColor(l[0].x, l[0].y, 4, "#87CEFA", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "#00BFFF", "black"),
        getConditionalColor(l[0].x, l[0].y, 2, "#4169E1", "black"),
        getConditionalColor(l[0].x, l[0].y, 1, "#0000FF", "black"),
        getConditionalColor(l[0].x, l[0].y, 2, "#8A2BE2", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "#9932CC", "black"),
        getConditionalColor(l[0].x, l[0].y, 4, "#8B008B", "black"),
        getConditionalColor(l[0].x, l[0].y, 5, "#800080", "black"),
        getConditionalColor(l[0].x, l[0].y, 6, "#4B0082", "black"),
        getConditionalColor(l[0].x, l[0].y, 7, "#000080", "black"),
        getConditionalColor(l[0].x, l[0].y, 123, "#FF4500", "black"),
        getConditionalColor(l[0].x, l[0].y, 234, "#FF8C00", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "#00001E", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "#00001E", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "purple", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "#00001E", "black"),
        getConditionalColor(l[0].x, l[0].y, 120, "#43111E", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 95, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 111, "turquoise", "black"),
        getHslColor(a, 1),
        getHslColor(a + 1, 1),
        getHslColor(a, 72 * 5),
        getHslColor(a + 18, 72 * 5),
        getHslColor(180 * a % 360, 360),
        getHslColor(a + 1, 0.125 * 180),
        getHslColor(a % 18 * 20, 20),
        getHslColor(a + 18, 18 * 20),
        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 85) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 170) % 255})` : "alternative-color"),
        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255) + 50})` : "alternative-color"),
        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? "blue" : "red" : "alternative-color"),
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random()) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * Math.random()) + 10}, 90%, 60%)`,
        Math.random() > 0.5 ? `hsl(${Math.floor(50 * Math.random()) + 70}, 100%, 50%)` : `hsl(${Math.floor(50 * Math.random()) + 20}, 100%, 50%)`,
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random())}, 100%, 50%)` : `hsl(${Math.floor(60 * Math.random()) + 180}, 100%, 50%)`,
        `rgb(${Array.from({ length: 3 }, () => Math.random() * ((l[0].z + R) / (2 * R) * 255)).join(",")})`,
        `var(--dynamic-color, rgb(${Math.random() * Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.random() * Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.random() * Math.floor((l[0].z + R) / (2 * R) * 255)}))`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`,
        `rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`,
        `rgb(${Math.floor(506 * Math.sin(Date.now()) + 750)}, ${Math.floor(Math.sin(Date.now() / -17) / -750 * 127)}, ${Math.floor(2000 * Math.sin(Date.now() / 2000) + 10002)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 4)}, ${Math.floor(127 * Math.sin(Date.now() / 10) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 5000) + 32)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 512)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 8)})`,
        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (2 * R) * 255));
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),
        () => {
            let o = Math.floor(10 * Math.random());
            cx.fillStyle = `rgb(${(200 + o) % 255}, ${(100 + o) % 255}, ${(150 + o) % 255})`;
            cx.fillRect(0, 0, S, S);
        },
        `rgb(${Math.floor(111 * Math.sin(Date.now()) + 200000)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 12)}, ${Math.floor(127 * Math.sin(Date.now() / 100) + 4)})`,
        () => {
            const o = cx.createLinearGradient(0, 0, S, S);
            o.addColorStop(Math.abs(Math.sin(a / 1500)), "purple");
            o.addColorStop(1 - Math.abs(Math.sin(a / 1500)), "orange");
            cx.fillStyle = o;
            cx.fillRect(0, 0, S, S);
            console.log("Oscillation value:", Math.abs(Math.sin(a / 1500)));
            console.log("Gradient colors:", "purple", "orange");
        },
        () => {
            cx.fillStyle = `hsl(${300 * Math.abs(Math.sin(a / 2200))}, 100%, 50%)`;
            cx.fillRect(0, 0, S, S);
        }
    ];
}

// Preset random settings
const presetSettings = Array.from({ length: 100 }, (_, i) => ({
    o: Math.random(),
    a: Math.random() * 360,
    l: [
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 }
    ],
    R: Math.random() * 1000
}));

let currentSettingIndex = 0;

// Function to apply the current color setting
function applyCurrentSetting() {

    const setting = presetSettings[currentSettingIndex];
    const colors = getColors(setting.o, setting.a, setting.l, setting.R);
    console.log(`Current Setting Index: ${currentSettingIndex}`, colors);
    // Apply colors to your application as needed
}

// Event listeners for arrow keys
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            currentSettingIndex = (currentSettingIndex + 1) % presetSettings.length;
            applyCurrentSetting();
            break;
        case 'ArrowDown':
            currentSettingIndex = (currentSettingIndex - 1 + presetSettings.length) % presetSettings.length;
            applyCurrentSetting();
            break;
    }
});

// Initial application of the first setting
applyCurrentSetting();

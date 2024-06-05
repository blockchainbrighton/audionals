// colourSettings.js

// Define the color palette
const colorPalette = {
    primary: [
        { hex: "#FFA500", class: "color-orange" }, // orange
        { hex: "#FF5733", class: "color-coral" }, // coral
        { hex: "#FFD700", class: "color-gold" }, // gold
        { hex: "#FF7F50", class: "color-coral2" }, // coral
        { hex: "#00FF00", class: "color-lime" }, // lime
        { hex: "#00FFFF", class: "color-cyan" },  // cyan
        { hex: "#845011", class: "color-verydarkorange" }, // very dark orange
        { hex: "#001900", class: "color-verydarkgreen" }, // very dark green
    ],
    secondary: [
        { hex: "#FFA500", class: "color-orange" },
        { hex: "#0000FF", class: "color-blue" },
        { hex: "#20B2AA", class: "color-lightseagreen" },
        { hex: "#FF8C00", class: "color-darkorange" },
        { hex: "#00001E", class: "color-verydarkblue" }, // very dark blue
        { hex: "#4d0000", class: "color-darkred" }, // dark red
        { hex: "#FF0000", class: "color-red" },
        { hex: "#008000", class: "color-green" },
        { hex: "#800080", class: "color-purple" },
        { hex: "#FF00FF", class: "color-magenta" },
        { hex: "#00FF00", class: "color-lime" },
        { hex: "#008080", class: "color-teal" },
        { hex: "#800000", class: "color-maroon" },
        { hex: "#000080", class: "color-navy" },
        { hex: "#808000", class: "color-olive" },
        { hex: "#C0C0C0", class: "color-silver" },
        { hex: "#4B0082", class: "color-indigo" }
    ],
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};

// Combine primary and secondary palettes for easy access
const combinedPalette = [...colorPalette.primary, ...colorPalette.secondary];

// Function to get a random color from a palette
function getRandomColor(palette) {
    const randomIndex = Math.floor(Math.random() * palette.length);
    return palette[randomIndex];
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColor : falseColor;
}

// Function to get HSL color
function getHslColor(a, factor) {
    return `hsl(${(a % factor) * 360}, 100%, 50%)`;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(255, 165, 0, ${distance})`;
}

// Main function to get colors
function getColors(o, a, l, R) {
    const dateNow = Date.now();
    const sinDateNow = Math.sin(dateNow);
    const sinDateNowDiv1000 = Math.sin(dateNow / 1000);
    const sinDateNowDiv2000 = Math.sin(dateNow / 2000);

    return [
        // CRAZY EYES
        (() => {
            const o = Math.floor(Math.random() * ((l[2].z + R + 255) / (11 * R) * 255));
            return o > 0.01 ? `rgb(${o}, ${o}, ${o})` : "#4d0000";
        })(),
        (() => {
            const o = Math.floor(Math.random() * ((l[2].z + R + 255) / (11 * R) * 255));
            return o > 0.01 ? `rgb(${o}, ${o}, ${o})` : "#422000";
        })(),
        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75));
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#000a39";
        })(),
        (() => {
            const o = Math.floor(Math.random() * ((l[1].z + R + 1111) / (111 * R) * 299999));
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),
        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (0.01 * R) * 0.17));
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),

        // CRAWLERS
        ...Array(5).fill().flatMap((_, i) => {
            const colors = ["red", "white", "blue", "orange", "green"];
            return getConditionalColor(l[0].x, l[0].y, 345, colors[i], "black");
        }),

        // EU Flag Styles
        ...Array(18).fill().flatMap((_, i) => {
            const colors = ["orange", "red", "white", "blue", "grey", "green"];
            return getConditionalColor(l[0].x, l[0].y, 15, colors[i % colors.length], "grey");
        }),

        // STROBE
        ...[0, 1, 360, 18 * 20, 72 * 5, 360, 0.0005 * 180, 0.76].map((factor, i) => getHslColor(a + i, factor)),

        // Spinning Eyes
        `rgb(${Math.floor(127 * sinDateNow + 128)}, ${Math.floor(127 * sinDateNowDiv1000 + 128)}, ${Math.floor(127 * sinDateNowDiv2000 + 128)})`,
        `rgb(${Math.floor(127 * sinDateNow + 4)}, ${Math.floor(127 * Math.sin(dateNow / 10) + 128)}, ${Math.floor(127 * Math.sin(dateNow / 5000) + 32)})`,
        `rgb(${Math.floor(127 * sinDateNow + 512)}, ${Math.floor(127 * sinDateNowDiv1000 + 128)}, ${Math.floor(127 * sinDateNowDiv2000 + 8)})`,
        `rgb(${Math.floor(111 * sinDateNow + 200000)}, ${Math.floor(127 * sinDateNowDiv1000 + 12)}, ${Math.floor(127 * sinDateNowDiv2000 + 4)})`,
        `rgb(${Math.floor(127 * sinDateNow + 128)}, ${Math.floor(127 * sinDateNowDiv1000 + 128)}, ${Math.floor(127 * sinDateNowDiv2000 + 128)})`,
        `rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`,
        `rgb(${Math.floor(506 * sinDateNow + 750)}, ${Math.floor(Math.sin(dateNow / -17) / -750 * 127)}, ${Math.floor(2000 * sinDateNowDiv2000 + 10002)})`,
        `rgb(${Math.floor(127 * sinDateNow + 128)}, ${Math.floor(127 * sinDateNowDiv1000 + 128)}, ${Math.floor(127 * sinDateNowDiv2000 + 128)})`,
    ];
}

// Preset random settings
const presetSettings = Array.from({ length: 100 }, () => ({
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

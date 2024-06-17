// colorPalette.js
console.log("Color palette script loaded");

window.colorPalette = {
    primary: [
        { hex: "#00387a", class: "color-blue" },
        { hex: "#800080", class: "color-purple" },
        { hex: "#FF00FF", class: "color-magenta" },
        { hex: "#008000", class: "color-green" },
        { hex: "#cd8400", class: "color-orange" },
        { hex: "#FFD700", class: "color-gold" },
        { hex: "#00FFFF", class: "color-cyan" },
        { hex: "#845011", class: "color-verydarkorange" },
        { hex: "#001900", class: "color-verydarkgreen" },
        { hex: "#00001E", class: "color-verydarkblue" },
        { hex: "#4d0000", class: "color-darkred" },
        { hex: "#800000", class: "color-maroon" }
    ],
    secondary: [
        { hex: "#FFD700", class: "color-gold" },
        { hex: "#FFA500", class: "color-orange" },
        { hex: "#0000FF", class: "color-blue" },
        { hex: "#20B2AA", class: "color-lightseagreen" },
        { hex: "#FF8C00", class: "color-darkorange" },
        { hex: "#00001E", class: "color-verydarkblue" },
        { hex: "#4d0000", class: "color-darkred" },
        { hex: "#FF0000", class: "color-red" },
        { hex: "#008000", class: "color-green" },
        { hex: "#800080", class: "color-purple" },
        { hex: "#FF00FF", class: "color-magenta" },
        { hex: "#008080", class: "color-teal" },
        { hex: "#800000", class: "color-maroon" },
        { hex: "#000080", class: "color-navy" },
        { hex: "#C0C0C0", class: "color-silver" },
        { hex: "#4B0082", class: "color-indigo" }
    ],
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};
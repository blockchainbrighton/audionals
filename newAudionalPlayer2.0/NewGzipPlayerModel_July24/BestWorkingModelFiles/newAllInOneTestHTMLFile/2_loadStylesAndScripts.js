// 2_loadStylesAndScripts.js
let intervalID = null;

document.body.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: black;
    position: relative;
`;
document.getElementById("canvas-container").style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
`;

const script = document.createElement("script");
script.src = "3_pakoAndGzipSongLoaders.js";
document.body.appendChild(script);

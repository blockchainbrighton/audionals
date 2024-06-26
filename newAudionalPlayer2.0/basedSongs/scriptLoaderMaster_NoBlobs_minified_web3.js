// scriptLoaderMaster.js

function loadScript(e,o){const i=document.createElement("script");i.src=e,i.onload=()=>{console.log(`[debug] Loaded script: ${e}`),o()},i.onerror=()=>console.error(`[debug] Error loading script: ${e}`),document.head.appendChild(i)}function loadScriptsInOrder(e,o){const i=n=>{n>=e.length?o():loadScript(e[n],(()=>i(n+1)))};i(0)}loadScript("/content/6bd78a4bd890bae9d97e129293b3373c2d6ce6ee212607d9b0deaa5166bfe8bci0",(()=>{"function"==typeof initializeScripts?initializeScripts():console.error("[debug] Error: initializeScripts function is not defined.")}));

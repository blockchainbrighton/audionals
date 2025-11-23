// --- ENGINE ---
// This module consumes window.MUSEUM_DATABASE from exhibits.js

let currentIndex = 0;
let forceMode = null; 

// DOM Elements
const wrapper = document.getElementById('wrapper');
const title = document.getElementById('artifact-title');
const number = document.getElementById('artifact-number');
const desc = document.getElementById('artifact-desc');
const metaId = document.getElementById('meta-id');
const metaType = document.getElementById('meta-type');
const metaLink = document.getElementById('meta-link');
const collectionBadge = document.getElementById('collection-badge');
const navContainer = document.getElementById('nav-container');
const counter = document.getElementById('counter');
const btnMode = document.getElementById('btn-mode');

/**
 * Renders the Navigation Sidebar
 */
function renderNav() {
    if (!window.MUSEUM_DATABASE) {
        console.error("Museum Database not found! Make sure exhibits.js is loaded before logic.js");
        navContainer.innerHTML = "<p style='padding:20px; color:red'>Error: Database not found.</p>";
        return;
    }

    const groups = {};
    window.MUSEUM_DATABASE.forEach((item, index) => {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push({ ...item, originalIndex: index });
    });

    for (const [groupName, items] of Object.entries(groups)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'collection-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'group-title';
        titleDiv.innerText = groupName;
        groupDiv.appendChild(titleDiv);

        const showTitle = groupName.includes("Audionals") || 
                          groupName.includes("Songs") || 
                          groupName.includes("Music") || 
                          groupName.includes("Gaming") ||
                          groupName.includes("Timeline");

        items.forEach(item => {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.dataset.index = item.originalIndex;
            
            const label = showTitle ? item.title : item.collection;
            
            navItem.innerHTML = `<span>${label}</span> <span style="opacity:0.5">#${item.number}</span>`;
            navItem.onclick = () => loadArtifact(item.originalIndex);
            
            groupDiv.appendChild(navItem);
        });

        navContainer.appendChild(groupDiv);
    }
}

/**
 * Renders the Media in the Viewer
 */
function renderMedia(item) {
    wrapper.innerHTML = ''; 
    wrapper.className = 'artifact-frame-wrapper'; 
    
    if (item.fullFrame) wrapper.classList.add('full-frame-fix');

    const url = `https://ordinals.com/content/${item.id}`;
    let mode = forceMode ? forceMode : item.type;

    if (mode === 'image') {
        const img = document.createElement('img');
        
        // --- FIX STARTS HERE ---
        // Explicitly set the referrer policy on the element itself.
        // This overrides browser defaults that might ignore the meta tag.
        img.referrerPolicy = "no-referrer"; 
        img.crossOrigin = "anonymous"; // Ensures we don't send credentials/cookies which might also trigger blocks
        // --- FIX ENDS HERE ---

        img.src = url;
        img.className = 'artifact-media';
        
        if (item.pixelated) img.classList.add('pixelated');
        
        img.onerror = () => {
            console.warn("Image load failed (likely CORS/Hotlink protection). Switching to Iframe fallback.");
            forceMode = 'html';
            renderMedia(item);
        };

        wrapper.appendChild(img);
        
        btnMode.innerText = "Mode: Image";
        btnMode.classList.remove('active');
    } else {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.referrerPolicy = "no-referrer"; // Good practice to add here too
        iframe.sandbox = "allow-scripts allow-same-origin allow-pointer-lock";
        iframe.className = 'artifact-media';
        wrapper.appendChild(iframe);
        
        btnMode.innerText = "Mode: Live";
        btnMode.classList.add('active');
    }
}

/**
 * Loads specific artifact data into the UI
 */
function loadArtifact(index) {
    if (!window.MUSEUM_DATABASE || index < 0 || index >= window.MUSEUM_DATABASE.length) return;
    
    currentIndex = index;
    const item = window.MUSEUM_DATABASE[index];
    
    forceMode = null; 

    title.innerText = item.title;
    number.innerText = `Inscription #${item.number}`;
    desc.innerHTML = item.desc; 
    
    metaId.innerText = item.id;
    metaType.innerText = item.type.toUpperCase();
    collectionBadge.innerText = item.collection;
    metaLink.href = `https://ordinals.com/inscription/${item.id}`;
    
    counter.innerText = `${currentIndex + 1} / ${window.MUSEUM_DATABASE.length}`;

    renderMedia(item);

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-index="${index}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
        activeNav.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    document.getElementById('btn-prev').disabled = index === 0;
    document.getElementById('btn-next').disabled = index === window.MUSEUM_DATABASE.length - 1;
}

// --- EVENT LISTENERS ---

btnMode.onclick = () => {
    const item = window.MUSEUM_DATABASE[currentIndex];
    const currentMode = forceMode ? forceMode : item.type;
    forceMode = currentMode === 'image' ? 'html' : 'image';
    renderMedia(item);
};

document.getElementById('btn-prev').onclick = () => loadArtifact(currentIndex - 1);
document.getElementById('btn-next').onclick = () => loadArtifact(currentIndex + 1);

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') loadArtifact(currentIndex - 1);
    if (e.key === 'ArrowRight') loadArtifact(currentIndex + 1);
});

if (window.MUSEUM_DATABASE) {
    renderNav();
    loadArtifact(0);
} else {
    window.addEventListener('load', () => {
        renderNav();
        loadArtifact(0);
    });
}
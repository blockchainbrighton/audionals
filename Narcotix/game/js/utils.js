import { MAX_MESSAGES, TUTORIAL_DISPLAY_TIME } from './config.js';

let gameMessages = [];
let tutorialQueue = [];
let currentTutorial = null;
let tutorialTimer = 0;
let activeTutorialDisplayTime = TUTORIAL_DISPLAY_TIME;


export function AABBCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function showTutorial(message, duration = TUTORIAL_DISPLAY_TIME) {
    const popup = document.getElementById('tutorialPopup');
    if (!popup) return;
    popup.textContent = message;
    popup.style.display = 'block';
    activeTutorialDisplayTime = duration;
    tutorialTimer = Date.now();

    setTimeout(() => {
        if (popup.textContent === message && Date.now() - tutorialTimer >= duration) { // Check if it's still the same message
             popup.style.display = 'none';
        }
    }, duration);
}

export function queueTutorial(message, conditionFunction) {
    tutorialQueue.push({ message, conditionFunction, shown: false });
}

export function processTutorialQueue(game) { // game instance might be needed for conditionFunction
    const popup = document.getElementById('tutorialPopup');
    if (!popup) return;

    if (currentTutorial && Date.now() - tutorialTimer < activeTutorialDisplayTime) return;
    if (currentTutorial) {
        popup.style.display = 'none';
        currentTutorial = null;
    }
    for (let i = 0; i < tutorialQueue.length; i++) {
        if (!tutorialQueue[i].shown && tutorialQueue[i].conditionFunction(game)) {
            currentTutorial = tutorialQueue[i];
            showTutorial(currentTutorial.message);
            tutorialQueue[i].shown = true;
            break; 
        }
    }
}

export function addMessage(text) {
    gameMessages.unshift(`[SYS] ${text}`);
    if (gameMessages.length > MAX_MESSAGES) gameMessages.pop();
    renderMessages();
}

export function renderMessages() {
    const log = document.getElementById('messageLog');
    if (!log) return;
    log.innerHTML = gameMessages.map(msg => `<div>${msg.replace(/</g, "<").replace(/>/g, ">")}</div>`).join('');
    log.scrollTop = 0; 
}

export function resetTutorials() {
    tutorialQueue.forEach(t => t.shown = false);
    currentTutorial = null;
    const popup = document.getElementById('tutorialPopup');
    if (popup) popup.style.display = 'none';
    tutorialTimer = 0;
}

export function clearMessages() {
    gameMessages = [];
    renderMessages();
}
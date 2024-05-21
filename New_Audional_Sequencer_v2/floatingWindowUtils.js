// floatingWindowUtils.js
// This script provides utilities for creating and managing a floating window.

function createFloatingWindow() {
    const floatingWindow = document.createElement('div');
    floatingWindow.style.position = 'fixed';
    floatingWindow.style.top = '10%';
    floatingWindow.style.left = '10%';
    floatingWindow.style.width = '80%';
    floatingWindow.style.height = '80%';
    floatingWindow.style.zIndex = '1000';
    floatingWindow.style.backgroundColor = 'white';
    floatingWindow.style.border = '2px solid black';
    floatingWindow.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    floatingWindow.style.overflow = 'hidden';
    floatingWindow.style.resize = 'both';
    floatingWindow.style.padding = '10px';

    const closeButton = createCloseButton(floatingWindow);
    floatingWindow.appendChild(closeButton);

    makeFloatingWindowDraggable(floatingWindow);

    return floatingWindow;
}

function createCloseButton(floatingWindow) {
    const closeButton = document.createElement('div');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '20px';
    closeButton.style.color = 'red';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(floatingWindow);
    });

    return closeButton;
}

function makeFloatingWindowDraggable(floatingWindow) {
    floatingWindow.onmousedown = function (event) {
        const shiftX = event.clientX - floatingWindow.getBoundingClientRect().left;
        const shiftY = event.clientY - floatingWindow.getBoundingClientRect().top;

        function moveAt(pageX, pageY) {
            floatingWindow.style.left = `${pageX - shiftX}px`;
            floatingWindow.style.top = `${pageY - shiftY}px`;
        }

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);

        floatingWindow.onmouseup = function () {
            document.removeEventListener('mousemove', onMouseMove);
            floatingWindow.onmouseup = null;
        };
    };

    floatingWindow.ondragstart = function () {
        return false;
    };
}


function createTabbedInterface() {
    const tabContainer = document.createElement('div');
    const iframeContainer = document.createElement('iframe');
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = 'calc(100% - 40px)'; // Adjust height for tab height
    iframeContainer.style.border = 'none';

    const tabs = ['Synth 1', 'Synth 2', 'Synth 3']; // Example tabs
    tabs.forEach((tab, index) => {
        const button = document.createElement('button');
        button.textContent = tab;
        button.onclick = () => {
            iframeContainer.src = `Synth-Modules/${tab}/index.html`; // Adjust src dynamically
        };
        tabContainer.appendChild(button);
    });

    const floatingWindow = createFloatingWindow();
    floatingWindow.appendChild(tabContainer);
    floatingWindow.appendChild(iframeContainer);
    document.body.appendChild(floatingWindow);
}

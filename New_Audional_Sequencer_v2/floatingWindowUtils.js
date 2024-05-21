// floatingWindowUtils.js

function createFloatingWindow() {
    const floatingWindow = document.createElement('div');
    floatingWindow.className = 'floatingWindow';
    console.log("Creating floating window...");

    const titleBar = createTitleBar();
    console.log("Adding title bar...");
    floatingWindow.appendChild(titleBar);

    const closeButton = createCloseButton();
    console.log("Adding close button...");
    floatingWindow.appendChild(closeButton);

    console.log("Making window draggable...");
    makeFloatingWindowDraggable(floatingWindow);

    console.log("Floating window created:", floatingWindow);
    return floatingWindow;
}


function createCloseButton() {
    const closeButton = document.createElement('div');
    closeButton.textContent = 'X';
    closeButton.className = 'closeButton';
    closeButton.addEventListener('click', () => closeButton.closest('.floatingWindow').remove());

    return closeButton;
}

function makeFloatingWindowDraggable(floatingWindow) {
    let isDragging = false;
    const titleBar = floatingWindow.querySelector('.titleBar'); // Assuming there's a title bar for dragging

    if (!titleBar) {
        console.error("No title bar found for dragging. Please ensure there's a titleBar element.");
        return;
    }

    titleBar.onmousedown = function (event) {
        isDragging = true;
        const shiftX = event.clientX - floatingWindow.getBoundingClientRect().left;
        const shiftY = event.clientY - floatingWindow.getBoundingClientRect().top;

        function onMouseMove(event) {
            if (isDragging) {
                floatingWindow.style.left = `${event.pageX - shiftX}px`;
                floatingWindow.style.top = `${event.pageY - shiftY}px`;
            }
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    titleBar.ondragstart = () => false;
}

function createTitleBar() {
    const titleBar = document.createElement('div');
    titleBar.className = 'titleBar';
    titleBar.textContent = 'Drag Me'; // You can customize this text or style
    return titleBar;
}

function createTabbedInterface() {
    const floatingWindow = createFloatingWindow();
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tabContainer';

    const iframeContainer = document.createElement('iframe');
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = 'calc(100% - 40px)';
    iframeContainer.style.border = 'none';

    floatingWindow.appendChild(tabContainer);
    floatingWindow.appendChild(iframeContainer);
    document.body.appendChild(floatingWindow);

    return { tabContainer, iframeContainer };
}

function addTab(tabContainer, iframeContainer, tabName, channelIndex) {
    const button = document.createElement('button');
    button.textContent = tabName;
    button.onclick = () => {
        iframeContainer.src = `Synth-Modules/${tabName}/index.html?channelIndex=${channelIndex}`;
    };
    if (tabContainer.childNodes.length === 0) { // If it's the first tab, load it immediately
        button.onclick();
    }
    tabContainer.appendChild(button);
}
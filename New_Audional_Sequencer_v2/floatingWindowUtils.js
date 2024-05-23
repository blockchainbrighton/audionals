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
    const titleBar = floatingWindow.querySelector('.titleBar');

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
                let newLeft = event.pageX - shiftX;
                let newTop = event.pageY - shiftY;

                // Boundary checks
                const parentRect = document.body.getBoundingClientRect();
                const floatRect = floatingWindow.getBoundingClientRect();

                if (newLeft < parentRect.left) newLeft = parentRect.left;
                if (newTop < parentRect.top) newTop = parentRect.top;
                if (newLeft + floatRect.width > parentRect.right) newLeft = parentRect.right - floatRect.width;
                if (newTop + floatRect.height > parentRect.bottom) newTop = parentRect.bottom - floatRect.height;

                floatingWindow.style.left = `${newLeft}px`;
                floatingWindow.style.top = `${newTop}px`;
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
    titleBar.textContent = 'Drag Me';
    return titleBar;
}

function createTabbedInterface() {
    const floatingWindow = createFloatingWindow();
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tabContainer';

    const iframeContainer = document.createElement('div');
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = 'calc(100% - 40px)';
    iframeContainer.style.position = 'relative';

    floatingWindow.appendChild(tabContainer);
    floatingWindow.appendChild(iframeContainer);
    document.body.appendChild(floatingWindow);

    return { tabContainer, iframeContainer };
}

function addTab(tabContainer, iframeContainer, tabName, channelIndex, loadSampleButtonId) {
    const button = document.createElement('button');
    button.textContent = `${tabName} - Channel ${channelIndex}`;
    button.className = 'inactiveTab';

    let iframe = iframeContainer.querySelector(`iframe[data-channel='${channelIndex}']`);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.setAttribute('data-channel', channelIndex);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.display = 'none';
        iframe.src = `Synth-Modules/${tabName}/index.html?channelIndex=${channelIndex}`;
        iframeContainer.appendChild(iframe);
    }

    button.onclick = () => {
        const iframes = iframeContainer.querySelectorAll('iframe');
        const loadSampleButton = document.getElementById(loadSampleButtonId);

        iframes.forEach(iframe => iframe.style.display = 'none');
        iframe.style.display = 'block';

        if (loadSampleButton) {
            loadSampleButton.textContent = `${tabName} - Channel ${channelIndex}`;
        }

        const buttons = tabContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('activeTab');
            btn.classList.add('inactiveTab');
        });

        button.classList.add('activeTab');
        button.classList.remove('inactiveTab');
    };

    if (tabContainer.childNodes.length === 0) {
        iframe.style.display = 'block';
        button.classList.add('activeTab');
        button.classList.remove('inactiveTab');
        const loadSampleButton = document.getElementById(loadSampleButtonId);
        if (loadSampleButton) {
            loadSampleButton.textContent = `${tabName} - Channel ${channelIndex}`;
        }
    }

    tabContainer.appendChild(button);
}

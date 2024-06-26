// titleDisplayUser.js

document.addEventListener("DOMContentLoaded", function() {
    console.log("[titleDisplayUser.js] DOMContentLoaded event triggered");

    const userConfig = {
        visualArtistName: 'SQYZY',
        cooldownTime: 60000 // 60 seconds cooldown
    };

    // Wait for settings to be available
    function waitForSettings() {
        if (window.settings) {
            console.log("[titleDisplayUser.js] Settings loaded:", window.settings);

            // Initialize TitleDisplay with user configuration
            window.titleDisplay = new TitleDisplay(userConfig);
            console.log("[titleDisplayUser.js] TitleDisplay initialized:", window.titleDisplay);

            // Show title sequence on specific event, such as click
            document.addEventListener("click", function() {
                console.log("[titleDisplayUser.js] Document clicked");
                if (window.titleDisplay) {
                    console.log("[titleDisplayUser.js] Showing title sequence");
                    window.titleDisplay.showTitleSequence();
                } else {
                    console.error("[titleDisplayUser.js] TitleDisplay is not defined or not initialized.");
                }
            });
        } else {
            console.log("[titleDisplayUser.js] Settings not yet available, retrying...");
            setTimeout(waitForSettings, 100);
        }
    }

    waitForSettings();
});

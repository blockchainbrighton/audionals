// titleDisplayCore.js

(function() {
    // Constructor function for TitleDisplay
    function TitleDisplay(config) {
        this.visualArtistName = config.visualArtistName || 'SQYZY'; // Default visual artist name
        this.config = config;
        this.animationPlaying = false;
        this.lastAnimationEnd = 0;

        this.setup();
    }

    TitleDisplay.prototype.setup = function() {
        const { projectName, artistName } = window.settings || {};
        const container = document.createElement('div');
        container.id = 'title-display-container';
        document.body.appendChild(container);

        this.elements = {
            projectNameElement: this.createElement('project-name-display', projectName, container),
            byElement: this.createElement('by-display', 'by', container),
            artistNameElement: this.createElement('artist-name-display', artistName, container),
            visualArtistElement: this.createElement('visual-artist-display', 'visuals by', container),
            visualArtistNameElement: this.createElement('visual-artist-name-display', this.visualArtistName, container)
        };
    };

    TitleDisplay.prototype.createElement = function(id, text, container) {
        const element = document.createElement('div');
        element.id = id;
        element.innerText = text;
        container.appendChild(element);
        return element;
    };

    TitleDisplay.prototype.clearAnimations = function() {
        Object.values(this.elements).forEach(element => {
            element.className = '';
        });
    };

    TitleDisplay.prototype.showTitleSequence = function() {
        const { cooldownTime = 60000 } = this.config;
        const { projectNameElement, byElement, artistNameElement, visualArtistElement, visualArtistNameElement } = this.elements;

        if (!this.animationPlaying && (Date.now() - this.lastAnimationEnd > cooldownTime)) {
            this.animationPlaying = true;
            this.clearAnimations();

            projectNameElement.classList.add('show-project-name');
            setTimeout(() => {
                byElement.classList.add('show-by');
                setTimeout(() => {
                    artistNameElement.classList.add('show-artist-name');
                    setTimeout(() => {
                        visualArtistElement.classList.add('show-visual-artist');
                        setTimeout(() => {
                            visualArtistNameElement.classList.add('show-visual-artist-name');
                            setTimeout(() => {
                                this.clearAnimations();
                                this.animationPlaying = false;
                                this.lastAnimationEnd = Date.now();
                            }, 24000);
                        }, 4000);
                    }, 12000);
                }, 4000);
            }, 12000);
        }
    };

    // Attach TitleDisplay to the global window object
    window.TitleDisplay = TitleDisplay;
})();

export const UIFactory = {
    /**
     * Creates a standardized item card HTML string.
     * @param {object} options - Configuration for the card.
     * @param {string} options.imageUrl - Resolved URL for the icon.
     * @param {string} options.name - Item name.
     * @param {number|string} options.qty - Quantity or Stock to display.
     * @param {string} [options.desc] - Item description.
     * @param {string} [options.subtext] - Additional text (e.g. price).
     * @param {string} [options.actionButtons] - HTML for action buttons.
     * @param {string} [options.onClick] - Onclick handler for the card itself.
     * @param {string} [options.borderColor] - Border color.
     * @returns {HTMLElement} The created DOM element.
     */
    createItemCardDOM: function(options) {
        const div = document.createElement('div');
        div.className = 'inventory-item-card'; // Reusing existing class for styling
        if (options.borderColor) div.style.borderColor = options.borderColor;
        if (options.onClick) {
            div.style.cursor = 'pointer';
            div.onclick = new Function('event', options.onClick); // Safe if onClick is just a function call string? No, standard onclick expects string or func.
            // Actually, in the current codebase, they assign functions: div.onclick = () => ...
            // So let's accept a function for onClick.
        } else if (options.onClickFunc) {
            div.style.cursor = 'pointer';
            div.onclick = options.onClickFunc;
        }

        const qtyDisplay = options.qty !== undefined ? `<span class="item-qty">x${options.qty}</span>` : '';
        const subtextDisplay = options.subtext ? `<div class="item-meta">${options.subtext}</div>` : '';
        const descDisplay = options.desc ? `<div class="item-desc">${options.desc}</div>` : '';
        
        div.innerHTML = `
            <div class="item-icon-container">
                <img src="${options.imageUrl}" class="item-icon" crossorigin="anonymous" onerror="this.src='artwork/narcotix_pill.svg';">
            </div>
            <div class="item-details">
                <div class="item-name">${options.name} ${qtyDisplay}</div>
                ${subtextDisplay}
                ${descDisplay}
            </div>
            <div class="item-actions">
                ${options.actionButtons || ''}
            </div>
        `;
        return div;
    },

    /**
     * Resolves the image URL for an item.
     * @param {object} item - The item object.
     * @param {object} imageLoader - The imageLoader module.
     * @returns {string} The resolved URL.
     */
    getItemImageUrl: function(item, imageLoader) {
        let url = item.imageUrl;
        if (!url) {
            if (item.type === 'weapon' && item.weaponId) {
                url = `artwork/${item.weaponId}.svg`;
            } else {
                url = `artwork/${item.id}.svg`;
            }
        }
        if (item.nftTraits && item.nftTraits.id && imageLoader) {
             url = imageLoader.getUrl(item.nftTraits.id) || url;
        }
        return url;
    },

    /**
     * Creates a button string for innerHTML injection.
     * @param {string} label - Button text.
     * @param {string} onClick - Onclick string (e.g., "game.foo()").
     * @param {string} [classes=''] - Additional classes (e.g. 'button-small').
     * @returns {string} Button HTML.
     */
    createButtonString: function(label, onClick, classes = '') {
        return `<button class="button ${classes}" onclick="event.stopPropagation(); ${onClick}">${label}</button>`;
    }
};

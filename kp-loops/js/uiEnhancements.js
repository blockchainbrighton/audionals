/**
 * uiEnhancements.js
 * Handles general UI effects like mobile nav, smooth scroll, etc.
 */

// --- Mobile Nav Toggle ---
function initMobileNav(toggleSelector = '.nav-toggle', navSelector = 'nav') {
    const navToggle = document.querySelector(toggleSelector);
    const nav = document.querySelector(navSelector);

    if (navToggle && nav) {
        const icon = navToggle.querySelector('i'); // Assumes Font Awesome icon

        const toggleNav = () => {
            nav.classList.toggle('active');
            // Toggle ARIA expanded attribute for accessibility
            const isExpanded = nav.classList.contains('active');
            navToggle.setAttribute('aria-expanded', isExpanded);

            if (icon) { // Toggle icon class if present
                icon.classList.toggle('fa-bars', !isExpanded);
                icon.classList.toggle('fa-times', isExpanded);
            }
        };

        navToggle.addEventListener('click', toggleNav);

        // Close nav when a link inside it is clicked
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('active')) {
                    toggleNav();
                }
            });
        });
        console.log("Mobile navigation initialized.");
    } else {
        if (!navToggle) console.warn(`Mobile nav toggle element not found with selector: ${toggleSelector}`);
        if (!nav) console.warn(`Mobile nav element not found with selector: ${navSelector}`);
    }
}

// --- Placeholder Marking ---
function markPlaceholders(selector = '.sample-card:not([data-src])') {
    document.querySelectorAll(selector).forEach(item => {
        if (!item.classList.contains('placeholder')) {
            item.classList.add('placeholder');
        }
        if (!item.hasAttribute('data-tooltip')) {
            item.setAttribute('data-tooltip', 'Coming Soon'); // Default tooltip
        }
        // Disable any buttons within placeholders
        item.querySelectorAll('button').forEach(el => el.disabled = true);
    });
    // console.log("Placeholder cards marked."); // Can be noisy
}

// --- Retro Computer Screen Flicker Effect ---
function initScreenFlicker(selector = '.computer-screen') {
    const computerScreen = document.querySelector(selector);
    if (computerScreen) {
        const flicker = () => {
            const flickerInterval = 4000 + Math.random() * 3000; // Adjust timing as needed
            const flickerDuration = 60 + Math.random() * 60;

            computerScreen.classList.add('flicker');
            setTimeout(() => {
                computerScreen.classList.remove('flicker');
                // Schedule the next flicker
                setTimeout(flicker, flickerInterval);
            }, flickerDuration);
        };
        // Start the first flicker after a short delay
        setTimeout(flicker, 1000 + Math.random() * 1000);
        console.log("Screen flicker effect initialized.");
    }
     // else { console.log("Computer screen element not found for flicker effect."); }
}

// --- Smooth Anchor Scrolling ---
function initSmoothScroll(selector = 'a[href^="#"]') {
    document.querySelectorAll(selector).forEach(anchorLink => {
        anchorLink.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');

            // Ensure it's a valid internal link (starts with # and has content after)
            if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#')) {
                let targetElement;
                try {
                    // Use the href directly as a selector
                    targetElement = document.querySelector(hrefAttribute);
                } catch (error) {
                    console.error(`Smooth scroll: Invalid selector "${hrefAttribute}".`, error);
                    return; // Don't prevent default if selector is invalid
                }

                if (targetElement) {
                    e.preventDefault(); // Prevent default jump only if target exists

                    const headerOffset = 80; // Adjust as needed for fixed headers
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });

                    // Optional: Close mobile nav if open after clicking a link
                    // Requires knowledge of nav state - maybe pass toggle function or check class
                    const nav = document.querySelector('nav'); // Re-select or pass reference
                    const navToggle = document.querySelector('.nav-toggle'); // Re-select or pass reference
                    if (nav?.classList.contains('active')) {
                        navToggle?.click(); // Simulate click to close
                    }

                } else {
                    console.warn(`Smooth scroll target not found for selector: ${hrefAttribute}`);
                    // Allow default behavior if target isn't found (might be a link to elsewhere)
                }
            }
            // Allow default behavior for non-anchor links or links like href="#"
        });
    });
    console.log("Smooth scrolling initialized.");
}


// --- Main Initialization Function for UI ---
export function initUIEnhancements() {
    initMobileNav();
    markPlaceholders();
    initScreenFlicker();
    initSmoothScroll();
    console.log("UI Enhancements initialized.");
}
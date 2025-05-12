/**
 * animations.js
 * Handles scroll-triggered animations and hero typewriter effect.
 */

// --- Animate on Scroll (Intersection Observer Preferred) ---
function initScrollAnimations(selector = '.fade-in, .slide-up') {
    const elementsToAnimate = document.querySelectorAll(selector);
    if (elementsToAnimate.length === 0) {
        // console.log("No elements found for scroll animations.");
        return;
    }

    if ('IntersectionObserver' in window) {
        // --- Intersection Observer Implementation ---
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                const targetElement = entry.target;

                 // Check if the element uses CSS animations
                 const styles = window.getComputedStyle(targetElement);
                 const hasCssAnimation = styles.animationName && styles.animationName !== 'none';

                if (entry.isIntersecting) {
                     if (hasCssAnimation) {
                        // Play CSS animation if defined
                         targetElement.style.animationPlayState = 'running';
                     } else {
                         // Fallback: Directly apply final styles if no CSS animation
                         targetElement.style.opacity = '1';
                         targetElement.style.transform = 'translateY(0)';
                     }
                    // Optional: Unobserve after first intersection if animation should only run once
                    // obs.unobserve(targetElement);
                } else {
                     if (hasCssAnimation) {
                        // Pause CSS animation when out of view
                         targetElement.style.animationPlayState = 'paused';
                     }
                     // else {
                     // Optional: Reset styles when element scrolls out of view if you want animation to replay
                     // targetElement.style.opacity = '0';
                     // if (targetElement.classList.contains('slide-up')) {
                     //     targetElement.style.transform = 'translateY(20px)';
                     // }
                     // }
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        elementsToAnimate.forEach(el => {
            const styles = window.getComputedStyle(el);
            const hasCssAnimation = styles.animationName && styles.animationName !== 'none';

             if (hasCssAnimation) {
                 // Ensure animation is paused initially if controlled by IO
                 el.style.animationPlayState = 'paused';
             } else {
                 // Set initial state for non-CSS animation transitions
                 el.style.opacity = '0';
                 if (el.classList.contains('slide-up')) {
                    el.style.transform = 'translateY(20px)';
                 }
                 el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'; // Ensure transition is defined
             }
            observer.observe(el);
        });
        console.log("Scroll animations initialized using Intersection Observer.");

    } else {
        // --- Fallback for older browsers (using scroll event listener) ---
        console.log("Intersection Observer not supported, using scroll fallback for animations.");
        const animateOnScrollFallback = () => {
            elementsToAnimate.forEach(el => {
                // Check if element is already visible (simple check)
                 if (el.style.opacity === '1') return;

                 // Basic check if element is in viewport
                 const rect = el.getBoundingClientRect();
                 if (rect.top < window.innerHeight - 50 && rect.bottom >= 0) { // Element is partially or fully in view
                     el.style.opacity = '1';
                     el.style.transform = 'translateY(0)';
                     // Ensure transition is defined for the fallback
                     el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                 }
            });
        };

        // Initial check
        animateOnScrollFallback();
        // Add scroll listener (consider debouncing/throttling for performance if needed)
        window.addEventListener('scroll', animateOnScrollFallback);
         // Also listen for resize
         window.addEventListener('resize', animateOnScrollFallback);
    }
}


// --- Hero Typewriter Effect ---
function initTypewriter(selector = '.hero-text h1', speed = 80, initialDelay = 300) {
    const heroTextElement = document.querySelector(selector);
    if (heroTextElement) {
        const originalText = heroTextElement.dataset.text || heroTextElement.textContent || ""; // Prefer data-text attribute
        if (!originalText) {
            console.warn("Typewriter: No text found in element or data-text attribute for selector:", selector);
            return;
        }
        heroTextElement.textContent = ''; // Clear existing text
        let charIndex = 0;

        const typeWriterEffect = () => {
            if (charIndex < originalText.length) {
                heroTextElement.textContent += originalText.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriterEffect, speed);
            }
             // else { console.log("Typewriter effect finished."); } // Optional log
        };

        // Start after the initial delay
        setTimeout(typeWriterEffect, initialDelay);
        console.log("Hero typewriter effect initialized.");
    }
     // else { console.log("Hero text element not found for typewriter effect."); }
}

// --- Main Initialization Function for Animations ---
export function initAnimations() {
    initScrollAnimations();
    initTypewriter(); // Call with default parameters
    console.log("Animations initialized.");
}
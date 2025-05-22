// Email Collection and Automation Features

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all forms with automation features
    initNewsletterForm();
    initContactForm();
    initLeadMagnetForms();
    initPopupForms();
});

// Newsletter Form Handling
function initNewsletterForm() {
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    
    newsletterForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            if (validateEmail(email)) {
                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = 'Subscribing...';
                
                // Simulate API call (would be a real API in production)
                setTimeout(function() {
                    // Success state
                    form.innerHTML = `
                        <div class="form-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Thank You for Subscribing!</h3>
                            <p>You've been added to our newsletter. Watch your inbox for high-commission affiliate opportunities and tips.</p>
                        </div>
                    `;
                    
                    // Store in localStorage for demonstration
                    saveSubscriber(email, 'newsletter');
                    
                    // Trigger analytics event
                    trackEvent('form_submission', 'newsletter_signup', email);
                    
                }, 1500);
            } else {
                // Show error
                showFormError(form, emailInput, 'Please enter a valid email address');
            }
        });
    });
}

// Contact Form Handling
function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const nameInput = contactForm.querySelector('input[name="name"]');
            const emailInput = contactForm.querySelector('input[name="email"]');
            const messageInput = contactForm.querySelector('textarea[name="message"]');
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const message = messageInput.value.trim();
            
            // Validate form
            let isValid = true;
            
            if (name === '') {
                showFormError(contactForm, nameInput, 'Please enter your name');
                isValid = false;
            }
            
            if (!validateEmail(email)) {
                showFormError(contactForm, emailInput, 'Please enter a valid email address');
                isValid = false;
            }
            
            if (message === '') {
                showFormError(contactForm, messageInput, 'Please enter your message');
                isValid = false;
            }
            
            if (isValid) {
                // Show loading state
                const submitButton = contactForm.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
                
                // Simulate API call (would be a real API in production)
                setTimeout(function() {
                    // Success state
                    contactForm.innerHTML = `
                        <div class="form-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Message Sent Successfully!</h3>
                            <p>Thank you for contacting us. We'll get back to you as soon as possible.</p>
                        </div>
                    `;
                    
                    // Store in localStorage for demonstration
                    saveContactMessage(name, email, message);
                    
                    // Trigger analytics event
                    trackEvent('form_submission', 'contact_form', email);
                    
                }, 1500);
            }
        });
    }
}

// Lead Magnet Forms (PDF downloads, guides, etc.)
function initLeadMagnetForms() {
    const leadMagnetForms = document.querySelectorAll('.lead-magnet-form');
    
    leadMagnetForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            const leadMagnetId = form.getAttribute('data-lead-magnet-id');
            const leadMagnetTitle = form.getAttribute('data-lead-magnet-title');
            const downloadUrl = form.getAttribute('data-download-url');
            
            if (validateEmail(email)) {
                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = 'Processing...';
                
                // Simulate API call (would be a real API in production)
                setTimeout(function() {
                    // Success state
                    form.innerHTML = `
                        <div class="form-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Your Download is Ready!</h3>
                            <p>Thank you for your interest. Your download should begin automatically.</p>
                            <a href="${downloadUrl}" class="btn btn-primary mt-3" download>Download Again</a>
                        </div>
                    `;
                    
                    // Trigger download
                    if (downloadUrl) {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = downloadUrl;
                        downloadLink.download = leadMagnetTitle || 'download';
                        downloadLink.style.display = 'none';
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    }
                    
                    // Store in localStorage for demonstration
                    saveLeadMagnetSubscriber(email, leadMagnetId, leadMagnetTitle);
                    
                    // Trigger analytics event
                    trackEvent('form_submission', 'lead_magnet_download', leadMagnetId);
                    
                }, 1500);
            } else {
                // Show error
                showFormError(form, emailInput, 'Please enter a valid email address');
            }
        });
    });
}

// Popup Forms (Exit intent, timed, etc.)
function initPopupForms() {
    // Exit intent popup
    if (document.querySelector('.exit-intent-popup')) {
        let popupShown = false;
        
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY < 0 && !popupShown && !localStorage.getItem('exitPopupClosed')) {
                showPopup('.exit-intent-popup');
                popupShown = true;
                
                // Track popup display
                trackEvent('popup', 'exit_intent_shown');
            }
        });
    }
    
    // Timed popup
    if (document.querySelector('.timed-popup')) {
        if (!localStorage.getItem('timedPopupClosed')) {
            setTimeout(function() {
                showPopup('.timed-popup');
                
                // Track popup display
                trackEvent('popup', 'timed_popup_shown');
            }, 30000); // Show after 30 seconds
        }
    }
    
    // Scroll depth popup
    if (document.querySelector('.scroll-popup')) {
        let scrollPopupShown = false;
        
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > 50 && !scrollPopupShown && !localStorage.getItem('scrollPopupClosed')) {
                showPopup('.scroll-popup');
                scrollPopupShown = true;
                
                // Track popup display
                trackEvent('popup', 'scroll_popup_shown');
            }
        });
    }
    
    // Initialize popup close buttons
    document.querySelectorAll('.popup-close').forEach(button => {
        button.addEventListener('click', function() {
            const popup = this.closest('.popup');
            hidePopup(popup);
            
            // Store in localStorage to prevent showing again in this session
            if (popup.classList.contains('exit-intent-popup')) {
                localStorage.setItem('exitPopupClosed', 'true');
            } else if (popup.classList.contains('timed-popup')) {
                localStorage.setItem('timedPopupClosed', 'true');
            } else if (popup.classList.contains('scroll-popup')) {
                localStorage.setItem('scrollPopupClosed', 'true');
            }
            
            // Track popup close
            trackEvent('popup', 'popup_closed', popup.getAttribute('data-popup-id'));
        });
    });
    
    // Initialize popup forms
    document.querySelectorAll('.popup-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            const popupId = form.closest('.popup').getAttribute('data-popup-id');
            
            if (validateEmail(email)) {
                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = 'Subscribing...';
                
                // Simulate API call (would be a real API in production)
                setTimeout(function() {
                    // Success state
                    form.innerHTML = `
                        <div class="form-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Thank You for Subscribing!</h3>
                            <p>You've been added to our newsletter. Watch your inbox for high-commission affiliate opportunities and tips.</p>
                        </div>
                    `;
                    
                    // Store in localStorage for demonstration
                    saveSubscriber(email, 'popup_' + popupId);
                    
                    // Trigger analytics event
                    trackEvent('form_submission', 'popup_signup', popupId);
                    
                    // Close popup after delay
                    setTimeout(function() {
                        hidePopup(form.closest('.popup'));
                    }, 3000);
                    
                }, 1500);
            } else {
                // Show error
                showFormError(form, emailInput, 'Please enter a valid email address');
            }
        });
    });
}

// Helper Functions

// Show popup
function showPopup(selector) {
    const popup = document.querySelector(selector);
    if (popup) {
        popup.style.display = 'flex';
        setTimeout(function() {
            popup.classList.add('active');
        }, 10);
    }
}

// Hide popup
function hidePopup(popup) {
    popup.classList.remove('active');
    setTimeout(function() {
        popup.style.display = 'none';
    }, 300);
}

// Validate email
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.toLowerCase());
}

// Show form error
function showFormError(form, input, message) {
    // Remove any existing error messages
    const existingError = input.nextElementSibling;
    if (existingError && existingError.classList.contains('form-error-message')) {
        existingError.remove();
    }
    
    // Create and insert error message
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error-message';
    errorElement.textContent = message;
    input.parentNode.insertBefore(errorElement, input.nextSibling);
    
    // Add error class to input
    input.classList.add('input-error');
    
    // Focus the input
    input.focus();
    
    // Remove error when input changes
    input.addEventListener('input', function() {
        this.classList.remove('input-error');
        if (this.nextElementSibling && this.nextElementSibling.classList.contains('form-error-message')) {
            this.nextElementSibling.remove();
        }
    });
}

// Save subscriber to localStorage (for demonstration)
function saveSubscriber(email, source) {
    const subscriber = {
        email: email,
        source: source,
        timestamp: new Date().toISOString()
    };
    
    let subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
    subscribers.push(subscriber);
    localStorage.setItem('subscribers', JSON.stringify(subscribers));
}

// Save contact message to localStorage (for demonstration)
function saveContactMessage(name, email, message) {
    const contact = {
        name: name,
        email: email,
        message: message,
        timestamp: new Date().toISOString()
    };
    
    let contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contacts.push(contact);
    localStorage.setItem('contacts', JSON.stringify(contacts));
}

// Save lead magnet subscriber to localStorage (for demonstration)
function saveLeadMagnetSubscriber(email, leadMagnetId, leadMagnetTitle) {
    const subscriber = {
        email: email,
        leadMagnetId: leadMagnetId,
        leadMagnetTitle: leadMagnetTitle,
        timestamp: new Date().toISOString()
    };
    
    let leadMagnetSubscribers = JSON.parse(localStorage.getItem('leadMagnetSubscribers') || '[]');
    leadMagnetSubscribers.push(subscriber);
    localStorage.setItem('leadMagnetSubscribers', JSON.stringify(leadMagnetSubscribers));
}

// Track event (would connect to Google Analytics or similar in production)
function trackEvent(category, action, label = '', value = '') {
    console.log(`Event tracked: ${category} - ${action} - ${label} - ${value}`);
    
    // Store in localStorage for demonstration
    const event = {
        category: category,
        action: action,
        label: label,
        value: value,
        timestamp: new Date().toISOString()
    };
    
    let events = JSON.parse(localStorage.getItem('trackedEvents') || '[]');
    events.push(event);
    localStorage.setItem('trackedEvents', JSON.stringify(events));
    
    // In a real implementation, this would send data to Google Analytics or similar
    // Example: gtag('event', action, { 'event_category': category, 'event_label': label, 'value': value });
}

// Email A
(Content truncated due to size limit. Use line ranges to read in chunks)
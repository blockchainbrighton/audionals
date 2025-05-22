// Affiliate Link Tracking Configuration

// Affiliate Program IDs
const AFFILIATE_PROGRAMS = {
    semrush: {
        id: 'semrush',
        name: 'Semrush',
        baseUrl: 'https://www.semrush.com/partner/affiliate/',
        trackingParam: 'ref',
        affiliateId: 'HIGHCOMMISSION',
        commission: '$200 per referral',
        cookieDuration: '10 years'
    },
    shopify: {
        id: 'shopify',
        name: 'Shopify',
        baseUrl: 'https://www.shopify.com/affiliates',
        trackingParam: 'ref',
        affiliateId: 'HIGHCOMMISSION',
        commission: 'Up to $150 per referral',
        cookieDuration: '30 days'
    },
    wpengine: {
        id: 'wpengine',
        name: 'WP Engine',
        baseUrl: 'https://wpengine.com/affiliate/',
        trackingParam: 'affiliate',
        affiliateId: 'HIGHCOMMISSION',
        commission: '$200+ per referral',
        cookieDuration: '180 days'
    }
};

// Tracking Parameters
const UTM_PARAMS = {
    source: 'highcommission',
    medium: 'affiliate',
    campaign: 'high_commission_programs'
};

// Generate Affiliate Links
function generateAffiliateLink(programId, campaignId = '', sourcePage = '') {
    if (!AFFILIATE_PROGRAMS[programId]) {
        console.error(`Program ID ${programId} not found`);
        return '#';
    }
    
    const program = AFFILIATE_PROGRAMS[programId];
    let url = program.baseUrl;
    
    // Add tracking parameter
    url += url.includes('?') ? '&' : '?';
    url += `${program.trackingParam}=${program.affiliateId}`;
    
    // Add UTM parameters
    url += `&utm_source=${UTM_PARAMS.source}`;
    url += `&utm_medium=${UTM_PARAMS.medium}`;
    url += `&utm_campaign=${UTM_PARAMS.campaign}`;
    
    // Add custom campaign ID if provided
    if (campaignId) {
        url += `&utm_content=${campaignId}`;
    }
    
    // Add source page for tracking
    if (sourcePage) {
        url += `&utm_term=${sourcePage}`;
    }
    
    return url;
}

// Track Affiliate Link Clicks
function trackAffiliateClick(programId, linkLocation) {
    // In a real implementation, this would send data to an analytics service
    console.log(`Affiliate link clicked: ${programId} from ${linkLocation}`);
    
    // Store click data in localStorage for demonstration
    const clickData = {
        programId: programId,
        location: linkLocation,
        timestamp: new Date().toISOString()
    };
    
    let clickHistory = JSON.parse(localStorage.getItem('affiliateClicks') || '[]');
    clickHistory.push(clickData);
    localStorage.setItem('affiliateClicks', JSON.stringify(clickHistory));
    
    // Return true to allow the default link behavior
    return true;
}

// Initialize Affiliate Links
document.addEventListener('DOMContentLoaded', function() {
    // Find all affiliate links and add proper URLs and tracking
    const affiliateLinks = document.querySelectorAll('[data-affiliate-program]');
    
    affiliateLinks.forEach(link => {
        const programId = link.getAttribute('data-affiliate-program');
        const campaignId = link.getAttribute('data-campaign-id') || '';
        const sourcePage = link.getAttribute('data-source-page') || window.location.pathname;
        const linkLocation = link.getAttribute('data-link-location') || 'unknown';
        
        // Generate and set the affiliate URL
        const affiliateUrl = generateAffiliateLink(programId, campaignId, sourcePage);
        link.setAttribute('href', affiliateUrl);
        
        // Add click tracking
        link.addEventListener('click', function(e) {
            trackAffiliateClick(programId, linkLocation);
        });
        
        // Add rel attributes for proper SEO
        link.setAttribute('rel', 'nofollow sponsored');
        
        // Add disclosure tooltip if specified
        if (link.hasAttribute('data-show-disclosure')) {
            const disclosureText = 'Affiliate Link';
            const tooltip = document.createElement('span');
            tooltip.className = 'affiliate-disclosure';
            tooltip.textContent = disclosureText;
            link.appendChild(tooltip);
        }
    });
});

// Conversion Tracking Pixel
function loadConversionPixel(programId) {
    if (!AFFILIATE_PROGRAMS[programId]) {
        console.error(`Program ID ${programId} not found for conversion pixel`);
        return;
    }
    
    // In a real implementation, this would load an actual tracking pixel
    console.log(`Loading conversion pixel for ${programId}`);
    
    // Create a mock pixel element
    const pixel = document.createElement('img');
    pixel.style.display = 'none';
    pixel.src = `https://tracking.example.com/pixel.gif?program=${programId}&t=${Date.now()}`;
    document.body.appendChild(pixel);
}

// Cookie Consent for Tracking
function initCookieConsent() {
    // Check if user has already given consent
    if (localStorage.getItem('cookieConsent') === 'accepted') {
        return;
    }
    
    // Create cookie consent banner
    const consentBanner = document.createElement('div');
    consentBanner.className = 'cookie-consent';
    consentBanner.innerHTML = `
        <div class="cookie-content">
            <p>We use cookies to improve your experience and track affiliate referrals. By continuing to use our site, you agree to our <a href="pages/privacy.html">Privacy Policy</a>.</p>
            <div class="cookie-buttons">
                <button class="btn btn-primary cookie-accept">Accept</button>
                <button class="btn btn-outline cookie-decline">Decline</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(consentBanner);
    
    // Add event listeners
    consentBanner.querySelector('.cookie-accept').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'accepted');
        consentBanner.remove();
    });
    
    consentBanner.querySelector('.cookie-decline').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'declined');
        consentBanner.remove();
    });
}

// Initialize cookie consent
document.addEventListener('DOMContentLoaded', initCookieConsent);

// Affiliate Disclosure
function addAffiliateDisclosure() {
    // Add disclosure to pages with affiliate links
    if (document.querySelectorAll('[data-affiliate-program]').length > 0) {
        const disclosure = document.createElement('div');
        disclosure.className = 'affiliate-disclosure-banner';
        disclosure.innerHTML = `
            <p><strong>Disclosure:</strong> This page contains affiliate links. If you click through and make a purchase, we may receive a commission at no additional cost to you. Learn more in our <a href="pages/disclosure.html">Affiliate Disclosure</a>.</p>
        `;
        
        // Insert after the header
        const header = document.querySelector('header');
        if (header && header.nextElementSibling) {
            header.parentNode.insertBefore(disclosure, header.nextElementSibling);
        } else {
            document.body.prepend(disclosure);
        }
    }
}

// Add affiliate disclosure
document.addEventListener('DOMContentLoaded', addAffiliateDisclosure);

// Analytics Integration
function initAnalytics() {
    // In a real implementation, this would initialize Google Analytics or similar
    console.log('Initializing analytics');
    
    // Track page views
    trackPageView();
    
    // Track events like scroll depth, time on page, etc.
    initEventTracking();
}

function trackPageView() {
    const pageData = {
        page: window.location.pathname,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
    };
    
    console.log('Page view:', pageData);
    
    // Store in localStorage for demonstration
    let pageViews = JSON.parse(localStorage.getItem('pageViews') || '[]');
    pageViews.push(pageData);
    localStorage.setItem('pageViews', JSON.stringify(pageViews));
}

function initEventTracking() {
    // Track scroll depth
    let scrollDepthMarkers = [25, 50, 75, 100];
    let scrollDepthReached = [];
    
    window.addEventListener('scroll', function() {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        scrollDepthMarkers.forEach(marker => {
            if (scrollPercent >= marker && !scrollDepthReached.includes(marker)) {
                scrollDepthReached.push(marker);
                trackEvent('scroll_depth', `${marker}%`);
            }
        });
    });
    
    // Track time on page
    let timeMarkers = [30, 60, 120, 300]; // seconds
    let timeMarkersReached = [];
    let startTime = Date.now();
    
    let timeInterval = setInterval(function() {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);
        
        timeMarkers.forEach(marker => {
            if (timeOnPage >= marker && !timeMarkersReached.includes(marker)) {
                timeMarkersReached.push(marker);
                trackEvent('time_on_page', `${marker}s`);
            }
        });
    }, 1000);
    
    // Clear interval when page is unloaded
    window.addEventListener('beforeunload', function() {
        clearInterval(timeInterval);
        trackEvent('page_exit', `${Math.round((Date.now() - startTime) / 1000)}s`);
    });
}

function trackEvent(category, action, label = '', value = '') {
    const eventData = {
        category: category,
        action: action,
        label: label,
        value: value,
        timestamp: new Date().toISOString()
    };
    
    console.log('Event tracked:', eventData);
    
    // Store in localStorage for demonstration
    let events = JSON.parse(localStorage.getItem('events') || '[]');
    events.push(eventData);
    localStorage.setItem('events', JSON.stringify(events));
}

// Initialize analytics
document.addEventListener('DOMContentLoaded', initAnalytics);

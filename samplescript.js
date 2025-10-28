// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Get essential data from URL parameters ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const emailFromUrl = params.get('email');
    const googleNameFromUrl = params.get('name');
    const ratingFromUrl = parseFloat(params.get('rating') || '0');
    const reviewsFromUrl = parseInt(params.get('reviews') || '0', 10);
    const displayNameFromUrl = params.get('displayName');
    const phoneNumberFromUrl = params.get('phoneNumber');

    let reviewUrl = '';

    // --- Function to Trigger Background Save ---
    const saveCustomDetailsInBackground = (pId, dispName, phoneNum) => {
        // This function can still be used, but we'll call it just before checkout.
        if (!pId) return;

        fetch('/.netlify/functions/update-signup-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                placeId: pId,
                displayName: dispName || '',
                phoneNumber: phoneNum || ''
            })
        })
        .then(response => response.json())
        .then(data => console.log('Background save status:', data.message))
        .catch(error => console.error('Error saving details in background:', error));
    };
    
    // --- NEW: Function to handle live preview updates ---
    const initLivePreviewUpdates = () => {
        const displayNameInput = document.getElementById('display-name');
        const phoneNumberInput = document.getElementById('phone-number');
        const liveSampleName = document.getElementById('live-sample-name');
        const liveSamplePhone = document.getElementById('live-sample-phone');

        if (displayNameInput && liveSampleName) {
            displayNameInput.addEventListener('input', () => {
                liveSampleName.textContent = displayNameInput.value;
            });
        }
        if (phoneNumberInput && liveSamplePhone) {
            phoneNumberInput.addEventListener('input', () => {
                liveSamplePhone.textContent = phoneNumberInput.value;
            });
        }
    };

    // --- MODIFIED: Function to populate page elements including new inputs ---
    const populatePageElements = () => {
        const nameToDisplay = displayNameFromUrl || googleNameFromUrl || 'Business Name';
        const phoneToDisplay = phoneNumberFromUrl || '';

        // Populate Headers and Mobile Bar
        document.getElementById('business-name-header').textContent = nameToDisplay;
        document.querySelector('.business-name-preview').textContent = nameToDisplay;
        
        // Populate Live Preview Text on Card
        document.getElementById('live-sample-name').textContent = nameToDisplay;
        document.getElementById('live-sample-phone').textContent = phoneToDisplay;

        // NEW: Populate the input fields themselves with the correct initial values
        document.getElementById('display-name').value = nameToDisplay;
        document.getElementById('phone-number').value = phoneToDisplay;

        // Set Google Review Links
        if (placeId) {
            reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        }

        // Initialize QR Codes, Countdown, and other UI elements
        generateQRCodes();
        initCountdown();
        initDashboardTabs();
        initFooter();
        initEarlyCtaScroll();
        
        // NEW: Initialize the live preview event listeners
        initLivePreviewUpdates();
        
        // MODIFIED: This function now attaches smart click handlers instead of static links
        initSmartCheckoutLinks();
    };

    // --- MODIFIED: This function now builds the URL on click with the latest data ---
    const initSmartCheckoutLinks = () => {
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
        const displayNameInput = document.getElementById('display-name');
        const phoneNumberInput = document.getElementById('phone-number');
        
        if (!placeId || !emailFromUrl) {
            console.error("Missing placeId or email for checkout links.");
            checkoutButtons.forEach(button => {
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.5';
            });
            return;
        }

        checkoutButtons.forEach(button => {
            // Use a click event listener instead of just setting href
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent the default link behavior
                
                // Get the final, current values from the input fields
                const finalDisplayName = displayNameInput.value;
                const finalPhoneNumber = phoneNumberInput.value;

                // Save latest customizations in the background right before leaving
                saveCustomDetailsInBackground(placeId, finalDisplayName, finalPhoneNumber);
                
                // Construct the checkout URL
                const checkoutUrl = new URL('checkout.html', window.location.origin);
                checkoutUrl.searchParams.set('placeId', placeId);
                checkoutUrl.searchParams.set('email', emailFromUrl);
                
                // Navigate to the checkout page
                window.location.href = checkoutUrl.toString();
            });
        });
    };

    // --- All other helper functions remain largely unchanged ---
    const generateQRCodes = () => {
        if (!reviewUrl) return;
        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
            bonusQrContainer.innerHTML = '';
            new QRCode(bonusQrContainer, { text: reviewUrl, width: 75, height: 75, colorDark: "#282a2e", colorLight: "#d7d5d1", correctLevel: QRCode.CorrectLevel.H });
        }
        const liveSampleQrContainer = document.getElementById('live-sample-qr-code');
        if (liveSampleQrContainer) {
            liveSampleQrContainer.innerHTML = '';
            new QRCode(liveSampleQrContainer, { text: reviewUrl, width: 800, height: 800, colorDark: "#191718", colorLight: "#E6E8E7", correctLevel: QRCode.CorrectLevel.H });
        }
    };

    const initCountdown = async () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer');
        const countdownPromptEl = document.querySelector('.countdown-prompt');
        const hideTimer = () => {
            if (countdownTimerEl) countdownTimerEl.style.display = 'none';
            if (countdownPromptEl) countdownPromptEl.style.display = 'none';
        };
        if (!placeId || !hoursEl || !minutesEl || !secondsEl) {
            hideTimer();
            return;
        }
        try {
            const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${placeId}`);
            if (!response.ok) throw new Error('Failed to fetch signup data');
            const data = await response.json();
            if (!data.timestamp || typeof data.timestamp._seconds !== 'number') {
                throw new Error('Invalid timestamp');
            }
            const targetTime = new Date(data.timestamp._seconds * 1000).getTime() + 12 * 60 * 60 * 1000;
            const updateTimer = () => {
                const distance = targetTime - Date.now();
                if (distance < 0) {
                    clearInterval(updateTimerInterval);
                    hideTimer();
                    return;
                }
                hoursEl.textContent = String(Math.floor(distance / (1000 * 60 * 60))).padStart(2, '0');
                minutesEl.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                secondsEl.textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
            };
            updateTimer();
            var updateTimerInterval = setInterval(updateTimer, 1000);
        } catch (error) {
            console.error("Countdown Error:", error.message);
            hideTimer();
        }
    };
    
    const initDashboardTabs = () => {
        const tabsContainer = document.querySelector('.dashboard-tabs'); if (!tabsContainer) return; const panels = document.querySelectorAll('.dashboard-panel'); const tabs = document.querySelectorAll('.dashboard-tab'); tabsContainer.addEventListener('click', (e) => { const clickedTab = e.target.closest('.dashboard-tab'); if (!clickedTab || clickedTab.classList.contains('active')) return; tabs.forEach(t => t.classList.remove('active')); panels.forEach(p => p.classList.remove('active')); clickedTab.classList.add('active'); const targetPanelId = clickedTab.dataset.tab; const targetPanel = document.getElementById(targetPanelId); if (targetPanel) targetPanel.classList.add('active'); });
    };

    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    };
    
    const initEarlyCtaScroll = () => {
        const scrollButtons = document.querySelectorAll('.js-scroll-to-cta'); const targetSection = document.getElementById('cta-section'); if (!targetSection) return; if (scrollButtons.length > 0) { scrollButtons.forEach(button => { button.addEventListener('click', (event) => { event.preventDefault(); targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }); }
    };

    // --- Main Initialization Logic ---
    const initializePage = () => {
        if (!placeId) {
            console.error("Cannot initialize page: Place ID missing from URL.");
            document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Missing required information to load this page.</p>';
            return;
        }
        
        // This single function now handles setting up almost the entire page.
        populatePageElements();

        // The background email trigger is no longer needed here, as it's better handled
        // after a successful checkout.
    };

    initializePage(); // Start the process
});
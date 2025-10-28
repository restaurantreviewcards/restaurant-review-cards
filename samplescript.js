// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Get essential data from URL parameters ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const emailFromUrl = params.get('email');
    const googleNameFromUrl = params.get('name'); // Original Google name
    const ratingFromUrl = parseFloat(params.get('rating') || '0');
    const reviewsFromUrl = parseInt(params.get('reviews') || '0', 10);
    const displayNameFromUrl = params.get('displayName'); // Potentially customized name
    const phoneNumberFromUrl = params.get('phoneNumber'); // Potentially customized phone

    let reviewUrl = ''; // Initialize review URL

    // --- Function to Trigger Background Save ---
    const saveCustomDetailsInBackground = (pId, dispName, phoneNum) => {
        // Only proceed if there's potentially custom data to save
        if (!dispName && !phoneNum) return; // Nothing custom entered

        fetch('/.netlify/functions/update-signup-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                placeId: pId,
                displayName: dispName || '', // Send even if only phone changed
                phoneNumber: phoneNum || '' // Send empty string if cleared
            })
        })
        .then(response => response.json())
        .then(data => console.log('Background save status:', data.message))
        .catch(error => console.error('Error saving details in background:', error));
    };

    // --- Function to Trigger Welcome Email ---
    const triggerWelcomeEmail = (pId) => {
        fetch('/.netlify/functions/trigger-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: pId })
        })
        .then(response => response.json())
        .then(data => console.log('Welcome email trigger status:', data.message))
        .catch(error => console.error('Error triggering welcome email:', error));
    };

    // --- Function to populate page elements using URL data ---
    const populatePageElements = () => {
        // Determine Name to Display (prioritize displayName from URL)
        const nameToDisplay = displayNameFromUrl || googleNameFromUrl || 'Business Name';
        const phoneToDisplay = phoneNumberFromUrl || ''; // Use phone from URL if present

        // Populate Headers and Mobile Bar
        if (document.getElementById('business-name-header')) {
            document.getElementById('business-name-header').textContent = nameToDisplay;
        }
        if (document.querySelector('.business-name-preview')) {
            document.querySelector('.business-name-preview').textContent = nameToDisplay;
        }

        // --- Populate Transposed Text on Card ---
        const nameElement = document.getElementById('live-sample-name');
        const phoneElement = document.getElementById('live-sample-phone');

        if (nameElement) {
            nameElement.textContent = nameToDisplay;
        }
        if (phoneElement) {
            phoneElement.textContent = phoneToDisplay;
            // Optionally hide if empty: phoneElement.style.display = phoneToDisplay ? '' : 'none';
        }

        // --- Set Google Review Links (using placeId from URL) ---
        if (placeId) {
            reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
            const googleReviewPageLink = document.getElementById('google-review-page-link');
            if (googleReviewPageLink) {
                googleReviewPageLink.href = reviewUrl;
            }
        } else {
            // Disable link if placeId missing (should have been caught earlier)
            const googleReviewPageLink = document.getElementById('google-review-page-link');
            if (googleReviewPageLink) {
                 googleReviewPageLink.style.pointerEvents = 'none';
                 googleReviewPageLink.style.color = 'var(--text-light)';
                 googleReviewPageLink.removeAttribute('href');
            }
        }

        // --- Set Edit Button Link ---
        const editButton = document.getElementById('edit-card-btn');
        if (editButton && placeId && emailFromUrl && googleNameFromUrl) {
            const builderUrl = new URL('card-builder.html', window.location.origin);
            builderUrl.searchParams.set('placeId', placeId);
            builderUrl.searchParams.set('email', emailFromUrl);
            builderUrl.searchParams.set('googleName', googleNameFromUrl); // Original name
            builderUrl.searchParams.set('rating', ratingFromUrl.toString());
            builderUrl.searchParams.set('reviews', reviewsFromUrl.toString());
            // Pass the CURRENTLY displayed name and phone back
            builderUrl.searchParams.set('displayName', nameToDisplay);
            if (phoneToDisplay) {
                builderUrl.searchParams.set('phoneNumber', phoneToDisplay);
            }
            editButton.href = builderUrl.toString();
        } else if (editButton) {
            editButton.style.display = 'none'; // Hide if essential info missing
        }

        // --- Initialize QR Codes (uses global reviewUrl) ---
        generateQRCodes();

        // --- Initialize Checkout Links (uses global placeId and emailFromUrl) ---
        initCheckoutLinks();

        // --- Initialize Countdown (now fetches its own data) ---
        initCountdown();
    };

    // --- Function to generate QR Codes ---
    const generateQRCodes = () => {
        if (!reviewUrl) {
             console.error("Cannot generate QR codes: reviewUrl is not set.");
             return;
        }
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

    // --- Function to initialize Countdown (fetches its own data) ---
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

        // Use the globally read placeId
        if (!placeId || !hoursEl || !minutesEl || !secondsEl || !countdownTimerEl || !countdownPromptEl) {
             console.log("Countdown prerequisites not met (missing placeId or elements). Hiding timer.");
             hideTimer();
             return;
        }

        try {
            // Fetch data specifically for countdown
            const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${placeId}`);
            if (!response.ok) throw new Error('Failed to fetch signup data for countdown');
            const data = await response.json();

            if (!data.timestamp || typeof data.timestamp._seconds !== 'number') {
                throw new Error('Invalid or missing timestamp format for countdown.');
            }

            const signupTime = new Date(data.timestamp._seconds * 1000);
            const targetTime = signupTime.getTime() + 12 * 60 * 60 * 1000; // 12 hours
            const formatTimeUnit = (unit) => String(unit).padStart(2, '0');

            let updateTimerInterval;
            const updateTimer = () => {
                const distance = targetTime - Date.now();
                if (distance < 0) { clearInterval(updateTimerInterval); hideTimer(); return; }
                const hours = Math.floor(distance / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                hoursEl.textContent = formatTimeUnit(hours);
                minutesEl.textContent = formatTimeUnit(minutes);
                secondsEl.textContent = formatTimeUnit(seconds);
            };
            updateTimer();
            updateTimerInterval = setInterval(updateTimer, 1000);

        } catch (error) {
            console.error("Countdown Error:", error.message);
            hideTimer();
        }
    };

    // --- Other Init Functions (Tabs, Footer, Checkout, Scroll) ---
    const initDashboardTabs = () => { /* ... unchanged ... */
        const tabsContainer = document.querySelector('.dashboard-tabs'); if (!tabsContainer) return; const panels = document.querySelectorAll('.dashboard-panel'); const tabs = document.querySelectorAll('.dashboard-tab'); tabsContainer.addEventListener('click', (e) => { const clickedTab = e.target.closest('.dashboard-tab'); if (!clickedTab || clickedTab.classList.contains('active')) return; tabs.forEach(t => t.classList.remove('active')); panels.forEach(p => p.classList.remove('active')); clickedTab.classList.add('active'); const targetPanelId = clickedTab.dataset.tab; const targetPanel = document.getElementById(targetPanelId); if (targetPanel) targetPanel.classList.add('active'); });
    };
    const initFooter = () => { /* ... unchanged ... */
        const yearSpan = document.getElementById('copyright-year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    };
    const initCheckoutLinks = () => { /* Uses global placeId and emailFromUrl */
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
        if (checkoutButtons.length > 0) {
            if (!placeId || !emailFromUrl) {
                console.error("Missing placeId or email for checkout links.");
                checkoutButtons.forEach(button => { button.style.pointerEvents = 'none'; button.style.opacity = '0.5'; button.textContent = 'Info Missing'; });
                return;
            }
            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(emailFromUrl)}`;
            checkoutButtons.forEach(button => { button.href = checkoutUrl; });
        }
    };
    const initEarlyCtaScroll = () => { /* ... unchanged ... */
        const scrollButtons = document.querySelectorAll('.js-scroll-to-cta'); const targetSection = document.getElementById('cta-section'); if (!targetSection) { console.log("Target CTA section not found"); return; } if (scrollButtons.length > 0) { scrollButtons.forEach(button => { button.addEventListener('click', (event) => { event.preventDefault(); targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }); } else { console.log("No scroll-to-cta buttons found"); }
    };


    // --- Main Initialization Logic ---
    const initializePage = () => {
        // Basic check for essential ID at the start
        if (!placeId) {
            console.error("Cannot initialize page: Place ID missing from URL.");
            document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Missing required information to load this page.</p>';
            // Disable specific elements that rely on placeId early
             const googleReviewPageLink = document.getElementById('google-review-page-link');
             if (googleReviewPageLink) { googleReviewPageLink.style.display = 'none';}
             const editButton = document.getElementById('edit-card-btn');
             if (editButton) { editButton.style.display = 'none'; }
             initCheckoutLinks(); // This will disable checkout links internally if needed
            return;
        }

        // 1. Populate page immediately using URL parameters
        populatePageElements(); // Handles snapshot (removed), text, links, QR, checkout, countdown

        // 2. Trigger background save using URL parameters
        // Pass displayNameFromUrl and phoneNumberFromUrl
        saveCustomDetailsInBackground(placeId, displayNameFromUrl, phoneNumberFromUrl);

        // 3. Trigger Welcome Email (only needs placeId)
        triggerWelcomeEmail(placeId);

        // 4. Initialize remaining UI elements
        initDashboardTabs();
        initFooter();
        initEarlyCtaScroll();
    };

    initializePage(); // Start the process

});
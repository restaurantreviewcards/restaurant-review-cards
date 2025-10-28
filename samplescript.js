// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Global variable for fetched data ---
    let signupData = null;

    // --- Get essential IDs from URL ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const emailFromUrl = params.get('email'); // Still needed for checkout link construction initially

    let reviewUrl = ''; // Initialize review URL

    // --- Function to fetch latest data from backend ---
    const fetchLatestData = async (pId) => {
        try {
            // Use get-signup-data as it returns the full document
            const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${pId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Could not load signup data.');
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching latest signup data:", error);
            // Display error to user
            document.body.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Error loading sample data: ${error.message}. Please try again.</p>`;
            return null; // Indicate failure
        }
    };

    // --- Function to populate page elements using fetched data ---
    const populatePageElements = () => {
        if (!signupData) {
            console.error("Cannot populate page: signupData is null.");
            return; // Don't proceed if data fetching failed
        }

        // --- Determine Name to Display ---
        // Use customDisplayName if available, else googlePlaceName, else fallback
        const nameToDisplay = signupData.customDisplayName || signupData.googlePlaceName || 'Business Name';

        // Populate Headers and Mobile Bar
        if (document.getElementById('business-name-header')) {
            document.getElementById('business-name-header').textContent = nameToDisplay;
        }
        if (document.querySelector('.business-name-preview')) {
            document.querySelector('.business-name-preview').textContent = nameToDisplay;
        }

        // --- Populate Google Snapshot (Removed from HTML, so code can be removed/commented) ---
        /*
        const rating = parseFloat(signupData.googleRating); // Use fetched rating
        const reviews = parseInt(signupData.googleReviewCountCurrent || signupData.googleReviewCount || '0', 10); // Use current count if available

        const ratingValueEl = document.getElementById('google-rating-value');
        const starContainer = document.getElementById('star-rating-container');
        const reviewCountEl = document.getElementById('google-review-count');

        // Logic for snapshot display
        if (!reviews || reviews === 0 || isNaN(reviews)) {
            // ... (Snapshot zero review logic) ...
        } else {
            // ... (Snapshot normal logic with rating and stars) ...
        }
        */

        // --- Populate Transposed Text on Card ---
        const nameElement = document.getElementById('live-sample-name');
        const phoneElement = document.getElementById('live-sample-phone');
        // Use saved custom phone if exists, otherwise empty string
        const phoneToDisplay = signupData.customPhoneNumber || '';

        if (nameElement) {
            nameElement.textContent = nameToDisplay;
        }
        if (phoneElement) {
            phoneElement.textContent = phoneToDisplay;
            // Optionally hide if empty: phoneElement.style.display = phoneToDisplay ? '' : 'none';
        }

        // --- Set Google Review Links ---
        // Uses the correct googlePlaceId from fetched data
        if (signupData.googlePlaceId) {
            reviewUrl = `https://search.google.com/local/writereview?placeid=${signupData.googlePlaceId}`;
            const googleReviewPageLink = document.getElementById('google-review-page-link');
            if (googleReviewPageLink) {
                googleReviewPageLink.href = reviewUrl;
            }
        } else {
            console.error("googlePlaceId missing from fetched data. Cannot set review links.");
            reviewUrl = ''; // Ensure reviewUrl is empty if placeId is missing
            const googleReviewPageLink = document.getElementById('google-review-page-link');
            if (googleReviewPageLink) {
                 googleReviewPageLink.style.pointerEvents = 'none';
                 googleReviewPageLink.style.color = 'var(--text-light)';
                 googleReviewPageLink.removeAttribute('href');
            }
        }


        // --- Set Edit Button Link ---
        const editButton = document.getElementById('edit-card-btn');
        if (editButton && signupData) { // Check if button and data exist
            const builderUrl = new URL('card-builder.html', window.location.origin);
            // Pass all necessary original data back
            builderUrl.searchParams.set('placeId', signupData.googlePlaceId);
            builderUrl.searchParams.set('email', signupData.email); // Use fetched email
            builderUrl.searchParams.set('googleName', signupData.googlePlaceName);
            builderUrl.searchParams.set('rating', signupData.googleRating ? signupData.googleRating.toString() : '0');
            builderUrl.searchParams.set('reviews', signupData.googleReviewCount ? signupData.googleReviewCount.toString() : '0');
            // Pass the CURRENTLY displayed name and phone back
            builderUrl.searchParams.set('displayName', nameToDisplay);
            if (phoneToDisplay) { // Only pass if it exists and isn't empty
                builderUrl.searchParams.set('phoneNumber', phoneToDisplay);
            }
            editButton.href = builderUrl.toString();
        } else if (editButton) {
            // Disable button if data fetch failed or button doesn't exist
            editButton.style.display = 'none';
        }

        // --- Re-initialize QR Codes with correct reviewUrl ---
        generateQRCodes();

        // --- Initialize Checkout Links using fetched data/URL params ---
        // (Uses global placeId and emailFromUrl read at the start)
        initCheckoutLinks();

        // --- Initialize Countdown using fetched data ---
        // (Passes signupData directly to avoid re-fetching)
        initCountdown(signupData);

    };

    // --- Function to generate QR Codes (now uses global reviewUrl) ---
    const generateQRCodes = () => {
        if (!reviewUrl) {
             console.error("Cannot generate QR codes: reviewUrl is not set (likely missing placeId).");
             return;
        }
        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
             bonusQrContainer.innerHTML = '';
             new QRCode(bonusQrContainer, { text: reviewUrl, width: 75, height: 75, colorDark: "#282a2e", colorLight: "#d7d5d1", correctLevel: QRCode.CorrectLevel.H });
        } else { console.warn("Bonus QR container not found."); }

        const liveSampleQrContainer = document.getElementById('live-sample-qr-code');
        if (liveSampleQrContainer) {
            liveSampleQrContainer.innerHTML = '';
            new QRCode(liveSampleQrContainer, { text: reviewUrl, width: 800, height: 800, colorDark: "#191718", colorLight: "#E6E8E7", correctLevel: QRCode.CorrectLevel.H });
        } else { console.warn("Live sample QR container not found."); }
    };

    // --- Function to initialize Countdown (now accepts data) ---
    const initCountdown = async (fetchedSignupData) => { // Accepts data as argument
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer');
        const countdownPromptEl = document.querySelector('.countdown-prompt');

        const hideTimer = () => {
            if (countdownTimerEl) countdownTimerEl.style.display = 'none';
            if (countdownPromptEl) countdownPromptEl.style.display = 'none';
        };

        if (!fetchedSignupData || !fetchedSignupData.timestamp || !hoursEl || !minutesEl || !secondsEl || !countdownTimerEl || !countdownPromptEl) {
             console.log("Countdown prerequisites not met (missing data, timestamp or elements). Hiding timer.");
             hideTimer();
             return;
        }

        try {
            const data = fetchedSignupData;

            if (typeof data.timestamp._seconds !== 'number') {
                throw new Error('Invalid or missing timestamp format for countdown.');
            }

            const signupTime = new Date(data.timestamp._seconds * 1000);
            const targetTime = signupTime.getTime() + 12 * 60 * 60 * 1000; // 12 hours
            const formatTimeUnit = (unit) => String(unit).padStart(2, '0');

            let updateTimerInterval;
            const updateTimer = () => {
                const distance = targetTime - Date.now();
                if (distance < 0) {
                    clearInterval(updateTimerInterval);
                    hideTimer();
                    return;
                }
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
                return; // Stop if essential info is missing from URL
            }
            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(emailFromUrl)}`;
            checkoutButtons.forEach(button => { button.href = checkoutUrl; });
        }
    };
    const initEarlyCtaScroll = () => { /* ... unchanged ... */
        const scrollButtons = document.querySelectorAll('.js-scroll-to-cta'); const targetSection = document.getElementById('cta-section'); if (!targetSection) { console.log("Target CTA section not found"); return; } if (scrollButtons.length > 0) { scrollButtons.forEach(button => { button.addEventListener('click', (event) => { event.preventDefault(); targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }); } else { console.log("No scroll-to-cta buttons found"); }
    };


    // --- Main Initialization Logic ---
    const initializePage = async () => {
        if (!placeId) {
            console.error("Cannot initialize page: Place ID missing from URL.");
            document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Missing required information to load this page.</p>';
            return;
        }

        // 1. Fetch the latest data
        signupData = await fetchLatestData(placeId);

        // 2. If fetch succeeded, populate the page
        if (signupData) {
            populatePageElements(); // This now handles snapshot, transposed text, review links, QR, checkout, countdown

             // 3. Trigger Welcome Email (only needs placeId)
            fetch('/.netlify/functions/trigger-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId: placeId })
            })
            .then(response => response.json())
            .then(data => console.log('Welcome email trigger status:', data.message))
            .catch(error => console.error('Error triggering welcome email:', error));

            // 4. Initialize remaining UI elements
            initDashboardTabs();
            initFooter();
            initEarlyCtaScroll();
        }
        // If fetch failed, an error message is already shown by fetchLatestData
    };

    initializePage(); // Start the process

});
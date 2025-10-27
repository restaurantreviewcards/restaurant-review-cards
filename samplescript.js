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
            // Display error to user? Or fallback gracefully?
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

        // --- Populate Google Snapshot ---
        const rating = parseFloat(signupData.googleRating); // Use fetched rating
        const reviews = parseInt(signupData.googleReviewCountCurrent || signupData.googleReviewCount || '0', 10); // Use current count if available

        const ratingValueEl = document.getElementById('google-rating-value');
        const starContainer = document.getElementById('star-rating-container');
        const reviewCountEl = document.getElementById('google-review-count');

        // Logic for snapshot display
        if (!reviews || reviews === 0 || isNaN(reviews)) {
            if(ratingValueEl) ratingValueEl.textContent = 'No reviews yet';
            if(starContainer) starContainer.innerHTML = ''; // Hide stars
            if(reviewCountEl) reviewCountEl.textContent = ''; // Hide count link text
            if(reviewCountEl && reviewCountEl.tagName === 'A') { /* Disable link styling */
                reviewCountEl.style.pointerEvents = 'none'; reviewCountEl.style.color = 'inherit'; reviewCountEl.style.textDecoration = 'none';
            }
        } else {
            if(ratingValueEl && !isNaN(rating)) { ratingValueEl.textContent = rating.toFixed(1); }
            else if (ratingValueEl) { ratingValueEl.textContent = 'N/A'; }

            if(reviewCountEl) reviewCountEl.textContent = `(${reviews.toLocaleString()})`;

            if (starContainer && !isNaN(rating)) { /* Generate Stars */
                starContainer.innerHTML = ''; const fullStars = Math.floor(rating);
                for (let i = 0; i < 5; i++) { if (i < fullStars) { starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>'; } else { starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>'; } }
            } else if (starContainer) { /* Show empty stars if rating invalid */
                 starContainer.innerHTML = ''; for (let i = 0; i < 5; i++) { starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>'; }
            }
        }

        // --- Populate Transposed Text on Card ---
        const nameElement = document.getElementById('live-sample-name');
        const phoneElement = document.getElementById('live-sample-phone');
        const phoneToDisplay = signupData.customPhoneNumber || ''; // Use saved custom phone if exists

        if (nameElement) {
            nameElement.textContent = nameToDisplay;
        }
        if (phoneElement) {
            phoneElement.textContent = phoneToDisplay;
            // Optionally hide if empty: phoneElement.style.display = phoneToDisplay ? '' : 'none';
        }

        // --- Set Google Review Links ---
        // Uses the correct googlePlaceId from fetched data
        reviewUrl = `https://search.google.com/local/writereview?placeid=${signupData.googlePlaceId}`;
        const googleReviewPageLink = document.getElementById('google-review-page-link');
        if (googleReviewPageLink) {
            googleReviewPageLink.href = reviewUrl;
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

        if (!fetchedSignupData || !hoursEl || !minutesEl || !secondsEl || !countdownTimerEl || !countdownPromptEl) {
             console.log("Countdown prerequisites not met (missing data or elements). Hiding timer.");
             hideTimer();
             return;
        }

        try {
            // Use the timestamp from the passed data
            const data = fetchedSignupData;

            if (!data.timestamp || typeof data.timestamp._seconds !== 'number') {
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
    // (These remain mostly the same, initCheckoutLinks updated slightly)
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
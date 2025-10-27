// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DYNAMICALLY GENERATE THE GOOGLE REVIEW URL ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    let reviewUrl = ''; // Initialize the variable

    const googleReviewPageLink = document.getElementById('google-review-page-link'); // Find the inline link

    if (placeId) {
        reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        // Set the href for the new inline link
        if (googleReviewPageLink) {
            googleReviewPageLink.href = reviewUrl;
        }

        // --- NEW: Trigger Welcome Email ---
        // We only trigger if placeId exists
        fetch('/.netlify/functions/trigger-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: placeId })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Welcome email trigger status:', data.message);
        })
        .catch(error => {
            console.error('Error triggering welcome email:', error);
            // Don't show error to user, just log it
        });
        // --- END NEW ---

    } else {
        console.error("Place ID missing from URL. QR codes, links, and email trigger will not function correctly.");
        // Disable the inline link if no Place ID
        if (googleReviewPageLink) {
             googleReviewPageLink.style.pointerEvents = 'none'; // Make unclickable
             googleReviewPageLink.style.color = 'var(--text-light)'; // Make look less like a link
             googleReviewPageLink.removeAttribute('href');
        }
        // Also disable checkout buttons if placeId is missing right away
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
         checkoutButtons.forEach(button => {
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            button.textContent = 'Info Missing';
         });
    }

    const populateSampleData = () => {
        // Now read params again inside, or pass them in, but reading again is fine
        const currentParams = new URLSearchParams(window.location.search);
        const name = currentParams.get('name'); // Original Google Name from generate-sample
        const rating = parseFloat(currentParams.get('rating'));
        const reviews = parseInt(currentParams.get('reviews'));

        // Get Custom Name and Phone from builder page
        const displayNameParam = currentParams.get('displayName');
        const phoneParam = currentParams.get('phoneNumber');

        // Use displayNameParam if available, otherwise fallback to original Google name
        const nameToDisplay = displayNameParam || name || 'Business Name'; // Fallback added

        // --- Populate Business Names (Header & Mobile Bar) ---
        if (document.getElementById('business-name-header')) {
            document.getElementById('business-name-header').textContent = nameToDisplay;
        }
        if (document.querySelector('.business-name-preview')) {
            document.querySelector('.business-name-preview').textContent = nameToDisplay;
        }

        // --- Get DOM Elements for the Snapshot ---
        const ratingValueEl = document.getElementById('google-rating-value');
        const starContainer = document.getElementById('star-rating-container');
        const reviewCountEl = document.getElementById('google-review-count');

        // --- Logic to Handle Zero Reviews vs. Existing Reviews ---
        if (!reviews || reviews === 0 || isNaN(reviews)) {
            if(ratingValueEl) ratingValueEl.textContent = 'No reviews yet';
            if(starContainer) starContainer.innerHTML = '';
            if(reviewCountEl) reviewCountEl.textContent = '';

            if(reviewCountEl && reviewCountEl.tagName === 'A') {
                reviewCountEl.style.pointerEvents = 'none';
                reviewCountEl.style.color = 'inherit';
                reviewCountEl.style.textDecoration = 'none';
            }

        } else {
            if(ratingValueEl && !isNaN(rating)) {
                 ratingValueEl.textContent = rating.toFixed(1);
            } else if (ratingValueEl) {
                 ratingValueEl.textContent = 'N/A';
            }

            if(reviewCountEl) reviewCountEl.textContent = `(${reviews.toLocaleString()})`;

            if (starContainer && !isNaN(rating)) {
                starContainer.innerHTML = '';
                const fullStars = Math.floor(rating);

                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    } else {
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    }
                }
            } else if (starContainer) {
                 starContainer.innerHTML = '';
                 for (let i = 0; i < 5; i++) {
                    starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                 }
            }
        }

        // --- Populate Transposed Text on Card ---
        const nameElement = document.getElementById('live-sample-name');
        const phoneElement = document.getElementById('live-sample-phone');

        if (nameElement) {
            nameElement.textContent = nameToDisplay;
        }
        if (phoneElement && phoneParam) {
            phoneElement.textContent = phoneParam;
        } else if (phoneElement) {
            phoneElement.textContent = '';
        }
    };

    const generateQRCodes = () => {
        // Use the globally defined reviewUrl (set based on placeId)
        if (!reviewUrl) {
             console.error("Cannot generate QR codes: reviewUrl is not set.");
             return;
        }

        // Bonus Stand QR Code
        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
             bonusQrContainer.innerHTML = '';
            new QRCode(bonusQrContainer, {
                text: reviewUrl, width: 75, height: 75,
                colorDark: "#282a2e", colorLight: "#d7d5d1",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            console.warn("Bonus QR container not found.");
        }

        // Live Sample QR Code
        const liveSampleQrContainer = document.getElementById('live-sample-qr-code');
        if (liveSampleQrContainer) {
            liveSampleQrContainer.innerHTML = '';
            new QRCode(liveSampleQrContainer, {
                text: reviewUrl, width: 800, height: 800,
                colorDark: "#191718", colorLight: "#E6E8E7",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
             console.warn("Live sample QR container not found.");
        }
    };

    const initCountdown = async () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer');
        const countdownPromptEl = document.querySelector('.countdown-prompt');

        // Use the globally defined placeId
        if (!placeId || !hoursEl || !minutesEl || !secondsEl || !countdownTimerEl || !countdownPromptEl) {
             console.log("Countdown prerequisites not met (missing placeId or elements). Hiding timer.");
             const hideTimer = () => {
                 if (countdownTimerEl) countdownTimerEl.style.display = 'none';
                 if (countdownPromptEl) countdownPromptEl.style.display = 'none';
             };
             hideTimer();
             return;
        }

        const hideTimer = () => {
            if (countdownTimerEl) countdownTimerEl.style.display = 'none';
            if (countdownPromptEl) countdownPromptEl.style.display = 'none';
        };

        try {
            const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${placeId}`);
            if (!response.ok) {
                let errorMsg = 'Failed to fetch signup data for countdown';
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch(e) {}
                throw new Error(errorMsg);
            }
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

    const initDashboardTabs = () => {
        const tabsContainer = document.querySelector('.dashboard-tabs');
        if (!tabsContainer) return;
        const panels = document.querySelectorAll('.dashboard-panel');
        const tabs = document.querySelectorAll('.dashboard-tab');
        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.dashboard-tab');
            if (!clickedTab || clickedTab.classList.contains('active')) return;
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            clickedTab.classList.add('active');
            const targetPanelId = clickedTab.dataset.tab;
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) targetPanel.classList.add('active');
        });
    };

    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    };

    const initCheckoutLinks = () => {
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
        if (checkoutButtons.length > 0) {
            // Use global placeId if available, read email from params again
            const currentParams = new URLSearchParams(window.location.search);
            const email = currentParams.get('email');

            if (!placeId || !email) { // Check global placeId
                console.error("Missing placeId or email for checkout links.");
                checkoutButtons.forEach(button => {
                    button.style.pointerEvents = 'none';
                    button.style.opacity = '0.5';
                    button.textContent = 'Info Missing';
                });
                return; // Stop if essential info is missing
            }

            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(email)}`;
            checkoutButtons.forEach(button => { button.href = checkoutUrl; });
        }
    };

    const initEarlyCtaScroll = () => {
        const scrollButtons = document.querySelectorAll('.js-scroll-to-cta');
        const targetSection = document.getElementById('cta-section');
        if (!targetSection) { console.log("Target CTA section not found"); return; }
        if (scrollButtons.length > 0) {
            scrollButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });
        } else { console.log("No scroll-to-cta buttons found"); }
    };

    // --- Initialize all scripts ---
    // Make sure placeId exists before running functions that depend on it
    if (placeId) {
        populateSampleData(); // Reads params again internally
        generateQRCodes();    // Uses global reviewUrl (set using placeId)
        initCountdown();      // Uses global placeId
        initCheckoutLinks();  // Reads params again internally
    } else {
        // If placeId is missing, still try to populate what we can (like headers if name exists)
        // but functions depending on placeId were already handled/disabled at the top.
        // We might want to show a more user-friendly error on the page.
        console.error("Cannot fully initialize page due to missing Place ID.");
        // Consider adding UI feedback here
    }
    // These functions don't strictly depend on placeId
    initDashboardTabs();
    initFooter();
    initEarlyCtaScroll();
});
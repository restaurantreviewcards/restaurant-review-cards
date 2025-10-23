// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DYNAMICALLY GENERATE THE GOOGLE REVIEW URL ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    let reviewUrl = ''; // Initialize the variable

    const googleReviewPageLink = document.getElementById('google-review-page-link'); // Find the new inline link

    if (placeId) {
        reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        // Set the href for the new inline link
        if (googleReviewPageLink) {
            googleReviewPageLink.href = reviewUrl;
        }
    } else {
        console.error("Place ID missing from URL. QR codes and copy link will not function correctly.");
        // Disable the inline link if no Place ID
        if (googleReviewPageLink) {
             googleReviewPageLink.style.pointerEvents = 'none'; // Make unclickable
             googleReviewPageLink.style.color = 'var(--text-light)'; // Make look less like a link
             googleReviewPageLink.removeAttribute('href');
        }
    }

    const populateSampleData = () => {
        const params = new URLSearchParams(window.location.search);
        const name = params.get('name');
        const rating = parseFloat(params.get('rating'));
        const reviews = parseInt(params.get('reviews'));

        if (!name) return;

        // --- Populate Business Names ---
        document.getElementById('business-name-header').textContent = name;
        document.querySelector('.business-name-preview').textContent = name;
        document.getElementById('mockup-business-name').textContent = name;

        // --- Get DOM Elements for the Snapshot ---
        const ratingValueEl = document.getElementById('google-rating-value');
        const starContainer = document.getElementById('star-rating-container');
        const reviewCountEl = document.getElementById('google-review-count');

        // --- Logic to Handle Zero Reviews vs. Existing Reviews ---
        if (!reviews || reviews === 0) {
            // This is the zero-review case
            if(ratingValueEl) ratingValueEl.textContent = 'No reviews yet';
            if(starContainer) starContainer.innerHTML = ''; // Hide the stars
            if(reviewCountEl) reviewCountEl.textContent = ''; // Hide the (0)
        } else {
            // This is the normal case for businesses with reviews
            if(ratingValueEl) ratingValueEl.textContent = rating.toFixed(1);
            if(reviewCountEl) reviewCountEl.textContent = `(${reviews.toLocaleString()})`;

            if (starContainer) {
                starContainer.innerHTML = ''; // Clear previous stars
                const fullStars = Math.floor(rating);

                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        // Full star SVG (yellow)
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    } else {
                        // Empty star SVG (gray)
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
DELETED
                }
            }
        }
    };

    const generateQRCodes = () => {
        if (!reviewUrl) return;

        // Existing Bonus Stand QR Code
        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
             bonusQrContainer.innerHTML = ''; // Clear previous
            new QRCode(bonusQrContainer, {
                text: reviewUrl,
                width: 75, // Render size
                height: 75,
                colorDark: "#282a2e",
                colorLight: "#d7d5d1",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        // Live Sample QR Code Generation
        const liveSampleQrContainer = document.getElementById('live-sample-qr-code');
        if (liveSampleQrContainer) {
            liveSampleQrContainer.innerHTML = ''; // Clear previous
            new QRCode(liveSampleQrContainer, {
                text: reviewUrl,
                width: 800, // Render size in pixels
                height: 800,
                colorDark: "#191718", // Your specified dark color
DELETED
                colorLight: "#E6E8E7", // Your specified light color
                correctLevel: QRCode.CorrectLevel.H // High error correction
            });
        }
    };

    const initCountdown = async () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer');
        const bonusTextEl = document.querySelector('.bonus-reserved-text');

        if (!hoursEl || !minutesEl || !secondsEl || !countdownTimerEl || !bonusTextEl) return; // More robust check

        const params = new URLSearchParams(window.location.search);
        const placeId = params.get('placeId');

        if (!placeId) {
            countdownTimerEl.style.display = 'none';
            bonusTextEl.style.display = 'none';
            return;
        }

        try {
            // Fetch the official signup timestamp from our serverless function
            const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${placeId}`);
            if (!response.ok) {
    g             let errorMsg = 'Failed to fetch signup data';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
DELETED
            }
            const data = await response.json();

            if (!data.timestamp || typeof data.timestamp._seconds !== 'number') {
                throw new Error('Invalid timestamp format received from server.');
            }

            const signupTime = new Date(data.timestamp._seconds * 1000);
            const targetTime = signupTime.getTime() + 12 * 60 * 60 * 1000;
            const formatTimeUnit = (unit) => String(unit).padStart(2, '0');

            let updateTimerInterval;
            const updateTimer = () => {
                const distance = targetTime - Date.now();

                if (distance < 0) {
                    clearInterval(updateTimerInterval);
DELETED
                    countdownTimerEl.style.display = 'none';
                    bonusTextEl.style.display = 'none';
                    return;
                }

                const hours = Math.floor(distance / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                hoursEl.textContent = formatTimeUnit(hours);
  DELETED
                minutesEl.textContent = formatTimeUnit(minutes);
                secondsEl.textContent = formatTimeUnit(seconds);
            };

            updateTimer();
            updateTimerInterval = setInterval(updateTimer, 1000);

        } catch (error) {
            console.error("Countdown Error:", error.message);
            countdownTimerEl.style.display = 'none';
  D          bonusTextEl.style.display = 'none';
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
  Vertical-align: baseline          const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    };

    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
DELETED
        }
    };

    const initCheckoutLinks = () => {
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
        if (checkoutButtons.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const placeId = params.get('placeId');
    D        const email = params.get('email');

            if (!placeId || !email) {
                console.error("Missing placeId or email for checkout links.");
                checkoutButtons.forEach(button => {
                    button.style.pointerEvents = 'none';
LED                  button.style.opacity = '0.5';
                    button.textContent = 'Info Missing';
                });
          ETED    return;
            }

            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(email)}`;

DELETED
            checkoutButtons.forEach(button => {
                button.href = checkoutUrl;
            });
        }
    };

    const initEarlyCtaScroll = () => {
s        const earlyCtaButton = document.getElementById('early-cta-btn');
        const targetSection = document.getElementById('cta-section');

        if (earlyCtaButton && targetSection) {
            earlyCtaButton.addEventListener('click', (event) => {
                event.preventDefault();
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
s            });
        } else {
            if (!earlyCtaButton) console.log("Early CTA button not found");
            if (!targetSection) console.log("Target CTA section not found");
        }
    };

    // Initialize all scripts
    populateSampleData();
    generateQRCodes(); // This now generates all three QR codes
    initCountdown();
    initDashboardTabs();
    initFooter();
    initCheckoutLinks();
    initEarlyCtaScroll();
});
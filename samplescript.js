// In: samplescript.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DYNAMICALLY GENERATE THE GOOGLE REVIEW URL ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    let reviewUrl = ''; // Initialize the variable

    const copyLinkButton = document.getElementById('copy-link-btn');

    if (placeId) {
        reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
    } else {
        console.error("Place ID missing from URL. QR codes and copy link will not function correctly.");
        if (copyLinkButton) {
            copyLinkButton.textContent = 'Link Unavailable';
            copyLinkButton.disabled = true;
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
                // Check for half star (optional, based on your design needs)
                // const halfStar = rating % 1 >= 0.5;

                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        // Full star SVG (yellow)
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    }
                    // Add half-star logic here if needed
                    // else if (halfStar && i === fullStars) { ... }
                    else {
                        // Empty star SVG (gray)
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    }
                }
            }
        }
    };

    const generateQRCodes = () => {
        if (!reviewUrl) return;

        const cardQrContainer = document.getElementById('card-qr-code-container');
        if (cardQrContainer) {
            // Clear previous QR Code if regenerating
            cardQrContainer.innerHTML = '';
            new QRCode(cardQrContainer, {
                text: reviewUrl,
                width: 100, // Make sure these match desired render size
                height: 100,
                colorDark: "#1f262b",
                colorLight: "#e0d9d4", // Ensure this bg color matches card image
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
             // Clear previous QR Code if regenerating
            bonusQrContainer.innerHTML = '';
            new QRCode(bonusQrContainer, {
                text: reviewUrl,
                width: 75, // Make sure these match desired render size
                height: 75,
                colorDark: "#282a2e",
                colorLight: "#d7d5d1", // Ensure this bg color matches stand image
                correctLevel: QRCode.CorrectLevel.H
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
                // Try to parse error if available
                let errorMsg = 'Failed to fetch signup data';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();

            // Check if timestamp exists and has the expected structure
            if (!data.timestamp || typeof data.timestamp._seconds !== 'number') {
                throw new Error('Invalid timestamp format received from server.');
            }

            const signupTime = new Date(data.timestamp._seconds * 1000);

            // Calculate the 12-hour deadline based on the official signup time
            const targetTime = signupTime.getTime() + 12 * 60 * 60 * 1000;

            const formatTimeUnit = (unit) => String(unit).padStart(2, '0');

            // Define interval variable outside to clear it properly
            let updateTimerInterval;
            const updateTimer = () => {
                const distance = targetTime - Date.now();

                if (distance < 0) {
                    clearInterval(updateTimerInterval);
                    countdownTimerEl.style.display = 'none';
                    bonusTextEl.style.display = 'none';
                    return;
                }

                const hours = Math.floor(distance / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                hoursEl.textContent = formatTimeUnit(hours);
                minutesEl.textContent = formatTimeUnit(minutes);
                secondsEl.textContent = formatTimeUnit(seconds);
            };

            updateTimer(); // Initial call to display immediately
            updateTimerInterval = setInterval(updateTimer, 1000);

        } catch (error) {
            console.error("Countdown Error:", error.message);
            // If we can't get the official time, hide the timer to avoid confusion
            countdownTimerEl.style.display = 'none';
            bonusTextEl.style.display = 'none';
        }
    };

    const initDashboardTabs = () => {
        const tabsContainer = document.querySelector('.dashboard-tabs');
        if (!tabsContainer) return;

        const panels = document.querySelectorAll('.dashboard-panel');
        const tabs = document.querySelectorAll('.dashboard-tab');

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.dashboard-tab');
            if (!clickedTab) return;

            // Don't do anything if the clicked tab is already active
            if (clickedTab.classList.contains('active')) return;

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            clickedTab.classList.add('active');
            const targetPanelId = clickedTab.dataset.tab;
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    };

    const initCopyLink = () => {
        // copyLinkButton and reviewUrl defined at the top
        if (!copyLinkButton || !reviewUrl) return;

        copyLinkButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(reviewUrl);
                const originalText = copyLinkButton.textContent;
                copyLinkButton.textContent = 'Copied!';
                copyLinkButton.disabled = true;
                setTimeout(() => {
                    copyLinkButton.textContent = originalText;
                    copyLinkButton.disabled = false;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                // Optionally provide user feedback here like an alert
                // alert('Could not copy link to clipboard.');
            }
        });
    };

    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    };

    const initCheckoutLinks = () => {
        const checkoutButtons = document.querySelectorAll('.js-get-started-link');
        if (checkoutButtons.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const placeId = params.get('placeId');
            const email = params.get('email'); // Already decoded by URLSearchParams

            if (!placeId || !email) {
                console.error("Missing placeId or email for checkout links.");
                // Disable buttons if essential info is missing
                checkoutButtons.forEach(button => {
                    button.style.pointerEvents = 'none';
                    button.style.opacity = '0.5';
                    button.textContent = 'Info Missing';
                });
                return;
            }

            // Encode email just for the URL parameter
            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(email)}`;

            checkoutButtons.forEach(button => {
                button.href = checkoutUrl;
            });
        }
    };

    // ### NEW FUNCTION for smooth scroll ###
    const initEarlyCtaScroll = () => {
        const earlyCtaButton = document.getElementById('early-cta-btn');
        // Ensure the target section ID matches the one added in HTML
        const targetSection = document.getElementById('cta-section');

        if (earlyCtaButton && targetSection) {
            earlyCtaButton.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default anchor jump
                // Use smooth scrolling to the target section
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        } else {
            if (!earlyCtaButton) console.log("Early CTA button not found");
            if (!targetSection) console.log("Target CTA section not found");
        }
    };
    // ### END NEW FUNCTION ###

    // Initialize all scripts
    populateSampleData();
    generateQRCodes();
    initCountdown();
    initDashboardTabs();
    initCopyLink();
    initFooter();
    initCheckoutLinks();
    initEarlyCtaScroll(); // ### CALL THE NEW FUNCTION ###
});
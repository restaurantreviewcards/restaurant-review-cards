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
                starContainer.innerHTML = '';
                const fullStars = Math.floor(rating);
                
                for (let i = 0; i < 5; i++) {
                    if (i < fullStars) {
                        starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                    } else {
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
            new QRCode(cardQrContainer, { text: reviewUrl, width: 100, height: 100, colorDark: "#1f262b", colorLight: "#e0d9d4", correctLevel: QRCode.CorrectLevel.H });
        }

        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
            new QRCode(bonusQrContainer, { text: reviewUrl, width: 75, height: 75, colorDark: "#282a2e", colorLight: "#d7d5d1", correctLevel: QRCode.CorrectLevel.H });
        }
    };

    const initCountdown = async () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer');
        const bonusTextEl = document.querySelector('.bonus-reserved-text');

        if (!countdownTimerEl || !bonusTextEl) return;

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
                throw new Error('Failed to fetch signup data');
            }
            const data = await response.json();
            
            // Firestore timestamps have a _seconds property. Use the correct 'timestamp' property.
            const signupTime = new Date(data.timestamp._seconds * 1000);
            
            // Calculate the 12-hour deadline based on the official signup time
            const targetTime = signupTime.getTime() + 12 * 60 * 60 * 1000;

            const formatTimeUnit = (unit) => String(unit).padStart(2, '0');

            const updateTimer = setInterval(() => {
                const distance = targetTime - Date.now();
                
                if (distance < 0) {
                    clearInterval(updateTimer);
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
            }, 1000);

        } catch (error) {
            console.error("Countdown Error:", error);
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
            const email = params.get('email');
            const checkoutUrl = `/checkout.html?placeId=${placeId}&email=${encodeURIComponent(email)}`;
            checkoutButtons.forEach(button => {
                button.href = checkoutUrl;
            });
        }
    };

    // Initialize all scripts
    populateSampleData();
    generateQRCodes();
    initCountdown();
    initDashboardTabs();
    initCopyLink();
    initFooter();
    initCheckoutLinks();
});
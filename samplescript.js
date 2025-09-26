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
        const name = params.get('name');
        const rating = parseFloat(params.get('rating'));
        const reviews = parseInt(params.get('reviews'));

        if (!name) return;

        document.getElementById('business-name-header').textContent = name;
        document.querySelector('.business-name-preview').textContent = name;
        document.getElementById('google-rating-value').textContent = rating.toFixed(1);
        document.getElementById('google-review-count').textContent = `(${reviews.toLocaleString()})`;
        document.getElementById('mockup-business-name').textContent = name;

        const starContainer = document.getElementById('star-rating-container');
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

    // --- **UPDATED** COUNTDOWN TIMER SCRIPT ---
    const initCountdown = () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        const countdownTimerEl = document.querySelector('.countdown-timer'); // The whole clock
        const bonusTextEl = document.querySelector('.bonus-reserved-text'); // The urgency text

        if (!countdownTimerEl || !bonusTextEl) return;

        const formatTimeUnit = (unit) => String(unit).padStart(2, '0');
        const twelveHoursFromNow = Date.now() + 12 * 60 * 60 * 1000;

        const updateTimer = setInterval(() => {
            const distance = twelveHoursFromNow - Date.now();
            
            if (distance < 0) {
                clearInterval(updateTimer);
                // When the timer finishes, hide the clock and the text
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
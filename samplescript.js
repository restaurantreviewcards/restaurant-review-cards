// Wait for the DOM to be fully loaded before running any scripts
document.addEventListener('DOMContentLoaded', () => {

    // Define the review URL once to be used by QR generation and the copy button
    // Note: This will be static for the sample page. The dynamic link would be handled post-signup.
    const reviewUrl = "https://restaurantreviewcards.com/review/charleston-oyster-house";

    const populateSampleData = () => {
        const params = new URLSearchParams(window.location.search);
        const name = params.get('name');
        const rating = parseFloat(params.get('rating'));
        const reviews = parseInt(params.get('reviews'));

        if (!name) return; // If there's no name in the URL, do nothing

        // Update text content
        document.getElementById('business-name-header').textContent = name;
        document.querySelector('.business-name-preview').textContent = name;
        document.getElementById('google-rating-value').textContent = rating.toFixed(1);
        document.getElementById('google-review-count').textContent = `(${reviews.toLocaleString()})`;

        // Dynamically generate the star rating
        const starContainer = document.getElementById('star-rating-container');
        if (starContainer) {
            starContainer.innerHTML = ''; // Clear existing static stars
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5; // Placeholder for future half-star logic
            
            for (let i = 0; i < fullStars; i++) {
                starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
            }
            
            // This simplified logic just adds empty stars for the remainder
            for (let i = 0; i < 5 - fullStars; i++) {
                 starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
            }
        }
    };

    // --- QR CODE GENERATION SCRIPT (NEW) ---
    const generateQRCodes = () => {
        // Generate card QR code if the container exists
        const cardQrContainer = document.getElementById('card-qr-code-container');
        if (cardQrContainer) {
            new QRCode(cardQrContainer, {
                text: reviewUrl,
                width: 100,
                height: 100,
                colorDark: "#1f262b",
                colorLight: "#e0d9d4",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        // Generate bonus stand QR code if the container exists
        const bonusQrContainer = document.getElementById('bonus-qr-code-container');
        if (bonusQrContainer) {
            new QRCode(bonusQrContainer, {
                text: reviewUrl,
                width: 75,
                height: 75,
                colorDark: "#282a2e",
                colorLight: "#d7d5d1",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    };

    // --- COUNTDOWN TIMER SCRIPT (REFACTORED) ---
    const initCountdown = () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        if (!hoursEl || !minutesEl || !secondsEl) return;

        const formatTimeUnit = (unit) => String(unit).padStart(2, '0');
        const MS_IN_SECOND = 1000;
        const MS_IN_MINUTE = MS_IN_SECOND * 60;
        const MS_IN_HOUR = MS_IN_MINUTE * 60;
        const twelveHoursFromNow = Date.now() + 12 * MS_IN_HOUR;

        const updateTimer = setInterval(() => {
            const distance = twelveHoursFromNow - Date.now();
            if (distance < 0) {
                clearInterval(updateTimer);
                hoursEl.textContent = '00';
                minutesEl.textContent = '00';
                secondsEl.textContent = '00';
                return;
            }
            const hours = Math.floor(distance / MS_IN_HOUR);
            const minutes = Math.floor((distance % MS_IN_HOUR) / MS_IN_MINUTE);
            const seconds = Math.floor((distance % MS_IN_MINUTE) / MS_IN_SECOND);

            hoursEl.textContent = formatTimeUnit(hours);
            minutesEl.textContent = formatTimeUnit(minutes);
            secondsEl.textContent = formatTimeUnit(seconds);
        }, 1000);
    };
    
    // --- DASHBOARD TABS SCRIPT (REFACTORED WITH EVENT DELEGATION) ---
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

    // --- COPY LINK SCRIPT (MODERNIZED AND UPDATED) ---
    const initCopyLink = () => {
        const copyLinkButton = document.getElementById('copy-link-btn');
        if (!copyLinkButton) return;

        copyLinkButton.addEventListener('click', async () => {
            const urlToCopy = reviewUrl;
            if (!urlToCopy) return;

            try {
                await navigator.clipboard.writeText(urlToCopy);
                
                const originalText = copyLinkButton.textContent;
                copyLinkButton.textContent = 'Copied!';
                copyLinkButton.disabled = true;

                setTimeout(() => {
                    copyLinkButton.textContent = originalText;
                    copyLinkButton.disabled = false;
                }, 2000);

            } catch (err) {
                console.error('Failed to copy text: ', err);
                copyLinkButton.textContent = 'Copy Failed';
                 setTimeout(() => {
                    copyLinkButton.textContent = 'Copy Link to Test';
                }, 2000);
            }
        });
    };

    // --- FOOTER SCRIPT (NEW) ---
    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    };

    // Initialize all scripts
    populateSampleData(); // Run this first to populate the page
    generateQRCodes();
    initCountdown();
    initDashboardTabs();
    initCopyLink();
    initFooter();
});
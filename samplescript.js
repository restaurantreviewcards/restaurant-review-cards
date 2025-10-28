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

    // --- Function to handle live preview updates ---
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
    
    // --- Function to populate the header snapshot ---
    const populateHeaderSnapshot = () => {
        const ratingValueSpan = document.getElementById('header-rating-value');
        const starContainer = document.getElementById('header-star-container');
        const reviewCountSpan = document.getElementById('header-review-count');

        if (reviewsFromUrl > 0 && !isNaN(ratingFromUrl)) {
            ratingValueSpan.textContent = ratingFromUrl.toFixed(1);
            reviewCountSpan.textContent = `(${reviewsFromUrl.toLocaleString()} reviews)`;

            starContainer.innerHTML = ''; // Clear previous stars
            const fullStars = Math.floor(ratingFromUrl);
            
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    starContainer.innerHTML += '<svg viewBox="0 0 24 24"><path fill="#FBBC05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
                } else {
                    starContainer.innerHTML += '<svg viewBox="0 0 24 24"><path fill="#d1d5db" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
                }
            }
        } else {
            ratingValueSpan.textContent = 'No rating';
            reviewCountSpan.textContent = '(0 reviews)';
            starContainer.innerHTML = '';
             for (let i = 0; i < 5; i++) {
                starContainer.innerHTML += '<svg viewBox="0 0 24 24"><path fill="#d1d5db" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
             }
        }
    };

    // --- Function to populate all page elements ---
    const populatePageElements = () => {
        const nameToDisplay = displayNameFromUrl || googleNameFromUrl || 'Business Name';
        const phoneToDisplay = phoneNumberFromUrl || '';

        document.getElementById('business-name-header').textContent = nameToDisplay;
        document.querySelector('.business-name-preview').textContent = nameToDisplay;
        
        document.getElementById('live-sample-name').textContent = nameToDisplay;
        document.getElementById('live-sample-phone').textContent = phoneToDisplay;

        document.getElementById('display-name').value = nameToDisplay;
        document.getElementById('phone-number').value = phoneToDisplay;

        if (placeId) {
            reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        }
        
        populateHeaderSnapshot();
        generateQRCodes();
        initCountdown();
        initDashboardTabs();
        initFooter();
        initEarlyCtaScroll();
        initLivePreviewUpdates();
        initSmartCheckoutLinks();
    };

    // --- This function now builds the URL on click with the latest data ---
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
            button.addEventListener('click', (event) => {
                event.preventDefault(); 
                
                const finalDisplayName = displayNameInput.value;
                const finalPhoneNumber = phoneNumberInput.value;

                saveCustomDetailsInBackground(placeId, finalDisplayName, finalPhoneNumber);
                
                const checkoutUrl = new URL('checkout.html', window.location.origin);
                checkoutUrl.searchParams.set('placeId', placeId);
                checkoutUrl.searchParams.set('email', emailFromUrl);
                
                window.location.href = checkoutUrl.toString();
            });
        });
    };

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
            var updateTimerInterval = setInterval(updateTimer, 1000);
            updateTimer();
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

    const initNumberAnimation = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const restaurantsEl = document.getElementById('restaurants-served-metric');
                    const reviewsEl = document.getElementById('reviews-generated-metric');

                    animateValue(restaurantsEl, 0, 51275, 2000);
                    animateValue(reviewsEl, 0, 6, 2000, " Million+");
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        const socialProofSection = document.querySelector('.social-proof-section');
        if (socialProofSection) {
            observer.observe(socialProofSection);
        }
    };

    const animateValue = (obj, start, end, duration, suffix = "") => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let currentValue = Math.floor(progress * (end - start) + start);
            
            // Special handling for the "Million+" value
            if (suffix.includes("Million")) {
                 obj.innerHTML = end + suffix; // Just set the final text for this one
                 if(progress < 1) window.requestAnimationFrame(step); // let it complete to unobserve
            } else {
                 obj.innerHTML = currentValue.toLocaleString() + suffix;
                 if (progress < 1) {
                    window.requestAnimationFrame(step);
                 }
            }
        };
        window.requestAnimationFrame(step);
    };

    // --- Main Initialization Logic ---
    const initializePage = () => {
        if (!placeId) {
            console.error("Cannot initialize page: Place ID missing from URL.");
            document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Missing required information to load this page.</p>';
            return;
        }
        
        populatePageElements();
        initNumberAnimation();
    };

    initializePage(); // Start the process
});
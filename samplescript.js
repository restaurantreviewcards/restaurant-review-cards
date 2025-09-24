// Wait for the DOM to be fully loaded before running any scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- DYNAMICALLY GENERATE THE GOOGLE REVIEW URL ---
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeid');
    let reviewUrl = ''; // Initialize the variable

    const copyLinkButton = document.getElementById('copy-link-btn');

    if (placeId) {
        // Construct the correct Google Review link if we have a placeId
        reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
    } else {
        // If no placeId is found, log an error and disable the copy button
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

        if (!name) return; // If there's no name in the URL, do nothing

        // Update text content
        document.getElementById('business-name-header').textContent = name;
        document.querySelector('.business-name-preview').textContent = name;
        document.getElementById('google-rating-value').textContent = rating.toFixed(1);
        document.getElementById('google-review-count').textContent = `(${reviews.toLocaleString()})`;
        document.getElementById('mockup-business-name').textContent = name; // Update mockup name

        // Dynamically generate the star rating
        const starContainer = document.getElementById('star-rating-container');
        if (starContainer) {
            starContainer.innerHTML = ''; // Clear existing static stars
            const fullStars = Math.floor(rating);
            
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    // Filled star
                    starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                } else {
                    // Empty star
                    starContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d8d8d8" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                }
            }
        }
    };

    // --- QR CODE GENERATION SCRIPT (NOW USES DYNAMIC URL) ---
    const generateQRCodes = () => {
        if (!reviewUrl) return; // Don't generate QR codes without a valid URL

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

    // --- COUNTDOWN TIMER SCRIPT ---
    const initCountdown = () => {
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        if (!hoursEl || !minutesEl || !secondsEl) return;

        const formatTimeUnit = (unit) => String(unit).padStart(2, '0');
        const twelveHoursFromNow = Date.now() + 12 * 60 * 60 * 1000;

        const updateTimer = setInterval(() => {
            const distance = twelveHoursFromNow - Date.now();
            if (distance < 0) {
                clearInterval(updateTimer);
                hoursEl.textContent = '00';
                minutesEl.textContent = '00';
                secondsEl.textContent = '00';
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
    
    // --- DASHBOARD TABS SCRIPT ---
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

    // --- COPY LINK SCRIPT (NOW USES DYNAMIC URL) ---
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

    // --- FOOTER SCRIPT ---
    const initFooter = () => {
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    };

    // --- STRIPE CHECKOUT SCRIPT ---
    const initCheckout = async () => {
        try {
            // 1. Securely fetch the Stripe publishable key from our new function
            const keyResponse = await fetch('/.netlify/functions/get-stripe-key');
            const keyData = await keyResponse.json();
            const publishableKey = keyData.publishableKey;

            if (!publishableKey) {
                throw new Error("Stripe public key not found.");
            }

            // 2. Initialize Stripe with the fetched key
            const stripe = Stripe(publishableKey);

            // 3. Set up the button click handlers
            const checkoutButtons = document.querySelectorAll('a[href="/signup"]');
            const params = new URLSearchParams(window.location.search);
            const placeId = params.get('placeid');
            const userEmail = params.get('email');

            checkoutButtons.forEach(button => {
                button.addEventListener('click', async (event) => {
                    event.preventDefault();

                    if (!placeId || !userEmail) {
                        alert("Could not find restaurant details. Please try generating a new sample.");
                        return;
                    }

                    try {
                        const response = await fetch('/.netlify/functions/create-checkout-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ placeId: placeId, email: userEmail }),
                        });

                        if (!response.ok) throw new Error('Could not create a checkout session.');
                        
                        const session = await response.json();

                        const result = await stripe.redirectToCheckout({
                            sessionId: session.sessionId,
                        });

                        if (result.error) {
                            alert(result.error.message);
                        }
                    } catch (error) {
                        console.error("Stripe checkout error:", error);
                        alert("An error occurred. Please try again.");
                    }
                });
            });

        } catch (error) {
            console.error("Failed to initialize checkout:", error);
            // If we can't initialize Stripe, hide the checkout buttons to prevent broken links
            document.querySelectorAll('a[href="/signup"]').forEach(btn => btn.style.display = 'none');
        }
    };

    // Initialize all scripts
    populateSampleData();
    generateQRCodes();
    initCountdown();
    initDashboardTabs();
    initCopyLink();
    initFooter();
    initCheckout();
});
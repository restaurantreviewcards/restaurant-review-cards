// In: dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    const restaurantNameEl = document.getElementById('restaurant-name-placeholder');
    const currentReviewsEl = document.getElementById('current-reviews-val');
    const newReviewsEl = document.getElementById('new-reviews-val');
    const invitesSentEl = document.getElementById('invites-sent-val');
    const smartLinkInput = document.getElementById('smart-link-input');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const showQrBtn = document.getElementById('show-qr-btn');
    const qrModal = document.getElementById('qr-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const qrcodeContainer = document.getElementById('qrcode-container');

    // --- MAIN FUNCTION TO INITIALIZE DASHBOARD ---
    const initDashboard = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const placeId = params.get('placeId');

            if (!placeId) {
                throw new Error("Place ID not found in URL.");
            }

            const response = await fetch(`/.netlify/functions/get-customer-data?placeId=${placeId}`);
            if (!response.ok) {
                throw new Error("Could not load customer data.");
            }
            const data = await response.json();

            populateMetrics(data);
            
            const smartLink = `https://restaurantreviewcards.com/.netlify/functions/redirect?id=${data.userId}`;
            smartLinkInput.value = smartLink;
            
            setupInteractivity(smartLink);

            loader.classList.add('hidden');
            mainContent.classList.remove('hidden');

        } catch (error) {
            console.error("Dashboard Initialization Error:", error);
            loader.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    };

    // --- HELPER FUNCTIONS ---
    const populateMetrics = (data) => {
        const newReviews = data.googleReviewCountCurrent - data.googleReviewCountInitial;
        restaurantNameEl.textContent = data.googlePlaceName;
        currentReviewsEl.textContent = data.googleReviewCountCurrent.toLocaleString();
        newReviewsEl.textContent = `+${newReviews.toLocaleString()}`;
        invitesSentEl.textContent = data.reviewInvitesSent.toLocaleString();

        // --- NEW LOGIC FOR GOOGLE-STYLE CARD ---
        const goal = 50; // Set a goal for new reviews
        const progressPercent = Math.min((newReviews / goal) * 100, 100); // Cap at 100%

        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        const progressPercentVal = document.getElementById('progress-percent-val');
        if (progressBar && progressPercentVal) {
            progressBar.style.width = `${progressPercent}%`;
            progressPercentVal.textContent = `${Math.round(progressPercent)}%`;
        }

        // Update link to Google Business Profile
        const googleProfileLink = document.getElementById('google-profile-link');
        if (googleProfileLink && data.googlePlaceId) {
            // This creates a direct link to the business's public profile
            googleProfileLink.href = `https://search.google.com/local/writereview?placeid=${data.googlePlaceId}`;
        }
    };

    const setupInteractivity = (link) => {
        // Copy button functionality
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(link).then(() => {
                copyLinkBtn.textContent = 'Copied!';
                setTimeout(() => { copyLinkBtn.textContent = 'Copy'; }, 2000);
            });
        });

        // QR Code modal functionality
        let qrCodeGenerated = false;
        showQrBtn.addEventListener('click', () => {
            if (!qrCodeGenerated) {
                new QRCode(qrcodeContainer, {
                    text: link,
                    width: 200,
                    height: 200,
                    correctLevel: QRCode.CorrectLevel.H
                });
                qrCodeGenerated = true;
            }
            qrModal.classList.remove('hidden');
        });

        closeModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                qrModal.classList.add('hidden');
            }
        });
    };

    // --- RUN INITIALIZATION ---
    initDashboard();
});
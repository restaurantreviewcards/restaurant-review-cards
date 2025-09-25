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
            // 1. THE FIX: Get 'placeId' from URL instead of 'id'
            const params = new URLSearchParams(window.location.search);
            const placeId = params.get('placeId');

            if (!placeId) {
                throw new Error("Place ID not found in URL.");
            }

            // 2. Fetch customer data from our secure Netlify function
            const response = await fetch(`/.netlify/functions/get-customer-data?placeId=${placeId}`);
            if (!response.ok) {
                throw new Error("Could not load customer data.");
            }
            const data = await response.json();

            // 3. Populate the dashboard with the data
            populateMetrics(data);
            // THE FIX: The smart link now uses the Stripe Customer ID from the fetched data
            const smartLink = `https://restaurantreviewcards.com/.netlify/functions/redirect?id=${data.userId}`;
            smartLinkInput.value = smartLink;
            
            // 4. Set up interactive elements
            setupInteractivity(smartLink);

            // 5. Show the dashboard
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

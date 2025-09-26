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
    
    // New QR action buttons
    const downloadQrBtn = document.getElementById('download-qr-btn');
    const printQrBtn = document.getElementById('print-qr-btn');


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

        // Update link to Google Business Profile
        const googleProfileLink = document.getElementById('google-profile-link');
        if (googleProfileLink && data.googlePlaceId) {
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
                    width: 250, // Slightly larger for better download quality
                    height: 250,
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

        // Download QR Code
        downloadQrBtn.addEventListener('click', () => {
            const qrCanvas = qrcodeContainer.querySelector('canvas');
            if (qrCanvas) {
                const imgData = qrCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `${restaurantNameEl.textContent.replace(/\s/g, '-')}-QRCode.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('QR Code not ready for download. Please try again.');
            }
        });

        // Print QR Code
        printQrBtn.addEventListener('click', () => {
            const qrCanvas = qrcodeContainer.querySelector('canvas');
            if (qrCanvas) {
                const printWindow = window.open('', '_blank');
                printWindow.document.write('<html><head><title>Print QR Code</title>');
                printWindow.document.write('<style>body { font-family: sans-serif; text-align: center; padding: 20px; } img { max-width: 300px; height: auto; border: 1px solid #ccc; margin-bottom: 20px; } @media print { button { display: none; } }</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(`<h1>${restaurantNameEl.textContent} Smart QR Code</h1>`);
                printWindow.document.write(`<img src="${qrCanvas.toDataURL('image/png')}" alt="Your QR Code">`);
                printWindow.document.write('<p>Scan this QR code to leave a review!</p>');
                printWindow.document.write('<button onclick="window.print()">Print</button>');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
            } else {
                alert('QR Code not ready for printing. Please try again.');
            }
        });


        // Manage Billing button functionality
        const manageBillingBtn = document.getElementById('manage-billing-btn');
        if(manageBillingBtn) {
            manageBillingBtn.addEventListener('click', async () => {
                const originalText = manageBillingBtn.textContent;
                manageBillingBtn.textContent = 'Loading...';
                manageBillingBtn.disabled = true;

                try {
                    // Get the userId from the smart link input for simplicity
                    const params = new URLSearchParams(smartLinkInput.value.split('?')[1]);
                    const userId = params.get('id');

                    const response = await fetch('/.netlify/functions/create-portal-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userId }),
                    });

                    if (!response.ok) {
                        throw new Error('Could not create portal link.');
                    }

                    const data = await response.json();

                    // Redirect the user to the Stripe Customer Portal
                    window.location.href = data.portalUrl;

                } catch (error) {
                    console.error('Portal Error:', error);
                    alert('There was a problem accessing the billing portal. Please try again.');
                    manageBillingBtn.textContent = originalText;
                    manageBillingBtn.disabled = false;
                }
            });
        }

        // Share buttons functionality
        const restaurantName = restaurantNameEl.textContent; // Ensure this is available
        const shareMessage = `Here's a link to leave a review for ${restaurantName}. We'd love to hear your feedback!\n\n${link}`;

        const shareEmailBtn = document.getElementById('share-email-btn');
        const shareTextBtn = document.getElementById('share-text-btn');
        const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
        const shareMessengerBtn = document.getElementById('share-messenger-btn');

        if(shareEmailBtn) {
            shareEmailBtn.href = `mailto:?subject=Review for ${restaurantName}&body=${encodeURIComponent(shareMessage)}`;
        }

        if(shareTextBtn) {
            shareTextBtn.href = `sms:?&body=${encodeURIComponent(shareMessage)}`;
        }

        if(shareWhatsappBtn) {
            shareWhatsappBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
            shareWhatsappBtn.target = '_blank';
        }
        
        if(shareMessengerBtn) {
            shareMessengerBtn.href = `fb-messenger://share?link=${encodeURIComponent(link)}`;
            shareMessengerBtn.addEventListener('click', (e) => {
                 navigator.clipboard.writeText(shareMessage).then(() => {
                    alert('Your review link and message have been copied to the clipboard to easily paste into Messenger!');
                 });
            });
        }
    };

    // --- RUN INITIALIZATION ---
    initDashboard();
});
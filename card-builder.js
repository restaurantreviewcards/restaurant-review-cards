// In: card-builder.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Get references to HTML elements ---
    const displayNameInput = document.getElementById('display-name');
    const phoneNumberInput = document.getElementById('phone-number');
    const previewNameDiv = document.getElementById('preview-name');
    const previewPhoneDiv = document.getElementById('preview-phone');
    const nextButton = document.getElementById('next-button');
    const welcomeBusinessNameSpan = document.getElementById('welcome-business-name');
    const snapshotRatingValueSpan = document.getElementById('google-rating-value');
    const snapshotStarContainer = document.getElementById('star-rating-container');
    const snapshotReviewCountSpan = document.getElementById('google-review-count');
    const qrCodeContainer = document.getElementById('qr-code-dummy'); // Target for QR code
    const googleReviewLinkBuilder = document.getElementById('google-review-link-builder'); // Get the explanation link

    // --- Get initial data passed via URL ---
    const params = new URLSearchParams(window.location.search);
    const initialData = {
        placeId: params.get('placeId'),
        email: params.get('email'),
        // Use 'googleName' param passed from generate-sample.js
        googleName: params.get('googleName'),
        rating: parseFloat(params.get('rating') || '0'), // Parse rating to float
        reviews: parseInt(params.get('reviews') || '0', 10) // Parse reviews to int
    };

    // --- Error handling if essential data is missing ---
    if (!initialData.placeId || !initialData.email || !initialData.googleName) {
        console.error("Missing essential data (Place ID, Email, or Google Name) in URL parameters.");
        // Display an error message to the user in the UI
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Could not load required information. Please go back and try again.</p>';
        return; // Stop script execution
    }


    // --- Populate initial values ---

    // Welcome message
    if (welcomeBusinessNameSpan) {
        welcomeBusinessNameSpan.textContent = initialData.googleName;
    }

    // Snapshot
    if (snapshotRatingValueSpan) {
        if (initialData.reviews > 0 && !isNaN(initialData.rating)) {
            snapshotRatingValueSpan.textContent = initialData.rating.toFixed(1);
        } else {
            snapshotRatingValueSpan.textContent = 'No rating yet';
        }
    }
    if (snapshotReviewCountSpan) {
         if (initialData.reviews > 0) {
            snapshotReviewCountSpan.textContent = `(${initialData.reviews.toLocaleString()} reviews)`;
         } else {
             snapshotReviewCountSpan.textContent = '(0 reviews)';
         }
    }
    // Generate Stars
    if (snapshotStarContainer) {
        snapshotStarContainer.innerHTML = ''; // Clear previous stars
        const ratingValue = initialData.rating;
        const reviewCount = initialData.reviews;

        if (reviewCount > 0 && !isNaN(ratingValue)) {
            const fullStars = Math.floor(ratingValue);
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    snapshotStarContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Star Rating</title><path fill="#fbbc05" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                } else {
                    snapshotStarContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d1d5db" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
                }
            }
        } else {
             for (let i = 0; i < 5; i++) {
                 snapshotStarContainer.innerHTML += '<svg viewBox="0 0 24 24"><title>Empty Star</title><path fill="#d1d5db" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
             }
        }
    }

    // Set the Google Review Link in explanation
    if (googleReviewLinkBuilder && initialData.placeId) {
        googleReviewLinkBuilder.href = `https://search.google.com/local/writereview?placeid=${initialData.placeId}`;
    } else if (googleReviewLinkBuilder) {
        // Disable link if no placeId
        googleReviewLinkBuilder.style.pointerEvents = 'none';
        googleReviewLinkBuilder.style.color = 'var(--text-light)';
        googleReviewLinkBuilder.style.textDecoration = 'none';
        googleReviewLinkBuilder.removeAttribute('href');
    }

    // Inputs & Live Preview Name/Phone
    if (displayNameInput && previewNameDiv) {
        displayNameInput.value = initialData.googleName; // Pre-fill input with Google Name
        previewNameDiv.textContent = initialData.googleName; // Initial preview update
    }

    if (phoneNumberInput && previewPhoneDiv) {
         previewPhoneDiv.textContent = phoneNumberInput.value; // Initially empty
    }

    // --- Generate Dummy QR Code ---
    // (Keeps using dummy data for QR as requested)
    if (qrCodeContainer) {
        new QRCode(qrCodeContainer, {
            text: `https://search.google.com/local/writereview?placeid=${initialData.placeId}`, // Use real Place ID for QR destination
            width: 168, // Match Desktop CSS size
            height: 168,
            colorDark: "#333333",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        qrCodeContainer.style.backgroundColor = 'transparent';
        qrCodeContainer.style.padding = '0';
        const qrElement = qrCodeContainer.querySelector('img') || qrCodeContainer.querySelector('canvas');
        if (qrElement) { qrElement.style.width = '100%'; qrElement.style.height = '100%'; qrElement.style.display = 'block'; }
    }


    // --- Add event listeners for live preview updates ---
    if (displayNameInput) {
        displayNameInput.addEventListener('input', () => {
            // Update preview, fallback to original Google name if input is empty
            previewNameDiv.textContent = displayNameInput.value || initialData.googleName;
        });
    }

    if (phoneNumberInput) {
        phoneNumberInput.addEventListener('input', () => {
            previewPhoneDiv.textContent = phoneNumberInput.value;
        });
    }

    // --- Add event listener for the 'Next' button ---
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            // Get the final values from the input fields
            const finalDisplayName = displayNameInput.value || initialData.googleName; // Use original if empty
            const finalPhoneNumber = phoneNumberInput.value;

            // Construct the URL for sample.html, passing ALL necessary data
            const sampleUrl = new URL('sample.html', window.location.origin);
            sampleUrl.searchParams.set('placeId', initialData.placeId);
            sampleUrl.searchParams.set('email', initialData.email);
            sampleUrl.searchParams.set('rating', initialData.rating.toString());
            sampleUrl.searchParams.set('reviews', initialData.reviews.toString());
            // Pass the potentially customized name AS displayName
            sampleUrl.searchParams.set('displayName', finalDisplayName);
            // Also pass the original Google name in case sample.html needs it as a fallback
            sampleUrl.searchParams.set('name', initialData.googleName);
            if (finalPhoneNumber) { // Only add phone if it's not empty
                sampleUrl.searchParams.set('phoneNumber', finalPhoneNumber);
            }

            // Redirect to the sample page
            window.location.href = sampleUrl.toString();
        });
    }

});
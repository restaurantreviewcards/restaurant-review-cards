// In: checkout.js

document.addEventListener("DOMContentLoaded", async () => {
    const stripePublishableKey = "pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso";
    const stripe = Stripe(stripePublishableKey);

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    // --- Shipping Address Elements ---
    const shippingDisplay = document.getElementById('shipping-display');
    const shippingEdit = document.getElementById('shipping-edit');
    const shippingAddressText = document.getElementById('shipping-address-text');
    const editAddressBtn = document.getElementById('edit-address-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const line1Input = document.getElementById('shipping-line1');
    const cityInput = document.getElementById('shipping-city');
    const stateInput = document.getElementById('shipping-state');
    const zipInput = document.getElementById('shipping-zip');

    // Fetch original address and populate the display
    try {
        const response = await fetch(`/.netlify/functions/get-signup-data?placeId=${placeId}`);
        if (!response.ok) throw new Error('Could not fetch address.');
        const signupData = await response.json();
        
        const { googlePlaceName, googleAddressLine1, googleAddressCity, googleAddressState, googleAddressZip } = signupData;

        shippingAddressText.innerHTML = `
            <p><strong>${googlePlaceName}</strong><br>
            ${googleAddressLine1}<br>
            ${googleAddressCity}, ${googleAddressState} ${googleAddressZip}</p>
        `;
        line1Input.value = googleAddressLine1;
        cityInput.value = googleAddressCity;
        stateInput.value = googleAddressState;
        zipInput.value = googleAddressZip;

    } catch (error) {
        shippingAddressText.innerHTML = `<p style="color: red;">Could not load shipping address. Please fill it out manually.</p>`;
        shippingDisplay.classList.add('hidden');
        shippingEdit.classList.remove('hidden');
    }

    // --- Toggle Edit/Display Views ---
    editAddressBtn.addEventListener('click', () => {
        shippingDisplay.classList.add('hidden');
        shippingEdit.classList.remove('hidden');
    });
    cancelEditBtn.addEventListener('click', () => {
        shippingEdit.classList.add('hidden');
        shippingDisplay.classList.remove('hidden');
    });

    // --- Stripe Elements Initialization ---
    let elements;
    try {
        const response = await fetch("/.netlify/functions/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, placeId }),
        });
        const data = await response.json();
        elements = stripe.elements({ clientSecret: data.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");
    } catch (error) {
        console.error("Initialization error:", error);
        showMessage(error.message);
        document.getElementById("submit").disabled = true;
    }

    // --- Form Submission Logic ---
    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Step 1: Save the final shipping address to our database
            const finalAddress = {
                line1: line1Input.value,
                city: cityInput.value,
                state: stateInput.value,
                zip: zipInput.value
            };
            await fetch('/.netlify/functions/update-shipping-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, address: finalAddress })
            });

            // Step 2: Confirm the payment with Stripe
            const { error } = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: `https://restaurantreviewcards.com/success.html?placeId=${placeId}`,
                },
            });

            if (error) {
                if (error.type === "card_error" || error.type === "validation_error") {
                    showMessage(error.message);
                } else {
                    showMessage("An unexpected error occurred.");
                }
            }
        } catch (dbError) {
            showMessage("Could not save shipping address. Please try again.");
        }
        
        setLoading(false);
    });

    // UI Helper Functions
    function setLoading(isLoading) { /* ... same as before ... */ }
    function showMessage(messageText) { /* ... same as before ... */ }
});
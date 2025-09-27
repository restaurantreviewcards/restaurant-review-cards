// In: checkout.js

document.addEventListener("DOMContentLoaded", async () => {
    // --- 1. INITIALIZE STRIPE & GET URL PARAMS ---
    // The key is no longer hardcoded here.
    
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    let stripe;
    let elements;

    try {
        // Fetch the publishable key from our new serverless function
        const keyResponse = await fetch("/.netlify/functions/get-stripe-key");
        const keyData = await keyResponse.json();
        if (!keyResponse.ok) throw new Error(keyData.error);
        stripe = Stripe(keyData.publishableKey);

        // Fetch the client secret from our payment intent function
        const intentResponse = await fetch("/.netlify/functions/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, placeId: placeId }),
        });
        const intentData = await intentResponse.json();
        if (!intentResponse.ok) throw new Error(intentData.error);
        
        elements = stripe.elements({ clientSecret: intentData.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");

    } catch (error) {
        console.error("Initialization error:", error);
        showMessage(error.message);
        document.getElementById("submit").disabled = true;
        return;
    }

    // --- 3. HANDLE FORM SUBMISSION --- (This part remains the same)
    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `https://restaurantreviewcards.com/success.html?placeId=${placeId}`,
            },
        });
        
        if (error.type === "card_error" || error.type === "validation_error") {
            showMessage(error.message);
        } else {
            showMessage("An unexpected error occurred.");
        }

        setLoading(false);
    });

    // --- 4. UI HELPER FUNCTIONS --- (This part remains the same)
    function setLoading(isLoading) { /* ... */ }
    function showMessage(messageText) { /* ... */ }
});
document.addEventListener("DOMContentLoaded", async () => {
    const stripePublishableKey = "pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso";
    const stripe = Stripe(stripePublishableKey);

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    let elements;

    // Now we pass the email and placeId to the function
    const { clientSecret } = await fetch("/.netlify/functions/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, placeId: placeId }), // Send the IDs
    }).then((r) => r.json());

    elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");

    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Pass the placeId in the return URL so the success page can find it
                return_url: `https://restaurantreviewcards.com/success.html?placeId=${placeId}`,
                receipt_email: email,
            },
        });
        
        if (error.type === "card_error" || error.type === "validation_error") {
            showMessage(error.message);
        } else {
            showMessage("An unexpected error occurred.");
        }

        setLoading(false);
    });

    // --- UI HELPER FUNCTIONS ---
    function setLoading(isLoading) { /* ... same as before ... */ }
    function showMessage(messageText) { /* ... same as before ... */ }
});
// In: checkout.js

document.addEventListener("DOMContentLoaded", async () => {
    // --- 1. INITIALIZE STRIPE & GET URL PARAMS ---
    const stripePublishableKey = "pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso";
    const stripe = Stripe(stripePublishableKey);

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    // --- 2. CREATE PAYMENT INTENT & MOUNT ELEMENTS ---
    let elements;

    // Fetch client secret from our serverless function
    const { clientSecret } = await fetch("/.netlify/functions/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

    elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");


    // --- 3. HANDLE FORM SUBMISSION ---
    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // This is where the user will be redirected after payment.
                // The checkout session ID is automatically added by Stripe.
                return_url: `https://restaurantreviewcards.com/success.html`,
                receipt_email: email, // Send Stripe receipt to this email
            },
        });
        
        // This point will only be reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // the `return_url`.
        if (error.type === "card_error" || error.type === "validation_error") {
            showMessage(error.message);
        } else {
            showMessage("An unexpected error occurred.");
        }

        setLoading(false);
    });

    // --- 4. UI HELPER FUNCTIONS ---
    function setLoading(isLoading) {
        const submitBtn = document.getElementById("submit");
        const spinner = document.getElementById("spinner");
        const buttonText = document.getElementById("button-text");

        submitBtn.disabled = isLoading;
        spinner.classList.toggle("hidden", !isLoading);
        buttonText.classList.toggle("hidden", isLoading);
    }

    function showMessage(messageText) {
        const messageContainer = document.querySelector("#payment-message");
        messageContainer.classList.remove("hidden");
        messageContainer.textContent = messageText;

        setTimeout(() => {
            messageContainer.classList.add("hidden");
            messageContainer.textContent = "";
        }, 4000);
    }
});
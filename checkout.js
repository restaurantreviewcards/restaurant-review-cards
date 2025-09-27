// In: checkout.js

document.addEventListener("DOMContentLoaded", async () => {
    // --- 1. INITIALIZE STRIPE & GET URL PARAMS ---
    
    // For now, use your TEST publishable key here.
    // When you go live, you will replace this with your LIVE key.
    const stripePublishableKey = "pk_test_51S8RCOGegWZsGI02bI74nCZ7keToSP0gfJ9mk2VbWwbyZqfaH2aPaY59dk4ML2NGs1sGwLCsACSFNLMlbA0B9nKQ00V3WOnv4z"; // <-- PASTE YOUR TEST PUBLISHABLE KEY HERE
    const stripe = Stripe(stripePublishableKey);

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    let elements;

    try {
        const response = await fetch("/.netlify/functions/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, placeId: placeId }),
        });

        const data = await response.json();

        if (!response.ok || !data.clientSecret) {
            throw new Error(data.error || 'Failed to initialize payment.');
        }

        elements = stripe.elements({ clientSecret: data.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");

    } catch (error) {
        console.error("Initialization error:", error);
        showMessage(error.message);
        document.getElementById("submit").disabled = true;
        return;
    }

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
        }, 5000);
    }
});
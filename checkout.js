document.addEventListener("DOMContentLoaded", async () => {
    const stripePublishableKey = "pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso";
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
            // Handle server errors gracefully
            throw new Error(data.error || 'Failed to initialize payment.');
        }

        elements = stripe.elements({ clientSecret: data.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");

    } catch (error) {
        console.error("Initialization error:", error);
        showMessage(error.message);
        document.getElementById("submit").disabled = true; // Disable pay button if setup fails
        return;
    }

    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
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
        }, 5000); // Increased timeout for better readability
    }
});
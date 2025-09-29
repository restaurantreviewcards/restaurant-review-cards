// In: checkout.js

document.addEventListener("DOMContentLoaded", async () => {
    const stripePublishableKey = "pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso";
    const stripe = Stripe(stripePublishableKey);

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const placeId = params.get('placeId');

    let customerId;
    let elements;

    // --- Shipping Address Elements ---
    const shippingDisplay = document.getElementById('shipping-display');
    const shippingEdit = document.getElementById('shipping-edit');
    const shippingAddressText = document.getElementById('shipping-address-text');
    const editAddressBtn = document.getElementById('edit-address-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    const nameInput = document.getElementById('shipping-name');
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
        
        nameInput.value = googlePlaceName;
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

    // --- PHASE 1: Create a Setup Intent and initialize Stripe Elements ---
    try {
        const response = await fetch("/.netlify/functions/create-setup-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        customerId = data.customerId;
        elements = stripe.elements({ clientSecret: data.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");
    } catch (error) {
        console.error("Initialization error:", error);
        showMessage(error.message || "Could not initialize payment form.");
        document.getElementById("submit").disabled = true;
    }

    // --- Form Submission Logic ---
    const paymentForm = document.getElementById("payment-form");
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalAddress = {
                name: nameInput.value,
                line1: line1Input.value,
                city: cityInput.value,
                state: stateInput.value,
                zip: zipInput.value
            };
            const updateResponse = await fetch('/.netlify/functions/update-shipping-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, address: finalAddress })
            });
            if (!updateResponse.ok) throw new Error("Could not save shipping address.");
        } catch (dbError) {
            showMessage(dbError.message);
            setLoading(false);
            return;
        }

        // ▼▼▼ THE FIX IS HERE ▼▼▼
        // We remove the 'confirmParams' block entirely, as it's not needed when redirect is 'if_required'.
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
            elements,
            redirect: 'if_required'
        });
        // ▲▲▲ END OF FIX ▲▲▲

        if (setupError) {
            showMessage(setupError.message);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/.netlify/functions/create-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    customerId: customerId,
                    paymentMethodId: setupIntent.payment_method,
                    placeId: placeId,
                    email: email 
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Could not create subscription.');
            }

            window.location.href = `/success.html?placeId=${placeId}`;

        } catch (subError) {
            showMessage(subError.message);
            setLoading(false);
        }
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
        }, 5000);
    }
});
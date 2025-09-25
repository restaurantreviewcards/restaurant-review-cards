// In: checkout.js
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const email = params.get('email');

    // --- DOM ELEMENT REFERENCES ---
    const shippingNameDisplay = document.getElementById('shipping-name-display');
    const shippingAddressDisplay = document.getElementById('shipping-address-display');
    const editShippingBtn = document.getElementById('edit-shipping-btn');
    const shippingEditForm = document.getElementById('shipping-edit-form');
    const saveShippingBtn = document.getElementById('save-shipping-btn');
    const paymentForm = document.getElementById('payment-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageContainer = document.getElementById('payment-message');

    let stripe;
    let elements;

    // --- INITIALIZE THE CHECKOUT PAGE ---
    initialize();

    async function initialize() {
        try {
            // Fetch both keys from our backend in parallel
            const [keyResponse, checkoutResponse] = await Promise.all([
                fetch('/.netlify/functions/get-stripe-key').then(res => res.json()),
                fetch('/.netlify/functions/prepare-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placeId, email }),
                }).then(res => res.json())
            ]);

            if (checkoutResponse.error) {
                throw new Error(checkoutResponse.error);
            }

            const { publishableKey } = keyResponse;
            const { clientSecret, shippingAddress, businessName } = checkoutResponse;

            // --- Populate Shipping Info ---
            populateShippingDetails(businessName, shippingAddress);

            // --- Initialize Stripe ---
            stripe = Stripe(publishableKey);
            elements = stripe.elements({ clientSecret });
            const paymentElement = elements.create('payment');
            paymentElement.mount('#payment-element');

        } catch (error) {
            console.error("Initialization Error:", error);
            messageContainer.textContent = `Could not load page: ${error.message}`;
            setLoading(false);
        }
    }

    // --- EVENT LISTENERS ---
    
    // Shipping form logic (no changes)
    editShippingBtn.addEventListener('click', () => {
        shippingEditForm.classList.remove('hidden');
        editShippingBtn.classList.add('hidden');
    });

    saveShippingBtn.addEventListener('click', () => {
        const newName = document.getElementById('name').value;
        const newLine1 = document.getElementById('address-line1').value;
        const newCity = document.getElementById('city').value;
        const newState = document.getElementById('state').value;
        const newPostalCode = document.getElementById('postal-code').value;

        shippingNameDisplay.textContent = newName;
        shippingAddressDisplay.textContent = `${newLine1}, ${newCity}, ${newState} ${newPostalCode}`;

        shippingEditForm.classList.add('hidden');
        editShippingBtn.classList.remove('hidden');
    });

    // Handle payment form submission
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);

        // Get updated shipping details from the display fields
        const finalName = shippingNameDisplay.textContent;
        const finalAddress = shippingAddressDisplay.textContent.split(', ');

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // IMPORTANT: This is the URL where Stripe will redirect the user after payment
                return_url: `${window.location.origin}/success.html`,
                shipping: {
                    name: finalName,
                    address: {
                        line1: finalAddress[0],
                        city: finalAddress[1],
                        state: finalAddress[2].split(' ')[0],
                        postal_code: finalAddress[2].split(' ')[1],
                        country: 'US',
                    }
                }
            },
        });

        // This point will only be reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // the `return_url`.
        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                showMessage(error.message);
            } else {
                showMessage("An unexpected error occurred.");
            }
        }
        
        setLoading(false);
    });


    // --- HELPER FUNCTIONS ---
    
    function populateShippingDetails(name, address) {
        shippingNameDisplay.textContent = name;
        const fullAddress = `${address.line1}, ${address.city}, ${address.state} ${address.postal_code}`;
        shippingAddressDisplay.textContent = fullAddress;

        document.getElementById('name').value = name || '';
        document.getElementById('address-line1').value = address.line1 || '';
        document.getElementById('city').value = address.city || '';
        document.getElementById('state').value = address.state || '';
        document.getElementById('postal-code').value = address.postal_code || '';
    }
    
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            document.getElementById('spinner').classList.remove('hidden');
            document.getElementById('button-text').classList.add('hidden');
        } else {
            submitBtn.disabled = false;
            document.getElementById('spinner').classList.add('hidden');
            document.getElementById('button-text').classList.remove('hidden');
        }
    }

    function showMessage(messageText) {
        messageContainer.textContent = messageText;
        setTimeout(() => { messageContainer.textContent = ''; }, 4000);
    }
});
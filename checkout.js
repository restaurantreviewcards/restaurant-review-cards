// In: checkout.js

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const email = params.get('email');

    // --- DOM ELEMENT REFERENCES ---
    const form = document.getElementById('payment-form');
    const shippingNameDisplay = document.getElementById('shipping-name-display');
    const shippingAddressDisplay = document.getElementById('shipping-address-display');
    const editShippingBtn = document.getElementById('edit-shipping-btn');
    const shippingEditForm = document.getElementById('shipping-edit-form');
    const messageContainer = document.getElementById('payment-message');
    
    // --- INITIALIZE STRIPE ---
    let stripe;
    try {
        const { publishableKey } = await fetch('/.netlify/functions/get-stripe-key').then(r => r.json());
        if (!publishableKey) throw new Error("Stripe public key not found.");
        stripe = Stripe(publishableKey);
    } catch (error) {
        console.error("Stripe Initialization Error:", error);
        messageContainer.textContent = "Could not connect to payment processor.";
        return;
    }

    // --- FETCH CHECKOUT DATA AND POPULATE PAGE ---
    let elements;
    try {
        const response = await fetch('/.netlify/functions/prepare-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId, email }),
        });
        
        if (!response.ok) throw new Error('Server error preparing checkout.');

        const { clientSecret, shippingAddress, businessName } = await response.json();

        // Populate both the display box and the hidden form fields
        shippingNameDisplay.textContent = businessName || 'N/A';
        const fullAddress = `${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`;
        shippingAddressDisplay.textContent = fullAddress;

        document.getElementById('name').value = businessName || '';
        document.getElementById('address-line1').value = shippingAddress.line1 || '';
        document.getElementById('city').value = shippingAddress.city || '';
        document.getElementById('state').value = shippingAddress.state || '';
        document.getElementById('postal-code').value = shippingAddress.postal_code || '';

        // Initialize and mount the Stripe Payment Element
        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
    } catch (error) {
        console.error("Initialization Error:", error);
        messageContainer.textContent = "Could not initialize checkout. Please try again or contact support.";
        return; // Stop execution if we can't load data
    }

    // --- EVENT LISTENERS ---

    // Handle the "Edit" shipping button click
    editShippingBtn.addEventListener('click', () => {
        shippingEditForm.classList.remove('hidden'); // Show the form
        editShippingBtn.classList.add('hidden');    // Hide the edit button
    });

    // Handle the final payment submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard.html?status=success`,
                shipping: {
                    name: document.getElementById('name').value,
                    address: {
                        line1: document.getElementById('address-line1').value,
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        postal_code: document.getElementById('postal-code').value,
                        country: 'US', // Assuming US for now
                    }
                }
            },
        });

        if (error) {
            // This will display the error message in the #payment-message div
            messageContainer.textContent = error.message;
        }
    });
});
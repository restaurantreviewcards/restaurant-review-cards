// In: checkout.js

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const email = params.get('email');

    // 1. Fetch the publishable key and initialize Stripe
    const { publishableKey } = await fetch('/.netlify/functions/get-stripe-key').then(r => r.json());
    const stripe = Stripe(publishableKey);

    // 2. Fetch the client secret and shipping address from your new backend function
    const { clientSecret, shippingAddress } = await fetch('/.netlify/functions/prepare-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, email }),
    }).then(r => r.json());

    // 3. Pre-populate the shipping address form
    document.getElementById('address-line1').value = shippingAddress.line1 || '';
    document.getElementById('city').value = shippingAddress.city || '';
    document.getElementById('state').value = shippingAddress.state || '';
    document.getElementById('postal-code').value = shippingAddress.postal_code || '';

    // 4. Initialize and mount the Stripe Payment Element
    const elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    // 5. Handle the form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // This is the URL your customer will be redirected to after paying.
                return_url: `${window.location.origin}/dashboard.html?status=success`,
                shipping: { // Pass the confirmed (or edited) shipping address
                    name: document.getElementById('name').value,
                    address: {
                        line1: document.getElementById('address-line1').value,
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        postal_code: document.getElementById('postal-code').value,
                        country: shippingAddress.country || 'US',
                    }
                }
            },
        });

        if (error) {
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = error.message;
        }
    });
});
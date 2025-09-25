// In: checkout.js
document.addEventListener('DOMContentLoaded', () => {
    const publishableKey = 'pk_live_51S8RCEKDZto4bHecq0hENGuWcyuGbjbbPzEc9qINe7041tQ0sd6MGFdDakm6Wc3VZteTypDbqtDQj7TKtLAxFxZ100z16Dzfso';

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
            const checkoutResponse = await fetch('/.netlify/functions/prepare-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, email }),
            }).then(res => res.json());

            if (checkoutResponse.error) {
                throw new Error(checkoutResponse.error);
            }

            const { clientSecret, shippingAddress, businessName } = checkoutResponse;

            populateShippingDetails(businessName, shippingAddress);

            // Initialize Stripe and mount the Payment Element
            stripe = Stripe(publishableKey);
            elements = stripe.elements({ clientSecret });
            const paymentElement = elements.create('payment');
            paymentElement.mount('#payment-element');

        } catch (error) {
            console.error("Initialization Error:", error);
            messageContainer.textContent = `Could not load payment form: ${error.message}`;
            setLoading(false);
        }
    }

    // --- EVENT LISTENERS ---
    
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

    // Handle the final payment submission
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // IMPORTANT: This is the page Stripe redirects to after payment.
                return_url: `${window.location.origin}/success.html`,
            },
        });

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
            document.getElementById('button-text').remove('hidden');
        }
    }

    function showMessage(messageText) {
        messageContainer.textContent = messageText;
        setTimeout(() => { messageContainer.textContent = ''; }, 4000);
    }
});
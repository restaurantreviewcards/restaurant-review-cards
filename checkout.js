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
    const messageContainer = document.getElementById('payment-message');
    
    initialize();

    async function initialize() {
        try {
            const response = await fetch('/.netlify/functions/prepare-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, email }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error preparing checkout.');
            }

            const { shippingAddress, businessName } = await response.json();

            // --- Populate Shipping Info ---
            populateShippingDetails(businessName, shippingAddress);

        } catch (error) {
            console.error("Initialization Error:", error);
            messageContainer.textContent = `Could not load shipping details: ${error.message}`;
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
});
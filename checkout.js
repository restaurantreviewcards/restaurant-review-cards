// In: checkout.js
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('placeId');
    const email = params.get('email');

    // --- DOM ELEMENT REFERENCES ---
    const shippingNameDisplay = document.getElementById('shipping-name-display');
    const shippingAddressDisplay = document.getElementById('shipping-address-display');
    const editShippingBtn = document.getElementById('edit-shipping-btn');
    const shippingEditForm = document.getElementById('shipping-edit-form');
    const messageContainer = document.getElementById('payment-message');
    // Reference for the new button
    const saveShippingBtn = document.getElementById('save-shipping-btn');
    
    // --- FETCH CHECKOUT DATA AND POPULATE PAGE ---
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

        // Populate the display box
        shippingNameDisplay.textContent = businessName;
        const fullAddress = `${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`;
        shippingAddressDisplay.textContent = fullAddress;

        // Populate the hidden form fields
        document.getElementById('name').value = businessName || '';
        document.getElementById('address-line1').value = shippingAddress.line1 || '';
        document.getElementById('city').value = shippingAddress.city || '';
        document.getElementById('state').value = shippingAddress.state || '';
        document.getElementById('postal-code').value = shippingAddress.postal_code || '';

    } catch (error) {
        console.error("Initialization Error:", error);
        messageContainer.textContent = `Could not load shipping details: ${error.message}`;
        shippingNameDisplay.textContent = 'Error';
        shippingAddressDisplay.textContent = 'Could not load address.';
    }

    // --- EVENT LISTENERS ---

    // Handle the "Edit" shipping button click
    editShippingBtn.addEventListener('click', () => {
        shippingEditForm.classList.remove('hidden');
        editShippingBtn.classList.add('hidden');
    });

    // --- NEW: Handle the "Save Changes" button click ---
    saveShippingBtn.addEventListener('click', () => {
        // Read the new values from the input fields
        const newName = document.getElementById('name').value;
        const newLine1 = document.getElementById('address-line1').value;
        const newCity = document.getElementById('city').value;
        const newState = document.getElementById('state').value;
        const newPostalCode = document.getElementById('postal-code').value;

        // Update the display text with the new values
        shippingNameDisplay.textContent = newName;
        shippingAddressDisplay.textContent = `${newLine1}, ${newCity}, ${newState} ${newPostalCode}`;

        // Hide the edit form
        shippingEditForm.classList.add('hidden');
        // Show the "Edit" button again
        editShippingBtn.classList.remove('hidden');
    });
});
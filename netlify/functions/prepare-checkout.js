// In: netlify/functions/prepare-checkout.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

// Helper function to parse address from Google
const parseAddress = (addressComponents) => {
    const get = (type) => addressComponents.find(c => c.types.includes(type))?.long_name || '';
    return {
        line1: `${get('street_number')} ${get('route')}`,
        city: get('locality'),
        state: get('administrative_area_level_1'),
        postal_code: get('postal_code'),
        country: get('country'),
    };
};

exports.handler = async (event) => {
    const { placeId, email } = JSON.parse(event.body);
    const priceId = 'price_1SAsWjKDZto4bHecz5q7wnwp'; // Your Price ID

    try {
        // 1. Fetch address from Google Places API
        const fields = 'name,formatted_address,address_components';
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const googleResponse = await fetch(url);
        const placeData = await googleResponse.json();

        if (!placeData.result) throw new Error('Could not fetch Google Place details.');

        const shippingAddress = parseAddress(placeData.result.address_components);

        // 2. Create a Stripe Customer
        const customer = await stripe.customers.create({
            email: email,
            name: placeData.result.name,
            address: shippingAddress,
        });

        // 3. Create a Subscription, which will generate the first invoice and a Payment Intent
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: { // Pass metadata for the webhook
                placeId: placeId,
                email: email
            }
        });

        // 4. Return the client secret and the fetched address
        return {
            statusCode: 200,
            body: JSON.stringify({
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                shippingAddress: shippingAddress,
            }),
        };

    } catch (error) {
        console.error('Error preparing checkout:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
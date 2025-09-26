// In: netlify/functions/create-checkout-link.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId, email } = JSON.parse(event.body);
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!placeId || !email || !priceId) {
      return { statusCode: 400, body: 'Missing required parameters.' };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `https://restaurantreviewcards.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://restaurantreviewcards.com/sample.html?placeId=${placeId}&email=${encodeURIComponent(email)}`,
      client_reference_id: placeId,
      customer_email: email,
    });

    // Return the direct URL to the Stripe checkout page
    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: session.url }),
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session.' }),
    };
  }
};
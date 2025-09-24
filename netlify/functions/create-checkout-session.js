// In: netlify/functions/create-checkout-session.js

// Make sure to set STRIPE_SECRET_KEY in your Netlify environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { placeId, email } = JSON.parse(event.body);

    // This is your specific Price ID from the Stripe product page.
    const priceId = 'price_1SAsWjKDZto4bHecz5q7wnwp';

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // We pass the crucial data needed for fulfillment in the subscription metadata.
      // This ensures the data is available when the subscription is created.
      subscription_data: {
        metadata: {
          placeId: placeId,
          email: email, // Passing the email from the initial form
        }
      },
      // These are the URLs Stripe will redirect to after the checkout attempt.
      success_url: `${process.env.URL}/dashboard.html?status=success`,
      cancel_url: `${process.env.URL}/sample.html?status=cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session.' }),
    };
  }
};
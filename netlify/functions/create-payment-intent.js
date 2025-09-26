const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, placeId } = JSON.parse(event.body); // Now receiving email and placeId
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId || !email || !placeId) {
        throw new Error('Stripe Price ID, email, or Place ID is missing.');
    }

    const price = await stripe.prices.retrieve(priceId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      automatic_payment_methods: { enabled: true },
      // **CRITICAL STEP**: Attach metadata to the payment
      metadata: {
        placeId: placeId,
        email: email
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    console.error('Stripe Payment Intent Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
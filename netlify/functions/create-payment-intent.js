// In: netlify/functions/create-payment-intent.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // In a real-world scenario, you might pass an amount or product ID.
    // For this subscription, we get the price from the Price ID.
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
        throw new Error('Stripe Price ID is not configured.');
    }

    // We fetch the price details to get the amount and currency.
    const price = await stripe.prices.retrieve(priceId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount, // Amount in cents from the Price object
      currency: price.currency,
      automatic_payment_methods: {
        enabled: true,
      },
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
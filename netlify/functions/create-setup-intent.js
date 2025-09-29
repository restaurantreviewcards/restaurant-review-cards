// In: netlify/functions/create-setup-intent.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { email } = JSON.parse(event.body);

    const customer = await stripe.customers.create({ email });
    const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: setupIntent.client_secret,
        customerId: customer.id
      }),
    };
  } catch (error) {
    console.error('Stripe Setup Intent Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
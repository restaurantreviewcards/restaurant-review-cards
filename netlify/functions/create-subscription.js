// In: netlify/functions/create-subscription.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { customerId, paymentMethodId, placeId, email } = JSON.parse(event.body);
    const priceId = process.env.STRIPE_PRICE_ID;

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set it as the default for the customer's invoices
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
       metadata: { // Pass metadata here
        placeId: placeId,
        email: email
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(subscription),
    };
  } catch (error) {
    console.error('Stripe Subscription Creation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
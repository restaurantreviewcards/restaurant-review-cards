// In: netlify/functions/create-payment-intent.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// ... (Firebase initialization code is the same) ...

const db = admin.firestore();

exports.handler = async (event) => {
  // ... (initial code is the same) ...

  try {
    // ... (code to get signupData and create customer is the same) ...
    
    const customer = await stripe.customers.create({ /* ... */ });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        placeId: placeId,
        email: email
      }
    });

    let clientSecret;

    if (subscription.pending_setup_intent) {
        clientSecret = subscription.pending_setup_intent.client_secret;
    } else if (subscription.latest_invoice) {
        const latestInvoiceId = subscription.latest_invoice;

        const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
            expand: ['payment_intent']
        });

        // ▼▼▼ THIS IS THE NEW DEBUGGING STEP ▼▼▼
        console.log("Full Stripe Invoice Object:", JSON.stringify(invoice, null, 2));
        // ▲▲▲ END DEBUGGING STEP ▲▲▲

        if (invoice.payment_intent && invoice.payment_intent.client_secret) {
            clientSecret = invoice.payment_intent.client_secret;
        } else {
             throw new Error('Could not find a Payment Intent on the latest invoice.');
        }

    } else {
        throw new Error('Could not find a client_secret for the subscription.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      }),
    };
    
  } catch (error) {
    console.error('Stripe Subscription Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
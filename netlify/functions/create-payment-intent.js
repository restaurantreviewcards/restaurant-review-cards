// In: netlify/functions/create-payment-intent.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// NOTE: We will now get the db instance inside the handler.

exports.handler = async (event) => {
  // ▼ GET DB INSTANCE HERE FOR MORE ROBUST INITIALIZATION ▼
  const db = admin.firestore();

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  //... The rest of your function code remains exactly the same
  try {
    const { email, placeId } = JSON.parse(event.body);
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId || !email || !placeId) {
      throw new Error('Stripe Price ID, email, or Place ID is missing.');
    }

    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();
    
    if (snapshot.empty) {
        throw new Error(`No signup data found for placeId: ${placeId}`);
    }
    const signupData = snapshot.docs[0].data();

    const customer = await stripe.customers.create({
      email: email,
      name: signupData.googlePlaceName,
      shipping: {
        name: signupData.googlePlaceName,
        address: {
            line1: signupData.googleAddressLine1,
            city: signupData.googleAddressCity,
            state: signupData.googleAddressState,
            postal_code: signupData.googleAddressZip,
            country: 'US',
        },
      },
    });

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
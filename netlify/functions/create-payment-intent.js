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

exports.handler = async (event) => {
  const db = admin.firestore();

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

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
      expand: ['latest_invoice.payment_intent'], // We ask to expand the payment intent
      metadata: {
        placeId: placeId,
        email: email
      }
    });

    // ▼▼▼ THIS IS THE ONLY THING WE NEED RIGHT NOW ▼▼▼
    console.log("Full Stripe Subscription Object:", JSON.stringify(subscription, null, 2));

    // This will cause an error on the page, which is expected for this test.
    return {
        statusCode: 500,
        body: JSON.stringify({ error: "Diagnostic step complete. Check Netlify logs." })
    };
    // ▲▲▲ END OF DIAGNOSTIC CODE ▲▲▲
    
  } catch (error) {
    console.error('Stripe Subscription Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
// In: netlify/functions/prepare-checkout.js
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId, email } = JSON.parse(event.body);

    if (!placeId || !email) {
      return { statusCode: 400, body: 'Missing placeId or email.' };
    }

    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      throw new Error('No matching signup found for the provided details.');
    }

    const signupData = snapshot.docs[0].data();
    
    // --- START: STRIPE LOGIC ---

    // 1. Create a new Stripe Customer
    const customer = await stripe.customers.create({
      email: email,
      name: signupData.googlePlaceName,
      metadata: {
        googlePlaceId: placeId,
      }
    });

    // 2. Create the Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      // Add metadata so our webhook knows which user this is
      metadata: {
        email: email,
        placeId: placeId,
      }
    });
    
    // --- END: STRIPE LOGIC ---
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        // This client_secret is the key for the frontend
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        businessName: signupData.googlePlaceName || 'N/A',
        shippingAddress: {
          line1:       signupData.googleAddressLine1 || '123 Example St',
          city:        signupData.googleAddressCity  || 'Anytown',
          state:       signupData.googleAddressState || 'CA',
          postal_code: signupData.googleAddressZip   || '12345',
        }
      }),
    };

  } catch (error) {
    console.error('Error preparing checkout:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
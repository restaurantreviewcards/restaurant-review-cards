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

    // Find the corresponding signup document to get business details
    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      throw new Error('No matching signup found for the provided details.');
    }

    const signupData = snapshot.docs[0].data();
    const businessName = signupData.googlePlaceName || 'Customer';
    
    // Create a Stripe Customer
    const customer = await stripe.customers.create({
      email: email,
      name: businessName,
    });
    
    // Create the Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      // FINAL FIX: This combination correctly prepares the subscription 
      // to be confirmed on the client-side.
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'], // Tell Stripe to expect a card payment
      },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    });

    // Logic to handle both free trials and immediate payments
    let clientSecret;
    if (subscription.status === 'trialing' && subscription.pending_setup_intent) {
        clientSecret = subscription.pending_setup_intent.client_secret;
    } else if (subscription.status === 'incomplete' && subscription.latest_invoice.payment_intent) {
        clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    }

    if (!clientSecret) {
        console.error("Full subscription object:", JSON.stringify(subscription, null, 2));
        throw new Error('Could not determine the client_secret from the subscription.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: clientSecret,
        businessName: businessName,
        shippingAddress: {
            line1: signupData.googleAddressLine1 || '',
            city: signupData.googleAddressCity || '',
            state: signupData.googleAddressState || '',
            postal_code: signupData.googleAddressZip || '',
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
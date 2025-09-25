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

    const customer = await stripe.customers.create({
      email: email,
      name: signupData.googlePlaceName,
      metadata: {
        googlePlaceId: placeId,
      }
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        email: email,
        placeId: placeId,
      }
    });

    const latestInvoiceId = subscription.latest_invoice;
    if (!latestInvoiceId) {
      throw new Error("Subscription created without a valid invoice.");
    }
    
    // Retrieve the invoice, which is now finalized automatically by Stripe.
    const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
        expand: ['payment_intent']
    });

    const clientSecret = invoice.payment_intent.client_secret;
    if (!clientSecret) {
        throw new Error("Could not find client_secret on the retrieved invoice.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: clientSecret,
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
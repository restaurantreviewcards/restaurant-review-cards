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
    
    const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
        expand: ['payment_intent']
    });

    // --- NEW LOGGING LINE ---
    // This is the most important log. We need to see what this object looks like.
    console.log("Retrieved Stripe Invoice Object:", JSON.stringify(invoice, null, 2));

    if (!invoice.payment_intent || !invoice.payment_intent.client_secret) {
        throw new Error("The retrieved invoice does not contain a valid payment_intent with a client_secret.");
    }
    
    const clientSecret = invoice.payment_intent.client_secret;

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
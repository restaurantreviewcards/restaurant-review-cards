// In: netlify/functions/prepare-checkout.js
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) { /* ... firebase init ... */ }
const db = admin.firestore();

exports.handler = async (event) => {
  console.log("--- prepare-checkout function started ---");

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId, email } = JSON.parse(event.body);
    console.log(`Received placeId: ${placeId}, email: ${email}`);

    if (!placeId || !email) {
      console.error("Missing placeId or email.");
      return { statusCode: 400, body: 'Missing placeId or email.' };
    }

    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      throw new Error('No matching signup found for the provided details.');
    }

    const signupData = snapshot.docs[0].data();
    const businessName = signupData.googlePlaceName || 'Customer';
    console.log(`Found business: ${businessName}`);
    
    const customer = await stripe.customers.create({ email, name: businessName });
    console.log(`Stripe customer created: ${customer.id}`);
    
    const priceId = process.env.STRIPE_PRICE_ID;
    console.log(`Attempting to create subscription with Price ID: ${priceId}`);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
    });
    console.log(`Subscription created successfully: ${subscription.id}`);

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    console.log("Successfully extracted client_secret.");

    if (!clientSecret) {
      throw new Error('Stripe failed to create a payment intent for the subscription.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ /* ... response data ... */ }),
    };

  } catch (error) {
    console.error('--- ERROR in prepare-checkout ---');
    console.error("Full error object:", error); // This will log the entire error object
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
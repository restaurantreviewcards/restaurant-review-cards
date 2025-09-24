// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// This secret is used to verify the request is genuinely from Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Firebase Admin SDK if not already done
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
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // 1. Verify the event is from Stripe for security
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}`};
  }

  // 2. Handle the specific event type
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      // Extract metadata we passed during subscription creation
      const { placeId, email } = session.subscription_data.metadata;
      const userId = session.customer; // Use the Stripe Customer ID as our unique ID

      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,user_ratings_total&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.result) throw new Error('Could not fetch Google details for webhook.');
        
        const initialReviewCount = data.result.user_ratings_total || 0;
        const placeName = data.result.name;

        // Create the official customer record
        const customerData = {
          userId: userId,
          email: email,
          googlePlaceId: placeId,
          googlePlaceName: placeName,
          googleReviewCountInitial: initialReviewCount,
          googleReviewCountCurrent: initialReviewCount,
          reviewInvitesSent: 0,
          signupDate: new Date(),
          subscriptionStatus: 'active',
        };

        await db.collection('customers').doc(userId).set(customerData);
        console.log(`Successfully created customer profile for ${userId}`);
      } catch (error) {
        console.error('Error in webhook fulfillment:', error);
        return { statusCode: 500, body: `Fulfillment Error: ${error.message}` };
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = stripeEvent.data.object;
      const canceledUserId = subscription.customer;
      console.log(`Subscription deleted for customer: ${canceledUserId}`);
      
      try {
        // Find the customer in Firestore and update their status to activate the "off-switch"
        const customerRef = db.collection('customers').doc(canceledUserId);
        await customerRef.update({
          subscriptionStatus: 'canceled'
        });
      } catch (error) {
        console.error('Error updating subscription status to canceled:', error);
        return { statusCode: 500, body: 'Error handling subscription deletion.' };
      }
      break;

    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
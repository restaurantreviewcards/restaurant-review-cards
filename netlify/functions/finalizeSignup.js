// In: netlify/functions/finalizeSignup.js
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}`};
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      
      // --- MODIFICATION ---
      // Get the placeId and email from the checkout session object
      const placeId = session.client_reference_id;
      const email = session.customer_details.email;
      const userId = session.customer;

      if (!placeId || !email || !userId) {
          console.error("Webhook missing essential data: placeId, email, or customerId.");
          return { statusCode: 400, body: 'Webhook Error: Missing data.' };
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,user_ratings_total&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.result) throw new Error('Could not fetch Google details for webhook.');
        
        const initialReviewCount = data.result.user_ratings_total || 0;
        const placeName = data.result.name;

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
      
      try {
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

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
// In: netlify/functions/finalizeSignup.js
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Use the webhook secret you just created and stored in Netlify
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

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verify the event came from Stripe using the webhook secret
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}`};
  }

  // Handle the specific event type
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      
      const placeId = session.client_reference_id;
      const email = session.customer_details.email;
      const userId = session.customer; // This is the Stripe Customer ID, e.g., 'cus_...'

      if (!placeId || !email || !userId) {
          console.error("Webhook missing essential data: placeId, email, or customerId.");
          return { statusCode: 400, body: 'Webhook Error: Missing required session data.' };
      }

      try {
        // Find the original signup document to get the restaurant's name and initial review count
        const signupsRef = db.collection('signups');
        const snapshot = await signupsRef
            .where('googlePlaceId', '==', placeId)
            .where('email', '==', email)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new Error(`No matching signup document found for placeId: ${placeId}`);
        }

        const signupData = snapshot.docs[0].data();
        
        const initialReviewCount = signupData.googleReviewCount || 0;
        const placeName = signupData.googlePlaceName;

        // Create the final customer document in the 'customers' collection
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

        // Use the Stripe Customer ID as the document ID for easy lookup
        await db.collection('customers').doc(userId).set(customerData);
        console.log(`Successfully created customer profile for ${userId} (${placeName})`);
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
        console.log(`Successfully marked subscription as canceled for customer ${canceledUserId}`);
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

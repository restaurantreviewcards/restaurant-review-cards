// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}`};
    }

    switch (stripeEvent.type) {
        case 'customer.subscription.created':
            const subscription = stripeEvent.data.object;
            const { placeId, email } = subscription.metadata;
            const userId = subscription.customer;

            if (!placeId || !email || !userId) {
                console.error("Webhook missing essential metadata from subscription.");
                return { statusCode: 400, body: 'Webhook Error: Missing required metadata.' };
            }

            try {
                const customerDoc = await db.collection('customers').doc(userId).get();
                if (customerDoc.exists) {
                    console.log(`Customer ${userId} already exists. Skipping creation.`);
                    break;
                }

                const signupsRef = db.collection('signups');
                const snapshot = await signupsRef
                    .where('googlePlaceId', '==', placeId)
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    throw new Error(`No matching signup document found for placeId: ${placeId}`);
                }

                const signupData = snapshot.docs[0].data();
                const initialReviewCount = signupData.googleReviewCount || 0;
                const placeName = signupData.googlePlaceName;

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
                console.error('Error in subscription webhook fulfillment:', error);
                return { statusCode: 500, body: `Fulfillment Error: ${error.message}` };
            }
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = stripeEvent.data.object;
            const canceledUserId = deletedSubscription.customer;
            
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

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
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
        // NOTE: The 'customer.subscription.created' and 'customer.subscription.updated'
        // cases for initial signup have been removed, as that logic now lives in 'create-subscription.js'
        // for better reliability.

        case 'customer.subscription.deleted': {
            const deletedSubscription = stripeEvent.data.object;
            const canceledUserId = deletedSubscription.customer;
            try {
                const customerRef = db.collection('customers').doc(canceledUserId);
                await customerRef.update({ subscriptionStatus: 'canceled' });
                console.log(`Successfully marked subscription as canceled for customer ${canceledUserId}`);
            } catch (error) {
                console.error('Error updating subscription status to canceled:', error);
            }
            break;
        }

        default:
            // console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
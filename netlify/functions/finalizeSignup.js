// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// No longer need sgMail here
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
        case 'customer.subscription.created': {
            const subscription = stripeEvent.data.object;
            const { placeId, email } = subscription.metadata;
            const userId = subscription.customer;

            console.log('Subscription created, creating customer record in Firestore...');
            try {
                const customerDoc = await db.collection('customers').doc(userId).get();
                if (customerDoc.exists) {
                    console.log(`Customer ${userId} already exists. Skipping creation.`);
                    break;
                }

                const signupsRef = db.collection('signups');
                const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();
                if (snapshot.empty) {
                    throw new Error(`No matching signup document found for placeId: ${placeId}`);
                }

                const signupData = snapshot.docs[0].data();
                const customerData = {
                    userId: userId,
                    email: email,
                    googlePlaceId: placeId,
                    googlePlaceName: signupData.googlePlaceName,
                    shippingRecipientName: signupData.shippingRecipientName || signupData.googlePlaceName,
                    googleReviewCountInitial: signupData.googleReviewCount || 0,
                    googleReviewCountCurrent: signupData.googleReviewCount || 0,
                    googleAddressLine1: signupData.googleAddressLine1 || '',
                    googleAddressCity: signupData.googleAddressCity || '',
                    googleAddressState: signupData.googleAddressState || '',
                    googleAddressZip: signupData.googleAddressZip || '',
                    reviewInvitesSent: 0,
                    signupDate: new Date(),
                    lastRedemptionDate: null,
                    subscriptionStatus: 'active',
                };
                
                await db.collection('customers').doc(userId).set(customerData);
                console.log(`Successfully created customer profile for ${userId}.`);
            } catch (error) {
                console.error('Error creating customer record:', error);
            }
            break;
        }

        // The 'customer.subscription.updated' case for sending emails is now REMOVED.

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
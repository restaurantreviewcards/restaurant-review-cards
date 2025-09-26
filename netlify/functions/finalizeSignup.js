// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
                    googleReviewCountInitial: signupData.googleReviewCount || 0,
                    googleReviewCountCurrent: signupData.googleReviewCount || 0,
                    reviewInvitesSent: 0,
                    signupDate: new Date(),
                    lastRedemptionDate: null, // Initialize redemption date
                    subscriptionStatus: 'active',
                };
                
                await db.collection('customers').doc(userId).set(customerData);
                console.log(`Successfully created customer profile for ${userId}.`);
            } catch (error) {
                console.error('Error creating customer record:', error);
            }
            break;
        }

        case 'invoice.paid': {
            const invoice = stripeEvent.data.object;
            
            if (invoice.billing_reason === 'subscription_create') {
                const userId = invoice.customer;
                const customerEmail = invoice.customer_email;
                
                console.log('First invoice paid, sending welcome email...');
                try {
                    const customerDoc = await db.collection('customers').doc(userId).get();
                    if (!customerDoc.exists) {
                        throw new Error('Customer record not found for sending welcome email.');
                    }

                    const customerData = customerDoc.data();
                    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customerData.googlePlaceId}`;
                    const welcomeMsg = {
                        to: customerEmail,
                        from: { email: 'jake@restaurantreviewcards.com', name: 'Jake from RRC' },
                        subject: `Welcome to ReviewCards, ${customerData.googlePlaceName}!`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                                <h2 style="color: #005596;">Welcome Aboard!</h2>
                                <p>Hi there,</p>
                                <p>Thank you for signing up for ReviewCards! Your account for <strong>${customerData.googlePlaceName}</strong> is now active, and your new dashboard is ready.</p>
                                <h3 style="color: #005596; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px;">What Happens Next?</h3>
                                <p><strong>1. Welcome Kit Shipment:</strong> Your kit, including 250 Smart Review Cards and 2 stands, is being processed and will ship within 3-5 business days.</p>
                                <p><strong>2. Using Your Cards:</strong> Simply hand a card to a happy customer. They scan the QR code and are taken directly to your Google review page. It's that easy!</p>
                                <p style="text-align: center; margin: 30px 0;">
                                    <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                        Access Your Dashboard Now
                                    </a>
                                </p>
                                <p>If you have any questions, feel free to reply directly to this email.</p>
                                <p>Cheers,<br>Jake</p>
                            </div>
                        `,
                    };
                    await sgMail.send(welcomeMsg);
                    console.log(`Welcome email sent to ${customerEmail}.`);
                } catch (error) {
                    console.error('Error sending welcome email:', error);
                }
            }
            break;
        }

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
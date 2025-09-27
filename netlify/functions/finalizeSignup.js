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

        case 'customer.subscription.updated': {
            const subscription = stripeEvent.data.object;

            // This is the key change: trigger emails when the trial starts
            if (subscription.status === 'trialing' && stripeEvent.data.previous_attributes?.status === 'incomplete') {
                const userId = subscription.customer;
                const customerEmail = subscription.metadata.email; // Get email from metadata

                console.log('Subscription started trial, sending welcome email and internal notification...');
                try {
                    const customerDoc = await db.collection('customers').doc(userId).get();
                    if (!customerDoc.exists) {
                        throw new Error('Customer record not found for sending emails.');
                    }

                    const customerData = customerDoc.data();
                    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customerData.googlePlaceId}`;
                    
                    // Email to the Customer
                    const welcomeMsg = {
                        to: customerEmail,
                        bcc: 'jake@restaurantreviewcards.com',
                        from: { email: 'jake@restaurantreviewcards.com', name: 'Jake from RRC' },
                        subject: `Your Order is being Processed now, ${customerData.googlePlaceName}!`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #005596;">Welcome! Your Account is Active</h2>
                                <p>Hi there,</p>
                                <p>Thank you for signing up! Your welcome kit, including 250 Smart Review Cards and 2 stands, is now being processed for shipment.</p>
                                <p>You can access your Smart Dashboard immediately to start tracking your reviews and sharing your unique link. Click the button below to log in:</p>
                                <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; margin-bottom: 20px;">
                                    Go to My Dashboard
                                </a>
                                <p>If you have any questions, just reply to this email.</p>
                                <p>Cheers,<br>Jake</p>
                            </div>
                        `
                    };
                    
                    // Internal Notification Email to You
                    const internalNotificationMsg = {
                        to: 'jake@restaurantreviewcards.com',
                        from: 'new-customer@restaurantreviewcards.com',
                        subject: `✅ New Customer Signup: ${customerData.googlePlaceName}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #28a745;">New Paying Customer!</h2>
                                <p><strong>Business Name:</strong> ${customerData.googlePlaceName}</p>
                                <p><strong>Email:</strong> ${customerData.email}</p>
                                <p><strong>Address:</strong> ${customerData.googleAddressLine1}, ${customerData.googleAddressCity}, ${customerData.googleAddressState} ${customerData.googleAddressZip}</p>
                                <p><strong>Stripe Customer ID:</strong> ${customerData.userId}</p>
                                <hr>
                                <p style="text-align: center; margin: 20px 0;">
                                    <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                        View Customer Dashboard
                                    </a>
                                </p>
                            </div>
                        `
                    };

                    // Send both emails
                    await Promise.all([
                        sgMail.send(welcomeMsg),
                        sgMail.send(internalNotificationMsg)
                    ]);
                    
                    console.log(`Emails sent successfully for new trialing customer ${userId}.`);
                } catch (error) {
                    console.error('Error sending emails for new trial:', error);
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
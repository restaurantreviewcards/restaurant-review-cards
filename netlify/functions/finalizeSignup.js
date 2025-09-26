// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Firebase Admin SDK...
// ... (same as before)

exports.handler = async (event) => {
    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
        // ... (error handling same as before)
    }

    switch (stripeEvent.type) {
        // **THIS IS THE NEW, CORRECT EVENT HANDLER**
        case 'customer.subscription.updated':
            const subscription = stripeEvent.data.object;

            // Check if the subscription just became active
            if (subscription.status === 'active' && subscription.previous_attributes.status !== 'active') {
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

                    // SEND WELCOME EMAIL NOW THAT PAYMENT IS CONFIRMED
                    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${placeId}`;
                    const welcomeMsg = {
                        to: email,
                        from: {
                            email: 'jake@restaurantreviewcards.com',
                            name: 'Jake from RRC'
                        },
                        subject: `Welcome to ReviewCards, ${placeName}!`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                                <h2 style="color: #005596;">Welcome Aboard!</h2>
                                <p>Hi there,</p>
                                <p>Thank you for signing up for ReviewCards! Your account for <strong>${placeName}</strong> is now active, and your new dashboard is ready.</p>
                                
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
                    console.log(`Welcome email sent to ${email} after subscription became active.`);

                } catch (error) {
                    console.error('Error in subscription webhook fulfillment:', error);
                    return { statusCode: 500, body: `Fulfillment Error: ${error.message}` };
                }
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
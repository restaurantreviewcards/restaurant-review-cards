const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
        case 'payment_intent.succeeded': // **NEW EVENT TYPE**
            const paymentIntent = stripeEvent.data.object;
            
            const { placeId, email } = paymentIntent.metadata; // Get data from metadata
            const userId = paymentIntent.customer; // Stripe Customer ID

            if (!placeId || !email || !userId) {
                console.error("Webhook missing essential metadata.");
                return { statusCode: 400, body: 'Webhook Error: Missing required metadata.' };
            }

            try {
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
                console.log(`Successfully created customer profile via Payment Intent for ${userId}`);
            } catch (error) {
                console.error('Error in webhook fulfillment:', error);
                return { statusCode: 500, body: `Fulfillment Error: ${error.message}` };
            }
            break;

        case 'customer.subscription.deleted':
            // ... (this part remains exactly the same)
            break;

        default:
            console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const sgMail = require('@sendgrid/mail'); // ADDED: SendGrid dependency

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // ADDED: Configure SendGrid

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
            const customerId = deletedSubscription.customer;
            try {
                const customerRef = db.collection('customers').doc(customerId);
                
                // First, get the customer's data so we can use it in the email
                const customerDoc = await customerRef.get();

                if (customerDoc.exists) {
                    // This is the original functionality: update the status in Firestore.
                    // I've also added a timestamp as a best practice.
                    await customerRef.update({ 
                        subscriptionStatus: 'canceled',
                        cancellationDate: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Successfully marked subscription as canceled for customer ${customerId}`);

                    // This is the new functionality: send an email notification.
                    const customerData = customerDoc.data();
                    const internalNotificationMsg = {
                        to: 'jake@restaurantreviewcards.com',
                        from: { email: 'cancellations@restaurantreviewcards.com', name: 'System Alert' },
                        subject: `❌ Subscription Canceled: ${customerData.googlePlaceName}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #dc2626;">Subscription Canceled</h2>
                                <p>A customer has just canceled their subscription.</p>
                                <p><strong>Business Name:</strong> ${customerData.googlePlaceName}</p>
                                <p><strong>Email:</strong> ${customerData.email}</p>
                                <p><strong>Stripe Customer ID:</strong> ${customerId}</p>
                            </div>
                        `
                    };
                    await sgMail.send(internalNotificationMsg);
                } else {
                    console.log(`Customer document ${customerId} not found. Cannot send notification.`);
                }

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
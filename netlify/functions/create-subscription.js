// In: netlify/functions/create-subscription.js

const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Firebase Admin SDK if not already initialized
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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { customerId, paymentMethodId, placeId, email } = JSON.parse(event.body);

        if (!customerId || !paymentMethodId || !placeId || !email) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
        }

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        // Set this as the default payment method for the customer's future invoices
        await stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        const priceId = process.env.STRIPE_PRICE_ID;

        // Create the subscription with a 30-day free trial
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            trial_period_days: 30,
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        // Find the most recent signup document to get the full business details
        const signupsRef = db.collection('signups');
        const signupSnapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();

        if (signupSnapshot.empty) {
            throw new Error(`Could not find signup data for placeId: ${placeId}`);
        }
        const signupData = signupSnapshot.docs[0].data();

        // Create the final customer data object
        const customerData = {
            userId: customerId,
            email: email.toLowerCase(),
            subscriptionId: subscription.id,
            subscriptionStatus: 'active',
            ...signupData,
            googleReviewCountInitial: signupData.googleReviewCount || 0,
            googleReviewCountCurrent: signupData.googleReviewCount || 0,
            reviewInvitesSent: 0,
            signupDate: admin.firestore.FieldValue.serverTimestamp(),
            lastRedemptionDate: null,
        };

        // Create the final customer record in Firestore
        await db.collection('customers').doc(customerId).set(customerData);

        const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customerData.googlePlaceId}`;

        // Send the detailed welcome email to the customer
        const welcomeMsg = {
            to: customerData.email,
            bcc: 'jake@restaurantreviewcards.com', // BCC added here
            from: { email: 'jake@restaurantreviewcards.com', name: 'Jake from ReviewCards' },
            subject: `Welcome to your free trial, ${customerData.googlePlaceName}!`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #005596;">Welcome! Your Free Trial is Active</h2>
                    <p>Hi there,</p>
                    <p>Thank you for starting your free trial! Your welcome kit, including 250 Smart Review Cards and 2 free stands, is now being processed for shipment.</p>
                    <p>You can access your Smart Dashboard immediately. Click the button below to log in:</p>
                    <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; margin-bottom: 20px;">
                        Go to My Dashboard
                    </a>
                    <p>If you have any questions, just reply to this email.</p>
                    <p>Cheers,<br>Jake</p>
                </div>
            `
        };

        // Send the internal notification email to you
        const internalNotificationMsg = {
            to: 'jake@restaurantreviewcards.com',
            from: { email: 'new-trial@restaurantreviewcards.com', name: 'New Trial Signup' },
            subject: `✅ New FREE TRIAL: ${customerData.googlePlaceName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #28a745;">New Free Trial Started!</h2>
                    <p><strong>Business Name:</strong> ${customerData.googlePlaceName}</p>
                    <p><strong>Email:</strong> ${customerData.email}</p>
                    <p><strong>Ship To:</strong><br>
                        ${customerData.shippingRecipientName || customerData.googlePlaceName}<br>
                        ${customerData.googleAddressLine1}<br>
                        ${customerData.googleAddressCity}, ${customerData.googleAddressState} ${customerData.googleAddressZip}
                    </p>
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

        // Send both emails simultaneously
        await Promise.all([
            sgMail.send(welcomeMsg),
            sgMail.send(internalNotificationMsg)
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, subscriptionId: subscription.id }),
        };

    } catch (error) {
        console.error('Create Subscription Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' }),
        };
    }
};
// In: netlify/functions/create-subscription.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { customerId, paymentMethodId, placeId, email } = JSON.parse(event.body);
    const priceId = process.env.STRIPE_PRICE_ID;

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set it as the default for the customer's invoices
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        placeId: placeId,
        email: email
      }
    });

    // --- SEND EMAILS IMMEDIATELY AFTER SUBSCRIPTION IS CREATED ---
    const customerDoc = await db.collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
        throw new Error('Customer record not found for sending emails.');
    }

    const customerData = customerDoc.data();
    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customerData.googlePlaceId}`;

    // Email to the Customer
    const welcomeMsg = {
        to: email,
        bcc: 'jake@restaurantreviewcards.com',
        from: { email: 'jake@restaurantreviewcards.com', name: 'Jake from RRC' },
        subject: `Your Order is being Processed now, ${customerData.googlePlaceName}!`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #005596;">Welcome! Your Account is Active</h2>
                <p>Hi there,</p>
                <p>Thank you for signing up! Your welcome kit, including 250 Smart Review Cards and 2 stands, is now being processed for shipment.</p>
                <p>You can access your Smart Dashboard immediately. Click the button below to log in:</p>
                <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; margin-bottom: 20px;">
                    Go to My Dashboard
                </a>
                <p>If you have any questions, just reply to this email.</p>
                <p>Cheers,<br>Jake</p>
            </div>
        `
    };

    // Internal Notification Email
    const internalNotificationMsg = {
        to: 'jake@restaurantreviewcards.com',
        from: 'new-customer@restaurantreviewcards.com',
        subject: `✅ New Customer Signup: ${customerData.googlePlaceName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #28a745;">New Paying Customer!</h2>
                <p><strong>Business Name:</strong> ${customerData.googlePlaceName}</p>
                <p><strong>Email:</strong> ${customerData.email}</p>
                <p><strong>Ship To:</strong><br>
                   ${customerData.shippingRecipientName}<br>
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

    await Promise.all([
        sgMail.send(welcomeMsg),
        sgMail.send(internalNotificationMsg)
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify(subscription),
    };
  } catch (error) {
    console.error('Stripe Subscription Creation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
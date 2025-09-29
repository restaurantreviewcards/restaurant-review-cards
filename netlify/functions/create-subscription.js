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

    // Attach the payment method and set it as the default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        placeId: placeId,
        email: email
      }
    });

    // --- LOGIC MOVED FROM WEBHOOK TO HERE ---
    // 1. Get the initial signup data
    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();
    if (snapshot.empty) {
        throw new Error(`Critical: No matching signup document found for placeId: ${placeId}`);
    }
    const signupData = snapshot.docs[0].data();

    // 2. Create the permanent customer data object
    const customerData = {
        userId: customerId,
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

    // 3. Save the new customer record to the 'customers' collection
    await db.collection('customers').doc(customerId).set(customerData);
    console.log(`Successfully created customer profile for ${customerId}.`);

    // 4. Send the welcome and notification emails
    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customerData.googlePlaceId}`;

    const welcomeMsg = { /* ... your full welcome email object ... */ };
    const internalNotificationMsg = { /* ... your full internal notification email object ... */ };

    await Promise.all([
        sgMail.send(welcomeMsg),
        sgMail.send(internalNotificationMsg)
    ]);
    console.log(`Emails sent successfully for new customer ${customerId}.`);
    // --- END OF MOVED LOGIC ---

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
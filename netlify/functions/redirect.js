// In: netlify/functions/redirect.js

const admin = require('firebase-admin');

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
  // 1. Get the customer's unique ID from the URL (e.g., ?id=someUserId)
  const customerId = event.queryStringParameters.id;

  if (!customerId) {
    return { statusCode: 400, body: 'Customer ID is missing.' };
  }

  try {
    const customerRef = db.collection('customers').doc(customerId);
    const doc = await customerRef.get();

    if (!doc.exists) {
      return { statusCode: 404, body: 'Customer not found.' };
    }

    const customerData = doc.data();

    // 2. THE "OFF SWITCH": Check if the customer's subscription is active
    if (customerData.subscriptionStatus !== 'active') {
      // Redirect to a page explaining the link is inactive.
      console.log(`Redirect blocked for inactive customer: ${customerId}`);
      return {
        statusCode: 302, // 302 is a temporary redirect
        headers: { 'Location': 'https://restaurantreviewcards.com/link-inactive.html' },
      };
    }

    // 3. THE COUNTER: Atomically increment the invite count.
    await customerRef.update({
      reviewInvitesSent: admin.firestore.FieldValue.increment(1),
    });

    // 4. THE REDIRECT: Send the user to their Google Review page.
    const googlePlaceId = customerData.googlePlaceId;
    const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;

    return {
      statusCode: 302,
      headers: { 'Location': googleReviewUrl },
    };

  } catch (error) {
    console.error(`Redirect Error for customer ${customerId}:`, error);
    // Fallback redirect to a generic Google page or your site's homepage
    return {
      statusCode: 302,
      headers: { 'Location': 'https://www.google.com' },
    };
  }
};
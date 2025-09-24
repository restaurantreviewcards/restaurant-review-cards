// In: netlify/functions/finalizeSignup.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin SDK if not already done
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
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

exports.handler = async (event) => {
  // This function would be called by your payment provider (e.g., Stripe webhook)
  // or after a successful payment confirmation on your site.
  // For this example, we'll assume the body contains the necessary info.
  const { placeId, email, userId } = JSON.parse(event.body);

  if (!placeId || !email || !userId) {
    return { statusCode: 400, body: 'Missing required signup information.' };
  }

  try {
    // 1. Make a FRESH API call to Google to get the count AT THE MOMENT OF SIGNUP.
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,user_ratings_total&key=${googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      throw new Error('Could not fetch details from Google at signup.');
    }

    const initialReviewCount = data.result.user_ratings_total || 0;
    const placeName = data.result.name;

    // 2. Create the permanent customer document in a 'customers' collection.
    const customerData = {
      userId: userId,
      email: email,
      googlePlaceId: placeId,
      googlePlaceName: placeName,
      googleReviewCountInitial: initialReviewCount, // The crucial baseline
      googleReviewCountCurrent: initialReviewCount, // Initialize current count to the same
      reviewInvitesSent: 0, // Initialize the invite counter
      signupDate: new Date(),
      subscriptionStatus: 'active', // or whatever status you use
    };

    await db.collection('customers').doc(userId).set(customerData);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Customer ${userId} created successfully.` }),
    };

  } catch (error) {
    console.error('Finalize Signup Error:', error);
    return { statusCode: 500, body: 'An error occurred during final signup.' };
  }
};
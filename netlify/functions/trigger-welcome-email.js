// In: netlify/functions/trigger-welcome-email.js

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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId } = JSON.parse(event.body);

    if (!placeId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Place ID is required.' }) };
    }

    // Find the most recent signup document for this placeId
    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();

    if (snapshot.empty) {
      console.warn(`Welcome email trigger: Signup data not found for placeId ${placeId}.`);
      // Return success even if not found to prevent client-side errors
      return { statusCode: 200, body: JSON.stringify({ message: 'Signup not found, email not sent.' }) };
    }

    const signupDocRef = snapshot.docs[0].ref;
    const signupData = snapshot.docs[0].data();

    // Check if the email has already been sent
    if (signupData.welcomeEmailSent === true) {
      console.log(`Welcome email already sent for placeId ${placeId}.`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Email previously sent.' }) };
    }

    // Construct the correct sample.html link using data from the record
    // Note: We don't need customized name/phone for this link, just the core data
    const sampleLink = new URL('https://restaurantreviewcards.com/sample.html');
    sampleLink.searchParams.set('placeId', signupData.googlePlaceId);
    sampleLink.searchParams.set('email', signupData.email);
    sampleLink.searchParams.set('name', signupData.googlePlaceName); // Original Google name
    sampleLink.searchParams.set('rating', signupData.googleRating ? signupData.googleRating.toString() : '0');
    sampleLink.searchParams.set('reviews', signupData.googleReviewCount ? signupData.googleReviewCount.toString() : '0');
    // Important: DO NOT pass displayName or phoneNumber here if they aren't saved yet

    // Prepare the welcome email content (same as before, but using signupData)
    const customerMsg = {
      to: signupData.email,
      bcc: 'jake@restaurantreviewcards.com',
      from: {
        email: 'jake@restaurantreviewcards.com',
        name: 'Jake from RRC'
      },
      subject: `Your Welcome Kit for ${signupData.googlePlaceName} is Ready to Ship`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <p>Hi there,</p>
          <p>Your sample for <strong>${signupData.googlePlaceName}</strong> is ready!</p>

          <p>Follow the link below to view your sample and access your <strong>FREE Welcome Kit</strong> offer, including <strong>250 Smart Review Cards</strong> and <strong>2 Counter Stands</strong>.</p>

          <a href="${sampleLink.toString()}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; margin-bottom: 20px; font-weight: bold;">
            View Sample & Get Started
          </a>
          <p>Let me know if you have questions!</p>
          <p>Cheers,<br>Jake</p>
        </div>
      `,
    };

    // Send the email
    await sgMail.send(customerMsg);
    console.log(`Welcome email sent successfully to ${signupData.email} for placeId ${placeId}.`);

    // Update the Firestore document to mark the email as sent
    await signupDocRef.update({
      welcomeEmailSent: true
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Welcome email sent successfully.' }) };

  } catch (error) {
    console.error('Error in trigger-welcome-email function:', error);
    // Log detailed error but return generic message to client
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process welcome email request.' }) };
  }
};
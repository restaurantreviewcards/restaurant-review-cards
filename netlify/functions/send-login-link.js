const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    const { email } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
    }

    const customersRef = db.collection('customers');
    const snapshot = await customersRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (snapshot.empty) {
      // Still return a success message to prevent people from checking for valid emails
      console.log(`Login attempt for non-existent email: ${email}`);
      return { statusCode: 200, body: JSON.stringify({ message: 'Link sent.' }) };
    }

    const customer = snapshot.docs[0].data();
    const dashboardUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${customer.googlePlaceId}`;

    const msg = {
      to: email,
      from: 'jake@restaurantreviewcards.com', // Use your verified sender email
      subject: 'Your Restaurant Review Cards Dashboard Link',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 30px;">
          <h2>Here's Your Secure Login Link</h2>
          <p>Click the button below to access your dashboard. This link is valid for 15 minutes.</p>
          <a href="${dashboardUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px;">
            Go to My Dashboard
          </a>
        </div>
      `,
    };

    await sgMail.send(msg);

    return { statusCode: 200, body: JSON.stringify({ message: 'Link sent.' }) };

  } catch (error) {
    console.error('Error sending login link:', error);
    // Generic error for the client
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not send login link.' }) };
  }
};
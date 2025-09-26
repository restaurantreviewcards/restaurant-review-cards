// In: netlify/functions/generate-sample.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');
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
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

function parseAddressComponents(components) {
  const address = {};
  components.forEach(component => {
    const types = component.types;
    if (types.includes('street_number')) address.streetNumber = component.long_name;
    if (types.includes('route')) address.streetName = component.long_name;
    if (types.includes('locality')) address.city = component.long_name;
    if (types.includes('administrative_area_level_1')) address.state = component.short_name;
    if (types.includes('postal_code')) address.zip = component.long_name;
  });
  return {
    line1: `${address.streetNumber || ''} ${address.streetName || ''}`.trim(),
    city: address.city || '',
    state: address.state || '',
    zip: address.zip || '',
  };
}

exports.handler = async (event) => {
  const formData = new URLSearchParams(event.body);
  const placeId = formData.get('place_id');
  const email = formData.get('email');
  const submittedName = formData.get('restaurant-name');

  if (!placeId || !email || !googleApiKey) {
    return { statusCode: 400, body: 'Missing required information.' };
  }

  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,url,address_components&key=${googleApiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const placeData = await detailsResponse.json();

    if (!placeData.result) {
      throw new Error('Could not retrieve restaurant details from Google.');
    }
    
    const { name, rating, user_ratings_total, url, address_components } = placeData.result;
    
    const parsedAddress = parseAddressComponents(address_components);

    await db.collection('signups').add({
      email: email,
      submittedName: submittedName,
      googlePlaceId: placeId,
      googlePlaceName: name || 'N/A',
      googleRating: rating || 'N/A',
      googleReviewCount: user_ratings_total || 0,
      googleMapsUrl: url || 'N/A',
      googleAddressLine1: parsedAddress.line1,
      googleAddressCity: parsedAddress.city,
      googleAddressState: parsedAddress.state,
      googleAddressZip: parsedAddress.zip,
      timestamp: new Date(),
    });

    const redirectUrl = `https://restaurantreviewcards.com/sample.html?name=${encodeURIComponent(name)}&rating=${rating}&reviews=${user_ratings_total}&placeId=${placeId}&email=${encodeURIComponent(email)}`;

    // Email to the Customer
    const customerMsg = {
      to: email,
      bcc: 'jake@restaurantreviewcards.com',
      from: {
        email: 'jake@restaurantreviewcards.com',
        name: 'Jake from RRC'
      },
      subject: `Your Custom Sample for ${name} is Ready!`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #005596;">Your Live Preview is Ready!</h2>
          <p>Hi there,</p>
          <p>Thank you for your interest in our Smart Review Cards. We've generated a live, interactive sample page for <strong>${name}</strong>.</p>
          <p>Click the button below to see how our system works to help you get more 5-star Google reviews.</p>
          <a href="${redirectUrl}" style="background-color: #005596; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; margin-bottom: 20px;">
            View My Live Sample
          </a>
          <p>If you have any questions, feel free to reply directly to this email.</p>
          <p>Cheers,<br>Jake</p>
        </div>
      `,
    };

    // **NEW** Internal Notification Email to You
    const internalMsg = {
        to: 'jake@restaurantreviewcards.com',
        from: 'notification@restaurantreviewcards.com', // Can be a no-reply or internal address
        subject: `🔥 New Sample Generated: ${name}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #005596;">New Lead Information</h2>
                <p>A new sample has been generated. Here are the details:</p>
                <ul>
                    <li><strong>Business Name:</strong> ${name}</li>
                    <li><strong>Email Submitted:</strong> ${email}</li>
                    <li><strong>Business Address:</strong> ${parsedAddress.line1}, ${parsedAddress.city}, ${parsedAddress.state} ${parsedAddress.zip}</li>
                    <li><strong>Current Rating:</strong> ${rating} (${user_ratings_total} reviews)</li>
                </ul>
                <a href="${redirectUrl}" style="background-color: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px;">
                    View Their Custom Sample Page
                </a>
            </div>
        `,
    };

    // Send both emails
    await Promise.all([
        sgMail.send(customerMsg),
        sgMail.send(internalMsg)
    ]);

    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
      },
    };

  } catch (error) {
    console.error('Error in generate-sample function:', error);
    const fallbackRedirect = `/sample.html?name=${encodeURIComponent(submittedName)}&placeId=${placeId}&email=${encodeURIComponent(email)}&error=email_failed`;
    return {
      statusCode: 302,
      headers: { 'Location': fallbackRedirect },
    };
  }
};
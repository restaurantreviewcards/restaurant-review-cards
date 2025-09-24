<<<<<<< HEAD
// In: netlify/functions/get-maps-key.js

=======
// In netlify/functions/get-maps-key.js
>>>>>>> bf3e31938eb5ac17b673d4e98e54f9f76a39dbb2
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      apiKey: process.env.PUBLIC_GOOGLE_MAPS_API_KEY,
    }),
  };
};
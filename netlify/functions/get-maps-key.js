// In: netlify/functions/get-maps-key.js

exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      apiKey: process.env.PUBLIC_GOOGLE_MAPS_API_KEY,
    }),
  };
};
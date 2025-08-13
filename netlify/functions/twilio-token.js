// netlify/functions/twilio-token.js
const twilio = require('twilio');

exports.handler = async function(event, context) {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY_SID; // Note: Using API Key is safer
    const twilioApiSecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWIML_APP_SID;
    const identity = 'customer'; // Can be made dynamic later

    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: false, // We are only making outbound calls from the browser
    });

    const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { identity: identity });
    token.addGrant(voiceGrant);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.toJwt() })
    };
};
// netlify/functions/twilio-webhook.js
const twilio = require('twilio');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

// This function will be the main entry point for Twilio calls
exports.handler = async function(event, context) {
    const twiml = new twilio.twiml.VoiceResponse();
    const userInput = event.body.SpeechResult || ''; // SpeechResult is what Twilio gives us
    const sessionId = event.body.CallSid; // Use the Twilio CallSid as a session ID

    // If the user said something, send it to Dialogflow
    if (userInput) {
        const dialogflowResponse = await getDialogflowResponse(sessionId, userInput);
        twiml.say(dialogflowResponse);
    } else {
        // This is the first turn of the call
        twiml.say('Hello, you have reached Telco Solutions. How can I help you today?');
    }

    // Tell Twilio to listen for the user's next response
    twiml.gather({
        input: 'speech',
        action: '/.netlify/functions/twilio-webhook', // Loop back to this function
        speechTimeout: 'auto'
    });

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.toString()
    };
};

// This helper function talks to your Dialogflow agent
async function getDialogflowResponse(sessionId, userText) {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const agentId = process.env.DIALOGFLOW_AGENT_ID;
    const location = process.env.DIALOGFLOW_LOCATION;
    
    try {
        const client = new SessionsClient({ apiEndpoint: `${location}-dialogflow.googleapis.com` });
        const sessionPath = client.projectLocationAgentSessionPath(projectId, location, agentId, sessionId);
        const request = { session: sessionPath, queryInput: { text: { text: userText }, languageCode: 'en' } };
        
        const [response] = await client.detectIntent(request);
        return response.queryResult.responseMessages[0].text.text[0];
    } catch (e) {
        console.error("Dialogflow Error:", e);
        return "I am having trouble connecting to my brain right now. Please try again later.";
    }
}
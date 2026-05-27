const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
    throw new Error('Twilio credentials and phone number must be configured in environment variables');
}

const client = twilio(accountSid, authToken);

const sendSMS = async (to, body) => {
    try {
        if (!client) {
            console.warn('[Twilio MOCK] Account SID or Auth Token missing. SMS log:', { to, body });
            return { sid: 'mock-sid-' + Date.now() };
        }
        const message = await client.messages.create({
            body,
            from: twilioPhone,
            to
        });
        console.log('SMS sent successfully, SID:', message.sid);
        return message;
    } catch (error) {
        console.error('Error sending SMS via Twilio:', error);
        throw error;
    }
};

module.exports = { sendSMS };

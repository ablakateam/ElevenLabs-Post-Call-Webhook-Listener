require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const sgMail  = require('@sendgrid/mail');

const app = express();

// Capture raw body for HMAC
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Load configuration
const {
  ELEVENLABS_WEBHOOK_SECRET,
  SENDGRID_API_KEY,
  NOTIFY_TO,
  PORT = 3000
} = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

// Verify HMAC signature per ElevenLabs docs
function verifySignature(req) {
  const header = req.headers['elevenlabs-signature'] || '';
  const [tPart, v0Part] = header.split(',');
  if (!tPart || !v0Part) return false;

  const timestamp = tPart.replace(/^t=/, '');
  const signature = v0Part.replace(/^v0=/, '');
  const payload   = req.rawBody.toString();
  const signed    = `${timestamp}.${payload}`;

  const expected = crypto
    .createHmac('sha256', ELEVENLABS_WEBHOOK_SECRET)
    .update(signed)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected,  'hex')
    );
  } catch {
    return false;
  }
}

// Main webhook handler
app.post(['/', '/webhook/elevenlabs'], async (req, res) => {
  if (!verifySignature(req)) {
    console.error('❌ Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  const { event, type, data } = req.body;
  const evt = event || type;
  if (evt !== 'call.finished' && evt !== 'post_call_transcription') {
    return res.sendStatus(204);
  }

  // Extract phone number
  const phone =
    data.from ||
    data.to ||
    data.phone_number ||
    'Unknown';

  // Build transcript
  const transcript = (data.transcript || [])
    .map(t => `${t.role}: ${t.message}`)
    .join('\n');

  const msg = {
    to:      NOTIFY_TO,
    from:    'info@eboxlab.com',
    subject: 'New call from your AI agent',
    text: `
You have a new call from your AI agent.

Phone number: ${phone}

Transcript:
${transcript}
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Notification sent for ${data.conversation_id}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ SendGrid error:', err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`➡️ Listening on port ${PORT}`);
});

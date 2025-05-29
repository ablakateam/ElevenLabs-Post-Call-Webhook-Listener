# ElevenLabs-Post-Call-Webhook-Listener
This repository contains a Node.js/Express application that listens for ElevenLabs post-call webhooks, verifies HMAC signatures, and sends call summaries (with phone number and transcript) via SendGrid.


Repository Structure

.
├── index.js             # Main webhook listener code
├── .env.example         # Environment variables template
├── package.json         # NPM dependencies and scripts
├── .gitignore           # Files to ignore in Git
└── README.md            # This manual

Prerequisites

Node.js v16+ and npm

A SendGrid API key

An ElevenLabs webhook signing secret

A server (e.g., Vultr) with a public domain (e.g., api.eboxlab.com)

Nginx (for reverse proxy and SSL)

PM2 (to keep the app running)

Installation

Clone the repository

git clone https://github.com/your-org/elevenlabs-webhook.git
cd elevenlabs-webhook

Install dependencies

npm install

Create your environment file

cp .env.example .env

Edit .env with your actual values:

ELEVENLABS_WEBHOOK_SECRET=wsec_...your_secret...
SENDGRID_API_KEY=SG.your_sendgrid_key
NOTIFY_TO=info@ablaka.com
PORT=3000

Application Code (index.js)

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
    from:    'info@domain.com',
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

Environment File Template (.env.example)

ELEVENLABS_WEBHOOK_SECRET=wsec_...your_secret...
SENDGRID_API_KEY=SG.your_sendgrid_key
NOTIFY_TO=info@ablaka.com
PORT=3000

Deployment

1. Start with PM2

npm install -g pm2
pm2 start index.js --name elevenlabs-webhook
pm2 save
pm2 startup    # follow instructions

2. Nginx Reverse Proxy & SSL

Install Nginx: apt install nginx

Config (/etc/nginx/sites-available/elevenlabs-webhook):

server {
  listen 80;
  server_name api.eboxlab.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection   "upgrade";
    proxy_set_header Host         $host;
  }
}

Enable & reload:

ln -s /etc/nginx/sites-available/elevenlabs-webhook /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

Enable HTTPS:

apt install certbot python3-certbot-nginx
certbot --nginx -d api.domain.com

Testing

Verify HTTP:

curl -i http://api.domain.com/

Verify HTTPS:

curl -i https://api.domain.com/

Send test event in ElevenLabs dashboard. Check PM2 logs and your inbox (info@domain.com).

Feel free to fork or clone this repository, update the values in .env, and deploy according to your needs. Safe coding!

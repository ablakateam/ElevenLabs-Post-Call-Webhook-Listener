ElevenLabs Post-Call Webhook Listener

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

npm install -g pm2
pm2 start index.js --name elevenlabs-webhook
pm2 save
pm2 startup    # follow instructions



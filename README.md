# ElevenLabs Post-Call Webhook Listener

A simple Node.js/Express service that receives post-call webhooks from ElevenLabs, verifies HMAC signatures, and emails a call summary (including phone number and transcript) via SendGrid.

---

## 📦 Features

- **HMAC-SHA256 verification** of incoming webhook payloads  
- Supports `call.finished` and `post_call_transcription` events  
- Extracts caller phone number and full transcript  
- Sends notification email via SendGrid  
- Easy deployment on any Linux server with PM2 & Nginx  

---

## 🛠️ Prerequisites

- **Node.js** v16+ & **npm**  
- **SendGrid** API key  
- **ElevenLabs** webhook signing secret  
- A **public domain** (e.g. `api.eboxlab.com`) pointing at your server  
- **Nginx** (for reverse-proxy + SSL)  
- **PM2** (to keep the service running)  

---

## 🚀 Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/your-org/elevenlabs-webhook.git
   cd elevenlabs-webhook

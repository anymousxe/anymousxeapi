# AnyLM Chat v9.0 — Quick Start Guide

## What Changed

The chat interface has been completely simplified:
- **No signup/login required** — Just use an API key
- **Only 3 free models visible** by default: Gemini 3 Flash, GLM-5, Kimi K2.5
- **Simple, clean interface** — Enter API key and start chatting
- **API key management** — Create, view, and delete keys in one modal
- **Credit balance tracking** — See your balance in the header

## How to Use

### 1. **Enter Your API Key**
- Go to https://anylm.anymousxe-info.workers.dev/chat
- You'll see the API Key prompt
- Paste your API key (format: `any-xxxxxxxxxxxxxxxx`)
- Click "Connect"

### 2. **Start Chatting**
- Select a model from the dropdown (only 3 free models shown)
- Type your message
- Click "Send" or press Enter
- Watch it stream back in real-time

### 3. **Manage API Keys**
- Click the "API Keys" button in the top right
- Create new keys with custom labels
- Copy keys to clipboard
- Delete old keys
- Keys are stored in your account

### 4. **View Credit Balance**
- Credit balance displays in the top right as a green badge
- Shows your available credits for paid models
- Refresh the page to see updated balance after API calls

## API Key Format
- Keys start with `any-`
- Full format: `any-` + 12 random characters
- Example: `any-a1b2c3d4e5f6`

## How Credits Work

### Free Models (No Credits Needed)
- Gemini 3 Flash
- GLM-5
- Kimi K2.5
- Use these models unlimited (within rate limits)

### Paid Models (Require Credits)
- Claude Haiku 4.5 — $0.25 / $1.25 per 1M tokens
- Claude Sonnet 4.6 — $3 / $15 per 1M tokens
- Claude Opus 4.6 — $15 / $75 per 1M tokens
- Others available via API key management

### Adding Credits
- Deposits coming soon via MoonPay integration
- Contact support for manual credit additions
- Your account starts with $2 in free trial credits

## Troubleshooting

**"Invalid API key" error?**
- Make sure your API key is formatted correctly (should start with `any-`)
- Check that you haven't edited the key
- Generate a new one via the API Keys modal

**"Insufficient credits" error?**
- You tried to use a paid model without credits
- Stick to the 3 free models or add credits
- Free models are Gemini 3 Flash, GLM-5, Kimi K2.5

**Models not loading?**
- Refresh the page
- Check your internet connection
- Try a different model

**Chat not sending?**
- Make sure you have an API key connected
- Check the status bar at the bottom
- Try a different message

## API Endpoints (Advanced)

If you're building a custom client:

```bash
# Chat completions (streaming)
curl -X POST https://anylm.anymousxe-info.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer any-xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'

# Get available models
curl https://anylm.anymousxe-info.workers.dev/v1/models

# Check your credits
curl -H "Authorization: Bearer any-xxxxx" \
  https://anylm.anymousxe-info.workers.dev/v1/credits

# List your API keys
curl -H "Authorization: Bearer any-xxxxx" \
  https://anylm.anymousxe-info.workers.dev/v1/keys
```

## Backend URL for Integrations

Base URL: `https://anylm.anymousxe-info.workers.dev/v1`

All endpoints are OpenAI-compatible, so you can use any OpenAI client library and just change the base URL.

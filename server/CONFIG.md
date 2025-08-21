# Server Configuration

## Environment Variables Setup

This server uses a two-file environment variable system:

### 📄 `.env` (Template - Committed to Git)
- Contains **default values** and **placeholders**
- Safe to commit to repository
- Shows what variables are needed
- Used as documentation

### 📄 `.env.local` (Actual Values - NOT Committed)
- Contains **real API keys** and **local overrides**
- **Never committed to git** (excluded by .gitignore)
- Used for actual development and deployment
- Takes priority over `.env` values

## Setup Instructions

1. **Copy the template:**
   ```bash
   cp .env .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   ```bash
   # Add your real Gemini API key
   GEMINI_API_KEY=AIzaSyC...
   
   # Add your real OpenAI API key (optional)
   OPENAI_API_KEY=sk-proj-...
   ```

3. **Never commit `.env.local`** - it contains secrets!

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI analysis |
| `API_PORT` | No | Server port (default: 3002) |
| `NODE_ENV` | No | Environment (development/production) |
| `OPENAI_API_KEY` | No | OpenAI API key (for future features) |

## Production Deployment

In production/CI pipelines:
- Set environment variables through your deployment platform
- Or use `.env.production` files
- Never include real API keys in committed files

## 🔐 Browser Profile & Authentication API

The server provides browser profile detection and authentication checking for session continuity.

### Browser Detection Endpoint
```http
GET /api/browsers
```

**Response:**
```json
{
  "browsers": [
    {
      "type": "chromium",
      "name": "Microsoft Edge", 
      "available": true,
      "profilePath": "C:\\Users\\...\\Microsoft\\Edge\\User Data\\Default"
    },
    {
      "type": "chromium",
      "name": "Google Chrome",
      "available": true, 
      "profilePath": "C:\\Users\\...\\Google\\Chrome\\User Data\\Default"
    }
  ],
  "message": "Found 2 available browsers"
}
```

### Domain Authentication Check
```http
POST /api/browsers/check-domain
Content-Type: application/json

{
  "url": "https://portal.example.com"
}
```

**Response:**
```json
{
  "domain": "portal.example.com",
  "loginStatus": {
    "edge": true,
    "chrome": false,
    "firefox": false
  },
  "message": "Checked login status for portal.example.com"
}
```

### Recording with Profile Sharing
```http
POST /api/record/start
Content-Type: application/json

{
  "url": "https://portal.example.com",
  "browserType": "chromium",
  "browserName": "Microsoft Edge",
  "useProfile": true,
  "name": "Login Workflow Test"
}
```

**Profile Sharing Behavior:**
- `useProfile: true` → Uses `launchPersistentContext()` with browser profile path
- `useProfile: false` → Uses clean browser context  
- Analysis phase automatically matches recording session's profile settings
- Maintains authentication state between recording and analysis for accurate results

## Getting API Keys

- **Gemini API**: https://makersuite.google.com/app/apikey
- **OpenAI API**: https://platform.openai.com/api-keys

# Web Access Advisor Server Configuration

## Environment Setup

### Development

1. Copy the template environment file:
   ```bash
   cp .env .env.local
   ```

2. Edit `.env.local` and add your actual API keys:
   ```bash
   # Get a Gemini API key from: https://makersuite.google.com/app/apikey
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. Start the server:
   ```bash
   npm run dev:server
   ```

### Production Deployment

In production environments, set environment variables directly in your deployment platform:

#### Docker
```dockerfile
ENV GEMINI_API_KEY=your_production_key
ENV API_PORT=3002
ENV NODE_ENV=production
```

#### Vercel/Netlify
Set environment variables in your platform's dashboard:
- `GEMINI_API_KEY`
- `API_PORT`
- `NODE_ENV`

#### Traditional Server
```bash
export GEMINI_API_KEY=your_production_key
export API_PORT=3002
export NODE_ENV=production
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key for AI analysis |
| `GEMINI_HTML_MAX_SIZE` | No | 1048576 | Maximum HTML size (bytes) sent to Gemini (1MB default) |
| `API_PORT` | No | 3002 | Port for the API server |
| `NODE_ENV` | No | development | Environment mode |
| `PLAYWRIGHT_HEADLESS` | No | false | Run browser in headless mode |
| `PLAYWRIGHT_SLOW_MO` | No | 50 | Slow down Playwright actions (ms) |
| `RECORDING_TIMEOUT` | No | 30000 | Recording session timeout (ms) |
| `ANALYSIS_TIMEOUT` | No | 60000 | Analysis timeout (ms) |

## File Structure

```
server/
├── .env                 # Template with defaults (committed)
├── .env.local          # Your actual API keys (ignored by git)
├── .env.production     # Production config (ignored by git)
├── .gitignore          # Protects sensitive files
├── index.ts            # Main server file
├── recordingService.ts # Recording logic
└── README.md           # This file
```

## Security Notes

- ✅ `.env.local` and `.env.production` are ignored by git
- ✅ Template file `.env` is committed for reference
- ✅ Environment loading prioritizes `.env.local` over `.env`
- ⚠️ Never commit actual API keys to version control

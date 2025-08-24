# Web Access Advisor

A React-based accessibility testing tool that records user interactions, replays them with snapshot capture, and provides AI-powered accessibility analysis using Google Gemini.

## 🎯 Features

- **Record-First Approach**: Capture user interactions without slowing down the experience
- **Smart DOM Change Detection**: Only snapshots when meaningful changes occur  
- **Component-Focused Analysis**: AI analysis targeting 16+ interactive component types
- **Before/After State Comparison**: Analyzes how components behave during interactions
- **Axe-Core Integration**: Real accessibility testing with structured results
- **Actionable Reports**: Provides actual HTML fixes, not just descriptions

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web-access-advisor

# Install dependencies (triggers automatic browser download)
npm install
```

> **Note**: The `postinstall` script automatically downloads Playwright browsers (~100MB) after `npm install` completes. This ensures consistent testing across all environments and CI/CD pipelines.

### Required Build Steps

Before starting the development servers, you need to build the required packages:

```bash
# Option A: Build everything (recommended)
npm run build

# Option B: Build only what's needed
npm run build:core    # Shared accessibility analysis engine
npm run build:server  # Express API server
```

### Start Development Environment

```bash
npm run dev:full
```

This starts both:
- **Frontend**: http://localhost:5173/ (React development server)
- **Backend**: http://localhost:3001/ (Express API server)

Expected output:
```
[0] Server listening on port 3001
[1] Frontend ready at http://localhost:5173/
```

## 📋 Available Scripts

```bash
# Development
npm run dev           # Frontend only (Vite)
npm run dev:server    # Backend only (Express)
npm run dev:full      # Both frontend and backend
npm run dev:cli       # CLI development mode

# Building
npm run build         # Build all packages + frontend
npm run build:core    # Build core analysis engine
npm run build:server  # Build Express server
npm run build:cli     # Build CLI tool

# Other
npm run preview       # Preview production build
npm run cli           # Run CLI tool
```

## 🏗️ Architecture

### Monorepo Structure
- **Root**: React frontend application
- **packages/core**: Shared accessibility analysis engine
- **packages/cli**: Command-line interface
- **server**: Express API server

### Core Technologies
- **React 18** - Modern functional components with hooks
- **Playwright** - Browser automation and recording
- **Axe-Core** - Accessibility testing engine  
- **Google Gemini** - AI-powered accessibility analysis
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast development and build tooling

## 🔐 Browser Profile Sharing

Web Access Advisor supports **authenticated session testing** through browser profile sharing, allowing you to test logged-in workflows without re-authentication during analysis.

### How Profile Sharing Works

**Profile Detection:**
- Automatically detects available browser profiles (Chrome, Edge, Firefox)
- Shows login status for each browser on your system
- Indicates which browsers have active sessions for tested domains

**Recording with Profiles:**
- Check "Use Profile" when recording authenticated workflows
- Browser launches with your existing login session (cookies, tokens, etc.)
- No need to log in again during recording - you're already authenticated

**Analysis Consistency:**
- Analysis phase uses the **same browser profile** as recording
- Maintains authentication state between recording and analysis
- Ensures analysis captures the same pages you recorded (not login screens)

### Supported Browsers

| Browser | Profile Support | Session Sharing | Notes |
|---------|----------------|-----------------|-------|
| **Microsoft Edge** | ✅ Full | ✅ Reliable | Recommended for enterprise SSO |
| **Google Chrome** | ✅ Full | ✅ Enhanced | Improved profile detection |
| **Firefox** | ⚠️ Limited | ❌ Not Yet | Profile detection only |

### Authentication Flow Options

**Option 1: Profile Sharing (Recommended for Auth)**
```
1. Already logged in to Chrome/Edge → Check "Use Profile" 
2. Recording launches with existing session → Record workflow
3. Analysis uses same profile → Maintains login throughout
4. Results show authenticated pages → Accurate analysis
```

**Option 2: Manual Login (Public Workflows)**
```
1. Don't check "Use Profile" → Clean browser launches
2. Log in manually during recording → Record workflow  
3. Analysis uses clean browser → Hits login walls
4. Results may show login pages → Less accurate for auth workflows
```

### Best Practices

**For Authenticated Workflows:**
- ✅ **Always use profile sharing** for login-required sites
- ✅ **Verify login status** shown in browser selection
- ✅ **Close browser instances** before recording to avoid profile locks
- ✅ **Use Chrome or Edge** for best profile compatibility

## StorageState export & replay validation

To make replays reuse authenticated sessions without requiring manual remote-debugging, Web Access Advisor now exports and validates Playwright storageState for recordings.

- When a recording stops we export the Playwright storage state (cookies + localStorage) to `./snapshots/<sessionId>/storageState.json`.
- The backend exposes two helper endpoints:
	- `GET /api/sessions/:id/storage-state/status` — quick status (present/expired/earliest expiry) based on saved cookies.
	- `POST /api/sessions/:id/storage-state/validate` — deep validation: the server loads the saved storageState into a temporary Playwright context, navigates to a probe URL and optionally waits for a selector to confirm the login is usable.
- Frontend flows:
	- Recording: sign in while recording if you want replays to reuse your login — we save the login state at stop (storageState.json).
	- Replay: use the "Validate" button in the replay controls to check the saved state. If validation fails, the UI offers a lightweight "Re-login" detour that opens the browser for an interactive sign-in and saves a new storageState for the session.

Notes:
- We avoid logging cookie values or other secrets; validation is a behavioural probe (navigation + selector) rather than cookie inspection.
- Edge profile sharing remains the most reliable path for reusing local sign-in state on Windows; Chrome storageState is saved and validated but persistent-profile reuse may have platform-specific fallbacks.

**For Public Workflows:**  
- ✅ **Clean browser is fine** for public sites
- ✅ **Faster startup** without profile loading
- ✅ **No authentication dependencies**

### Troubleshooting Profile Issues

**"Profile not accessible" errors:**
- Close all browser instances before recording
- Ensure browser isn't running in background
- Try different browser (Edge often more reliable than Chrome)

**Analysis shows login pages instead of recorded content:**
- Recording was likely done without profile sharing
- Re-record with "Use Profile" enabled
- Verify login status before starting analysis

**Chrome profile sharing not working:**
- Chrome can have stricter profile locking
- Try Microsoft Edge instead (same engine, better profile access)
- Ensure Chrome isn't running when starting recording

## 🧠 LLM Integration

The system uses Google Gemini for intelligent accessibility analysis:

- **Component Detection**: Automatically identifies interactive components (dropdowns, modals, tabs, etc.)
- **State Analysis**: Compares before/after DOM states during interactions
- **WCAG Compliance**: Provides expert-level accessibility assessments
- **Code Fixes**: Shows actual corrected HTML code examples
- **Screen Reader Focus**: Targets assistive technology compatibility

## 🔧 Environment Setup

### Automatic Setup
Playwright browsers are automatically installed during `npm install` via the `postinstall` script. This ensures:
- ✅ Consistent browser versions across environments
- ✅ Reliable CI/CD pipeline execution  
- ✅ No manual browser installation steps

### Environment Variables
Create a `.env` file in the root directory:

```env
# Gemini AI (for accessibility analysis)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Gemini HTML size limit (bytes, default 1MB)
GEMINI_HTML_MAX_SIZE=1048576

# Optional: OpenAI (for auto-playwright)
OPENAI_API_KEY=sk-proj-...

# App Configuration
VITE_APP_NAME=Web Access Advisor
VITE_APP_VERSION=2.0.0
NODE_ENV=development
```

## 📖 Usage

1. **Build required packages** (see Quick Start above)
2. **Start development environment**: `npm run dev:full`
3. **Open frontend**: http://localhost:5173/
4. **Record interactions**: Enter URL and start recording
5. **Analyze accessibility**: Run replay with AI analysis enabled
6. **Review results**: Get component-specific fixes and recommendations

## 🧪 Core Workflow

### Recording Phase (Real-time)
- User enters URL → Navigate to page
- User interactions → Capture actions to JSON
- Live action feed → Smooth UX experience

### Analysis Phase (Background)
- Replay actions via Playwright
- Smart DOM change detection
- Capture HTML + run Axe-core tests
- AI analysis with before/after comparison
- Generate structured accessibility reports

## 📚 Documentation

- [PLANNING.md](PLANNING.md) - Detailed project architecture and workflow
- [TASK.md](TASK.md) - Development progress and completed features

## 🤝 Contributing

This project follows modern React and TypeScript best practices with a focus on accessibility-first development.

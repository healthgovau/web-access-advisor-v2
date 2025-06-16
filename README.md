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

# Install dependencies (automatically installs Playwright browsers)
npm install
```

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
npm run setup         # Install Playwright browsers (if needed)
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

## 🧠 LLM Integration

The system uses Google Gemini for intelligent accessibility analysis:

- **Component Detection**: Automatically identifies interactive components (dropdowns, modals, tabs, etc.)
- **State Analysis**: Compares before/after DOM states during interactions
- **WCAG Compliance**: Provides expert-level accessibility assessments
- **Code Fixes**: Shows actual corrected HTML code examples
- **Screen Reader Focus**: Targets assistive technology compatibility

## 🔧 Environment Setup

Create a `.env` file in the root directory:

```env
# Gemini AI (for accessibility analysis)
GEMINI_API_KEY=your_gemini_api_key_here

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

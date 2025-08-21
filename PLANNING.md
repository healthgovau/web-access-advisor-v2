# Web Access Advisor v2 - Project Planning

## 🎯 Project Overview

**Vision**: A React-based accessibility testing tool that records user interactions, replays them with snapshot capture, and provides AI-powered accessibility analysis.

**Architecture**: Record-first approach with parent-step flow tracking for intelligent accessibility analysis.

## 🏗️ Technical Stack

### Frontend Framework
- **React 18** - Modern functional components with hooks
- **Tailwind CSS** - Utility-first styling with accessibility focus
- **Vite** - Fast development and build tooling

### Browser Automation & Testing
- **Playwright** - Browser automation and recording
- **Auto-Playwright** - AI-enhanced browser interactions (OpenAI-powered)
- **Axe-core** - Accessibility testing engine
- **@axe-core/playwright** - Playwright integration for axe

### AI & Analysis
- **Google Gemini 1.5** - LLM for accessibility analysis and recommendations
- **@google/generative-ai** - Official Gemini SDK

### Testing & Quality
- **Vitest** - Unit testing framework
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Additional testing matchers

## 🔄 Core Workflow

### Two-Phase Architecture

#### Phase 1: Recording (Fast & Smooth)
1. User enters URL → Browser navigation
2. User interacts → Actions captured in real-time (no snapshots)
3. Actions displayed in live feed
4. Recording saved as JSON action sequence

#### Phase 2: Replay & Analysis (Background Processing)
1. Replay recorded actions with proper waits
2. Capture HTML snapshots + axe context at each step
3. Build parent-step relationship metadata
4. Group snapshots into logical flows
5. Batch flows for Gemini analysis
6. Generate accessibility reports

## 📁 Project Structure

```
src/
├── components/
│   ├── ModeToggle.jsx           # Manual/Auto mode switcher
│   ├── URLInput.jsx             # URL entry for testing
│   ├── RecordingControls.jsx    # Start/Stop recording
│   ├── ActionList.jsx           # Real-time action display
│   ├── ReplayControls.jsx       # Replay with options
│   ├── ProgressIndicator.jsx    # Status notifications
│   └── AnalysisResults.jsx      # AI analysis display
├── services/
│   ├── recorder.js              # Fast action recording
│   ├── replayer.js              # Action replay + snapshots
│   ├── gemini.js                # AI analysis service
│   ├── snapshots.js             # File system management
│   └── flowAnalyzer.js          # Parent-step flow detection
├── utils/
│   ├── stepTracker.js           # Parent relationship tracking
│   └── actionParser.js          # Action parsing/validation
└── examples/
    └── accessibility-workflow.js # Example usage patterns
```

## 🔗 Parent-Step Flow Tracking

### Concept
Parent-step relationships enable intelligent flow analysis by tracking where each interaction branches from, not just sequential order.

### Implementation
```javascript
// Example flow tracking
Step 1: Load page (parent: none)
Step 2: Fill email (parent: Step 1) 
Step 3: Open help modal (parent: Step 2) ← branches off
Step 4: Close modal (parent: Step 3) ← continues modal branch  
Step 5: Fill password (parent: Step 2) ← returns to main flow
```

### Benefits
- **Separate Analysis**: Modal interactions analyzed independently
- **Context Preservation**: Each flow maintains proper context
- **Token Efficiency**: Smaller, focused analysis requests
- **Better Results**: AI can focus on specific interaction patterns

## 💾 Data Storage Strategy

### Session-Based Structure
```
/snapshots/
  /session_2025-06-16_14-30-45/
    manifest.json                # Complete session metadata
    /step_001_initial_load/
      snapshot.html             # Full HTML content
      axe_context.json          # Axe accessibility context
      screenshot.png            # Optional visual reference
    /step_002_form_interaction/
      ...
```

### Metadata Schema
```json
{
  "sessionId": "session_2025-06-16_14-30-45",
  "url": "https://example.com/form",
  "totalSteps": 5,
  "steps": [
    {
      "step": 1,
      "parentStep": null,
      "action": "initial_load",
      "actionType": "navigation",
      "interactionTarget": null,
      "flowContext": "baseline",
      "uiState": "form_empty",
      "timestamp": "2025-06-16T14:30:45Z",
      "htmlFile": "step_001.html",
      "axeFile": "step_001_axe.json",
      "screenshotFile": "step_001.png",
      "domChanges": "baseline",
      "tokenEstimate": 2500
    }
  ]
}
```

## 🤖 AI Analysis Strategy

### Flow-Based Batching
1. **Group by parent relationships**: Main flows vs. modal sub-flows
2. **Optimize token usage**: Batch similar interaction types
3. **Provide context**: Include parent steps for sub-flow context
4. **Parallel analysis**: Multiple flow types analyzed separately

### Batch Types
- **Form Accessibility**: Form interactions and validation
- **Modal Accessibility**: Modal workflows and focus management
- **Navigation Accessibility**: Page navigation and routing
- **General Accessibility**: Mixed interaction patterns

### Gemini Prompts
- **Structured analysis**: Consistent format for issue extraction
- **WCAG focus**: Specific compliance assessment
- **Actionable recommendations**: Practical implementation guidance
- **Severity classification**: High/medium/low priority issues

## 🔧 Environment Configuration

### Required API Keys
```env
# OpenAI (for auto-playwright only)
OPENAI_API_KEY=sk-proj-...

# Gemini (for accessibility analysis)
GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
VITE_APP_NAME=Web Access Advisor
VITE_APP_VERSION=2.0.0
NODE_ENV=development
```

## 🚀 Development Workflow

### Mode Selection
- **Manual Mode** (Default): User-guided recording with maximum control
- **Auto Mode** (Experimental): AI-generated interactions for simple pages

### Recording Process
1. Enter URL and navigate
2. Start recording with custom name
3. Interact with page (actions captured instantly)
4. Stop recording when complete

### Analysis Process
1. Configure replay options (screenshots, waits, AI analysis)
2. Replay actions with snapshot capture
3. Flow analysis and intelligent batching
4. Gemini AI analysis of accessibility issues
5. Structured results with recommendations

## 🎨 UI/UX Principles

### Accessibility-First Design
- **WCAG 2.1 AA Compliance**: All components meet accessibility standards
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Color Contrast**: Minimum 4.5:1 ratio throughout
- **Focus Management**: Clear focus indicators and logical tab order

### Modern React Patterns
- **Functional Components**: No class components
- **Custom Hooks**: Reusable state logic
- **Context API**: Global state management
- **Error Boundaries**: Graceful error handling
- **Performance**: React.memo and optimization

### Responsive Design
- **Mobile-First**: Tailwind's responsive utilities
- **Progressive Enhancement**: Works on all screen sizes
- **Touch-Friendly**: Appropriate touch targets
- **Loading States**: Clear feedback for all operations

## 🧪 Testing Strategy

### Unit Testing (Vitest + React Testing Library)
- **Component Testing**: All React components
- **Service Testing**: Business logic and API calls
- **Utils Testing**: Helper functions and utilities
- **Integration Testing**: Component interaction

### E2E Testing (Playwright)
- **Recording Workflow**: Complete record-replay cycle
- **Analysis Pipeline**: End-to-end analysis process
- **Error Scenarios**: Graceful failure handling
- **Performance**: Response times and resource usage

### Accessibility Testing
- **Self-Testing**: Use the tool on itself
- **Screen Reader Testing**: NVDA/JAWS compatibility
- **Keyboard Testing**: Complete keyboard navigation
- **Color Contrast**: Automated and manual verification

## 🔄 Future Pipeline Features

### Recording Management
- **Recording Library**: Save and organize recordings
- **Recording Editor**: Modify recorded actions
- **Recording Sharing**: Export/import capabilities

### Pipeline Builder
- **Drag-Drop Interface**: Visual pipeline construction
- **Recording Chaining**: Combine multiple recordings
- **Conditional Logic**: Dynamic flow control
- **Scheduled Runs**: Automated regression testing

### Advanced Analysis
- **Trend Analysis**: Track accessibility improvements over time
- **Comparison Reports**: Before/after analysis
- **Custom Rules**: Organization-specific accessibility requirements
- **Integration APIs**: Connect with CI/CD pipelines

## 🔒 Security & Privacy

### Data Handling
- **Local Storage**: All snapshots stored locally
- **API Security**: Secure API key management
- **Sensitive Data**: Automatic detection and masking
- **Clean-up**: Automatic old snapshot removal

### Privacy Protection
- **No Data Collection**: No telemetry or analytics
- **Local Processing**: Analysis happens locally
- **User Control**: Complete control over data retention

This architecture provides a solid foundation for building a powerful, accessible, and user-friendly accessibility testing tool with modern React patterns and AI-enhanced analysis capabilities.
```
public/                  # Static assets
├── index.html          # Main HTML template
└── favicon.ico         # Application icon

vite.config.js          # Vite build configuration
tailwind.config.js      # Tailwind CSS configuration
.env                    # Environment variables
package.json            # Dependencies and scripts
```

## Workflow Architecture

### 1. Assessment Initiation
- User inputs target URL via React frontend
- Configuration validation (API keys, browser settings)
- Assessment parameters setup (WCAG level, specific checks)

### 2. Browser Automation & Profile Sharing

**Browser Launch Strategy:**
- Playwright supports both clean browsers and persistent contexts (profile sharing)
- Profile sharing enables authenticated session testing without re-login
- Both recording and analysis phases use consistent browser configurations

**Profile Detection System:**
```javascript
// Browser detection with profile availability
const browsers = await detectAvailableBrowsers();
// Returns: [{ type: 'chromium', name: 'Microsoft Edge', available: true, profilePath: '...' }]

// Profile-aware session continuity
const recordingOptions = { browserType: 'chromium', browserName: 'Microsoft Edge', useProfile: true };
const analysisOptions = { ...recordingOptions }; // Maintains same browser/profile
```

**Authentication Flow Support:**

*Without Profile Sharing:*
- Recording: Clean browser → User logs in manually → Actions recorded
- Analysis: Clean browser → Hits authentication barriers → Analyzes wrong pages
- Result: "Page not found" or login screens analyzed instead of intended workflow

*With Profile Sharing:*
- Recording: Browser with existing profile → Already authenticated → Actions recorded  
- Analysis: Same browser profile → Authentication maintained → Analyzes correct pages
- Result: Accurate analysis of authenticated workflow pages

**Browser-Specific Implementation:**
- **Microsoft Edge**: `launchPersistentContext(edgeProfilePath)` - Most reliable
- **Google Chrome**: `launchPersistentContext(chromeProfilePath)` - Enhanced with Chrome-specific args
- **Firefox**: Limited support (profile detection only, no persistent context yet)

**Technical Consistency:**
- Recording Service: `headless: false, slowMo: 50` for visible interaction recording
- Analysis Phase: Identical settings to maintain session consistency  
- Profile Paths: Exact same paths used in both phases for authentication continuity

### 3. Accessibility Analysis
- Axe-core integration for automated rule checking
- Custom accessibility pattern detection
- WCAG 2.1 criterion mapping
- Screen reader compatibility validation

### 4. AI-Enhanced Evaluation
- Direct OpenAI API calls from React frontend
- Context-aware accessibility insights
- Remediation suggestions with code examples
- Priority scoring based on impact and effort

### 5. Report Generation
- Structured accessibility reports
- Before/after comparisons
- Actionable remediation guidance
- WCAG 2.1 compliance scoring

## Development Constraints

### File Size & Structure
- Maximum 500 lines per file
- Modular component architecture
- Clear separation of concerns
- Consistent import patterns

### Testing Requirements
- Jest/React Testing Library for React components
- Playwright tests for E2E workflows
- Mock external services in unit tests
- Accessibility testing for the tool itself

## Success Metrics

### Technical Goals
- **Performance**: Assessment completion < 60 seconds
- **Accuracy**: 95%+ alignment with manual accessibility audits
- **Coverage**: Complete WCAG 2.1 AA criterion coverage
- **Reliability**: 99%+ successful assessment completion rate

### User Experience Goals
- **Usability**: Non-accessibility experts can run assessments
- **Actionability**: Clear, implementable remediation guidance
- **Learning**: Educational value for developers learning accessibility
- **Integration**: Easy integration into existing development workflows

## Risk Mitigation

### Technical Risks
- **Browser Compatibility**: Multi-browser Playwright configuration
- **API Rate Limits**: OpenAI API usage optimization and fallbacks
- **Large DOM Handling**: Efficient snapshot processing for complex sites
- **Configuration Complexity**: Simplified setup through environment variables

### Integration Risks
- **Dependency Conflicts**: Careful package version management
- **Environment Setup**: Automated setup through package.json scripts
- **Cross-platform Testing**: Ensure Playwright works across operating systems

## Future Enhancements

### Planned Features
- **Batch URL Assessment** - Multiple page testing workflows
- **CI/CD Integration** - GitHub Actions, Jenkins integration hooks
- **Custom Rule Sets** - Organization-specific accessibility rules
- **Historical Tracking** - Accessibility improvement over time
- **Team Collaboration** - Shared reports and team workflows

### Potential Integrations
- **Design System Validation** - Component library accessibility checking
- **CMS Integration** - WordPress, Drupal accessibility plugins
- **Browser Extensions** - Real-time accessibility feedback
- **IDE Plugins** - VS Code, WebStorm accessibility linting

---

**Next Steps**: Review TASK.md for current development priorities and implementation roadmap.

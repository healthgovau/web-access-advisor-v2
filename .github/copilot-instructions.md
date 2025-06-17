# GitHub Copilot Instructions for Web Access Advisor

## 🚨 CRITICAL: OVERLY COMPLIMENTING ME IS NOT HELPFUL. I RELY ON YOU FOR OBJECTIVITY AND TRUTHFULNESS.
**Don't begin each response with words like "You're absolutely right!" or "You're right!", unless I am verifiably right**
The issue is that it confuses me as to whether I am correct or not, as I need to be able to interpret your responses correctly.

## 🚨 CRITICAL: ASK BEFORE ANY CODE CHANGES
**ALWAYS ask for explicit permission before making ANY modifications to code files, creating new files, or running terminal commands.**

**NEVER proceed with actions after asking for permission - WAIT for the user's explicit approval.**

Do not proceed with code changes, file creation, or terminal execution without the user's explicit approval. This includes:
- Modifying existing files
- Creating new files  
- Running any terminal commands
- Installing packages
- Making configuration changes

**WAIT FOR USER CONFIRMATION**: After asking for permission, stop and wait for the user to explicitly say "yes", "proceed", "go ahead" or similar confirmation before taking any action.

## 📊 COMMUNICATION STYLE RULES
**NO EXAGGERATION OR PREMATURE SUCCESS CLAIMS**

- **Analyze data objectively** before making any claims about success or failure
- **Present findings without hype** - avoid excessive enthusiasm or celebration language
- **Wait for complete analysis** before declaring success or completion
- **Focus on facts and concrete evidence** rather than assumptions
- **Question discrepancies** and investigate thoroughly before drawing conclusions
- **Use measured language** - "appears to work" vs "works perfectly", "shows progress" vs "complete success"
- **No superlatives about user input** - don't preface responses with praise about suggestions, skills, or insights
- **Answer questions directly** - when user asks a question, provide the answer without assuming they want action taken

## 🧠 DESIGN PRINCIPLES
**THINK BEFORE YOU CODE**

- **Come up with something robust and not the first dumb idea that occurs to you**
- **Consider edge cases and failure modes** before implementing solutions
- **Design for maintainability** - future developers should understand your logic
- **Question broad time windows, magic numbers, and arbitrary thresholds**
- **Implement precise matching logic** rather than "close enough" approximations
- **Test your assumptions** - don't assume timestamp matching with 10-second windows is acceptable

## ⚠️ REACT & PLAYWRIGHT DEVELOPMENT RULES

### React Component Standards
**FOLLOW MODERN REACT BEST PRACTICES**

✅ **REQUIRED PRACTICES:**
- Use functional components with hooks over class components
- Implement proper prop types or TypeScript interfaces
- Follow React accessibility patterns (semantic HTML, ARIA attributes)
- Use React.memo() for performance optimization where appropriate
- Implement proper error boundaries for component error handling

### Playwright Integration Standards
**BROWSER AUTOMATION BEST PRACTICES**

✅ **ACCEPTABLE PLAYWRIGHT METHODS:**
1. Use official Playwright APIs and auto-playwright enhancements
2. Implement proper wait strategies (page.waitForSelector, page.waitForLoadState)
3. Create reusable page object models for common interactions
4. Handle browser context isolation for concurrent testing
5. Implement proper error handling and retry mechanisms

❌ **FORBIDDEN PLAYWRIGHT PRACTICES:**
- Direct DOM manipulation without proper Playwright APIs
- Hardcoded wait times (use dynamic waits instead)
- Browser automation without proper error handling
- Running multiple browser contexts without isolation
- Ignoring accessibility testing in automation scripts

### Accessibility-First Development
**WCAG 2.1 AA COMPLIANCE MANDATORY**

✅ **REQUIRED ACCESSIBILITY PRACTICES:**
1. **Semantic HTML** - Use proper heading hierarchy, landmarks, and form labels
2. **Keyboard Navigation** - All interactive elements must be keyboard accessible
3. **Screen Reader Support** - Proper ARIA attributes and announcements
4. **Color Contrast** - Minimum 4.5:1 ratio for normal text, 3:1 for large text
5. **Focus Management** - Visible focus indicators and logical tab order

❌ **ACCESSIBILITY VIOLATIONS TO AVOID:**
- Missing alt text on informative images
- Form inputs without associated labels
- Interactive elements not keyboard accessible
- Poor color contrast ratios
- Missing ARIA attributes on custom components

## 🔄 Project Awareness & Context

### Mandatory Reading
- **Always read `PLANNING.md`** at the start of every new conversation to understand project architecture, goals, constraints, and tech stack
- **Check `TASK.md`** before starting work to see current tasks and priorities
- **Reference React and Playwright best practices** for component development and browser automation

### Task Management
- **Update `TASK.md`** after completing any work - mark tasks complete and add new discoveries
- **If working on unlisted tasks**, add them to `TASK.md` with brief description and today's date
- **Follow consistent naming conventions** and architecture patterns from `PLANNING.md`

## 🧱 Code Structure & Modularity

### File Size Limits
- **Never create files longer than 500 lines of code**
- **If approaching limit**, refactor by splitting into modules or helper files
- **Organize code into clearly separated modules** grouped by feature/responsibility

### Project Structure
- **Use clear, consistent imports** (prefer relative imports within packages)
- **Follow the established directory structure** defined in `PLANNING.md`
- **Maintain separation of concerns** - each module has single responsibility
- **React components in `src/components/`** organized by feature
- **Services in `src/services/`** for API and browser automation integration
- **Playwright automation in `src/services/playwright/`** for browser testing

## 🧪 Testing & Reliability

### Mandatory Testing
- **Always create Vitest unit tests for React components** using React Testing Library
- **Create Playwright E2E tests** for complete user workflows
- **After updating logic**, check if existing tests need updates
- **React tests in `src/__tests__/`** or co-located with components
- **E2E tests in `/tests`** folder for integration testing

### Test Coverage Requirements
- **At least 1 test for expected use case**
- **1 edge case test**  
- **1 failure case test** (proper error handling)
- **Mock external services** (APIs, browser automation) - no real interactions in unit tests
- **Integration tests for OpenAI API communication**

### Testing Approach
- **Test changes directly with the application** using `npm run dev` rather than creating temporary test files
- **No temporary test files** - validate fixes by running the actual application
- **Use real application testing** to verify bug fixes and new functionality work correctly
- **Playwright E2E tests** for complete user workflows and accessibility testing

## 🚨 CRITICAL: APPLICATION TESTING RULES

### PRIMARY ENTRY POINT: npm run dev
**Use standard React development commands for testing.**

✅ **REQUIRED TESTING METHODS:**
```bash
# Development server
npm run dev

# Unit testing
npm run test

# E2E testing  
npm run test:e2e

# Production build testing
npm run build && npm run preview
```

### Frontend Development Testing
```bash
# React development server
npm run dev

# React component testing
npm run test

# React build validation
npm run build
```

### Setup and Dependencies
- **Setup is via npm install** - standard React project setup
- **Dependencies managed through package.json**
- **Environment variables via .env files**

## ✅ Task Completion Protocol

### Completion Requirements
- **Mark completed tasks in `TASK.md`** immediately after finishing
- **Add new sub-tasks/TODOs** discovered during work to "Discovered During Work" section
- **Update documentation** when features/setup changes

### Automatic Documentation Consistency Rules
- **When modifying VS Code tasks**: Always search for documentation references to changed/deleted tasks
- **When removing features**: Automatically grep search for references in README.md, CONTRIBUTING.md, and .github/copilot-instructions.md
- **Before completing task modifications**: Validate that all documentation accurately reflects current configuration
- **When changing API signatures**: Search for usage examples in documentation and update them
- **When adding/removing dependencies**: Update package.json and requirements.txt references in setup documentation
- **When modifying configuration**: Check that .env.example, configuration files, and setup instructions are consistent

## 📎 Style & Conventions

### React Standards
- **Follow modern React patterns** with functional components and hooks
- **Use TypeScript** for type safety where beneficial
- **Implement proper prop validation** with PropTypes or TypeScript interfaces
- **Follow React accessibility patterns** (semantic HTML, ARIA attributes)

### JavaScript/Node.js Standards
- **Follow modern ES6+ patterns** with consistent formatting
- **Use async/await** for asynchronous operations
- **Implement proper error handling** in all API calls
- **Consistent naming** following JavaScript conventions

### Tailwind CSS Standards
- **Use utility classes** for consistent styling
- **Leverage accessibility utilities** (focus:, screen-reader classes)
- **Follow responsive design patterns** (mobile-first approach)
- **Use semantic color naming** for accessibility

### Documentation Requirements
- **Write JSDoc comments for every function** using standard format:
  ```javascript
  /**
   * Brief summary of what function does.
   * 
   * @param {string} param1 - Description of parameter.
   * @param {number} param2 - Description of parameter.
   * @returns {boolean} Description of return value.
   */
  ```

### Comments & Clarity
- **Comment non-obvious code** for mid-level developer understanding
- **Add inline `# Reason:` comments** explaining why, not just what
- **Update `README.md`** when features added, dependencies change, or setup modified

## 🧠 AI Behavior Rules

### Context & Verification
- **Never assume missing context** - ask questions if uncertain
- **Never hallucinate libraries or functions** - only use known, verified packages
- **Always confirm file paths and module names exist** before referencing
- **Never delete or overwrite existing code** unless explicitly instructed or part of `TASK.md`

### React Project Specific Rules
- **Component structure follows established patterns** in existing modules
- **API integration through services layer** (`src/services/`)
- **State management through React Context** or established patterns
- **Accessibility testing integrated into development workflow**
- **Configuration through environment variables and React build process**

### Integration Constraints
- **All browser behavior controlled through Playwright APIs**
- **No modifications to third-party browser automation libraries**
- **Custom logic in wrapper files only** (`src/services/` modules)
- **Configuration-based solutions preferred** over code modifications

## 📚 Documentation Standards

### Required Documentation
- **Comprehensive inline comments** for complex logic
- **Google-style docstrings** for all functions and classes
- **README.md updates** for new features or setup changes
- **Architecture documentation** in comments for non-obvious design decisions

### Accessibility Focus
- **Understand the accessibility testing workflow** outlined in `PLANNING.md`
- **DOM snapshot capture follows before/after patterns**
- **Axe integration for accessibility testing**
- **LLM analysis for accessibility report generation**

## 🔧 VS Code Development Tasks

The following VS Code tasks are available for development workflow:

### Quality Assurance Tasks
- **Run Unit Tests** - Executes Vitest with verbose output
- **Run Tests with Coverage** - Tests with HTML coverage reports (target: 80%+)
- **Run E2E Tests** - Playwright end-to-end testing
- **Run Development Quality Checks** - Comprehensive quality validation

### Project Compliance Tasks  
- **Validate Project Structure** - Checks required documentation files
- **Run All Project Checks** - Complete compliance validation

### Application Tasks
- **Start Development Server** - Launches React development server (use `npm run dev` instead)

Use `Ctrl+Shift+P` → "Tasks: Run Task" to access these development tools.

---

**Remember: ALWAYS ASK FOR PERMISSION before making any code changes, creating files, or running commands. This rule overrides all other considerations.**

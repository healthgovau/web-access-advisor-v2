/**
 * Gemini AI service for accessibility analysis
 * Integrates with Google Gemini API to provide intelligent accessibility insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis, ComponentAccessibilityIssue, LLMDebugLog } from './types.js';
import { isAuthUrl, isAuthAction, type SessionAction } from './authDetection.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName = "gemini-2.0-flash";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }  /**
   * Analyzes accessibility issues using Gemini AI with before/after state comparison
   * 
   * @param htmlContent - The current HTML content to analyze
   * @param axeResults - Results from axe accessibility testing  
   * @param context - Additional context about the page/interaction
   * @param previousHtml - Previous HTML state for before/after comparison (optional)
   * @returns Structured accessibility analysis
   */
  async analyzeAccessibility(
    htmlContent: string,
    axeResults: any[],
    context: {
      url: string;
      action: string;
      step: number;
      domChangeType?: string;
    },
    previousHtml?: string
  ): Promise<GeminiAnalysis> {
    try {
      // Check if this is an authentication step that should be skipped
      if (this.isAuthenticationStep(context)) {
        console.log(`⏭️ Skipping auth step ${context.step} - returning empty analysis`);
        return {
          summary: 'Authentication step - analysis skipped',
          components: [],
          recommendations: ['Authentication steps are automatically filtered from analysis'],
          score: 100, // Auth steps don't affect accessibility score
          debug: {
            type: 'component',
            prompt: 'Authentication step skipped',
            response: 'Authentication step skipped',
            promptSize: 0,
            responseSize: 0,
            htmlSize: htmlContent.length,
            axeResultsCount: axeResults.length,
            timestamp: new Date().toISOString()
          }
        };
      }

      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = this.buildComponentAnalysisPrompt(htmlContent, axeResults, context, previousHtml);

      // Set up timeout for Gemini API call (2 minutes)
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 2 minutes')), 2 * 60 * 1000);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      // Calculate original vs filtered sizes for logging
      const originalHtmlSize = htmlContent.length;
      const originalAxeSize = JSON.stringify(axeResults).length;

      // Create debug log with filtering statistics
      const debugLog: LLMDebugLog = {
        type: 'component',
        prompt,
        response: text,
        promptSize: prompt.length,
        responseSize: text.length,
        htmlSize: originalHtmlSize,
        axeResultsCount: axeResults.length,
        timestamp: new Date().toISOString()
      };

      // Log filtering statistics
      console.log(`📊 LLM Prompt Data Sizes:
- Original HTML: ${originalHtmlSize} chars
- Original Axe: ${originalAxeSize} chars  
- Final Prompt: ${prompt.length} chars
- Data Reduction: ${((originalHtmlSize + originalAxeSize - prompt.length) / (originalHtmlSize + originalAxeSize) * 100).toFixed(1)}%`);

      const analysisResult = this.parseGeminiResponse(text, context);

      // Attach debug info to the result
      analysisResult.debug = debugLog;

      return analysisResult;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Analyzes accessibility issues using multiple snapshots with flow context
   * Provides comprehensive analysis of interaction sequences and state changes
   * 
   * @param snapshots - Array of snapshots representing the interaction flow
   * @param manifest - Session manifest with parent-step relationships 
   * @param context - Overall session context
   * @returns Structured accessibility analysis
   */
  async analyzeAccessibilityFlow(
    snapshots: any[],
    manifest: any,
    context: {
      url: string;
      sessionId: string;
      totalSteps: number;
    }
  ): Promise<GeminiAnalysis> {
    try {
      // Filter out authentication steps from snapshots
      const filteredSnapshots = this.filterAuthStepsFromSnapshots(snapshots, manifest);
      if (filteredSnapshots.length !== snapshots.length) {
        console.log(`🔐 Filtered out ${snapshots.length - filteredSnapshots.length} auth steps from flow analysis`);
      }

      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = this.buildFlowAnalysisPrompt(filteredSnapshots, manifest, context);

      // Set up timeout for Gemini API call (3 minutes for complex flow analysis)
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 3 minutes')), 3 * 60 * 1000);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      // Calculate original vs filtered sizes for logging
      const originalHtmlSize = snapshots.reduce((total, snap) => total + snap.html.length, 0);
      const originalAxeSize = snapshots.reduce((total, snap) =>
        total + JSON.stringify(snap.axeResults || []).length, 0);

      // Create debug log with filtering statistics
      const debugLog: LLMDebugLog = {
        type: 'flow',
        prompt,
        response: text,
        promptSize: prompt.length,
        responseSize: text.length,
        htmlSize: originalHtmlSize,
        axeResultsCount: snapshots.reduce((total, snap) => total + (snap.axeResults?.length || 0), 0),
        timestamp: new Date().toISOString()
      };

      // Log filtering statistics
      console.log(`📊 LLM Prompt Data Sizes:
- Original HTML: ${originalHtmlSize} chars
- Original Axe: ${originalAxeSize} chars  
- Final Prompt: ${prompt.length} chars
- HTML Reduction: ${((originalHtmlSize - prompt.length) / originalHtmlSize * 100).toFixed(1)}%`);

      const analysisResult = this.parseGeminiResponse(text, { step: context.totalSteps });

      // Attach debug info to the result
      analysisResult.debug = debugLog;

      return analysisResult;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Gemini API request timed out. The analysis may be too complex.');
        }
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new Error('Gemini API quota exceeded. Please try again later.');
        }
        if (error.message.includes('content filter') || error.message.includes('safety')) {
          throw new Error('Content was filtered by Gemini safety systems.');
        }
      }

      throw new Error(`Gemini AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Builds a comprehensive component-focused prompt for Gemini analysis
   * Based on before/after DOM state comparison methodology
   */
  private buildComponentAnalysisPrompt(
    htmlContent: string,
    axeResults: any[],
    context: { url: string; action: string; step: number; domChangeType?: string },
    previousHtml?: string
  ): string {
    const hasBeforeAfter = previousHtml && previousHtml !== htmlContent;
    return `
Analyze the provided DOM snapshot(s) and Axe Accessibility Report(s) with a primary focus on screen reader (ARIA) accessibility and compatibility with assistive technologies. Your objective is to identify deficiencies in the code that hinder optimal support for screen readers and related tools, and to recommend precise, actionable code fixes to address these issues.

**SCREEN READER TECHNOLOGY CONTEXT:**
This analysis targets compatibility with leading screen reader technologies including:
- **JAWS (Job Access With Speech)** - Most widely used Windows screen reader
- **NVDA (NonVisual Desktop Access)** - Popular open-source Windows screen reader  
- **VoiceOver** - Built-in macOS and iOS screen reader
- **TalkBack** - Android's built-in screen reader
- **Dragon NaturallySpeaking** - Voice control and dictation software
- **Windows Narrator** - Built-in Windows screen reader

**ANALYSIS METHODOLOGY:**
You are analyzing HTML markup and Axe accessibility test results to assess screen reader compatibility. You do NOT have access to actual screen reader testing, user behavior, or live interaction data. Your analysis must be based ENTIRELY on code structure, semantic markup, ARIA implementation, and static accessibility patterns that can be determined from HTML snapshots and Axe analysis summaries.

**PRIMARY OBJECTIVE: COMPREHENSIVE SCREEN READER CODE ANALYSIS**
Identify and address all barriers in the code that prevent the entire page — including structure, content, and interactive elements — from being fully accessible to screen reader users. Focus on ARIA usage, semantic HTML, and best practices for assistive technology support, based solely on analysis of the provided code and accessibility reports.

**Context:**
- URL: ${context.url}
- User Action: ${context.action}
- Analysis Step: ${context.step}
- DOM Change Type: ${context.domChangeType || 'unknown'}

**Current State DOM Snapshot:**
${this.truncateHtml(htmlContent)}

${hasBeforeAfter ? `**Previous State DOM Snapshot:**
${this.truncateHtml(previousHtml)}` : ''}

**Axe-core Accessibility Report (Violations Only):**
${JSON.stringify(this.filterAxeResultsForAnalysis(axeResults), null, 2)}

**COMPREHENSIVE SCREEN READER CODE ANALYSIS INSTRUCTIONS:**

**1. SEMANTIC HTML FOUNDATION ASSESSMENT**
Analyze the HTML structure for semantic markup that screen readers rely on for navigation and context:

**Document Structure & Landmarks:**
- Missing landmarks: Verify presence of main, header, nav, footer, aside, section elements
- Landmark hierarchy: Check logical nesting and organization of page regions for screen reader landmark navigation
- Skip navigation: Identify presence and proper targeting of skip links for keyboard and screen reader efficiency
- Page structure: Assess logical document outline that supports screen reader navigation patterns

**Heading Hierarchy Analysis:**
- Heading presence: Every page must have an h1 element for screen reader page identification
- Heading sequence: Verify no skipped levels (h1→h2→h3, not h1→h3) for proper screen reader navigation
- Heading purpose: Confirm headings describe content sections, not just visual styling
- Heading nesting: Check hierarchical relationships that screen readers use for page structure

**List and Grouping Semantics:**
- List usage: Identify where ul, ol, dl should be used instead of div for grouped items
- List structure: Verify proper li nesting that screen readers announce as "list with X items"
- Definition lists: Check dl, dt, dd usage for term-definition pairs
- Content grouping: Assess section, article, aside for semantic organization

**Form Semantics:**
- Label associations: Verify every form control has associated label or aria-label for screen reader identification
- Fieldset grouping: Check related form controls are grouped with fieldset and legend
- Required indicators: Confirm required attribute and proper indication for screen reader announcement
- Input types: Verify appropriate type attributes (email, tel, date, etc.) for screen reader context
- Form validation: Check error association with aria-describedby for screen reader error reading

**Table Semantics:**
- Table headers: Verify th elements with proper scope attributes for screen reader table navigation
- Table captions: Check caption elements for table purpose description
- Complex tables: Assess id/headers associations for complex data relationships
- Table structure: Verify thead, tbody, tfoot organization for screen reader table understanding

**2. ARIA IMPLEMENTATION EXCELLENCE**
Analyze ARIA attributes and patterns for screen reader compatibility:

**Roles and Widget Patterns:**
- Button semantics: Assess button vs div role="button" appropriateness for screen reader interaction
- Link semantics: Check a vs button usage (links for navigation, buttons for actions)
- Custom widgets: Verify proper implementation of combobox, grid, slider, tree, menu patterns
- Widget completeness: Confirm all required ARIA attributes are present for chosen patterns
- Role hierarchy: Assess appropriate role selection for component function and screen reader interpretation

**States and Properties Analysis:**
- Dynamic states: Check aria-expanded, aria-selected, aria-checked, aria-pressed for component state communication
- Descriptive properties: Verify aria-label, aria-labelledby, aria-describedby for screen reader context
- Relationship properties: Assess aria-controls, aria-owns, aria-activedescendant for component relationships
- Input properties: Check aria-required, aria-invalid, aria-autocomplete for form field context
- Presentation properties: Verify aria-hidden, aria-readonly, aria-disabled for appropriate content filtering

**Live Regions and Dynamic Content:**
- Live region types: Assess aria-live="polite" vs aria-live="assertive" for appropriate announcement behavior
- Live region scope: Check aria-atomic for complete vs partial announcement control
- Status updates: Verify role="status", role="alert" for different message types
- Progress indication: Check role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax

**3. DYNAMIC INTERACTION CODE ANALYSIS**
${hasBeforeAfter ? `When before/after snapshots are provided, analyze state transitions and interaction patterns:

**State Transition Validation:**
- ARIA state updates: Compare aria-expanded, aria-selected, aria-checked changes between snapshots
- Visibility coordination: Verify ARIA states match actual element visibility changes
- Focus state management: Check aria-activedescendant updates during component navigation
- Selection coordination: Assess multiple elements maintaining consistent selection states

**Component Behavior Assessment:**
- Modal/Dialog behavior: 
  - Before: Modal absent, hidden, or improperly structured
  - After: Modal present with role="dialog", aria-modal="true", proper focus management structure
- Dropdown behavior:
  - Before: aria-expanded="false", controlled menu hidden or absent
  - After: aria-expanded="true", menu visible and properly associated with aria-controls
- Tab behavior:
  - Before: One tab aria-selected="true", corresponding panel visible
  - After: Selection moved to different tab, panel content updated, proper aria-controls relationships
- Form validation:
  - Before: Field without validation state
  - After: aria-invalid="true" with error message properly associated via aria-describedby

**Content Update Assessment:**
- Live region updates: Verify content changes appear in properly configured aria-live regions
- Error message handling: Check error appearance/disappearance with proper ARIA associations
- Loading state management: Assess progress indicators and loading state announcements
- Dynamic content: Verify new content appears with proper semantic structure and ARIA attributes` : `Analyze the single snapshot for proper ARIA implementation and semantic structure:`}

**4. CONTENT ACCESSIBILITY ASSESSMENT**
Evaluate content patterns for screen reader compatibility:

**Alternative Text Strategy:**
- Image alt text: Check descriptive, contextual alternative text for informative images
- Decorative images: Verify alt="" or role="presentation" for decorative content
- Complex images: Assess long descriptions via aria-describedby or adjacent text
- Icon accessibility: Check aria-label for functional icons, aria-hidden="true" for decorative icons

**Link and Button Content:**
- Link purpose: Verify links make sense out of context, avoid generic "click here" text
- Button labeling: Check clear action-oriented button text or aria-label
- Link vs button usage: Confirm links for navigation, buttons for actions
- External links: Assess indication of external destinations

**Language and Internationalization:**
- Language declaration: Check lang attribute on html and foreign language content
- Direction support: Verify dir attribute for right-to-left content when applicable

**5. NAVIGATION AND INTERACTION STRUCTURE**
Analyze markup patterns that support screen reader navigation:

**Keyboard Navigation Structure:**
- Tab order: Assess logical tabindex values, verify reliance on natural DOM order
- Skip links: Check functional skip navigation with proper target elements
- Focus management: Verify modal dialogs have proper focus containment structure
- Focus indicators: Assess sufficient visual focus indication (via CSS analysis)

**Navigation Efficiency:**
- Landmark navigation: Verify sufficient landmarks for efficient screen reader navigation
- Heading navigation: Check heading structure supports quick page scanning
- List navigation: Confirm grouped content uses proper list markup for screen reader list navigation
- Table navigation: Verify row/column headers support efficient table reading

**6. ADVANCED VALIDATION PATTERNS**
Assess complex accessibility patterns:

**ARIA Pattern Compliance:**
- WAI-ARIA Authoring Practices: Verify implementation follows established widget patterns
- Required properties: Check all required ARIA properties are present for chosen roles
- Prohibited attributes: Identify invalid ARIA attribute combinations
- Pattern completeness: Assess full implementation of chosen ARIA design patterns

**Error Prevention and Recovery:**
- Input validation: Verify clear requirements and format expectations in markup
- Error identification: Check specific, actionable error descriptions
- Error location: Confirm errors are properly associated with problematic fields
- Recovery guidance: Assess clear instructions for fixing validation errors

**7. SCREEN READER CRITICAL COMPONENTS**
Prioritize analysis of components that directly impact screen reader navigation and interaction:
- Expandable/Collapsible Content (aria-expanded, aria-controls implementation)
- Dropdown Menus (role="menu", aria-haspopup, aria-expanded coordination)
- Tab Panels (role="tablist", aria-selected, aria-controls relationships)
- Modal Dialogs (role="dialog", aria-modal, focus containment structure)
- Autocomplete/Suggestion Lists (aria-autocomplete, aria-activedescendant patterns)
- Error Handling (aria-invalid, aria-describedby error associations)
- Dynamic Content Updates (aria-live regions and announcement patterns)
- Keyboard Navigation indicators (focus management, logical tabindex usage)
- Carousels/Sliders (aria-roledescription, aria-live implementation)
- Tree Views (role="tree", aria-expanded, aria-selected hierarchical structure)
- Data Tables (proper header associations, scope attributes, caption usage)
- Sortable Tables (aria-sort attributes and state management)
- Tooltips/Popovers (role="tooltip", aria-describedby relationships)
- Context Menus (role="menu", keyboard navigation structure)
- Validation Messages (aria-describedby associations, error announcements)
- Live Regions (aria-live, aria-atomic configuration)

**8. COMPREHENSIVE ISSUE IDENTIFICATION**
For each identified component, examine ALL of these screen reader compatibility factors:

**Semantic Foundation:**
- Proper element choice (button vs div, a vs button, h1-h6 vs div)
- Required landmark elements (main, nav, header, footer presence)
- Heading hierarchy completeness and logical structure
- List markup for grouped content instead of generic divs
- Form label associations and fieldset grouping
- Table header relationships and caption information

**ARIA Implementation:**
- Correct role assignments for custom components
- Complete state management (expanded, selected, checked, pressed)
- Proper descriptive properties (label, labelledby, describedby)
- Accurate relationship properties (controls, owns, activedescendant)
- Appropriate presentation properties (hidden, readonly, disabled)
- Live region configuration for dynamic content

**Content Quality:**
- Descriptive alternative text for images and complex content
- Clear, contextual link and button text
- Proper language declaration for all content
- Icon accessibility (functional vs decorative treatment)
- Form input context and requirements

**Navigation Structure:**
- Logical tab order following visual layout
- Skip link presence and proper targeting
- Focus management structure in complex components
- Keyboard navigation patterns for custom widgets

**Dynamic Behavior Evidence:**
${hasBeforeAfter ? `- State transition accuracy between before/after snapshots
- Visibility coordination with ARIA state changes
- Focus management structure in modal/dialog interactions
- Content update patterns in live regions
- Error state management during form validation` : `- Static structure supporting proper dynamic behavior
- ARIA attributes configured for state management
- Focus management container structure
- Live region preparation for content updates`}

**COMPREHENSIVE ANALYSIS REQUIREMENTS:**
Based on the above comprehensive framework, identify ALL accessibility issues that can be determined from the HTML markup and Axe results. This includes:
- Semantic HTML foundation problems (missing landmarks, improper heading hierarchy, incorrect element usage)
- ARIA implementation gaps (missing attributes, incorrect values, broken relationships)  
- Content accessibility issues (poor alt text, generic link text, missing language attributes)
- Navigation structure problems (poor tab order, missing skip links, inadequate focus management)
- Dynamic interaction issues (when before/after comparison is available)

**ANALYSIS PRIORITY:**
1. **Critical Issues** (Block task completion): Missing form labels, keyboard traps, missing focus management, broken ARIA relationships, missing required landmarks
2. **Serious Issues** (Significantly impair experience): Poor heading hierarchy, inadequate alt text, missing live regions, incorrect ARIA states, poor error handling  
3. **Moderate Issues** (Create barriers): Generic link text, missing skip links, suboptimal ARIA patterns, missing language declarations
4. **Minor Issues** (Polish and optimization): Redundant ARIA attributes, non-essential semantic improvements

**Output Format:**
Respond with a JSON object with this exact structure:
{
  "summary": "Brief overview of accessibility status",
  "components": [
    {
      "componentName": "Specific component name (e.g., Search Button, Navigation Menu)",
      "issue": "Clear description of the accessibility issue - ALWAYS wrap HTML element names in backticks (e.g., for main element, h1 element, button element)",
      "explanation": "Detailed explanation of why this is a problem - ALWAYS wrap HTML element names in backticks (e.g., for main element, h1 element, button element)",
      "relevantHtml": "EXACT HTML element(s) with the accessibility issue - show ONLY the specific problematic element, not <html>, <body>, or unrelated parent containers",
      "correctedCode": "Fixed HTML showing the exact same element(s) with proper accessibility attributes",
      "codeChangeSummary": "Brief summary of the fix (e.g., 'Added aria-label to button', 'Changed div to semantic heading')",
      "impact": "critical|serious|moderate|minor",
      "wcagRule": "WCAG 2.1 guideline reference (e.g., 4.1.2 Name, Role, Value)",
      "wcagUrl": "Complete URL to the specific WCAG Understanding document (e.g., 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html')",
      "selector": "CSS selector to identify the problematic element (e.g., '.nav-menu button', '#search-input', 'main .content h1')"
    }
  ],
  "recommendations": ["actionable recommendations"],
  "score": 0-100
}

**WCAG URL Requirements:**
- Always provide the complete URL to the specific WCAG 2.1 Understanding document
- Use the format: https://www.w3.org/WAI/WCAG21/Understanding/[page-name].html
- Common examples:
  - 4.1.2 Name, Role, Value → https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html
  - 1.4.3 Contrast (Minimum) → https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
  - 2.4.7 Focus Visible → https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
  - 2.1.1 Keyboard → https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
- If unsure of the exact URL, use: https://www.w3.org/WAI/WCAG21/Understanding/

**Requirements:**
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- CRITICAL: ALWAYS wrap HTML element names in backticks in issue and explanation text
- Examples: "page lacks a \`main\` landmark", "missing \`h1\` heading", "button needs \`aria-label\`", "\`div\` should be \`button\`"
- NEVER write: "h1", "main", "button" - ALWAYS write: "\`h1\`", "\`main\`", "\`button\`"
- relevantHtml must show ONLY the problematic element - NEVER show <html>, <body>, or unrelated parent containers
- If the issue is "missing main landmark", show the container where <main> should be added
- If the issue is "missing h1", show the section/div where the h1 should be placed
- correctedCode should show the minimal fix for the exact same element(s) shown in relevantHtml
- selector must be a valid CSS selector that uniquely identifies the problematic element(s)
- For missing elements (like missing h1 or main), provide a selector for where the element should be added
- Examples: ".header button", "#search-form input", "nav .menu-item", ".content > div:first-child", "body > .page-wrapper"
- Use classes, IDs, and structural selectors to create precise, targetable selectors
- Provide concrete HTML fixes when possible
- Focus on real accessibility barriers found in the captured snapshots
- If no significant issues are found, return an empty components array

Example of good relevantHtml vs correctedCode pairing:
BAD: relevantHtml shows <html> but issue is missing heading
GOOD: relevantHtml shows <div class="content"> and correctedCode shows <div class="content"><h1>Page Title</h1>

BAD: relevantHtml shows <html> but issue is missing main landmark  
GOOD: relevantHtml shows <body><div class="page-content"> and correctedCode shows <body><main><div class="page-content">

**CRITICAL: relevantHtml MUST BE ACTUAL HTML CODE:**
- NEVER provide text content like "Skip to main content" or "New Aged Care Act"
- ALWAYS provide HTML markup with < > angle brackets
- Example GOOD: <button class="nav-btn">Skip to content</button>
- Example BAD: Skip to main content
- If you cannot identify specific HTML, leave relevantHtml empty
- The relevantHtml field is for CODE ONLY, not page text content

**Important**: Report ONLY components with identified screen reader accessibility issues. Do not report on components where no accessibility issue was found. Focus on actionable insights and practical ARIA fixes that directly improve screen reader compatibility and assistive technology interaction.

**OUTPUT FORMAT REQUIREMENTS:**
- RETURN ONLY VALID JSON with no additional text before or after
- Do NOT use emoji, Unicode symbols, or special characters in any output text
- Use plain ASCII text only for maximum compatibility with PDF export systems
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- Start your response with { and end with }
- Do not include any markdown formatting, code blocks, or explanatory text

**SCREEN READER PRIORITY**: Every identified issue should be evaluated from the perspective of a screen reader user. Prioritize problems that would prevent, confuse, or frustrate someone using assistive technology to navigate and interact with the interface.

**CRITICAL: Return ONLY the JSON object - no other text.**
`;
  }
  /**
   * Builds a comprehensive flow analysis prompt for multi-snapshot analysis
   * Focuses on interaction sequences, state changes, and parent-child relationships
   */
  private buildFlowAnalysisPrompt(
    snapshots: any[],
    manifest: any,
    context: { url: string; sessionId: string; totalSteps: number }
  ): string {
    // Group snapshots by flow context
    const flowGroups = this.groupSnapshotsByFlow(snapshots, manifest);
    return `
Your task is to analyze a complete user interaction flow consisting of ${context.totalSteps} steps captured during accessibility testing, with a PRIMARY FOCUS on screen reader (ARIA) accessibility and assistive technology compatibility. This analysis ensures that interaction sequences work correctly for screen reader users through proper ARIA implementation and state management.

**PRIMARY OBJECTIVE: SCREEN READER ACCESSIBILITY FLOW ANALYSIS**
The main requirement is to ensure the entire interaction flow maintains proper screen reader accessibility, with correct ARIA state transitions, focus management, and assistive technology announcements throughout the user journey.

**Session Context:**
- URL: ${context.url}
- Session ID: ${context.sessionId}
- Total Steps: ${context.totalSteps}
- Flow Groups: ${Object.keys(flowGroups).join(', ')}

**Screen Reader Focused Interaction Flow Analysis:**

${Object.entries(flowGroups).map(([flowType, steps]) => {
      const typedSteps = steps as any[];
      return `
**${flowType.toUpperCase()} FLOW:**
${typedSteps.map((step: any, index: number) => {
        const stepDetail = manifest.stepDetails.find((s: any) => s.step === step.step);
        return `
Step ${step.step} (Parent: ${stepDetail?.parentStep || 'none'}):
- Action: ${stepDetail?.action || step.action} 
- UI State: ${stepDetail?.uiState || 'unknown'}
- DOM Changes: ${stepDetail?.domChanges || step.domChangeDetails?.description || 'none'}
- Axe Violations: ${step.axeResults?.length || 0}

DOM Snapshot (truncated):
${this.truncateHtml(step.html)}

Axe Violations (Filtered):
${JSON.stringify(this.filterAxeResultsForAnalysis(step.axeResults || []), null, 2)}
`;
      }).join('\n')}
`;
    }).join('\n')}

**Analysis Instructions:**

1. **Screen Reader Flow Relationship Analysis**: 
   - Examine parent-child relationships between steps from a screen reader perspective
   - Identify main flow vs. sub-flows (modals, forms, navigation) and their ARIA implications
   - Assess how ARIA state changes cascade through related steps for screen reader users

2. **Screen Reader Component Accessibility Assessment**:
   - Focus on interactive components and their screen reader accessibility across the flow
   - Analyze ARIA state management (aria-expanded/collapsed, aria-selected/unselected, etc.)
   - Evaluate keyboard navigation and focus management for screen reader users
   - Check ARIA attributes and role consistency throughout the interaction sequence
   - Verify proper screen reader announcements during state transitions

3. **Screen Reader Before/After State Comparison**:
   - Compare DOM states between related steps focusing on ARIA attribute changes
   - Identify missing or incorrect ARIA attribute updates that affect screen reader users
   - Assess dynamic content announcements through aria-live regions
   - Verify focus management maintains screen reader context

4. **Screen Reader Flow-Specific Issues**:
   - Modal flows: Focus management, escape handling, backdrop behavior for screen readers
   - Form flows: Validation announcements, error state communication, progress indication
   - Navigation flows: Landmark navigation, heading hierarchy, breadcrumb accessibility
   - Dynamic content: Proper aria-live announcements and screen reader feedback

**Output Format:**
Respond with a JSON object with this exact structure:
{
  "summary": "Overview of accessibility findings across the interaction flow",
  "components": [
    {
      "componentName": "Specific component name (e.g., Search Button, Navigation Menu)",      "issue": "Clear description of the accessibility issue - ALWAYS wrap HTML element names in backticks (e.g., for main element, h1 element, button element)",
      "explanation": "Detailed explanation of why this is a problem - ALWAYS wrap HTML element names in backticks (e.g., for main element, h1 element, button element)","relevantHtml": "EXACT HTML element(s) with the accessibility issue - show ONLY the specific problematic element, not <html>, <body>, or unrelated parent containers",
      "correctedCode": "Fixed HTML showing the exact same element(s) with proper accessibility attributes",
      "codeChangeSummary": "Brief summary of the fix (e.g., 'Added aria-label to button', 'Changed div to semantic heading')",      "impact": "critical|serious|moderate|minor",
      "wcagRule": "WCAG 2.1 guideline reference (e.g., 1.3.1 Info and Relationships)",
      "wcagUrl": "Complete URL to the specific WCAG Understanding document (e.g., 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html')",
      "selector": "CSS selector to identify the problematic element (e.g., '.nav-menu button', '#search-input', 'main .content h1')"
    }
  ],
  "recommendations": [
    "Overall accessibility improvements for the interaction flow"
  ],
  "score": 75
}

**WCAG URL Requirements:**
- Always provide the complete URL to the specific WCAG 2.1 Understanding document
- Use the format: https://www.w3.org/WAI/WCAG21/Understanding/[page-name].html
- Common examples:
  - 1.3.1 Info and Relationships → https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html
  - 4.1.2 Name, Role, Value → https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html
  - 1.4.3 Contrast (Minimum) → https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
  - 2.4.7 Focus Visible → https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
  - 2.1.1 Keyboard → https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
  - 1.1.1 Non-text Content → https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html
  - 2.4.6 Headings and Labels → https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html
- If unsure of the exact URL, use: https://www.w3.org/WAI/WCAG21/Understanding/

**Requirements:**
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- CRITICAL: ALWAYS wrap HTML element names in backticks in issue and explanation text
- Examples: "page lacks a \`main\` landmark", "missing \`h1\` heading", "button needs \`aria-label\`", "\`div\` should be \`button\`"
- NEVER write: "h1", "main", "button" - ALWAYS write: "\`h1\`", "\`main\`", "\`button\`"
- relevantHtml must show ONLY the problematic element - NEVER show <html>, <body>, or unrelated parent containers
- If the issue is "missing main landmark", show the container where <main> should be added
- If the issue is "missing h1", show the section/div where the h1 should be placed
- correctedCode should show the minimal fix for the exact same element(s) shown in relevantHtml
- selector must be a valid CSS selector that uniquely identifies the problematic element(s)
- For missing elements (like missing h1 or main), provide a selector for where the element should be added
- Examples: ".header button", "#search-form input", "nav .menu-item", ".content > div:first-child", "body > .page-wrapper"
- Use classes, IDs, and structural selectors to create precise, targetable selectors
- Provide concrete HTML fixes when possible
- Focus on real accessibility barriers found in the captured snapshots
- If no significant issues are found, return an empty components array

Example of good relevantHtml vs correctedCode pairing:
BAD: relevantHtml shows <html> but issue is missing heading
GOOD: relevantHtml shows <div class="content"> and correctedCode shows <div class="content"><h1>Page Title</h1>

BAD: relevantHtml shows <html> but issue is missing main landmark  
GOOD: relevantHtml shows <body><div class="page-content"> and correctedCode shows <body><main><div class="page-content">

**CRITICAL: relevantHtml MUST BE ACTUAL HTML CODE:**
- NEVER provide text content like "Skip to main content" or "New Aged Care Act"
- ALWAYS provide HTML markup with < > angle brackets
- Example GOOD: <button class="nav-btn">Skip to content</button>
- Example BAD: Skip to main content
- If you cannot identify specific HTML, leave relevantHtml empty
- The relevantHtml field is for CODE ONLY, not page text content

**Important**: Report ONLY components with identified screen reader accessibility issues. Do not report on components where no accessibility issue was found. Focus on actionable insights and practical ARIA fixes that directly improve screen reader compatibility and assistive technology interaction.

**OUTPUT FORMAT REQUIREMENTS:**
- RETURN ONLY VALID JSON with no additional text before or after
- Do NOT use emoji, Unicode symbols, or special characters in any output text
- Use plain ASCII text only for maximum compatibility with PDF export systems
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- Start your response with { and end with }
- Do not include any markdown formatting, code blocks, or explanatory text

**SCREEN READER PRIORITY**: Every identified issue should be evaluated from the perspective of a screen reader user. Prioritize problems that would prevent, confuse, or frustrate someone using assistive technology to navigate and interact with the interface.

**CRITICAL: Return ONLY the JSON object - no other text.**
`;
  }

  /**
   * Checks if the current context/step is authentication-related and should be filtered out
   */
  private isAuthenticationStep(context: { url: string; action: string; step: number }): boolean {
    // Create a session action from the context
    const action: SessionAction = {
      type: 'navigate', // We don't have type info in context, so assume navigate
      url: context.url,
      step: context.step,
      value: context.action
    };

    const authResult = isAuthAction(action);
    if (authResult.isAuthStep) {
      console.log(`🔐 Filtering out auth step ${context.step}: ${authResult.authType} (confidence: ${authResult.confidence.toFixed(2)})`);
      console.log(`   URL: ${context.url}`);
      console.log(`   Reasons: ${authResult.reasons.join(', ')}`);
    }

    return authResult.isAuthStep;
  }

  /**
   * Groups snapshots by interaction flow for better analysis structure
   */
  private groupSnapshotsByFlow(snapshots: any[], manifest: any): Record<string, any[]> {
    // Simple grouping logic - can be enhanced based on manifest data
    const groups: Record<string, any[]> = {
      main: snapshots
    };

    // If manifest has flow information, use it; otherwise default to single flow
    if (manifest?.flows) {
      return manifest.flows;
    }

    return groups;
  }

  /**
   * Filters and truncates HTML content for analysis while preserving important accessibility attributes
   * Removes script/link/style tags and focuses on semantic content
   */
  private truncateHtml(html: string): string {
    console.log(`Original HTML size: ${html.length} chars`);

    // First, filter out unnecessary content
    const filtered = this.filterHtmlForAnalysis(html);
    console.log(`Filtered HTML size: ${filtered.length} chars (removed ${html.length - filtered.length} chars)`);

    // Configurable HTML size limit via environment variable (default 512KB)
    const maxLength = parseInt(process.env.MAX_SCREEN_READER_HTML_SIZE || '524288'); // 512KB default

    if (filtered.length <= maxLength) {
      console.log(`HTML size: ${filtered.length} chars (under ${maxLength} limit, no truncation)`);
      return filtered;
    }

    console.log(`⚠️ HTML size: ${filtered.length} chars (exceeds ${maxLength} limit, truncating...)`);

    // Try to truncate at element boundaries
    const truncated = filtered.substring(0, maxLength);
    const lastTag = truncated.lastIndexOf('<');
    const result = lastTag > maxLength - 1000 ? truncated.substring(0, lastTag) : truncated;

    console.log(`HTML truncated to: ${result.length} chars`);
    return result;
  }

  /**
   * Filters HTML content to remove unnecessary elements while preserving semantic structure
   * Removes scripts, links, styles and focuses on body content with accessibility attributes
   * Can be controlled via FILTER_AUTH_CONTENT environment variable (default: true)
   */
  private filterHtmlForAnalysis(html: string): string {
    // Check environment variable to enable/disable filtering
    const enableFiltering = process.env.FILTER_AUTH_CONTENT !== 'false';

    if (!enableFiltering) {
      console.log('🔧 Auth content filtering disabled via FILTER_AUTH_CONTENT=false');
      return html;
    }

    try {
      // Remove large CSS blocks and scripts first (simple regex approach)
      let filtered = html
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style tags and their content  
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove link tags (CSS, icons, etc.)
        .replace(/<link\b[^>]*>/gi, '')
        // Remove meta tags (keep some for context but remove most)
        .replace(/<meta\b(?![^>]*(?:viewport|charset|og:))[^>]*>/gi, '')
        // Remove comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove Google Tag Manager and analytics scripts
        .replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/gi, '')
        // Clean up excessive whitespace
        .replace(/\s{3,}/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n');

      // Try to extract body content if possible, otherwise return filtered HTML
      const bodyMatch = filtered.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        // Keep essential head elements and body content
        const headMatch = filtered.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const essentialHead = headMatch ? this.extractEssentialHeadContent(headMatch[1]) : '';

        const result = `<!DOCTYPE html>
<html${this.extractHtmlAttributes(filtered)}>
<head>
${essentialHead}
</head>
<body${this.extractBodyAttributes(filtered)}>
${bodyMatch[1]}
</body>
</html>`;

        console.log(`Extracted body content: ${result.length} chars`);
        return result;
      }

      console.log(`Fallback filtered HTML: ${filtered.length} chars`);
      return filtered;
    } catch (error) {
      console.warn('HTML filtering failed, using original:', error);
      return html;
    }
  }

  /**
   * Extracts essential head content for accessibility analysis
   */
  private extractEssentialHeadContent(headContent: string): string {
    const essential = [];

    // Keep charset
    const charsetMatch = headContent.match(/<meta[^>]*charset[^>]*>/i);
    if (charsetMatch) essential.push(charsetMatch[0]);

    // Keep viewport
    const viewportMatch = headContent.match(/<meta[^>]*viewport[^>]*>/i);
    if (viewportMatch) essential.push(viewportMatch[0]);

    // Keep title
    const titleMatch = headContent.match(/<title[^>]*>.*?<\/title>/i);
    if (titleMatch) essential.push(titleMatch[0]);

    // Keep essential meta tags (og:, description, etc.)
    const metaMatches = headContent.match(/<meta[^>]*(?:og:|twitter:|description|keywords)[^>]*>/gi);
    if (metaMatches) essential.push(...metaMatches.slice(0, 5)); // Limit to 5 essential meta tags

    return essential.join('\n');
  }

  /**
   * Extracts HTML tag attributes
   */
  private extractHtmlAttributes(html: string): string {
    const htmlMatch = html.match(/<html([^>]*)>/i);
    return htmlMatch ? htmlMatch[1] : ' lang="en"';
  }

  /**
   * Extracts body tag attributes
   */
  private extractBodyAttributes(html: string): string {
    const bodyMatch = html.match(/<body([^>]*)>/i);
    return bodyMatch ? bodyMatch[1] : '';
  }  /**
   * Parses Gemini response into structured component-based format
   */  private parseGeminiResponse(text: string, context: { step: number }): GeminiAnalysis {
    console.log(`🔍 DEBUG: Parsing screen reader analysis response, length: ${text.length}`);
    console.log(`🔍 DEBUG: Full LLM response:`, text);

    try {
      // Clean up the response text to extract JSON
      let cleanText = text.trim();

      // Remove any markdown code block formatting if present
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      // Try to find JSON object boundaries
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      console.log(`🔍 DEBUG: Cleaned JSON text:`, cleanText);

      const parsed = JSON.parse(cleanText);
      console.log('🔍 DEBUG: Parsed JSON response:', JSON.stringify(parsed, null, 2));

      const validComponents = this.parseComponents(parsed.components || []);

      return {
        summary: parsed.summary || 'Screen reader accessibility analysis completed',
        components: validComponents,
        recommendations: parsed.recommendations || [],
        score: Math.max(0, Math.min(100, parsed.score || 0))
      };

    } catch (error) {
      console.error('❌ Failed to parse screen reader analysis JSON response:', error);
      console.error('❌ Raw response that failed to parse:', text);

      // Return minimal analysis with error information
      return {
        summary: 'Screen reader analysis failed to parse - LLM may have returned invalid JSON',
        components: [],
        recommendations: [
          'The AI analysis could not be processed due to formatting issues',
          'Please try running the analysis again',
          'Review the website manually for accessibility issues'
        ],
        score: 50 // Neutral score when parsing fails
      };
    }
  }
  /**
   * Validates and formats component accessibility issues
   */
  private parseComponents(components: any[]): ComponentAccessibilityIssue[] {
    if (!Array.isArray(components) || components.length === 0) {
      console.warn('⚠️ Gemini returned no components or invalid component data');
      return [];
    }

    return components
      .filter(component => {
        // Filter out components with no meaningful data
        const hasValidName = component.componentName &&
          component.componentName !== 'Unknown Component' &&
          component.componentName.trim().length > 0;
        const hasValidIssue = component.issue &&
          component.issue !== 'No issue description provided' &&
          component.issue.trim().length > 0;

        if (!hasValidName || !hasValidIssue) {
          console.warn('🗑️ Filtering out invalid component:', {
            name: component.componentName,
            issue: component.issue
          });
          return false;
        }

        return true;
      }).map(component => {
        console.log('🔍 Processing component from Gemini:', {
          componentName: component.componentName,
          wcagRule: component.wcagRule,
          wcagUrl: component.wcagUrl,
          hasWcagUrl: !!component.wcagUrl,
          selector: component.selector,
          hasSelector: !!component.selector
        });
        return {
          componentName: component.componentName.trim(),
          issue: component.issue.trim(),
          explanation: component.explanation?.trim() || 'No detailed explanation provided',
          relevantHtml: component.relevantHtml || '',
          correctedCode: component.correctedCode || '',
          codeChangeSummary: component.codeChangeSummary || '',
          impact: ['critical', 'serious', 'moderate', 'minor'].includes(component.impact)
            ? component.impact : 'moderate',
          wcagRule: component.wcagRule && component.wcagRule !== 'unknown'
            ? component.wcagRule : 'General Accessibility',
          wcagUrl: component.wcagUrl || undefined,
          selector: component.selector?.trim() || undefined
        };
      });
  }  /**
   * Generate explanations and actionable recommendations for specific axe violations
   */
  async generateAxeRecommendations(violations: any[]): Promise<Map<string, { explanation: string; recommendation: string }>> {
    console.log(`🤖 generateAxeRecommendations called with ${violations?.length || 0} violations`);

    if (!violations || violations.length === 0) {
      console.log('🔍 No violations provided to generateAxeRecommendations');
      return new Map();
    }

    console.log(`🔧 Generating LLM explanations for ${violations.length} violations:`, violations.map(v => v.id));

    // Debug: Let's see what fields axe actually provides
    if (violations.length > 0) {
      console.log(`🔍 Sample violation structure:`, {
        id: violations[0].id,
        description: violations[0].description,
        help: violations[0].help,
        helpUrl: violations[0].helpUrl,
        impact: violations[0].impact,
        tags: violations[0].tags
      });
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      // Use the comprehensive prompt for both explanations and recommendations
      const prompt = this.buildAxeRecommendationPrompt(violations);

      console.log(`📤 Sending comprehensive prompt to LLM for ${violations.length} violations...`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`📥 Received LLM response (${text.length} chars)`);
      console.log(`🔍 LLM Response Sample:`, text.substring(0, 300) + '...');

      // Parse the structured response
      const recommendations = this.parseAxeRecommendations(text, violations);

      console.log(`Successfully parsed ${recommendations.size} recommendations from LLM`);    // Ensure all violations have recommendations (fallback for unparsed ones)
      violations.forEach(violation => {
        if (!recommendations.has(violation.id)) {
          console.warn(`⚠️ Missing LLM recommendation for ${violation.id}, using fallback`);
          recommendations.set(violation.id, {
            explanation: `This accessibility violation affects users with disabilities. ${violation.description} This can prevent proper access to content and functionality for people using assistive technologies.`,
            recommendation: `${violation.help}

Reference: ${violation.helpUrl || 'https://dequeuniversity.com/rules/axe/'}`
          });
        }
      });

      return recommendations;

    } catch (error) {
      console.warn('❌ LLM recommendation generation failed, using fallback for all violations:', error);

      // Fallback to basic recommendations for all violations
      const fallbackResults = new Map<string, { explanation: string; recommendation: string }>();
      violations.forEach(violation => {
        fallbackResults.set(violation.id, {
          explanation: `This accessibility violation affects users with disabilities. ${violation.description} This can prevent proper access to content and functionality for people using assistive technologies.`,
          recommendation: `${violation.help}

Reference: ${violation.helpUrl || 'https://dequeuniversity.com/rules/axe/'}`
        });
      });

      return fallbackResults;
    }
  }
  /**
   * Build prompt for axe violation recommendations
   */  private buildAxeRecommendationPrompt(violations: any[]): string {
    return `You are an accessibility expert. For each axe-core violation, provide both an explanation and a clear, general recommendation statement.

CRITICAL: You MUST respond with content for EVERY violation provided. Do not skip any violations.

Return your response as a valid JSON object with this exact structure:

{
  "violations": [
    {
      "id": "violation.id",
      "explanation": "Clear explanation of why this is an accessibility problem and how it affects users with disabilities - focus on user impact",
      "recommendation": "A clear, general statement of what needs to be done to fix this type of issue. Keep it concise and actionable but avoid detailed step-by-step instructions."
    }
  ]
}

CRITICAL GUIDELINES:
- ALWAYS examine ALL HTML elements provided for each violation (not just the first one)
- Provide general guidance that addresses the type of accessibility issue
- Make recommendations clear and actionable but concise
- Focus on what needs to be done rather than detailed how-to steps
- For aria-label issues, mention the need for meaningful labels
- For form elements, mention proper label associations
- For heading issues, mention proper heading structure
- Keep recommendations general enough to apply to all instances of the violation type
- Prioritize user impact and practical guidance
- Each recommendation should be a clear statement that developers can understand and implement
- Avoid detailed step-by-step instructions - focus on the core fix needed
- ALWAYS end recommendations with a reference to the relevant dequeuniversity guideline"
- Use the specific WCAG documentation URL that corresponds to the axe violation being addressed

Violations to analyze:
${violations.map((v, i) => `
VIOLATION ${i + 1}:
- ID: ${v.id}
- Impact: ${v.impact}
- Description: ${v.description}
- Help: ${v.help}
- Reference: ${v.helpUrl || 'https://dequeuniversity.com/rules/axe/'}
- Number of affected elements: ${v.nodes?.length || 0}
- All affected HTML elements:
${v.nodes?.map((node: any, nodeIndex: number) => `  Element ${nodeIndex + 1}:
    HTML: ${node.html || 'Not available'}
    Selector: ${Array.isArray(node.target) ? node.target.join(' > ') : node.target || 'Not available'}
    Failure: ${node.failureSummary || 'Not available'}`).join('\n') || '  No elements available'}
`).join('\n')}

Remember: 
- MANDATORY: Provide both explanation and recommendation for EVERY violation listed
- Use the actual HTML context to understand the violation type
- Make recommendations general and actionable 
- Focus on what needs to be done, not detailed implementation steps
- Make explanations user-impact focused (how this affects people with disabilities)
- Provide clear guidance that applies to the violation type
- ALWAYS end each recommendation with "Reference: [Dequeuniversity Guideline URL]" using the URL provided above
- NEVER skip a violation or leave sections empty
- Return ONLY valid JSON, no additional text or formatting`;
  }  /**
   * Parse axe recommendations from LLM JSON response
   */
  private parseAxeRecommendations(text: string, violations: any[]): Map<string, { explanation: string; recommendation: string }> {
    const results = new Map<string, { explanation: string; recommendation: string }>();

    console.log(`🔍 DEBUG: Original LLM response length: ${text.length}`);
    console.log(`🔍 DEBUG: Full LLM response:`, text);

    try {
      // Clean up the response text to extract JSON
      let cleanText = text.trim();

      // Remove any markdown code block formatting if present
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      // Try to find JSON object boundaries
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      console.log(`🔍 DEBUG: Cleaned JSON text:`, cleanText);

      const jsonResponse = JSON.parse(cleanText);
      console.log(`🔍 DEBUG: Parsed JSON response:`, jsonResponse); if (jsonResponse.violations && Array.isArray(jsonResponse.violations)) {
        jsonResponse.violations.forEach((violationData: any, index: number) => {
          const violationId = violationData.id;
          const explanation = violationData.explanation || '';
          const recommendation = violationData.recommendation || '';

          if (explanation && recommendation) {
            results.set(violationId, {
              explanation: explanation.trim(),
              recommendation: recommendation.trim()
            });
            console.log(`✅ DEBUG: Successfully parsed violation ${violationId}`);
          } else {
            console.log(`⚠️ DEBUG: Missing content for violation ${violationId}:`, { explanation, recommendation });
          }
        });
      }

    } catch (error) {
      console.error(`❌ DEBUG: JSON parsing failed:`, error);
      console.log(`❌ DEBUG: Failed to parse text:`, text);
      // Fallback to basic parsing for any violations that weren't processed
      violations.forEach((violation, index) => {
        if (!results.has(violation.id)) {
          console.log(`🔄 DEBUG: Adding fallback for violation ${violation.id}`);

          // Generate simple fallback recommendation based on violation type
          let fallbackRecommendation = '';
          const ruleId = violation.id;

          if (ruleId.includes('heading') || ruleId.includes('h1')) {
            fallbackRecommendation = 'Add proper heading elements to structure the page content hierarchically.';
          } else if (ruleId.includes('color-contrast')) {
            fallbackRecommendation = 'Increase the contrast ratio between text and background colors to meet WCAG standards.';
          } else if (ruleId.includes('alt-text') || ruleId.includes('image-alt')) {
            fallbackRecommendation = 'Add descriptive alt text to images for screen reader users.';
          } else if (ruleId.includes('label') || ruleId.includes('form')) {
            fallbackRecommendation = 'Associate form inputs with descriptive labels using proper labeling techniques.';
          } else if (ruleId.includes('aria')) {
            fallbackRecommendation = 'Fix ARIA attributes to ensure they are properly implemented and accessible.';
          } else if (ruleId.includes('landmark') || ruleId.includes('region')) {
            fallbackRecommendation = 'Add proper landmark elements or ARIA roles to structure the page content.';
          } else if (ruleId.includes('focus') || ruleId.includes('keyboard')) {
            fallbackRecommendation = 'Ensure all interactive elements are keyboard accessible with visible focus indicators.';
          } else {
            fallbackRecommendation = 'Review and fix this accessibility issue to ensure compliance with WCAG guidelines.';
          }

          results.set(violation.id, {
            explanation: `This ${violation.impact} accessibility issue affects users with disabilities and needs attention.`,
            recommendation: fallbackRecommendation
          });
        }
      });
    }

    console.log(`🔍 DEBUG: Final results count: ${results.size}`);
    return results;
  }

  /**
   * Filters axe results to include only violations and essential properties for LLM analysis
   * Removes verbose data while preserving critical accessibility information
   * Can be controlled via FILTER_AUTH_CONTENT environment variable (default: true)
   */
  private filterAxeResultsForAnalysis(axeResults: any[]): any {
    // Check environment variable to enable/disable filtering
    const enableFiltering = process.env.FILTER_AUTH_CONTENT !== 'false';

    if (!enableFiltering) {
      console.log('🔧 Auth content filtering disabled via FILTER_AUTH_CONTENT=false');
      return axeResults;
    }

    if (!Array.isArray(axeResults)) {
      console.log('Axe results not an array, returning as-is');
      return axeResults;
    }

    console.log(`Original axe results: ${JSON.stringify(axeResults).length} chars`);

    const filtered = {
      violations: axeResults.filter(result => result.impact && result.nodes?.length > 0).map((violation: any) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes?.slice(0, 5).map((node: any) => ({ // Limit to 5 nodes per violation
          html: node.html?.substring(0, 500), // Truncate node HTML to 500 chars
          target: node.target,
          failureSummary: node.failureSummary,
          any: node.any?.slice(0, 3).map((check: any) => ({ // Limit checks
            id: check.id,
            message: check.message,
            data: typeof check.data === 'string' ? check.data.substring(0, 200) : check.data
          })),
          all: node.all?.slice(0, 3).map((check: any) => ({
            id: check.id,
            message: check.message,
            data: typeof check.data === 'string' ? check.data.substring(0, 200) : check.data
          })),
          none: node.none?.slice(0, 3).map((check: any) => ({
            id: check.id,
            message: check.message,
            data: typeof check.data === 'string' ? check.data.substring(0, 200) : check.data
          }))
        }))
      })),
      summary: {
        totalViolations: axeResults.length,
        criticalCount: axeResults.filter((r: any) => r.impact === 'critical').length,
        seriousCount: axeResults.filter((r: any) => r.impact === 'serious').length,
        moderateCount: axeResults.filter((r: any) => r.impact === 'moderate').length,
        minorCount: axeResults.filter((r: any) => r.impact === 'minor').length
      }
    };

    const filteredSize = JSON.stringify(filtered).length;
    console.log(`Filtered axe results: ${filteredSize} chars (reduced by ${JSON.stringify(axeResults).length - filteredSize} chars)`);

    return filtered;
  }

  /**
   * Filters out authentication-related steps from snapshots
   */
  private filterAuthStepsFromSnapshots(snapshots: any[], manifest: any): any[] {
    // Extract actions from manifest to determine auth steps
    const actions = manifest.actions || [];
    const authSteps = new Set<number>();

    // Identify auth steps using the actions
    for (const action of actions) {
      const sessionAction: SessionAction = {
        type: action.type,
        url: action.url,
        selector: action.selector,
        value: action.value,
        step: action.step,
        metadata: action.metadata
      };

      if (isAuthAction(sessionAction).isAuthStep) {
        authSteps.add(action.step);
      }
    }

    // Filter snapshots
    const filteredSnapshots = snapshots.filter(snapshot => {
      if (authSteps.has(snapshot.step)) {
        console.log(`🔐 Filtering out auth step ${snapshot.step} from flow analysis`);
        return false;
      }
      return true;
    });

    console.log(`🔐 Flow analysis: filtered ${snapshots.length - filteredSnapshots.length} auth steps, analyzing ${filteredSnapshots.length} steps`);
    return filteredSnapshots;
  }

}

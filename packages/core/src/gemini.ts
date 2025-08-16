/**
 * Gemini AI service for accessibility analysis
 * Integrates with Google Gemini API to provide intelligent accessibility insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis, ComponentAccessibilityIssue, EnhancedAxeViolation, LLMDebugLog } from './types.js';
import { isAuthUrl, isAuthAction, type SessionAction } from './authDetection.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName = "gemini-2.0-flash";

  // Shared prompt components to eliminate duplication
  private static readonly SHARED_JSON_SCHEMA = `{
  "summary": "Brief overview of accessibility status",
  "components": [
    {
      "componentName": "CRITICAL: NEVER use 'Ensure...' format. MUST use axe-core violation title format. FORBIDDEN: 'Ensure an element's...', 'Ensure every...', 'Ensure all...', 'Ensure that...', 'Ensure the...'. REQUIRED EXAMPLES: 'Elements must only use supported ARIA attributes', 'Form elements must have labels', 'ARIA attributes must conform to valid values', 'ARIA input fields must have an accessible name', 'Elements must meet minimum color contrast ratio thresholds', 'Certain ARIA roles must be contained by particular parents', 'Heading levels should only increase by one', '<html> element must have a lang attribute', 'All page content should be contained by landmarks'. Pattern: [Element Type] + [must/should/must not] + [specific requirement]",
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
  "enhancedAxeViolations": [
    {
      "id": "axe-rule-id (e.g., landmark-one-main, page-has-heading-one, region)",
      "explanation": "User-impact focused explanation of how this affects people with disabilities - focus on the actual barriers created",
      "recommendation": "Clear, actionable guidance on how to fix this specific axe violation - end with 'Reference: [helpUrl]'",
      "wcag": {
        "guideline": "Guideline number only (e.g., 2.4.1, 4.1.2) - do NOT include 'WCAG' prefix - WRONG: 'WCAG 2.4.6', CORRECT: '2.4.6'",
        "level": "Conformance level (A, AA, or AAA)",
        "title": "Official WCAG guideline title (e.g., Bypass Blocks, Name Role Value)",
        "url": "Complete WCAG Understanding URL (e.g., https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html)"
      }
    }
  ],
  "recommendations": ["actionable recommendations"],
  "score": 0-100
}`;

  private static readonly SHARED_WCAG_URLS = `**WCAG URL Requirements:**
- Always provide the complete URL to the specific WCAG 2.1 Understanding document
- Use the format: https://www.w3.org/WAI/WCAG21/Understanding/[page-name].html
- Common examples:
  - 4.1.2 Name, Role, Value → https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html
  - 1.4.3 Contrast (Minimum) → https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
  - 2.4.7 Focus Visible → https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
  - 2.1.1 Keyboard → https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
  - 1.1.1 Non-text Content → https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html
  - 2.4.6 Headings and Labels → https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html
- If unsure of the exact URL, use: https://www.w3.org/WAI/WCAG21/Understanding/`;

  private static readonly SHARED_REQUIREMENTS = `**Requirements:**
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
- Use classes, IDs, and structural selectors to create precise, targetable selectors`;

  private static readonly SHARED_SCREEN_READER_CONTEXT = `**SCREEN READER TECHNOLOGY CONTEXT:**
This analysis targets compatibility with leading screen reader technologies including:
- **JAWS (Job Access With Speech)** - Most widely used Windows screen reader
- **NVDA (NonVisual Desktop Access)** - Popular open-source Windows screen reader  
- **VoiceOver** - Built-in macOS and iOS screen reader
- **TalkBack** - Android's built-in screen reader
- **Dragon NaturallySpeaking** - Voice control and dictation software
- **Windows Narrator** - Built-in Windows screen reader

**ANALYSIS METHODOLOGY:**
You are analyzing HTML markup and Axe accessibility test results to assess screen reader compatibility. You do NOT have access to actual screen reader testing, user behavior, or live interaction data. Your analysis must be based ENTIRELY on code structure, semantic markup, ARIA implementation, and static accessibility patterns that can be determined from HTML snapshots and Axe analysis summaries.`;

  private static readonly SHARED_CRITICAL_INSTRUCTIONS = `**CRITICAL INSTRUCTION - MUST FOLLOW EXACTLY:**

**COMPONENT NAME REQUIREMENT**: The componentName field determines the issue title displayed in the UI. 

**MANDATORY RULE**: Use axe-core violation title format. NEVER use "Ensure..." phrasing.

**FORBIDDEN FORMATS - DO NOT USE:**
❌ NEVER start with "Ensure"
❌ NEVER use "Ensure an element's..."
❌ NEVER use "Ensure every..."
❌ NEVER use "Ensure all..."
❌ NEVER use "Ensure that..."
❌ NEVER use "Ensure the..."

**REQUIRED FORMAT - ALWAYS USE:**
✅ Start with element type: "Elements must...", "Form elements must...", "ARIA attributes must..."
✅ Use must/should/must not: "Elements must only use...", "Heading levels should only..."
✅ State the requirement directly: "...have labels", "...meet minimum contrast..."

**EXACT PATTERNS TO FOLLOW:**
✅ "Elements must only use supported ARIA attributes" (NOT "Ensure an element's role supports its ARIA attributes")
✅ "Certain ARIA roles must be contained by particular parents" (NOT "Ensure elements with an ARIA role that require parent roles are contained by them")
✅ "ARIA attributes must conform to valid values" (NOT "Ensure all ARIA attributes have valid values")
✅ "ARIA input fields must have an accessible name" (NOT "Ensure every ARIA input field has an accessible name")
✅ "ARIA progressbar nodes must have an accessible name" (NOT "Ensure every ARIA progressbar node has an accessible name")
✅ "Elements must meet minimum color contrast ratio thresholds" (NOT "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds")
✅ "Heading levels should only increase by one" (NOT "Ensure the order of headings is semantically correct")
✅ "<html> element must have a lang attribute" (NOT "Ensure every HTML document has a lang attribute")
✅ "Form elements must have labels" (NOT "Ensure every form element has a label")
✅ "All page content should be contained by landmarks" (NOT "Ensure all page content is contained by landmarks")

**SCHEMA PATTERN**: [Element/Component Type] + [must/should/must not] + [specific requirement]

**Additional Requirements:**
- Report ONLY components with identified screen reader accessibility issues
- Base conclusions strictly on provided HTML snapshot and static analysis capabilities
- Do not make assumptions about functionality not evident in markup analysis
- Consider full HTML structure, semantic patterns, and accessibility best practices
`;

  private static readonly SHARED_COMPONENT_ANALYSIS_INSTRUCTIONS = `
**PRIMARY OBJECTIVE: STATIC COMPONENT ACCESSIBILITY ANALYSIS**
Focus EXCLUSIVELY on static component-level accessibility issues that can be identified from individual DOM snapshots. This analysis is designed to identify:
- Missing or incorrect ARIA attributes on individual components
- Semantic HTML structure issues within components  
- Form labeling and control association problems
- Color contrast and visual accessibility defects
- Missing landmarks and heading structure issues
- Individual interactive element accessibility problems

**CRITICAL SCOPE DISTINCTION:**
This function analyzes STATIC COMPONENT ISSUES only. Do NOT analyze:
- Multi-step user flows or navigation patterns (handled by separate flow analysis)
- Complex interaction sequences or state changes
- Cross-page accessibility consistency
- Dynamic content updates or live regions (unless clearly evident in static snapshot)

Identify and address barriers in individual components and page structure that prevent screen reader users from accessing content and functionality, based solely on analysis of the provided code and accessibility reports.
`;

  private static readonly SHARED_FLOW_ANALYSIS_INSTRUCTIONS = `
**PRIMARY OBJECTIVE: SCREEN READER ACCESSIBILITY FLOW ANALYSIS**
The main requirement is to ensure the entire interaction flow maintains proper screen reader accessibility, with correct ARIA state transitions, focus management, and assistive technology announcements throughout the user journey.

**Screen Reader Focused Interaction Flow Analysis Instructions:**
Focus on analyzing multi-step interaction sequences to identify:
- ARIA state management across steps
- Focus management and keyboard navigation flow
- Screen reader announcement continuity
- Dynamic content updates and live regions
- Cross-step accessibility consistency
- Complex interaction sequences and state changes
- Navigation pattern accessibility
`;

  private static readonly SHARED_OUTPUT_FORMAT = `${GeminiService.SHARED_CRITICAL_INSTRUCTIONS}

**OUTPUT FORMAT REQUIREMENTS:**
- RETURN ONLY VALID JSON with no additional text before or after
- Do NOT use emoji, Unicode symbols, or special characters in any output text
- Use plain ASCII text only for maximum compatibility with PDF export systems
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- Start your response with { and end with }
- Do not include any markdown formatting, code blocks, or explanatory text

**CRITICAL: DUAL OUTPUT REQUIREMENT**
Your JSON response MUST include BOTH of these arrays:
1. "components" array - for general accessibility components/issues
2. "enhancedAxeViolations" array - for detailed axe-core rule explanations

The "enhancedAxeViolations" field is MANDATORY and must contain enhanced explanations for common axe violations like:
- landmark-one-main (missing main landmark)
- page-has-heading-one (missing h1 heading)  
- region (content not in landmarks)
- color-contrast (insufficient contrast)
- label (missing form labels)
- And any other axe violations you identify

**CRITICAL: WCAG GUIDELINE FORMAT**
In the wcag.guideline field, use ONLY the number without "WCAG" prefix:
- WRONG: "WCAG 2.4.6" 
- CORRECT: "2.4.6"
- WRONG: "WCAG 1.4.3"
- CORRECT: "1.4.3"
The UI will add the "WCAG" prefix automatically.

**Output Format:**
Respond with a JSON object with this exact structure:
${GeminiService.SHARED_JSON_SCHEMA}

${GeminiService.SHARED_WCAG_URLS}

${GeminiService.SHARED_REQUIREMENTS}

**SCREEN READER PRIORITY**: Every identified issue should be evaluated from the perspective of a screen reader user. Prioritize problems that would prevent, confuse, or frustrate someone using assistive technology to navigate and interact with the interface.

**CRITICAL: Return ONLY the JSON object with BOTH components AND enhancedAxeViolations arrays - no other text.**`;

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
    previousHtml?: string,
    timeoutMs?: number,
    filterStaticSections?: boolean
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

      const prompt = this.buildComponentAnalysisPrompt(htmlContent, axeResults, context, previousHtml, filterStaticSections);

      // Set up timeout for Gemini API call (passed from environment config)
      const timeout = timeoutMs || (5 * 60 * 1000); // Fallback if no timeout provided
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini API timeout after ${Math.round(timeout / 60000)} minutes`)), timeout);
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
   * @param progressiveContext - Optional progressive context from previous batches
   * @returns Structured accessibility analysis
   */
  async analyzeAccessibilityFlow(
    snapshots: any[],
    manifest: any,
    context: {
      url: string;
      sessionId: string;
      totalSteps: number;
    },
    progressiveContext?: {
      previousBatchSummaries: any[];
      currentBatchMetadata: {
        batchId: string;
        flowType: string;
        stepRange: { start: number; end: number };
        batchIndex: number;
        totalBatches: number;
      };
      overallContext: {
        sessionId: string;
        url: string;
        totalSteps: number;
        flowTypes: string[];
      };
    },
    timeoutMs?: number,
    filterStaticSections?: boolean
  ): Promise<GeminiAnalysis> {
    try {
      // Filter out authentication steps from snapshots
      const filteredSnapshots = this.filterAuthStepsFromSnapshots(snapshots, manifest);
      if (filteredSnapshots.length !== snapshots.length) {
        console.log(`🔐 Filtered out ${snapshots.length - filteredSnapshots.length} auth steps from flow analysis`);
      }

      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = this.buildFlowAnalysisPrompt(filteredSnapshots, manifest, context, progressiveContext, filterStaticSections);

      // Set up timeout for Gemini API call (passed from environment config)
      const timeout = timeoutMs || (10 * 60 * 1000); // Fallback if no timeout provided
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini API timeout after ${Math.round(timeout / 60000)} minutes`)), timeout);
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
    previousHtml?: string,
    filterStaticSections?: boolean
  ): string {
    const hasBeforeAfter = previousHtml && previousHtml !== htmlContent;
    return `
Analyze the provided DOM snapshot(s) and Axe Accessibility Report(s) with a primary focus on screen reader (ARIA) accessibility and compatibility with assistive technologies. Your objective is to identify deficiencies in the code that hinder optimal support for screen readers and related tools, and to recommend precise, actionable code fixes to address these issues.

${GeminiService.SHARED_SCREEN_READER_CONTEXT}

**ANALYSIS METHODOLOGY:**
You are analyzing HTML markup and Axe accessibility test results to assess screen reader compatibility. You do NOT have access to actual screen reader testing, user behavior, or live interaction data. Your analysis must be based ENTIRELY on code structure, semantic markup, ARIA implementation, and static accessibility patterns that can be determined from HTML snapshots and Axe analysis summaries.

${GeminiService.SHARED_COMPONENT_ANALYSIS_INSTRUCTIONS}

**Context:**
- URL: ${context.url}
- User Action: ${context.action}
- Analysis Step: ${context.step}
- DOM Change Type: ${context.domChangeType || 'unknown'}

**Current State DOM Snapshot:**
${this.truncateHtml(htmlContent, filterStaticSections)}

${hasBeforeAfter ? `**Previous State DOM Snapshot:**
${this.truncateHtml(previousHtml, filterStaticSections)}` : ''}

**Axe-core Accessibility Report (Violations Only):**
${JSON.stringify(this.filterAxeResultsForAnalysis(axeResults), null, 2)}

**AXE VIOLATION ENHANCEMENT REQUIREMENTS:**
For each axe violation listed above, you MUST provide enhanced user-friendly content in the enhancedAxeViolations section:

- **explanation**: Focus on user impact - how this affects people using screen readers or other assistive technologies
- **recommendation**: Provide clear, actionable guidance ending with "Reference: [helpUrl from violation]"  
- **wcag**: MANDATORY - include complete WCAG 2.1 reference with guideline, level, title, and URL
- Use the violation's existing id, helpUrl, and technical details as reference
- Make explanations user-impact focused, not technical descriptions
- Keep recommendations actionable but general enough to apply to the violation type

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

**7. NAVIGATION ANTI-PATTERN DETECTION**
Identify navigation sabotage patterns that specifically target and disable keyboard/screen reader accessibility:

**Focus Sabotage Patterns:**
- \`onfocus="blur()"\` or \`onfocus="this.blur()"\` - Malicious focus removal that prevents keyboard navigation
- \`onfocus="setTimeout(function(){this.blur()}, 0)"\` - Delayed focus removal to bypass detection
- Elements with \`tabindex="-1"\` on interactive elements that should be keyboard accessible
- Focus event handlers that programmatically move focus away from actionable elements

**Fake Navigation Links:**
- \`<a href="javascript:void(0)">\` without proper click handlers or ARIA attributes
- \`<a href="javascript:">\` links that don't provide alternative keyboard activation
- \`<a href="#">\` links without preventDefault() that cause page jumps
- Links with \`href\` values that don't work for keyboard users (e.g., only mouse click handlers)

**Keyboard Trap Detection:**
- Elements that capture focus but provide no escape mechanism (missing escape key handling)
- Modal dialogs without proper focus containment and escape functionality
- Custom widgets that trap focus without implementing proper ARIA navigation patterns
- Focus loops that don't include all necessary interactive elements

**Interactive Element Sabotage:**
- \`<div>\` or \`<span>\` elements with click handlers but no keyboard equivalents
- Interactive elements without \`role="button"\` or proper semantic markup
- Custom controls missing \`aria-expanded\`, \`aria-selected\`, or state management
- Elements with visual interactivity but no programmatic accessibility

**Dynamic Content Navigation Issues:**
- Content that changes without updating screen reader context (missing aria-live regions)
- Navigation state changes that don't notify assistive technology users
- Progressive disclosure that breaks keyboard navigation flow
- AJAX content updates that don't manage focus appropriately

**Screen Reader Bypass Patterns:**
- Content hidden with \`aria-hidden="true"\` that should be accessible to screen readers
- Important interactive elements marked as presentation (\`role="presentation"\`)
- Text content that relies solely on visual positioning without semantic structure
- Navigation menus that work visually but lack proper ARIA navigation support

**8. SCREEN READER CRITICAL COMPONENTS**
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

**9. COMPREHENSIVE ISSUE IDENTIFICATION**
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

**Navigation Anti-Pattern Detection:**
- Focus sabotage patterns (\`onfocus="blur()"\`, \`onfocus="this.blur()"\`)
- Fake navigation links (\`href="javascript:void(0)"\` without proper handlers)
- Keyboard traps without escape mechanisms
- Interactive \`<div>\`/\`<span>\` elements without keyboard support
- Missing ARIA states for dynamic navigation elements
- Screen reader bypass patterns (inappropriate \`aria-hidden\` usage)

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
- Navigation anti-patterns (focus sabotage, fake links, keyboard traps, screen reader bypass patterns)
- Dynamic interaction issues (when before/after comparison is available)

**ANALYSIS PRIORITY:**
1. **Critical Issues** (Block task completion): Missing form labels, keyboard traps, missing focus management, broken ARIA relationships, missing required landmarks
2. **Serious Issues** (Significantly impair experience): Poor heading hierarchy, inadequate alt text, missing live regions, incorrect ARIA states, poor error handling  
3. **Moderate Issues** (Create barriers): Generic link text, missing skip links, suboptimal ARIA patterns, missing language declarations
4. **Minor Issues** (Polish and optimization): Redundant ARIA attributes, non-essential semantic improvements

**CRITICAL: AXE VIOLATION ENHANCEMENT REQUIREMENT**
In addition to the "components" array, you MUST populate the "enhancedAxeViolations" array with enhanced explanations for axe-core violations. For each axe violation you identify (like landmark-one-main, page-has-heading-one, region, etc.), provide:
- User-impact focused explanation of how this affects people with disabilities
- Clear, actionable guidance on how to fix the violation  
- Complete WCAG reference with guideline number, level, title, and URL

This enhancedAxeViolations field is MANDATORY and must not be empty if you identify accessibility issues.

${GeminiService.SHARED_OUTPUT_FORMAT}
`;
  }
  /**
   * Builds a comprehensive flow analysis prompt for multi-snapshot analysis
   * Focuses on interaction sequences, state changes, and parent-child relationships
   */
  private buildFlowAnalysisPrompt(
    snapshots: any[],
    manifest: any,
    context: { url: string; sessionId: string; totalSteps: number },
    progressiveContext?: {
      previousBatchSummaries: any[];
      currentBatchMetadata: {
        batchId: string;
        flowType: string;
        stepRange: { start: number; end: number };
        batchIndex: number;
        totalBatches: number;
      };
      overallContext: {
        sessionId: string;
        url: string;
        totalSteps: number;
        flowTypes: string[];
      };
    },
    filterStaticSections?: boolean
  ): string {
    // Group snapshots by flow context
    const flowGroups = this.groupSnapshotsByFlow(snapshots, manifest);
    
    // Build progressive context section
    const progressiveContextSection = progressiveContext ? `

**PROGRESSIVE ANALYSIS CONTEXT:**
This is batch ${progressiveContext.currentBatchMetadata.batchIndex + 1} of ${progressiveContext.currentBatchMetadata.totalBatches} in a hierarchical batching approach.

**Current Batch:**
- Batch ID: ${progressiveContext.currentBatchMetadata.batchId}
- Flow Type: ${progressiveContext.currentBatchMetadata.flowType}
- Step Range: ${progressiveContext.currentBatchMetadata.stepRange.start}-${progressiveContext.currentBatchMetadata.stepRange.end}
- Analyzing ${snapshots.length} snapshots from this flow segment

**Previous Batch Context:**
${progressiveContext.previousBatchSummaries.length > 0 
  ? progressiveContext.previousBatchSummaries.map(summary => `
- Batch: ${summary.flowType} (steps ${summary.stepRange.start}-${summary.stepRange.end})
  Key Findings: ${summary.keyFindings.join(', ')}
  Critical Issues: ${summary.criticalIssues.length} issues
  Context: ${summary.contextForNext.flowState} | ${summary.contextForNext.accessibilityPattern}`).join('\n')
  : 'This is the first batch - no previous context available'}

**Overall Session Context:**
- Total Steps Across All Batches: ${progressiveContext.overallContext.totalSteps}
- Flow Types in Session: ${progressiveContext.overallContext.flowTypes.join(', ')}
- Current Analysis Focus: ${progressiveContext.currentBatchMetadata.flowType} flow patterns

**Cross-Batch Considerations:**
- Build upon findings from previous batches
- Consider how this flow segment connects to previous interactions
- Identify patterns that span multiple batches
- Note accessibility state transitions that may affect subsequent flows
` : '';

    return `Your task is to analyze a user interaction flow${progressiveContext ? ` segment (batch ${progressiveContext.currentBatchMetadata.batchIndex + 1}/${progressiveContext.currentBatchMetadata.totalBatches})` : ''} consisting of ${context.totalSteps} steps captured during accessibility testing, with a PRIMARY FOCUS on screen reader (ARIA) accessibility and assistive technology compatibility. This analysis ensures that interaction sequences work correctly for screen reader users through proper ARIA implementation and state management.

${GeminiService.SHARED_FLOW_ANALYSIS_INSTRUCTIONS}
${progressiveContextSection}
**Session Context:**
- URL: ${context.url}
- Session ID: ${context.sessionId}
- Total Steps: ${context.totalSteps}
- Flow Groups: ${Object.keys(flowGroups).join(', ')}

${GeminiService.SHARED_SCREEN_READER_CONTEXT}

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
${this.truncateHtml(step.html, filterStaticSections)}

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
   - **Navigation Anti-Pattern Detection**: Identify focus sabotage (\`onfocus="blur()"\`), fake links (\`href="javascript:void(0)"\`), keyboard traps, and screen reader bypass patterns

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

${GeminiService.SHARED_OUTPUT_FORMAT}
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
  private truncateHtml(html: string, filterStaticSections: boolean = false): string {
    console.log(`Original HTML size: ${html.length} chars`);

    // First, filter out unnecessary content
    const filtered = this.filterHtmlForAnalysis(html, filterStaticSections);
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
   * Optionally removes static sections (header, footer, nav) when filterStaticSections is true
   */
  private filterHtmlForAnalysis(html: string, filterStaticSections: boolean = false): string {
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

      // Remove static sections if requested (header, footer, navigation)
      if (filterStaticSections) {
        filtered = this.removeStaticSections(filtered);
      }

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
  }

  /**
   * Removes static sections (header, footer, navigation) using DOM parsing approach
   * Focuses on removing outermost static elements while preserving inner navigation
   */
  private removeStaticSections(html: string): string {
    try {
      console.log('🧹 Filtering static sections (header, footer, navigation)...');
      
      let filtered = html;
      let sectionsRemoved = 0;

      // Remove semantic header, footer, and outermost nav elements
      // Use negative lookahead to avoid removing nested elements
      
      // Remove header elements (outermost only)
      const headerMatches = filtered.match(/<header\b[^>]*>[\s\S]*?<\/header>/gi);
      if (headerMatches) {
        headerMatches.forEach(match => {
          // Only remove if it's not nested inside another header
          const beforeMatch = filtered.substring(0, filtered.indexOf(match));
          const openHeaderCount = (beforeMatch.match(/<header\b[^>]*>/gi) || []).length;
          const closeHeaderCount = (beforeMatch.match(/<\/header>/gi) || []).length;
          
          if (openHeaderCount === closeHeaderCount) {
            filtered = filtered.replace(match, '<!-- Header removed for analysis -->');
            sectionsRemoved++;
          }
        });
      }

      // Remove footer elements (outermost only)
      const footerMatches = filtered.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi);
      if (footerMatches) {
        footerMatches.forEach(match => {
          const beforeMatch = filtered.substring(0, filtered.indexOf(match));
          const openFooterCount = (beforeMatch.match(/<footer\b[^>]*>/gi) || []).length;
          const closeFooterCount = (beforeMatch.match(/<\/footer>/gi) || []).length;
          
          if (openFooterCount === closeFooterCount) {
            filtered = filtered.replace(match, '<!-- Footer removed for analysis -->');
            sectionsRemoved++;
          }
        });
      }

      // Remove navigation elements (outermost only) - preserves breadcrumbs and local nav
      const navMatches = filtered.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi);
      if (navMatches) {
        navMatches.forEach(match => {
          const beforeMatch = filtered.substring(0, filtered.indexOf(match));
          const openNavCount = (beforeMatch.match(/<nav\b[^>]*>/gi) || []).length;
          const closeNavCount = (beforeMatch.match(/<\/nav>/gi) || []).length;
          
          if (openNavCount === closeNavCount) {
            filtered = filtered.replace(match, '<!-- Navigation removed for analysis -->');
            sectionsRemoved++;
          }
        });
      }

      // Remove elements with common static section classes/IDs
      const staticPatterns = [
        // Main navigation patterns
        /<[^>]*class="[^"]*(?:main-nav|primary-nav|site-nav|global-nav)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        /<[^>]*id="[^"]*(?:main-nav|primary-nav|site-nav|global-nav)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        
        // Header patterns
        /<[^>]*class="[^"]*(?:site-header|main-header|page-header)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        /<[^>]*id="[^"]*(?:site-header|main-header|page-header)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        
        // Footer patterns
        /<[^>]*class="[^"]*(?:site-footer|main-footer|page-footer)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        /<[^>]*id="[^"]*(?:site-footer|main-footer|page-footer)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi
      ];

      staticPatterns.forEach(pattern => {
        const matches = filtered.match(pattern);
        if (matches) {
          matches.forEach(match => {
            filtered = filtered.replace(match, '<!-- Static section removed for analysis -->');
            sectionsRemoved++;
          });
        }
      });

      console.log(`✅ Static section filtering complete: ${sectionsRemoved} sections removed`);
      console.log(`📉 Size reduction: ${html.length - filtered.length} chars`);

      return filtered;
    } catch (error) {
      console.warn('⚠️ Static section filtering failed, using original HTML:', error);
      return html;
    }
  }
  
  /**
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
      
      // Debug: Check what we got for enhanced axe violations
      console.log(`🔍 DEBUG: Raw enhanced axe violations from LLM:`, parsed.enhancedAxeViolations);
      console.log(`🔍 DEBUG: Enhanced axe violations type:`, typeof parsed.enhancedAxeViolations);
      console.log(`🔍 DEBUG: Enhanced axe violations length:`, Array.isArray(parsed.enhancedAxeViolations) ? parsed.enhancedAxeViolations.length : 'not array');
      
      const enhancedAxeViolations = this.parseEnhancedAxeViolations(parsed.enhancedAxeViolations || []);
      console.log(`🔍 DEBUG: Parsed enhanced axe violations:`, enhancedAxeViolations.length, 'items');

      return {
        summary: parsed.summary || 'Screen reader accessibility analysis completed',
        components: validComponents,
        enhancedAxeViolations: enhancedAxeViolations,
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
  }

  /**
   * Validates and formats enhanced axe violations
   */
  private parseEnhancedAxeViolations(enhancedViolations: any[]): EnhancedAxeViolation[] {
    if (!Array.isArray(enhancedViolations) || enhancedViolations.length === 0) {
      console.warn('⚠️ No enhanced axe violations returned from LLM');
      return [];
    }

    return enhancedViolations
      .filter(violation => {
        const hasValidId = violation.id && violation.id.trim().length > 0;
        const hasValidExplanation = violation.explanation && violation.explanation.trim().length > 0;
        const hasValidRecommendation = violation.recommendation && violation.recommendation.trim().length > 0;

        if (!hasValidId || !hasValidExplanation || !hasValidRecommendation) {
          console.warn('🗑️ Filtering out invalid enhanced axe violation:', {
            id: violation.id,
            hasExplanation: hasValidExplanation,
            hasRecommendation: hasValidRecommendation
          });
          return false;
        }

        return true;
      })
      .map(violation => ({
        id: violation.id.trim(),
        explanation: violation.explanation.trim(),
        recommendation: violation.recommendation.trim(),
        wcag: violation.wcag ? {
          guideline: violation.wcag.guideline || '',
          level: violation.wcag.level || 'A',
          title: violation.wcag.title || '',
          url: violation.wcag.url || ''
        } : undefined
      }));
  }

  /**
   * Generate explanations and actionable recommendations for specific axe violations
   */
  async generateAxeRecommendations(violations: any[], timeoutMs?: number): Promise<Map<string, { explanation: string; recommendation: string; wcag?: { guideline: string; level: string; title: string; url: string } }>> {
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
      
      // Set up timeout for Gemini API call (passed from environment config)
      const timeout = timeoutMs || (5 * 60 * 1000); // Fallback if no timeout provided
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini API timeout after ${Math.round(timeout / 60000)} minutes`)), timeout);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]);
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
    return `You are an accessibility expert. For each axe-core violation, provide an explanation, recommendation, AND the correct WCAG 2.1 guideline reference.

CRITICAL: You MUST respond with content for EVERY violation provided. Do not skip any violations.

Return your response as a valid JSON object with this exact structure. 

⚠️ CRITICAL: EVERY violation object MUST contain exactly these 4 fields:
1. "id" - the violation ID  
2. "explanation" - user impact explanation
3. "recommendation" - how to fix it
4. "wcag" - WCAG reference object (REQUIRED - do not omit)

**REQUIRED JSON STRUCTURE - COPY THIS EXACTLY:**
{
  "violations": [
    {
      "id": "PUT_VIOLATION_ID_HERE",
      "explanation": "PUT_EXPLANATION_HERE", 
      "recommendation": "PUT_RECOMMENDATION_HERE",
      "wcag": {
        "guideline": "PUT_WCAG_NUMBER_HERE",
        "level": "PUT_LEVEL_HERE",
        "title": "PUT_TITLE_HERE",
        "url": "PUT_URL_HERE"
      }
    }
  ]
}

❌ INVALID RESPONSE EXAMPLES (do not do this):
- Missing wcag field: {"id": "...", "explanation": "...", "recommendation": "..."} 
- Null wcag field: {"wcag": null}
- Empty wcag field: {"wcag": {}}

✅ EVERY response must include complete wcag object as shown above.

${GeminiService.SHARED_WCAG_URLS}

WCAG REFERENCE REQUIREMENTS (MANDATORY):
- Every violation MUST include a wcag object with complete WCAG 2.1 reference data
- Determine the primary WCAG 2.1 guideline that this axe rule validates
- Provide the guideline number (e.g., "1.4.3", "4.1.2")
- Include the conformance level ("A", "AA", or "AAA")
- Provide the official WCAG guideline title
- Generate the correct WCAG Understanding URL using format: https://www.w3.org/WAI/WCAG21/Understanding/[title-kebab-case].html
- If NO applicable WCAG guideline exists, set wcag to null

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
- ALWAYS end each recommendation with "Reference: [violation helpUrl]"

🚨 BEFORE RESPONDING: Verify each violation object has these 4 fields: id, explanation, recommendation, wcag

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
- 🚨 MANDATORY: Every violation MUST have ALL FOUR fields: id, explanation, recommendation, AND wcag
- 🚨 DO NOT omit the wcag object - include it for EVERY single violation
- Use the actual HTML context to understand the violation type
- Make recommendations general and actionable 
- Focus on what needs to be done, not detailed implementation steps
- Make explanations user-impact focused (how this affects people with disabilities)
- Provide clear guidance that applies to the violation type
- NEVER skip a violation or leave sections empty
- ALWAYS end each recommendation with "Reference: [violation helpUrl]"
- Return ONLY valid JSON, no additional text or formatting`;
  }  /**
   * Parse axe recommendations from LLM JSON response
   */
  private parseAxeRecommendations(text: string, violations: any[]): Map<string, { explanation: string; recommendation: string; wcag?: { guideline: string; level: string; title: string; url: string } }> {
    const results = new Map<string, { explanation: string; recommendation: string; wcag?: { guideline: string; level: string; title: string; url: string } }>();

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
      console.log(`🔍 DEBUG: Parsed JSON response:`, jsonResponse);
      console.log(`🔍 DEBUG: jsonResponse.violations type:`, typeof jsonResponse.violations);
      console.log(`🔍 DEBUG: jsonResponse.violations isArray:`, Array.isArray(jsonResponse.violations));
      console.log(`🔍 DEBUG: jsonResponse.violations length:`, jsonResponse.violations?.length);

      if (jsonResponse.violations && Array.isArray(jsonResponse.violations)) {
        console.log(`🔍 DEBUG: Processing ${jsonResponse.violations.length} violations from LLM`);
        jsonResponse.violations.forEach((violationData: any, index: number) => {
          console.log(`🔍 DEBUG: Processing violation ${index + 1}/${jsonResponse.violations.length}`);
          const violationId = violationData.id;
          console.log(`🔍 DEBUG: Processing LLM violation data for ${violationId}:`, {
            hasExplanation: !!violationData.explanation,
            hasRecommendation: !!violationData.recommendation,
            hasWcag: !!violationData.wcag,
            wcagData: violationData.wcag
          });

          const explanation = violationData.explanation || '';
          const recommendation = violationData.recommendation || '';
          const wcag = violationData.wcag || null;

          if (explanation && recommendation) {
            const result: { explanation: string; recommendation: string; wcag?: { guideline: string; level: string; title: string; url: string } } = {
              explanation: explanation.trim(),
              recommendation: recommendation.trim()
            };

            // Add WCAG data if present and valid
            if (wcag && wcag.guideline && wcag.level && wcag.title && wcag.url) {
              result.wcag = {
                guideline: wcag.guideline,
                level: wcag.level,
                title: wcag.title,
                url: wcag.url
              };
            }

            results.set(violationId, result);
            console.log(`✅ DEBUG: Successfully parsed violation ${violationId}`, wcag ? 'with WCAG data' : 'without WCAG data');
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

  // Static Section Caching for "separate" mode
  private staticSectionCache = new Map<string, ComponentAccessibilityIssue[]>();

  /**
   * Extract static sections (header, footer, nav) from HTML content
   * Returns both the static sections and the remaining main content
   */
  extractStaticSections(html: string): { staticSections: string; mainContent: string } {
    try {
      console.log('🔍 Extracting static sections from HTML...');
      
      let staticSections = '';
      let mainContent = html;

      // Extract header elements
      const headerMatches = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/gi);
      if (headerMatches) {
        headerMatches.forEach(match => {
          staticSections += match + '\n';
          mainContent = mainContent.replace(match, '<!-- Header removed for main content analysis -->');
        });
      }

      // Extract footer elements
      const footerMatches = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi);
      if (footerMatches) {
        footerMatches.forEach(match => {
          staticSections += match + '\n';
          mainContent = mainContent.replace(match, '<!-- Footer removed for main content analysis -->');
        });
      }

      // Extract navigation elements (main/primary nav only)
      const navMatches = html.match(/<nav\b[^>]*(?:class="[^"]*(?:main-nav|primary-nav|site-nav|global-nav)[^"]*"|id="[^"]*(?:main-nav|primary-nav|site-nav|global-nav)[^"]*")[^>]*>[\s\S]*?<\/nav>/gi);
      if (navMatches) {
        navMatches.forEach(match => {
          staticSections += match + '\n';
          mainContent = mainContent.replace(match, '<!-- Navigation removed for main content analysis -->');
        });
      }

      // Extract elements with static section classes/IDs
      const staticPatterns = [
        /<[^>]*class="[^"]*(?:site-header|main-header|page-header|site-footer|main-footer|page-footer)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        /<[^>]*id="[^"]*(?:site-header|main-header|page-header|site-footer|main-footer|page-footer)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi
      ];

      staticPatterns.forEach(pattern => {
        const matches = mainContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            staticSections += match + '\n';
            mainContent = mainContent.replace(match, '<!-- Static section removed for main content analysis -->');
          });
        }
      });

      console.log(`✅ Static sections extracted: ${staticSections.length} chars, main content: ${mainContent.length} chars`);
      
      return {
        staticSections: staticSections.trim(),
        mainContent: mainContent
      };
    } catch (error) {
      console.warn('⚠️ Static section extraction failed, using original HTML:', error);
      return {
        staticSections: '',
        mainContent: html
      };
    }
  }

  /**
   * Generate content hash for static sections to use as cache key
   */
  generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Analyze static sections separately and cache results by content hash
   */
  async analyzeStaticSections(
    staticSections: string,
    axeResults: any[],
    context: { url: string; action: string; step: number; domChangeType?: string },
    timeoutMs?: number
  ): Promise<ComponentAccessibilityIssue[]> {
    if (!staticSections || staticSections.trim().length === 0) {
      console.log('🔍 No static sections to analyze');
      return [];
    }

    // Generate content hash for caching
    const contentHash = this.generateContentHash(staticSections);
    console.log(`🔑 Static section content hash: ${contentHash}`);

    // Check cache first
    if (this.staticSectionCache.has(contentHash)) {
      console.log(`✅ Using cached static section analysis for hash: ${contentHash}`);
      return this.staticSectionCache.get(contentHash)!;
    }

    console.log(`🔄 Analyzing static sections (not in cache): ${staticSections.length} chars`);

    try {
      // Use existing analyzeComponent method for static sections
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      // Build analysis prompt specifically for static sections
      const prompt = this.buildComponentAnalysisPrompt(
        staticSections,
        axeResults,
        { 
          ...context, 
          action: `Static Section Analysis: ${context.action}`,
          domChangeType: 'static-section-analysis'
        },
        undefined, // no previous HTML for static sections
        false // don't filter static sections when analyzing them
      );

      const timeout = timeoutMs || (5 * 60 * 1000);
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Static section analysis timeout after ${Math.round(timeout / 60000)} minutes`)), timeout);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      const analysis = this.parseGeminiResponse(text, context);
      
      // Cache the results
      this.staticSectionCache.set(contentHash, analysis.components);
      console.log(`💾 Cached static section analysis: ${analysis.components.length} components`);

      return analysis.components;
    } catch (error) {
      console.warn('❌ Static section analysis failed:', error);
      // Cache empty results to avoid re-analyzing failed content
      this.staticSectionCache.set(contentHash, []);
      return [];
    }
  }

  /**
   * Clear static section cache (useful for testing or memory management)
   */
  clearStaticSectionCache(): void {
    console.log(`🗑️ Clearing static section cache: ${this.staticSectionCache.size} entries`);
    this.staticSectionCache.clear();
  }

}

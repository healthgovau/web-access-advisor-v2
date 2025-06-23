/**
 * Gemini AI service for accessibility analysis
 * Integrates with Google Gemini API to provide intelligent accessibility insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis, ComponentAccessibilityIssue, LLMDebugLog } from './types.js';

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

      // Create debug log
      const debugLog: LLMDebugLog = {
        type: 'component',
        prompt,
        response: text,
        promptSize: prompt.length,
        responseSize: text.length,
        htmlSize: htmlContent.length,
        axeResultsCount: axeResults.length,
        timestamp: new Date().toISOString()
      };

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
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = this.buildFlowAnalysisPrompt(snapshots, manifest, context);

      // Set up timeout for Gemini API call (3 minutes for complex flow analysis)
      const geminiPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 3 minutes')), 3 * 60 * 1000);
      });

      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      // Create debug log
      const debugLog: LLMDebugLog = {
        type: 'flow',
        prompt,
        response: text,
        promptSize: prompt.length,
        responseSize: text.length,
        htmlSize: snapshots.reduce((total, snap) => total + snap.html.length, 0),
        axeResultsCount: snapshots.reduce((total, snap) => total + (snap.axeResults?.length || 0), 0),
        timestamp: new Date().toISOString()
      };

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
Your task is to analyze the provided DOM snapshot(s) and corresponding Axe Accessibility Report(s) with a PRIMARY FOCUS on screen reader (ARIA) accessibility and assistive technology compatibility. This tool is specifically designed to ensure interactive components work correctly with screen readers and other assistive technologies.

**PRIMARY OBJECTIVE: SCREEN READER ACCESSIBILITY**
The main requirement for this analysis is to ensure all interactive components are fully accessible to screen reader users through proper ARIA implementation, semantic HTML, and correct assistive technology behavior.

**Context:**
- URL: ${context.url}
- User Action: ${context.action}
- Analysis Step: ${context.step}
- DOM Change Type: ${context.domChangeType || 'unknown'}

**Current State DOM Snapshot:**
${this.truncateHtml(htmlContent)}

${hasBeforeAfter ? `**Previous State DOM Snapshot:**
${this.truncateHtml(previousHtml)}` : ''}

**Axe-core Accessibility Report:**
${JSON.stringify(axeResults, null, 2)}

**SCREEN READER FOCUSED ANALYSIS INSTRUCTIONS:**

1. **Identify Screen Reader Critical Components**: Prioritize components that directly impact screen reader navigation and interaction:
   - Expandable/Collapsible Content (aria-expanded, aria-controls)
   - Dropdown Menus (role="menu", aria-haspopup, aria-expanded)
   - Tab Panels (role="tablist", aria-selected, aria-controls)
   - Modal Dialogs (role="dialog", aria-modal, focus management)
   - Autocomplete/Suggestion Lists (aria-autocomplete, aria-activedescendant)
   - Error Handling (aria-invalid, aria-describedby)
   - Dynamic Content Updates (aria-live regions)
   - Keyboard Navigation indicators (focus management, tabindex)
   - Carousels/Sliders (aria-roledescription, aria-live)
   - Tree Views (role="tree", aria-expanded, aria-selected)
   - Data Tables (proper header associations, scope)
   - Sortable Tables (aria-sort attributes)
   - Tooltips/Popovers (role="tooltip", aria-describedby)
   - Context Menus (role="menu", keyboard navigation)
   - Validation Messages (aria-describedby, error announcements)
   - Live Regions (aria-live, aria-atomic)

2. **ARIA Implementation Analysis**: For each identified component, examine CRITICAL screen reader attributes:
   - **Roles**: Ensure proper semantic roles (button, menu, dialog, etc.)
   - **States**: Check aria-expanded, aria-selected, aria-checked, aria-pressed
   - **Properties**: Verify aria-label, aria-labelledby, aria-describedby
   - **Relationships**: Confirm aria-controls, aria-owns, aria-activedescendant
   - **Live Regions**: Validate aria-live, aria-atomic for dynamic content
   - **Keyboard Support**: Ensure proper tabindex and focus management

${hasBeforeAfter ? `3. **Screen Reader State Changes**: Since both before and after snapshots are provided, focus on how ARIA attributes change during interaction from a screen reader perspective:
   - Does aria-expanded correctly update when dropdowns open/close?
   - Do aria-selected attributes change when tabs are activated?
   - Are aria-live regions properly announcing dynamic content changes?
   - Is focus management working correctly for screen readers?` : `3. **Screen Reader State Analysis**: Analyze the component's ARIA implementation for screen reader compatibility in the current state.`}

4. **Screen Reader Accessibility Issues**: Identify problems that specifically impact screen reader users:
   - Missing or incorrect ARIA roles that prevent proper component identification
   - Missing ARIA states/properties that hide component functionality from screen readers
   - Incorrect ARIA relationships that break screen reader navigation
   - Missing aria-live regions for dynamic content announcements
   - Poor focus management that traps or loses screen reader focus
   - Missing semantic structure (headings, landmarks, lists)
   - Inadequate labeling that leaves screen reader users without context
   - Failed ARIA attribute updates during state changes
   - Relevant Axe violations that impact screen reader functionality

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

**Important**: Report ONLY components with identified screen reader accessibility issues.Do not report on components where no accessibility issue was found. Focus on actionable insights and practical ARIA fixes that directly improve screen reader compatibility and assistive technology interaction.

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

${Object.entries(flowGroups).map(([flowType, steps]: [string, any[]]) => {
      return `
**${flowType.toUpperCase()} FLOW:**
${steps.map((step: any, index: number) => {
        const stepDetail = manifest.stepDetails.find((s: any) => s.step === step.step);
        return `
Step ${step.step} (Parent: ${stepDetail?.parentStep || 'none'}):
- Action: ${stepDetail?.action || step.action} 
- UI State: ${stepDetail?.uiState || 'unknown'}
- DOM Changes: ${stepDetail?.domChanges || step.domChangeDetails?.description || 'none'}
- Axe Violations: ${step.axeResults?.length || 0}

DOM Snapshot (truncated):
${this.truncateHtml(step.html)}

Axe Violations:
${JSON.stringify(step.axeResults || [], null, 2)}
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

Focus on actionable screen reader accessibility issues that can be addressed by developers, prioritizing critical ARIA barriers that impact assistive technology users.

**CRITICAL: relevantHtml MUST BE ACTUAL HTML CODE:**
- NEVER provide text content like "Skip to main content" or page descriptions
- ALWAYS provide HTML markup with < > angle brackets
- Example GOOD: <button class="nav-btn">Skip to content</button>
- Example BAD: Skip to main content
- If you cannot identify specific HTML, leave relevantHtml empty

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
   * Group snapshots by flow type for organized analysis
   */
  private groupSnapshotsByFlow(snapshots: any[], manifest: any): Record<string, any[]> {
    const groups: Record<string, any[]> = {
      main_flow: [],
      modal_flow: [],
      form_flow: [],
      navigation_flow: [],
      sub_flow: []
    };

    snapshots.forEach((snapshot) => {
      const stepDetail = manifest.stepDetails.find((s: any) => s.step === snapshot.step);
      const flowContext = stepDetail?.flowContext || 'main_flow';

      if (groups[flowContext]) {
        groups[flowContext].push(snapshot);
      } else {
        groups.main_flow.push(snapshot);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }  /**
   * Truncates HTML content for analysis while preserving important accessibility attributes
   */
  private truncateHtml(html: string): string {
    // Configurable HTML size limit via environment variable (default 1MB)
    const maxLength = parseInt(process.env.GEMINI_HTML_MAX_SIZE || '1048576'); // 1MB default

    if (html.length <= maxLength) {
      console.log(`HTML size: ${html.length} chars (under ${maxLength} limit, no truncation)`);
      return html;
    }

    console.log(`⚠️ HTML size: ${html.length} chars (exceeds ${maxLength} limit, truncating...)`);

    // Try to truncate at element boundaries
    const truncated = html.substring(0, maxLength);
    const lastTag = truncated.lastIndexOf('<');
    const result = lastTag > maxLength - 1000 ? truncated.substring(0, lastTag) : truncated;

    console.log(`HTML truncated to: ${result.length} chars`);
    return result;
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

See: ${violation.helpUrl || 'https://dequeuniversity.com/rules/axe/'}`
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

See: ${violation.helpUrl || 'https://dequeuniversity.com/rules/axe/'}`
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
- ALWAYS end recommendations with a reference to the relevant WCAG guideline using the format "See: [WCAG URL]"
- Use the specific WCAG documentation URL that corresponds to the axe violation being addressed

Violations to analyze:
${violations.map((v, i) => `
VIOLATION ${i + 1}:
- ID: ${v.id}
- Impact: ${v.impact}
- Description: ${v.description}
- Help: ${v.help}
- WCAG Guideline URL: ${v.helpUrl || 'https://dequeuniversity.com/rules/axe/'}
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
- ALWAYS end each recommendation with "See: [WCAG Guideline URL]" using the URL provided above
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
      console.log(`🔍 DEBUG: Parsed JSON response:`, jsonResponse);      if (jsonResponse.violations && Array.isArray(jsonResponse.violations)) {
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
  }/**
   * Clean markdown formatting from text
   */
  private cleanMarkdownFromText(text: string): string {
    return text
      // Only do minimal cleaning - remove markdown bold/italic but preserve structure
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Don't remove underscores - they're part of VIOLATION_ID format
      // Remove markdown headers
      .replace(/#{1,6}\s+/g, '')
      // Remove extra whitespace but preserve line structure
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }  /**
   * Format recommendation content with proper structure and code block formatting
   */
  private formatRecommendationContent(contentLines: string[], isRecommendation: boolean = false): string {
    console.log(`🔍 DEBUG formatRecommendationContent: Input lines count: ${contentLines.length}`);
    if (contentLines.length > 0) {
      console.log(`🔍 DEBUG formatRecommendationContent: First line: "${contentLines[0]}"`);
      console.log(`🔍 DEBUG formatRecommendationContent: Last line: "${contentLines[contentLines.length - 1]}"`);
    }

    const result: string[] = [];

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();      // Skip empty lines
      if (!trimmedLine) continue;

      // For recommendations, skip duplicate "Recommended:" headers
      if (isRecommendation && lowerLine === 'recommended:') {
        // Skip if we already have content (this would be a duplicate)
        if (result.length > 0) {
          continue;
        }
        // Skip the first "Recommended:" header entirely - we don't want it in the output
        continue;
      }

      // Skip Testing sections entirely
      if (lowerLine.includes('testing:')) {
        // Skip everything until next major section or end
        while (i + 1 < contentLines.length) {
          const nextLine = contentLines[i + 1]?.trim().toLowerCase();
          if (nextLine && nextLine.startsWith('see:')) {
            break;
          }
          i++;
        }
        continue;
      }

      // Skip Code Example sections entirely
      if (lowerLine.includes('code example:') || lowerLine.includes('corrected code:')) {
        // Skip everything until next major section or end
        while (i + 1 < contentLines.length) {
          const nextLine = contentLines[i + 1]?.trim().toLowerCase();
          if (nextLine && (nextLine.startsWith('see:') || nextLine.includes('recommended:'))) {
            break;
          }
          i++;
        }
        continue;
      }

      // Process regular content
      let formattedLine = trimmedLine;

      // Remove any stray backticks or HTML keywords
      formattedLine = formattedLine.replace(/`+/g, '');
      formattedLine = formattedLine.replace(/\bhtml\b/gi, '');

      // Fix duplicate "See:" patterns
      formattedLine = formattedLine.replace(/^(see:\s*)+/gi, 'See: ');

      // Add "See:" prefix to bare URLs
      if (/^https?:\/\//.test(formattedLine)) {
        formattedLine = `See: ${formattedLine}`;
      }

      // Skip lines that look like HTML code
      if (formattedLine.includes('<') && formattedLine.includes('>')) {
        continue;
      }

      formattedLine = formattedLine.replace(/\s+/g, ' ').trim();
      if (formattedLine) {
        result.push(formattedLine);
      }
    }    let finalResult = result.join('\n').trim();
    
    // Post-process to fix numbered step sequences if this is a recommendation
    if (isRecommendation && finalResult) {
      finalResult = this.fixNumberedSteps(finalResult);
    }

    console.log(`🔍 DEBUG formatRecommendationContent: Output length: ${finalResult.length}`);
    console.log(`🔍 DEBUG formatRecommendationContent: Output preview: "${finalResult.substring(0, 100)}..."`);    return finalResult;
  }

  /**
   * Fix numbered step sequences to ensure they are sequential (1, 2, 3, etc.)
   */
  private fixNumberedSteps(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let stepCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this line starts with a number followed by a period (e.g., "2. ", "4. ")
      const stepMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      
      if (stepMatch) {
        // Replace the original step number with the sequential counter
        const stepContent = stepMatch[2];
        result.push(`${stepCounter}. ${stepContent}`);
        stepCounter++;
        console.log(`🔍 DEBUG fixNumberedSteps: Renumbered step from "${trimmed}" to "${stepCounter - 1}. ${stepContent}"`);
      } else {
        // Keep non-numbered lines as-is
        result.push(line);
      }
    }

    const fixedText = result.join('\n');
    console.log(`🔍 DEBUG fixNumberedSteps: Fixed ${stepCounter - 1} numbered steps`);
    return fixedText;
  }
}

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
  ): Promise<GeminiAnalysis> {    try {
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
  ): Promise<GeminiAnalysis> {    try {
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
- Do NOT use emoji, Unicode symbols, or special characters in any output text
- Use plain ASCII text only for maximum compatibility with PDF export systems
- Each component must have a specific, non-generic name
- Issues must be actionable and specific

**SCREEN READER PRIORITY**: Every identified issue should be evaluated from the perspective of a screen reader user. Prioritize problems that would prevent, confuse, or frustrate someone using assistive technology to navigate and interact with the interface.
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
- Do NOT use emoji, Unicode symbols, or special characters in any output text
- Use plain ASCII text only for maximum compatibility with PDF export systems
- Each component must have a specific, non-generic name
- Issues must be actionable and specific

**SCREEN READER PRIORITY**: Every identified issue should be evaluated from the perspective of a screen reader user. Prioritize problems that would prevent, confuse, or frustrate someone using assistive technology to navigate and interact with the interface.
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
  }
  /**
   * Parses Gemini response into structured component-based format
   */  private parseGeminiResponse(text: string, context: { step: number }): GeminiAnalysis {
    try {      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('🔍 Full Gemini response parsed:', JSON.stringify(parsed, null, 2));
        const validComponents = this.parseComponents(parsed.components || []);
        
        // Only return analysis if we have valid components
        if (validComponents.length > 0) {
          return {
            summary: parsed.summary || 'Component analysis completed',
            components: validComponents,
            recommendations: parsed.recommendations || [],
            score: Math.max(0, Math.min(100, parsed.score || 0))
          };
        } else {
          console.warn('⚠️ Gemini analysis returned no valid components, falling back to text parsing');
        }
      } else {
        console.warn('⚠️ No JSON found in Gemini response, falling back to text parsing');
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse Gemini JSON response, using fallback:', error);
    }

    // Fallback: extract information from text or return empty analysis
    const fallbackAnalysis = this.parseTextResponse(text, context.step);
    
    // If fallback also has no components, return a minimal valid analysis
    if (!fallbackAnalysis.components || fallbackAnalysis.components.length === 0) {
      console.warn('⚠️ Both JSON and text parsing failed to extract meaningful components');
      return {
        summary: 'Analysis completed but no specific accessibility issues were identified by AI',
        components: [],
        recommendations: [
          'Review the website manually for accessibility issues',
          'Run automated accessibility tools like axe or Lighthouse',
          'Test with screen readers and keyboard navigation'
        ],
        score: 75 // Neutral score when AI can't provide specific feedback
      };
    }
    
    return fallbackAnalysis;
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
      })      .map(component => {        console.log('🔍 Processing component from Gemini:', {
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
   * Fallback text parsing when JSON parsing fails
   */
  private parseTextResponse(text: string, step: number): GeminiAnalysis {
    // Extract sections from text response
    const summaryMatch = text.match(/(?:SUMMARY|Summary):\s*([^\n\r]+)/i);
    const scoreMatch = text.match(/(?:SCORE|Score):\s*(\d+)/i);
    
    // Extract recommendations
    const recommendations: string[] = [];
    const recMatch = text.match(/(?:RECOMMENDATIONS|Recommendations):(.*?)(?:\n\n|\n[A-Z]|$)/si);
    if (recMatch) {
      const recText = recMatch[1];
      recommendations.push(...recText.split(/\n/).filter(line => line.trim()).map(line => line.trim()));
    }

    return {
      summary: summaryMatch?.[1]?.trim() || 'Component accessibility analysis completed',
      components: [], // Would need more sophisticated parsing for components
      recommendations,
      score: scoreMatch ? parseInt(scoreMatch[1]) : 50
    };  }  /**
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
      
      console.log(`Successfully parsed ${recommendations.size} recommendations from LLM`);
      
      // Ensure all violations have recommendations (fallback for unparsed ones)
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
    return `You are an accessibility expert. For each axe-core violation, provide both an explanation and specific, actionable recommendations with concrete code examples.

For each violation, respond in this exact format:

VIOLATION_ID: [violation.id]
EXPLANATION: [Clear explanation of why this is an accessibility problem and how it affects users with disabilities - focus on user impact]
RECOMMENDATION: [Start with a brief overview, then provide detailed Recommended section with specific code fixes]

CRITICAL GUIDELINES FOR RECOMMENDATIONS:
- ALWAYS examine the actual HTML provided for each violation
- Structure your RECOMMENDATION with this exact format:

  Brief overview of what needs to be fixed.
  
  Recommended:
  [Provide specific, actionable steps with code examples. If you can analyze the actual HTML context provided, give SPECIFIC code fixes with BEFORE/AFTER examples. If the HTML context is insufficient, provide general but detailed guidance with documentation links.]
  
  Code Example: (only if you have specific code to show)
  BEFORE:
  [exact problematic HTML]
  
  AFTER:
  [corrected HTML with accessibility fixes]
  
  Testing:
  [How to verify the fix works with screen readers/accessibility tools]

- For aria-label issues, suggest meaningful labels based on the element's purpose and surrounding context
- For heading hierarchy problems, specify the exact heading level change needed (h3 to h2, etc.)
- For form elements, suggest appropriate label associations using the actual element structure
- When providing documentation links, put them on separate lines after "See:"
- Make the "Recommended" section actionable and specific, not generic advice

FORMATTING RULES:
- Use plain text only, NO markdown formatting
- Use the exact section headers: "Recommended:", "Code Example:", "Testing:"
- Use simple numbered lists (1. 2. 3.) for multi-step instructions within sections
- Put documentation links on separate lines after "See:"
- Be very specific with code examples - show exactly what HTML/attributes to change

Generate practical, implementable solutions with actual code that developers can copy and apply immediately.

Violations to analyze:
${violations.map((v, i) => `
VIOLATION ${i + 1}:
- ID: ${v.id}
- Impact: ${v.impact}
- Description: ${v.description}
- Help: ${v.help}
- HTML Sample: ${v.nodes?.[0]?.html || 'Not available'}
- Selector: ${Array.isArray(v.nodes?.[0]?.target) ? v.nodes[0].target.join(' > ') : v.nodes?.[0]?.target || 'Not available'}
- Failure Details: ${v.nodes?.[0]?.failureSummary || 'Not available'}
`).join('\n')}

Remember: 
- Use the actual HTML context to provide SPECIFIC code suggestions in the "Recommended" section
- If you see specific text or context clues, incorporate them into your recommendations
- For aria-label suggestions, make them descriptive and meaningful based on the element's context
- Always include a "Recommended:" section with concrete steps
- Give concrete BEFORE/AFTER code examples when possible
- Make explanations user-impact focused (how this affects people with disabilities)
- Provide implementable solutions in the "Recommended" section, not just general advice`;
  }

  /**
   * Parse axe recommendations from LLM response and clean up formatting
   */
  private parseAxeRecommendations(text: string, violations: any[]): Map<string, { explanation: string; recommendation: string }> {
    const results = new Map<string, { explanation: string; recommendation: string }>();
    
    // Clean up the response text first
    const cleanText = this.cleanMarkdownFromText(text);
    
    // Try to parse structured format
    const violationBlocks = cleanText.split(/VIOLATION_ID:\s*/i);
    
    violationBlocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        const idLine = lines[0].trim();
        const explanationIndex = lines.findIndex(line => line.toLowerCase().includes('explanation:'));
        const recIndex = lines.findIndex(line => line.toLowerCase().includes('recommendation:'));
        
        if (explanationIndex >= 0 && recIndex >= 0) {
          const explanationLines = lines.slice(explanationIndex + 1, recIndex);
          const recommendationLines = lines.slice(recIndex + 1);
          
          const explanation = this.formatRecommendationContent(explanationLines);
          const recommendation = this.formatRecommendationContent(recommendationLines);
          
          // Find matching violation
          const violation = violations.find(v => idLine.includes(v.id));
          if (violation && explanation && recommendation) {
            results.set(violation.id, { explanation, recommendation });
          }
        }
      }
    });
      // Fallback: if parsing failed, generate basic explanations and recommendations
    if (results.size === 0) {
      console.warn(`⚠️ LLM parsing completely failed, using fallback explanations for ${violations.length} violations`);
      violations.forEach(violation => {
        results.set(violation.id, {
          explanation: `This accessibility violation affects users with disabilities. ${violation.description} This can prevent proper access to content and functionality for people using assistive technologies.`,
          recommendation: `${violation.help}

See: ${violation.helpUrl}`
        });
      });
    }
    
    return results;
  }

  /**
   * Clean markdown formatting from text
   */
  private cleanMarkdownFromText(text: string): string {
    return text
      // Remove markdown bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove markdown headers
      .replace(/#{1,6}\s+/g, '')
      // Clean up backticks but preserve code blocks
      .replace(/`([^`]+)`/g, '$1')
      // Remove extra whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Format recommendation content with proper structure
   */
  private formatRecommendationContent(contentLines: string[]): string {
    const result: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    
    for (const line of contentLines) {
      const trimmedLine = line.trim();
      
      // Check for code example section
      if (trimmedLine.toLowerCase().includes('code example:')) {
        if (codeLines.length > 0) {
          result.push('\n' + codeLines.join('\n') + '\n');
          codeLines = [];
        }
        result.push('\nCode Example:');
        inCodeBlock = true;
        continue;
      }
      
      // Check for testing section
      if (trimmedLine.toLowerCase().includes('testing:')) {
        if (codeLines.length > 0) {
          result.push('\n' + codeLines.join('\n') + '\n');
          codeLines = [];
        }
        result.push('\nTesting:');
        inCodeBlock = false;
        continue;
      }
      
      // Handle content based on current mode
      if (inCodeBlock && trimmedLine && !trimmedLine.match(/^\d+\./)) {
        // This looks like code
        codeLines.push(trimmedLine);
      } else {
        // Add any pending code block
        if (codeLines.length > 0) {
          result.push('\n' + codeLines.join('\n') + '\n');
          codeLines = [];
          inCodeBlock = false;
        }
        
        // Add regular content
        if (trimmedLine) {
          result.push(trimmedLine);
        }
      }
    }
    
    // Add any remaining code
    if (codeLines.length > 0) {
      result.push('\n' + codeLines.join('\n') + '\n');
    }
    
    return result.join('\n').trim();
  }
}

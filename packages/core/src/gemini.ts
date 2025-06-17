/**
 * Gemini AI service for accessibility analysis
 * Integrates with Google Gemini API to provide intelligent accessibility insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis, ComponentAccessibilityIssue } from './types.js';

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

      return this.parseGeminiResponse(text, context);
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
      const text = response.text();      return this.parseGeminiResponse(text, { step: context.totalSteps });

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
Your task is to analyze the provided DOM snapshot(s) and the corresponding Axe Accessibility Report. The goal is to identify and report accessibility issues in the implementation of specific interactive components, with a focus on screen reader and accessibility requirements.

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

**Analysis Instructions:**

1. **Identify Relevant Components**: Scan the provided DOM snapshot(s) to locate instances of interactive components:
   - Expandable/Collapsible Content
   - Dropdown Menus
   - Tab Panels  
   - Modal Dialogs
   - Autocomplete/Suggestion Lists
   - Error Handling
   - Dynamic Content Updates
   - Keyboard Navigation indicators
   - Carousels/Sliders
   - Tree Views
   - Data Tables
   - Sortable Tables
   - Tooltips/Popovers
   - Context Menus
   - Validation Messages
   - Live Regions

2. **Analyze Component Implementation**: For each identified component, examine its HTML structure and accessibility attributes (aria-expanded, role, aria-controls, aria-selected, aria-hidden, aria-live, aria-invalid, aria-describedby, aria-labelledby, aria-sort, etc.).

${hasBeforeAfter ? `3. **Compare States**: Since both before and after snapshots are provided, analyze how attributes/structure change during interaction. Identify if attributes fail to update correctly between states.` : `3. **Single State Analysis**: Analyze the component's implementation in the current state for correct roles, states, and properties.`}

4. **Identify Accessibility Issues**: Determine if components exhibit accessibility problems including:
   - Missing required roles, states, or properties
   - Incorrect or inappropriate usage of attributes
   - Failure of attributes to update correctly between states (if applicable)
   - Relevant Axe violations

**Output Format:**
Respond with a JSON object:
{
  "summary": "Brief overview of accessibility status",
  "components": [
    {
      "componentName": "Component Type (e.g., Dropdown Menu)",
      "issue": "Clearly state the problem",
      "explanation": "Briefly explain the accessibility rule violated",
      "relevantHtml": "Show relevant HTML snippet demonstrating the issue",
      "correctedCode": "Show corrected HTML that resolves the issue",
      "codeChangeSummary": "Brief description of the fix",
      "impact": "critical|serious|moderate|minor",
      "wcagRule": "WCAG rule reference"
    }
  ],
  "recommendations": ["actionable recommendations"],
  "score": 0-100
}

**Important**: Report ONLY components with identified accessibility issues. Do not report on components where no accessibility issue was found. Focus on actionable insights and practical fixes for screen reader compatibility.
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
Your task is to analyze a complete user interaction flow consisting of ${context.totalSteps} steps captured during accessibility testing. Each step represents a user action and the resulting DOM state, with parent-child relationships indicating interaction branching (e.g., modals, sub-flows).

**Session Context:**
- URL: ${context.url}
- Session ID: ${context.sessionId}
- Total Steps: ${context.totalSteps}
- Flow Groups: ${Object.keys(flowGroups).join(', ')}

**Interaction Flow Analysis:**

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

1. **Flow Relationship Analysis**: 
   - Examine parent-child relationships between steps
   - Identify main flow vs. sub-flows (modals, forms, navigation)
   - Assess how state changes cascade through related steps

2. **Component Accessibility Assessment**:
   - Focus on interactive components across the flow
   - Analyze state management (expanded/collapsed, selected/unselected, etc.)
   - Evaluate keyboard navigation and focus management
   - Check ARIA attributes and role consistency

3. **Before/After State Comparison**:
   - Compare DOM states between related steps
   - Identify missing or incorrect attribute updates
   - Assess dynamic content announcements

4. **Flow-Specific Issues**:
   - Modal flows: Focus management, escape handling, backdrop behavior
   - Form flows: Validation, error states, progress indication
   - Navigation flows: Landmarks, headings, breadcrumbs

**Output Format:**
Respond with a JSON object with this exact structure:
{
  "summary": "Overview of accessibility findings across the interaction flow",
  "components": [
    {
      "componentName": "Specific component name (e.g., Search Button, Navigation Menu)",
      "issue": "Clear description of the accessibility issue",
      "explanation": "Detailed explanation of why this is a problem",
      "relevantHtml": "Key HTML snippet showing the issue",
      "correctedCode": "Fixed HTML with proper accessibility attributes",
      "codeChangeSummary": "Brief summary of the fix",
      "impact": "critical|serious|moderate|minor",
      "wcagRule": "WCAG 2.1 guideline reference (e.g., 1.3.1 Info and Relationships)"
    }
  ],
  "recommendations": [
    "Overall accessibility improvements for the interaction flow"
  ],
  "score": 75
}

**Requirements:**
- Each component must have a specific, non-generic name
- Issues must be actionable and specific
- Provide concrete HTML fixes when possible
- Focus on real accessibility barriers found in the captured snapshots
- If no significant issues are found, return an empty components array

Focus on actionable issues that can be addressed by developers, prioritizing critical accessibility barriers.
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
  }

  /**
   * Truncates HTML content for analysis while preserving important accessibility attributes
   */
  private truncateHtml(html: string): string {
    // Keep HTML under 50KB for API limits, preserve accessibility attributes
    const maxLength = 50000;
    if (html.length <= maxLength) return html;

    // Try to truncate at element boundaries
    const truncated = html.substring(0, maxLength);
    const lastTag = truncated.lastIndexOf('<');
    return lastTag > maxLength - 1000 ? truncated.substring(0, lastTag) : truncated;
  }
  /**
   * Parses Gemini response into structured component-based format
   */  private parseGeminiResponse(text: string, context: { step: number }): GeminiAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
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
      })
      .map(component => ({
        componentName: component.componentName.trim(),
        issue: component.issue.trim(),
        explanation: component.explanation?.trim() || 'No detailed explanation provided',
        relevantHtml: component.relevantHtml || '',
        correctedCode: component.correctedCode || '',
        codeChangeSummary: component.codeChangeSummary || '',
        impact: ['critical', 'serious', 'moderate', 'minor'].includes(component.impact) 
          ? component.impact : 'moderate',
        wcagRule: component.wcagRule && component.wcagRule !== 'unknown' 
          ? component.wcagRule : 'General Accessibility'
      }));
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
    };
  }
}

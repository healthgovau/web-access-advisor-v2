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
  }
  /**
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
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text, context);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   */
  private parseGeminiResponse(text: string, context: { step: number }): GeminiAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Component analysis completed',
          components: this.parseComponents(parsed.components || []),
          recommendations: parsed.recommendations || [],
          score: Math.max(0, Math.min(100, parsed.score || 0))
        };
      }
    } catch (error) {
      console.warn('Failed to parse Gemini JSON response, using fallback:', error);
    }

    // Fallback: extract information from text
    return this.parseTextResponse(text, context.step);
  }

  /**
   * Validates and formats component accessibility issues
   */
  private parseComponents(components: any[]): ComponentAccessibilityIssue[] {
    return components.map(component => ({
      componentName: component.componentName || 'Unknown Component',
      issue: component.issue || 'No issue description provided',
      explanation: component.explanation || 'No explanation provided',
      relevantHtml: component.relevantHtml || '',
      correctedCode: component.correctedCode || '',
      codeChangeSummary: component.codeChangeSummary || '',
      impact: ['critical', 'serious', 'moderate', 'minor'].includes(component.impact) 
        ? component.impact : 'moderate',
      wcagRule: component.wcagRule || 'unknown'
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

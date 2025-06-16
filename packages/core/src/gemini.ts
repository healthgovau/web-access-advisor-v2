/**
 * Gemini AI service for accessibility analysis
 * Integrates with Google Gemini API to provide intelligent accessibility insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis, AccessibilityIssue } from './types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName = "gemini-2.0-flash";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Analyzes accessibility issues using Gemini AI
   * 
   * @param htmlContent - The HTML content to analyze
   * @param axeResults - Results from axe accessibility testing  
   * @param context - Additional context about the page/interaction
   * @returns Structured accessibility analysis
   */
  async analyzeAccessibility(
    htmlContent: string,
    axeResults: any[],
    context: {
      url: string;
      action: string;
      step: number;
    }
  ): Promise<GeminiAnalysis> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = this.buildAnalysisPrompt(htmlContent, axeResults, context);
      
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
   * Builds a comprehensive prompt for Gemini analysis
   */
  private buildAnalysisPrompt(
    htmlContent: string, 
    axeResults: any[], 
    context: { url: string; action: string; step: number }
  ): string {
    return `
You are an accessibility expert analyzing a web page for WCAG 2.1 AA compliance.

**Context:**
- URL: ${context.url}
- User Action: ${context.action} 
- Analysis Step: ${context.step}

**HTML Content (truncated for analysis):**
${this.truncateHtml(htmlContent)}

**Axe-core Accessibility Issues:**
${JSON.stringify(axeResults, null, 2)}

**Analysis Required:**
Please provide a structured accessibility analysis with:

1. **SUMMARY**: Brief overview of accessibility status (2-3 sentences)

2. **ISSUES**: List specific accessibility problems found, each with:
   - Type: error/warning/info
   - Rule: WCAG rule violated  
   - Description: Clear explanation of the issue
   - Impact: critical/serious/moderate/minor
   - Target: CSS selector or element description
   - Step: ${context.step}

3. **RECOMMENDATIONS**: 3-5 actionable recommendations for improvement

4. **SCORE**: Overall accessibility score (0-100, where 100 is perfect)

**Output Format:**
Respond with a JSON object matching this structure:
{
  "summary": "string",
  "issues": [
    {
      "type": "error|warning|info",
      "rule": "wcag-rule-name", 
      "description": "explanation",
      "impact": "critical|serious|moderate|minor",
      "target": "css-selector",
      "step": ${context.step}
    }
  ],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "score": number
}

Focus on actionable insights and practical fixes. Prioritize critical and serious issues.
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
   * Parses Gemini response into structured format
   */
  private parseGeminiResponse(text: string, context: { step: number }): GeminiAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Analysis completed',
          issues: this.parseIssues(parsed.issues || [], context.step),
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
   * Validates and formats accessibility issues
   */
  private parseIssues(issues: any[], step: number): AccessibilityIssue[] {
    return issues.map(issue => ({
      type: ['error', 'warning', 'info'].includes(issue.type) ? issue.type : 'warning',
      rule: issue.rule || 'unknown',
      description: issue.description || 'No description provided',
      impact: ['critical', 'serious', 'moderate', 'minor'].includes(issue.impact) 
        ? issue.impact : 'moderate',
      target: issue.target || 'unknown',
      step: step
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
      summary: summaryMatch?.[1]?.trim() || 'Accessibility analysis completed',
      issues: [], // Would need more sophisticated parsing for issues
      recommendations,
      score: scoreMatch ? parseInt(scoreMatch[1]) : 50
    };
  }
}

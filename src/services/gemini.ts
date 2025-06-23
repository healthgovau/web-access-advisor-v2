/**
 * Gemini service for accessibility analysis
 * Handles communication with Google Gemini API for analyzing accessibility issues
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiAnalysis } from '../types/index.ts';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const modelName = "gemini-2.0-flash"; // Updated to the latest model

/**
 * Analyzes accessibility issues using Gemini
 * 
 * @param htmlContent - The HTML content to analyze
 * @param axeResults - Results from axe accessibility testing
 * @returns Analysis results from Gemini
 */
export const analyzeAccessibility = async (
  htmlContent: string, 
  axeResults: any[]
): Promise<GeminiAnalysis> => {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Only analyze and reference the HTML, code, and data provided in this prompt. Do not use any prior knowledge, assumptions, or information not present in the supplied code. Do not reference elements, attributes, or issues unless they are explicitly present in the provided input.

Analyze this web page for accessibility issues:

HTML Content:
${htmlContent}

Axe-core Results:
${JSON.stringify(axeResults, null, 2)}

Please provide:
1. Summary of accessibility issues
2. Priority recommendations
3. Specific fixes for each issue
4. WCAG compliance assessment

Format your response as a structured analysis with clear sections.
`;    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response into structured format
    // TODO: Parse Gemini response into structured AccessibilityIssue format
    return {
      summary: text,
      components: [], // Placeholder, should be parsed from Gemini response
      recommendations: [],
      score: 0
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown Gemini API error');
  }
};
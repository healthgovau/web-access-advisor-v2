/**
 * Gemini service for accessibility analysis
 * Handles communication with Google Gemini API for analyzing accessibility issues
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);
const modelName = "gemini-2.0-flash"; // Updated to the latest model

/**
 * Analyzes accessibility issues using Gemini
 * 
 * @param {string} htmlContent - The HTML content to analyze
 * @param {Array} axeResults - Results from axe accessibility testing
 * @returns {Promise<Object>} Analysis results from Gemini
 */
export const analyzeAccessibility = async (htmlContent, axeResults) => {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
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
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      analysis: text,
      model: modelName
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
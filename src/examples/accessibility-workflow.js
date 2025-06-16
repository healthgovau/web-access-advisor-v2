/**
 * Example usage of auto-playwright + OpenAI services together
 * This shows the complete accessibility testing workflow
 */

import { test, expect } from '@playwright/test';
import { 
  navigateToPage, 
  performAction, 
  queryPage, 
  runAccessibilityWorkflow 
} from '../services/playwright.js';
import { analyzeAccessibility } from '../services/gemini.js';
import { runAxeTest } from '../services/axe.js'; // We'll need to create this

test.describe('Accessibility Testing Workflow', () => {
  
  test('Complete accessibility analysis', async ({ page }) => {
    const url = 'https://example.com';
    
    // Step 1: Use auto-playwright to navigate and interact
    const navigation = await navigateToPage(page, test, url);
    expect(navigation.success).toBe(true);
    
    // Step 2: Use auto-playwright to run basic accessibility checks
    const basicChecks = await runAccessibilityWorkflow(page, test, url);
    console.log('Basic accessibility checks:', basicChecks);
    
    // Step 3: Run axe-core for detailed accessibility testing
    const axeResults = await runAxeTest(page);
    
    // Step 4: Get page HTML for analysis
    const htmlContent = await page.content();
    
    // Step 5: Use OpenAI to analyze results and provide recommendations
    const aiAnalysis = await analyzeAccessibility(htmlContent, axeResults);
    
    console.log('AI Analysis:', aiAnalysis.analysis);
    
    // Step 6: Use auto-playwright to test specific interactions
    await performAction(page, test, "Click the search button if it exists");
    await queryPage(page, test, "What is the color contrast of the main text?");
    
    // Combine all results
    const report = {
      url,
      timestamp: new Date().toISOString(),
      basicChecks: basicChecks.checks,
      axeResults,
      aiAnalysis: aiAnalysis.analysis,
      pageInfo: basicChecks.info
    };
    
    console.log('Complete Accessibility Report:', report);
  });
  
  test('Interactive accessibility testing', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Use auto-playwright for natural language interactions
    await performAction(page, test, "Fill in the search box with 'accessibility'");
    await performAction(page, test, "Press Enter to search");
    
    // Check if results are accessible
    const searchResultsAccessible = await queryPage(
      page, 
      test, 
      "Are the search results properly structured with headings and landmarks?"
    );
    
    expect(searchResultsAccessible).toBeTruthy();
  });
  
});

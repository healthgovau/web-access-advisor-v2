/**
 * Auto-Playwright service for browser automation
 * Uses AI to interact with web pages through natural language commands
 */

import { auto } from 'auto-playwright';

/**
 * Navigate to a URL and perform automated accessibility testing
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} test - Playwright test object (optional)
 * @param {string} url - URL to navigate to
 * @returns {Promise<Object>} Navigation result
 */
export const navigateToPage = async (page, test, url) => {
  try {
    await page.goto(url);
    
    // Use auto-playwright to verify page loaded
    const pageTitle = await auto("Get the page title", { page, test });
    
    return {
      success: true,
      title: pageTitle,
      url: page.url()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Use AI to interact with page elements
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} test - Playwright test object (optional)
 * @param {string} instruction - Natural language instruction for auto-playwright
 * @returns {Promise<Object>} Action result
 */
export const performAction = async (page, test, instruction) => {
  try {
    const result = await auto(instruction, { page, test });
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Query page content using natural language
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} test - Playwright test object (optional)
 * @param {string} query - Natural language query
 * @returns {Promise<Object>} Query result
 */
export const queryPage = async (page, test, query) => {
  try {
    const result = await auto(query, { page, test });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check page state using natural language assertions
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} test - Playwright test object (optional)
 * @param {string} assertion - Natural language assertion
 * @returns {Promise<Object>} Assertion result (true/false)
 */
export const checkPageState = async (page, test, assertion) => {
  try {
    const result = await auto(assertion, { page, test });
    
    return {
      success: true,
      isTrue: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Example accessibility testing workflow using auto-playwright
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} test - Playwright test object (optional)
 * @param {string} url - URL to test
 * @returns {Promise<Object>} Accessibility test results
 */
export const runAccessibilityWorkflow = async (page, test, url) => {
  try {
    // Navigate to page
    await auto(`Go to ${url}`, { page, test });
    
    // Check for common accessibility issues using natural language
    const hasHeadings = await auto("Are there proper heading elements (h1, h2, etc.) on this page?", { page, test });
    const hasAltText = await auto("Do all images have alt text?", { page, test });
    const hasLabels = await auto("Do all form inputs have proper labels?", { page, test });
    const hasSkipLinks = await auto("Is there a skip to main content link?", { page, test });
    
    // Get page structure info
    const mainHeading = await auto("What is the main heading (h1) of this page?", { page, test });
    const formCount = await auto("How many forms are on this page?", { page, test });
    
    return {
      success: true,
      checks: {
        hasHeadings,
        hasAltText,
        hasLabels,
        hasSkipLinks
      },
      info: {
        mainHeading,
        formCount,
        url: page.url()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

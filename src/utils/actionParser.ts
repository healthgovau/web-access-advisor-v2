/**
 * Action parser utility - converts recorded actions to structured format
 * Handles parsing and validation of action data
 */

/**
 * Parse raw recorded action into structured format
 * 
 * @param {Object} rawAction - Raw action from recording
 * @returns {Object} Parsed and validated action
 */
export const parseAction = (rawAction) => {
  try {
    const baseAction = {
      type: rawAction.type || 'unknown',
      timestamp: rawAction.timestamp || new Date().toISOString(),
      selector: rawAction.selector || null,
      value: rawAction.value || null,
      url: rawAction.url || null,
      position: rawAction.position || null
    };

    // Validate and normalize based on action type
    switch (baseAction.type) {
      case 'navigate':
        return parseNavigateAction(baseAction);
      case 'click':
        return parseClickAction(baseAction);
      case 'fill':
        return parseFillAction(baseAction);
      case 'select':
        return parseSelectAction(baseAction);
      case 'scroll':
        return parseScrollAction(baseAction);
      case 'hover':
        return parseHoverAction(baseAction);
      default:
        return parseGenericAction(baseAction);
    }
  } catch (error) {
    console.error('Failed to parse action:', error);
    return createErrorAction(rawAction, error);
  }
};

/**
 * Parse navigation action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed navigation action
 */
const parseNavigateAction = (action) => {
  if (!action.url) {
    throw new Error('Navigate action missing URL');
  }

  return {
    ...action,
    type: 'navigate',
    description: `Navigate to ${action.url}`,
    validation: {
      isValid: isValidUrl(action.url),
      errors: []
    }
  };
};

/**
 * Parse click action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed click action
 */
const parseClickAction = (action) => {
  const errors = [];
  
  if (!action.selector) {
    errors.push('Click action missing selector');
  }

  return {
    ...action,
    type: 'click',
    description: `Click ${action.selector || 'unknown element'}`,
    elementType: inferElementType(action.selector),
    interaction: categorizeClickInteraction(action.selector),
    validation: {
      isValid: errors.length === 0,
      errors
    }
  };
};

/**
 * Parse fill action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed fill action
 */
const parseFillAction = (action) => {
  const errors = [];
  
  if (!action.selector) {
    errors.push('Fill action missing selector');
  }
  
  if (action.value === null || action.value === undefined) {
    errors.push('Fill action missing value');
  }

  return {
    ...action,
    type: 'fill',
    description: `Fill "${action.value}" in ${action.selector || 'unknown field'}`,
    fieldType: inferFieldType(action.selector),
    valueLength: String(action.value || '').length,
    validation: {
      isValid: errors.length === 0,
      errors,
      isSensitive: isSensitiveField(action.selector)
    }
  };
};

/**
 * Parse select action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed select action
 */
const parseSelectAction = (action) => {
  const errors = [];
  
  if (!action.selector) {
    errors.push('Select action missing selector');
  }
  
  if (!action.value) {
    errors.push('Select action missing value');
  }

  return {
    ...action,
    type: 'select',
    description: `Select "${action.value}" in ${action.selector || 'unknown dropdown'}`,
    optionValue: action.value,
    validation: {
      isValid: errors.length === 0,
      errors
    }
  };
};

/**
 * Parse scroll action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed scroll action
 */
const parseScrollAction = (action) => {
  const position = action.position || { x: 0, y: 0 };
  
  return {
    ...action,
    type: 'scroll',
    description: `Scroll to position (${position.x}, ${position.y})`,
    position: position,
    scrollDistance: calculateScrollDistance(position),
    validation: {
      isValid: true,
      errors: []
    }
  };
};

/**
 * Parse hover action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed hover action
 */
const parseHoverAction = (action) => {
  const errors = [];
  
  if (!action.selector) {
    errors.push('Hover action missing selector');
  }

  return {
    ...action,
    type: 'hover',
    description: `Hover over ${action.selector || 'unknown element'}`,
    elementType: inferElementType(action.selector),
    validation: {
      isValid: errors.length === 0,
      errors
    }
  };
};

/**
 * Parse generic/unknown action
 * 
 * @param {Object} action - Base action
 * @returns {Object} Parsed generic action
 */
const parseGenericAction = (action) => {
  return {
    ...action,
    description: `${action.type} action`,
    validation: {
      isValid: false,
      errors: [`Unknown action type: ${action.type}`]
    }
  };
};

/**
 * Create error action for parsing failures
 * 
 * @param {Object} rawAction - Original raw action
 * @param {Error} error - Parse error
 * @returns {Object} Error action
 */
const createErrorAction = (rawAction, error) => {
  return {
    type: 'error',
    timestamp: new Date().toISOString(),
    selector: null,
    value: null,
    description: `Parse error: ${error.message}`,
    originalAction: rawAction,
    validation: {
      isValid: false,
      errors: [error.message]
    }
  };
};

/**
 * Validate action sequence for consistency
 * 
 * @param {Array} actions - Array of parsed actions
 * @returns {Object} Validation result
 */
export const validateActionSequence = (actions) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      isValid: false,
      errors: ['Action sequence is empty or invalid'],
      warnings: []
    };
  }

  // Check for required navigation start
  if (actions[0].type !== 'navigate') {
    warnings.push('Action sequence should typically start with navigation');
  }

  // Check for logical flow issues
  for (let i = 1; i < actions.length; i++) {
    const current = actions[i];
    const previous = actions[i - 1];

    // Check for timestamp ordering
    if (new Date(current.timestamp) < new Date(previous.timestamp)) {
      errors.push(`Action ${i + 1} has timestamp before previous action`);
    }

    // Check for logical consistency
    if (current.type === 'fill' && !current.selector) {
      errors.push(`Fill action ${i + 1} missing target selector`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    actionCount: actions.length,
    timeSpan: calculateTimeSpan(actions)
  };
};

/**
 * Convert actions to Playwright script format
 * 
 * @param {Array} actions - Parsed actions
 * @param {Object} options - Conversion options
 * @returns {string} Playwright script
 */
export const actionsToPlaywrightScript = (actions: any[], options: any = {}) => {
  const { includeComments = true, includeWaits = true } = options as any;

  let script = '';
  
  if (includeComments) {
    script += '// Generated Playwright script from recorded actions\n';
    script += `// Total actions: ${actions.length}\n`;
    script += `// Generated: ${new Date().toISOString()}\n\n`;
  }

  script += 'const { test, expect } = require("@playwright/test");\n\n';
  script += 'test("recorded accessibility test", async ({ page }) => {\n';

  actions.forEach((action, index) => {
    if (includeComments) {
      script += `  // Step ${index + 1}: ${action.description}\n`;
    }

    switch (action.type) {
      case 'navigate':
        script += `  await page.goto("${action.url}");\n`;
        break;
      case 'click':
        script += `  await page.click("${action.selector}");\n`;
        break;
      case 'fill':
        script += `  await page.fill("${action.selector}", "${escapeString(action.value)}");\n`;
        break;
      case 'select':
        script += `  await page.selectOption("${action.selector}", "${action.value}");\n`;
        break;
      case 'scroll':
        const pos = action.position;
        script += `  await page.evaluate(() => window.scrollTo(${pos.x}, ${pos.y}));\n`;
        break;
      case 'hover':
        script += `  await page.hover("${action.selector}");\n`;
        break;
    }

    if (includeWaits && action.type !== 'scroll') {
      script += '  await page.waitForLoadState("networkidle");\n';
    }

    script += '\n';
  });

  script += '});\n';
  return script;
};

/**
 * Helper functions
 */

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const inferElementType = (selector) => {
  if (!selector) return 'unknown';
  
  if (selector.includes('button') || selector.includes('btn')) return 'button';
  if (selector.includes('input')) return 'input';
  if (selector.includes('select')) return 'select';
  if (selector.includes('textarea')) return 'textarea';
  if (selector.includes('a') || selector.includes('link')) return 'link';
  if (selector.includes('modal') || selector.includes('dialog')) return 'modal';
  
  return 'element';
};

const inferFieldType = (selector) => {
  if (!selector) return 'unknown';
  
  if (selector.includes('email')) return 'email';
  if (selector.includes('password')) return 'password';
  if (selector.includes('name')) return 'name';
  if (selector.includes('phone')) return 'phone';
  if (selector.includes('address')) return 'address';
  if (selector.includes('search')) return 'search';
  
  return 'text';
};

const isSensitiveField = (selector) => {
  if (!selector) return false;
  
  const sensitiveKeywords = ['password', 'ssn', 'credit', 'card', 'cvv', 'pin'];
  return sensitiveKeywords.some(keyword => 
    selector.toLowerCase().includes(keyword)
  );
};

const categorizeClickInteraction = (selector) => {
  if (!selector) return 'unknown';
  
  if (selector.includes('submit') || selector.includes('send')) return 'submit';
  if (selector.includes('cancel') || selector.includes('close')) return 'cancel';
  if (selector.includes('modal') || selector.includes('popup')) return 'modal';
  if (selector.includes('menu') || selector.includes('nav')) return 'navigation';
  
  return 'interaction';
};

const calculateScrollDistance = (position) => {
  return Math.sqrt(position.x * position.x + position.y * position.y);
};

const calculateTimeSpan = (actions) => {
  if (actions.length < 2) return 0;
  
  const start = new Date(actions[0].timestamp).getTime();
  const end = new Date(actions[actions.length - 1].timestamp).getTime();

  return end - start;
};

const escapeString = (str) => {
  return String(str).replace(/"/g, '\\"').replace(/\n/g, '\\n');
};

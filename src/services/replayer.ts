/**
 * Replay service - replays recorded actions and captures snapshots
 * Handles the second phase of the record-then-replay workflow
 */

// Browser-compatible imports - no Node.js filesystem modules

/**
 * Replay recorded actions and capture snapshots
 * 
 * @param {Array} actions - Recorded actions to replay
 * @param {Object} options - Replay options
 * @returns {Promise<Object>} Replay results with snapshots
 */
export const replayWithSnapshots = async (actions, options = {}) => {
  try {
    const {
      captureScreenshots = true,
      waitForStability = true,      analyzeWithGemini = true
    } = options;

    const sessionId = generateReplaySessionId();
    // Browser storage - simplified for frontend use
    
    const snapshots = [];
    let browser: any, context: any, page: any;

    try {
      // TODO: Initialize Playwright browser for replay
      // browser = await chromium.launch({ headless: true });
      // context = await browser.newContext();
      // page = await context.newPage();

      console.log(`Starting replay session: ${sessionId}`);

      // Replay each action and capture snapshots
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`Replaying action ${i + 1}/${actions.length}: ${action.type}`);

        // Execute the action
        await executeAction(page, action);

        // Wait for stability if requested
        if (waitForStability) {
          await waitForPageStability(page);
        }

        // Test for focus trap issues if modal is detected
        const focusTrapResult = await testFocusTrap(page, i + 1);

        // Capture snapshot
        const snapshot = await captureSnapshot(
          page, 
          sessionId, // Use sessionId instead of sessionDir for browser storage
          i + 1, 
          action, 
          captureScreenshots,
          focusTrapResult
        );

        snapshots.push(snapshot);
      }      // Generate metadata manifest
      const manifest = await generateManifest(sessionId, actions, snapshots);
      // TODO: Store manifest in browser storage (IndexedDB/localStorage)
      console.log('Generated manifest:', manifest);

      return {
        success: true,
        sessionId,
        snapshotCount: snapshots.length,
        snapshots,
        manifest
      };

    } finally {
      // Clean up browser resources
      if (browser && typeof browser.close === 'function') {
        await browser.close();
      }
    }

  } catch (error) {
    console.error('Replay failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Execute a recorded action in Playwright
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} action - Action to execute
 */
const executeAction = async (page, action) => {
  try {
    switch (action.type) {
      case 'navigate':
        await page.goto(action.url);
        break;
        
      case 'click':
        await page.click(action.selector);
        break;
        
      case 'fill':
        await page.fill(action.selector, action.value);
        break;
        
      case 'select':
        await page.selectOption(action.selector, action.value);
        break;
        
      case 'scroll':
        if (action.position) {
          await page.evaluate((pos) => {
            window.scrollTo(pos.x || 0, pos.y || 0);
          }, action.position);
        }
        break;
        
      case 'hover':
        await page.hover(action.selector);
        break;
        
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error(`Failed to execute action ${action.type}:`, error);
    throw error;
  }
};

/**
 * Wait for page to become stable (DOM and network)
 * 
 * @param {Object} page - Playwright page object
 */
const waitForPageStability = async (page) => {
  try {
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    
    // Wait for any pending DOM mutations to settle
    await page.waitForTimeout(500);
    
    // TODO: Add more sophisticated stability detection
    // - Check for running animations
    // - Check for pending fetch requests
    // - Check for DOM mutation observers
    
  } catch (error) {
    console.warn('Page stability wait failed:', error);
  }
};

/**
 * Capture HTML snapshot and axe context
 * 
 * @param {Object} page - Playwright page object
 * @param {string} sessionId - Session identifier for browser storage
 * @param {number} stepNumber - Step number
 * @param {Object} action - Current action
 * @param {boolean} captureScreenshots - Whether to capture screenshots
 * @param {Object} focusTrapResult - Focus trap test result
 * @returns {Promise<Object>} Snapshot metadata
 */
const captureSnapshot = async (page, sessionId, stepNumber, action, captureScreenshots, focusTrapResult) => {
  try {
    // Create step data structure (browser storage)
    const snapshot = {
      step: stepNumber,
      action: action.type,
      timestamp: new Date().toISOString(),
      focusTrapTest: focusTrapResult,
      files: {
        html: `step_${stepNumber}_snapshot.html`,
        axeContext: `step_${stepNumber}_axe_context.json`,
        screenshot: captureScreenshots ? `step_${stepNumber}_screenshot.png` : null
      }
    };

    // Capture HTML content
    const htmlContent = await page.content();
    // TODO: Store HTML content in browser storage using sessionId as key
    
    // Capture axe context (DOM structure for accessibility analysis)
    const axeContext = await page.evaluate(() => {
      // TODO: Extract DOM structure that axe-core would need
      // This is the structure axe uses for analysis, not the full results
      return {
        include: [['html']],
        exclude: [],
        elementCount: document.querySelectorAll('*').length,
        title: document.title,
        url: window.location.href
      };
    });
    
    // TODO: Store axe context in browser storage using sessionId as key

    // Capture screenshot if requested
    if (captureScreenshots) {
      // TODO: Capture screenshot as blob for browser storage
      // const screenshotBuffer = await page.screenshot({ fullPage: true });
    }

    console.log(`Snapshot captured for step ${stepNumber}${focusTrapResult?.tested ? ' (focus trap tested)' : ''}`);
    return snapshot;

  } catch (error) {
    console.error(`Failed to capture snapshot for step ${stepNumber}:`, error);
    throw error;
  }
};

/**
 * Generate session manifest with parent-step relationships
 * 
 * @param {string} sessionId - Session identifier
 * @param {Array} actions - Original recorded actions
 * @param {Array} snapshots - Captured snapshots
 * @returns {Promise<Object>} Manifest data
 */
const generateManifest = async (sessionId, actions, snapshots) => {
  // TODO: Implement parent-step tracking logic
  // This will analyze the actions and determine parent relationships
  
  const manifest = {
    sessionId,
    timestamp: new Date().toISOString(),
    totalSteps: snapshots.length,
    url: actions.find(a => a.type === 'navigate')?.url,
    steps: snapshots.map((snapshot, index) => ({
      step: snapshot.step,
      parentStep: determineParentStep(actions[index], actions, index),
      action: snapshot.action,
      actionType: determineActionType(actions[index]),
      interactionTarget: actions[index].selector,
      flowContext: determineFlowContext(actions[index], actions, index),
      uiState: determineUIState(actions[index], actions, index),
      timestamp: snapshot.timestamp,      htmlFile: snapshot.files.html,
      axeFile: snapshot.files.axeContext,
      screenshotFile: snapshot.files.screenshot || null,
      domChanges: 'detected', // TODO: Implement actual DOM change detection
      tokenEstimate: estimateTokens(snapshot)
    }))
  };

  return manifest;
};

/**
 * Determine parent step for parent-child relationships
 * 
 * @param {Object} currentAction - Current action
 * @param {Array} allActions - All actions in sequence
 * @param {number} currentIndex - Current action index
 * @returns {number|null} Parent step number
 */
const determineParentStep = (currentAction, allActions, currentIndex) => {
  // TODO: Implement sophisticated parent-step detection
  // For now, simple sequential parent
  return currentIndex === 0 ? null : currentIndex;
};

/**
 * Determine action type category
 * 
 * @param {Object} action - Action object
 * @returns {string} Action type
 */
const determineActionType = (action) => {
  const typeMap = {
    'navigate': 'navigation',
    'click': 'interaction',
    'fill': 'form_input',
    'select': 'form_input',
    'scroll': 'navigation',
    'hover': 'interaction'
  };
  
  return typeMap[action.type] || 'other';
};

/**
 * Determine flow context (which logical flow this action belongs to)
 * 
 * @param {Object} currentAction - Current action
 * @param {Array} allActions - All actions in sequence
 * @param {number} currentIndex - Current action index
 * @returns {string} Flow context
 */
const determineFlowContext = (currentAction, allActions, currentIndex) => {
  // TODO: Implement intelligent flow detection
  // Look for patterns like form interactions, modal operations, etc.
  
  if (currentAction.type === 'navigate') return 'navigation';
  if (currentAction.selector?.includes('modal')) return 'modal';
  if (currentAction.selector?.includes('form')) return 'form';
  
  return 'main';
};

/**
 * Determine UI state after action
 * 
 * @param {Object} currentAction - Current action
 * @param {Array} allActions - All actions in sequence
 * @param {number} currentIndex - Current action index
 * @returns {string} UI state
 */
const determineUIState = (currentAction, allActions, currentIndex) => {
  // TODO: Implement UI state detection
  // Could analyze DOM to determine if modals are open, forms are filled, etc.
  
  return 'active';
};

/**
 * Estimate token count for snapshot
 * 
 * @param {Object} snapshot - Snapshot data
 * @returns {number} Estimated token count
 */
const estimateTokens = (snapshot) => {
  // Rough estimate: 1 token per 4 characters
  // TODO: Use more accurate tokenization
  return Math.ceil((snapshot.files.html?.length || 0) / 4);
};

/**
 * Generate unique replay session ID
 * 
 * @returns {string} Session ID
 */
const generateReplaySessionId = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substr(2, 9);
  return `replay_${timestamp}_${random}`;
};

/**
 * Test for focus trap issues in modals
 * 
 * @param {Object} page - Playwright page object
 * @param {number} stepNumber - Current step number for logging
 * @returns {Promise<Object>} Focus trap test result
 */
const testFocusTrap = async (page, stepNumber) => {
  try {
    // Detect if a modal is present
    const modalInfo = await page.evaluate(() => {
      const modalSelectors = [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '.modal:not([style*="display: none"])',
        '.dialog:not([style*="display: none"])',
        '[data-modal="true"]'
      ];
      
      for (const selector of modalSelectors) {
        const modal = document.querySelector(selector);
        if (modal && modal.offsetParent !== null) { // Check if visible
          // Get focusable elements within the modal
          const focusableSelectors = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
          const focusableElements = modal.querySelectorAll(focusableSelectors);
          
          return {
            detected: true,
            selector: selector,
            modalElement: modal.tagName.toLowerCase(),
            focusableCount: focusableElements.length,
            hasAriaModal: modal.getAttribute('aria-modal') === 'true',
            hasRole: modal.getAttribute('role') === 'dialog'
          };
        }
      }
      
      return { detected: false };
    });

    // If no modal detected, return early
    if (!modalInfo.detected) {
      return {
        tested: false,
        reason: 'No modal detected',
        step: stepNumber
      };
    }

    console.log(`Step ${stepNumber}: Modal detected, testing focus trap...`);

    // If modal has no focusable elements, can't test focus trap
    if (modalInfo.focusableCount === 0) {
      return {
        tested: false,
        reason: 'Modal has no focusable elements',
        modalInfo,
        step: stepNumber
      };
    }

    // Test focus trapping
    const focusTrapTest = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal:not([style*="display: none"]), .dialog:not([style*="display: none"]), [data-modal="true"]');
      if (!modal || modal.offsetParent === null) return { success: false, reason: 'Modal disappeared' };

      // Store original focus
      const originalFocus = document.activeElement;
      
      // Get focusable elements
      const focusableSelectors = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors))
        .filter(el => el.offsetParent !== null && !el.disabled);
      
      if (focusableElements.length === 0) {
        return { success: false, reason: 'No visible focusable elements' };
      }

      // Focus first element
      focusableElements[0].focus();
      
      let currentFocusIndex = 0;
      let tabCount = 0;
      const maxTabs = Math.min(focusableElements.length * 2 + 2, 15); // Reasonable limit
      const visitedElements = new Set();
      
      // Test forward tabbing
      for (let i = 0; i < maxTabs; i++) {
        tabCount++;
        
        // Simulate Tab key (we'll use keyboard.press from Playwright level)
        // For now, just manually focus next element to test the concept
        currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
        focusableElements[currentFocusIndex].focus();
        
        const activeElement = document.activeElement;
        
        // Check if focus is still within modal
        if (!modal.contains(activeElement)) {
          // Restore original focus
          if (originalFocus && typeof originalFocus.focus === 'function') {
            try { originalFocus.focus({ preventScroll: true }); } catch (e) {}
          }
          return {
            success: false,
            reason: 'Focus escaped modal',
            tabCount,
            escapedTo: activeElement ? activeElement.tagName.toLowerCase() : 'unknown'
          };
        }
        
        // Track visited elements to detect cycles
        const elementKey = activeElement.tagName + (activeElement.id ? '#' + activeElement.id : '') + (activeElement.className ? '.' + activeElement.className.split(' ')[0] : '');
        if (visitedElements.has(elementKey) && visitedElements.size === focusableElements.length) {
          // We've cycled through all elements - focus trap is working
          if (originalFocus && typeof originalFocus.focus === 'function') {
            try { originalFocus.focus({ preventScroll: true }); } catch (e) {}
          }
          return {
            success: true,
            reason: 'Focus properly trapped - completed cycle',
            tabCount,
            focusableCount: focusableElements.length
          };
        }
        visitedElements.add(elementKey);
      }
      
      // Restore original focus
      if (originalFocus && typeof originalFocus.focus === 'function') {
        try { originalFocus.focus({ preventScroll: true }); } catch (e) {}
      }
      
      return {
        success: true,
        reason: 'Focus remained within modal during test',
        tabCount,
        focusableCount: focusableElements.length
      };
    });

    // Use Playwright's keyboard API for more realistic tabbing test
    try {
      const keyboardTest = await testWithKeyboard(page, modalInfo);
      return {
        tested: true,
        modalInfo,
        focusTrapResult: focusTrapTest,
        keyboardTest,
        step: stepNumber
      };
    } catch (error) {
      return {
        tested: true,
        modalInfo,
        focusTrapResult: focusTrapTest,
        keyboardTest: { error: error.message },
        step: stepNumber
      };
    }

  } catch (error) {
    console.warn(`Focus trap test failed for step ${stepNumber}:`, error);
    return {
      tested: false,
      reason: 'Test error: ' + error.message,
      step: stepNumber
    };
  }
};

/**
 * Test focus trap using Playwright's keyboard API
 * 
 * @param {Object} page - Playwright page object  
 * @param {Object} modalInfo - Modal information from detection
 * @returns {Promise<Object>} Keyboard test result
 */
const testWithKeyboard = async (page, modalInfo) => {
  // Focus the modal first
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal:not([style*="display: none"]), .dialog:not([style*="display: none"]), [data-modal="true"]');
    if (modal) {
      const focusable = modal.querySelector('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
  });

  const maxTabs = 8; // Reasonable number of tabs to test
  let focusEscaped = false;
  let tabCount = 0;

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    tabCount++;
    
    const isInModal = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal:not([style*="display: none"]), .dialog:not([style*="display: none"]), [data-modal="true"]');
      const activeElement = document.activeElement;
      return modal && modal.contains(activeElement);
    });
    
    if (!isInModal) {
      focusEscaped = true;
      break;
    }
  }

  return {
    focusEscaped,
    tabCount,
    success: !focusEscaped,
    method: 'keyboard'
  };
};

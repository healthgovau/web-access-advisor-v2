/**
 * Step tracker utility - manages parent-step relationships during recording and replay
 * Handles the complex logic of tracking interaction context
 */

class StepTracker {
  constructor() {
    this.reset();
  }

  /**
   * Reset tracker state
   */
  reset() {
    this.currentStep = 0;
    this.contextStack = []; // Stack for tracking modal/form contexts
    this.flowStates = new Map(); // Track different flow states
    this.modalDepth = 0;
    this.currentContext = {
      type: 'main',
      startStep: null,
      parentStep: null
    };
  }

  /**
   * Record a new action and determine its parent step
   * 
   * @param {Object} action - Action being recorded
   * @returns {Object} Step information with parent relationship
   */
  recordAction(action) {
    this.currentStep++;

    const stepInfo = {
      step: this.currentStep,
      parentStep: this.determineParentStep(action),
      action: action.type,
      actionType: this.categorizeAction(action),
      interactionTarget: action.selector,
      flowContext: this.determineFlowContext(action),
      uiState: this.determineUIState(action),
      timestamp: new Date().toISOString()
    };

    // Update context based on action
    this.updateContext(action, stepInfo);

    console.log(`Step ${this.currentStep}: ${action.type} (parent: ${stepInfo.parentStep})`);
    return stepInfo;
  }

  /**
   * Determine parent step for current action
   * 
   * @param {Object} action - Current action
   * @returns {number|null} Parent step number
   */
  determineParentStep(action) {
    // First action has no parent
    if (this.currentStep === 1) {
      return null;
    }

    // Check if this action returns to a previous context
    if (this.isContextReturn(action)) {
      return this.getContextReturnParent(action);
    }

    // Check if this action starts a new context (modal, form section)
    if (this.isContextStart(action)) {
      return this.currentStep - 1; // Parent is the previous step
    }

    // Check if we're in a modal context
    if (this.modalDepth > 0) {
      return this.getModalParent(action);
    }

    // Default: sequential parent
    return this.currentStep - 1;
  }

  /**
   * Check if action represents returning to a previous context
   * 
   * @param {Object} action - Action to check
   * @returns {boolean} True if returning to previous context
   */
  isContextReturn(action) {
    // Modal close actions
    if (action.type === 'click' && this.isModalCloseSelector(action.selector)) {
      return true;
    }

    // Form reset or cancel actions
    if (action.type === 'click' && this.isFormCancelSelector(action.selector)) {
      return true;
    }

    // Back button or navigation away from current context
    if (action.type === 'navigate' && this.contextStack.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get parent step when returning to previous context
   * 
   * @param {Object} action - Return action
   * @returns {number|null} Parent step from previous context
   */
  getContextReturnParent(action) {
    if (this.contextStack.length > 0) {
      const previousContext = this.contextStack.pop();
      this.modalDepth = Math.max(0, this.modalDepth - 1);
      
      // Return to the step that started the context we're leaving
      return previousContext.parentStep;
    }

    return this.currentStep - 1;
  }

  /**
   * Check if action starts a new context
   * 
   * @param {Object} action - Action to check
   * @returns {boolean} True if starting new context
   */
  isContextStart(action) {
    // Modal open actions
    if (action.type === 'click' && this.isModalOpenSelector(action.selector)) {
      return true;
    }

    // Form start actions
    if (action.type === 'click' && this.isFormStartSelector(action.selector)) {
      return true;
    }

    // Dropdown or expandable content
    if (action.type === 'click' && this.isExpandableSelector(action.selector)) {
      return true;
    }

    return false;
  }

  /**
   * Get parent step when in modal context
   * 
   * @param {Object} action - Current action
   * @returns {number} Parent step within modal context
   */
  getModalParent(action) {
    // If this closes the modal, parent is the modal opener
    if (this.isContextReturn(action)) {
      return this.getContextReturnParent(action);
    }

    // Otherwise, sequential within modal
    return this.currentStep - 1;
  }

  /**
   * Update context state based on action
   * 
   * @param {Object} action - Current action
   * @param {Object} stepInfo - Step information
   */
  updateContext(action, stepInfo) {
    if (this.isContextStart(action)) {
      // Push current context to stack
      this.contextStack.push({
        ...this.currentContext,
        endStep: this.currentStep - 1
      });

      // Start new context
      if (this.isModalOpenSelector(action.selector)) {
        this.modalDepth++;
        this.currentContext = {
          type: 'modal',
          startStep: this.currentStep,
          parentStep: this.currentStep - 1
        };
      } else if (this.isFormStartSelector(action.selector)) {
        this.currentContext = {
          type: 'form',
          startStep: this.currentStep,
          parentStep: this.currentStep - 1
        };
      }
    }

    // Update flow state tracking
    this.updateFlowState(action, stepInfo);
  }

  /**
   * Update flow state information
   * 
   * @param {Object} action - Current action
   * @param {Object} stepInfo - Step information
   */
  updateFlowState(action, stepInfo) {
    const flowKey = stepInfo.flowContext;
    
    if (!this.flowStates.has(flowKey)) {
      this.flowStates.set(flowKey, {
        startStep: this.currentStep,
        lastStep: this.currentStep,
        actionCount: 1
      });
    } else {
      const flowState = this.flowStates.get(flowKey);
      flowState.lastStep = this.currentStep;
      flowState.actionCount++;
    }
  }

  /**
   * Categorize action type
   * 
   * @param {Object} action - Action to categorize
   * @returns {string} Action category
   */
  categorizeAction(action) {
    switch (action.type) {
      case 'navigate':
        return 'navigation';
      case 'click':
        if (this.isModalSelector(action.selector)) return 'modal_interaction';
        if (this.isFormSelector(action.selector)) return 'form_interaction';
        return 'interaction';
      case 'fill':
      case 'select':
        return 'form_input';
      case 'scroll':
        return 'navigation';
      case 'hover':
        return 'interaction';
      default:
        return 'other';
    }
  }

  /**
   * Determine flow context
   * 
   * @param {Object} action - Current action
   * @returns {string} Flow context
   */
  determineFlowContext(action) {
    if (this.modalDepth > 0) {
      return 'modal';
    }

    if (action.type === 'navigate') {
      return 'navigation';
    }

    if (this.isFormSelector(action.selector)) {
      return 'form';
    }

    if (this.currentContext.type !== 'main') {
      return this.currentContext.type;
    }

    return 'main';
  }

  /**
   * Determine UI state after action
   * 
   * @param {Object} action - Current action
   * @returns {string} UI state
   */
  determineUIState(action) {
    if (this.modalDepth > 0) {
      return 'modal_open';
    }

    if (this.isFormSelector(action.selector)) {
      return 'form_active';
    }

    return 'default';
  }

  /**
   * Check if selector indicates modal element
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if modal-related
   */
  isModalSelector(selector) {
    if (!selector) return false;
    
    const modalKeywords = [
      'modal', 'dialog', 'popup', 'overlay', 'lightbox', 
      'drawer', 'sidebar', 'tooltip', 'popover'
    ];
    
    return modalKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if selector indicates modal open action
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if modal opener
   */
  isModalOpenSelector(selector) {
    if (!selector) return false;
    
    const openKeywords = [
      'open', 'show', 'trigger', 'launch', 'activate',
      'help', 'info', 'more', 'expand'
    ];
    
    return this.isModalSelector(selector) || 
           openKeywords.some(keyword => 
             selector.toLowerCase().includes(keyword)
           );
  }

  /**
   * Check if selector indicates modal close action
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if modal closer
   */
  isModalCloseSelector(selector) {
    if (!selector) return false;
    
    const closeKeywords = [
      'close', 'cancel', 'dismiss', 'hide', 'exit',
      'back', 'return', 'overlay'
    ];
    
    return closeKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    ) || selector.includes('×') || selector.includes('✕');
  }

  /**
   * Check if selector indicates form element
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if form-related
   */
  isFormSelector(selector) {
    if (!selector) return false;
    
    const formKeywords = [
      'form', 'input', 'select', 'textarea', 'button',
      'submit', 'field', 'checkbox', 'radio'
    ];
    
    return formKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if selector indicates form start action
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if form starter
   */
  isFormStartSelector(selector) {
    if (!selector) return false;
    
    const startKeywords = [
      'start', 'begin', 'new', 'create', 'add',
      'register', 'signup', 'login'
    ];
    
    return startKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if selector indicates form cancel action
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if form canceller
   */
  isFormCancelSelector(selector) {
    if (!selector) return false;
    
    const cancelKeywords = [
      'cancel', 'reset', 'clear', 'back', 'previous'
    ];
    
    return cancelKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if selector indicates expandable content
   * 
   * @param {string} selector - CSS selector
   * @returns {boolean} True if expandable
   */
  isExpandableSelector(selector) {
    if (!selector) return false;
    
    const expandKeywords = [
      'expand', 'collapse', 'toggle', 'accordion',
      'dropdown', 'menu', 'details', 'summary'
    ];
    
    return expandKeywords.some(keyword => 
      selector.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get current tracking state
   * 
   * @returns {Object} Current state
   */
  getState() {
    return {
      currentStep: this.currentStep,
      contextStack: [...this.contextStack],
      modalDepth: this.modalDepth,
      currentContext: { ...this.currentContext },
      flowStates: new Map(this.flowStates)
    };
  }
}

// Export singleton instance
export default new StepTracker();

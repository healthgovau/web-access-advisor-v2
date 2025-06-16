/**
 * Flow analyzer service - groups snapshots into logical flows for LLM analysis
 * Implements parent-step relationship analysis and intelligent batching
 */

/**
 * Analyze session manifest and group steps into logical flows
 * 
 * @param {Object} manifest - Session manifest with steps
 * @returns {Promise<Array>} Array of flow groups
 */
export const analyzeFlows = async (manifest) => {
  try {
    if (!manifest || !manifest.steps || manifest.steps.length === 0) {
      return [];
    }

    console.log(`Analyzing flows for ${manifest.steps.length} steps`);

    // Build parent-child relationships
    const stepMap = buildStepMap(manifest.steps);
    
    // Identify flow boundaries
    const flowBoundaries = identifyFlowBoundaries(manifest.steps);
    
    // Group steps into logical flows
    const flows = groupStepsIntoFlows(manifest.steps, stepMap, flowBoundaries);
    
    // Add context and metadata to each flow
    const enrichedFlows = enrichFlows(flows, manifest);

    console.log(`Identified ${enrichedFlows.length} logical flows`);
    return enrichedFlows;

  } catch (error) {
    console.error('Flow analysis failed:', error);
    return [];
  }
};

/**
 * Build step map with parent-child relationships
 * 
 * @param {Array} steps - Array of step objects
 * @returns {Map} Step map with relationships
 */
const buildStepMap = (steps) => {
  const stepMap = new Map();

  steps.forEach(step => {
    stepMap.set(step.step, {
      ...step,
      children: [],
      isFlowStart: step.parentStep === null,
      isModalStart: step.flowContext === 'modal' && step.actionType === 'interaction',
      isModalEnd: step.flowContext === 'modal' && step.action.includes('close')
    });
  });

  // Build children relationships
  steps.forEach(step => {
    if (step.parentStep !== null) {
      const parent = stepMap.get(step.parentStep);
      if (parent) {
        parent.children.push(step.step);
      }
    }
  });

  return stepMap;
};

/**
 * Identify natural flow boundaries in the step sequence
 * 
 * @param {Array} steps - Array of step objects
 * @returns {Array} Array of boundary points
 */
const identifyFlowBoundaries = (steps) => {
  const boundaries = [0]; // Always start with first step

  for (let i = 1; i < steps.length; i++) {
    const currentStep = steps[i];
    const previousStep = steps[i - 1];

    // Boundary conditions
    const isNewFlow = 
      // New navigation
      currentStep.actionType === 'navigation' ||
      
      // Modal start (diverging from main flow)
      (currentStep.flowContext === 'modal' && 
       previousStep.flowContext !== 'modal') ||
      
      // Return to main flow after modal
      (currentStep.flowContext !== 'modal' && 
       previousStep.flowContext === 'modal') ||
      
      // Form flow changes
      (currentStep.flowContext !== previousStep.flowContext &&
       !['modal', 'navigation'].includes(currentStep.flowContext));

    if (isNewFlow) {
      boundaries.push(i);
    }
  }

  return boundaries;
};

/**
 * Group steps into logical flows based on boundaries and relationships
 * 
 * @param {Array} steps - Array of step objects
 * @param {Map} stepMap - Step map with relationships
 * @param {Array} boundaries - Flow boundary points
 * @returns {Array} Array of flow groups
 */
const groupStepsIntoFlows = (steps, stepMap, boundaries) => {
  const flows = [];

  for (let i = 0; i < boundaries.length; i++) {
    const startIndex = boundaries[i];
    const endIndex = boundaries[i + 1] || steps.length;
    
    const flowSteps = steps.slice(startIndex, endIndex);
    
    if (flowSteps.length > 0) {
      const flow = {
        flowId: flows.length + 1,
        startStep: flowSteps[0].step,
        endStep: flowSteps[flowSteps.length - 1].step,
        stepCount: flowSteps.length,
        steps: flowSteps,
        flowType: determineFlowType(flowSteps),
        flowContext: flowSteps[0].flowContext,
        isModal: flowSteps[0].flowContext === 'modal',
        parentFlow: findParentFlow(flowSteps, flows, stepMap)
      };

      flows.push(flow);
    }
  }

  return flows;
};

/**
 * Determine the type of flow based on step patterns
 * 
 * @param {Array} steps - Steps in the flow
 * @returns {string} Flow type
 */
const determineFlowType = (steps) => {
  const actionTypes = steps.map(s => s.actionType);
  const flowContexts = steps.map(s => s.flowContext);

  if (flowContexts.includes('modal')) {
    return 'modal_interaction';
  }
  
  if (actionTypes.includes('navigation')) {
    return 'navigation';
  }
  
  if (actionTypes.includes('form_input')) {
    return 'form_interaction';
  }
  
  if (actionTypes.every(t => t === 'interaction')) {
    return 'ui_interaction';
  }
  
  return 'mixed';
};

/**
 * Find parent flow for sub-flows (like modals)
 * 
 * @param {Array} flowSteps - Steps in current flow
 * @param {Array} existingFlows - Previously identified flows
 * @param {Map} stepMap - Step map with relationships
 * @returns {number|null} Parent flow ID
 */
const findParentFlow = (flowSteps, existingFlows, stepMap) => {
  if (flowSteps.length === 0 || !flowSteps[0].parentStep) {
    return null;
  }

  const parentStepNumber = flowSteps[0].parentStep;
  
  // Find which flow contains the parent step
  for (const flow of existingFlows) {
    if (parentStepNumber >= flow.startStep && parentStepNumber <= flow.endStep) {
      return flow.flowId;
    }
  }
  
  return null;
};

/**
 * Enrich flows with additional context and metadata
 * 
 * @param {Array} flows - Basic flow groups
 * @param {Object} manifest - Original session manifest
 * @returns {Array} Enriched flows
 */
const enrichFlows = (flows, manifest) => {
  return flows.map(flow => ({
    ...flow,
    name: generateFlowName(flow),
    description: generateFlowDescription(flow),
    tokenEstimate: calculateFlowTokens(flow),
    priority: calculateFlowPriority(flow),
    analysisGroup: determineAnalysisGroup(flow, flows),
    sessionId: manifest.sessionId,
    sessionUrl: manifest.url,
    timestamp: manifest.timestamp
  }));
};

/**
 * Generate human-readable flow name
 * 
 * @param {Object} flow - Flow object
 * @returns {string} Flow name
 */
const generateFlowName = (flow) => {
  const { flowType, flowContext, stepCount, isModal } = flow;

  if (isModal) {
    return `Modal Interaction (${stepCount} steps)`;
  }

  switch (flowType) {
    case 'navigation':
      return `Page Navigation (${stepCount} steps)`;
    case 'form_interaction':
      return `Form Interaction (${stepCount} steps)`;
    case 'ui_interaction':
      return `UI Interaction (${stepCount} steps)`;
    default:
      return `${flowContext} Flow (${stepCount} steps)`;
  }
};

/**
 * Generate flow description
 * 
 * @param {Object} flow - Flow object
 * @returns {string} Flow description
 */
const generateFlowDescription = (flow) => {
  const { steps, flowType, isModal } = flow;
  
  if (isModal) {
    return `Modal workflow from step ${flow.startStep} to ${flow.endStep}`;
  }

  const actions = steps.map(s => s.action).join(' → ');
  return `${flowType} workflow: ${actions}`;
};

/**
 * Calculate estimated token count for flow
 * 
 * @param {Object} flow - Flow object
 * @returns {number} Estimated tokens
 */
const calculateFlowTokens = (flow) => {
  return flow.steps.reduce((total, step) => {
    return total + (step.tokenEstimate || 1000);
  }, 0);
};

/**
 * Calculate flow priority for analysis ordering
 * 
 * @param {Object} flow - Flow object
 * @returns {number} Priority score (higher = more important)
 */
const calculateFlowPriority = (flow) => {
  let priority = 0;

  // Main flows are higher priority than modals
  if (!flow.isModal) priority += 10;
  
  // Form interactions are high priority for accessibility
  if (flow.flowType === 'form_interaction') priority += 8;
  
  // Navigation flows are medium priority
  if (flow.flowType === 'navigation') priority += 5;
  
  // Longer flows get slight priority boost
  priority += Math.min(flow.stepCount * 0.5, 3);

  return priority;
};

/**
 * Determine which analysis group this flow belongs to
 * 
 * @param {Object} flow - Flow object
 * @param {Array} allFlows - All flows in session
 * @returns {string} Analysis group
 */
const determineAnalysisGroup = (flow, allFlows) => {
  if (flow.isModal && flow.parentFlow) {
    return `modal_${flow.parentFlow}`;
  }
  
  if (flow.flowType === 'navigation') {
    return 'navigation';
  }
  
  if (flow.flowType === 'form_interaction') {
    return 'forms';
  }
  
  return 'interactions';
};

/**
 * Prepare flows for LLM analysis by creating optimal batches
 * 
 * @param {Array} flows - Enriched flows
 * @param {number} maxTokensPerBatch - Maximum tokens per LLM request
 * @returns {Array} Batched flows for analysis
 */
export const prepareLLMBatches = (flows, maxTokensPerBatch = 800000) => {
  // Sort flows by priority (highest first)
  const sortedFlows = [...flows].sort((a, b) => b.priority - a.priority);
  
  const batches = [];
  let currentBatch = [];
  let currentTokens = 0;

  for (const flow of sortedFlows) {
    const flowTokens = flow.tokenEstimate;
    
    // If adding this flow would exceed the limit, start a new batch
    if (currentTokens + flowTokens > maxTokensPerBatch && currentBatch.length > 0) {
      batches.push({
        batchId: batches.length + 1,
        flows: currentBatch,
        tokenEstimate: currentTokens,
        analysisType: determineBatchAnalysisType(currentBatch)
      });
      
      currentBatch = [flow];
      currentTokens = flowTokens;
    } else {
      currentBatch.push(flow);
      currentTokens += flowTokens;
    }
  }

  // Add the final batch
  if (currentBatch.length > 0) {
    batches.push({
      batchId: batches.length + 1,
      flows: currentBatch,
      tokenEstimate: currentTokens,
      analysisType: determineBatchAnalysisType(currentBatch)
    });
  }

  return batches;
};

/**
 * Determine the type of analysis needed for a batch
 * 
 * @param {Array} flows - Flows in the batch
 * @returns {string} Analysis type
 */
const determineBatchAnalysisType = (flows) => {
  const flowTypes = flows.map(f => f.flowType);
  
  if (flowTypes.every(t => t === 'form_interaction')) {
    return 'form_accessibility';
  }
  
  if (flowTypes.every(t => t === 'modal_interaction')) {
    return 'modal_accessibility';
  }
  
  if (flowTypes.every(t => t === 'navigation')) {
    return 'navigation_accessibility';
  }
  
  return 'general_accessibility';
};

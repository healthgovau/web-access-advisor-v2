/**
 * Core types for Web Access Advisor
 */

export interface UserAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'scroll' | 'hover' | 'key';
  selector?: string;
  value?: string;
  url?: string;
  timestamp: string;
  step: number;
  metadata?: Record<string, unknown>;
}

export interface SnapshotData {
  step: number;
  action: string;
  timestamp: string;
  html: string;
  axeContext: AxeContext;
  axeResults: any[];
  domChangeType: DOMChangeType;
  domChangeDetails: DOMChangeDetails;
  screenshot?: Buffer;
  files: {
    html: string;
    axeContext: string;
    axeResults: string;
    screenshot?: string;
  };
}

export type DOMChangeType = 'navigation' | 'content' | 'interaction' | 'layout' | 'none';

export interface DOMChangeDetails {
  type: DOMChangeType;
  significant: boolean;
  elementsAdded: number;
  elementsRemoved: number;
  elementsModified: number;
  urlChanged: boolean;
  titleChanged: boolean;
  description: string;
}

export interface AxeContext {
  include: string[][];
  exclude: string[][];
  elementCount: number;
  title: string;
  url: string;
}

export interface ReplaySession {
  sessionId: string;
  url: string;
  timestamp: string;
  actions: UserAction[];
  snapshots: SnapshotData[];
  manifest: SessionManifest;
}

export interface SessionManifest {
  sessionId: string;
  url: string;
  timestamp: string;
  totalSteps: number;
  stepDetails: StepDetail[];
  actionGroups?: ActionGroup[];
  flowStatistics?: FlowStatistics;
  llmOptimizations?: {
    authStepsFiltered: number;
    relevantStepsForAnalysis: number;
    totalTokenEstimate: number;
  };
}

export interface ActionGroup {
  groupId: string;
  steps: number[];
  description: string;
  flowType: 'main_app' | 'auth_flow' | 'error_flow' | 'external_redirect';
  relevantForAnalysis: boolean;
  tokenEstimate: number;
}

export interface FlowStatistics {
  totalSteps: number;
  authSteps: number;
  mainAppSteps: number;
  errorSteps: number;
  significantDOMChanges: number;
  accessibilityEvents: number;
}

export interface StepDetail {
  step: number;
  parentStep: number | null;
  action: string;
  actionType: 'navigation' | 'interaction' | 'form_input' | 'other';
  interactionTarget?: string;
  flowContext: 'main_flow' | 'modal_flow' | 'form_flow' | 'navigation_flow' | 'sub_flow';
  uiState: string;
  timestamp: string;
  htmlFile: string;
  axeFile: string;
  axeResultsFile: string;
  screenshotFile?: string;
  url: string; // URL at the time of this step
  domChangeType: DOMChangeType;
  domChanges: string;
  tokenEstimate: number;
  
  // Enhanced fields for LLM optimization
  previousStep?: number;
  nextStep?: number;
  isAuthRelated: boolean;
  excludeFromAnalysis: boolean;
  skipReason?: string;
  flowType: 'main_app' | 'auth_flow' | 'error_flow' | 'external_redirect';
  domChangeSummary: {
    elementsAdded: number;
    elementsRemoved: number;
    ariaChanges: string[];
    focusChanges?: string;
    liveRegionUpdates: string[];
    significantChange: boolean;
  };
  accessibilityContext: {
    focusedElement?: string;
    screenReaderAnnouncements: string[];
    keyboardNavigationState: string;
    modalState: 'none' | 'open' | 'closing';
    dynamicContentUpdates: boolean;
    ariaLiveRegions: string[];
  };
}

export type StaticSectionMode = 'include' | 'ignore' | 'separate';

export interface AnalysisOptions {
  sessionId?: string;
  captureScreenshots?: boolean;
  waitForStability?: boolean;
  analyzeWithGemini?: boolean;
  outputDir?: string;
  onProgress?: (phase: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report', message: string, step?: number, total?: number, snapshotCount?: number) => void;
  // Timeout configurations (in milliseconds)
  llmComponentTimeout?: number; // Timeout for individual LLM component analysis requests
  llmFlowTimeout?: number; // Timeout for individual LLM flow analysis requests
  // Static section handling
  staticSectionMode?: StaticSectionMode; // 'include' | 'ignore' | 'separate'
}

export interface AnalysisResult {
  success: boolean;
  sessionId: string;
  snapshotCount: number;
  snapshots: SnapshotData[];
  manifest: SessionManifest;
  analysis?: GeminiAnalysis;
  axeResults?: any[];
  warnings?: string[];
  error?: string;
  debug?: {
    llmLogs?: LLMDebugLog[];
  };
}

export interface LLMDebugLog {
  type: 'component' | 'flow';
  prompt: string;
  response: string;
  promptSize: number;
  responseSize: number;
  htmlSize: number;
  axeResultsCount: number;
  timestamp: string;
}

export interface GeminiAnalysis {
  summary: string;
  components: ComponentAccessibilityIssue[];
  recommendations: string[];
  score: number;
  debug?: LLMDebugLog;
}

export interface ComponentAccessibilityIssue {
  componentName: string;
  issue: string;
  explanation: string;
  relevantHtml: string;
  correctedCode: string;
  codeChangeSummary: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagRule: string;
  wcagUrl?: string;
  selector?: string; // CSS selector for the problematic element
  step?: number; // Step index in the session (for per-issue URL)
  url?: string;  // URL at which the issue was found
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  target: string;
  step: number;
}

export interface RecordingOptions {
  maxDuration?: number;
  captureNetworkRequests?: boolean;
  waitForSelectors?: boolean;
}

export interface ReplayOptions extends AnalysisOptions {
  sessionId?: string;
  startFromStep?: number;
  endAtStep?: number;
}

export interface AnalysisBatch {
  batchId: string;
  snapshots: SnapshotData[];
  flowType: 'main_flow' | 'modal_flow' | 'form_flow' | 'navigation_flow' | 'sub_flow';
  tokenCount: number;
  batchIndex: number;
  totalBatches: number;
}

export interface ProgressiveContext {
  previousBatchSummaries: BatchSummary[];
  currentBatchMetadata: {
    batchId: string;
    flowType: string;
    stepRange: { start: number; end: number };
    batchIndex: number;
    totalBatches: number;
  };
  overallContext: {
    sessionId: string;
    url: string;
    totalSteps: number;
    flowTypes: string[];
  };
}

export interface BatchSummary {
  batchId: string;
  flowType: string;
  stepRange: { start: number; end: number };
  keyFindings: string[];
  criticalIssues: ComponentAccessibilityIssue[];
  contextForNext: {
    flowState: string;
    uiState: string;
    accessibilityPattern: string;
  };
}

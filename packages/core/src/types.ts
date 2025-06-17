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
}

export interface StepDetail {
  step: number;
  parentStep: number | null;
  action: string;
  actionType: 'navigation' | 'interaction' | 'form_input' | 'other';
  interactionTarget?: string;
  flowContext: string;
  uiState: string;
  timestamp: string;
  htmlFile: string;
  axeFile: string;
  axeResultsFile: string;
  screenshotFile?: string;
  domChangeType: DOMChangeType;
  domChanges: string;
  tokenEstimate: number;
}

export interface AnalysisOptions {
  captureScreenshots?: boolean;
  waitForStability?: boolean;
  analyzeWithGemini?: boolean;
  outputDir?: string;
}

export interface AnalysisResult {
  success: boolean;
  sessionId: string;
  snapshotCount: number;
  snapshots: SnapshotData[];
  manifest: SessionManifest;
  analysis?: GeminiAnalysis;
  warnings?: string[];
  error?: string;
}

export interface GeminiAnalysis {
  summary: string;
  components: ComponentAccessibilityIssue[];
  recommendations: string[];
  score: number;
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

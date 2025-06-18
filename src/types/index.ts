/**
 * Frontend-specific types for the React UI
 * These complement the core types from packages/core
 */

// Core types (duplicated for now - will reference core package later)
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
  axeResults?: any[];
  screenshot?: ArrayBuffer;
  files: {
    html: string;
    axeContext: string;
    screenshot?: string;
  };
}

export interface AxeContext {
  include: string[][];
  exclude: string[][];
  elementCount: number;
  title: string;
  url: string;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
  tags: string[];
}

export interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
  element?: any;
}

export interface AnalysisResult {
  success: boolean;
  sessionId: string;
  snapshotCount: number;
  snapshots: SnapshotData[];
  manifest: SessionManifest;
  analysis?: GeminiAnalysis;
  axeResults?: AxeViolation[];
  warnings?: string[];
  error?: string;
  debug?: {
    llmLogs?: LLMDebugLog[];
  };
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
  screenshotFile?: string;
  domChanges: string;
  tokenEstimate: number;
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
  wcagUrl?: string;
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  target: string;
  step: number;
}

export interface AnalysisOptions {
  captureScreenshots?: boolean;
  waitForStability?: boolean;
  analyzeWithGemini?: boolean;
  outputDir?: string;
}

// Frontend-specific types
export type AppMode = 'setup' | 'recording' | 'analyzing' | 'results';

export type ProgressStage = 
  | 'idle'
  | 'starting-browser'
  | 'recording'
  | 'stopping-recording'
  | 'recording-complete'
  | 'preparing-analysis'
  | 'replaying-actions'
  | 'capturing-snapshots'
  | 'running-accessibility-checks'
  | 'processing-with-ai'
  | 'generating-report'
  | 'completed'
  | 'error';

export interface ProgressState {
  stage: ProgressStage;
  message: string;
  progress?: number;
  details?: string;
  error?: string;
  snapshotCount?: number;
}

export interface AppState {
  mode: AppMode;
  url: string;
  sessionId?: string;
  actions: UserAction[];
  analysisResult?: AnalysisResult;
  error?: string;
  loading: boolean;
  progress: ProgressState;
}

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModeToggleProps extends ComponentProps {
  mode: AppState['mode'];
  onModeChange: (mode: AppState['mode']) => void;
}

export interface URLInputProps extends ComponentProps {
  url: string;
  onUrlChange: (url: string) => void;
  onNavigate: (url: string) => void;
  disabled?: boolean;
}

export interface RecordingControlsProps extends ComponentProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export interface ActionListProps extends ComponentProps {
  actions: UserAction[];
  onActionDelete?: (index: number) => void;
  onActionEdit?: (index: number, action: UserAction) => void;
}

export interface ReplayControlsProps extends ComponentProps {
  actions: UserAction[];
  isReplaying: boolean;
  onStartReplay: () => void;
  onStopReplay: () => void;
  disabled?: boolean;
}

export interface ProgressIndicatorProps extends ComponentProps {
  progress: number;
  status: string;
  visible: boolean;
}

export interface AnalysisResultsProps extends ComponentProps {
  results: AnalysisResult | null;
  loading: boolean;
  error: string | null;
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

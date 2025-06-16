/**
 * Web Access Advisor Core Package
 * Shared accessibility analysis engine for CLI and UI modes
 */

export * from './types';
export * from './analyzer';
export * from './gemini';

// Re-export commonly used types
export type {
  UserAction,
  SnapshotData,
  AnalysisResult,
  AnalysisOptions,
  ReplaySession,
  SessionManifest,
  GeminiAnalysis,
  AccessibilityIssue
} from './types';

export { AccessibilityAnalyzer } from './analyzer';
export { GeminiService } from './gemini';

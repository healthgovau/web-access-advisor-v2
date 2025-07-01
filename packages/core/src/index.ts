/**
 * Web Access Advisor Core Package
 * Shared accessibility analysis engine for CLI and UI modes
 */

export * from './analyzer.js';
export * from './gemini.js';

// Re-export commonly used types
export type {
  UserAction,
  SnapshotData,
  AnalysisResult,
  AnalysisOptions,
  ReplaySession,
  SessionManifest,
  GeminiAnalysis,
  ComponentAccessibilityIssue,
  StaticSectionMode
} from './types.js';

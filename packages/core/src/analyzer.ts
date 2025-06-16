/**
 * Core accessibility analysis engine
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { GeminiService } from './gemini';
import type { 
  UserAction, 
  SnapshotData, 
  AnalysisResult, 
  AnalysisOptions,
  SessionManifest,
  StepDetail,
  AxeContext,
  GeminiAnalysis
} from './types';

/**
 * Main analysis engine class
 */
export class AccessibilityAnalyzer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private geminiService: GeminiService | null = null;

  /**
   * Initialize the analyzer
   */
  async initialize(geminiApiKey?: string): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    
    // Initialize Gemini if API key provided
    if (geminiApiKey) {
      this.geminiService = new GeminiService(geminiApiKey);
    }
  }

  /**
   * Analyze recorded actions with snapshots
   */
  async analyzeActions(
    actions: UserAction[], 
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {    const {
      captureScreenshots = true,
      waitForStability = true,
      analyzeWithGemini = true,
      outputDir = './snapshots'
    } = options;

    const sessionId = this.generateSessionId();
    const sessionDir = path.join(outputDir, sessionId);
    
    // Create session directory
    await mkdir(sessionDir, { recursive: true });

    const snapshots: SnapshotData[] = [];
    let geminiAnalysis: GeminiAnalysis | undefined;

    try {
      if (!this.page) {
        throw new Error('Analyzer not initialized');
      }

      console.log(`Starting analysis session: ${sessionId}`);

      // Replay each action and capture snapshots
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`Processing step ${i + 1}: ${action.type}`);

        // Execute the action
        await this.executeAction(this.page, action);

        // Wait for stability if requested
        if (waitForStability) {
          await this.page.waitForLoadState('networkidle');
        }

        // Capture snapshot
        const snapshot = await this.captureSnapshot(
          this.page, 
          i + 1, 
          action, 
          sessionDir,
          captureScreenshots
        );
        snapshots.push(snapshot);
      }      // Perform Gemini analysis if enabled and service available
      if (analyzeWithGemini && this.geminiService && snapshots.length > 0) {
        console.log('Running Gemini accessibility analysis...');
        try {
          const lastSnapshot = snapshots[snapshots.length - 1];
          geminiAnalysis = await this.geminiService.analyzeAccessibility(
            lastSnapshot.html,
            lastSnapshot.axeResults,
            {
              url: actions[0]?.url || 'unknown',
              action: actions[actions.length - 1]?.type || 'unknown',
              step: snapshots.length
            }
          );
        } catch (error) {
          console.warn('Gemini analysis failed:', error);
          // Continue without Gemini analysis
        }
      }

      // Generate metadata manifest
      const manifest = await this.generateManifest(sessionId, actions, snapshots);
      await writeFile(
        path.join(sessionDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );      return {
        success: true,
        sessionId,
        snapshotCount: snapshots.length,
        snapshots,
        manifest,
        analysis: geminiAnalysis
      };

    } catch (error) {
      return {
        success: false,
        sessionId,
        snapshotCount: 0,
        snapshots: [],
        manifest: {} as SessionManifest,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a user action
   */
  private async executeAction(page: Page, action: UserAction): Promise<void> {
    switch (action.type) {
      case 'navigate':
        if (action.url) {
          await page.goto(action.url);
        }
        break;
      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        }
        break;
      case 'fill':
        if (action.selector && action.value) {
          await page.fill(action.selector, action.value);
        }
        break;
      case 'select':
        if (action.selector && action.value) {
          await page.selectOption(action.selector, action.value);
        }
        break;
      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 300));
        break;
      case 'hover':
        if (action.selector) {
          await page.hover(action.selector);
        }
        break;
      case 'key':
        if (action.value) {
          await page.keyboard.press(action.value);
        }
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }
  /**
   * Capture accessibility snapshot
   */
  private async captureSnapshot(
    page: Page,
    stepNumber: number,
    action: UserAction,
    sessionDir: string,
    captureScreenshots: boolean
  ): Promise<SnapshotData> {
    const stepDir = path.join(sessionDir, `step_${stepNumber.toString().padStart(3, '0')}`);
    await mkdir(stepDir, { recursive: true });

    const snapshot: SnapshotData = {
      step: stepNumber,
      action: action.type,
      timestamp: new Date().toISOString(),
      html: '',
      axeContext: {} as AxeContext,
      axeResults: [],
      files: {
        html: '',
        axeContext: '',
        axeResults: ''
      }
    };

    // Capture HTML content
    const htmlContent = await page.content();
    const htmlFile = path.join(stepDir, 'snapshot.html');
    await writeFile(htmlFile, htmlContent);
    snapshot.html = htmlContent;
    snapshot.files.html = htmlFile;

    // Run axe accessibility analysis
    try {
      const axeResults = await new AxeBuilder({ page }).analyze();
      snapshot.axeResults = axeResults.violations || [];
      
      const axeResultsFile = path.join(stepDir, 'axe_results.json');
      await writeFile(axeResultsFile, JSON.stringify(axeResults, null, 2));
      snapshot.files.axeResults = axeResultsFile;
    } catch (error) {
      console.warn('Axe analysis failed:', error);
      snapshot.axeResults = [];
    }

    // Capture axe context
    const axeContext = await page.evaluate(() => {
      return {
        include: [['html']],
        exclude: [],
        elementCount: document.querySelectorAll('*').length,
        title: document.title,
        url: window.location.href
      };
    });
    
    const axeFile = path.join(stepDir, 'axe_context.json');
    await writeFile(axeFile, JSON.stringify(axeContext, null, 2));
    snapshot.axeContext = axeContext;
    snapshot.files.axeContext = axeFile;

    // Capture screenshot if requested
    if (captureScreenshots) {
      const screenshotFile = path.join(stepDir, 'screenshot.png');
      const screenshotBuffer = await page.screenshot({ path: screenshotFile, fullPage: true });
      snapshot.screenshot = screenshotBuffer;
      snapshot.files.screenshot = screenshotFile;
    }

    console.log(`Snapshot captured for step ${stepNumber}`);
    return snapshot;
  }

  /**
   * Generate session manifest
   */
  private async generateManifest(
    sessionId: string,
    actions: UserAction[],
    snapshots: SnapshotData[]
  ): Promise<SessionManifest> {
    const manifest: SessionManifest = {
      sessionId,
      url: actions.find(a => a.type === 'navigate')?.url || 'unknown',
      timestamp: new Date().toISOString(),
      totalSteps: snapshots.length,
      stepDetails: snapshots.map((snapshot, index) => ({
        step: snapshot.step,
        parentStep: this.determineParentStep(actions[index], actions, index),
        action: snapshot.action,
        actionType: this.determineActionType(actions[index]),
        interactionTarget: actions[index].selector,
        flowContext: this.determineFlowContext(actions[index], actions, index),
        uiState: this.determineUIState(actions[index], actions, index),
        timestamp: snapshot.timestamp,        htmlFile: path.basename(snapshot.files.html),
        axeFile: path.basename(snapshot.files.axeContext),
        axeResultsFile: path.basename(snapshot.files.axeResults),
        screenshotFile: snapshot.files.screenshot ? path.basename(snapshot.files.screenshot) : undefined,
        domChanges: 'detected', // TODO: Implement actual DOM change detection
        tokenEstimate: this.estimateTokens(snapshot)
      }))
    };

    return manifest;
  }
  /**
   * Determine parent step for parent-child relationships
   */
  private determineParentStep(
    _currentAction: UserAction,
    _allActions: UserAction[],
    currentIndex: number
  ): number | null {
    // Simple sequential parent for now
    return currentIndex === 0 ? null : currentIndex;
  }

  /**
   * Determine action type category
   */
  private determineActionType(action: UserAction): StepDetail['actionType'] {
    const typeMap: Record<string, StepDetail['actionType']> = {
      'navigate': 'navigation',
      'click': 'interaction',
      'fill': 'form_input',
      'select': 'form_input',
      'scroll': 'navigation',
      'hover': 'interaction'
    };
    
    return typeMap[action.type] || 'other';
  }

  /**
   * Determine flow context
   */
  private determineFlowContext(
    _currentAction: UserAction,
    _allActions: UserAction[],
    _currentIndex: number
  ): string {
    // TODO: Implement sophisticated flow detection
    return 'main_flow';
  }

  /**
   * Determine UI state
   */
  private determineUIState(
    _currentAction: UserAction,
    _allActions: UserAction[],
    _currentIndex: number
  ): string {
    // TODO: Implement UI state detection
    return 'default';
  }

  /**
   * Estimate token count for LLM analysis
   */  private estimateTokens(snapshot: SnapshotData): number {
    // Rough estimation: 1 token ≈ 4 characters
    const htmlTokens = Math.ceil(snapshot.html.length / 4);
    const contextTokens = Math.ceil(JSON.stringify(snapshot.axeContext).length / 4);
    const axeTokens = Math.ceil(JSON.stringify(snapshot.axeResults).length / 4);
    return htmlTokens + contextTokens + axeTokens;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

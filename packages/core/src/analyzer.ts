/**
 * Core accessibility analysis engine
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { GeminiService } from './gemini.js';
import type { 
  UserAction, 
  SnapshotData, 
  AnalysisResult, 
  AnalysisOptions,
  SessionManifest,
  StepDetail,
  AxeContext,
  GeminiAnalysis,
  DOMChangeType,
  DOMChangeDetails
} from './types.js';

/**
 * Main analysis engine class
 */
export class AccessibilityAnalyzer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private geminiService: GeminiService | null = null;
  private domChangeDetector: DOMChangeDetector = new DOMChangeDetector();
  private previousHtmlState: string | null = null;
  /**
   * Initialize the analyzer
   */
  async initialize(geminiApiKey?: string): Promise<void> {
    console.log(`🔍 Analyzer init: geminiApiKey provided = ${geminiApiKey ? 'Yes (' + geminiApiKey.substring(0, 10) + '...)' : 'No'}`);
    
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    
    // Initialize Gemini if API key provided
    if (geminiApiKey) {
      this.geminiService = new GeminiService(geminiApiKey);
      console.log(`✅ Gemini service initialized successfully`);
    } else {
      console.log(`❌ Gemini service NOT initialized - no API key provided`);
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
      }      console.log(`🎬 PHASE 1: Starting analysis session: ${sessionId}`);
      console.log(`📋 Actions to replay: ${actions.length}`);
      
      if (actions.length === 0) {
        console.log(`⚠️ No actions to replay - analysis will be limited`);
        
        // Generate metadata manifest for empty session
        const manifest = await this.generateManifest(sessionId, actions, snapshots);
        await writeFile(
          path.join(sessionDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        return {
          success: true,
          sessionId,
          snapshotCount: 0,
          snapshots: [],
          manifest,
          warnings: ['No actions were recorded - analysis skipped']
        };
      }
      
      // Reset DOM change detector and HTML state for new session
      this.domChangeDetector.reset();
      this.previousHtmlState = null;

      console.log(`🔄 PHASE 2: Replaying actions and capturing snapshots...`);

      // Replay each action and capture snapshots
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`  📱 Processing step ${i + 1}/${actions.length}: ${action.type}`);

        // Execute the action
        await this.executeAction(this.page, action);

        // Wait for stability if requested
        if (waitForStability) {
          await this.page.waitForLoadState('networkidle');
        }

        // Detect DOM changes
        const domChangeDetails = await this.domChangeDetector.detectChanges(this.page, action);
        console.log(`    🔍 DOM Change: ${domChangeDetails.type} - ${domChangeDetails.description}`);        // Only capture snapshot if changes are significant or it's a navigation
        const shouldSnapshot = domChangeDetails.significant || 
                              domChangeDetails.type === 'navigation' ||
                              i === 0; // Always snapshot first step

        console.log(`    📋 Should snapshot: ${shouldSnapshot} (significant: ${domChangeDetails.significant}, isNavigation: ${domChangeDetails.type === 'navigation'}, isFirstStep: ${i === 0})`);

        if (shouldSnapshot) {
          console.log(`    📸 Capturing snapshot for significant ${domChangeDetails.type} change`);
          try {
            const snapshot = await this.captureSnapshot(
              this.page, 
              i + 1, 
              action,
              domChangeDetails,
              sessionDir,
              captureScreenshots
            );
            snapshots.push(snapshot);
            console.log(`    ✅ Snapshot ${i + 1} captured successfully`);
              // Store current HTML for next iteration's before/after comparison
            this.previousHtmlState = snapshot.html;
          } catch (error) {
            console.error(`    ❌ Failed to capture snapshot ${i + 1}:`, error);
          }
        } else {
          console.log(`    ⏭️ Skipping snapshot - no significant changes`);
        }
      }      console.log(`✅ PHASE 2 Complete: Captured ${snapshots.length} snapshots`);

      let warnings: string[] = [];

      // Perform Gemini analysis if enabled and service available
      if (analyzeWithGemini && this.geminiService && snapshots.length > 0) {
        console.log(`🤖 PHASE 3: Running Gemini AI accessibility analysis...`);
        try {
          const lastSnapshot = snapshots[snapshots.length - 1];          console.log(`  📊 Analyzing ${lastSnapshot.axeResults?.length || 0} Axe violations with AI`);
          console.log(`  🧠 Sending HTML content (${Math.round(lastSnapshot.html.length / 1024)}KB) to Gemini...`);
          
          geminiAnalysis = await this.geminiService.analyzeAccessibility(
            lastSnapshot.html,
            lastSnapshot.axeResults,
            {
              url: actions[0]?.url || 'unknown',
              action: actions[actions.length - 1]?.type || 'unknown',
              step: snapshots.length,
              domChangeType: lastSnapshot.domChangeType
            },
            this.previousHtmlState || undefined
          );
          
          console.log(`✅ PHASE 3 Complete: AI analysis finished`);
          console.log(`  📈 Analysis Score: ${geminiAnalysis.score}/100`);
          console.log(`  🔧 Components Analyzed: ${geminiAnalysis.components?.length || 0}`);
          console.log(`  💡 Recommendations: ${geminiAnalysis.recommendations?.length || 0}`);
        } catch (error) {
          console.error(`❌ PHASE 3 Failed: Gemini analysis error:`, error);
          warnings.push(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        if (!analyzeWithGemini) {
          console.log(`⏭️ PHASE 3 Skipped: Gemini analysis disabled`);
          warnings.push('AI analysis disabled in configuration');
        } else if (!this.geminiService) {
          console.log(`⚠️ PHASE 3 Skipped: Gemini service not available (no API key?)`);
          warnings.push('AI analysis unavailable - Gemini API key not configured');
        } else if (snapshots.length === 0) {
          console.log(`⚠️ PHASE 3 Skipped: No snapshots to analyze`);
          warnings.push('AI analysis skipped - no snapshots captured');
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
        analysis: geminiAnalysis,
        warnings: warnings.length > 0 ? warnings : undefined
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
   * Execute a user action with error handling and timeouts
   */
  private async executeAction(page: Page, action: UserAction): Promise<void> {
    try {
      switch (action.type) {
        case 'navigate':
          if (action.url) {
            await page.goto(action.url, { timeout: 10000 });
          }
          break;
        case 'click':
          if (action.selector) {
            // Wait for the element to be available, but don't fail if it's not
            try {
              await page.waitForSelector(action.selector, { timeout: 3000 });
              await page.click(action.selector, { timeout: 3000 });
            } catch (error) {
              console.log(`    ⚠️ Click failed for selector "${action.selector}" - element may not exist during replay`);
            }
          }
          break;
        case 'fill':
          if (action.selector && action.value) {
            try {
              await page.waitForSelector(action.selector, { timeout: 3000 });
              await page.fill(action.selector, action.value, { timeout: 3000 });
            } catch (error) {
              console.log(`    ⚠️ Fill failed for selector "${action.selector}" - element may not exist during replay`);
            }
          }
          break;
        case 'select':
          if (action.selector && action.value) {
            try {
              await page.waitForSelector(action.selector, { timeout: 3000 });
              await page.selectOption(action.selector, action.value, { timeout: 3000 });
            } catch (error) {
              console.log(`    ⚠️ Select failed for selector "${action.selector}" - element may not exist during replay`);
            }
          }
          break;
        case 'scroll':
          await page.evaluate(() => window.scrollBy(0, 300));
          break;
        case 'hover':
          if (action.selector) {
            try {
              await page.waitForSelector(action.selector, { timeout: 3000 });
              await page.hover(action.selector, { timeout: 3000 });
            } catch (error) {
              console.log(`    ⚠️ Hover failed for selector "${action.selector}" - element may not exist during replay`);
            }
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
    } catch (error) {
      console.log(`    ⚠️ Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }/**
   * Capture accessibility snapshot
   */
  private async captureSnapshot(
    page: Page,
    stepNumber: number,
    action: UserAction,
    domChangeDetails: DOMChangeDetails,
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
      domChangeType: domChangeDetails.type,
      domChangeDetails: domChangeDetails,
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
    snapshot.files.html = htmlFile;    // Run axe accessibility analysis
    console.log(`      🔍 Running Axe accessibility scan...`);
    try {
      const axeResults = await new AxeBuilder({ page }).analyze();
      
      // Store only violations for LLM analysis (violations are the actionable issues)
      snapshot.axeResults = axeResults.violations || [];
      
      const violationCount = axeResults.violations?.length || 0;
      const passCount = axeResults.passes?.length || 0;
      const incompleteCount = axeResults.incomplete?.length || 0;
      
      console.log(`      ✅ Axe scan complete: ${violationCount} violations, ${passCount} passes, ${incompleteCount} incomplete`);
      console.log(`      📋 Sending ${violationCount} violations to LLM for analysis`);
      
      // Save full results to file for debugging/reference
      const axeResultsFile = path.join(stepDir, 'axe_results.json');
      await writeFile(axeResultsFile, JSON.stringify(axeResults, null, 2));
      snapshot.files.axeResults = axeResultsFile;
    } catch (error) {
      console.warn(`      ❌ Axe analysis failed:`, error);
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
        domChangeType: snapshot.domChangeType,
        domChanges: snapshot.domChangeDetails.description,
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
  }  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    this.domChangeDetector.reset();
    this.previousHtmlState = null;
  }
}

/**
 * DOM Change Detection utility
 */
class DOMChangeDetector {
  private previousState: {
    url: string;
    title: string;
    elementCount: number;
    bodyHTML: string;
  } | null = null;

  /**
   * Detect and categorize DOM changes
   */
  async detectChanges(page: Page, action: UserAction): Promise<DOMChangeDetails> {
    const currentState = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      elementCount: document.querySelectorAll('*').length,
      bodyHTML: document.body.innerHTML
    }));

    if (!this.previousState) {
      // First time - initialize
      this.previousState = currentState;
      return {
        type: 'navigation',
        significant: true,
        elementsAdded: currentState.elementCount,
        elementsRemoved: 0,
        elementsModified: 0,
        urlChanged: false,
        titleChanged: false,
        description: 'Initial page load'
      };
    }

    // Compare states
    const urlChanged = this.previousState.url !== currentState.url;
    const titleChanged = this.previousState.title !== currentState.title;
    const elementCountDiff = currentState.elementCount - this.previousState.elementCount;
    const bodyChanged = this.previousState.bodyHTML !== currentState.bodyHTML;

    // Determine change type and significance
    let changeType: DOMChangeType;
    let significant = false;
    let description = '';

    if (urlChanged) {
      changeType = 'navigation';
      significant = true;
      description = 'Navigation to new page';
    } else if (!bodyChanged) {
      changeType = 'none';
      description = 'No DOM changes detected';
    } else if (Math.abs(elementCountDiff) > 10 || titleChanged) {
      changeType = 'content';
      significant = true;
      description = `Significant content change (${elementCountDiff > 0 ? '+' : ''}${elementCountDiff} elements)`;
    } else if (Math.abs(elementCountDiff) > 0) {
      changeType = 'interaction';
      significant = elementCountDiff > 2;
      description = `Interactive change (${elementCountDiff > 0 ? '+' : ''}${elementCountDiff} elements)`;
    } else {
      changeType = 'layout';
      significant = false;
      description = 'Layout or style changes only';
    }

    const changeDetails: DOMChangeDetails = {
      type: changeType,
      significant,
      elementsAdded: Math.max(0, elementCountDiff),
      elementsRemoved: Math.max(0, -elementCountDiff),
      elementsModified: bodyChanged ? 1 : 0,
      urlChanged,
      titleChanged,
      description
    };

    // Update state for next comparison
    this.previousState = currentState;

    return changeDetails;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.previousState = null;
  }
}

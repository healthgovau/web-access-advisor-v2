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
      sessionId: providedSessionId,
      captureScreenshots = true,
      waitForStability = true,
      analyzeWithGemini = true,
      outputDir = './snapshots',
      onProgress
    } = options;

    // Use provided sessionId or generate a new one
    const sessionId = providedSessionId || this.generateSessionId();
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
          axeResults: [],
          warnings: ['No actions were recorded - analysis skipped']
        };
      }
      
      // Reset DOM change detector and HTML state for new session
      this.domChangeDetector.reset();
      this.previousHtmlState = null;

      console.log(`🔄 PHASE 2: Replaying actions and capturing snapshots...`);
      onProgress?.('replaying-actions', 'Replaying user actions in browser...', 0, actions.length, 0);

      // Replay each action and capture snapshots
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`Processing step ${i + 1}: ${action.type}`);

        // Update progress for current step
        onProgress?.('replaying-actions', `Replaying step ${i + 1}: ${action.type}`, i + 1, actions.length, snapshots.length);

        // Execute the action
        await this.executeAction(this.page, action);

        // Wait for stability if requested (with timeout)
        if (waitForStability) {
          try {
            console.log(`  Waiting for page stability...`);
            await this.page.waitForLoadState('networkidle', { timeout: 15000 });
            console.log(`  ✅ Page stabilized`);
          } catch (error) {
            console.warn(`  ⚠️ Page stability timeout - continuing anyway:`, error instanceof Error ? error.message : error);
            // Continue anyway - don't let this block the analysis
          }
        }

        // Detect DOM changes
        const domChangeDetails = await this.domChangeDetector.detectChanges(this.page, action);
        console.log(`  DOM Change: ${domChangeDetails.type} - ${domChangeDetails.description}`);        // Only capture snapshot if changes are significant or it's a navigation
        const shouldSnapshot = domChangeDetails.significant || 
                              domChangeDetails.type === 'navigation' ||
                              i === 0; // Always snapshot first step

        if (shouldSnapshot) {
          console.log(`  Capturing snapshot for significant ${domChangeDetails.type} change`);
          onProgress?.('capturing-snapshots', `Capturing snapshot ${snapshots.length + 1}`, snapshots.length + 1, actions.length, snapshots.length + 1);
          
          const snapshot = await this.captureSnapshot(
            this.page, 
            i + 1, 
            action,
            domChangeDetails,
            sessionDir,
            captureScreenshots
          );
          snapshots.push(snapshot);
          
          // Update progress with new snapshot count
          onProgress?.('replaying-actions', `Replaying step ${i + 1}: ${action.type}`, i + 1, actions.length, snapshots.length);
            // Store current HTML for next iteration's before/after comparison
          this.previousHtmlState = snapshot.html;
        } else {
          console.log(`  Skipping snapshot - no significant changes`);
          // Still update progress even if no snapshot
          onProgress?.('replaying-actions', `Replaying step ${i + 1}: ${action.type}`, i + 1, actions.length, snapshots.length);
        }
      }

      console.log(`🧠 PHASE 3: Running AI accessibility analysis...`);
      onProgress?.('running-accessibility-checks', 'Running automated accessibility checks...', snapshots.length, snapshots.length, snapshots.length);
      
      // Perform Gemini analysis if enabled and service available
      if (analyzeWithGemini && this.geminiService && snapshots.length > 0) {
        console.log(`🤖 Analyzing ${snapshots.length} snapshots with Gemini AI...`);
        onProgress?.('processing-with-ai', `Analyzing ${snapshots.length} snapshots with AI...`, undefined, undefined, snapshots.length);
        
        try {
          // Generate manifest first for flow analysis
          const tempManifest = await this.generateManifest(sessionId, actions, snapshots);
          
          // Use enhanced flow analysis for multiple snapshots
          geminiAnalysis = await this.geminiService.analyzeAccessibilityFlow(
            snapshots,
            tempManifest,
            {
              url: actions[0]?.url || 'unknown',
              sessionId,
              totalSteps: snapshots.length
            }
          );
          
          console.log(`✅ Gemini analysis completed - found ${geminiAnalysis?.components?.length || 0} accessibility issues`);
        } catch (error) {
          console.warn('❌ Gemini analysis failed:', error);
          geminiAnalysis = undefined;
          // Continue without Gemini analysis
        }
      } else if (!this.geminiService) {
        console.log(`⚠️ Gemini service not available - skipping AI analysis`);
      } else {
        console.log(`⚠️ No snapshots captured - skipping AI analysis`);
      }

      // Generate final report
      onProgress?.('generating-report', 'Generating final accessibility report...', undefined, undefined, snapshots.length);
      
      // Aggregate axe results from all snapshots
      const consolidatedAxeResults = await this.consolidateAxeResults(snapshots);
      
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
        axeResults: consolidatedAxeResults,
        debug: {
          llmLogs: geminiAnalysis?.debug ? [geminiAnalysis.debug] : []
        }
      };

    } catch (error) {
      return {
        success: false,
        sessionId,
        snapshotCount: 0,
        snapshots: [],
        manifest: {} as SessionManifest,
        axeResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a user action with timeout and error handling
   */
  private async executeAction(page: Page, action: UserAction): Promise<void> {
    try {
      console.log(`  Executing ${action.type} action...`);
      
      switch (action.type) {
        case 'navigate':
          if (action.url) {
            console.log(`    Navigating to: ${action.url}`);
            await page.goto(action.url, { timeout: 30000 });
          }
          break;
          
        case 'click':
          if (action.selector) {
            console.log(`    Clicking element: ${action.selector}`);
            
            // Check if element exists first
            const elementExists = await page.locator(action.selector).count();
            console.log(`    Element count for selector "${action.selector}": ${elementExists}`);
            
            if (elementExists === 0) {
              console.warn(`    ⚠️ Element not found: ${action.selector}`);
              // Try to get page info for debugging
              const url = page.url();
              const title = await page.title();
              console.log(`    Current page: ${url} - "${title}"`);
              return; // Skip this action
            }
            
            // Wait for element to be available, then click with timeout
            await page.waitForSelector(action.selector, { timeout: 10000 });
            await page.click(action.selector, { timeout: 10000 });
          }
          break;
          
        case 'fill':
          if (action.selector && action.value) {
            console.log(`    Filling input: ${action.selector} with "${action.value}"`);
            await page.waitForSelector(action.selector, { timeout: 10000 });
            await page.fill(action.selector, action.value, { timeout: 10000 });
          }
          break;
          
        case 'select':
          if (action.selector && action.value) {
            console.log(`    Selecting option: ${action.value} in ${action.selector}`);
            await page.waitForSelector(action.selector, { timeout: 10000 });
            await page.selectOption(action.selector, action.value, { timeout: 10000 });
          }
          break;
          
        case 'scroll':
          console.log(`    Scrolling page`);
          await page.evaluate(() => window.scrollBy(0, 300));
          break;
          
        case 'hover':
          if (action.selector) {
            console.log(`    Hovering over: ${action.selector}`);
            await page.waitForSelector(action.selector, { timeout: 10000 });
            await page.hover(action.selector, { timeout: 10000 });
          }
          break;
          
        case 'key':
          if (action.value) {
            console.log(`    Pressing key: ${action.value}`);
            await page.keyboard.press(action.value);
          }
          break;
          
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
      
      console.log(`  ✅ ${action.type} action completed successfully`);
      
    } catch (error) {
      console.warn(`  ⚠️ ${action.type} action failed:`, error instanceof Error ? error.message : error);
      // Don't throw - continue with analysis even if action fails
    }
  }  /**
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
  ): StepDetail['flowContext'] {
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

  /**
   * Consolidate axe results from all snapshots, removing duplicates and adding LLM recommendations
   */
  private async consolidateAxeResults(snapshots: SnapshotData[]): Promise<any[]> {
    const violationMap = new Map<string, any>();

    snapshots.forEach(snapshot => {
      if (snapshot.axeResults && Array.isArray(snapshot.axeResults)) {
        snapshot.axeResults.forEach(violation => {
          if (violation && violation.id) {
            const existingViolation = violationMap.get(violation.id);
            
            if (existingViolation) {
              // Merge nodes from duplicate violations
              const existingNodes = existingViolation.nodes || [];
              const newNodes = violation.nodes || [];
              
              // Deduplicate nodes by target selector
              const nodeMap = new Map();
              [...existingNodes, ...newNodes].forEach(node => {
                if (node && node.target) {
                  const targetKey = Array.isArray(node.target) ? node.target.join('|') : String(node.target);
                  nodeMap.set(targetKey, node);
                }
              });
              
              existingViolation.nodes = Array.from(nodeMap.values());
            } else {
              // First occurrence of this violation
              violationMap.set(violation.id, {
                ...violation,
                nodes: violation.nodes || []
              });
            }
          }
        });
      }
    });

    const violations = Array.from(violationMap.values());
    
    // Generate LLM recommendations if Gemini is available
    if (this.geminiService && violations.length > 0) {
      try {
        console.log(`🤖 Generating LLM recommendations for ${violations.length} axe violations...`);
        const recommendations = await this.geminiService.generateAxeRecommendations(violations);
        
        // Add recommendations to violations
        violations.forEach(violation => {
          const result = recommendations.get(violation.id);
          if (result) {
            violation.explanation = result.explanation;
            violation.recommendation = result.recommendation;
          }
        });
        
        console.log(`✅ Generated recommendations for ${recommendations.size}/${violations.length} violations`);
      } catch (error) {
        console.warn('Failed to generate LLM recommendations for axe violations:', error);
      }
    }

    // Return consolidated violations sorted by impact
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return violations.sort((a, b) => {
      const aOrder = impactOrder[a.impact as keyof typeof impactOrder] ?? 4;
      const bOrder = impactOrder[b.impact as keyof typeof impactOrder] ?? 4;
      return aOrder - bOrder;
    });
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

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
  DOMChangeDetails,
  ActionGroup,
  FlowStatistics,
  AnalysisBatch,
  ProgressiveContext,
  BatchSummary
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
      onProgress,
      llmComponentTimeout,
      llmFlowTimeout,
      staticSectionMode = 'ignore'
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
        onProgress?.('replaying-actions', `Replaying step ${i + 1}: ${action.type}`, i + 1, actions.length, snapshots.length);        // Execute the action
        await this.executeAction(this.page, action);

        // RELIABILITY: Wait for action to settle before snapshot capture
        await this.waitForActionSettlement(this.page, action);

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
        console.log(`  DOM Change: ${domChangeDetails.type} - ${domChangeDetails.description}`);

        // Enhanced snapshot decision logic with form input debouncing
        const shouldSnapshot = this.shouldCaptureSnapshot(action, domChangeDetails, i, actions);

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
        console.log(`🤖 Analyzing ${snapshots.length} snapshots with Gemini AI using hierarchical batching...`);
        onProgress?.('processing-with-ai', `Analyzing ${snapshots.length} snapshots with AI...`, undefined, undefined, snapshots.length);
        
        try {
          // Generate manifest first for flow analysis
          const tempManifest = await this.generateManifest(sessionId, actions, snapshots);
          
          // Use hierarchical batching with progressive context
          geminiAnalysis = await this.performHierarchicalAnalysis(
            snapshots,
            tempManifest,
            {
              url: actions[0]?.url || 'unknown',
              sessionId,
              totalSteps: snapshots.length
            },
            onProgress,
            { 
              llmComponentTimeout: options.llmComponentTimeout,
              llmFlowTimeout: options.llmFlowTimeout
            },
            staticSectionMode
          );
          
          console.log(`✅ Hierarchical Gemini analysis completed - found ${geminiAnalysis?.components?.length || 0} accessibility issues`);
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

      // After Gemini analysis is generated, assign step and url to each component if possible
      if (geminiAnalysis && Array.isArray(geminiAnalysis.components) && snapshots.length > 0) {
        // Build a lookup from step to url using the manifest (stepDetails)
        const manifest = await this.generateManifest(sessionId, actions, snapshots);
        const stepUrlMap = new Map<number, string>();
        for (const stepDetail of manifest.stepDetails) {
          stepUrlMap.set(stepDetail.step, stepDetail.url);
        }
        geminiAnalysis.components.forEach(component => {
          // Try to match the component to the correct snapshot step by selector or other context
          let matchedStep = undefined;
          if (component.selector) {
            // Try to find the most recent snapshot whose HTML contains the selector
            for (let i = snapshots.length - 1; i >= 0; i--) {
              const snap = snapshots[i];
              if (snap.html && snap.html.includes(component.selector.replace(/^[.#]/, ''))) {
                matchedStep = snap.step;
                break;
              }
            }
          }
          // Fallback: if not matched by selector, use the step from the manifest with the closest url
          if (!matchedStep && component.url) {
            for (let i = snapshots.length - 1; i >= 0; i--) {
              const snap = snapshots[i];
              if (snap.axeContext && snap.axeContext.url === component.url) {
                matchedStep = snap.step;
                break;
              }
            }
          }
          // If still not matched, fallback to the first snapshot
          if (!matchedStep) {
            matchedStep = snapshots[0].step;
          }
          component.step = matchedStep;
          component.url = stepUrlMap.get(matchedStep) || (snapshots[0].axeContext && snapshots[0].axeContext.url) || undefined;
        });
      }

      // Generate final report
      onProgress?.('generating-report', 'Generating final accessibility report...', undefined, undefined, snapshots.length);
      
      // Aggregate axe results from all snapshots
      const consolidatedAxeResults = await this.consolidateAxeResults(snapshots, { llmComponentTimeout });
      
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
   * Capture accessibility snapshot with retry logic for reliability
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

    // RELIABILITY: Validate page readiness before capture
    await this.validatePageReadiness(page);

    // RELIABILITY: Capture HTML with retry logic
    const htmlContent = await this.captureHtmlWithRetry(page);
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

    // RELIABILITY: Capture axe context with retry and validation
    const axeContext = await this.captureAxeContextWithRetry(page);
    
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

    console.log(`✅ Reliable snapshot captured for step ${stepNumber} - URL: ${axeContext.url}`);
    return snapshot;
  }

  /**
   * Validate page is ready for reliable snapshot capture
   */
  private async validatePageReadiness(page: Page): Promise<void> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const readiness = await page.evaluate(() => ({
          readyState: document.readyState,
          url: window.location.href,
          hasBody: !!document.body,
          bodyChildren: document.body?.children.length || 0
        }));
        
        if (readiness.readyState === 'complete' && readiness.hasBody && readiness.bodyChildren > 0) {
          console.log(`🔍 Page ready for capture: ${readiness.url}`);
          return;
        }
        
        console.log(`⏳ Page not ready (attempt ${attempt}/${maxAttempts}):`, readiness);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`⚠️ Page readiness check failed (attempt ${attempt}/${maxAttempts}):`, error);
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Capture HTML with retry logic for reliability
   */
  private async captureHtmlWithRetry(page: Page): Promise<string> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const html = await page.content();
        if (html && html.length > 100 && html.includes('<body')) {
          console.log(`✅ HTML captured successfully (${html.length} chars)`);
          return html;
        }
        console.warn(`⚠️ Invalid HTML captured (attempt ${attempt}/${maxAttempts}): length=${html.length}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`⚠️ HTML capture failed (attempt ${attempt}/${maxAttempts}):`, error);
        if (attempt === maxAttempts) {
          return '<html><head><title>HTML Capture Failed</title></head><body><p>Failed to capture HTML content</p></body></html>';
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return '';
  }

  /**
   * Capture axe context with retry and validation to prevent "Unknown" URLs
   */
  private async captureAxeContextWithRetry(page: Page): Promise<AxeContext> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const context = await page.evaluate(() => {
          return {
            include: [['html']],
            exclude: [],
            elementCount: document.querySelectorAll('*').length,
            title: document.title || 'Untitled',
            url: window.location.href
          };
        });
        
        // Validate captured context
        if (context.url && context.url !== 'about:blank' && context.elementCount > 0) {
          console.log(`✅ Valid axe context captured: ${context.url} (${context.elementCount} elements)`);
          return context;
        }
        
        console.warn(`⚠️ Invalid axe context (attempt ${attempt}/${maxAttempts}):`, {
          url: context.url,
          elementCount: context.elementCount,
          title: context.title
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`⚠️ Axe context capture failed (attempt ${attempt}/${maxAttempts}):`, error);
        if (attempt === maxAttempts) {
          // Return fallback context to prevent "Unknown" URLs
          return {
            include: [['html']],
            exclude: [],
            elementCount: 0,
            title: 'Context Capture Failed',
            url: 'unknown'
          };
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Final fallback
    return {
      include: [['html']],
      exclude: [],
      elementCount: 0,
      title: 'Context Capture Failed',
      url: 'unknown'
    };
  }

  /**
   * Generate enhanced session manifest with LLM optimizations
   */
  private async generateManifest(
    sessionId: string,
    actions: UserAction[],
    snapshots: SnapshotData[]
  ): Promise<SessionManifest> {
    // Create enhanced step details with all optimizations
    const enhancedStepDetails = await this.createEnhancedStepDetails(actions, snapshots);
    
    // Generate action groups for better LLM understanding
    const actionGroups = this.generateActionGroups(enhancedStepDetails);
    
    // Calculate flow statistics
    const flowStats = this.calculateFlowStatistics(enhancedStepDetails);

    const manifest: SessionManifest = {
      sessionId,
      url: actions.find(a => a.type === 'navigate')?.url || 'unknown',
      timestamp: new Date().toISOString(),
      totalSteps: snapshots.length,
      stepDetails: enhancedStepDetails,
      actionGroups,
      flowStatistics: flowStats,
      llmOptimizations: {
        authStepsFiltered: enhancedStepDetails.filter(s => s.isAuthRelated).length,
        relevantStepsForAnalysis: enhancedStepDetails.filter(s => !s.excludeFromAnalysis).length,
        totalTokenEstimate: enhancedStepDetails.reduce((sum, s) => sum + s.tokenEstimate, 0)
      }
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
  private async consolidateAxeResults(snapshots: SnapshotData[], timeoutOptions?: { llmComponentTimeout?: number }): Promise<any[]> {
    // Collect violations with deduplication by rule ID + target selector combination
    const violationMap = new Map<string, any>();
    
    snapshots.forEach(snapshot => {
      if (snapshot.axeResults && Array.isArray(snapshot.axeResults)) {
        snapshot.axeResults.forEach(violation => {
          // Create unique key for each violation based on rule ID and target elements
          const targets = violation.nodes?.map((node: any) => node.target?.join(' ') || '').join('|') || '';
          const uniqueKey = `${violation.id}:${targets}`;
          
          if (!violationMap.has(uniqueKey)) {
            // First occurrence of this violation - add it with step info
            violationMap.set(uniqueKey, {
              ...violation,
              step: snapshot.step,
              url: (snapshot.axeContext && snapshot.axeContext.url) || undefined,
              firstSeenStep: snapshot.step,
              stepOccurrences: [snapshot.step]
            });
          } else {
            // Duplicate violation - just track which steps it occurred in
            const existing = violationMap.get(uniqueKey);
            if (!existing.stepOccurrences.includes(snapshot.step)) {
              existing.stepOccurrences.push(snapshot.step);
            }
          }
        });
      }
    });

    const violations = Array.from(violationMap.values());
    console.log(`🔍 Consolidated ${violations.length} unique violations from ${snapshots.reduce((sum, s) => sum + (s.axeResults?.length || 0), 0)} total violations across ${snapshots.length} snapshots`);

    // Generate LLM recommendations if Gemini is available
    if (this.geminiService && violations.length > 0) {
      try {
        console.log(`🤖 Generating LLM recommendations for ${violations.length} axe violations...`);
        console.log(`🔍 Sample violation:`, violations[0]?.id, violations[0]?.help);
        const recommendations = await this.geminiService.generateAxeRecommendations(violations, timeoutOptions?.llmComponentTimeout);
        console.log(`📊 Received ${recommendations.size} recommendations from LLM`);
        
        // Add recommendations to violations
        violations.forEach(violation => {
          const result = recommendations.get(violation.id);
          if (result) {
            console.log(`✅ Adding LLM content for ${violation.id}:`, {
              hasExplanation: !!result.explanation,
              hasRecommendation: !!result.recommendation
            });
            violation.explanation = result.explanation;
            violation.recommendation = result.recommendation;
          } else {
            console.log(`❌ No LLM content found for ${violation.id}`);
          }
        });
        
        console.log(`✅ Generated recommendations for ${recommendations.size}/${violations.length} violations`);
      } catch (error) {
        console.warn('Failed to generate LLM recommendations for axe violations:', error);
      }
    } else {
      console.log(`⚠️ Skipping LLM recommendations: geminiService=${!!this.geminiService}, violations=${violations.length}`);
    }

    // Return consolidated violations sorted by impact
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return violations.sort((a, b) => {
      const aOrder = impactOrder[a.impact as keyof typeof impactOrder] ?? 4;
      const bOrder = impactOrder[b.impact as keyof typeof impactOrder] ?? 4;
      return aOrder - bOrder;
    });
  }

  /**
   * Determine if a snapshot should be captured with form input debouncing
   * Avoids capturing snapshots for intermediate form input states
   */
  private shouldCaptureSnapshot(
    action: UserAction,
    domChangeDetails: DOMChangeDetails,
    currentIndex: number,
    allActions: UserAction[]
  ): boolean {
    // Always snapshot first step
    if (currentIndex === 0) {
      return true;
    }

    // Always snapshot navigation changes
    if (domChangeDetails.type === 'navigation') {
      return true;
    }

    // Always snapshot significant changes
    if (domChangeDetails.significant) {
      return true;
    }

    // Form input debouncing logic - only snapshot final form state
    if (action.type === 'fill') {
      // Look ahead to see if there are more fill actions on the same element
      for (let i = currentIndex + 1; i < allActions.length; i++) {
        const nextAction = allActions[i];
        
        // If next action is also a fill on the same selector, skip this snapshot
        if (nextAction.type === 'fill' && nextAction.selector === action.selector) {
          console.log(`  Skipping fill snapshot - more fills coming for ${action.selector}`);
          return false;
        }
        
        // If we hit a non-fill action, this is the final fill state
        if (nextAction.type !== 'fill') {
          console.log(`  Capturing final fill state for ${action.selector}`);
          return true;
        }
        
        // If next fill is on different element, this is final for current element
        if (nextAction.type === 'fill' && nextAction.selector !== action.selector) {
          console.log(`  Capturing final fill state for ${action.selector} (different element next)`);
          return true;
        }
      }
      
      // If we're at the end of actions, capture this fill
      console.log(`  Capturing final fill state for ${action.selector} (end of actions)`);
      return true;
    }

    // For non-fill actions, use existing logic
    return domChangeDetails.significant;
  }

  /**
   * Wait for action to settle before capturing snapshot to ensure reliability
   */
  private async waitForActionSettlement(page: Page, action: UserAction): Promise<void> {
    const baseDelay = 500; // Base delay for all actions
    
    try {
      switch (action.type) {
        case 'navigate':
          // Navigation needs more time for page loads
          await new Promise(resolve => setTimeout(resolve, 1500));
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
          break;
          
        case 'click':
          // Clicks may trigger dynamic content loads
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
          
        case 'fill':
        case 'select':
          // Form inputs may trigger validation or dynamic updates
          await new Promise(resolve => setTimeout(resolve, 750));
          break;
          
        default:
          // Standard delay for other actions
          await new Promise(resolve => setTimeout(resolve, baseDelay));
      }
      
      // Additional wait for any pending network requests to settle
      try {
        await page.waitForLoadState('networkidle', { timeout: 3000 });
      } catch (error) {
        // Network idle timeout is not critical - continue
        console.log(`  Network idle timeout for ${action.type} - continuing`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Action settlement failed for ${action.type}:`, error);
      // Don't fail - just continue with snapshot capture
    }
  }

  /**
   * Create enhanced step details with all LLM optimizations
   */
  private async createEnhancedStepDetails(actions: UserAction[], snapshots: SnapshotData[]): Promise<StepDetail[]> {
    const enhancedSteps: StepDetail[] = [];
    
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const action = actions[i];
      const previousSnapshot = i > 0 ? snapshots[i - 1] : null;
      const nextSnapshot = i < snapshots.length - 1 ? snapshots[i + 1] : null;
      
      // Determine flow type based on URL
      const flowType = this.determineFlowType(snapshot.axeContext?.url || '');
      
      // Check if this is auth-related
      const isAuthRelated = this.isAuthenticationStep(snapshot.axeContext?.url || '');
      
      // Generate DOM change summary
      const domChangeSummary = await this.generateDOMChangeSummary(snapshot, previousSnapshot);
      
      // Generate accessibility context
      const accessibilityContext = await this.generateAccessibilityContext(snapshot);
      
      const enhancedStep: StepDetail = {
        step: snapshot.step,
        parentStep: this.determineParentStep(action, actions, i),
        action: snapshot.action,
        actionType: this.determineActionType(action),
        interactionTarget: action?.selector,
        flowContext: this.determineFlowContext(action, actions, i),
        uiState: this.determineUIState(action, actions, i),
        timestamp: snapshot.timestamp,
        htmlFile: path.basename(snapshot.files.html),
        axeFile: path.basename(snapshot.files.axeContext),
        axeResultsFile: path.basename(snapshot.files.axeResults),
        screenshotFile: snapshot.files.screenshot ? path.basename(snapshot.files.screenshot) : undefined,
        url: snapshot.axeContext?.url || 'unknown',
        domChangeType: snapshot.domChangeType,
        domChanges: snapshot.domChangeDetails.description,
        tokenEstimate: this.estimateTokens(snapshot),
        
        // Enhanced fields
        previousStep: previousSnapshot?.step,
        nextStep: nextSnapshot?.step,
        isAuthRelated,
        excludeFromAnalysis: isAuthRelated || flowType === 'error_flow',
        skipReason: isAuthRelated ? 'Authentication flow - not relevant for UI accessibility' : 
                   flowType === 'error_flow' ? 'Error page - not part of main user flow' : undefined,
        flowType,
        domChangeSummary,
        accessibilityContext
      };
      
      enhancedSteps.push(enhancedStep);
    }
    
    return enhancedSteps;
  }

  /**
   * Determine flow type based on URL patterns
   */
  private determineFlowType(url: string): 'main_app' | 'auth_flow' | 'error_flow' | 'external_redirect' {
    if (!url || url === 'unknown') return 'external_redirect';
    
    // Auth flow patterns
    const authPatterns = [
      'b2clogin.com',
      'auth.identity.gov.au',
      'myid.gov.au',
      'sts.development.health.gov.au',
      '/oauth/',
      '/authorize',
      '/signin',
      '/login',
      'AuthSpa.UI'
    ];
    
    // Error flow patterns
    const errorPatterns = [
      '/error',
      '/exception',
      'hangup.php',
      'GlobalException'
    ];
    
    // Check for auth patterns
    if (authPatterns.some(pattern => url.includes(pattern))) {
      return 'auth_flow';
    }
    
    // Check for error patterns
    if (errorPatterns.some(pattern => url.includes(pattern))) {
      return 'error_flow';
    }
    
    // Check if it's the main app domain
    if (url.includes('hbsp-test.powerappsportals.com')) {
      return 'main_app';
    }
    
    return 'external_redirect';
  }

  /**
   * Check if step is authentication-related
   */
  private isAuthenticationStep(url: string): boolean {
    return this.determineFlowType(url) === 'auth_flow';
  }

  /**
   * Generate DOM change summary for LLM analysis
   */
  private async generateDOMChangeSummary(
    current: SnapshotData, 
    previous: SnapshotData | null
  ): Promise<StepDetail['domChangeSummary']> {
    const summary = {
      elementsAdded: current.domChangeDetails.elementsAdded,
      elementsRemoved: current.domChangeDetails.elementsRemoved,
      ariaChanges: [] as string[],
      focusChanges: undefined as string | undefined,
      liveRegionUpdates: [] as string[],
      significantChange: current.domChangeDetails.significant
    };
    
    // Analyze ARIA changes (simplified - in production, you'd parse HTML)
    if (previous && current.html && previous.html) {
      // Check for common ARIA attribute changes
      const ariaPatterns = [
        { pattern: /aria-expanded="true"/, change: 'Element expanded' },
        { pattern: /aria-expanded="false"/, change: 'Element collapsed' },
        { pattern: /aria-hidden="true"/, change: 'Element hidden from screen readers' },
        { pattern: /aria-hidden="false"/, change: 'Element shown to screen readers' },
        { pattern: /role="alert"/, change: 'Alert role added' },
        { pattern: /aria-live="polite"/, change: 'Polite live region added' },
        { pattern: /aria-live="assertive"/, change: 'Assertive live region added' }
      ];
      
      for (const { pattern, change } of ariaPatterns) {
        if (pattern.test(current.html) && !pattern.test(previous.html)) {
          summary.ariaChanges.push(change);
        }
      }
      
      // Check for focus changes (simplified)
      const focusMatch = current.html.match(/autofocus|tabindex="0"|:focus/);
      if (focusMatch) {
        summary.focusChanges = 'Focus state detected in DOM';
      }
      
      // Check for live region updates
      if (current.html.includes('aria-live') && current.html !== previous.html) {
        summary.liveRegionUpdates.push('Live region content potentially updated');
      }
    }
    
    return summary;
  }

  /**
   * Generate accessibility context for screen reader analysis
   */
  private async generateAccessibilityContext(
    snapshot: SnapshotData
  ): Promise<StepDetail['accessibilityContext']> {
    const context = {
      focusedElement: undefined as string | undefined,
      screenReaderAnnouncements: [] as string[],
      keyboardNavigationState: 'default',
      modalState: 'none' as 'none' | 'open' | 'closing',
      dynamicContentUpdates: false,
      ariaLiveRegions: [] as string[]
    };
    
    if (snapshot.html) {
      // Detect focused elements
      const focusMatch = snapshot.html.match(/<[^>]+(?:autofocus|tabindex="0")[^>]*>/);
      if (focusMatch) {
        context.focusedElement = focusMatch[0];
      }
      
      // Detect modal state
      if (snapshot.html.includes('role="dialog"') || snapshot.html.includes('modal')) {
        context.modalState = 'open';
      }
      
      // Detect live regions
      const liveRegionMatches = snapshot.html.match(/<[^>]+aria-live="[^"]+"/g);
      if (liveRegionMatches) {
        context.ariaLiveRegions = liveRegionMatches;
      }
      
      // Detect dynamic updates
      context.dynamicContentUpdates = snapshot.domChangeDetails.significant;
      
      // Infer keyboard navigation state
      if (snapshot.action === 'fill' || snapshot.action === 'select') {
        context.keyboardNavigationState = 'form_interaction';
      } else if (snapshot.action === 'click') {
        context.keyboardNavigationState = 'button_interaction';
      }
      
      // Generate screen reader announcements (inferred)
      if (snapshot.domChangeDetails.type === 'navigation') {
        context.screenReaderAnnouncements.push('Page navigation completed');
      }
      if (context.ariaLiveRegions.length > 0) {
        context.screenReaderAnnouncements.push('Dynamic content update detected');
      }
    }
    
    return context;
  }

  /**
   * Generate action groups for better LLM understanding
   */
  private generateActionGroups(stepDetails: StepDetail[]): ActionGroup[] {
    const groups: ActionGroup[] = [];
    let currentGroup: number[] = [];
    let currentFlowType: string = '';
    let groupCounter = 1;
    
    for (const step of stepDetails) {
      if (step.flowType !== currentFlowType) {
        // Finish current group
        if (currentGroup.length > 0) {
          groups.push({
            groupId: `${currentFlowType}_${groupCounter}`,
            steps: currentGroup,
            description: this.getFlowDescription(currentFlowType as any),
            flowType: currentFlowType as any,
            relevantForAnalysis: currentFlowType === 'main_app',
            tokenEstimate: currentGroup.reduce((sum, stepNum) => {
              const stepDetail = stepDetails.find(s => s.step === stepNum);
              return sum + (stepDetail?.tokenEstimate || 0);
            }, 0)
          });
        }
        
        // Start new group
        currentGroup = [step.step];
        currentFlowType = step.flowType;
        groupCounter++;
      } else {
        currentGroup.push(step.step);
      }
    }
    
    // Add final group
    if (currentGroup.length > 0) {
      groups.push({
        groupId: `${currentFlowType}_${groupCounter}`,
        steps: currentGroup,
        description: this.getFlowDescription(currentFlowType as any),
        flowType: currentFlowType as any,
        relevantForAnalysis: currentFlowType === 'main_app',
        tokenEstimate: currentGroup.reduce((sum, stepNum) => {
          const stepDetail = stepDetails.find(s => s.step === stepNum);
          return sum + (stepDetail?.tokenEstimate || 0);
        }, 0)
      });
    }
    
    return groups;
  }

  /**
   * Get human-readable description for flow types
   */
  private getFlowDescription(flowType: 'main_app' | 'auth_flow' | 'error_flow' | 'external_redirect'): string {
    switch (flowType) {
      case 'main_app': return 'Primary application functionality';
      case 'auth_flow': return 'Authentication and authorization flow';
      case 'error_flow': return 'Error handling and error pages';
      case 'external_redirect': return 'External site redirects and third-party services';
      default: return 'Unknown flow type';
    }
  }

  /**
   * Calculate flow statistics for LLM context
   */
  private calculateFlowStatistics(stepDetails: StepDetail[]): FlowStatistics {
    return {
      totalSteps: stepDetails.length,
      authSteps: stepDetails.filter(s => s.flowType === 'auth_flow').length,
      mainAppSteps: stepDetails.filter(s => s.flowType === 'main_app').length,
      errorSteps: stepDetails.filter(s => s.flowType === 'error_flow').length,
      significantDOMChanges: stepDetails.filter(s => s.domChangeSummary.significantChange).length,
      accessibilityEvents: stepDetails.filter(s => 
        s.accessibilityContext.ariaLiveRegions.length > 0 || 
        s.accessibilityContext.screenReaderAnnouncements.length > 0
      ).length
    };
  }

  /**
   * Perform hierarchical analysis with progressive context extraction
   * Groups snapshots by flow type, splits by token count, and maintains progressive summaries
   */
  private async performHierarchicalAnalysis(
    snapshots: SnapshotData[],
    manifest: SessionManifest,
    sessionContext: { url: string; sessionId: string; totalSteps: number },
    onProgress?: (phase: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report', message: string, step?: number, total?: number, snapshotCount?: number) => void,
    timeoutOptions?: { llmComponentTimeout?: number; llmFlowTimeout?: number },
    staticSectionMode: 'include' | 'ignore' | 'separate' = 'ignore'
  ): Promise<GeminiAnalysis> {
    if (!this.geminiService) {
      throw new Error('Gemini service not available');
    }

    console.log(`🧠 Starting hierarchical analysis with ${snapshots.length} snapshots`);
    
    // Group snapshots by flow type for hierarchical processing
    const flowGroups = this.groupSnapshotsByFlowType(snapshots, manifest);
    console.log(`📊 Created ${flowGroups.length} flow groups:`, flowGroups.map(g => `${g.flowType}(${g.snapshots.length})`));

    // Split groups by token limits and create batches
    const batches = this.createAnalysisBatches(flowGroups, 8000); // Reserve space for progressive summary
    console.log(`📦 Created ${batches.length} analysis batches`);

    // Progressive context accumulation
    let progressiveSummary = '';
    const batchResults: GeminiAnalysis[] = [];
    const allComponents: any[] = [];
    const debugLogs: string[] = [];

    // Process each batch with progressive context
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Processing batch ${i + 1}/${batches.length}: ${batch.flowType} (${batch.snapshots.length} snapshots, ~${batch.tokenCount} tokens)`);
      
      onProgress?.('processing-with-ai', `Analyzing batch ${i + 1}/${batches.length}: ${batch.flowType}`, i + 1, batches.length, undefined);

      try {
        // Prepare batch context with progressive summary
        const batchContext = {
          ...sessionContext,
          batchNumber: i + 1,
          totalBatches: batches.length,
          flowType: batch.flowType,
          progressiveSummary: progressiveSummary || 'This is the first batch - no previous context available.',
          batchDescription: `${batch.flowType} flow analysis`
        };

        // Prepare progressive context for this batch
        const progressiveContext: ProgressiveContext = {
          previousBatchSummaries: batchResults.map(result => ({
            batchId: `batch_${batchResults.indexOf(result)}`,
            flowType: result.summary || 'unknown',
            stepRange: { start: 1, end: 10 }, // Approximate - could be more precise
            keyFindings: result.recommendations || [],
            criticalIssues: result.components?.filter(c => c.impact === 'critical') || [],
            contextForNext: {
              flowState: 'analyzed',
              uiState: 'default',
              accessibilityPattern: result.components?.length ? 'issues_found' : 'clean'
            }
          })),
          currentBatchMetadata: {
            batchId: batch.batchId,
            flowType: batch.flowType,
            stepRange: { 
              start: batch.snapshots[0]?.step || 1, 
              end: batch.snapshots[batch.snapshots.length - 1]?.step || 1 
            },
            batchIndex: batch.batchIndex,
            totalBatches: batch.totalBatches
          },
          overallContext: {
            sessionId: sessionContext.sessionId,
            url: sessionContext.url,
            totalSteps: sessionContext.totalSteps,
            flowTypes: batches.map(b => b.flowType)
          }
        };

        // Call Gemini with current batch + progressive context
        const batchResult = await this.geminiService.analyzeAccessibilityFlow(
          batch.snapshots,
          manifest,
          batchContext,
          progressiveContext,
          timeoutOptions?.llmFlowTimeout,
          staticSectionMode === 'ignore' || staticSectionMode === 'separate' // Filter static sections for 'ignore' and 'separate' modes
        );

        console.log(`✅ Batch ${i + 1} analysis completed:`, {
          components: batchResult.components?.length || 0,
          hasSummary: !!batchResult.summary
        });

        // Accumulate results
        batchResults.push(batchResult);
        if (batchResult.components) {
          allComponents.push(...batchResult.components);
        }
        
        // Update progressive summary for next batch (use the main summary)
        if (batchResult.summary) {
          if (progressiveSummary) {
            progressiveSummary += `\n\n--- Previous Analysis Summary ---\n${progressiveSummary}\n\n--- Latest Batch Summary ---\n${batchResult.summary}`;
          } else {
            progressiveSummary = batchResult.summary;
          }
          
          // Trim progressive summary if it gets too long (keep last 2000 chars)
          if (progressiveSummary.length > 2000) {
            progressiveSummary = '...(previous context truncated)...\n' + progressiveSummary.slice(-2000);
          }
        }

        // Collect debug info
        if (batchResult.debug) {
          debugLogs.push(`Batch ${i + 1}: ${batchResult.debug}`);
        }

      } catch (error) {
        console.warn(`❌ Batch ${i + 1} analysis failed:`, error);
        debugLogs.push(`Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with other batches
      }
    }

    // Handle "separate" mode - analyze static sections separately using content-based caching
    if (staticSectionMode === 'separate') {
      console.log(`🔄 Running separate static section analysis with caching...`);
      onProgress?.('processing-with-ai', 'Analyzing static sections separately (using content-based cache)...', undefined, undefined, undefined);
      
      try {
        // Collect unique static section content from all snapshots
        const uniqueStaticSections = new Set<string>();
        const staticSectionAnalysisPromises: Promise<any>[] = [];
        
        // Extract static sections from a representative sample of snapshots
        const sampleSnapshots = snapshots.filter((_: any, index: number) => index % 5 === 0); // Sample every 5th snapshot
        console.log(`� Sampling ${sampleSnapshots.length} snapshots from ${snapshots.length} total for static section extraction`);
        
        for (const snapshot of sampleSnapshots) {
          try {
            const htmlContent = snapshot.html || '';
            if (htmlContent) {
              const { staticSections } = this.geminiService.extractStaticSections(htmlContent);
              if (staticSections && staticSections.trim().length > 0) {
                const contentHash = this.geminiService.generateContentHash(staticSections);
                if (!uniqueStaticSections.has(contentHash)) {
                  uniqueStaticSections.add(contentHash);
                  
                  // Analyze this unique static section content
                  console.log(`🔍 Found unique static section content: ${contentHash}`);
                  const analysisPromise = this.geminiService.analyzeStaticSections(
                    staticSections,
                    snapshot.axeResults || [],
                    {
                      url: sessionContext.url,
                      action: `Static Section Analysis for step ${snapshot.step}`,
                      step: snapshot.step
                    },
                    timeoutOptions?.llmFlowTimeout
                  );
                  
                  staticSectionAnalysisPromises.push(analysisPromise);
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to extract static sections from snapshot ${snapshot.step}:`, error);
          }
        }
        
        console.log(`🔄 Analyzing ${staticSectionAnalysisPromises.length} unique static section variations...`);
        
        // Wait for all static section analyses to complete
        const staticSectionResults = await Promise.allSettled(staticSectionAnalysisPromises);
        
        // Collect all static section components
        staticSectionResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const components = result.value;
            if (components && components.length > 0) {
              // Mark these components as coming from static sections
              components.forEach((component: any) => {
                component.componentName = `[Static] ${component.componentName}`;
                component.explanation = `Static section accessibility issue: ${component.explanation}`;
              });
              allComponents.push(...components);
              console.log(`✅ Added ${components.length} static section components from analysis ${index + 1}`);
            }
          } else {
            console.warn(`❌ Static section analysis ${index + 1} failed:`, result.status === 'rejected' ? result.reason : 'Unknown error');
          }
        });
        
        console.log(`✅ Static section analysis completed: analyzed ${uniqueStaticSections.size} unique variations`);
        
      } catch (error) {
        console.warn(`⚠️ Static section analysis failed:`, error);
        // Continue without static section analysis
      }
    }

    console.log(`🔄 Running final cross-batch analysis...`);
    onProgress?.('processing-with-ai', 'Running final cross-batch analysis...', undefined, undefined, undefined);

    // Final consolidation pass to identify cross-batch issues
    let finalAnalysis: GeminiAnalysis;
    try {
      finalAnalysis = await this.consolidateBatchResults(
        batchResults,
        allComponents,
        progressiveSummary,
        manifest,
        sessionContext
      );
    } catch (error) {
      console.warn(`⚠️ Final consolidation failed, using batch results:`, error);
      // Fallback to combined batch results
      finalAnalysis = this.createFallbackAnalysis(batchResults, allComponents, debugLogs);
    }

    console.log(`✅ Hierarchical analysis completed:`, {
      totalBatches: batches.length,
      totalComponents: finalAnalysis.components?.length || 0,
      hasDebugInfo: !!finalAnalysis.debug
    });

    return finalAnalysis;
  }

  /**
   * Group snapshots by flow type for hierarchical processing
   */
  private groupSnapshotsByFlowType(snapshots: SnapshotData[], manifest: SessionManifest): Array<{
    flowType: string;
    description: string;
    snapshots: SnapshotData[];
    tokenEstimate: number;
  }> {
    const groups = new Map<string, {
      flowType: string;
      description: string;
      snapshots: SnapshotData[];
      tokenEstimate: number;
    }>();

    snapshots.forEach(snapshot => {
      // Find corresponding step detail to get flow type
      const stepDetail = manifest.stepDetails.find(s => s.step === snapshot.step);
      const flowType = stepDetail?.flowType || 'unknown';
      const description = stepDetail ? this.getFlowDescription(stepDetail.flowType as any) : 'Unknown flow';

      if (!groups.has(flowType)) {
        groups.set(flowType, {
          flowType,
          description,
          snapshots: [],
          tokenEstimate: 0
        });
      }

      const group = groups.get(flowType)!;
      group.snapshots.push(snapshot);
      group.tokenEstimate += this.estimateTokens(snapshot);
    });

    // Return groups sorted by relevance (main_app first)
    return Array.from(groups.values()).sort((a, b) => {
      if (a.flowType === 'main_app') return -1;
      if (b.flowType === 'main_app') return 1;
      return a.flowType.localeCompare(b.flowType);
    });
  }

  /**
   * Create analysis batches from flow groups, splitting large groups by token count
   */
  private createAnalysisBatches(
    flowGroups: Array<{ flowType: string; description: string; snapshots: SnapshotData[]; tokenEstimate: number }>,
    maxTokensPerBatch: number
  ): AnalysisBatch[] {
    const batches: AnalysisBatch[] = [];
    let globalBatchIndex = 0;

    // Calculate total number of batches first for totalBatches field
    let totalBatchCount = 0;
    flowGroups.forEach(group => {
      if (group.tokenEstimate <= maxTokensPerBatch) {
        totalBatchCount++;
      } else {
        // Estimate how many batches this group will be split into
        totalBatchCount += Math.ceil(group.tokenEstimate / maxTokensPerBatch);
      }
    });

    flowGroups.forEach(group => {
      if (group.tokenEstimate <= maxTokensPerBatch) {
        // Group fits in one batch
        batches.push({
          batchId: `${group.flowType}_batch_${globalBatchIndex}`,
          snapshots: group.snapshots,
          flowType: group.flowType as any, // Cast to match the expected union type
          tokenCount: group.tokenEstimate,
          batchIndex: globalBatchIndex,
          totalBatches: totalBatchCount
        });
        globalBatchIndex++;
      } else {
        // Split group into multiple batches
        console.log(`📦 Splitting large ${group.flowType} group (${group.tokenEstimate} tokens) into smaller batches`);
        
        let currentBatch: SnapshotData[] = [];
        let currentTokens = 0;
        let batchNumber = 1;

        group.snapshots.forEach(snapshot => {
          const snapshotTokens = this.estimateTokens(snapshot);
          
          if (currentTokens + snapshotTokens > maxTokensPerBatch && currentBatch.length > 0) {
            // Create batch from current accumulation
            batches.push({
              batchId: `${group.flowType}_part${batchNumber}_batch_${globalBatchIndex}`,
              snapshots: [...currentBatch],
              flowType: group.flowType as any, // Cast to match the expected union type
              tokenCount: currentTokens,
              batchIndex: globalBatchIndex,
              totalBatches: totalBatchCount
            });
            
            // Start new batch
            currentBatch = [snapshot];
            currentTokens = snapshotTokens;
            batchNumber++;
            globalBatchIndex++;
          } else {
            currentBatch.push(snapshot);
            currentTokens += snapshotTokens;
          }
        });

        // Add final batch if it has content
        if (currentBatch.length > 0) {
          batches.push({
            batchId: `${group.flowType}_part${batchNumber}_batch_${globalBatchIndex}`,
            snapshots: currentBatch,
            flowType: group.flowType as any, // Cast to match the expected union type
            tokenCount: currentTokens,
            batchIndex: globalBatchIndex,
            totalBatches: totalBatchCount
          });
          globalBatchIndex++;
        }
      }
    });

    return batches;
  }

  /**
   * Consolidate batch results into final analysis with cross-batch insights
   */
  private async consolidateBatchResults(
    batchResults: GeminiAnalysis[],
    allComponents: any[],
    progressiveSummary: string,
    manifest: SessionManifest,
    sessionContext: { url: string; sessionId: string; totalSteps: number }
  ): Promise<GeminiAnalysis> {
    if (!this.geminiService) {
      throw new Error('Gemini service not available');
    }

    console.log(`🔄 Consolidating ${batchResults.length} batch results with ${allComponents.length} total components`);

    // Instead of re-analyzing all snapshots, create a lightweight consolidation
    // This avoids token limit issues and focuses on cross-batch analysis
    
    // Deduplicate and merge components from all batches
    const componentMap = new Map();
    
    // Add components from all batches, deduplicating by selector + issue
    allComponents.forEach(comp => {
      const key = `${comp.componentName || comp.selector}-${comp.issue}`;
      if (!componentMap.has(key)) {
        componentMap.set(key, comp);
      } else {
        // If duplicate found, merge details (prefer more complete data)
        const existing = componentMap.get(key);
        if (comp.explanation && comp.explanation.length > existing.explanation?.length) {
          existing.explanation = comp.explanation;
        }
        if (comp.correctedCode && comp.correctedCode.length > existing.correctedCode?.length) {
          existing.correctedCode = comp.correctedCode;
        }
      }
    });
    
    const deduplicatedComponents = Array.from(componentMap.values());
    
    // Create consolidated summary from batch summaries
    const batchSummaries = batchResults.map(result => result.summary).filter(Boolean);
    const consolidatedSummary = batchSummaries.length > 0 
      ? `Cross-batch accessibility analysis completed across ${batchResults.length} flow segments. Key findings: ${batchSummaries.join('. ')}`
      : 'Hierarchical analysis completed with no significant issues found.';
    
    // Aggregate recommendations from all batches
    const allRecommendations = batchResults.flatMap(result => result.recommendations || []);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    // Calculate overall score based on batch scores
    const batchScores = batchResults.map(result => result.score).filter(score => typeof score === 'number');
    const overallScore = batchScores.length > 0 
      ? Math.round(batchScores.reduce((sum, score) => sum + score, 0) / batchScores.length)
      : 100;

    // Create final consolidated analysis without re-querying LLM
    const finalAnalysis: GeminiAnalysis = {
      summary: consolidatedSummary,
      components: deduplicatedComponents,
      recommendations: uniqueRecommendations,
      score: overallScore,
      debug: {
        type: 'flow',
        prompt: `Hierarchical consolidation: ${batchResults.length} batches processed`,
        response: `Consolidated ${deduplicatedComponents.length} unique components from ${allComponents.length} total findings`,
        promptSize: 0,
        responseSize: consolidatedSummary.length,
        htmlSize: 0,
        axeResultsCount: 0,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Consolidation completed: ${deduplicatedComponents.length} unique components, score: ${overallScore}`);
    
    return finalAnalysis;
  }

  /**
   * Create fallback analysis if consolidation fails
   */
  private createFallbackAnalysis(
    batchResults: GeminiAnalysis[],
    allComponents: any[],
    debugLogs: string[]
  ): GeminiAnalysis {
    return {
      summary: `Hierarchical analysis completed across ${batchResults.length} batches. Some batch results may be incomplete due to processing errors.`,
      components: allComponents,
      recommendations: batchResults.flatMap(r => r.recommendations || []),
      score: Math.min(...batchResults.map(r => r.score).filter(s => typeof s === 'number')) || 50,
      debug: {
        type: 'flow',
        prompt: `Hierarchical batching: ${batchResults.length} batches processed`,
        response: debugLogs.join('\n'),
        promptSize: 0,
        responseSize: debugLogs.join('\n').length,
        htmlSize: 0,
        axeResultsCount: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  // ...existing code...
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

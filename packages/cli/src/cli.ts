#!/usr/bin/env node
/**
 * Web Access Advisor CLI
 * Command-line interface for accessibility testing in pipelines
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AccessibilityAnalyzer } from '../../core/dist/analyzer.js';
import { UserAction, AnalysisOptions } from '../../core/dist/types.js';
import { promises as fs } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('web-access-advisor')
  .description('Accessibility testing tool for web applications')
  .version('0.0.0');

program
  .command('analyze')
  .description('Analyze a URL for accessibility issues')
  .requiredOption('-u, --url <url>', 'URL to analyze')
  .option('-o, --output <dir>', 'Output directory for reports', './accessibility-reports')
  .option('--no-screenshots', 'Disable screenshot capture')
  .option('--no-gemini', 'Disable Gemini AI analysis')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting accessibility analysis...'));
      console.log(chalk.gray(`URL: ${options.url}`));
      console.log(chalk.gray(`Output: ${options.output}`));

      const analyzer = new AccessibilityAnalyzer();
      await analyzer.initialize();

      // Create basic navigation action
      const actions: UserAction[] = [{
        type: 'navigate',
        url: options.url,
        timestamp: new Date().toISOString(),
        step: 1
      }];

      const analysisOptions: AnalysisOptions = {
        captureScreenshots: options.screenshots,
        analyzeWithGemini: options.gemini,
        outputDir: options.output
      };

      const result = await analyzer.analyzeActions(actions, analysisOptions);

      if (result.success) {
        console.log(chalk.green('✅ Analysis completed successfully!'));
        console.log(chalk.gray(`Session ID: ${result.sessionId}`));
        console.log(chalk.gray(`Snapshots captured: ${result.snapshotCount}`));
        
        // Generate summary report
        await generateSummaryReport(result, options.output);
        
        console.log(chalk.blue(`📊 Reports generated in: ${options.output}`));
      } else {
        console.error(chalk.red('❌ Analysis failed:'), result.error);
        process.exit(1);
      }

      await analyzer.cleanup();

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('replay')
  .description('Replay recorded actions and analyze')
  .requiredOption('-f, --file <file>', 'JSON file with recorded actions')
  .option('-o, --output <dir>', 'Output directory for reports', './accessibility-reports')
  .option('--no-screenshots', 'Disable screenshot capture')
  .option('--no-gemini', 'Disable Gemini AI analysis')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔄 Replaying recorded actions...'));
      
      // Load actions from file
      const actionsContent = await fs.readFile(options.file, 'utf-8');
      const actions: UserAction[] = JSON.parse(actionsContent);
      
      console.log(chalk.gray(`Loaded ${actions.length} actions from ${options.file}`));

      const analyzer = new AccessibilityAnalyzer();
      await analyzer.initialize();

      const analysisOptions: AnalysisOptions = {
        captureScreenshots: options.screenshots,
        analyzeWithGemini: options.gemini,
        outputDir: options.output
      };

      const result = await analyzer.analyzeActions(actions, analysisOptions);

      if (result.success) {
        console.log(chalk.green('✅ Replay analysis completed!'));
        console.log(chalk.gray(`Session ID: ${result.sessionId}`));
        console.log(chalk.gray(`Snapshots captured: ${result.snapshotCount}`));
        
        await generateSummaryReport(result, options.output);
        console.log(chalk.blue(`📊 Reports generated in: ${options.output}`));
      } else {
        console.error(chalk.red('❌ Replay failed:'), result.error);
        process.exit(1);
      }

      await analyzer.cleanup();

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Generate summary report
 */
async function generateSummaryReport(result: any, outputDir: string): Promise<void> {
  const reportPath = path.join(outputDir, 'summary.json');
  
  const summary = {
    sessionId: result.sessionId,
    timestamp: new Date().toISOString(),
    success: result.success,
    snapshotCount: result.snapshotCount,
    manifest: result.manifest,
    analysis: result.analysis || null
  };

  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
  console.log(chalk.gray(`Summary report: ${reportPath}`));
}

// Parse command line arguments
program.parse();

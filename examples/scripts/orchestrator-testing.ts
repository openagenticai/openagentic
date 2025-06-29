import 'dotenv/config';

import { createAgent, allTools, allToolDescriptions, listOrchestrators, loadBuiltInOrchestrators } from '../../src';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface OrchestratorTestCase {
  orchestratorId: string;
  description: string;
  input: string;
  requiredTools: string[];
  expectedKeys: string[];
  skipIfMissingEnv?: string[];
  timeout?: number;
  orchestratorParams?: Record<string, any>;
}

interface OrchestratorTestResult {
  orchestratorId: string;
  orchestratorName: string;
  description: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
  toolsUsed?: string[];
  iterations?: number;
}

interface OrchestratorTestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  averageDuration: number;
  results: OrchestratorTestResult[];
  timestamp: string;
}

// =============================================================================
// TEST CASES CONFIGURATION
// =============================================================================

const ORCHESTRATOR_TEST_CASES: OrchestratorTestCase[] = [
  // Video Creator Orchestrator
  {
    orchestratorId: 'video_creator',
    description: 'Video Creator Orchestrator - Create a short nature video',
    input: 'Create a beautiful 5-second video of a serene forest with sunlight filtering through trees and gentle wind movement.',
    requiredTools: ['web_search', 'anthropic_chat', 'gemini_chat', 'video_generator'],
    expectedKeys: ['success', 'result', 'toolCallsUsed', 'iterations'],
    skipIfMissingEnv: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME'],
    timeout: 300000, // 5 minutes for video generation
  },
  
  // Code Assessment Orchestrator
  {
    orchestratorId: 'code_assessment',
    description: 'Code Assessment Orchestrator - Analyze Bitcoin UI repository',
    input: 'Please analyze the Bitcoin UI repository at https://github.com/bitcoin-ui-kit/bitcoin-ui and provide a comprehensive code assessment report.',
    requiredTools: ['github_contents', 'anthropic_chat', 'gemini_chat', 'openai_text_generation'],
    expectedKeys: ['success', 'result', 'toolCallsUsed', 'iterations'],
    skipIfMissingEnv: ['GITHUB_TOKEN', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY'],
    timeout: 180000, // 3 minutes for code analysis
    orchestratorParams: {
      additionalPaths: ['src/components', 'src/components/__tests__'],
      provideDiff: true
    }
  },
  
  // News Specialist Orchestrator
  {
    orchestratorId: 'news_specialist',
    description: 'News Specialist Orchestrator - Creates accurate news articles',
    input: 'Please create an article covering the Starship 36 explosion at the Starbase launch facility shortly after 11pm on Wednesday June 18th, 2025 (0400 GMT Thursday, June 19th 2025).',
    requiredTools: ['perplexity_search', 'newsdata_search', 'gemini_chat', 'grok_chat', 'openai_image_generator', 'anthropic_chat', 'html_composer'],
    expectedKeys: ['success', 'result', 'toolCallsUsed', 'iterations'],
    skipIfMissingEnv: ['PERPLEXITY_API_KEY', 'NEWSDATA_API_KEY', 'GOOGLE_API_KEY', 'XAI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'],
    timeout: 240000, // 4 minutes for comprehensive article creation
  },
  
  // Flash Headlines Orchestrator
  {
    orchestratorId: 'flash_headlines',
    description: 'Flash Headlines Orchestrator - Generate top 10 news headlines with images',
    input: 'Generate the top 10 current technology news headlines with accompanying images',
    requiredTools: ['gemini_chat', 'gemini_image_generator'],
    expectedKeys: ['success', 'result', 'toolCallsUsed', 'iterations'],
    skipIfMissingEnv: ['GOOGLE_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME'],
    timeout: 180000, // 3 minutes for headline generation and images
  },

  // Enhanced Image Generation Orchestrator
  {
    orchestratorId: 'enhanced_image_generation',
    description: 'Enhanced Image Generation Orchestrator - Use GPT-4o to enhance prompts before generating images',
    input: 'Create a beautiful sunset landscape with mountains and a serene lake',
    requiredTools: ['openai_text_generation', 'openai_image_generator'],
    expectedKeys: ['success', 'result', 'toolCallsUsed', 'iterations'],
    skipIfMissingEnv: ['OPENAI_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'],
    timeout: 180000, // 3 minutes for prompt enhancement and image generation
  },
];

// =============================================================================
// ORCHESTRATOR TESTER CLASS
// =============================================================================

class OrchestratorTester {
  private results: OrchestratorTestResult[] = [];

  /**
   * Check if required environment variables are available
   */
  private checkEnvironmentVariables(envVars?: string[]): { available: boolean; missing: string[] } {
    if (!envVars || envVars.length === 0) {
      return { available: true, missing: [] };
    }

    const missing: string[] = [];
    for (const envVar of envVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return {
      available: missing.length === 0,
      missing
    };
  }

  /**
   * Find orchestrator by ID from available orchestrators
   */
  private findOrchestratorById(orchestratorId: string): any {
    // Load all built-in orchestrators first
    loadBuiltInOrchestrators();
    
    const orchestrators = listOrchestrators();
    const orchestrator = orchestrators.find(o => o.id === orchestratorId);
    
    if (!orchestrator) {
      const availableIds = orchestrators.map(o => o.id);
      throw new Error(`Orchestrator "${orchestratorId}" not found. Available orchestrators: ${availableIds.join(', ')}`);
    }
    
    return orchestrator;
  }

  /**
   * Get required tools for an orchestrator test case
   */
  private getRequiredTools(testCase: OrchestratorTestCase): any[] {
    const requiredTools: any[] = [];
    
    for (const toolId of testCase.requiredTools) {
      const tool = allTools.find(t => t.toolId === toolId);
      if (tool) {
        requiredTools.push(tool);
      } else {
        console.warn(`⚠️  Required tool "${toolId}" not found for orchestrator "${testCase.orchestratorId}"`);
      }
    }
    
    return requiredTools;
  }

  /**
   * Validate test result structure
   */
  private validateResult(result: any, expectedKeys: string[]): { valid: boolean; missing: string[] } {
    if (!result || typeof result !== 'object') {
      return { valid: false, missing: expectedKeys };
    }

    const missing: string[] = [];
    for (const key of expectedKeys) {
      if (!(key in result)) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Test a single orchestrator with given input
   */
  async testOrchestrator(testCase: OrchestratorTestCase): Promise<OrchestratorTestResult> {
    const startTime = performance.now();
    
    try {
      // Check environment variables
      const envCheck = this.checkEnvironmentVariables(testCase.skipIfMissingEnv);
      if (!envCheck.available) {
        return {
          orchestratorId: testCase.orchestratorId,
          orchestratorName: testCase.orchestratorId,
          description: testCase.description,
          success: false,
          duration: 0,
          skipped: true,
          skipReason: `Missing environment variables: ${envCheck.missing.join(', ')}`
        };
      }

      // Find the orchestrator
      const orchestrator = this.findOrchestratorById(testCase.orchestratorId);
      
      // Get required tools
      const requiredTools = this.getRequiredTools(testCase);
      
      if (requiredTools.length !== testCase.requiredTools.length) {
        const missingTools = testCase.requiredTools.filter(toolId => 
          !requiredTools.some(tool => tool.toolId === toolId)
        );
        return {
          orchestratorId: testCase.orchestratorId,
          orchestratorName: orchestrator.name,
          description: testCase.description,
          success: false,
          duration: 0,
          skipped: true,
          skipReason: `Missing required tools: ${missingTools.join(', ')}`
        };
      }

      // Create agent with orchestrator and required tools
      const agent = createAgent({
        model: 'gpt-4o-mini', // Use consistent model for testing
        orchestrator: testCase.orchestratorId,
        orchestratorParams: testCase.orchestratorParams,
        tools: requiredTools,
        enableDebugLogging: true,
        logLevel: 'basic',
        maxIterations: 15, // Allow more iterations for complex orchestrators
      });

      console.log(`🎭 Testing ${testCase.orchestratorId}: ${testCase.description}`);
      console.log(`📋 Using tools: ${requiredTools.map(t => t.name).join(', ')}`);
      
      // Execute the agent with timeout
      const timeoutMs = testCase.timeout || 120000; // Default 2 minutes
      const result = await Promise.race([
        agent.execute(testCase.input),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]) as any;
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Check if the agent execution was successful
      if (!result.success) {
        return {
          orchestratorId: testCase.orchestratorId,
          orchestratorName: orchestrator.name,
          description: testCase.description,
          success: false,
          duration,
          error: result.error || 'Agent execution failed'
        };
      }

      // Validate the result structure
      const validation = this.validateResult(result, testCase.expectedKeys);
      
      return {
        orchestratorId: testCase.orchestratorId,
        orchestratorName: orchestrator.name,
        description: testCase.description,
        success: validation.valid,
        duration,
        result: {
          // agentResult: typeof result.result === 'string' ? result.result.substring(0, 500) + '...' : result.result,
          agentResult: result.result,
          toolsUsed: result.toolCallsUsed || [],
          iterations: result.iterations || 0,
          hasExpectedKeys: validation.valid,
          missingKeys: validation.missing,
        },
        toolsUsed: result.toolCallsUsed?.map((tc: any) => tc.toolName || tc.toolId) || [],
        iterations: result.iterations || 0,
        error: validation.valid ? undefined : `Missing expected keys: ${validation.missing.join(', ')}`
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        orchestratorId: testCase.orchestratorId,
        orchestratorName: testCase.orchestratorId,
        description: testCase.description,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run all orchestrator test cases
   */
  async runAllTests(): Promise<OrchestratorTestSummary> {
    console.log('🚀 Starting OpenAgentic Orchestrator Testing Suite\n');
    console.log(`📋 Running ${ORCHESTRATOR_TEST_CASES.length} orchestrator test cases...\n`);

    this.results = [];

    for (let i = 0; i < ORCHESTRATOR_TEST_CASES.length; i++) {
      const testCase = ORCHESTRATOR_TEST_CASES[i];
      console.log(`\n[${i + 1}/${ORCHESTRATOR_TEST_CASES.length}] ${testCase.description}`);
      
      const result = await this.testOrchestrator(testCase);
      this.results.push(result);

      // Log result
      if (result.skipped) {
        console.log(`⏭️  Skipped: ${result.skipReason}`);
      } else if (result.success) {
        console.log(`✅ Passed in ${result.duration}ms`);
        console.log(`   🔧 Tools used: ${result.toolsUsed?.join(', ') || 'none'}`);
        console.log(`   🔄 Iterations: ${result.iterations || 0}`);
      } else {
        console.log(`❌ Failed in ${result.duration}ms: ${result.error}`);
      }

      // Add delay between tests to respect rate limits
      if (i < ORCHESTRATOR_TEST_CASES.length - 1) {
        console.log('⏳ Waiting 5 seconds between tests...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return this.generateSummary();
  }

  /**
   * Run a single test by orchestrator ID
   */
  async runSingleTest(orchestratorId: string): Promise<OrchestratorTestSummary> {
    const testCase = ORCHESTRATOR_TEST_CASES.find(tc => tc.orchestratorId === orchestratorId);
    if (!testCase) {
      const availableIds = ORCHESTRATOR_TEST_CASES.map(tc => tc.orchestratorId);
      throw new Error(`Test case for orchestrator "${orchestratorId}" not found. Available orchestrators: ${availableIds.join(', ')}`);
    }

    console.log(`🚀 Testing single orchestrator: ${orchestratorId}\n`);
    console.log(`📋 ${testCase.description}\n`);

    const result = await this.testOrchestrator(testCase);
    this.results = [result];

    // Log result
    if (result.skipped) {
      console.log(`⏭️  Skipped: ${result.skipReason}`);
    } else if (result.success) {
      console.log(`✅ Passed in ${result.duration}ms`);
      console.log(`   🔧 Tools used: ${result.toolsUsed?.join(', ') || 'none'}`);
      console.log(`   🔄 Iterations: ${result.iterations || 0}`);
    } else {
      console.log(`❌ Failed in ${result.duration}ms: ${result.error}`);
    }

    return this.generateSummary();
  }

  /**
   * Generate test summary and statistics
   */
  private generateSummary(): OrchestratorTestSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success && !r.skipped).length;
    const skipped = this.results.filter(r => r.skipped).length;
    
    const successfulTests = this.results.filter(r => r.success && !r.skipped);
    const averageDuration = successfulTests.length > 0 
      ? Math.round(successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length)
      : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      averageDuration,
      results: this.results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save test results to JSON file
   */
  async saveResults(summary: OrchestratorTestSummary, filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `orchestrator-test-results-${timestamp}.json`;
    const resultsDir = 'results';
    const finalFilename = filename || defaultFilename;
    const fullPath = `${resultsDir}/${finalFilename}`;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Create results directory if it doesn't exist
      try {
        await fs.access(resultsDir);
      } catch {
        await fs.mkdir(resultsDir, { recursive: true });
        console.log(`📁 Created results directory: ${resultsDir}`);
      }
      
      await fs.writeFile(fullPath, JSON.stringify(summary, null, 2));
      return fullPath;
    } catch (error) {
      console.error('❌ Failed to save results:', error);
      return '';
    }
  }

  /**
   * List all available orchestrators for testing
   */
  listAvailableOrchestrators(): void {
    console.log('📋 Available Orchestrators for Testing:\n');
    
    // Load built-in orchestrators first
    loadBuiltInOrchestrators();
    
    const orchestrators = listOrchestrators();
    const testCasesByOrchestrator = ORCHESTRATOR_TEST_CASES.reduce((acc, tc) => {
      acc[tc.orchestratorId] = tc;
      return acc;
    }, {} as Record<string, OrchestratorTestCase>);

    orchestrators.forEach((orchestrator, index) => {
      const hasTest = testCasesByOrchestrator[orchestrator.id];
      const status = hasTest ? '✅' : '❌';
      const envReqs = hasTest?.skipIfMissingEnv ? ` (requires: ${hasTest.skipIfMissingEnv.join(', ')})` : '';
      const requiredTools = hasTest?.requiredTools ? ` [tools: ${hasTest.requiredTools.join(', ')}]` : '';
      
      console.log(`${(index + 1).toString().padStart(2)}. ${status} ${orchestrator.id} - ${orchestrator.name}`);
      console.log(`      Type: ${orchestrator.type}${envReqs}${requiredTools}`);
      console.log(`      Description: ${orchestrator.description}`);
      console.log('');
    });

    const testedCount = Object.keys(testCasesByOrchestrator).length;
    const totalCount = orchestrators.length;
    
    console.log(`📊 Test Coverage: ${testedCount}/${totalCount} orchestrators (${Math.round(testedCount/totalCount*100)}%)`);
    
    // Show available tools
    console.log('\n🔧 Available Tools:');
    allToolDescriptions.forEach(tool => {
      console.log(`   • ${tool.toolId} - ${tool.name}`);
    });
  }
}

// =============================================================================
// CLI INTERFACE AND MAIN EXECUTION
// =============================================================================

function printUsage(): void {
  console.log(`
🎭 OpenAgentic Orchestrator Testing Suite

Usage:
  npm run test:orchestrators                            # Run all tests
  npm run test:orchestrators -- --orchestrator <id>    # Test specific orchestrator
  npm run test:orchestrators -- --list                 # List available orchestrators
  npm run test:orchestrators -- --help                 # Show this help

Examples:
  npm run test:orchestrators -- --orchestrator video_creator
  npm run test:orchestrators -- --orchestrator code_assessment
  npm run test:orchestrators -- --orchestrator flash_headlines
  npm run test:orchestrators -- --orchestrator enhanced_image_generation

Environment Variables Required:

# For Video Creator Orchestrator:
  OPENAI_API_KEY=your_openai_key          # For the base model
  ANTHROPIC_API_KEY=your_anthropic_key    # For creative direction
  GOOGLE_API_KEY=your_google_key          # For Veo video generation
  AWS_ACCESS_KEY_ID=your_aws_key          # For S3 storage
  AWS_SECRET_ACCESS_KEY=your_aws_secret   # For S3 storage
  AWS_REGION=us-east-1                    # AWS region
  S3_BUCKET_NAME=your-bucket-name         # S3 bucket for videos

# For Code Assessment Orchestrator:
  GITHUB_TOKEN=your_github_token          # For repository access
  ANTHROPIC_API_KEY=your_anthropic_key    # For code quality analysis
  GOOGLE_API_KEY=your_google_key          # For technical analysis
  OPENAI_API_KEY=your_openai_key          # For synthesis

# For News Specialist Orchestrator:
  PERPLEXITY_API_KEY=your_perplexity_key  # For fact-checking research
  NEWSDATA_API_KEY=your_newsdata_key      # For breaking news
  GOOGLE_API_KEY=your_google_key          # For Gemini analysis
  XAI_API_KEY=your_xai_key               # For Grok storytelling
  OPENAI_API_KEY=your_openai_key          # For image generation
  ANTHROPIC_API_KEY=your_anthropic_key    # For HTML formatting and content consolidation
  AWS_ACCESS_KEY_ID=your_aws_key          # For S3 storage (HTML reports)
  AWS_SECRET_ACCESS_KEY=your_aws_secret   # For S3 storage (HTML reports)
  AWS_REGION=us-east-1                    # AWS region
  S3_BUCKET_NAME=your-bucket-name         # S3 bucket for HTML reports

# For Flash Headlines Orchestrator:
  GOOGLE_API_KEY=your_google_key          # For Gemini headline generation and images
  AWS_ACCESS_KEY_ID=your_aws_key          # For S3 storage
  AWS_SECRET_ACCESS_KEY=your_aws_secret   # For S3 storage
  AWS_REGION=us-east-1                    # AWS region
  S3_BUCKET_NAME=your-bucket-name         # S3 bucket for images

# For Enhanced Image Generation Orchestrator:
  OPENAI_API_KEY=your_openai_key          # For GPT-4o prompt enhancement and image generation
  AWS_ACCESS_KEY_ID=your_aws_key          # For S3 storage
  AWS_SECRET_ACCESS_KEY=your_aws_secret   # For S3 storage
  AWS_REGION=us-east-1                    # AWS region
  S3_BUCKET_NAME=your-bucket-name         # S3 bucket for images

Note: These orchestrators are complex and may take several minutes to complete.
They involve multiple AI model calls and external service integrations.
`);
}

function printSummary(summary: OrchestratorTestSummary): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ORCHESTRATOR TEST SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`🎯 Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⏭️  Skipped: ${summary.skipped}`);
  console.log(`⏱️  Average Duration: ${summary.averageDuration}ms`);
  console.log(`📅 Completed: ${new Date(summary.timestamp).toLocaleString()}`);
  
  const successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);

  // Show detailed results
  console.log('\n📋 Detailed Results:');
  summary.results.forEach(result => {
    const status = result.skipped ? '⏭️ ' : result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.orchestratorId} (${result.duration}ms)`);
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      console.log(`      Tools: ${result.toolsUsed.join(', ')}`);
    }
    if (result.iterations) {
      console.log(`      Iterations: ${result.iterations}`);
    }
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (result.skipReason) {
      console.log(`      Skip Reason: ${result.skipReason}`);
    }
  });

  // Show failed tests
  const failedTests = summary.results.filter(r => !r.success && !r.skipped);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   • ${test.orchestratorId}: ${test.error}`);
    });
  }

  // Show skipped tests
  const skippedTests = summary.results.filter(r => r.skipped);
  if (skippedTests.length > 0) {
    console.log('\n⏭️  Skipped Tests:');
    skippedTests.forEach(test => {
      console.log(`   • ${test.orchestratorId}: ${test.skipReason}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const tester = new OrchestratorTester();

  try {
    // Parse command line arguments
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      return;
    }

    if (args.includes('--list') || args.includes('-l')) {
      tester.listAvailableOrchestrators();
      return;
    }

    const orchestratorFlag = args.indexOf('--orchestrator');
    if (orchestratorFlag !== -1 && args[orchestratorFlag + 1]) {
      // Test specific orchestrator
      const orchestratorId = args[orchestratorFlag + 1];
      const summary = await tester.runSingleTest(orchestratorId);
      printSummary(summary);
      
      // Save results
      const filename = await tester.saveResults(summary);
      if (filename) {
        console.log(`💾 Results saved to: ${filename}`);
      }
      return;
    }

    // Run all tests
    const summary = await tester.runAllTests();
    printSummary(summary);
    
    // Save results
    const filename = await tester.saveResults(summary);
    if (filename) {
      console.log(`💾 Results saved to: ${filename}`);
    }

    // Exit with appropriate code
    process.exit(!filename ? 1 : 0);

  } catch (error) {
    console.error('❌ Orchestrator testing failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { OrchestratorTester, ORCHESTRATOR_TEST_CASES };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
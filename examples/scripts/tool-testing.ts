import 'dotenv/config';

import { createAgent, allTools, allToolDescriptions } from '../../src';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface TestCase {
  toolId: string;
  description: string;
  parameters: Record<string, any>;
  expectedKeys: string[];
  skipIfMissingEnv?: string[];
}

interface TestResult {
  toolId: string;
  toolName: string;
  description: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  averageDuration: number;
  results: TestResult[];
  timestamp: string;
}

// =============================================================================
// TEST CASES CONFIGURATION
// =============================================================================

const TEST_CASES: TestCase[] = [
  // AI Chat Tools
  {
    toolId: 'openai_text_generation',
    description: 'OpenAI GPT creative story generation',
    parameters: {
      prompt: 'Write a very short story (3-4 sentences) about a robot discovering music for the first time.',
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 200
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['OPENAI_API_KEY']
  },
  {
    toolId: 'anthropic_chat',
    description: 'Anthropic Claude technical explanation',
    parameters: {
      prompt: 'Explain quantum computing in exactly 3 sentences.',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 150
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['ANTHROPIC_API_KEY']
  },
  {
    toolId: 'gemini_chat',
    description: 'Google Gemini multimodal understanding',
    parameters: {
      prompt: 'What is AI?',
      model: 'gemini-2.5-flash-lite-preview-06-17',
      temperature: 0.7,
      maxTokens: 1000
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['GOOGLE_API_KEY']
  },
  {
    toolId: 'grok_chat',
    description: 'xAI Grok creative writing with reasoning',
    parameters: {
      prompt: 'Write a creative explanation of why the sky is blue, suitable for a 10-year-old.',
      model: 'grok-3',
      temperature: 0.7,
      reasoningEffort: 'medium'
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['XAI_API_KEY']
  },
  {
    toolId: 'llama_chat',
    description: 'Meta Llama conversational AI on sustainability',
    parameters: {
      messages: [
        { role: 'system', content: 'You are an expert on environmental sustainability.' },
        { role: 'user', content: 'What are 3 simple ways individuals can reduce their carbon footprint?' }
      ],
      model: 'Llama-3.3-8B-Instruct',
      temperature: 0.6,
      maxTokens: 300
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['LLAMA_API_KEY']
  },
  {
    toolId: 'perplexity_search',
    description: 'Perplexity AI search for recent AI developments',
    parameters: {
      query: 'latest developments in artificial intelligence 2025',
      model: 'sonar-pro'
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['PERPLEXITY_API_KEY']
  },
  {
    toolId: 'web_search',
    description: 'OpenAI web search for current events',
    parameters: {
      query: 'climate change initiatives 2025'
    },
    expectedKeys: ['success', 'result', 'model', 'usage'],
    skipIfMissingEnv: ['OPENAI_API_KEY']
  },

  // Utility Tools
  {
    toolId: 'github_contents',
    description: 'GitHub repository content fetching',
    parameters: {
      owner: 'openai',
      repo: 'openai-node',
      path: 'README.md'
    },
    expectedKeys: ['success', 'type', 'repository', 'file'],
    skipIfMissingEnv: ['GITHUB_TOKEN']
  },
  {
    toolId: 'newsdata_search',
    description: 'NewsData IO search for technology news',
    parameters: {
      query: 'artificial intelligence technology breakthroughs',
      category: 'technology',
      language: 'en'
    },
    expectedKeys: ['success', 'query', 'articles', 'totalResults'],
    skipIfMissingEnv: ['NEWSDATA_API_KEY']
  },
  {
    toolId: 'qr_code_generator',
    description: 'QR code generation for website URL',
    parameters: {
      text: 'https://www.openagentic.org',
      size: 256,
      errorCorrectionLevel: 'M',
      darkColor: '#000000',
      lightColor: '#FFFFFF'
    },
    expectedKeys: ['success', 'qrCodeDataUrl', 'encodedText', 'size']
  },
  {
    toolId: 'openai_image_generator',
    description: 'OpenAI image generation',
    parameters: {
      prompt: 'A futuristic cityscape at sunset with flying cars',
      model: 'gpt-image-1',
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid'
    },
    expectedKeys: ['success', 'imageUrl', 'fileName', 'model'],
    skipIfMissingEnv: ['OPENAI_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'gemini_image_generator',
    description: 'Google Gemini image generation with S3 upload',
    parameters: {
      prompt: 'A serene mountain landscape with a crystal clear lake reflecting the sky',
      // messages: [
      //   { role: 'user', content: 'Add a hat to the person in the image' },
      //   { role: 'user', content: [{ type: 'image', image: 'ADD_URL_HERE' }] }
      // ],
      model: 'gemini-2.0-flash-preview-image-generation',
      style: 'photorealistic',
      aspectRatio: '1:1',
      quality: 'standard'
    },
    expectedKeys: ['success', 'imageUrl', 'fileName', 'model'],
    skipIfMissingEnv: ['GOOGLE_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'elevenlabs_tts',
    description: 'ElevenLabs text-to-speech conversion',
    parameters: {
      mode: 'speech',
      text: 'Welcome to OpenAgentic, the future of AI tool orchestration!',
      voice_preferences: {
        gender: 'female',
        style: 'professional'
      },
      model_id: 'eleven_multilingual_v2'
    },
    expectedKeys: ['success', 'audioUrl', 'fileName', 'mode'],
    skipIfMissingEnv: ['ELEVENLABS_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'video_generator',
    description: 'Google Veo 2.0 video generation',
    parameters: {
      prompt: 'A peaceful nature scene with a flowing river and birds flying overhead',
      numberOfVideos: 1,
      maxWaitTime: 120,
      model: 'veo-2.0-generate-001'
    },
    expectedKeys: ['success', 'videoUrls', 'fileNames', 'videosGenerated'],
    skipIfMissingEnv: ['GOOGLE_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'gemini_tts',
    description: 'Google Gemini TTS speech generation',
    parameters: {
      text: 'Welcome to OpenAgentic! This is a test of the Gemini text-to-speech system.',
      model: 'gemini-2.5-flash-preview-tts',
      voice_name: 'Kore',
      style_prompt: 'speak cheerfully'
    },
    expectedKeys: ['success', 'audioUrl', 'fileName', 'mode'],
    skipIfMissingEnv: ['GOOGLE_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'inception_labs',
    description: 'Inception Labs search for recent AI developments',
    parameters: {
      text: 'Hello! What is a diffusion model?',
      model: 'mercury-coder'
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['INCEPTION_API_KEY']
  },
  {
    toolId: 'html_composer',
    description: 'HTML composer for responsive landing page',
    parameters: {
      title: 'Bean There, Done That - Coffee Shop',
      content: {
        hero: {
          heading: 'Welcome to Bean There, Done That',
          subtitle: 'The finest coffee experience in town',
          description: 'Discover our locally roasted beans and artisanal brewing methods'
        },
        about: {
          heading: 'About Us',
          content: 'We are passionate coffee enthusiasts committed to bringing you the perfect cup every time. Our beans are ethically sourced and roasted to perfection.'
        },
        contact: {
          heading: 'Visit Us',
          address: '123 Coffee Street, Brew City, BC 12345',
          phone: '(555) 123-BREW',
          hours: 'Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-9PM'
        }
      },
      theme: 'business',
      includeStyles: true,
      includeMetadata: true,
      designInstructions: 'Create a warm, inviting design with coffee-themed colors (browns, creams) and modern typography'
    },
    expectedKeys: ['success', 'htmlUrl', 'fileName', 'htmlContent'],
    skipIfMissingEnv: ['ANTHROPIC_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  },
  {
    toolId: 'unsplash_search',
    description: 'Unsplash image search for nature photos',
    parameters: {
      query: 'nature landscape sunset',
      orientation: 'landscape'
    },
    expectedKeys: ['success', 'query', 'photos', 'totalResults'],
    skipIfMissingEnv: ['UNSPLASH_ACCESS_KEY']
  },
  {
    toolId: 'openai_vector_store_search',
    description: 'OpenAI vector store search for relevant documents',
    parameters: {
      vectorStoreId: 'vs_685c044a84888191b669c7b4435444a8',
      query: 'please provide a high-level overview of how to add a new BIP',
      maxNumResults: 2,
      rewriteQuery: true
    },
    expectedKeys: ['success', 'query', 'results', 'totalResults'],
    skipIfMissingEnv: ['OPENAI_API_KEY']
  },
  {
    toolId: 'slack_poster',
    description: 'Slack post publishing',
    parameters: {
      text: 'Testing SignSchool Slack Poster tool! 🚀 #SignSchool #AI #Slack #Test',
      conversationId: 'C093APKHPHS',
    },
    expectedKeys: ['success', 'tweet', 'metadata'],
    skipIfMissingEnv: ['SLACK_BOT_TOKEN']
  },
  {
    toolId: 'groq_chat',
    description: 'Groq chat',
    parameters: {
      prompt: 'What is the capital of France?',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 1000
    },
    expectedKeys: ['success', 'text', 'model', 'usage'],
    skipIfMissingEnv: ['GROQ_API_KEY']
  },
  {
    toolId:'luma_image_generation',
    description: 'Luma image generation',
    parameters: {
      prompt: 'A serene mountain landscape with a crystal clear lake reflecting the sky',
      model: 'photon-1'
    },
    expectedKeys: ['success', 'imageUrl', 'fileName', 'model'],
    skipIfMissingEnv: ['LUMA_API_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET_NAME']
  }
];

// =============================================================================
// TOOL TESTER CLASS
// =============================================================================

class ToolTester {
  private results: TestResult[] = [];

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
   * Find tool by ID from the available tools
   */
  private findToolById(toolId: string): any {
    const tool = allTools.find(t => t.toolId === toolId);
    if (!tool) {
      const availableIds = allTools.map(t => t.toolId);
      throw new Error(`Tool "${toolId}" not found. Available tools: ${availableIds.join(', ')}`);
    }
    return tool;
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
   * Test a single tool with given parameters
   */
  async testTool(testCase: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // Check environment variables
      const envCheck = this.checkEnvironmentVariables(testCase.skipIfMissingEnv);
      if (!envCheck.available) {
        return {
          toolId: testCase.toolId,
          toolName: testCase.toolId,
          description: testCase.description,
          success: false,
          duration: 0,
          skipped: true,
          skipReason: `Missing environment variables: ${envCheck.missing.join(', ')}`
        };
      }

      // Find the tool
      const tool = this.findToolById(testCase.toolId);
      
      // Create agent with single tool
      const agent = createAgent({
        model: 'gpt-4o-mini', // Use consistent model for testing
        tools: [tool],
        systemPrompt: `You are a test assistant. Use the ${tool.name} tool with the exact parameters provided. Do not modify or interpret the parameters.`,
      });

      // Create test prompt that instructs the agent to use the tool
      const toolCallPrompt = `Please use the ${tool.name} tool with these exact parameters: ${JSON.stringify(testCase.parameters)}`;

      console.log(`🧪 Testing ${testCase.toolId}: ${testCase.description}`);
      
      // Execute the agent
      const result = await agent.execute(toolCallPrompt);
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Check if the agent execution was successful
      if (!result.success) {
        return {
          toolId: testCase.toolId,
          toolName: tool.name,
          description: testCase.description,
          success: false,
          duration,
          error: result.error || 'Agent execution failed'
        };
      }

      // Validate the structure (this is checking the agent result, not tool result directly)
      const hasToolCall = result.toolCallsUsed && result.toolCallsUsed.length > 0;
      
      return {
        toolId: testCase.toolId,
        toolName: tool.name,
        description: testCase.description,
        success: true,
        duration,
        result: {
          agentResult: result.result,
          toolsUsed: result.toolCallsUsed,
          iterations: result.iterations,
          hasToolCall
        }
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        toolId: testCase.toolId,
        toolName: testCase.toolId,
        description: testCase.description,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run all test cases
   */
  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting OpenAgentic Tool Testing Suite\n');
    console.log(`📋 Running ${TEST_CASES.length} test cases...\n`);

    this.results = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];
      console.log(`\n[${i + 1}/${TEST_CASES.length}] ${testCase.description}`);
      
      const result = await this.testTool(testCase);
      this.results.push(result);

      // Log result
      if (result.skipped) {
        console.log(`⏭️  Skipped: ${result.skipReason}`);
      } else if (result.success) {
        console.log(`✅ Passed in ${result.duration}ms`);
      } else {
        console.log(`❌ Failed in ${result.duration}ms: ${result.error}`);
      }

      // Add delay between tests to respect rate limits
      if (i < TEST_CASES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return this.generateSummary();
  }

  /**
   * Run a single test by tool ID
   */
  async runSingleTest(toolId: string): Promise<TestSummary> {
    const testCase = TEST_CASES.find(tc => tc.toolId === toolId);
    if (!testCase) {
      const availableIds = TEST_CASES.map(tc => tc.toolId);
      throw new Error(`Test case for tool "${toolId}" not found. Available tools: ${availableIds.join(', ')}`);
    }

    console.log(`🚀 Testing single tool: ${toolId}\n`);
    console.log(`📋 ${testCase.description}\n`);

    const result = await this.testTool(testCase);
    this.results = [result];

    // Log result
    if (result.skipped) {
      console.log(`⏭️  Skipped: ${result.skipReason}`);
    } else if (result.success) {
      console.log(`✅ Passed in ${result.duration}ms`);
    } else {
      console.log(`❌ Failed in ${result.duration}ms: ${result.error}`);
    }

    return this.generateSummary();
  }

  /**
   * Generate test summary and statistics
   */
  private generateSummary(): TestSummary {
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
  async saveResults(summary: TestSummary, filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `tool-test-results-${timestamp}.json`;
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
   * List all available tools for testing
   */
  listAvailableTools(): void {
    console.log('📋 Available Tools for Testing:\n');
    
    const testCasesByTool = TEST_CASES.reduce((acc, tc) => {
      acc[tc.toolId] = tc;
      return acc;
    }, {} as Record<string, TestCase>);

    allToolDescriptions.forEach((tool, index) => {
      const hasTest = testCasesByTool[tool.toolId];
      const status = hasTest ? '✅' : '❌';
      const envReqs = hasTest?.skipIfMissingEnv ? ` (requires: ${hasTest.skipIfMissingEnv.join(', ')})` : '';
      
      console.log(`${(index + 1).toString().padStart(2)}. ${status} ${tool.toolId} - ${tool.name}${envReqs}`);
    });

    const testedCount = Object.keys(testCasesByTool).length;
    const totalCount = allToolDescriptions.length;
    
    console.log(`\n📊 Test Coverage: ${testedCount}/${totalCount} tools (${Math.round(testedCount/totalCount*100)}%)`);
  }
}

// =============================================================================
// CLI INTERFACE AND MAIN EXECUTION
// =============================================================================

function printUsage(): void {
  console.log(`
🧪 OpenAgentic Tool Testing Suite

Usage:
  npm run test:tools                    # Run all tests
  npm run test:tools -- --tool <id>    # Test specific tool
  npm run test:tools -- --list         # List available tools
  npm run test:tools -- --help         # Show this help

Examples:
  npm run test:tools -- --tool qr_code_generator
  npm run test:tools -- --tool openai_text_generation
  npm run test:tools -- --tool github_contents
  npm run test:tools -- --tool html_composer

Environment Variables Required:
  # AI Providers
  OPENAI_API_KEY=your_openai_key
  ANTHROPIC_API_KEY=your_anthropic_key
  GOOGLE_API_KEY=your_google_key
  XAI_API_KEY=your_xai_key
  LLAMA_API_KEY=your_llama_key
  PERPLEXITY_API_KEY=your_perplexity_key
  
  # Utility Services  
  NEWSDATA_API_KEY=your_newsdata_key
  GITHUB_TOKEN=your_github_token
  ELEVENLABS_API_KEY=your_elevenlabs_key
  
  # S3 (for audio/video/image/html tools)
  AWS_ACCESS_KEY_ID=your_aws_key
  AWS_SECRET_ACCESS_KEY=your_aws_secret
  AWS_REGION=us-east-1
  S3_BUCKET_NAME=your-bucket-name
`);
}

function printSummary(summary: TestSummary): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`🎯 Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⏭️  Skipped: ${summary.skipped}`);
  console.log(`⏱️  Average Duration: ${summary.averageDuration}ms`);
  console.log(`📅 Completed: ${new Date(summary.timestamp).toLocaleString()}`);
  
  const successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);

  // Show failed tests
  const failedTests = summary.results.filter(r => !r.success && !r.skipped);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   • ${test.toolId}: ${test.error}`);
    });
  }

  // Show skipped tests
  const skippedTests = summary.results.filter(r => r.skipped);
  if (skippedTests.length > 0) {
    console.log('\n⏭️  Skipped Tests:');
    skippedTests.forEach(test => {
      console.log(`   • ${test.toolId}: ${test.skipReason}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const tester = new ToolTester();

  try {
    // Parse command line arguments
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      return;
    }

    if (args.includes('--list') || args.includes('-l')) {
      tester.listAvailableTools();
      return;
    }

    const toolFlag = args.indexOf('--tool');
    if (toolFlag !== -1 && args[toolFlag + 1]) {
      // Test specific tool
      const toolId = args[toolFlag + 1];
      const summary = await tester.runSingleTest(toolId);
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
    process.exit(summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { ToolTester, TEST_CASES };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

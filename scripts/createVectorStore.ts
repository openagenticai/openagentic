#!/usr/bin/env tsx
import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface VectorStoreConfig {
  name: string;
  expiresAfterDays?: number;
  chunkingStrategy?: {
    type: 'static';
    maxChunkSizeTokens?: number;
    chunkOverlapTokens?: number;
  };
}

interface FileUploadConfig {
  filePath: string;
  attributes?: Record<string, string | number | boolean>;
}

interface VectorStoreCreationResult {
  vectorStore: any;
  uploadedFiles: Array<{
    fileId: string;
    filename: string;
    attributes?: Record<string, string | number | boolean>;
    status: string;
  }>;
  summary: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    vectorStoreId: string;
    createdAt: string;
  };
}

// =============================================================================
// VECTOR STORE CREATOR CLASS
// =============================================================================

class OpenAIVectorStoreCreator {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  /**
   * Create a new vector store with optional configuration
   */
  async createVectorStore(config: VectorStoreConfig): Promise<any> {
    console.log(`🏗️  Creating vector store: ${config.name}`);

    const body: any = {
      name: config.name
    };

    // Add expiration if specified
    if (config.expiresAfterDays) {
      body.expires_after = {
        anchor: 'last_active_at',
        days: config.expiresAfterDays
      };
    }

    // Add chunking strategy if specified
    if (config.chunkingStrategy) {
      body.chunking_strategy = {
        type: config.chunkingStrategy.type,
        static: {
          max_chunk_size_tokens: config.chunkingStrategy.maxChunkSizeTokens || 800,
          chunk_overlap_tokens: config.chunkingStrategy.chunkOverlapTokens || 400
        }
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/vector_stores', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create vector store: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const vectorStore = await response.json();
      console.log(`✅ Vector store created: ${vectorStore.id}`);
      return vectorStore;

    } catch (error) {
      console.error('❌ Failed to create vector store:', error);
      throw error;
    }
  }

  /**
   * Upload a file to OpenAI and get file ID
   */
  async uploadFile(filePath: string): Promise<string> {
    console.log(`📄 Uploading file: ${basename(filePath)}`);

    try {
      const fileContent = await fs.readFile(filePath);
      const filename = basename(filePath);

      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), filename);
      formData.append('purpose', 'assistants');

      const response = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to upload file: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const fileData = await response.json();
      console.log(`✅ File uploaded: ${fileData.id}`);
      return fileData.id;

    } catch (error) {
      console.error(`❌ Failed to upload file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Add file to vector store with optional attributes
   */
  async addFileToVectorStore(
    vectorStoreId: string, 
    fileId: string, 
    attributes?: Record<string, string | number | boolean>
  ): Promise<any> {
    console.log(`🔗 Adding file ${fileId} to vector store ${vectorStoreId}`);

    const body: any = {
      file_id: fileId
    };

    if (attributes) {
      body.attributes = attributes;
    }

    try {
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to add file to vector store: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ File added to vector store: ${result.status}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to add file to vector store:`, error);
      throw error;
    }
  }

  /**
   * Wait for file processing to complete
   */
  async waitForFileProcessing(vectorStoreId: string, fileId: string, maxWaitTime = 300000): Promise<void> {
    console.log(`⏳ Waiting for file processing: ${fileId}`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(
          `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${fileId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        if (response.ok) {
          const fileStatus = await response.json();
          
          if (fileStatus.status === 'completed') {
            console.log(`✅ File processing completed: ${fileId}`);
            return;
          }
          
          if (fileStatus.status === 'failed') {
            throw new Error(`File processing failed: ${fileStatus.last_error?.message || 'Unknown error'}`);
          }
          
          // Still processing, wait and try again
          console.log(`⏳ File status: ${fileStatus.status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Failed to check file status: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ Error checking file status:`, error);
        throw error;
      }
    }

    throw new Error(`File processing timeout after ${maxWaitTime}ms`);
  }

  /**
   * Process a directory and upload all supported files
   */
  async processDirectory(
    dirPath: string, 
    vectorStoreId: string,
    fileFilter?: (filename: string) => boolean
  ): Promise<Array<{ fileId: string; filename: string; status: string; attributes?: Record<string, any> }>> {
    console.log(`📁 Processing directory: ${dirPath}`);

    const supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.json', '.csv'];
    const results: Array<{ fileId: string; filename: string; status: string; attributes?: Record<string, any> }> = [];

    try {
      const files = await fs.readdir(dirPath);
      const filteredFiles = files.filter(file => {
        const ext = extname(file).toLowerCase();
        const isSupported = supportedExtensions.includes(ext);
        const passesFilter = !fileFilter || fileFilter(file);
        return isSupported && passesFilter;
      });

      console.log(`📋 Found ${filteredFiles.length} supported files to process`);

      for (const filename of filteredFiles) {
        const filePath = join(dirPath, filename);
        
        try {
          // Upload file
          const fileId = await this.uploadFile(filePath);
          
          // Create attributes based on file metadata
          const stats = await fs.stat(filePath);
          const attributes = {
            filename,
            extension: extname(filename),
            size_bytes: stats.size,
            created_at: Math.floor(stats.birthtime.getTime() / 1000),
            modified_at: Math.floor(stats.mtime.getTime() / 1000)
          };

          // Add to vector store
          await this.addFileToVectorStore(vectorStoreId, fileId, attributes);
          
          // Wait for processing
          await this.waitForFileProcessing(vectorStoreId, fileId);

          results.push({
            fileId,
            filename,
            status: 'completed',
            attributes
          });

        } catch (error) {
          console.error(`❌ Failed to process file ${filename}:`, error);
          results.push({
            fileId: '',
            filename,
            status: 'failed',
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Failed to process directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Create vector store and upload files in one operation
   */
  async createVectorStoreWithFiles(
    config: VectorStoreConfig,
    files: FileUploadConfig[]
  ): Promise<VectorStoreCreationResult> {
    console.log(`🚀 Creating vector store with ${files.length} files`);

    try {
      // Create vector store
      const vectorStore = await this.createVectorStore(config);
      
      const uploadedFiles: Array<{
        fileId: string;
        filename: string;
        attributes?: Record<string, string | number | boolean>;
        status: string;
      }> = [];

      let successfulUploads = 0;
      let failedUploads = 0;

      // Process each file
      for (const fileConfig of files) {
        try {
          console.log(`\n📄 Processing: ${basename(fileConfig.filePath)}`);
          
          // Upload file
          const fileId = await this.uploadFile(fileConfig.filePath);
          
          // Add to vector store with attributes
          await this.addFileToVectorStore(vectorStore.id, fileId, fileConfig.attributes);
          
          // Wait for processing
          await this.waitForFileProcessing(vectorStore.id, fileId);

          uploadedFiles.push({
            fileId,
            filename: basename(fileConfig.filePath),
            attributes: fileConfig.attributes,
            status: 'completed'
          });
          
          successfulUploads++;

        } catch (error) {
          console.error(`❌ Failed to process file ${fileConfig.filePath}:`, error);
          uploadedFiles.push({
            fileId: '',
            filename: basename(fileConfig.filePath),
            attributes: fileConfig.attributes,
            status: 'failed'
          });
          failedUploads++;
        }
      }

      const result: VectorStoreCreationResult = {
        vectorStore,
        uploadedFiles,
        summary: {
          totalFiles: files.length,
          successfulUploads,
          failedUploads,
          vectorStoreId: vectorStore.id,
          createdAt: new Date().toISOString()
        }
      };

      this.printSummary(result);
      return result;

    } catch (error) {
      console.error('❌ Failed to create vector store with files:', error);
      throw error;
    }
  }

  /**
   * Print creation summary
   */
  private printSummary(result: VectorStoreCreationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VECTOR STORE CREATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`🆔 Vector Store ID: ${result.summary.vectorStoreId}`);
    console.log(`📁 Total Files: ${result.summary.totalFiles}`);
    console.log(`✅ Successful: ${result.summary.successfulUploads}`);
    console.log(`❌ Failed: ${result.summary.failedUploads}`);
    console.log(`📅 Created: ${new Date(result.summary.createdAt).toLocaleString()}`);
    console.log('\n📋 File Details:');
    
    result.uploadedFiles.forEach((file, index) => {
      const status = file.status === 'completed' ? '✅' : '❌';
      console.log(`${(index + 1).toString().padStart(2)}. ${status} ${file.filename} (${file.fileId || 'N/A'})`);
    });
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Use this vector store ID in your OpenAI Vector Store Search tool');
    console.log('2. Test searches with the following command:');
    console.log(`   npm run test:tools -- --tool openai_vector_store_search`);
    console.log('3. Update test parameters with your vector store ID');
    console.log('='.repeat(60));
  }
}

// =============================================================================
// CLI INTERFACE AND EXAMPLES
// =============================================================================

function printUsage(): void {
  console.log(`
🏗️  OpenAI Vector Store Creator

Usage:
  tsx scripts/createVectorStore.ts [options]

Options:
  --name <name>              Vector store name (required)
  --files <path1,path2>      Comma-separated file paths
  --directory <path>         Process all files in directory
  --expires <days>           Auto-expire after N days
  --chunk-size <tokens>      Max tokens per chunk (default: 800)
  --chunk-overlap <tokens>   Overlap tokens (default: 400)
  --help                     Show this help

Examples:
  # Create vector store with specific files
  tsx scripts/createVectorStore.ts --name "My Knowledge Base" --files "doc1.pdf,doc2.txt"

  # Create from directory with expiration
  tsx scripts/createVectorStore.ts --name "Temp Docs" --directory "./docs" --expires 7

  # Custom chunking strategy
  tsx scripts/createVectorStore.ts --name "Large Docs" --files "large.pdf" --chunk-size 1600 --chunk-overlap 800

Environment Variables:
  OPENAI_API_KEY=your_openai_api_key

💡 Tip: Vector stores cost $0.10 per GB per day. Set expiration for temporary use!
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printUsage();
    return;
  }

  try {
    // Parse arguments
    const nameIndex = args.indexOf('--name');
    const filesIndex = args.indexOf('--files');
    const directoryIndex = args.indexOf('--directory');
    const expiresIndex = args.indexOf('--expires');
    const chunkSizeIndex = args.indexOf('--chunk-size');
    const chunkOverlapIndex = args.indexOf('--chunk-overlap');

    if (nameIndex === -1 || !args[nameIndex + 1]) {
      throw new Error('Vector store name is required (--name <name>)');
    }

    const config: VectorStoreConfig = {
      name: args[nameIndex + 1],
      expiresAfterDays: expiresIndex !== -1 ? parseInt(args[expiresIndex + 1]) : undefined,
      chunkingStrategy: undefined
    };

    // Set chunking strategy if specified
    if (chunkSizeIndex !== -1 || chunkOverlapIndex !== -1) {
      config.chunkingStrategy = {
        type: 'static',
        maxChunkSizeTokens: chunkSizeIndex !== -1 ? parseInt(args[chunkSizeIndex + 1]) : 800,
        chunkOverlapTokens: chunkOverlapIndex !== -1 ? parseInt(args[chunkOverlapIndex + 1]) : 400
      };
    }

    const creator = new OpenAIVectorStoreCreator();

    if (directoryIndex !== -1 && args[directoryIndex + 1]) {
      // Process directory
      const dirPath = args[directoryIndex + 1];
      console.log(`🚀 Creating vector store from directory: ${dirPath}`);
      
      const vectorStore = await creator.createVectorStore(config);
      const results = await creator.processDirectory(dirPath, vectorStore.id);
      
      console.log(`\n✅ Vector store created: ${vectorStore.id}`);
      console.log(`📁 Processed ${results.length} files`);
      
    } else if (filesIndex !== -1 && args[filesIndex + 1]) {
      // Process specific files
      const fileList = args[filesIndex + 1].split(',').map(f => f.trim());
      const fileConfigs: FileUploadConfig[] = fileList.map(filePath => ({
        filePath,
        attributes: {
          source: 'command-line',
          uploaded_at: Math.floor(Date.now() / 1000)
        }
      }));

      const result = await creator.createVectorStoreWithFiles(config, fileConfigs);
      
    } else {
      throw new Error('Either --files or --directory must be specified');
    }

  } catch (error) {
    console.error('❌ Vector store creation failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { OpenAIVectorStoreCreator, VectorStoreConfig, FileUploadConfig, VectorStoreCreationResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 
import { type Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { type OpenAgenticTool, type ToolDetails } from '../types';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { ProviderManager } from '../providers/manager';

// =============================================================================
// LANGCHAIN TOOL COMPATIBILITY
// =============================================================================

/**
 * Check if an object is a LangChain Tool or StructuredTool
 */
function isLangChainTool(tool: any): boolean {
  // Check for typical LangChain tool properties
  return (
    tool &&
    typeof tool === 'object' &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    (typeof tool.call === 'function' || typeof tool.invoke === 'function')
  );
}

/**
 * Convert LangChain's zod schema to AI SDK compatible zod schema
 */
function convertLangChainSchema(schema: any): z.ZodType<any> {
  if (!schema) {
    // If no schema, return empty object schema
    return z.object({});
  }
  
  // If it's already a Zod schema, return as-is
  if (schema._def) {
    return schema;
  }
  
  // If it's a JSON schema, try to convert to Zod
  if (typeof schema === 'object' && schema.type) {
    return convertJsonSchemaToZod(schema);
  }
  
  // Fallback to any schema
  return z.any();
}

/**
 * Convert JSON Schema to Zod schema (basic implementation)
 */
function convertJsonSchemaToZod(jsonSchema: any): z.ZodType<any> {
  if (jsonSchema.type === 'object') {
    const shape: Record<string, z.ZodType<any>> = {};
    const properties = jsonSchema.properties || {};
    
    for (const [key, prop] of Object.entries(properties)) {
      shape[key] = convertJsonSchemaToZod(prop as any);
    }
    
    return z.object(shape);
  }
  
  if (jsonSchema.type === 'string') {
    let schema = z.string();
    if (jsonSchema.description) {
      schema = schema.describe(jsonSchema.description);
    }
    return schema;
  }
  
  if (jsonSchema.type === 'number') {
    return z.number();
  }
  
  if (jsonSchema.type === 'boolean') {
    return z.boolean();
  }
  
  if (jsonSchema.type === 'array') {
    const itemSchema = jsonSchema.items ? convertJsonSchemaToZod(jsonSchema.items) : z.any();
    return z.array(itemSchema);
  }
  
  return z.any();
}

/**
 * Convert a LangChain Tool to OpenAgentic format
 * @param lcTool - LangChain Tool or StructuredTool instance
 * @param opts - Optional configuration
 * @returns OpenAgentic compatible tool
 */
export async function convertLangchainTool(
  lcTool: any,
  opts?: {
    toolId?: string;
    useCases?: string[];
    logo?: string;
    paramsSchema?: z.ZodType<any>;
  }
): Promise<OpenAgenticTool> {
  if (!isLangChainTool(lcTool)) {
    throw new Error('Provided tool is not a valid LangChain Tool or StructuredTool');
  }

  // Extract schema from LangChain tool
  let schema: z.ZodType<any>;
  
  if (opts?.paramsSchema) {
    schema = opts.paramsSchema;
  } else if (lcTool.schema) {
    schema = convertLangChainSchema(lcTool.schema);
  } else {
    // Default to empty object schema for basic tools
    schema = z.object({
      input: z.string().describe('Input text for the tool')
    });
  }

  // Create AI SDK tool
  const aiTool = tool({
    description: lcTool.description,
    parameters: schema,
    execute: async (args: any) => {
      try {
        let result: any;
        
        // Try invoke first (for newer LangChain tools), then fall back to call
        if (typeof lcTool.invoke === 'function') {
          // For StructuredTool, pass the args object directly
          result = await lcTool.invoke(args);
        } else if (typeof lcTool.call === 'function') {
          // For basic Tool, pass the input string or first argument
          const input = typeof args === 'object' && args.input !== undefined 
            ? args.input 
            : Object.keys(args).length === 1 
              ? Object.values(args)[0] 
              : JSON.stringify(args);
          result = await lcTool.call(input);
        } else {
          throw new Error('LangChain tool has no callable invoke or call method');
        }

        // Ensure result is a string (LangChain tools typically return strings)
        if (typeof result === 'object') {
          return JSON.stringify(result);
        }
        return String(result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`LangChain tool "${lcTool.name}" execution failed:`, errorMessage);
        throw new Error(`Tool execution failed: ${errorMessage}`);
      }
    }
  });

  // Create tool details
  const toolDetails: ToolDetails = {
    toolId: opts?.toolId || `langchain_${lcTool.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: lcTool.name,
    useCases: opts?.useCases || [
      `LangChain ${lcTool.name} integration`,
      lcTool.description || 'Imported from LangChain'
    ],
    logo: opts?.logo || '🔗' // LangChain emoji
  };

  return {
    ...aiTool,
    ...toolDetails
  };
}

/**
 * Auto-detect and convert LangChain tools in a tools array
 * @param tools - Array of tools that may include LangChain tools
 * @returns Promise resolving to array with LangChain tools converted
 */
export async function autoConvertLangChainTools(tools: any[]): Promise<any[]> {
  if (!Array.isArray(tools)) {
    return tools;
  }

  const convertedTools = await Promise.all(
    tools.map(async (tool) => {
      if (isLangChainTool(tool)) {
        console.log(`🔗 Auto-converting LangChain tool: ${tool.name}`);
        return await convertLangchainTool(tool);
      }
      return tool;
    })
  );

  return convertedTools;
}

/**
 * Check if a tools array contains any LangChain tools
 * @param tools - Array of tools to check
 * @returns Boolean indicating if LangChain tools are present
 */
export function hasLangChainTools(tools: any[]): boolean {
  if (!Array.isArray(tools)) {
    return false;
  }
  return tools.some(tool => isLangChainTool(tool));
}

/**
 * Synchronous version of convertLangchainTool for constructor use
 * @param lcTool - LangChain Tool or StructuredTool instance
 * @param opts - Optional configuration
 * @returns OpenAgentic compatible tool (synchronously)
 */
export function convertLangchainToolSync(
  lcTool: any,
  opts?: {
    toolId?: string;
    useCases?: string[];
    logo?: string;
    paramsSchema?: z.ZodType<any>;
  }
): OpenAgenticTool {
  if (!isLangChainTool(lcTool)) {
    throw new Error('Provided tool is not a valid LangChain Tool or StructuredTool');
  }

  // Extract schema from LangChain tool
  let schema: z.ZodType<any>;
  
  if (opts?.paramsSchema) {
    schema = opts.paramsSchema;
  } else if (lcTool.schema) {
    schema = convertLangChainSchema(lcTool.schema);
  } else {
    // Default to empty object schema for basic tools
    schema = z.object({
      input: z.string().describe('Input text for the tool')
    });
  }

  // Create AI SDK tool
  const aiTool = tool({
    description: lcTool.description,
    parameters: schema,
    execute: async (args: any) => {
      try {
        let result: any;
        
        // Try invoke first (for newer LangChain tools), then fall back to call
        if (typeof lcTool.invoke === 'function') {
          // For StructuredTool, pass the args object directly
          result = await lcTool.invoke(args);
        } else if (typeof lcTool.call === 'function') {
          // For basic Tool, pass the input string or first argument
          const input = typeof args === 'object' && args.input !== undefined 
            ? args.input 
            : Object.keys(args).length === 1 
              ? Object.values(args)[0] 
              : JSON.stringify(args);
          result = await lcTool.call(input);
        } else {
          throw new Error('LangChain tool has no callable invoke or call method');
        }

        // Ensure result is a string (LangChain tools typically return strings)
        if (typeof result === 'object') {
          return JSON.stringify(result);
        }
        return String(result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`LangChain tool "${lcTool.name}" execution failed:`, errorMessage);
        throw new Error(`Tool execution failed: ${errorMessage}`);
      }
    }
  });

  // Create tool details
  const toolDetails: ToolDetails = {
    toolId: opts?.toolId || `langchain_${lcTool.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: lcTool.name,
    useCases: opts?.useCases || [
      `LangChain ${lcTool.name} integration`,
      lcTool.description || 'Imported from LangChain'
    ],
    logo: opts?.logo || '🔗' // LangChain emoji
  };

  return {
    ...aiTool,
    ...toolDetails
  };
}

// =============================================================================
// OPENAGENTIC UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper function to add a custom toolId to an AI SDK tool
 * This provides better identification and debugging capabilities
 * 
 * @param tool - AI SDK tool created with tool() function, see ai's ToolParameters type for more details
 * @param toolId - Unique identifier for the tool
 * @returns Tool with toolId property for better identification
 */
export function toOpenAgenticTool(tool: Tool, details: ToolDetails): OpenAgenticTool {
 return {
  ...tool,
  ...details,
 }
}

export function getModel(model: string): string {
  const bedrockCredentials = ProviderManager.getBedrockCredentials();
  if (bedrockCredentials.accessKeyId && bedrockCredentials.secretAccessKey) {
    if(model.includes('sonnet')) {
      return 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    } else if(model.includes('opus')) {
      return 'us.anthropic.claude-4-opus-20250514-v1:0';
    } else {
      return model;
    }
  } else {
    return model;
  }
}

export function getAnthropicModelInstance(model: string): any {
    const bedrockCredentials = ProviderManager.getBedrockCredentials();
    let modelInstance: any;
    let provider: any;
    if (bedrockCredentials.accessKeyId && bedrockCredentials.secretAccessKey) {
        console.log('Using Bedrock');
        provider = createAmazonBedrock({
        region: bedrockCredentials.region,
        accessKeyId: bedrockCredentials.accessKeyId,
        secretAccessKey: bedrockCredentials.secretAccessKey,
        });
        // TODO: Add support for other Bedrock model versions
        if(model.includes('sonnet')) {
        modelInstance = provider('us.anthropic.claude-sonnet-4-20250514-v1:0');
        console.log('Model: Claude Sonnet 4');
        } else if(model.includes('opus')) {
        modelInstance = provider('us.anthropic.claude-4-opus-20250514-v1:0');
        console.log('Model: Claude Opus 4');
        } else {
        throw new Error(`Model "${model}" not supported`);
        }
    } else {
        console.log('Using Anthropic');
        // Validate API key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        provider = createAnthropic({
        apiKey,
        });
        modelInstance = provider(model);
        console.log('Model:', model);
    }
    return {provider, modelInstance};
}

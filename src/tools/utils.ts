import { type Tool } from 'ai';
import { type OpenAgenticTool, type ToolDetails } from '../types';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { ProviderManager } from '../providers/manager';

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

export function getAnthropicModelInstance(model: string): any {
    const bedrockCredentials = ProviderManager.getBedrockCredentials();
    let modelInstance: any;
    if (bedrockCredentials.accessKeyId && bedrockCredentials.secretAccessKey) {
        console.log('Using Bedrock');
        const bedrock = createAmazonBedrock({
        region: bedrockCredentials.region,
        accessKeyId: bedrockCredentials.accessKeyId,
        secretAccessKey: bedrockCredentials.secretAccessKey,
        });
        // TODO: Add support for other Bedrock model versions
        if(model.includes('sonnet')) {
        modelInstance = bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0');
        console.log('Model: Claude Sonnet 4');
        } else if(model.includes('opus')) {
        modelInstance = bedrock('us.anthropic.claude-4-opus-20250514-v1:0');
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
        const anthropic = createAnthropic({
        apiKey,
        });
        modelInstance = anthropic(model);
        console.log('Model:', model);
    }
    return modelInstance;
}

import { tool } from 'ai';
import { z } from 'zod';
import { WebClient } from '@slack/web-api';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

const rawSlackPosterTool = tool({
  description: 'Post messages to Slack channels or direct messages using the Slack Web API',
  parameters: z.object({
    conversationId: z.string()
      .min(1)
      .describe('The Slack channel ID (C1234567890) or user ID (U1234567890) to post the message to'),
    text: z.string()
      .min(1)
      .max(4000)
      .describe('The message text to post to Slack (maximum 4000 characters)'),
    token: z.string()
      .optional()
      .describe('Optional Slack Bot User OAuth Token (if not provided, will use SLACK_BOT_TOKEN environment variable)')
  }),
  
  execute: async ({ 
    conversationId,
    text,
    token
  }) => {
    // Get token from parameter or environment variable
    const slackToken = token || process.env.SLACK_BOT_TOKEN;
    
    if (!slackToken) {
      throw new Error('Slack Bot Token is required. Please provide via token parameter or SLACK_BOT_TOKEN environment variable');
    }

    // Validate inputs
    if (!conversationId || conversationId.trim().length === 0) {
      throw new Error('conversationId cannot be empty');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('text cannot be empty');
    }

    if (text.length > 4000) {
      throw new Error('Message text exceeds maximum length of 4000 characters');
    }

    // Validate conversation ID format (basic validation)
    const trimmedConversationId = conversationId.trim();
    if (!trimmedConversationId.match(/^[CDUGW][A-Z0-9]{8,}$/)) {
      console.warn('⚠️  Slack Poster Tool - Conversation ID format may be invalid:', trimmedConversationId);
    }

    // Start logging
    console.log('💬 Slack Poster Tool - Posting message:', {
      timestamp: new Date().toISOString(),
      conversationId: trimmedConversationId,
      messageLength: text.length,
      hasToken: !!slackToken,
    });

    try {
      // Initialize Slack Web API client
      const web = new WebClient(slackToken);

      // Post message to Slack
      const result = await web.chat.postMessage({
        text: text.trim(),
        channel: trimmedConversationId,
      });

      // Check if message was posted successfully
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error || 'Unknown error'}`);
      }

      // Log completion
      console.log('✅ Slack Poster Tool - Message posted successfully:', {
        conversationId: trimmedConversationId,
        messageId: result.ts,
        channel: result.channel,
        messageLength: text.length,
      });

      // Return structured result
      return {
        success: true,
        message: 'Message posted successfully to Slack',
        data: {
          messageId: result.ts,
          channel: result.channel,
          conversationId: trimmedConversationId,
          messageText: text.trim(),
          postedAt: new Date().toISOString(),
        },
        metadata: {
          messageLength: text.length,
          channelType: trimmedConversationId.startsWith('C') ? 'channel' : 
                      trimmedConversationId.startsWith('D') ? 'direct_message' :
                      trimmedConversationId.startsWith('G') ? 'group' : 'unknown',
        },
      };

    } catch (error) {
      console.error('❌ Slack Poster Tool - Failed to post message:', {
        conversationId: trimmedConversationId,
        messageLength: text.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific Slack API error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Authentication errors
        if (errorMessage.includes('invalid_auth') || errorMessage.includes('not_authed')) {
          throw new Error('Invalid Slack Bot Token. Please check your token and ensure it has the necessary permissions.');
        }
        
        // Permission errors
        if (errorMessage.includes('missing_scope') || errorMessage.includes('not_in_channel')) {
          throw new Error('Bot lacks permission to post in this channel. Please add the bot to the channel or check OAuth scopes.');
        }
        
        // Channel not found
        if (errorMessage.includes('channel_not_found') || errorMessage.includes('not_found')) {
          throw new Error(`Channel or conversation not found: ${trimmedConversationId}. Please verify the channel/user ID.`);
        }
        
        // Rate limiting
        if (errorMessage.includes('rate_limited') || errorMessage.includes('ratelimited')) {
          throw new Error('Slack API rate limit exceeded. Please try again in a moment.');
        }
        
        // Message too long
        if (errorMessage.includes('msg_too_long') || errorMessage.includes('too_long')) {
          throw new Error('Message is too long for Slack. Please reduce the message length.');
        }
        
        // Channel archived
        if (errorMessage.includes('is_archived')) {
          throw new Error('Cannot post to archived channel. Please use an active channel.');
        }
        
        // Account inactive
        if (errorMessage.includes('account_inactive')) {
          throw new Error('Slack account is inactive. Please check your workspace status.');
        }
        
        // Invalid channel
        if (errorMessage.includes('invalid_channel')) {
          throw new Error(`Invalid channel format: ${trimmedConversationId}. Please use a valid Slack channel or user ID.`);
        }
        
        // Bot user access
        if (errorMessage.includes('user_is_bot') || errorMessage.includes('cannot_dm_bot')) {
          throw new Error('Cannot send direct messages to bot users.');
        }
        
        // Network errors
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('econnrefused')) {
          throw new Error('Network error connecting to Slack API. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`Failed to post message to Slack: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'slack_poster',
  name: 'Slack Poster',
  useCases: [
    'Post messages to Slack channels',
    'Send direct messages to Slack users',
    'Notify team members via Slack',
    'Post automated updates to channels',
    'Send alerts and notifications',
    'Share information with team groups',
    'Post status updates to channels',
    'Send reminders via Slack',
    'Broadcast announcements',
    'Integrate with Slack workflows',
  ],
  logo: 'https://www.openagentic.org/tools/slack.svg',
};

export const slackPosterTool = toOpenAgenticTool(rawSlackPosterTool, toolDetails); 
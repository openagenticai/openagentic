import { tool } from 'ai';
import { z } from 'zod';
import { Octokit } from "@octokit/rest";
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

const rawGitHubTool = tool({
  description: 'Fetch file contents and directory listings from GitHub repositories with comprehensive error handling',
  parameters: z.object({
    owner: z.string()
      .min(1)
      .describe('The GitHub repository owner (username or organization)'),
    
    repo: z.string()
      .min(1)
      .describe('The GitHub repository name'),
    
    path: z.string()
      .optional()
      .default('')
      .describe('The path to the file or directory (optional, defaults to root)'),
    
    ref: z.string()
      .optional()
      .describe('The branch, tag, or commit SHA to fetch from (optional, defaults to default branch)'),
  }),
  
  execute: async ({ 
    owner,
    repo,
    path = '',
    ref
  }) => {
    // Validate API key
    const apiKey = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY;
    if (!apiKey) {
      throw new Error('GITHUB_TOKEN or GITHUB_API_KEY environment variable is required');
    }

    // Validate inputs
    if (!owner || owner.trim().length === 0) {
      throw new Error('Repository owner cannot be empty');
    }

    if (!repo || repo.trim().length === 0) {
      throw new Error('Repository name cannot be empty');
    }

    // Normalize path
    const normalizedPath = path.trim().replace(/^\/+|\/+$/g, '');

    // Start logging
    console.log('📂 GitHub Tool - Fetching started:', {
      timestamp: new Date().toISOString(),
      owner: owner.trim(),
      repo: repo.trim(),
      path: normalizedPath || '(root)',
      ref: ref || '(default)',
      hasApiKey: !!apiKey,
    });

    try {
      // Initialize Octokit client
      const octokit = new Octokit({
        auth: apiKey,
      });

      // Prepare request parameters
      const requestParams: any = {
        owner: owner.trim(),
        repo: repo.trim(),
        path: normalizedPath,
      };

      if (ref) {
        requestParams.ref = ref;
      }

      // Make the API request
      const response = await octokit.rest.repos.getContent(requestParams);

      // Check if it's a file or directory
      if (Array.isArray(response.data)) {
        // Directory response
        console.log('✅ GitHub Tool - Directory fetch completed:', {
          owner: owner.trim(),
          repo: repo.trim(),
          path: normalizedPath || '/',
          itemCount: response.data.length,
          ref: ref || 'default',
        });

        return {
          success: true,
          type: 'directory',
          repository: {
            owner: owner.trim(),
            repo: repo.trim(),
            ref: ref || 'default'
          },
          directory: {
            path: normalizedPath || '/',
            contents: response.data.map((item: any) => ({
              name: item.name,
              type: item.type,
              size: item.size || 0,
              path: item.path,
              downloadUrl: item.download_url || null,
              htmlUrl: item.html_url,
              sha: item.sha,
            }))
          },
          metadata: {
            fetchedAt: new Date().toISOString(),
            itemCount: response.data.length,
          },
        };
      } else {
        // File response
        const fileData = response.data as any;
        
        // Decode content if it's base64 encoded
        let decodedContent: string | null = null;
        let isBinary = false;

        if (fileData.content && fileData.encoding === 'base64') {
          try {
            const buffer = Buffer.from(fileData.content, 'base64');
            
            // Simple binary detection - check for null bytes
            if (buffer.includes(0)) {
              isBinary = true;
            } else {
              decodedContent = buffer.toString('utf-8');
            }
          } catch (error) {
            console.warn('⚠️ Failed to decode file content, treating as binary');
            isBinary = true;
          }
        }

        console.log('✅ GitHub Tool - File fetch completed:', {
          owner: owner.trim(),
          repo: repo.trim(),
          path: normalizedPath,
          fileName: fileData.name,
          fileSize: fileData.size,
          encoding: fileData.encoding,
          isBinary,
          hasContent: !!decodedContent,
          ref: ref || 'default',
        });

        return {
          success: true,
          type: 'file',
          repository: {
            owner: owner.trim(),
            repo: repo.trim(),
            ref: ref || 'default'
          },
          file: {
            name: fileData.name,
            path: fileData.path,
            size: fileData.size,
            content: decodedContent,
            encoding: fileData.encoding,
            sha: fileData.sha,
            downloadUrl: fileData.download_url,
            htmlUrl: fileData.html_url,
          },
          metadata: {
            fetchedAt: new Date().toISOString(),
            hasContent: !!decodedContent,
            isBinary,
            contentLength: decodedContent?.length || 0,
          },
        };
      }

    } catch (error: any) {
      console.error('❌ GitHub Tool - Fetch failed:', {
        owner: owner.trim(),
        repo: repo.trim(),
        path: normalizedPath,
        ref: ref || 'default',
        error: error instanceof Error ? error.message : String(error),
        status: error.status || 'unknown',
      });

      // Handle specific GitHub API errors
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} or path '${normalizedPath}' not found. Please check the repository name and path.`);
      } else if (error.status === 401) {
        throw new Error('GitHub authentication failed. Please check your GitHub token.');
      } else if (error.status === 403) {
        if (error.message && error.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        } else if (error.message && error.message.includes('abuse')) {
          throw new Error('Request was flagged as potential abuse. Please try again later.');
        } else {
          throw new Error('Access forbidden. The repository may be private or your token lacks sufficient permissions.');
        }
      } else if (error.status === 451) {
        throw new Error('Repository unavailable due to legal reasons.');
      }else if (error.message && error.message.includes('timeout')) {
        throw new Error('GitHub API request timed out. Please try again.');
      } else if (error.message && error.message.includes('network')) {
        throw new Error('Network error connecting to GitHub API. Please check your internet connection.');
      }

      // Generic error fallback
      throw new Error(`GitHub API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'github_contents',
  name: 'GitHub Contents',
  useCases: [
    'Fetch file contents from GitHub repositories',
    'Browse directory listings in repositories',
    'Download specific files or entire directories',
    'Access repository content from specific branches or commits',
    'Retrieve README files and documentation',
    'Access configuration files and source code',
    'Browse open source project structures',
    'Fetch specific versions of files using refs',
    'Access both public and private repositories (with proper tokens)',
    'Retrieve file metadata including size, SHA, and URLs',
  ],
  logo: 'https://www.openagentic.org/tools/github.svg',
};

export const githubTool = toOpenAgenticTool(rawGitHubTool, toolDetails);
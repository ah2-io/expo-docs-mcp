#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { OfflineDocsFetcher } from './offline-docs-fetcher.js';

const server = new Server(
  {
    name: 'expo-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const docsFetcher = new OfflineDocsFetcher();

const tools: Tool[] = [
  {
    name: 'search_expo_docs',
    description: 'Search through Expo documentation',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for the documentation',
        },
        section: {
          type: 'string',
          description: 'Documentation section to search in',
          enum: ['home', 'guides', 'eas', 'reference', 'learn', 'versions'],
        },
        version: {
          type: 'string',
          description: 'SDK version (e.g., latest, v51.0.0, v50.0.0)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_expo_doc_content',
    description: 'Get the full content of a specific Expo documentation page',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the documentation page',
        },
        path: {
          type: 'string',
          description: 'Path within the documentation (e.g., guides/routing)',
        },
        version: {
          type: 'string',
          description: 'SDK version (e.g., latest, v51.0.0, v50.0.0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_expo_sections',
    description: 'List all available documentation sections and topics',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: 'Section to list contents for',
          enum: ['home', 'guides', 'eas', 'reference', 'learn', 'versions'],
        },
        version: {
          type: 'string',
          description: 'SDK version (e.g., latest, v51.0.0, v50.0.0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_expo_api_reference',
    description: 'Get API reference for a specific Expo SDK module',
    inputSchema: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module name (e.g., expo-camera, expo-location)',
        },
        version: {
          type: 'string',
          description: 'SDK version (e.g., latest, v51.0.0, v50.0.0)',
        },
      },
      required: ['module'],
    },
  },
  {
    name: 'get_expo_quick_start',
    description: 'Get quick start guide for Expo',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: 'Target platform',
          enum: ['ios', 'android', 'web', 'all'],
        },
      },
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new McpError(ErrorCode.InvalidParams, 'No arguments provided');
  }

  try {
    switch (name) {
      case 'search_expo_docs':
        return await docsFetcher.searchDocs(
          args.query as string, 
          args.section as string | undefined, 
          args.version as string | undefined
        );

      case 'get_expo_doc_content':
        if (args.url) {
          // For URL, we'll try to extract a path from it
          const url = args.url as string;
          const urlPath = url.replace('https://docs.expo.dev/', '').replace(/^\/+/, '');
          return await docsFetcher.getDocByPath(urlPath, args.version as string | undefined);
        } else {
          return await docsFetcher.getDocByPath(
            args.path as string | undefined, 
            args.version as string | undefined
          );
        }

      case 'list_expo_sections':
        return await docsFetcher.listSections(
          args.section as string | undefined,
          args.version as string | undefined
        );

      case 'get_expo_api_reference':
        return await docsFetcher.getApiReference(
          args.module as string,
          args.version as string | undefined
        );

      case 'get_expo_quick_start':
        return await docsFetcher.getQuickStart(args.platform as string | undefined);

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${errorMessage}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Expo MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
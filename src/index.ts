#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import LRUCache from 'lru-cache';
import { EnhancedWikipediaService } from './wikipediaService.js';
import { WikipediaExtendedFeatures } from './additionalFeatures.js';
import { GoogleSearchService } from './googleSearchService.js';
import { createCombinedMcp } from './combinedMcp.js';
import config from './config.js';

async function main() {
  try {
    console.error(`Starting ${config.server.name} v${config.server.version}`);
    console.error(`Default language: ${config.wikipedia.defaultLanguage}`);
    console.error(`Cache enabled: ${config.wikipedia.cache.max} items, ${config.wikipedia.cache.ttl}ms TTL`);
    console.error(`Deduplication: ${config.wikipedia.enableDeduplication ? 'enabled' : 'disabled'}`);

    // Initialize Wikipedia service
    const wikipediaCache = new LRUCache<string, any>({
      max: config.wikipedia.cache.max,
      ttl: config.wikipedia.cache.ttl,
    });

    const wikipediaService = new EnhancedWikipediaService({
      cache: wikipediaCache,
      enableDeduplication: config.wikipedia.enableDeduplication,
      defaultLanguage: config.wikipedia.defaultLanguage,
    });

    // Initialize Wikipedia extended features
    const extendedFeatures = new WikipediaExtendedFeatures(wikipediaService);

    // Initialize Google Search service (optional - will throw if API keys not provided)
    let googleSearchService: GoogleSearchService | null = null;
    try {
      googleSearchService = new GoogleSearchService();
      console.error('Google Search service initialized successfully');
    } catch (error) {
      console.error('Google Search service not available:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Wikipedia functionality will still be available');
    }

    // Create combined MCP server
    const mcpServer = createCombinedMcp(wikipediaService, extendedFeatures, googleSearchService!);

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await mcpServer.connect(transport);

    console.error('Combined MCP Server started successfully');
    console.error('Ready to handle requests via stdio');
    console.error(`Available services: Wikipedia${googleSearchService ? ', Google Search' : ''}`);

  } catch (error) {
    console.error('Failed to start Combined MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
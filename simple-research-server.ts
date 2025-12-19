import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import LRUCache from 'lru-cache';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: axiosRetry.isNetworkOrIdempotentRequestError
});

// Configuration - reads from environment variables
const config = {
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    cseId: process.env.GOOGLE_CSE_ID,
  },
  wikipedia: {
    cacheMax: parseInt(process.env.WIKIPEDIA_CACHE_MAX || '100'),
    cacheTtl: parseInt(process.env.WIKIPEDIA_CACHE_TTL || '300000'),
    defaultLang: process.env.WIKIPEDIA_DEFAULT_LANGUAGE || 'en',
  },
  server: {
    name: process.env.SERVER_NAME || 'research-mcp-server',
  },
};

// Initialize caches
const wikiCache = new LRUCache<string, any>({
  max: config.wikipedia.cacheMax,
  ttl: config.wikipedia.cacheTtl,
});

const googleCache = new LRUCache<string, any>({
  max: 100,
  ttl: 30 * 60 * 1000, // 30 minutes
});

export default class SimpleResearchMCPServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: config.server.name,
      version: '1.0.0',
    });

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Google Search Tool
    this.server.registerTool(
      'google_search',
      {
        title: 'Google Search',
        description: 'Search the web using Google Custom Search API',
        inputSchema: z.object({
          q: z.string().describe('Search query'),
          num: z.number().min(1).max(10).optional().default(5).describe('Number of results'),
        }),
      },
      async ({ q, num }) => {
        if (!config.google.apiKey || !config.google.cseId) {
          return {
            content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
          };
        }

        const cacheKey = `google:${q}:${num}`;
        let data = googleCache.get(cacheKey);
        if (!data) {
          try {
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
              params: {
                key: config.google.apiKey,
                cx: config.google.cseId,
                q,
                num,
              },
              timeout: 10000,
            });
            data = response.data;
            googleCache.set(cacheKey, data);
          } catch (error) {
            return {
              content: [{ type: 'text', text: `Google search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            };
          }
        }

        const items = data.items || [];
        const results = items.map((item: any, index: number) =>
          `${index + 1}. **${item.title}**\n   ${item.snippet}\n   ${item.link}`
        ).join('\n\n');

        return {
          content: [{ type: 'text', text: `Found ${items.length} results for "${q}":\n\n${results}` }],
        };
      }
    );

    // Wikipedia Search Tool
    this.server.registerTool(
      'wikipedia_search',
      {
        title: 'Wikipedia Search',
        description: 'Search Wikipedia articles',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
          limit: z.number().min(1).max(10).optional().default(5).describe('Number of results'),
        }),
      },
      async ({ query, limit }) => {
        const cacheKey = `wiki:search:${config.wikipedia.defaultLang}:${query}`;
        let data = wikiCache.get(cacheKey);
        if (!data) {
          try {
            const endpoint = `https://${config.wikipedia.defaultLang}.wikipedia.org/w/api.php`;
            const response = await axios.get(endpoint, {
              params: {
                action: 'query',
                list: 'search',
                srsearch: query,
                format: 'json',
                srlimit: limit,
                srprop: 'title|snippet',
              },
              timeout: 10000,
            });
            data = response.data;
            wikiCache.set(cacheKey, data);
          } catch (error) {
            return {
              content: [{ type: 'text', text: `Wikipedia search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            };
          }
        }

        const results = data?.query?.search || [];
        const output = results.map((result: any) =>
          `- **${result.title}**: ${result.snippet || 'No snippet available'}`
        ).join('\n');

        return {
          content: [{ type: 'text', text: `Found ${results.length} Wikipedia results for "${query}":\n\n${output}` }],
        };
      }
    );

    // Wikipedia Get Page Tool
    this.server.registerTool(
      'wikipedia_get_page',
      {
        title: 'Get Wikipedia Page',
        description: 'Get Wikipedia page content',
        inputSchema: z.object({
          title: z.string().describe('Page title'),
        }),
      },
      async ({ title }) => {
        const cacheKey = `wiki:page:${config.wikipedia.defaultLang}:${title}`;
        let data = wikiCache.get(cacheKey);
        if (!data) {
          try {
            const endpoint = `https://${config.wikipedia.defaultLang}.wikipedia.org/w/api.php`;
            const response = await axios.get(endpoint, {
              params: {
                action: 'parse',
                page: title,
                format: 'json',
                prop: 'text',
                disableeditsection: '1',
              },
              timeout: 10000,
            });
            data = response.data;
            wikiCache.set(cacheKey, data);
          } catch (error) {
            return {
              content: [{ type: 'text', text: `Failed to get Wikipedia page: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            };
          }
        }

        const pageData = data?.parse;
        if (!pageData) {
          return {
            content: [{ type: 'text', text: `Wikipedia page "${title}" not found.` }],
          };
        }

        const content = pageData.text?.['*'] || 'No content available';
        const cleanContent = cheerio.load(content).text().substring(0, 2000);

        return {
          content: [{ type: 'text', text: `**${pageData.title}**\n\n${cleanContent}...` }],
        };
      }
    );

    // Content Extraction Tool
    this.server.registerTool(
      'extract_content',
      {
        title: 'Extract Web Content',
        description: 'Extract main content from a web page',
        inputSchema: z.object({
          url: z.string().url().describe('URL to extract content from'),
        }),
      },
      async ({ url }) => {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });

          const $ = cheerio.load(response.data);

          // Remove unwanted elements
          $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

          const title = $('title').text().trim() ||
                       $('h1').first().text().trim() ||
                       'No title found';

          // Try to find main content
          let content = '';
          const selectors = ['main', 'article', '.content', '.post', '.entry', '#content', '#main'];
          for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
              content = element.text().trim();
              break;
            }
          }
          if (!content) content = $('body').text().trim();

          // Clean and limit content
          content = content.replace(/\s+/g, ' ').trim();
          if (content.length > 3000) content = content.substring(0, 3000) + '...';

          return {
            content: [{ type: 'text', text: `**${title}**\n\n${content}` }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
          };
        }
      }
    );
  }

  private setupResources() {
    // Google Search Results Resource
    this.server.registerResource(
      'Google Search Results',
      new ResourceTemplate('google://search/{query}', { list: undefined }),
      {
        description: 'Cached Google search results',
        mimeType: 'application/json',
      },
      async (uri: URL, variables, extra) => {
        const query = decodeURIComponent(variables.query as string);
        const cacheKey = `google:${query}:5`;
        let data = googleCache.get(cacheKey);

        if (!data) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Search results not cached. Use the google_search tool first.' }),
            }],
          };
        }

        return {
          contents: [{
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data),
          }],
        };
      }
    );

    // Wikipedia Search Results Resource
    this.server.registerResource(
      'Wikipedia Search Results',
      new ResourceTemplate('wikipedia://search/{query}', { list: undefined }),
      {
        description: 'Cached Wikipedia search results',
        mimeType: 'application/json',
      },
      async (uri: URL, variables, extra) => {
        const query = decodeURIComponent(variables.query as string);
        const cacheKey = `wiki:search:${config.wikipedia.defaultLang}:${query}`;
        const data = wikiCache.get(cacheKey);

        if (!data) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Search results not cached. Use the wikipedia_search tool first.' }),
            }],
          };
        }

        return {
          contents: [{
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data),
          }],
        };
      }
    );

    // Wikipedia Page Resource
    this.server.registerResource(
      'Wikipedia Page',
      new ResourceTemplate('wikipedia://page/{title}', { list: undefined }),
      {
        description: 'Cached Wikipedia page content',
        mimeType: 'application/json',
      },
      async (uri: URL, variables, extra) => {
        const title = decodeURIComponent(variables.title as string);
        const cacheKey = `wiki:page:${config.wikipedia.defaultLang}:${title}`;
        const data = wikiCache.get(cacheKey);

        if (!data) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Page not cached. Use the wikipedia_get_page tool first.' }),
            }],
          };
        }

        return {
          contents: [{
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data),
          }],
        };
      }
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const googleStatus = config.google.apiKey && config.google.cseId ? 'enabled' : 'disabled';
    console.error(`Research MCP Server started successfully`);
    console.error(`Google Search: ${googleStatus}`);
    console.error(`Wikipedia: enabled (lang: ${config.wikipedia.defaultLang})`);
  }
}

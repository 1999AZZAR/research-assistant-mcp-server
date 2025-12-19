import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import LRUCache from 'lru-cache';
import Sentiment from 'sentiment';

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

  // Tool definitions (JSON Schema)
const tools = [
  // Enhanced Analysis Tools (No API Keys Required)
  {
    name: 'content_sentiment_analysis',
    description: 'Analyze sentiment of text content using built-in sentiment analysis',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content to analyze' },
      },
      required: ['text'],
    },
  },
  {
    name: 'keyword_extraction',
    description: 'Extract key terms and topics from text content',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content to analyze' },
        maxKeywords: { type: 'number', description: 'Maximum number of keywords to extract', minimum: 1, maximum: 20, default: 10 },
      },
      required: ['text'],
    },
  },
  {
    name: 'url_metadata_extractor',
    description: 'Extract metadata from URLs including title, description, and basic info',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'URL to extract metadata from' },
      },
      required: ['url'],
    },
  },
  {
    name: 'citation_formatter',
    description: 'Format citations in APA, MLA, or Chicago style',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the work' },
        authors: { type: 'array', items: { type: 'string' }, description: 'List of authors' },
        year: { type: 'number', description: 'Publication year' },
        source: { type: 'string', description: 'Source (journal, website, etc.)' },
        url: { type: 'string', format: 'uri', description: 'URL if applicable' },
        style: { type: 'string', enum: ['APA', 'MLA', 'Chicago'], description: 'Citation style', default: 'APA' },
      },
      required: ['title'],
    },
  },
  {
    name: 'research_session_manager',
    description: 'Manage research sessions, save findings, and organize notes',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['save', 'load', 'list', 'delete'], description: 'Action to perform' },
        sessionName: { type: 'string', description: 'Name of the research session' },
        content: { type: 'string', description: 'Content to save (for save action)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'content_deduplication',
    description: 'Remove duplicate content from search results and consolidate similar items',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'array', items: { type: 'object' }, description: 'Array of content items to deduplicate' },
        similarityThreshold: { type: 'number', description: 'Similarity threshold (0-1)', minimum: 0, maximum: 1, default: 0.8 },
      },
      required: ['content'],
    },
  },
  {
    name: 'archive_org_search',
    description: 'Search archived web pages on Archive.org (Wayback Machine)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'Original URL to search in archive' },
        year: { type: 'number', description: 'Specific year to search (optional)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'data_export',
    description: 'Export research data in various formats (JSON, CSV, Markdown)',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Data to export' },
        format: { type: 'string', enum: ['json', 'csv', 'markdown', 'txt'], description: 'Export format', default: 'json' },
        filename: { type: 'string', description: 'Suggested filename' },
      },
      required: ['data'],
    },
  },

  // Google Search Tools (10 total)
  {
    name: 'google_search',
    description: 'Search the web using Google Custom Search API',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query' },
        num: { type: 'number', description: 'Number of results (1-10)', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['q'],
    },
  },
  {
    name: 'extract_content',
    description: 'Extract main content from a web page',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'URL to extract content from' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_analytics',
    description: 'Analyze search trends and get insights from multiple search queries',
    inputSchema: {
      type: 'object',
      properties: {
        queries: { type: 'array', items: { type: 'string' }, description: 'Array of search queries to analyze', minItems: 1, maxItems: 5 },
        timeRange: { type: 'string', enum: ['week', 'month', 'year'], description: 'Time range for trend analysis', default: 'month' },
        maxResults: { type: 'number', description: 'Maximum results per query', minimum: 1, maximum: 5, default: 3 },
      },
      required: ['queries'],
    },
  },
  {
    name: 'multi_site_search',
    description: 'Search across multiple specific websites simultaneously',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        sites: { type: 'array', items: { type: 'string' }, description: 'Array of websites to search', minItems: 1, maxItems: 5 },
        maxResults: { type: 'number', description: 'Max results per site', minimum: 1, maximum: 5, default: 3 },
        fileType: { type: 'string', enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'rtf'], description: 'File type to search for' },
      },
      required: ['query', 'sites'],
    },
  },
  {
    name: 'news_monitor',
    description: 'Monitor news and get alerts for specific topics',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to monitor' },
        sources: { type: 'array', items: { type: 'string' }, description: 'News sources to monitor' },
        language: { type: 'string', description: 'Language code', default: 'en' },
        country: { type: 'string', description: 'Country code', default: 'us' },
        maxResults: { type: 'number', description: 'Maximum results to return', minimum: 1, maximum: 10, default: 5 },
        dateRestrict: { type: 'string', enum: ['d1', 'd7', 'm1', 'm6', 'y1'], description: 'Date restriction for news', default: 'd7' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'academic_search',
    description: 'Search academic papers and research documents',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Research query' },
        fileType: { type: 'string', enum: ['pdf'], description: 'File type (PDF only)', default: 'pdf' },
        dateRange: { type: 'string', enum: ['d1', 'd7', 'm1', 'm6', 'y1', 'y2'], description: 'Publication date range', default: 'y1' },
        sites: { type: 'array', items: { type: 'string' }, description: 'Academic sites to search', default: ['arxiv.org', 'scholar.google.com', 'researchgate.net'] },
        maxResults: { type: 'number', description: 'Maximum results to return', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'content_summarizer',
    description: 'Summarize content from multiple URLs',
    inputSchema: {
      type: 'object',
      properties: {
        urls: { type: 'array', items: { type: 'string', format: 'uri' }, description: 'Array of URLs to summarize', minItems: 1, maxItems: 5 },
        maxLength: { type: 'number', description: 'Maximum length of each summary', minimum: 50, maximum: 500, default: 200 },
      },
      required: ['urls'],
    },
  },
  {
    name: 'fact_checker',
    description: 'Verify claims by searching for fact-checking sources',
    inputSchema: {
      type: 'object',
      properties: {
        claim: { type: 'string', description: 'The claim or statement to verify' },
      },
      required: ['claim'],
    },
  },
  {
    name: 'research_assistant',
    description: 'Comprehensive research assistant with multi-query analysis',
    inputSchema: {
      type: 'object',
      properties: {
        researchTopic: { type: 'string', description: 'The main research topic or question' },
        researchType: { type: 'string', enum: ['academic', 'news', 'factual', 'comprehensive'], description: 'Type of research', default: 'comprehensive' },
        depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Research depth level', default: 'standard' },
      },
      required: ['researchTopic'],
    },
  },
  {
    name: 'search_trends',
    description: 'Track and analyze search interest trends over time',
    inputSchema: {
      type: 'object',
      properties: {
        topics: { type: 'array', items: { type: 'string' }, description: 'Array of topics to track trends for', minItems: 1, maxItems: 5 },
        timeframe: { type: 'string', enum: ['1M', '3M', '6M', '1Y'], description: 'Time period to analyze', default: '6M' },
      },
      required: ['topics'],
    },
  },

  // Wikipedia Tools (10 total)
  {
    name: 'wikipedia_search',
    description: 'Search Wikipedia articles',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Number of results (1-10)', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'wikipedia_get_page',
    description: 'Get Wikipedia page content',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
      },
      required: ['title'],
    },
  },
  {
    name: 'wikipedia_get_page_by_id',
    description: 'Get Wikipedia page content by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Page ID', minimum: 1 },
        lang: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['id'],
    },
  },
  {
    name: 'wikipedia_get_summary',
    description: 'Get a brief summary of a Wikipedia page',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        lang: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['title'],
    },
  },
  {
    name: 'wikipedia_random',
    description: 'Get a random Wikipedia page',
    inputSchema: {
      type: 'object',
      properties: {
        lang: { type: 'string', description: 'Language code', default: 'en' },
      },
    },
  },
  {
    name: 'wikipedia_page_languages',
    description: 'Get the languages a Wikipedia page is available in',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        lang: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['title'],
    },
  },
  {
    name: 'wikipedia_batch_search',
    description: 'Search multiple queries at once for efficiency',
    inputSchema: {
      type: 'object',
      properties: {
        queries: { type: 'array', items: { type: 'string' }, description: 'Array of search queries', minItems: 1, maxItems: 10 },
        lang: { type: 'string', description: 'Language code', default: 'en' },
        limit: { type: 'number', description: 'Maximum number of results per query', minimum: 1, maximum: 20, default: 5 },
      },
      required: ['queries'],
    },
  },
  {
    name: 'wikipedia_batch_get_pages',
    description: 'Get multiple Wikipedia pages at once for efficiency',
    inputSchema: {
      type: 'object',
      properties: {
        titles: { type: 'array', items: { type: 'string' }, description: 'Array of page titles', minItems: 1, maxItems: 10 },
        lang: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['titles'],
    },
  },
  {
    name: 'wikipedia_search_nearby',
    description: 'Find Wikipedia articles near specific coordinates',
    inputSchema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude coordinate (-90 to 90)', minimum: -90, maximum: 90 },
        lon: { type: 'number', description: 'Longitude coordinate (-180 to 180)', minimum: -180, maximum: 180 },
        radius: { type: 'number', description: 'Search radius in meters', minimum: 1, maximum: 10000, default: 1000 },
        lang: { type: 'string', description: 'Language code', default: 'en' },
        limit: { type: 'number', description: 'Maximum number of results', minimum: 1, maximum: 50, default: 10 },
      },
      required: ['lat', 'lon'],
    },
  },
  {
    name: 'wikipedia_get_pages_in_category',
    description: 'Browse pages within a specific Wikipedia category',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category name (with or without "Category:" prefix)' },
        lang: { type: 'string', description: 'Language code', default: 'en' },
        limit: { type: 'number', description: 'Maximum number of pages to return', minimum: 1, maximum: 100, default: 20 },
        type: { type: 'string', enum: ['page', 'subcat', 'file'], description: 'Type of category members to return', default: 'page' },
      },
      required: ['category'],
    },
  },
];

// Resource definitions
const resources = [
  // Google Search Resources
  {
    uri: 'google://search/{query}',
    name: 'Google Search Results',
    description: 'Cached Google search results',
    mimeType: 'application/json',
  },
  {
    uri: 'google://search-trends/{topic}',
    name: 'Search Trends Data',
    description: 'Search trends and analytics data',
    mimeType: 'application/json',
  },
  {
    uri: 'google://search-analytics/{query}',
    name: 'Search Analytics',
    description: 'Search analytics and insights',
    mimeType: 'application/json',
  },
  {
    uri: 'google://extracted-content/{url}',
    name: 'Extracted Content Cache',
    description: 'Cached web content extraction results',
    mimeType: 'application/json',
  },

  // Wikipedia Resources
  {
    uri: 'wikipedia://search/{query}',
    name: 'Wikipedia Search Results',
    description: 'Cached Wikipedia search results',
    mimeType: 'application/json',
  },
  {
    uri: 'wikipedia://page/{title}',
    name: 'Wikipedia Page',
    description: 'Cached Wikipedia page content',
    mimeType: 'application/json',
  },
  {
    uri: 'wikipedia://article/{title}/{lang}',
    name: 'Cached Wikipedia Article',
    description: 'Full cached content of a Wikipedia article with metadata',
    mimeType: 'application/json',
  },
  {
    uri: 'wikipedia://search-results/{query}/{lang}',
    name: 'Cached Wikipedia Search Results',
    description: 'Detailed cached Wikipedia search results',
    mimeType: 'application/json',
  },

  // Enhanced Analysis Resources (No API Keys Required)
  {
    uri: 'analysis://sentiment/{text}',
    name: 'Sentiment Analysis Results',
    description: 'Cached sentiment analysis of text content',
    mimeType: 'application/json',
  },
  {
    uri: 'analysis://keywords/{text}',
    name: 'Keyword Extraction Results',
    description: 'Cached keyword extraction from text content',
    mimeType: 'application/json',
  },
  {
    uri: 'analysis://url-metadata/{url}',
    name: 'URL Metadata Cache',
    description: 'Cached metadata extracted from URLs',
    mimeType: 'application/json',
  },
  {
    uri: 'research://sessions/{name}',
    name: 'Research Sessions',
    description: 'Saved research sessions and findings',
    mimeType: 'application/json',
  },
  {
    uri: 'archive://snapshots/{url}',
    name: 'Archive.org Snapshots',
    description: 'Cached archived versions of web pages',
    mimeType: 'application/json',
  },
];

export default class ResearchMCPServer {
  private server: Server;
  private googleCache: LRUCache<string, any>;
  private wikipediaCache: LRUCache<string, any>;
  private googleSearch: any;
  private wikipedia: any;
  private researchSessions: Map<string, any>;

  constructor() {
    this.server = new Server(
      {
        name: config.server.name,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.googleCache = new LRUCache<string, any>({
      max: 500,
      ttl: 1000 * 60 * 30, // 30 minutes
    });

    this.wikipediaCache = new LRUCache<string, any>({
      max: config.wikipedia.cacheMax,
      ttl: config.wikipedia.cacheTtl,
    });

    this.researchSessions = new Map();

    this.googleSearch = {
      search: async (params: any) => {
        if (!config.google.apiKey || !config.google.cseId) {
          throw new Error('Google Search not configured');
        }
        const cacheKey = `google:${JSON.stringify(params)}`;
        let result = this.googleCache.get(cacheKey);
        if (result) return result;

        const url = `https://www.googleapis.com/customsearch/v1`;
        const response = await axios.get(url, {
          params: {
            key: config.google.apiKey,
            cx: config.google.cseId,
            ...params,
          },
          timeout: 10000,
        });
        result = response.data;
        this.googleCache.set(cacheKey, result);
        return result;
      }
    };

    this.wikipedia = {
      search: async (query: string, options: any = {}) => {
        const lang = options.lang || 'en';
        const limit = options.limit || 10;
        const cacheKey = `wiki:search:${lang}:${query}:${limit}`;
        let result = this.wikipediaCache.get(cacheKey);
        if (result) return result;

        const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
        const response = await axios.get(endpoint, {
          params: {
            action: 'query',
            format: 'json',
            list: 'search',
            srsearch: query,
            srlimit: limit,
            srprop: 'title|snippet|timestamp',
          },
          timeout: 10000,
        });
        result = response.data;
        this.wikipediaCache.set(cacheKey, result);
        return result;
      },
      getPage: async (title: string, options: any = {}) => {
        const lang = options.lang || 'en';
        const cacheKey = `wiki:page:${lang}:${title}`;
        let result = this.wikipediaCache.get(cacheKey);
        if (result) return result;

        const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
        const response = await axios.get(endpoint, {
          params: {
            action: 'query',
            format: 'json',
            titles: title,
            prop: 'extracts|revisions',
            explaintext: '1',
            exsectionformat: 'plain',
            rvprop: 'content',
          },
          timeout: 10000,
        });
        result = response.data;
        this.wikipediaCache.set(cacheKey, result);
        return result;
      },
      getPageById: async (id: number, options: any = {}) => {
        const lang = options.lang || 'en';
        const cacheKey = `wiki:pageid:${lang}:${id}`;
        let result = this.wikipediaCache.get(cacheKey);
        if (result) return result;

        const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
        const response = await axios.get(endpoint, {
          params: {
            action: 'query',
            format: 'json',
            pageids: id,
            prop: 'extracts|revisions',
            explaintext: '1',
            exsectionformat: 'plain',
            rvprop: 'content',
          },
          timeout: 10000,
        });
        result = response.data;
        this.wikipediaCache.set(cacheKey, result);
        return result;
      }
    };

    this.setupHandlers();
  }

  private cleanWikipediaContent(content: string): string {
    // Remove references and citations
    content = content.replace(/\[[\d]+\]/g, '');
    // Clean up multiple spaces
    content = content.replace(/\s+/g, ' ').trim();
    return content;
  }

  private analyzeSentiment(text: string): any {
    const sentiment = new Sentiment();
    return sentiment.analyze(text);
  }

  private extractKeywords(text: string, maxKeywords: number): any[] {
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const wordCount: { [key: string]: number } = {};

    // Count word frequencies
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Remove common stop words
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'an', 'a', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
    Object.keys(wordCount).forEach(word => {
      if (stopWords.includes(word)) {
        delete wordCount[word];
      }
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word, frequency]) => ({ word, frequency }));
  }

  private async extractUrlMetadata(url: string): Promise<any> {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      const contentType = response.headers['content-type'] || 'unknown';

      // Try to get more metadata if it's HTML
      if (contentType.includes('text/html')) {
        const fullResponse = await axios.get(url, { timeout: 5000 });
        const $ = cheerio.load(fullResponse.data);

        return {
          title: $('title').text().trim(),
          description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
          keywords: $('meta[name="keywords"]').attr('content'),
          contentType,
          statusCode: response.status,
        };
      }

      return {
        title: null,
        description: null,
        keywords: null,
        contentType,
        statusCode: response.status,
      };
    } catch (error) {
      throw new Error(`Failed to fetch URL metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatCitation(data: any): string {
    const { title, authors, year, source, url, style } = data;

    switch (style.toUpperCase()) {
      case 'APA':
        const authorStr = authors.length > 0 ? `${authors[0]} (${year})` : `(${year})`;
        return `${authorStr}. ${title}. ${source}${url ? `. ${url}` : ''}`;

      case 'MLA':
        const mlaAuthors = authors.length > 0 ? authors.join(', ') : 'Unknown Author';
        return `${mlaAuthors}. "${title}." ${source}, ${year}${url ? `, ${url}` : ''}.`;

      case 'CHICAGO':
        const chicagoAuthors = authors.length > 0 ? authors.join(', ') : 'Unknown Author';
        return `${chicagoAuthors}. "${title}." ${source}, ${year}${url ? `. ${url}` : ''}.`;

      default:
        return `${authors.join(', ')} (${year}). ${title}. ${source}.`;
    }
  }

  private async manageResearchSession(action: string, sessionName?: string, content?: string): Promise<string> {
    // Simple in-memory session storage (in production, this would use persistent storage)
    if (!this.researchSessions) {
      this.researchSessions = new Map();
    }

    switch (action) {
      case 'save':
        if (!sessionName || !content) {
          throw new Error('Session name and content required for save action');
        }
        this.researchSessions.set(sessionName, {
          content,
          timestamp: new Date().toISOString(),
        });
        return `Research session "${sessionName}" saved successfully.`;

      case 'load':
        if (!sessionName) {
          throw new Error('Session name required for load action');
        }
        const session = this.researchSessions.get(sessionName);
        if (!session) {
          throw new Error(`Research session "${sessionName}" not found.`);
        }
        return `Research session "${sessionName}" loaded:\n\n${session.content}`;

      case 'list':
        const sessions = Array.from(this.researchSessions.keys());
        return `Available research sessions:\n${sessions.length > 0 ? sessions.map(name => `- ${name}`).join('\n') : 'No sessions found.'}`;

      case 'delete':
        if (!sessionName) {
          throw new Error('Session name required for delete action');
        }
        if (this.researchSessions.delete(sessionName)) {
          return `Research session "${sessionName}" deleted successfully.`;
        } else {
          throw new Error(`Research session "${sessionName}" not found.`);
        }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private deduplicateContent(content: any[], threshold: number): any[] {
    const unique: any[] = [];

    content.forEach(item => {
      let isDuplicate = false;
      for (const existing of unique) {
        if (this.calculateSimilarity(item, existing) > threshold) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        unique.push(item);
      }
    });

    return unique;
  }

  private calculateSimilarity(item1: any, item2: any): number {
    // Simple similarity based on title/text overlap
    const text1 = (item1.title || item1.text || '').toLowerCase();
    const text2 = (item2.title || item2.text || '').toLowerCase();

    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private async searchArchiveOrg(url: string, year?: number): Promise<any[]> {
    try {
      const baseUrl = 'https://archive.org/wayback/available';
      const params: any = { url };

      if (year) {
        // Search for snapshots from the specified year
        const startDate = `${year}0101`;
        const endDate = `${year}1231`;
        params.timestamp = startDate;
      }

      const response = await axios.get(baseUrl, { params, timeout: 10000 });

      if (response.data?.archived_snapshots) {
        const snapshots = Object.values(response.data.archived_snapshots);
        return snapshots.map((snapshot: any) => ({
          timestamp: snapshot.timestamp,
          url: snapshot.url,
        }));
      }

      return [];
    } catch (error) {
      throw new Error(`Archive.org search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private exportData(data: any, format: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
          ];
          return csvRows.join('\n');
        }
        return 'Data is not an array or is empty';

      case 'markdown':
        if (Array.isArray(data)) {
          if (data.length === 0) return 'No data to export';
          const headers = Object.keys(data[0]);
          const markdownRows = [
            `| ${headers.join(' | ')} |`,
            `| ${headers.map(() => '---').join(' | ')} |`,
            ...data.map(row => `| ${headers.map(header => row[header] || '').join(' | ')} |`)
          ];
          return markdownRows.join('\n');
        } else {
          return Object.entries(data).map(([key, value]) => `**${key}:** ${value}`).join('\n');
        }

      case 'txt':
        return JSON.stringify(data, null, 2); // Fallback to JSON for txt format

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private setupHandlers() {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources };
    });

    // Call tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'google_search':
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
              };
            }

            const { q, num = 5 } = args as any;
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

          case 'wikipedia_search':
            const { query, limit = 5 } = args as any;
            const wikiCacheKey = `wiki:search:${config.wikipedia.defaultLang}:${query}`;
            let wikiData = wikiCache.get(wikiCacheKey);
            if (!wikiData) {
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
                wikiData = response.data;
                wikiCache.set(wikiCacheKey, wikiData);
              } catch (error) {
                return {
                  content: [{ type: 'text', text: `Wikipedia search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
                };
              }
            }

            const wikiResults = wikiData?.query?.search || [];
            const output = wikiResults.map((result: any) =>
              `- **${result.title}**: ${result.snippet || 'No snippet available'}`
            ).join('\n');

            return {
              content: [{ type: 'text', text: `Found ${wikiResults.length} Wikipedia results for "${query}":\n\n${output}` }],
            };

          case 'wikipedia_get_page':
            const { title } = args as any;
            const pageCacheKey = `wiki:page:${config.wikipedia.defaultLang}:${title}`;
            let pageData = wikiCache.get(pageCacheKey);
            if (!pageData) {
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
                pageData = response.data;
                wikiCache.set(pageCacheKey, pageData);
              } catch (error) {
                return {
                  content: [{ type: 'text', text: `Failed to get Wikipedia page: ${error instanceof Error ? error.message : 'Unknown error'}` }],
                };
              }
            }

            const parsedPage = pageData?.parse;
            if (!parsedPage) {
              return {
                content: [{ type: 'text', text: `Wikipedia page "${title}" not found.` }],
              };
            }

            const content = parsedPage.text?.['*'] || 'No content available';
            const cleanContent = cheerio.load(content).text().substring(0, 2000);

            return {
              content: [{ type: 'text', text: `**${parsedPage.title}**\n\n${cleanContent}...` }],
            };

          case 'extract_content':
            const { url } = args as any;
            try {
              const response = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
              });

              const $ = cheerio.load(response.data);

              // Remove unwanted elements
              $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

              const pageTitle = $('title').text().trim() ||
                           $('h1').first().text().trim() ||
                           'No title found';

              // Try to find main content
              let pageContent = '';
              const selectors = ['main', 'article', '.content', '.post', '.entry', '#content', '#main'];
              for (const selector of selectors) {
                const element = $(selector);
                if (element.length > 0) {
                  pageContent = element.text().trim();
                  break;
                }
              }
              if (!pageContent) pageContent = $('body').text().trim();

              // Clean and limit content
              pageContent = pageContent.replace(/\s+/g, ' ').trim();
              if (pageContent.length > 3000) pageContent = pageContent.substring(0, 3000) + '...';

              return {
                content: [{ type: 'text', text: `**${pageTitle}**\n\n${pageContent}` }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'search_analytics':
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
              };
            }
            const { queries: analyticsQueries, timeRange = 'month', maxResults: analyticsMax = 3 } = args as any;
            try {
              const analyticsResults = [];
              for (const query of analyticsQueries.slice(0, 5)) {
                const result = await this.googleSearch.search({ q: query, num: analyticsMax });
                analyticsResults.push({
                  query,
                  resultsCount: result.items?.length || 0,
                  topDomains: result.items?.slice(0, analyticsMax).map((item: any) => {
                    try {
                      return new URL(item.link).hostname;
                    } catch {
                      return 'unknown';
                    }
                  }) || []
                });
              }

              return {
                content: [{
                  type: 'text',
                  text: `Search Analytics for ${analyticsResults.length} queries (${timeRange}):\n\n${analyticsResults.map((result, index) =>
                    `${index + 1}. "${result.query}": ${result.resultsCount} results\n   Top domains: ${result.topDomains.join(', ')}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Search analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'multi_site_search':
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
              };
            }
            const { query: multiQuery, sites: multiSites, maxResults: multiMax = 3, fileType: multiFileType } = args as any;
            try {
              const siteSearch = multiSites.join(' OR site:');
              const result = await this.googleSearch.search({
                q: `${multiQuery} site:${siteSearch}`,
                fileType: multiFileType,
                num: multiMax,
              });

              const items = result.items || [];
              return {
                content: [{
                  type: 'text',
                  text: `Multi-site search results for "${multiQuery}" across ${multiSites.join(', ')}:\n\n${items.map((item: any, index: number) =>
                    `${index + 1}. **${item.title}**\n   ${item.snippet}\n   ${item.link}\n   Site: ${item.displayLink}`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Multi-site search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'academic_search':
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
              };
            }
            const { query: academicQuery, fileType: academicFileType, dateRange: academicDateRange, sites: academicSites, maxResults: academicMax = 5 } = args as any;
            try {
              const siteSearch = academicSites.join(' OR site:');
              const results = await this.googleSearch.search({
                q: `${academicQuery} site:${siteSearch}`,
                fileType: academicFileType,
                dateRestrict: academicDateRange,
                num: academicMax,
              });
              const items = results.items || [];
              return {
                content: [{
                  type: 'text',
                  text: `Found ${items.length} academic results for "${academicQuery}":\n\n${items.map((item: any, index: number) =>
                    `${index + 1}. **${item.title}**\n   ${item.snippet}\n   ${item.link}\n`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Academic search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'news_monitor':
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                content: [{ type: 'text', text: 'Google Search not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' }],
              };
            }
            const { topic, sources = [], language = 'en', country = 'us', maxResults: newsMax = 5, dateRestrict: newsDate = 'd7' } = args as any;
            try {
              const newsSites = sources.length > 0 ? sources : ['bbc.com', 'cnn.com', 'reuters.com', 'apnews.com', 'nytimes.com'];
              const siteSearch = newsSites.join(' OR site:');
              const results = await this.googleSearch.search({
                q: `${topic} site:${siteSearch}`,
                dateRestrict: newsDate,
                hl: language,
                gl: country,
                num: newsMax,
              });
              const items = results.items || [];
              return {
                content: [{
                  type: 'text',
                  text: `Found ${items.length} news articles about "${topic}":\n\n${items.map((item: any, index: number) =>
                    `${index + 1}. **${item.title}**\n   ${item.snippet}\n   ${item.link}\n   Source: ${item.displayLink}\n`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `News search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'content_summarizer':
            const { urls, maxLength = 200 } = args as any;
            try {
              const summaries = [];
              for (const url of urls.slice(0, 5)) {
                try {
                  const response = await axios.get(url, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                  });
                  const $ = cheerio.load(response.data);
                  $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

                  const title = $('title').text().trim() || 'No title';
                  let content = $('body').text().trim();
                  content = content.replace(/\s+/g, ' ').substring(0, maxLength * 2);

                  summaries.push({ url, title, summary: content.substring(0, maxLength) + '...' });
                } catch (error) {
                  summaries.push({ url, error: 'Failed to extract content' });
                }
              }

              return {
                content: [{
                  type: 'text',
                  text: `Content summaries for ${summaries.length} URLs:\n\n${summaries.map((item, index) =>
                    item.error
                      ? `${index + 1}. ${item.url}: ${item.error}`
                      : `${index + 1}. **${item.title}**\n   ${item.summary}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Content summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'fact_checker':
            const { claim } = args as any;
            try {
              // Search for the claim and related fact-checking
              const searchResults = await this.googleSearch.search({
                q: `${claim} fact check OR verification OR debunk`,
                num: 5,
              });

              const items = searchResults.items || [];
              const analysis = items.map((item: any) => ({
                title: item.title,
                source: item.displayLink,
                snippet: item.snippet,
                url: item.link,
              }));

              return {
                content: [{
                  type: 'text',
                  text: `Fact-check analysis for: "${claim}"\n\nFound ${analysis.length} relevant sources:\n\n${analysis.map((item: any, index: number) =>
                    `${index + 1}. **${item.title}**\n   Source: ${item.source}\n   ${item.snippet}\n   ${item.url}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Fact checking failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'research_assistant':
            const { researchTopic, researchType = 'comprehensive', depth = 'standard' } = args as any;
            try {
              const queries = [
                researchTopic,
                `${researchTopic} overview`,
                `${researchTopic} key facts`,
                `${researchTopic} recent developments`,
                `${researchTopic} analysis`,
              ];

              const results = [];
              for (const query of queries.slice(0, 3)) {
                const searchResult = await this.googleSearch.search({ q: query, num: 2 });
                results.push({
                  query,
                  results: searchResult.items?.slice(0, 2) || [],
                });
              }

              return {
                content: [{
                  type: 'text',
                  text: `Research Assistant - ${researchTopic} (${researchType}, ${depth} depth)\n\n${results.map((section, index) =>
                    `**${section.query}**\n${section.results.map((item: any) =>
                      `• ${item.title} (${item.displayLink})`
                    ).join('\n')}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Research assistant failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'search_trends':
            const { topics, timeframe = '6M' } = args as any;
            try {
              // Note: This is a simplified version since we don't have access to Google Trends API
              // In a real implementation, this would use Google Trends API
              const trendsResults = [];
              for (const topic of topics.slice(0, 3)) {
                const searchResult = await this.googleSearch.search({
                  q: `${topic} trend OR trending`,
                  dateRestrict: 'm1', // Last month
                  num: 3,
                });

                trendsResults.push({
                  topic,
                  timeframe,
                  recentActivity: searchResult.items?.length || 0,
                  topSources: searchResult.items?.slice(0, 3).map((item: any) => ({
                    title: item.title,
                    source: item.displayLink,
                    date: item.snippet.match(/\d{1,2} \w+ \d{4}/)?.[0] || 'Recent',
                  })) || [],
                });
              }

              return {
                content: [{
                  type: 'text',
                  text: `Search Trends Analysis (${timeframe}):\n\n${trendsResults.map((trend, index) =>
                    `**${trend.topic}**\n` +
                    `Recent activity: ${trend.recentActivity} mentions\n` +
                    `Top sources:\n${trend.topSources.map((source: any) =>
                      `• ${source.title} (${source.source}) - ${source.date}`
                    ).join('\n')}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Search trends failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_get_page_by_id':
            const { id, lang: idLang = 'en' } = args as any;
            try {
              const result = await this.wikipedia.getPageById(id, { lang: idLang });
              if (!result.query?.pages?.[id]) {
                return {
                  content: [{ type: 'text', text: `Wikipedia page with ID ${id} not found.` }],
                };
              }

              const page = result.query.pages[id];
              const cleanContent = this.cleanWikipediaContent(page.extract || page.missing ? 'Page not found' : 'No content available');

              return {
                content: [{ type: 'text', text: `**${page.title}**\n\n${cleanContent.substring(0, 2000)}...` }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Failed to get Wikipedia page by ID: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_get_summary':
            const { title: summaryTitle, lang: summaryLang = 'en' } = args as any;
            try {
              const endpoint = `https://${summaryLang}.wikipedia.org/w/api.php`;
              const response = await axios.get(endpoint, {
                params: {
                  action: 'query',
                  format: 'json',
                  prop: 'extracts',
                  titles: summaryTitle,
                  exsentences: '3',
                  explaintext: '1',
                  exsectionformat: 'plain'
                },
                timeout: 10000,
              });

              const data = response.data;
              const pages = data.query?.pages;
              const pageId = Object.keys(pages || {})[0];
              const page = pages?.[pageId];

              if (!page || page.missing) {
                return {
                  content: [{ type: 'text', text: `Summary for Wikipedia page "${summaryTitle}" not found.` }],
                };
              }

              return {
                content: [{ type: 'text', text: `Summary for "${summaryTitle}":\n\n${page.extract || 'No summary available'}` }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Failed to get Wikipedia summary: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_random':
            const { lang: randomLang = 'en' } = args as any;
            try {
              const endpoint = `https://${randomLang}.wikipedia.org/w/api.php`;
              const response = await axios.get(endpoint, {
                params: {
                  action: 'query',
                  format: 'json',
                  list: 'random',
                  rnlimit: '1',
                  rnnamespace: '0'
                },
                timeout: 10000,
              });

              const randomPage = response.data?.query?.random?.[0];
              if (!randomPage) {
                return {
                  content: [{ type: 'text', text: 'No random Wikipedia page found.' }],
                };
              }

              return {
                content: [{ type: 'text', text: `Random Wikipedia page: ${randomPage.title} (ID: ${randomPage.id})` }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Failed to get random Wikipedia page: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_page_languages':
            const { title: langTitle, lang: langLang = 'en' } = args as any;
            try {
              const endpoint = `https://${langLang}.wikipedia.org/w/api.php`;
              const response = await axios.get(endpoint, {
                params: {
                  action: 'query',
                  format: 'json',
                  prop: 'langlinks',
                  titles: langTitle,
                  lllimit: 'max'
                },
                timeout: 10000,
              });

              const data = response.data;
              const pages = data.query?.pages;
              const pageId = Object.keys(pages || {})[0];
              const page = pages?.[pageId];

              if (!page || page.missing) {
                return {
                  content: [{ type: 'text', text: `No language information found for Wikipedia page "${langTitle}".` }],
                };
              }

              const languages = page.langlinks || [];
              return {
                content: [{
                  type: 'text',
                  text: `Languages available for "${langTitle}":\n\n${languages.map((lang: any) =>
                    `- ${lang.lang}: ${lang['*'] || lang.title || 'Unknown'}`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Failed to get Wikipedia page languages: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_batch_search':
            const { queries: wikiQueries, lang: batchLang = 'en', limit: batchLimit = 5 } = args as any;
            try {
              const results = [];
              for (const query of wikiQueries.slice(0, 10)) {
                try {
                  const result = await this.wikipedia.search(query, { lang: batchLang, limit: batchLimit });
                  results.push({ query, success: true, count: result?.query?.search?.length || 0 });
                } catch (error) {
                  results.push({ query, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                }
              }

              return {
                content: [{
                  type: 'text',
                  text: `Batch Wikipedia search results for ${results.length} queries:\n\n${results.map((result, index) =>
                    result.success
                      ? `✅ "${result.query}": ${result.count} results`
                      : `❌ "${result.query}": ${result.error}`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Batch Wikipedia search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_batch_get_pages':
            const { titles: batchTitles, lang: batchPagesLang = 'en' } = args as any;
            try {
              const results = [];
              for (const title of batchTitles.slice(0, 10)) {
                try {
                  const result = await this.wikipedia.getPage(title, { lang: batchPagesLang });
                  const pageId = Object.keys(result.query?.pages || {})[0];
                  const page = result.query?.pages?.[pageId];

                  if (page && !page.missing) {
                    const cleanContent = this.cleanWikipediaContent(page.extract || 'No content');
                    results.push({
                      title,
                      success: true,
                      content: cleanContent.substring(0, 500) + '...'
                    });
                  } else {
                    results.push({ title, success: false, error: 'Page not found' });
                  }
                } catch (error) {
                  results.push({ title, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                }
              }

              return {
                content: [{
                  type: 'text',
                  text: `Batch Wikipedia page results for ${results.length} pages:\n\n${results.map((result, index) =>
                    result.success
                      ? `✅ **${result.title}**\n   ${result.content}`
                      : `❌ **${result.title}**: ${result.error}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Batch Wikipedia page retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_search_nearby':
            const { lat, lon, radius = 1000, lang: nearbyLang = 'en', limit: nearbyLimit = 10 } = args as any;
            try {
              const endpoint = `https://${nearbyLang}.wikipedia.org/w/api.php`;
              const response = await axios.get(endpoint, {
                params: {
                  action: 'query',
                  format: 'json',
                  list: 'geosearch',
                  gscoord: `${lat}|${lon}`,
                  gsradius: radius,
                  gslimit: nearbyLimit,
                  gsprop: 'type|name|country|region|globe'
                },
                timeout: 10000,
              });

              const places = response.data?.query?.geosearch || [];
              if (places.length === 0) {
                return {
                  content: [{ type: 'text', text: `No Wikipedia articles found near coordinates (${lat}, ${lon}) within ${radius}m radius.` }],
                };
              }

              return {
                content: [{
                  type: 'text',
                  text: `Found ${places.length} Wikipedia articles near (${lat}, ${lon}) within ${radius}m:\n\n${places.map((place: any, index: number) =>
                    `${index + 1}. 📍 ${place.title}\n   Distance: ${place.dist}m\n   Coordinates: ${place.lat}, ${place.lon}`
                  ).join('\n\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Wikipedia nearby search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'wikipedia_get_pages_in_category':
            const { category, lang: catLang = 'en', limit: catLimit = 20, type: catType = 'page' } = args as any;
            try {
              const categoryTitle = category.startsWith('Category:') ? category : `Category:${category}`;
              const endpoint = `https://${catLang}.wikipedia.org/w/api.php`;
              const response = await axios.get(endpoint, {
                params: {
                  action: 'query',
                  format: 'json',
                  list: 'categorymembers',
                  cmtitle: categoryTitle,
                  cmtype: catType,
                  cmlimit: catLimit,
                  cmprop: 'title|type|ids'
                },
                timeout: 10000,
              });

              const members = response.data?.query?.categorymembers || [];
              if (members.length === 0) {
                return {
                  content: [{ type: 'text', text: `No pages found in Wikipedia category "${category}".` }],
                };
              }

              return {
                content: [{
                  type: 'text',
                  text: `Found ${members.length} ${catType}s in category "${category}":\n\n${members.map((member: any, index: number) =>
                    `${index + 1}. 📄 ${member.title} (ID: ${member.pageid})`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Failed to get Wikipedia category pages: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'content_sentiment_analysis':
            const { text } = args as any;
            try {
              // Note: This would use the sentiment library we have in package.json
              // For now, we'll implement a basic version
              const sentiment = this.analyzeSentiment(text);
              return {
                content: [{
                  type: 'text',
                  text: `Sentiment Analysis for text:\n\n` +
                        `Score: ${sentiment.score}\n` +
                        `Comparative: ${sentiment.comparative}\n` +
                        `Positive words: ${sentiment.positive.join(', ')}\n` +
                        `Negative words: ${sentiment.negative.join(', ')}\n\n` +
                        `Overall: ${sentiment.score > 0 ? 'Positive' : sentiment.score < 0 ? 'Negative' : 'Neutral'}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'keyword_extraction':
            const { text: keywordText, maxKeywords = 10 } = args as any;
            try {
              const keywords = this.extractKeywords(keywordText, maxKeywords);
              return {
                content: [{
                  type: 'text',
                  text: `Extracted ${keywords.length} keywords:\n\n${keywords.map((keyword: any, index: number) =>
                    `${index + 1}. ${keyword.word} (${keyword.frequency} occurrences)`
                  ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Keyword extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'url_metadata_extractor':
            const { url: metaUrl } = args as any;
            try {
              const metadata = await this.extractUrlMetadata(metaUrl);
              return {
                content: [{
                  type: 'text',
                  text: `URL Metadata for: ${metaUrl}\n\n` +
                        `Title: ${metadata.title || 'Not found'}\n` +
                        `Description: ${metadata.description || 'Not found'}\n` +
                        `Keywords: ${metadata.keywords || 'Not found'}\n` +
                        `Content-Type: ${metadata.contentType || 'Not found'}\n` +
                        `Status: ${metadata.statusCode || 'Unknown'}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `URL metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'citation_formatter':
            const { title: citeTitle, authors = [], year, source, url: citeUrl, style = 'APA' } = args as any;
            try {
              const citation = this.formatCitation({ title: citeTitle, authors, year, source, url: citeUrl, style });
              return {
                content: [{
                  type: 'text',
                  text: `${style} Citation:\n\n${citation}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Citation formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'research_session_manager':
            const { action, sessionName, content: sessionContent } = args as any;
            try {
              const result = await this.manageResearchSession(action, sessionName, sessionContent);
              return {
                content: [{ type: 'text', text: result }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Session management failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'content_deduplication':
            const { content: dupContent, similarityThreshold = 0.8 } = args as any;
            try {
              const deduplicated = this.deduplicateContent(dupContent, similarityThreshold);
              return {
                content: [{
                  type: 'text',
                  text: `Deduplication Results:\n\n` +
                        `Original items: ${dupContent.length}\n` +
                        `Unique items: ${deduplicated.length}\n` +
                        `Duplicates removed: ${dupContent.length - deduplicated.length}\n\n` +
                        `Unique Content:\n${deduplicated.map((item: any, index: number) =>
                          `${index + 1}. ${item.title || item.text || 'Untitled'}`
                        ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Content deduplication failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'archive_org_search':
            const { url: archiveUrl, year: archiveYear } = args as any;
            try {
              const archivedVersions = await this.searchArchiveOrg(archiveUrl, archiveYear);
              return {
                content: [{
                  type: 'text',
                  text: `Archive.org search results for: ${archiveUrl}\n\n` +
                        `Found ${archivedVersions.length} archived versions:\n\n${archivedVersions.map((version: any, index: number) =>
                          `${index + 1}. ${version.timestamp} - ${version.url}`
                        ).join('\n')}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Archive.org search failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          case 'data_export':
            const { data: exportData, format = 'json', filename } = args as any;
            try {
              const exported = this.exportData(exportData, format);
              return {
                content: [{
                  type: 'text',
                  text: `Data exported as ${format.toUpperCase()}:\n\n${exported}\n\nSuggested filename: ${filename || `export.${format}`}`,
                }],
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Data export failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              };
            };

          default:
            return {
              content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            };
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
      }
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const url = new URL(uri);

      try {
        if (url.protocol === 'google:' && url.pathname.startsWith('/search/')) {
          const query = decodeURIComponent(url.pathname.replace('/search/', ''));
          const cacheKey = `google:${query}:5`;
          let data = googleCache.get(cacheKey);

          if (!data) {
            if (!config.google.apiKey || !config.google.cseId) {
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({ error: 'Google Search not configured' }),
                }],
              };
            }

            try {
              const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                  key: config.google.apiKey,
                  cx: config.google.cseId,
                  q: query,
                  num: 5,
                },
                timeout: 10000,
              });
              data = response.data;
              googleCache.set(cacheKey, data);
            } catch (error) {
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({ error: `Failed to search Google: ${error instanceof Error ? error.message : 'Unknown error'}` }),
                }],
              };
            }
          }

          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data),
            }],
          };
        }

        if (url.protocol === 'wikipedia:' && url.pathname.startsWith('/search/')) {
          const query = decodeURIComponent(url.pathname.replace('/search/', ''));
          const cacheKey = `wiki:search:${config.wikipedia.defaultLang}:${query}`;
          const data = wikiCache.get(cacheKey);

          if (!data) {
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ error: 'Search results not cached. Use the wikipedia_search tool first.' }),
              }],
            };
          }

          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data),
            }],
          };
        }

        if (url.protocol === 'wikipedia:' && url.pathname.startsWith('/page/')) {
          const title = decodeURIComponent(url.pathname.replace('/page/', ''));
          const cacheKey = `wiki:page:${config.wikipedia.defaultLang}:${title}`;
          const data = wikiCache.get(cacheKey);

          if (!data) {
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ error: 'Page not cached. Use the wikipedia_get_page tool first.' }),
              }],
            };
          }

          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data),
            }],
          };
        }

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Resource not found' }),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          }],
        };
      }
    });
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

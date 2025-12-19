import LRUCache from 'lru-cache';
import { WikipediaEndpointManager, RequestDeduplicator } from './resilience.js';

// Type definition for search results
export type WikiSearchResult = {
  title: string;
  snippet: string;
  pageid: number;
};

export interface WikipediaServiceOptions {
  cache?: LRUCache<string, any>;
  enableDeduplication?: boolean;
  defaultLanguage?: string;
}

export class EnhancedWikipediaService {
  private endpointManagers = new Map<string, WikipediaEndpointManager>();
  private deduplicator = new RequestDeduplicator();
  private cache: LRUCache<string, any> | null;

  constructor(private options: WikipediaServiceOptions = {}) {
    this.cache = options.cache || null;
  }

  private getEndpointManager(language: string): WikipediaEndpointManager {
    if (!this.endpointManagers.has(language)) {
      this.endpointManagers.set(language, new WikipediaEndpointManager(language));
    }
    return this.endpointManagers.get(language)!;
  }

  private async getCachedData(key: string): Promise<any | null> {
    // Try memory cache
    if (this.cache?.has(key)) {
      return this.cache.get(key);
    }

    return null;
  }

  private async setCachedData(key: string, data: any, ttlSeconds = 300): Promise<void> {
    // Set in memory cache
    this.cache?.set(key, data);
  }

  async search(
    query: string,
    options: {
      limit?: number;
      lang?: string;
      offset?: number;
      includeSnippets?: boolean;
    } = {}
  ): Promise<any> {
    const {
      limit = 10,
      lang = this.options.defaultLanguage || 'en',
      offset = 0,
      includeSnippets = true
    } = options;

    const cacheKey = `search:${lang}:${query}:${limit}:${offset}:${includeSnippets}`;
    
    // Try cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const operation = async () => {
      const endpointManager = this.getEndpointManager(lang);
      const searchParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: query,
        srlimit: limit.toString(),
        sroffset: offset.toString(),
        ...(includeSnippets && { srprop: 'snippet' })
      });

      const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
      const data = await response.json();
      
      const result = {
        ...(data as object),
        meta: {
          query,
          limit,
          offset,
          language: lang,
          timestamp: new Date().toISOString()
        }
      };

      await this.setCachedData(cacheKey, result);
      return result;
    };

    if (this.options.enableDeduplication) {
      return this.deduplicator.deduplicate(cacheKey, operation);
    }

    return operation();
  }

  async getPage(
    title: string,
    options: {
      lang?: string;
      sections?: boolean;
      images?: boolean;
      links?: boolean;
      categories?: boolean;
    } = {}
  ): Promise<any> {
    const {
      lang = this.options.defaultLanguage || 'en',
      sections = true,
      images = false,
      links = false,
      categories = false
    } = options;

    const cacheKey = `page:${lang}:${title}:${sections}:${images}:${links}:${categories}`;
    
    // Try cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const operation = async () => {
      const endpointManager = this.getEndpointManager(lang);
      
      const props = ['text'];
      if (sections) props.push('sections');
      if (images) props.push('images');
      if (links) props.push('links');
      if (categories) props.push('categories');

      const searchParams = new URLSearchParams({
        action: 'parse',
        page: title,
        format: 'json',
        prop: props.join('|')
      });

      const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
      const data = await response.json();
      
      const result = {
        ...(data as object),
        meta: {
          title,
          language: lang,
          timestamp: new Date().toISOString(),
          options: { sections, images, links, categories }
        }
      };

      await this.setCachedData(cacheKey, result, 600); // Cache pages longer
      return result;
    };

    if (this.options.enableDeduplication) {
      return this.deduplicator.deduplicate(cacheKey, operation);
    }

    return operation();
  }

  async getPageById(
    id: number,
    options: {
      lang?: string;
      sections?: boolean;
      images?: boolean;
      links?: boolean;
      categories?: boolean;
    } = {}
  ): Promise<any> {
    const {
      lang = this.options.defaultLanguage || 'en',
      sections = true,
      images = false,
      links = false,
      categories = false
    } = options;

    const cacheKey = `pageById:${lang}:${id}:${sections}:${images}:${links}:${categories}`;
    
    // Try cache first
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const operation = async () => {
      const endpointManager = this.getEndpointManager(lang);
      
      const props = ['text'];
      if (sections) props.push('sections');
      if (images) props.push('images');
      if (links) props.push('links');
      if (categories) props.push('categories');

      const searchParams = new URLSearchParams({
        action: 'parse',
        pageid: id.toString(),
        format: 'json',
        prop: props.join('|')
      });

      const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
      const data = await response.json();
      
      const result = {
        ...(data as object),
        meta: {
          pageid: id,
          language: lang,
          timestamp: new Date().toISOString(),
          options: { sections, images, links, categories }
        }
      };

      await this.setCachedData(cacheKey, result, 600); // Cache pages longer
      return result;
    };

    if (this.options.enableDeduplication) {
      return this.deduplicator.deduplicate(cacheKey, operation);
    }

    return operation();
  }

  // New utility methods
  async getPageSummary(title: string, lang = 'en'): Promise<any> {
    const cacheKey = `summary:${lang}:${title}`;
    
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const operation = async () => {
      const endpointManager = this.getEndpointManager(lang);
      const response = await endpointManager.makeRequest(
        `/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      );
      const data = await response.json();
      
      await this.setCachedData(cacheKey, data, 1800); // Cache summaries for 30 minutes
      return data;
    };

    if (this.options.enableDeduplication) {
      return this.deduplicator.deduplicate(cacheKey, operation);
    }

    return operation();
  }

  async getRandomPage(lang = 'en'): Promise<any> {
    const endpointManager = this.getEndpointManager(lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'random',
      rnnamespace: '0',
      rnlimit: '1'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Health check methods
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    endpoints: any[];
    cache: {
      memory: { size: number; max: number } | null;
    };
    deduplication: { pendingRequests: number };
  }> {
    const endpointStatuses = Array.from(this.endpointManagers.entries()).map(
      ([lang, manager]) => ({
        language: lang,
        endpoints: manager.getEndpointStatus()
      })
    );

    const healthyEndpoints = endpointStatuses.flatMap(s => 
      s.endpoints.filter(e => e.status?.state === 'CLOSED')
    ).length;

    const totalEndpoints = endpointStatuses.flatMap(s => s.endpoints).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyEndpoints === 0) {
      status = 'unhealthy';
    } else if (healthyEndpoints < totalEndpoints * 0.5) {
      status = 'degraded';
    }

    return {
      status,
      endpoints: endpointStatuses,
      cache: {
        memory: this.cache ? {
          size: this.cache.size,
          max: this.cache.max
        } : null
      },
      deduplication: {
        pendingRequests: this.deduplicator.getPendingCount()
      }
    };
  }
}

// Legacy function exports for backward compatibility
export async function wikiSearch(
  query: string, 
  limit: number, 
  lang: string, 
  offset: number, 
  cache: LRUCache<string, any> | null
): Promise<any> {
  const service = new EnhancedWikipediaService({ cache: cache || undefined, defaultLanguage: lang });
  return service.search(query, { limit, lang, offset });
}

export async function wikiPage(
  title: string, 
  lang: string, 
  cache: LRUCache<string, any> | null
): Promise<any> {
  const service = new EnhancedWikipediaService({ cache: cache || undefined, defaultLanguage: lang });
  return service.getPage(title, { lang });
}

export async function wikiPageById(
  id: number, 
  lang: string,
  cache: LRUCache<string, any> | null
): Promise<any> {
  const service = new EnhancedWikipediaService({ cache: cache || undefined, defaultLanguage: lang });
  return service.getPageById(id, { lang });
}

export interface JSONRPCMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: any;
  result?: any;
  id?: string | number;
  error?: any;
}

export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
} 
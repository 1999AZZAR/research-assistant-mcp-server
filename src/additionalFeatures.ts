import { EnhancedWikipediaService } from './wikipediaService.js';

export class WikipediaExtendedFeatures {
  constructor(private wikipediaService: EnhancedWikipediaService) {}

  // Bulk operations for efficiency
  async batchSearch(queries: string[], options: {
    lang?: string;
    limit?: number;
    concurrency?: number;
  } = {}): Promise<Record<string, any>> {
    const { lang = 'en', limit = 5, concurrency = 5 } = options;
    const results: Record<string, any> = {};

    // Process queries in batches to avoid overwhelming the API
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      const promises = batch.map(async (query) => {
        try {
          const result = await this.wikipediaService.search(query, { lang, limit });
          return { query, result };
        } catch (error) {
          return { query, error: (error as Error).message };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ query, result, error }) => {
        results[query] = error ? { error } : result;
      });
    }

    return results;
  }

  async batchGetPages(titles: string[], options: {
    lang?: string;
    sections?: boolean;
    concurrency?: number;
  } = {}): Promise<Record<string, any>> {
    const { lang = 'en', sections = true, concurrency = 5 } = options;
    const results: Record<string, any> = {};

    for (let i = 0; i < titles.length; i += concurrency) {
      const batch = titles.slice(i, i + concurrency);
      const promises = batch.map(async (title) => {
        try {
          const result = await this.wikipediaService.getPage(title, { lang, sections });
          return { title, result };
        } catch (error) {
          return { title, error: (error as Error).message };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ title, result, error }) => {
        results[title] = error ? { error } : result;
      });
    }

    return results;
  }

  // Get related articles
  async getRelatedArticles(title: string, options: {
    lang?: string;
    limit?: number;
    method?: 'links' | 'categories' | 'backlinks';
  } = {}): Promise<any> {
    const { lang = 'en', limit = 10, method = 'links' } = options;

    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    let searchParams: URLSearchParams;

    switch (method) {
      case 'links':
        searchParams = new URLSearchParams({
          action: 'query',
          format: 'json',
          prop: 'links',
          titles: title,
          pllimit: limit.toString(),
          plnamespace: '0'
        });
        break;
      
      case 'categories':
        searchParams = new URLSearchParams({
          action: 'query',
          format: 'json',
          prop: 'categories',
          titles: title,
          cllimit: limit.toString()
        });
        break;
      
      case 'backlinks':
        searchParams = new URLSearchParams({
          action: 'query',
          format: 'json',
          list: 'backlinks',
          bltitle: title,
          bllimit: limit.toString(),
          blnamespace: '0'
        });
        break;
    }

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Get page categories
  async getPageCategories(title: string, lang = 'en'): Promise<any> {
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'categories',
      titles: title,
      cllimit: '500'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Get pages in a category
  async getPagesInCategory(category: string, options: {
    lang?: string;
    limit?: number;
    type?: 'page' | 'subcat' | 'file';
  } = {}): Promise<any> {
    const { lang = 'en', limit = 50, type = 'page' } = options;
    
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: category.startsWith('Category:') ? category : `Category:${category}`,
      cmlimit: limit.toString(),
      cmtype: type
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Get page images
  async getPageImages(title: string, options: {
    lang?: string;
    limit?: number;
    imageWidth?: number;
  } = {}): Promise<any> {
    const { lang = 'en', limit = 10, imageWidth = 300 } = options;
    
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: title,
      prop: 'images|pageimages',
      imlimit: limit.toString(),
      piprop: 'thumbnail',
      pithumbsize: imageWidth.toString()
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Geographic search - find articles near coordinates
  async searchNearby(options: {
    lat: number;
    lon: number;
    radius?: number;
    lang?: string;
    limit?: number;
  }): Promise<any> {
    const { lat, lon, radius = 10000, lang = 'en', limit = 10 } = options;
    
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'geosearch',
      gscoord: `${lat}|${lon}`,
      gsradius: radius.toString(),
      gslimit: limit.toString(),
      gsnamespace: '0'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Get page extracts (summaries)
  async getPageExtracts(titles: string[], options: {
    lang?: string;
    sentences?: number;
    chars?: number;
    plaintext?: boolean;
  } = {}): Promise<any> {
    const { 
      lang = 'en', 
      sentences = 3, 
      chars = 500, 
      plaintext = true 
    } = options;
    
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'extracts',
      titles: titles.join('|'),
      exsentences: sentences.toString(),
      exchars: chars.toString(),
      ...(plaintext && { explaintext: '1' }),
      exsectionformat: 'plain'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Full-text search with highlighting
  async fullTextSearch(query: string, options: {
    lang?: string;
    limit?: number;
    namespace?: string;
    snippet?: boolean;
  } = {}): Promise<any> {
    const { 
      lang = 'en', 
      limit = 10, 
      namespace = '0',
      snippet = true 
    } = options;
    
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: query,
      srlimit: limit.toString(),
      srnamespace: namespace,
      srprop: snippet ? 'snippet|size|timestamp' : 'size|timestamp',
      srinfo: 'totalhits'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Language detection and translation suggestions
  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on character patterns
    // This is a basic implementation - for production, consider using a proper language detection service
    
    const patterns = {
      'zh': /[\u4e00-\u9fff]/,
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
      'ko': /[\uac00-\ud7af]/,
      'ar': /[\u0600-\u06ff]/,
      'ru': /[\u0400-\u04ff]/,
      'th': /[\u0e00-\u0e7f]/,
      'hi': /[\u0900-\u097f]/
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    // Default to English if no specific pattern matches
    return 'en';
  }

  // Get available languages for a page
  async getPageLanguages(title: string, lang = 'en'): Promise<any> {
    const endpointManager = this.wikipediaService['getEndpointManager'](lang);
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'langlinks',
      titles: title,
      lllimit: '500'
    });

    const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
    return response.json();
  }

  // Trending/popular articles
  async getTrendingArticles(options: {
    lang?: string;
    date?: string; // YYYY/MM/DD format
  } = {}): Promise<any> {
    const { lang = 'en', date = new Date().toISOString().split('T')[0].replace(/-/g, '/') } = options;
    
    // Use Wikipedia's pageview API for trending content
    const response = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${date}`
    );
    
    return response.json();
  }
} 
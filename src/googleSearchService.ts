import axios, { AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import Sentiment from 'sentiment';
import config from './config.js';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: axiosRetry.isNetworkOrIdempotentRequestError
});

// Sentiment analyzer for content extraction
const sentiment = new Sentiment();

// Google Search result interfaces
interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  formattedUrl?: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
  };
}

interface ContentAnalysis {
  title: string;
  content: string;
  wordCount: number;
  readabilityScore?: number;
  sentiment: {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
  };
  links: string[];
  images: string[];
}

// Google Custom Search API parameters
interface SearchParams {
  q: string;
  fileType?: string;
  siteSearch?: string;
  dateRestrict?: string;
  safe?: string;
  exactTerms?: string;
  excludeTerms?: string;
  sort?: string;
  gl?: string;
  hl?: string;
  num?: number;
  start?: number;
}

export class GoogleSearchService {
  private apiKey: string;
  private cseId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    if (!config.google.apiKey || !config.google.cseId) {
      throw new Error('Google API key and CSE ID are required. Please set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.');
    }
    this.apiKey = config.google.apiKey;
    this.cseId = config.google.cseId;
  }

  /**
   * Perform a Google Custom Search
   */
  async search(params: SearchParams): Promise<GoogleSearchResponse> {
    try {
      const searchParams = new URLSearchParams({
        key: this.apiKey,
        cx: this.cseId,
        q: params.q,
      });

      // Add optional parameters
      if (params.fileType) searchParams.append('fileType', params.fileType);
      if (params.siteSearch) searchParams.append('siteSearch', params.siteSearch);
      if (params.dateRestrict) searchParams.append('dateRestrict', params.dateRestrict);
      if (params.safe) searchParams.append('safe', params.safe);
      if (params.exactTerms) searchParams.append('exactTerms', params.exactTerms);
      if (params.excludeTerms) searchParams.append('excludeTerms', params.excludeTerms);
      if (params.sort) searchParams.append('sort', params.sort);
      if (params.gl) searchParams.append('gl', params.gl);
      if (params.hl) searchParams.append('hl', params.hl);
      if (params.num) searchParams.append('num', params.num.toString());
      if (params.start) searchParams.append('start', params.start.toString());

      const response: AxiosResponse<GoogleSearchResponse> = await axios.get(
        `${this.baseUrl}?${searchParams}`,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      console.error('Google Search API error:', error);
      throw new Error(`Failed to perform Google search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from a web page and analyze it
   */
  async extractContent(url: string): Promise<ContentAnalysis> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Server/1.0)',
        },
      });

      const $ = cheerio.load(response.data);

      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

      // Extract main content
      const title = $('title').text().trim() ||
                   $('h1').first().text().trim() ||
                   'No title found';

      // Try to find main content areas
      let content = '';
      const contentSelectors = ['main', 'article', '.content', '.post', '.entry', '#content', '#main'];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > content.length) {
          content = element.text().trim();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text().trim();
      }

      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim();

      // Limit content length
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '...';
      }

      // Extract links and images
      const links: string[] = [];
      const images: string[] = [];

      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.startsWith('http') && !href.includes('javascript:')) {
          links.push(href);
        }
      });

      $('img[src]').each((_, element) => {
        const src = $(element).attr('src');
        if (src) {
          images.push(src);
        }
      });

      // Perform sentiment analysis
      const sentimentAnalysis = sentiment.analyze(content);

      // Calculate basic readability score (simplified)
      const words = content.split(/\s+/).length;
      const sentences = content.split(/[.!?]+/).length;
      const avgWordsPerSentence = words / Math.max(sentences, 1);

      return {
        title,
        content,
        wordCount: words,
        readabilityScore: avgWordsPerSentence > 20 ? 0.3 : avgWordsPerSentence > 15 ? 0.6 : 1.0,
        sentiment: {
          score: sentimentAnalysis.score,
          comparative: sentimentAnalysis.comparative,
          positive: sentimentAnalysis.positive,
          negative: sentimentAnalysis.negative,
        },
        links: [...new Set(links)].slice(0, 20), // Limit to 20 unique links
        images: [...new Set(images)].slice(0, 10), // Limit to 10 unique images
      };
    } catch (error) {
      console.error('Content extraction error:', error);
      throw new Error(`Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for academic/research papers
   */
  async searchAcademic(query: string, options: { fileType?: string; dateRange?: string; sites?: string[]; maxResults?: number } = {}): Promise<GoogleSearchResponse> {
    const academicSites = options.sites || ['arxiv.org', 'scholar.google.com', 'researchgate.net', 'semanticscholar.org'];
    const siteSearch = academicSites.join(' OR site:');

    return this.search({
      q: `${query} site:${siteSearch}`,
      fileType: options.fileType || 'pdf',
      dateRestrict: options.dateRange,
      num: options.maxResults || 5,
    });
  }

  /**
   * Search news articles
   */
  async searchNews(topic: string, options: { sources?: string[]; language?: string; country?: string; maxResults?: number; dateRestrict?: string } = {}): Promise<GoogleSearchResponse> {
    const newsSites = options.sources || ['bbc.com', 'cnn.com', 'reuters.com', 'apnews.com', 'nytimes.com'];
    const siteSearch = newsSites.join(' OR site:');

    return this.search({
      q: `${topic} site:${siteSearch}`,
      dateRestrict: options.dateRestrict || 'd7', // Last 7 days by default
      hl: options.language || 'en',
      gl: options.country || 'us',
      num: options.maxResults || 5,
    });
  }

  /**
   * Multi-site search across specific websites
   */
  async searchMultipleSites(query: string, sites: string[], options: { maxResults?: number; fileType?: string } = {}): Promise<GoogleSearchResponse> {
    const siteSearch = sites.join(' OR site:');

    return this.search({
      q: `${query} site:${siteSearch}`,
      fileType: options.fileType,
      num: options.maxResults || 3,
    });
  }
}

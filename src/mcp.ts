import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import LRUCache from "lru-cache";
import { EnhancedWikipediaService } from "./wikipediaService";
import { WikipediaExtendedFeatures } from "./additionalFeatures";

export function createWikipediaMcp(
  wikipediaService: EnhancedWikipediaService,
  extendedFeatures: WikipediaExtendedFeatures
): McpServer {
  // Initialize cache for resources
  const cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 30, // 30 minutes default TTL
  });

  const server = new McpServer({
    name: "wikipedia-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "search",
    {
      title: "Wikipedia Search",
      description: "Search Wikipedia for articles matching a query.",
      inputSchema: {
        query: z.string().describe("The search query."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language to search in (e.g., 'en', 'es', 'fr')."),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("The maximum number of results to return."),
        offset: z
          .number()
          .optional()
          .default(0)
          .describe("The offset of the search results."),
        includeSnippets: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to include snippets in the search results."),
      },
    },
    async ({ query, lang, limit, offset, includeSnippets }) => {
      const results = await wikipediaService.search(query, { lang, limit, offset, includeSnippets });
      const searchResults = results?.query?.search || [];
      return {
        content: [
          {
            type: "text",
            text: `Found ${searchResults.length} results for "${query}":\n\n${searchResults.map((result: any) => `- ${result.title}: ${result.snippet || 'No snippet available'}`).join('\n')}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "getPage",
    {
      title: "Get Wikipedia Page",
      description: "Get the content of a Wikipedia page by its exact title.",
      inputSchema: {
        title: z.string().describe("The title of the page."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the page (e.g., 'en', 'es', 'fr')."),
        sections: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to include sections in the result."),
        images: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include images in the result."),
        links: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include links in the result."),
        categories: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include categories in the result."),
      },
    },
    async ({ title, lang, sections, images, links, categories }) => {
      const result = await wikipediaService.getPage(title, { lang, sections, images, links, categories });
      const pageData = result?.parse;
      if (!pageData) {
        return {
          content: [
            {
              type: "text",
              text: `Page "${title}" not found.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Page: ${pageData.title}\nText: ${pageData.text?.['*']?.substring(0, 1000) || 'No text available'}...`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "getPageSummary",
    {
      title: "Get Wikipedia Page Summary",
      description: "Get a brief summary of a Wikipedia page.",
      inputSchema: {
        title: z.string().describe("The title of the page."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the page (e.g., 'en', 'es', 'fr')."),
      },
    },
    async ({ title, lang }) => {
      const result = await wikipediaService.getPageSummary(title, lang);
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Summary for page "${title}" not found.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Summary for "${title}":\n\n${result.extract || 'No summary available'}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "getPageById",
    {
      title: "Get Wikipedia Page by ID",
      description: "Get the content of a Wikipedia page by its ID.",
      inputSchema: {
        id: z.number().int().positive().describe("The ID of the page."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the page (e.g., 'en', 'es', 'fr')."),
        sections: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to include sections in the result."),
        images: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include images in the result."),
        links: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include links in the result."),
        categories: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include categories in the result."),
      },
    },
    async ({ id, lang, sections, images, links, categories }) => {
      const result = await wikipediaService.getPageById(id, { lang, sections, images, links, categories });
      const pageData = result?.parse;
      if (!pageData) {
        return {
          content: [
            {
              type: "text",
              text: `Page with ID "${id}" not found.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Page ID: ${id}\nTitle: ${pageData.title}\nText: ${pageData.text?.['*']?.substring(0, 1000) || 'No text available'}...`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "random",
    {
      title: "Get Random Wikipedia Page",
      description: "Get a random Wikipedia page.",
      inputSchema: {
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the page (e.g., 'en', 'es', 'fr')."),
      },
    },
    async ({ lang }) => {
      const result = await wikipediaService.getRandomPage(lang);
      const randomPage = result?.query?.random?.[0];
      if (!randomPage) {
        return {
          content: [
            {
              type: "text",
              text: `No random page found.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Random page: ${randomPage.title} (ID: ${randomPage.id})`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "pageLanguages",
    {
      title: "Get Wikipedia Page Languages",
      description: "Get the languages a Wikipedia page is available in.",
      inputSchema: {
        title: z.string().describe("The title of the page."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the page (e.g., 'en', 'es', 'fr')."),
      },
    },
    async ({ title, lang }) => {
      const result = await extendedFeatures.getPageLanguages(title, lang);
      const pageData = result?.query?.pages;
      if (!pageData) {
        return {
          content: [
            {
              type: "text",
              text: `No language information found for page "${title}".`,
            },
          ],
        };
      }
      const languages = (Object.values(pageData)[0] as any)?.langlinks || [];
      return {
        content: [
          {
            type: "text",
            text: `Languages available for "${title}":\n\n${languages.map((lang: any) => `- ${lang.lang}: ${lang['*'] || lang.title || 'Unknown'}`).join('\n')}`,
          },
        ],
      };
    }
  );

  // Batch Operations Tools
  server.registerTool(
    "batchSearch",
    {
      title: "Batch Wikipedia Search",
      description: "Search multiple queries at once for efficiency.",
      inputSchema: {
        queries: z.array(z.string()).min(1).max(10).describe("Array of search queries (max 10)."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language to search in (e.g., 'en', 'es', 'fr')."),
        limit: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .default(5)
          .describe("Maximum number of results per query."),
        concurrency: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .default(5)
          .describe("Number of concurrent requests (max 10)."),
      },
    },
    async ({ queries, lang, limit, concurrency }) => {
      const results = await extendedFeatures.batchSearch(queries, { lang, limit, concurrency });
      return {
        content: [
          {
            type: "text",
            text: `Batch search results for ${queries.length} queries:\n\n${Object.entries(results).map(([query, result]: [string, any]) => {
              if (result.error) {
                return `❌ "${query}": ${result.error}`;
              }
              const searchResults = result?.query?.search || [];
              return `✅ "${query}": ${searchResults.length} results\n${searchResults.map((r: any) => `  - ${r.title}`).join('\n')}`;
            }).join('\n\n')}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "batchGetPages",
    {
      title: "Batch Get Wikipedia Pages",
      description: "Get multiple Wikipedia pages at once for efficiency.",
      inputSchema: {
        titles: z.array(z.string()).min(1).max(10).describe("Array of page titles (max 10)."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the pages (e.g., 'en', 'es', 'fr')."),
        sections: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to include sections in the results."),
        concurrency: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .default(5)
          .describe("Number of concurrent requests (max 10)."),
      },
    },
    async ({ titles, lang, sections, concurrency }) => {
      const results = await extendedFeatures.batchGetPages(titles, { lang, sections, concurrency });
      return {
        content: [
          {
            type: "text",
            text: `Batch page results for ${titles.length} pages:\n\n${Object.entries(results).map(([title, result]: [string, any]) => {
              if (result.error) {
                return `❌ "${title}": ${result.error}`;
              }
              const pageData = result?.parse;
              if (!pageData) {
                return `❌ "${title}": Page not found`;
              }
              const textPreview = pageData.text?.['*']?.substring(0, 200) || 'No text available';
              return `✅ "${title}": ${pageData.title}\nPreview: ${textPreview}...`;
            }).join('\n\n')}`,
          },
        ],
      };
    }
  );

  // Geographic Search Tool
  server.registerTool(
    "searchNearby",
    {
      title: "Search Wikipedia Articles Near Location",
      description: "Find Wikipedia articles near specific coordinates.",
      inputSchema: {
        lat: z.number().min(-90).max(90).describe("Latitude coordinate (-90 to 90)."),
        lon: z.number().min(-180).max(180).describe("Longitude coordinate (-180 to 180)."),
        radius: z
          .number()
          .int()
          .positive()
          .max(10000)
          .optional()
          .default(1000)
          .describe("Search radius in meters (max 10000)."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language to search in (e.g., 'en', 'es', 'fr')."),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of results to return."),
      },
    },
    async ({ lat, lon, radius, lang, limit }) => {
      const result = await extendedFeatures.searchNearby({ lat, lon, radius, lang, limit });
      const places = result?.query?.geosearch || [];
      if (places.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No Wikipedia articles found near coordinates (${lat}, ${lon}) within ${radius}m radius.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Found ${places.length} Wikipedia articles near (${lat}, ${lon}) within ${radius}m:\n\n${places.map((place: any) => 
              `📍 ${place.title}\n   Distance: ${place.dist}m\n   Coordinates: ${place.lat}, ${place.lon}`
            ).join('\n\n')}`,
          },
        ],
      };
    }
  );

  // Category Exploration Tool
  server.registerTool(
    "getPagesInCategory",
    {
      title: "Get Pages in Wikipedia Category",
      description: "Browse pages within a specific Wikipedia category.",
      inputSchema: {
        category: z.string().describe("The category name (with or without 'Category:' prefix)."),
        lang: z
          .string()
          .optional()
          .default("en")
          .describe("The language of the category (e.g., 'en', 'es', 'fr')."),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .default(20)
          .describe("Maximum number of pages to return."),
        type: z
          .enum(['page', 'subcat', 'file'])
          .optional()
          .default('page')
          .describe("Type of category members to return."),
      },
    },
    async ({ category, lang, limit, type }) => {
      const result = await extendedFeatures.getPagesInCategory(category, { lang, limit, type });
      const members = result?.query?.categorymembers || [];
      if (members.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No pages found in category "${category}".`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Found ${members.length} ${type}s in category "${category}":\n\n${members.map((member: any) => 
              `📄 ${member.title} (ID: ${member.pageid})`
            ).join('\n')}`,
          },
        ],
      };
    }
  );

  // Register resources
  server.registerResource(
    "Cached Wikipedia Article",
    new ResourceTemplate("wikipedia://article/{title}/{lang}", {
      list: undefined, // We don't need to list all possible articles
    }),
    {
      description: "Full cached content of a Wikipedia article with metadata and revision information",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const lang = Array.isArray(variables.lang) ? variables.lang[0] : variables.lang;
      const cacheKey = `article:${lang}:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          const page = await wikipediaService.getPage(decodeURIComponent(title), { lang });
          data = {
            title: decodeURIComponent(title),
            lang,
            content: page,
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 60 }); // 1 hour for articles
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`,
                title: decodeURIComponent(title),
                lang,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Cached Wikipedia Search Results",
    new ResourceTemplate("wikipedia://search/cache/{query}", {
      list: undefined,
    }),
    {
      description: "Cached search results for Wikipedia queries with snippets and metadata",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const query = Array.isArray(variables.query) ? variables.query[0] : variables.query;
      const cacheKey = `search:${query}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          const results = await wikipediaService.search(query, { limit: 20, includeSnippets: true });
          data = {
            query,
            results: results?.query?.search || [],
            totalResults: results?.query?.searchinfo?.totalhits || 0,
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 15 }); // 15 minutes for search
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
                query,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Wikipedia Article Metadata",
    new ResourceTemplate("wikipedia://metadata/{title}", {
      list: undefined,
    }),
    {
      description: "Comprehensive metadata for Wikipedia articles including categories, links, and references",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const cacheKey = `metadata:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          const [pageData, categories, links] = await Promise.all([
            wikipediaService.getPage(title),
            extendedFeatures.getPagesInCategory(`Category:${title}`),
            wikipediaService.getPage(title), // Could be enhanced to get links
          ]);

          data = {
            title,
            pageid: pageData.pageid,
            ns: pageData.ns,
            revid: pageData.revid,
            lastModified: pageData.timestamp,
            categories: categories?.query?.categorymembers || [],
            links: pageData.links || [],
            references: pageData.extlinks || [],
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 45 }); // 45 minutes for metadata
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                title,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Wikipedia Category Information",
    new ResourceTemplate("wikipedia://categories/{title}", {
      list: undefined,
    }),
    {
      description: "Category hierarchy and related articles for Wikipedia categories",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const cacheKey = `categories:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          const categoryTitle = title.startsWith('Category:') ? title : `Category:${title}`;
          const categoryInfo = await extendedFeatures.getPagesInCategory(categoryTitle);
          const members = categoryInfo?.query?.categorymembers || [];

          data = {
            category: title,
            memberCount: members.length,
            members: members.slice(0, 50), // Limit to first 50 for performance
            subcategories: members.filter((m: any) => m.ns === 14).slice(0, 20),
            articles: members.filter((m: any) => m.ns === 0).slice(0, 30),
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 60 }); // 1 hour for categories
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
                category: title,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Wikipedia Article Languages",
    new ResourceTemplate("wikipedia://languages/{title}", {
      list: undefined,
    }),
    {
      description: "Available language variants for a Wikipedia article",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const cacheKey = `languages:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          // Get language links from the English page (this is a simplified approach)
          const pageData = await wikipediaService.getPage(title, { lang: 'en' });
          const langlinks = pageData?.langlinks || [];

          data = {
            title,
            languageCount: langlinks.length,
            languages: langlinks.map((lang: any) => ({
              lang: lang.lang,
              title: lang['*'],
              url: `https://${lang.lang}.wikipedia.org/wiki/${encodeURIComponent(lang['*'])}`,
            })),
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 60 * 6 }); // 6 hours for languages
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch languages: ${error instanceof Error ? error.message : 'Unknown error'}`,
                title,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Related Wikipedia Articles",
    new ResourceTemplate("wikipedia://related/{title}", {
      list: undefined,
    }),
    {
      description: "Related articles and see-also links for a Wikipedia article",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const cacheKey = `related:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          const pageData = await wikipediaService.getPage(title);
          const links = pageData.links || [];
          const categories = pageData.categories || [];

          // Get related articles from same categories
          const relatedArticles = [];
          for (const category of categories.slice(0, 3)) {
            try {
              const categoryArticles = await extendedFeatures.getPagesInCategory(category.title);
              const articles = categoryArticles?.query?.categorymembers?.filter((m: any) => m.ns === 0 && m.title !== title) || [];
              relatedArticles.push(...articles.slice(0, 5));
            } catch (e) {
              // Continue with other categories
            }
          }

          data = {
            title,
            seeAlsoLinks: links.filter((link: any) => link.ns === 0).slice(0, 20),
            relatedArticles: [...new Set(relatedArticles.map((a: any) => a.title))].slice(0, 15),
            categories: categories.slice(0, 10),
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 60 }); // 1 hour for related
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch related articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
                title,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  server.registerResource(
    "Wikipedia Article Summary",
    new ResourceTemplate("wikipedia://summary/{title}", {
      list: undefined,
    }),
    {
      description: "Cached summary and key facts for a Wikipedia article",
      mimeType: "application/json",
    },
    async (uri: URL, variables, extra) => {
      const title = Array.isArray(variables.title) ? variables.title[0] : variables.title;
      const cacheKey = `summary:${title}`;

      let data = cache.get(cacheKey);
      if (!data) {
        try {
          // Use extracts prop from regular API instead of REST API to avoid rate limits
          const endpointManager = wikipediaService['getEndpointManager']('en');
          const searchParams = new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'extracts',
            titles: decodeURIComponent(title),
            exsentences: '3',
            explaintext: '1',
            exsectionformat: 'plain'
          });

          const response = await endpointManager.makeRequest(`/w/api.php?${searchParams}`);
          const apiData = await response.json() as any;

          const pages = apiData.query?.pages;
          const pageId = Object.keys(pages || {})[0];
          const page = pages?.[pageId];

          // Get additional page info
          const infoParams = new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'info',
            titles: decodeURIComponent(title),
            inprop: 'url|length'
          });

          const infoResponse = await endpointManager.makeRequest(`/w/api.php?${infoParams}`);
          const infoData = await infoResponse.json() as any;
          const infoPage = infoData.query?.pages?.[pageId];

          data = {
            title,
            summary: page?.extract || 'Summary not available',
            pageid: parseInt(pageId) || -1,
            lastModified: infoPage?.touched,
            wordCount: page?.extract?.split(' ').length || 0,
            url: infoPage?.fullurl,
            cached: false,
            timestamp: new Date().toISOString(),
          };
          cache.set(cacheKey, data, { ttl: 1000 * 60 * 60 }); // 1 hour for summaries
        } catch (error) {
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify({
                error: `Failed to fetch summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
                title,
                cached: false,
                timestamp: new Date().toISOString(),
              }),
            }],
          };
        }
      } else {
        data.cached = true;
      }
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(data),
        }],
      };
    }
  );

  // The MCP SDK automatically handles tools/list requests
  // No need to manually set a handler

  return server;
} 
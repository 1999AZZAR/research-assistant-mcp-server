/**
 * Schema Export Module for Wikipedia MCP Server
 * 
 * This module provides utilities to extract and export server schemas
 * in various formats for client consumption.
 */

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ServerSchema {
  tools: ToolSchema[];
  serverInfo: {
    name: string;
    version: string;
    description: string;
  };
}

/**
 * Get the complete server schema with all available tools
 */
export function getServerSchema(): ServerSchema {
  return {
    serverInfo: {
      name: "wikipedia-mcp-server",
      version: "1.0.0",
      description: "An enterprise-grade Wikipedia server providing comprehensive Wikipedia access via the Model Context Protocol (MCP) standard"
    },
    tools: [
      {
        name: "search",
        description: "Search Wikipedia for articles matching a query.",
        inputSchema: {
          type: "object",
          properties: {
            query: { 
              type: "string", 
              description: "The search query." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language to search in (e.g., 'en', 'es', 'fr')." 
            },
            limit: { 
              type: "number", 
              default: 10, 
              description: "The maximum number of results to return." 
            },
            offset: { 
              type: "number", 
              default: 0, 
              description: "The offset of the search results." 
            },
            includeSnippets: { 
              type: "boolean", 
              default: true, 
              description: "Whether to include snippets in the search results." 
            }
          },
          required: ["query"]
        }
      },
      {
        name: "getPage",
        description: "Get the content of a Wikipedia page by its exact title.",
        inputSchema: {
          type: "object",
          properties: {
            title: { 
              type: "string", 
              description: "The title of the page." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the page (e.g., 'en', 'es', 'fr')." 
            },
            sections: { 
              type: "boolean", 
              default: true, 
              description: "Whether to include sections in the result." 
            },
            images: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include images in the result." 
            },
            links: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include links in the result." 
            },
            categories: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include categories in the result." 
            }
          },
          required: ["title"]
        }
      },
      {
        name: "getPageSummary",
        description: "Get a brief summary of a Wikipedia page.",
        inputSchema: {
          type: "object",
          properties: {
            title: { 
              type: "string", 
              description: "The title of the page." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the page (e.g., 'en', 'es', 'fr')." 
            }
          },
          required: ["title"]
        }
      },
      {
        name: "getPageById",
        description: "Get the content of a Wikipedia page by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: { 
              type: "number", 
              description: "The ID of the page." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the page (e.g., 'en', 'es', 'fr')." 
            },
            sections: { 
              type: "boolean", 
              default: true, 
              description: "Whether to include sections in the result." 
            },
            images: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include images in the result." 
            },
            links: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include links in the result." 
            },
            categories: { 
              type: "boolean", 
              default: false, 
              description: "Whether to include categories in the result." 
            }
          },
          required: ["id"]
        }
      },
      {
        name: "random",
        description: "Get a random Wikipedia page.",
        inputSchema: {
          type: "object",
          properties: {
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the page (e.g., 'en', 'es', 'fr')." 
            }
          }
        }
      },
      {
        name: "pageLanguages",
        description: "Get the languages a Wikipedia page is available in.",
        inputSchema: {
          type: "object",
          properties: {
            title: { 
              type: "string", 
              description: "The title of the page." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the page (e.g., 'en', 'es', 'fr')." 
            }
          },
          required: ["title"]
        }
      },
      {
        name: "batchSearch",
        description: "Search multiple queries at once for efficiency.",
        inputSchema: {
          type: "object",
          properties: {
            queries: { 
              type: "array", 
              items: { type: "string" }, 
              minItems: 1, 
              maxItems: 10, 
              description: "Array of search queries (max 10)." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language to search in (e.g., 'en', 'es', 'fr')." 
            },
            limit: { 
              type: "number", 
              default: 5, 
              description: "Maximum number of results per query." 
            },
            concurrency: { 
              type: "number", 
              default: 5, 
              description: "Number of concurrent requests (max 10)." 
            }
          },
          required: ["queries"]
        }
      },
      {
        name: "batchGetPages",
        description: "Get multiple Wikipedia pages at once for efficiency.",
        inputSchema: {
          type: "object",
          properties: {
            titles: { 
              type: "array", 
              items: { type: "string" }, 
              minItems: 1, 
              maxItems: 10, 
              description: "Array of page titles (max 10)." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the pages (e.g., 'en', 'es', 'fr')." 
            },
            sections: { 
              type: "boolean", 
              default: true, 
              description: "Whether to include sections in the results." 
            },
            concurrency: { 
              type: "number", 
              default: 5, 
              description: "Number of concurrent requests (max 10)." 
            }
          },
          required: ["titles"]
        }
      },
      {
        name: "searchNearby",
        description: "Find Wikipedia articles near specific coordinates.",
        inputSchema: {
          type: "object",
          properties: {
            lat: { 
              type: "number", 
              minimum: -90, 
              maximum: 90, 
              description: "Latitude coordinate (-90 to 90)." 
            },
            lon: { 
              type: "number", 
              minimum: -180, 
              maximum: 180, 
              description: "Longitude coordinate (-180 to 180)." 
            },
            radius: { 
              type: "number", 
              default: 1000, 
              description: "Search radius in meters (max 10000)." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language to search in (e.g., 'en', 'es', 'fr')." 
            },
            limit: { 
              type: "number", 
              default: 10, 
              description: "Maximum number of results to return." 
            }
          },
          required: ["lat", "lon"]
        }
      },
      {
        name: "getPagesInCategory",
        description: "Browse pages within a specific Wikipedia category.",
        inputSchema: {
          type: "object",
          properties: {
            category: { 
              type: "string", 
              description: "The category name (with or without 'Category:' prefix)." 
            },
            lang: { 
              type: "string", 
              default: "en", 
              description: "The language of the category (e.g., 'en', 'es', 'fr')." 
            },
            limit: { 
              type: "number", 
              default: 20, 
              description: "Maximum number of pages to return." 
            },
            type: { 
              type: "string", 
              enum: ["page", "subcat", "file"], 
              default: "page", 
              description: "Type of category members to return." 
            }
          },
          required: ["category"]
        }
      }
    ]
  };
}

/**
 * Export schema as JSON Schema format
 */
export function exportAsJSONSchema(): string {
  return JSON.stringify(getServerSchema(), null, 2);
}

/**
 * Export schema as OpenAPI format
 */
export function exportAsOpenAPI(): string {
  const schema = getServerSchema();
  
  const openapi = {
    openapi: "3.0.0",
    info: {
      title: schema.serverInfo.name,
      version: schema.serverInfo.version,
      description: schema.serverInfo.description
    },
    paths: {
      "/mcp": {
        post: {
          summary: "Model Context Protocol Interface",
          description: "Primary endpoint for MCP tool calls",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jsonrpc: { type: "string", enum: ["2.0"] },
                    method: { type: "string", enum: ["tools/call"] },
                    params: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Tool name" },
                        arguments: { type: "object", description: "Tool arguments" }
                      },
                      required: ["name", "arguments"]
                    },
                    id: { type: "string", description: "Request ID" }
                  },
                  required: ["jsonrpc", "method", "params", "id"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      jsonrpc: { type: "string", enum: ["2.0"] },
                      result: { type: "object" },
                      error: { type: "object" },
                      id: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {}
    }
  };

  // Add tool schemas as components
  schema.tools.forEach(tool => {
    (openapi.components.schemas as any)[`${tool.name}Tool`] = {
      type: "object",
      properties: {
        name: { type: "string", enum: [tool.name] },
        description: { type: "string", description: tool.description },
        inputSchema: tool.inputSchema
      },
      required: ["name", "description", "inputSchema"]
    };
  });

  return JSON.stringify(openapi, null, 2);
}

/**
 * Export schema as TypeScript interfaces
 */
export function exportAsTypeScript(): string {
  const schema = getServerSchema();
  
  let ts = `// Generated TypeScript interfaces for ${schema.serverInfo.name}\n`;
  ts += `// Version: ${schema.serverInfo.version}\n\n`;
  
  ts += `export interface ServerInfo {\n`;
  ts += `  name: string;\n`;
  ts += `  version: string;\n`;
  ts += `  description: string;\n`;
  ts += `}\n\n`;
  
  ts += `export interface ToolSchema {\n`;
  ts += `  name: string;\n`;
  ts += `  description: string;\n`;
  ts += `  inputSchema: {\n`;
  ts += `    type: string;\n`;
  ts += `    properties: Record<string, any>;\n`;
  ts += `    required?: string[];\n`;
  ts += `  };\n`;
  ts += `}\n\n`;
  
  ts += `export interface ServerSchema {\n`;
  ts += `  tools: ToolSchema[];\n`;
  ts += `  serverInfo: ServerInfo;\n`;
  ts += `}\n\n`;
  
  // Add specific tool interfaces
  schema.tools.forEach(tool => {
    const interfaceName = `${tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}Arguments`;
    ts += `export interface ${interfaceName} {\n`;
    
    Object.entries(tool.inputSchema.properties).forEach(([prop, def]: [string, any]) => {
      const isRequired = tool.inputSchema.required?.includes(prop);
      const optional = isRequired ? '' : '?';
      const type = def.type === 'array' ? `${def.items.type}[]` : def.type;
      ts += `  ${prop}${optional}: ${type};\n`;
    });
    
    ts += `}\n\n`;
  });
  
  return ts;
}

/**
 * Get a specific tool schema by name
 */
export function getToolSchema(toolName: string): ToolSchema | null {
  const schema = getServerSchema();
  return schema.tools.find(tool => tool.name === toolName) || null;
}

/**
 * Validate tool arguments against schema
 */
export function validateToolArguments(toolName: string, args: any): { valid: boolean; errors: string[] } {
  const toolSchema = getToolSchema(toolName);
  if (!toolSchema) {
    return { valid: false, errors: [`Tool '${toolName}' not found`] };
  }
  
  const errors: string[] = [];
  
  // Check required fields
  if (toolSchema.inputSchema.required) {
    for (const required of toolSchema.inputSchema.required) {
      if (!(required in args)) {
        errors.push(`Required field '${required}' is missing`);
      }
    }
  }
  
  // Check field types
  for (const [field, value] of Object.entries(args)) {
    const fieldSchema = toolSchema.inputSchema.properties[field];
    if (fieldSchema) {
      if (fieldSchema.type === 'string' && typeof value !== 'string') {
        errors.push(`Field '${field}' must be a string`);
      } else if (fieldSchema.type === 'number' && typeof value !== 'number') {
        errors.push(`Field '${field}' must be a number`);
      } else if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field '${field}' must be a boolean`);
      } else if (fieldSchema.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${field}' must be an array`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

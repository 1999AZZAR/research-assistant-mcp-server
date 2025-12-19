# Research MCP Server

A comprehensive Model Context Protocol (MCP) server that combines Google Custom Search and Wikipedia functionality for advanced research and information retrieval. Features 28 powerful tools and 13 cached resources for extensive search, analysis, content extraction, and research management capabilities. Includes 8 enhanced analysis tools that work without requiring additional API keys. Configured through MCP clients like Cursor, not through .env files.

## Origins

This project is a combined and enhanced version of:
- [**Google-Search-MCP**](https://github.com/1999AZZAR/Google-Search-MCP) - Original Google Custom Search MCP server
- [**wikipedia-mcp-server**](https://github.com/1999AZZAR/wikipedia-mcp-server) - Original Wikipedia MCP server

The research-mcp-server builds upon these foundations, adding enhanced analysis tools, improved caching, and unified configuration while maintaining compatibility with the original MCP specifications.

## Table of Contents

- [Features](#features)
  - [Enhanced Analysis Tools (8 total - No API Keys Required)](#enhanced-analysis-tools-8-total---no-api-keys-required)
  - [Google Search Tools (10 total)](#google-search-tools-10-total)
  - [Wikipedia Tools (10 total)](#wikipedia-tools-10-total)
  - [Total Tools Available](#total-tools-available)
  - [Resources (13 total)](#resources-13-total)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Cursor Configuration](#cursor-configuration)
  - [Environment Variables](#environment-variables)
  - [Google API Setup](#google-api-setup)
- [Usage](#usage)
  - [Local Development](#local-development)
  - [Production Deployment](#production-deployment)
- [Available Tools](#available-tools)
  - [Enhanced Analysis Tools (8 total - No API Keys Required)](#enhanced-analysis-tools-8-total---no-api-keys-required-1)
  - [Google Search Tools (10 total)](#google-search-tools-10-total-1)
  - [Wikipedia Tools (10 total)](#wikipedia-tools-10-total-1)
- [Architecture](#architecture)
- [Caching](#caching)
- [Error Handling](#error-handling)
- [Development](#development)
  - [Testing](#testing)
  - [Linting](#linting)
  - [Building](#building)
- [License](#license)
- [Contributing](#contributing)
- [Support](#support)

## Features

### Enhanced Analysis Tools (8 total - No API Keys Required)
- **content_sentiment_analysis**: Analyze sentiment of text content using built-in sentiment analysis
- **keyword_extraction**: Extract key terms and topics from text content
- **url_metadata_extractor**: Extract metadata from URLs including title, description, and basic info
- **citation_formatter**: Format citations in APA, MLA, or Chicago style
- **research_session_manager**: Manage research sessions, save findings, and organize notes
- **content_deduplication**: Remove duplicate content from search results and consolidate similar items
- **archive_org_search**: Search archived web pages on Archive.org (Wayback Machine)
- **data_export**: Export research data in various formats (JSON, CSV, Markdown)

### Google Search Tools (10 total)
- **google_search**: Search the web using Google Custom Search API
- **extract_content**: Extract main content from web pages
- **search_analytics**: Analyze search trends and get insights from multiple queries
- **multi_site_search**: Search across multiple specific websites simultaneously
- **news_monitor**: Monitor news and get alerts for specific topics
- **academic_search**: Search academic papers and research documents
- **content_summarizer**: Summarize content from multiple URLs
- **fact_checker**: Verify claims by searching for fact-checking sources
- **research_assistant**: Comprehensive research assistant with multi-query analysis
- **search_trends**: Track and analyze search interest trends over time

### Wikipedia Tools (10 total)
- **wikipedia_search**: Search Wikipedia articles
- **wikipedia_get_page**: Get Wikipedia page content
- **wikipedia_get_summary**: Get a brief summary of a Wikipedia page
- **wikipedia_get_page_by_id**: Get Wikipedia page content by ID
- **wikipedia_random**: Get a random Wikipedia page
- **wikipedia_page_languages**: Get the languages a Wikipedia page is available in
- **wikipedia_batch_search**: Search multiple queries at once for efficiency
- **wikipedia_batch_get_pages**: Get multiple Wikipedia pages at once for efficiency
- **wikipedia_search_nearby**: Find Wikipedia articles near specific coordinates
- **wikipedia_get_pages_in_category**: Browse pages within a specific Wikipedia category

### Total Tools Available
**28 comprehensive research tools** providing extensive search, analysis, content extraction, and research management capabilities from multiple sources.

### Resources (13 total)
- **Google Search Results**: Cached Google search results
- **Search Trends Data**: Search trends and analytics data
- **Search Analytics**: Search analytics and insights
- **Extracted Content Cache**: Cached web content extraction results
- **Wikipedia Search Results**: Cached Wikipedia search results
- **Wikipedia Page**: Cached Wikipedia page content
- **Cached Wikipedia Article**: Full cached content of Wikipedia articles with metadata
- **Cached Wikipedia Search Results**: Detailed cached Wikipedia search results
- **Sentiment Analysis Results**: Cached sentiment analysis of text content
- **Keyword Extraction Results**: Cached keyword extraction from text content
- **URL Metadata Cache**: Cached metadata extracted from URLs
- **Research Sessions**: Saved research sessions and findings
- **Archive.org Snapshots**: Cached archived versions of web pages

## Installation

This MCP server is designed to be used through MCP clients. Install and configure it through your MCP client (Cursor, Claude, etc.) as shown in the Configuration section below.

For local development:

```bash
npm install
```

## Configuration

Configure the Research MCP Server in your MCP client (Cursor, Claude, etc.) instead of using .env files. MCP servers receive configuration through environment variables passed by the client.

### Cursor Configuration

Create a `.cursor/mcp.json` file in your project or `~/.cursor/mcp.json` in your home directory:

#### For Development (recommended):
```json
{
  "mcpServers": {
    "research-mcp-server": {
      "command": "npx",
      "args": ["ts-node", "--esm", "${workspaceFolder}/research-mcp-server/index.ts"],
      "env": {
        "GOOGLE_API_KEY": "${env:GOOGLE_API_KEY}",
        "GOOGLE_CSE_ID": "${env:GOOGLE_CSE_ID}",
        "WIKIPEDIA_CACHE_MAX": "100",
        "WIKIPEDIA_CACHE_TTL": "300000",
        "WIKIPEDIA_DEFAULT_LANGUAGE": "en"
      }
    }
  }
}
```

#### For Production (after building):
```json
{
  "mcpServers": {
    "research-mcp-server": {
      "command": "node",
      "args": ["${workspaceFolder}/research-mcp-server/dist/research-server.js"],
      "env": {
        "GOOGLE_API_KEY": "${env:GOOGLE_API_KEY}",
        "GOOGLE_CSE_ID": "${env:GOOGLE_CSE_ID}",
        "WIKIPEDIA_CACHE_MAX": "100",
        "WIKIPEDIA_CACHE_TTL": "300000",
        "WIKIPEDIA_DEFAULT_LANGUAGE": "en"
      }
    }
  }
}
```

For global configuration (`~/.cursor/mcp.json`), replace `${workspaceFolder}` with the full path to your research-mcp-server directory.

**Note**: After building with `npm run build`, the server will be available at `dist/index.js` for production use.

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_API_KEY` | Google Custom Search API Key | - | Optional* |
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID | - | Optional* |
| `WIKIPEDIA_CACHE_MAX` | Maximum Wikipedia cache entries | `100` | No |
| `WIKIPEDIA_CACHE_TTL` | Wikipedia cache TTL (ms) | `300000` | No |
| `WIKIPEDIA_DEFAULT_LANGUAGE` | Default Wikipedia language | `en` | No |
| `SERVER_NAME` | Server name for identification | `research-mcp-server` | No |

*Google Search is optional - the server works with Wikipedia-only functionality

### Google API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Custom Search API
4. Create credentials (API Key)
5. Create a Custom Search Engine at [https://cse.google.com/](https://cse.google.com/)
6. Get your Search Engine ID

## Usage

The Research MCP Server is designed to be used through MCP clients like Cursor, Claude, or other MCP-compatible applications. Configure it in your MCP client configuration as shown above.

### Local Development

For development and testing, you can run the server directly:

```bash
# Set environment variables (optional)
export GOOGLE_API_KEY=your_api_key
export GOOGLE_CSE_ID=your_search_engine_id

# Run in development mode
npm run dev
```

### Production Deployment

Build and deploy through your MCP client's configuration system:

```bash
npm run build
```

Then configure in your MCP client using the production configuration above.

## Available Tools

The server provides the following comprehensive research tools:

### Enhanced Analysis Tools (8 total - No API Keys Required)
- `content_sentiment_analysis` - Analyze sentiment of text content using built-in sentiment analysis
- `keyword_extraction` - Extract key terms and topics from text content
- `url_metadata_extractor` - Extract metadata from URLs including title, description, and basic info
- `citation_formatter` - Format citations in APA, MLA, or Chicago style
- `research_session_manager` - Manage research sessions, save findings, and organize notes
- `content_deduplication` - Remove duplicate content from search results and consolidate similar items
- `archive_org_search` - Search archived web pages on Archive.org (Wayback Machine)
- `data_export` - Export research data in various formats (JSON, CSV, Markdown)

### Google Search Tools (10 total)
- `google_search` - Search the web using Google Custom Search API
- `extract_content` - Extract main content from web pages
- `search_analytics` - Analyze search trends and get insights from multiple search queries
- `multi_site_search` - Search across multiple specific websites simultaneously
- `news_monitor` - Monitor news and get alerts for specific topics
- `academic_search` - Search academic papers and research documents
- `content_summarizer` - Summarize content from multiple URLs
- `fact_checker` - Verify claims by searching for fact-checking sources
- `research_assistant` - Comprehensive research assistant with multi-query analysis
- `search_trends` - Track and analyze search interest trends over time

### Wikipedia Tools (10 total)
- `wikipedia_search` - Search Wikipedia articles matching a query
- `wikipedia_get_page` - Get full Wikipedia page content
- `wikipedia_get_summary` - Get a brief summary of a Wikipedia page
- `wikipedia_get_page_by_id` - Get Wikipedia page content by page ID
- `wikipedia_random` - Get a random Wikipedia page
- `wikipedia_page_languages` - Get the languages a Wikipedia page is available in
- `wikipedia_batch_search` - Search multiple queries at once for efficiency
- `wikipedia_batch_get_pages` - Get multiple Wikipedia pages at once for efficiency
- `wikipedia_search_nearby` - Find Wikipedia articles near specific coordinates
- `wikipedia_get_pages_in_category` - Browse pages within a specific Wikipedia category

## Architecture

The research server includes:

- **ResearchMCPServer**: Main MCP server class integrating all research services
- **Integrated Google Search Service**: Handles Google Custom Search API interactions with caching
- **Integrated Wikipedia Service**: Manages Wikipedia API calls and caching
- **Enhanced Analysis Engine**: Built-in text analysis, sentiment detection, and content processing (no API keys required)
- **Research Session Management**: In-memory session storage for organizing research findings
- **Configuration**: Unified config system reading from environment variables
- **Intelligent Caching**: Separate LRU caches for Google (30min), Wikipedia (configurable), and analysis results
- **Error Handling**: Graceful degradation when services are unavailable
- **28 Tools**: Comprehensive toolset for research, analysis, and information retrieval
- **13 Resources**: Cached data resources for efficient access

## Caching

The server implements intelligent dual-layer caching:

- **Google Search Cache**: LRU cache with 500 entries, 30-minute TTL for search results
- **Wikipedia Cache**: LRU cache with configurable max entries (default: 100) and TTL (default: 5 minutes)
- **Automatic cache invalidation**: Failed requests don't cache, successful ones do
- **Memory efficient**: Separate caches prevent cross-contamination of data types

## Error Handling

- Graceful degradation: Server works with either service alone
- Comprehensive error messages
- Automatic retry logic for API calls
- Fallback responses for failed requests

## Development

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions, please create an issue in the repository.

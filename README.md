# Research MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A Model Context Protocol (MCP) server that combines Google Custom Search and Wikipedia functionality for research and information retrieval. The server provides 28 tools, 23 resources, and 22 research prompts for search, analysis, content extraction, and research management.

## Features

- 28 tools: Google Search (10), Wikipedia (10), and enhanced analysis (8)
- 23 resources: Templates, guides, and cached research data
- 22 prompts: Structured prompts covering research methodologies
- 8 analysis tools that work without requiring additional API keys
- Multi-layer LRU caching for performance optimization
- MCP client-based configuration (Cursor, Claude, etc.)

## Quick Start

1. Clone and install:

   ```bash
   git clone https://github.com/your-repo/research-mcp-server.git
   cd research-mcp-server
   npm install
   ```

2. Configure environment (optional):

   ```bash
   export GOOGLE_API_KEY="your_google_api_key"
   export GOOGLE_CSE_ID="your_search_engine_id"
   ```

3. Configure MCP client (Cursor):
   Add to your `.cursor/mcp.json`:

   ```json
   {
     "mcpServers": {
       "research-mcp-server": {
         "command": "npx",
         "args": ["ts-node", "--esm", "index.ts"],
         "env": {
           "GOOGLE_API_KEY": "${env:GOOGLE_API_KEY}",
           "GOOGLE_CSE_ID": "${env:GOOGLE_CSE_ID}"
         }
       }
     }
   }
   ```

4. The server will be available in your MCP client with 28 tools, 23 resources, and 22 prompts.

## Origins

This project is a combined and enhanced version of:

- [**Google-Search-MCP**](https://github.com/1999AZZAR/Google-Search-MCP) - Original Google Custom Search MCP server
- [**wikipedia-mcp-server**](https://github.com/1999AZZAR/wikipedia-mcp-server) - Original Wikipedia MCP server

The research-mcp-server builds upon these foundations, adding enhanced analysis tools, improved caching, unified configuration, and a comprehensive prompt library while maintaining compatibility with the original MCP specifications.

## Table of Contents

- [Features](#features)
  - [Enhanced Analysis Tools](#enhanced-analysis-tools)
  - [Google Search Tools](#google-search-tools)
  - [Wikipedia Tools](#wikipedia-tools)
  - [Research Resources](#research-resources)
  - [Research Prompts](#research-prompts)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Cursor MCP Configuration](#cursor-mcp-configuration)
  - [Environment Variables](#environment-variables)
  - [Google API Setup](#google-api-setup)
- [Usage](#usage)
  - [Local Development](#local-development)
  - [Production Deployment](#production-deployment)
- [Available Capabilities](#available-capabilities)
  - [Tools (28 total)](#tools-28-total)
  - [Resources (23 total)](#resources-23-total)
  - [Prompts (22 total)](#prompts-22-total)
- [Architecture](#architecture)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)
- [Development](#development)
- [License](#license)
- [Contributing](#contributing)
- [Support](#support)

## Features

### Enhanced Analysis Tools (8 tools - No API Keys Required)

Built-in analysis capabilities that work without external dependencies:

- `content_sentiment_analysis` - Analyze sentiment of text content
- `keyword_extraction` - Extract key terms and topics from text content
- `url_metadata_extractor` - Extract metadata from URLs including title, description, and basic info
- `citation_formatter` - Format citations in APA, MLA, or Chicago style
- `research_session_manager` - Manage research sessions, save findings, and organize notes
- `content_deduplication` - Remove duplicate content from search results and consolidate similar items
- `archive_org_search` - Search archived web pages on Archive.org (Wayback Machine)
- `data_export` - Export research data in various formats (JSON, CSV, Markdown)

### Google Search Tools (10 tools)

Web search and content analysis capabilities:

- `google_search` - Search the web using Google Custom Search API
- `extract_content` - Extract main content from web pages
- `search_analytics` - Analyze search trends and get insights from multiple queries
- `multi_site_search` - Search across multiple specific websites simultaneously
- `news_monitor` - Monitor news and get alerts for specific topics
- `academic_search` - Search academic papers and research documents
- `content_summarizer` - Summarize content from multiple URLs
- `fact_checker` - Verify claims by searching for fact-checking sources
- `research_assistant` - Comprehensive research assistant with multi-query analysis
- `search_trends` - Track and analyze search interest trends over time

### Wikipedia Tools (10 tools)

Wikipedia integration for encyclopedic knowledge access:

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

### Research Resources (23 resources)

Collection of research templates, guides, and cached data:

#### **Templates & Guides (5 resources):**

- **`research://templates/literature-review`** - Structured template for conducting literature reviews
- **`research://templates/research-proposal`** - Comprehensive research proposal framework
- **`research://guides/methodology/{type}`** - Guides for different research methodologies
- **`research://citations/styles/{style}`** - Citation style guides (APA, MLA, Chicago)
- **`writing://templates/academic-paper`** - Standard academic paper structure template

#### **Writing Resources (3 resources):**

- **`writing://guides/academic-writing`** - Comprehensive guide to academic writing principles
- **`writing://checklists/peer-review`** - Checklist for preparing manuscripts for peer review

#### **Data Analysis Resources (4 resources):**

- **`analysis://guides/statistical-methods`** - Guide to common statistical analysis methods
- **`analysis://templates/data-analysis`** - Framework for structuring data analysis reports
- **`analysis://visualization/types/{chart_type}`** - Guides for different types of data visualizations

#### **Cached Research Data (11 resources):**

- **`google://search/{query}`** - Cached Google search results
- **`google://trends/{topic}`** - Search trends and analytics data
- **`web://content/{url}`** - Cached web content extraction results
- **`wiki://search/{query}`** - Cached Wikipedia search results
- **`wiki://page/{title}`** - Cached Wikipedia page content
- **`analysis://sentiment/{text}`** - Cached sentiment analysis results
- **`analysis://keywords/{text}`** - Cached keyword extraction results
- **`analysis://url-metadata/{url}`** - Cached URL metadata
- **`research://sessions/{name}`** - Saved research sessions and findings
- **`archive://snapshots/{url}`** - Cached archived web pages

### Research Prompts (22 prompts)

Prompt library covering research methodologies:

#### **Planning & Design (10 prompts):**

- **`literature-review-planning`** - Comprehensive literature review planning with search strategy
- **`research-question-development`** - Develop clear, focused research questions with operational definitions
- **`academic-paper-outline`** - Create detailed academic paper outline with section structure
- **`data-analysis-planning`** - Plan data analysis approach with appropriate statistical methods
- **`methodology-selection`** - Guide methodology selection based on research questions and constraints
- **`systematic-review-protocol`** - Develop a comprehensive systematic review protocol
- **`meta-analysis-planning`** - Plan a meta-analysis with statistical and methodological considerations
- **`qualitative-coding-framework`** - Develop a qualitative coding framework for thematic analysis
- **`grant-proposal-writing`** - Structure and write a compelling grant proposal
- **`research-networking-strategy`** - Develop a strategy for building research networks and collaborations

#### **Analysis & Methods (12 prompts):**

- **`statistical-test-selection`** - Select appropriate statistical tests based on data characteristics
- **`results-interpretation`** - Interpret statistical results with practical significance
- **`peer-review-preparation`** - Prepare manuscript for peer review with comprehensive checklist
- **`citation-management`** - Manage citations and references with style guide compliance
- **`ethics-review-preparation`** - Prepare for ethics review with comprehensive ethical considerations
- **`research-rigor-assessment`** - Assess research rigor with validity, reliability, and quality criteria
- **`journal-selection-strategy`** - Develop journal selection strategy based on research topic and goals
- **`manuscript-revision-planning`** - Plan manuscript revisions based on reviewer feedback
- **`collaboration-planning`** - Plan research collaboration with roles, responsibilities, and protocols
- **`research-presentation-planning`** - Plan research presentations with audience analysis and delivery strategies
- **`impact-assessment-planning`** - Plan research impact assessment with metrics and evaluation frameworks
- **`research-dissemination-strategy`** - Develop research dissemination strategy across multiple channels

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

| Variable                       | Description                     | Default                 | Required  |
| ------------------------------ | ------------------------------- | ----------------------- | --------- |
| `GOOGLE_API_KEY`             | Google Custom Search API Key    | -                       | Optional* |
| `GOOGLE_CSE_ID`              | Google Custom Search Engine ID  | -                       | Optional* |
| `WIKIPEDIA_CACHE_MAX`        | Maximum Wikipedia cache entries | `100`                 | No        |
| `WIKIPEDIA_CACHE_TTL`        | Wikipedia cache TTL (ms)        | `300000`              | No        |
| `WIKIPEDIA_DEFAULT_LANGUAGE` | Default Wikipedia language      | `en`                  | No        |
| `SERVER_NAME`                | Server name for identification  | `research-mcp-server` | No        |

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

The Research MCP Server is built with a modular, professional architecture designed for research workflows:

### Core Components

- `ResearchMCPServer` - Main MCP server class implementing the Model Context Protocol
- `GoogleSearchService` - Handles Google Custom Search API interactions with caching
- `WikipediaService` - Manages Wikipedia API calls with configurable caching and batch operations
- `AnalysisEngine` - Built-in text analysis engine for sentiment, keywords, and content processing
- `ResearchSessionManager` - In-memory session storage for organizing research findings
- `PromptLibrary` - Collection of 22 structured prompts covering research methodologies

### Key Features

- MCP Protocol compliance with tools, resources, and prompts
- Environment-based configuration system compatible with MCP clients
- Multi-layer LRU caching for performance
- Graceful degradation and error handling
- Modular design with clean separation of concerns

### Technology Stack

- Runtime: Node.js ≥18.0.0 with ES modules
- Language: TypeScript for type safety
- HTTP Client: Axios with retry logic for reliable API interactions
- Web Scraping: Cheerio for HTML content extraction and parsing
- Caching: LRU Cache for memory-efficient data storage
- Analysis: Built-in sentiment analysis and text processing libraries

## Caching Strategy

The server implements a sophisticated multi-layer caching strategy optimized for research workflows:

### **Cache Layers:**

- **Google Search Cache**: LRU cache (500 entries, 30-minute TTL)

  - Caches search results to minimize API calls
  - Reduces latency for repeated queries
  - Automatic invalidation for failed requests
- **Wikipedia Cache**: Configurable LRU cache (default: 100 entries, 5-minute TTL)

  - Separate cache for encyclopedia content
  - Batch operation support for efficiency
  - Language-specific caching for multilingual support
- **Analysis Results Cache**: Persistent caching for computational results

  - Sentiment analysis, keyword extraction, URL metadata
  - Reduces processing overhead for repeated analyses
  - Memory-efficient storage of processed content

### Cache Management

- Automatic invalidation: Failed requests don't populate cache
- TTL management: Configurable time-to-live for different data types
- Memory optimization: Separate caches prevent cross-contamination
- Performance monitoring: Cache hit/miss ratios for optimization

## Error Handling

The Research MCP Server implements error handling strategies to ensure reliable operation:

### Resilience Features

- Graceful degradation: Server continues to function when individual services are unavailable
  - Google Search can be disabled while Wikipedia functionality remains active
  - Analysis tools work independently of external APIs
  - Prompts are always available regardless of service status

- Retry logic: Automatic retry mechanisms for transient failures
  - Exponential backoff for API rate limits
  - Configurable retry attempts and timeouts

- Error messages: Detailed error reporting
  - Clear indication of which service failed
  - Suggestions for resolution when possible

### Fallback Strategies

- Service-level fallbacks: Alternative approaches when primary services fail
- Cache-first responses: Serve cached results when live queries fail
- Partial success handling: Return available data even when some operations fail

## Development

### Prerequisites

- Node.js ≥18.0.0
- npm or yarn package manager
- TypeScript compiler
- Google Custom Search API (optional)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/research-mcp-server.git
cd research-mcp-server

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your API keys

# Run in development mode
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready TypeScript compilation |
| `npm run start` | Run production server from built files |
| `npm test` | Run test suite (when implemented) |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run clean` | Remove build artifacts and caches |

### Code Quality

- TypeScript: Strict type checking enabled
- ESLint: Configured for code consistency
- Prettier: Code formatting standards (recommended)
- Husky: Pre-commit hooks for quality assurance

### **Testing Strategy**

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test/file
```

### **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Run linting: `npm run lint`
7. Commit with conventional commit messages
8. Push to your branch and create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions to the Research MCP Server. Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Quick Contribution Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Develop with TypeScript best practices
4. Test thoroughly - ensure all existing functionality works
5. Document new features in the README and code comments
6. Submit a Pull Request with a clear description

### Development Standards

- TypeScript: Strict typing required for all new code
- Error handling: Comprehensive error handling and user-friendly messages
- Documentation: Clear code comments and README updates
- Testing: Unit tests for new functionality (when implemented)
- Performance: Consider caching and optimization for new features

## Support

### Getting Help

- Documentation: Check this README and inline code documentation
- Bug reports: Create an issue on GitHub
- Feature requests: Use GitHub issues to suggest new capabilities
- Discussions: Join community discussions for best practices

### Common Issues

- Server won't start: Check Node.js version (≥18.0.0) and environment variables
- API errors: Verify Google API keys and network connectivity
- Performance issues: Check cache configuration and available memory
- MCP client issues: Ensure proper `.cursor/mcp.json` configuration

### Community Resources

- GitHub Issues: For bug reports and feature requests
- GitHub Discussions: For questions and community support
- Documentation: Comprehensive guides and API references

---

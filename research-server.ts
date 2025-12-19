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
import { Prompt, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Research Prompt Definitions - Rich Library for Research Workflows
export const researchPrompts: Prompt[] = [
  {
    name: 'literature-review-planning',
    description: 'Comprehensive literature review planning with search strategy and analysis framework',
    arguments: [
      {
        name: 'research_topic',
        description: 'The main research topic or question',
        required: true,
      },
      {
        name: 'review_scope',
        description: 'Scope of the literature review (comprehensive, focused, etc.)',
        required: false,
      },
      {
        name: 'time_period',
        description: 'Time period to cover (recent, all, specific years)',
        required: false,
      },
    ],
  },
  {
    name: 'research-question-development',
    description: 'Develop clear, focused research questions with operational definitions',
    arguments: [
      {
        name: 'topic_area',
        description: 'General topic area of interest',
        required: true,
      },
      {
        name: 'research_type',
        description: 'Type of research (exploratory, descriptive, explanatory)',
        required: false,
      },
      {
        name: 'stakeholder_perspective',
        description: 'Perspective to consider (researcher, practitioner, policy)',
        required: false,
      },
    ],
  },
  {
    name: 'academic-paper-outline',
    description: 'Create detailed academic paper outline with section structure',
    arguments: [
      {
        name: 'paper_title',
        description: 'Working title of the academic paper',
        required: true,
      },
      {
        name: 'paper_type',
        description: 'Type of paper (empirical, theoretical, review)',
        required: false,
      },
      {
        name: 'target_journal',
        description: 'Target journal or publication venue',
        required: false,
      },
      {
        name: 'word_count_target',
        description: 'Target word count for the paper',
        required: false,
      },
    ],
  },
  {
    name: 'data-analysis-planning',
    description: 'Plan data analysis approach with appropriate statistical methods',
    arguments: [
      {
        name: 'data_type',
        description: 'Type of data (quantitative, qualitative, mixed)',
        required: true,
      },
      {
        name: 'research_design',
        description: 'Research design used',
        required: false,
      },
      {
        name: 'sample_size',
        description: 'Approximate sample size',
        required: false,
      },
      {
        name: 'key_variables',
        description: 'Key variables to analyze (comma-separated)',
        required: false,
      },
    ],
  },
  {
    name: 'methodology-selection',
    description: 'Guide methodology selection based on research questions and constraints',
    arguments: [
      {
        name: 'research_questions',
        description: 'Main research questions to address',
        required: true,
      },
      {
        name: 'available_resources',
        description: 'Available resources and constraints',
        required: false,
      },
      {
        name: 'data_type_needed',
        description: 'Type of data needed to answer questions',
        required: false,
      },
    ],
  },
  {
    name: 'statistical-test-selection',
    description: 'Select appropriate statistical tests based on data characteristics',
    arguments: [
      {
        name: 'data_characteristics',
        description: 'Characteristics of your data (distribution, types, etc.)',
        required: true,
      },
      {
        name: 'comparison_type',
        description: 'What you want to compare (means, proportions, correlations)',
        required: false,
      },
      {
        name: 'group_count',
        description: 'Number of groups to compare',
        required: false,
      },
      {
        name: 'sample_size',
        description: 'Sample size per group',
        required: false,
      },
    ],
  },
  {
    name: 'results-interpretation',
    description: 'Interpret statistical results with practical significance',
    arguments: [
      {
        name: 'statistical_findings',
        description: 'Key statistical findings to interpret',
        required: true,
      },
      {
        name: 'effect_size',
        description: 'Effect size measures if available',
        required: false,
      },
      {
        name: 'confidence_level',
        description: 'Confidence level used (e.g., 95%)',
        required: false,
      },
      {
        name: 'research_context',
        description: 'Context of the research study',
        required: false,
      },
    ],
  },
  {
    name: 'peer-review-preparation',
    description: 'Prepare manuscript for peer review with comprehensive checklist',
    arguments: [
      {
        name: 'manuscript_title',
        description: 'Title of the manuscript',
        required: true,
      },
      {
        name: 'target_journal',
        description: 'Target journal for submission',
        required: false,
      },
      {
        name: 'manuscript_stage',
        description: 'Current stage (initial, revision, resubmission)',
        required: false,
      },
    ],
  },
  {
    name: 'citation-management',
    description: 'Manage citations and references with style guide compliance',
    arguments: [
      {
        name: 'citation_style',
        description: 'Citation style to use (APA, MLA, Chicago)',
        required: false,
      },
      {
        name: 'document_type',
        description: 'Type of document (paper, thesis, report)',
        required: false,
      },
      {
        name: 'reference_count',
        description: 'Expected number of references',
        required: false,
      },
    ],
  },
  {
    name: 'ethics-review-preparation',
    description: 'Prepare for ethics review with comprehensive ethical considerations',
    arguments: [
      {
        name: 'participant_type',
        description: 'Type of participants (human, animal, data)',
        required: true,
      },
      {
        name: 'data_collection_method',
        description: 'How data will be collected',
        required: false,
      },
      {
        name: 'risk_level',
        description: 'Level of risk to participants',
        required: false,
      },
      {
        name: 'institutional_review',
        description: 'Review board type (IRB, ethics committee)',
        required: false,
      },
    ],
  },
  {
    name: 'research-rigor-assessment',
    description: 'Assess research rigor with validity, reliability, and quality criteria',
    arguments: [
      {
        name: 'research_methodology',
        description: 'Methodology used in the research',
        required: true,
      },
      {
        name: 'quality_criteria',
        description: 'Quality criteria to assess (validity, reliability, etc.)',
        required: false,
      },
      {
        name: 'study_phase',
        description: 'Current phase of the study',
        required: false,
      },
    ],
  },
  {
    name: 'journal-selection-strategy',
    description: 'Develop journal selection strategy based on research topic and goals',
    arguments: [
      {
        name: 'research_topic',
        description: 'The research topic',
        required: true,
      },
      {
        name: 'target_audience',
        description: 'Primary target audience',
        required: false,
      },
      {
        name: 'impact_goal',
        description: 'Primary impact goal (citations, practice, policy)',
        required: false,
      },
      {
        name: 'timeline_constraint',
        description: 'Timeline constraints for publication',
        required: false,
      },
    ],
  },
  {
    name: 'manuscript-revision-planning',
    description: 'Plan manuscript revisions based on reviewer feedback',
    arguments: [
      {
        name: 'reviewer_feedback',
        description: 'Key reviewer feedback received',
        required: true,
      },
      {
        name: 'revision_deadline',
        description: 'Deadline for revisions',
        required: false,
      },
      {
        name: 'manuscript_weaknesses',
        description: 'Identified weaknesses in manuscript',
        required: false,
      },
      {
        name: 'response_strategy',
        description: 'Overall strategy for responding',
        required: false,
      },
    ],
  },
  {
    name: 'collaboration-planning',
    description: 'Plan research collaboration with roles, responsibilities, and protocols',
    arguments: [
      {
        name: 'collaboration_type',
        description: 'Type of collaboration (inter-institutional, interdisciplinary)',
        required: true,
      },
      {
        name: 'team_size',
        description: 'Number of collaborators',
        required: false,
      },
      {
        name: 'collaboration_goals',
        description: 'Main goals of the collaboration',
        required: false,
      },
      {
        name: 'timeline_requirements',
        description: 'Timeline requirements and constraints',
        required: false,
      },
    ],
  },
  {
    name: 'research-presentation-planning',
    description: 'Plan research presentations with audience analysis and delivery strategies',
    arguments: [
      {
        name: 'presentation_type',
        description: 'Type of presentation (conference, seminar, webinar)',
        required: true,
      },
      {
        name: 'audience_composition',
        description: 'Composition of the audience',
        required: false,
      },
      {
        name: 'time_allocation',
        description: 'Time allocated for presentation',
        required: false,
      },
      {
        name: 'presentation_goal',
        description: 'Primary goal of the presentation',
        required: false,
      },
    ],
  },
  {
    name: 'impact-assessment-planning',
    description: 'Plan research impact assessment with metrics and evaluation frameworks',
    arguments: [
      {
        name: 'research_type',
        description: 'Type of research conducted',
        required: true,
      },
      {
        name: 'impact_areas',
        description: 'Areas to assess impact (academic, practice, policy)',
        required: false,
      },
      {
        name: 'timeline_horizon',
        description: 'Time horizon for impact assessment',
        required: false,
      },
      {
        name: 'stakeholder_groups',
        description: 'Key stakeholder groups to consider',
        required: false,
      },
    ],
  },
  {
    name: 'research-dissemination-strategy',
    description: 'Develop research dissemination strategy across multiple channels',
    arguments: [
      {
        name: 'research_findings',
        description: 'Key findings to disseminate',
        required: true,
      },
      {
        name: 'target_audiences',
        description: 'Primary audiences for dissemination',
        required: false,
      },
      {
        name: 'dissemination_channels',
        description: 'Channels to use for dissemination',
        required: false,
      },
      {
        name: 'resource_constraints',
        description: 'Resource constraints and limitations',
        required: false,
      },
    ],
  },
  {
    name: 'systematic-review-protocol',
    description: 'Develop a comprehensive systematic review protocol',
    arguments: [
      {
        name: 'review_question',
        description: 'The specific review question (PICO format)',
        required: true,
      },
      {
        name: 'inclusion_criteria',
        description: 'Detailed inclusion criteria',
        required: false,
      },
      {
        name: 'search_strategy',
        description: 'Search strategy details',
        required: false,
      },
    ],
  },
  {
    name: 'meta-analysis-planning',
    description: 'Plan a meta-analysis with statistical and methodological considerations',
    arguments: [
      {
        name: 'research_topic',
        description: 'Topic for meta-analysis',
        required: true,
      },
      {
        name: 'effect_size_type',
        description: 'Type of effect size to use',
        required: false,
      },
      {
        name: 'heterogeneity_assessment',
        description: 'How to assess heterogeneity',
        required: false,
      },
    ],
  },
  {
    name: 'qualitative-coding-framework',
    description: 'Develop a qualitative coding framework for thematic analysis',
    arguments: [
      {
        name: 'data_type',
        description: 'Type of qualitative data',
        required: true,
      },
      {
        name: 'analytical_approach',
        description: 'Approach to analysis (thematic, grounded theory, etc.)',
        required: false,
      },
      {
        name: 'coding_level',
        description: 'Level of coding (open, axial, selective)',
        required: false,
      },
    ],
  },
  {
    name: 'grant-proposal-writing',
    description: 'Structure and write a compelling grant proposal',
    arguments: [
      {
        name: 'funding_agency',
        description: 'Target funding agency',
        required: true,
      },
      {
        name: 'project_budget',
        description: 'Total project budget requested',
        required: false,
      },
      {
        name: 'project_duration',
        description: 'Duration of the proposed project',
        required: false,
      },
    ],
  },
  {
    name: 'research-networking-strategy',
    description: 'Develop a strategy for building research networks and collaborations',
    arguments: [
      {
        name: 'research_field',
        description: 'Your research field or specialty',
        required: true,
      },
      {
        name: 'networking_goals',
        description: 'Specific goals for networking',
        required: false,
      },
      {
        name: 'available_time',
        description: 'Time available for networking activities',
        required: false,
      },
    ],
  },
];

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

  // Research Templates and Guides
  {
    uri: 'research://templates/literature-review',
    name: 'Literature Review Template',
    description: 'Structured template for conducting literature reviews',
    mimeType: 'application/json',
  },
  {
    uri: 'research://templates/research-proposal',
    name: 'Research Proposal Template',
    description: 'Comprehensive research proposal framework',
    mimeType: 'application/json',
  },
  {
    uri: 'research://guides/methodology/{type}',
    name: 'Research Methodology Guide',
    description: 'Guides for different research methodologies',
    mimeType: 'application/json',
  },
  {
    uri: 'research://citations/styles/{style}',
    name: 'Citation Style Guide',
    description: 'Detailed guides for academic citation styles',
    mimeType: 'application/json',
  },

  // Academic Writing Resources
  {
    uri: 'writing://templates/academic-paper',
    name: 'Academic Paper Template',
    description: 'Standard academic paper structure template',
    mimeType: 'application/json',
  },
  {
    uri: 'writing://guides/academic-writing',
    name: 'Academic Writing Guide',
    description: 'Comprehensive guide to academic writing principles',
    mimeType: 'application/json',
  },
  {
    uri: 'writing://checklists/peer-review',
    name: 'Peer Review Checklist',
    description: 'Checklist for preparing manuscripts for peer review',
    mimeType: 'application/json',
  },

  // Data Analysis Resources
  {
    uri: 'analysis://guides/statistical-methods',
    name: 'Statistical Methods Guide',
    description: 'Guide to common statistical analysis methods',
    mimeType: 'application/json',
  },
  {
    uri: 'analysis://templates/data-analysis',
    name: 'Data Analysis Template',
    description: 'Framework for structuring data analysis reports',
    mimeType: 'application/json',
  },
  {
    uri: 'analysis://visualization/types/{chart_type}',
    name: 'Data Visualization Guide',
    description: 'Guides for different types of data visualizations',
    mimeType: 'application/json',
  },

  // Research Prompt Templates
  {
    uri: 'prompts://research/literature-review',
    name: 'Literature Review Prompt Template',
    description: 'Structured prompts for conducting literature reviews',
    mimeType: 'application/json',
  },
  {
    uri: 'prompts://research/paper-analysis',
    name: 'Academic Paper Analysis Prompts',
    description: 'Prompts for analyzing academic papers and research articles',
    mimeType: 'application/json',
  },
  {
    uri: 'prompts://research/methodology-selection',
    name: 'Research Methodology Selection Guide',
    description: 'Prompts to help choose appropriate research methodologies',
    mimeType: 'application/json',
  },
  {
    uri: 'prompts://writing/academic-outline',
    name: 'Academic Writing Outline Prompts',
    description: 'Prompts for creating outlines and structures for academic writing',
    mimeType: 'application/json',
  },
  {
    uri: 'prompts://analysis/data-interpretation',
    name: 'Data Interpretation Prompts',
    description: 'Structured prompts for interpreting research data and results',
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
          prompts: {},
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


  private generateResearchPrompt(name: string, args: Record<string, any>): string {
    try {
      switch (name) {
        case 'literature-review-planning':
          return this.generateLiteratureReviewPlanningPrompt(args);
        case 'research-question-development':
          return this.generateResearchQuestionDevelopmentPrompt(args);
        case 'academic-paper-outline':
          return this.generateAcademicPaperOutlinePrompt(args);
        case 'data-analysis-planning':
          return this.generateDataAnalysisPlanningPrompt(args);
        case 'methodology-selection':
          return this.generateMethodologySelectionPrompt(args);
        case 'statistical-test-selection':
          return this.generateStatisticalTestSelectionPrompt(args);
        case 'results-interpretation':
          return this.generateResultsInterpretationPrompt(args);
        case 'peer-review-preparation':
          return this.generatePeerReviewPreparationPrompt(args);
        case 'citation-management':
          return this.generateCitationManagementPrompt(args);
        case 'ethics-review-preparation':
          return this.generateEthicsReviewPreparationPrompt(args);
        case 'research-rigor-assessment':
          return this.generateResearchRigorAssessmentPrompt(args);
        case 'journal-selection-strategy':
          return this.generateJournalSelectionStrategyPrompt(args);
        case 'manuscript-revision-planning':
          return this.generateManuscriptRevisionPlanningPrompt(args);
        case 'collaboration-planning':
          return this.generateCollaborationPlanningPrompt(args);
        case 'research-presentation-planning':
          return this.generateResearchPresentationPlanningPrompt(args);
        case 'impact-assessment-planning':
          return this.generateImpactAssessmentPlanningPrompt(args);
        case 'research-dissemination-strategy':
          return this.generateResearchDisseminationStrategyPrompt(args);
        case 'systematic-review-protocol':
          return this.generateSystematicReviewProtocolPrompt(args);
        case 'meta-analysis-planning':
          return this.generateMetaAnalysisPlanningPrompt(args);
        case 'qualitative-coding-framework':
          return this.generateQualitativeCodingFrameworkPrompt(args);
        case 'grant-proposal-writing':
          return this.generateGrantProposalWritingPrompt(args);
        case 'research-networking-strategy':
          return this.generateResearchNetworkingStrategyPrompt(args);
        default:
          throw new Error(`Unknown research prompt: ${name}`);
      }
    } catch (error) {
      throw new Error(`Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  private handleResearchTemplates(url: URL): any {
    const templateType = url.pathname.split('/')[2];

    switch (templateType) {
      case 'literature-review':
        return {
          contents: [{
            uri: url.toString(),
            mimeType: 'application/json',
            text: JSON.stringify({
              title: 'Literature Review Template',
              sections: [
                {
                  title: 'Introduction',
                  content: 'Provide background and context for the research topic. Explain the importance and scope of the review.',
                  subsections: ['Research Question', 'Scope and Limitations', 'Methodology Overview']
                },
                {
                  title: 'Theoretical Framework',
                  content: 'Present key theories and concepts relevant to the topic.',
                  subsections: ['Key Theories', 'Conceptual Definitions', 'Theoretical Gaps']
                },
                {
                  title: 'Literature Analysis',
                  content: 'Critically analyze existing research studies.',
                  subsections: ['Study Summaries', 'Methodological Critique', 'Findings Synthesis']
                },
                {
                  title: 'Discussion and Implications',
                  content: 'Discuss patterns, contradictions, and implications for future research.',
                  subsections: ['Key Patterns', 'Research Gaps', 'Future Directions']
                }
              ],
              checklist: [
                'Clear research questions defined',
                'Comprehensive database search',
                'Inclusion/exclusion criteria applied',
                'Quality assessment conducted',
                'Synthesis methodology appropriate',
                'Limitations acknowledged'
              ]
            }, null, 2)
          }]
        };

      case 'research-proposal':
        return {
          contents: [{
            uri: url.toString(),
            mimeType: 'application/json',
            text: JSON.stringify({
              title: 'Research Proposal Template',
              sections: [
                {
                  title: 'Title Page',
                  content: 'Project title, researcher name, institution, date',
                  required: true
                },
                {
                  title: 'Abstract',
                  content: '250-500 word summary of the entire proposal',
                  required: true
                },
                {
                  title: 'Introduction',
                  content: 'Background, problem statement, research questions',
                  subsections: ['Background', 'Problem Statement', 'Research Questions', 'Objectives']
                },
                {
                  title: 'Literature Review',
                  content: 'Summary of existing research and theoretical framework',
                  subsections: ['Key Studies', 'Theoretical Framework', 'Research Gaps']
                },
                {
                  title: 'Methodology',
                  content: 'Research design, data collection, analysis methods',
                  subsections: ['Research Design', 'Participants/Sample', 'Data Collection', 'Data Analysis']
                },
                {
                  title: 'Timeline',
                  content: 'Project timeline with milestones',
                  required: true
                },
                {
                  title: 'Budget',
                  content: 'Detailed budget breakdown',
                  required: true
                }
              ]
            }, null, 2)
          }]
        };

      default:
        return {
          contents: [{
            uri: url.toString(),
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Template not found' }, null, 2)
          }]
        };
    }
  }

  private handleMethodologyGuides(url: URL): any {
    const methodologyType = url.pathname.split('/')[3];

    const methodologies = {
      quantitative: {
        title: 'Quantitative Research Methodology',
        description: 'Guide for quantitative research approaches',
        types: ['Experimental', 'Survey', 'Correlational', 'Causal-Comparative'],
        steps: [
          'Define research problem and questions',
          'Review literature',
          'Specify hypotheses',
          'Design research methodology',
          'Develop measurement instruments',
          'Select sample',
          'Collect data',
          'Analyze data using statistical methods',
          'Interpret results',
          'Draw conclusions'
        ],
        tools: ['SPSS', 'R', 'Excel', 'SAS', 'Statistical calculators']
      },
      qualitative: {
        title: 'Qualitative Research Methodology',
        description: 'Guide for qualitative research approaches',
        types: ['Case Study', 'Ethnography', 'Phenomenology', 'Grounded Theory'],
        steps: [
          'Identify research problem',
          'Select participants',
          'Determine data collection method',
          'Develop data collection instruments',
          'Collect data',
          'Analyze data (coding, categorization)',
          'Interpret findings',
          'Validate interpretations',
          'Write report'
        ],
        tools: ['NVivo', 'Atlas.ti', 'MAXQDA', 'Interview recording software']
      },
      mixed_methods: {
        title: 'Mixed Methods Research',
        description: 'Combining quantitative and qualitative approaches',
        types: ['Sequential Explanatory', 'Sequential Exploratory', 'Concurrent Triangulation'],
        steps: [
          'Define research problem',
          'Determine mixed methods design',
          'Collect quantitative data',
          'Collect qualitative data',
          'Analyze quantitative data',
          'Analyze qualitative data',
          'Integrate findings',
          'Interpret results'
        ]
      }
    };

    const method = methodologies[methodologyType as keyof typeof methodologies];
    if (!method) {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Methodology guide not found' }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(method, null, 2)
      }]
    };
  }

  private handleCitationStyles(url: URL): any {
    const style = url.pathname.split('/')[3];

    const citationStyles = {
      apa: {
        title: 'APA (American Psychological Association) Style',
        description: '7th edition guidelines',
        inText: [
          'Single author: (Author, Year)',
          'Two authors: (Author1 & Author2, Year)',
          'Three or more: (Author1 et al., Year)',
          'Organization: (Organization, Year)'
        ],
        reference: [
          'Book: Author, A. A. (Year). Title of work. Publisher.',
          'Journal Article: Author, A. A. (Year). Title of article. Title of Journal, volume(issue), page-page.',
          'Website: Author, A. A. (Year, Month Day). Title of page. Site Name. URL'
        ]
      },
      mla: {
        title: 'MLA (Modern Language Association) Style',
        description: '9th edition guidelines',
        inText: '(Author Page)',
        reference: [
          'Book: Author. Title of Book. Publisher, Year.',
          'Journal Article: Author. "Title of Article." Title of Journal, vol. #, no. #, Year, pp. #-#.',
          'Website: Author. "Title of Webpage." Title of Website, Publisher, Date, URL.'
        ]
      },
      chicago: {
        title: 'Chicago Manual of Style',
        description: '17th edition guidelines',
        inText: [
          'Notes: Superscript number',
          'Author-Date: (Author Year, Page)'
        ],
        reference: [
          'Book: Author. Title. Place of Publication: Publisher, Year.',
          'Journal Article: Author. "Title." Journal Name volume, no. issue (Year): page-page.',
          'Website: Author. "Title." Site Name. Accessed Date. URL.'
        ]
      }
    };

    const citationStyle = citationStyles[style as keyof typeof citationStyles];
    if (!citationStyle) {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Citation style not found' }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(citationStyle, null, 2)
      }]
    };
  }

  private handleWritingTemplates(url: URL): any {
    const templateType = url.pathname.split('/')[2];

    if (templateType === 'academic-paper') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Academic Paper Structure Template',
            sections: [
              {
                title: 'Title Page',
                content: 'Title, author, affiliation, course, date',
                wordCount: 'N/A'
              },
              {
                title: 'Abstract',
                content: '150-250 words summarizing the entire paper',
                wordCount: '150-250'
              },
              {
                title: 'Introduction',
                content: 'Background, research question, thesis statement',
                wordCount: '300-500',
                subsections: ['Hook', 'Background', 'Problem Statement', 'Thesis']
              },
              {
                title: 'Literature Review',
                content: 'Summary and analysis of existing research',
                wordCount: '800-1500',
                subsections: ['Historical Context', 'Key Studies', 'Theoretical Framework', 'Gaps in Literature']
              },
              {
                title: 'Methodology',
                content: 'Research design, participants, procedures, analysis',
                wordCount: '500-800',
                subsections: ['Research Design', 'Participants', 'Materials', 'Procedure', 'Data Analysis']
              },
              {
                title: 'Results',
                content: 'Findings, data presentation, statistical analysis',
                wordCount: '500-1000',
                subsections: ['Descriptive Statistics', 'Inferential Statistics', 'Data Visualization']
              },
              {
                title: 'Discussion',
                content: 'Interpretation, implications, limitations, future research',
                wordCount: '800-1200',
                subsections: ['Interpretation', 'Implications', 'Limitations', 'Future Research']
              },
              {
                title: 'Conclusion',
                content: 'Summary of key points, final thoughts',
                wordCount: '200-300'
              },
              {
                title: 'References',
                content: 'Complete list of all sources cited',
                wordCount: 'N/A'
              }
            ],
            totalWordCount: '4000-8000',
            tips: [
              'Follow the required citation style consistently',
              'Use clear headings and subheadings',
              'Maintain academic tone and objectivity',
              'Include page numbers and running head',
              'Proofread multiple times'
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Writing template not found' }, null, 2)
      }]
    };
  }

  private handleWritingGuides(url: URL): any {
    const guideType = url.pathname.split('/')[2];

    if (guideType === 'academic-writing') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Academic Writing Guide',
            principles: [
              {
                principle: 'Clarity and Precision',
                description: 'Use clear, concise language. Avoid jargon unless necessary.',
                examples: ['Instead of "utilize", say "use"', 'Define technical terms']
              },
              {
                principle: 'Objectivity',
                description: 'Present facts and evidence, not personal opinions.',
                examples: ['Use "research shows" instead of "I believe"', 'Support claims with evidence']
              },
              {
                principle: 'Formality',
                description: 'Maintain professional, academic tone throughout.',
                examples: ['Avoid contractions', 'Use passive voice when appropriate']
              },
              {
                principle: 'Structure and Organization',
                description: 'Follow logical structure with clear transitions.',
                examples: ['Use topic sentences', 'Include transition words']
              }
            ],
            commonMistakes: [
              'Using first person inappropriately',
              'Overusing passive voice',
              'Including unsubstantiated claims',
              'Poor citation practices',
              'Informal language and slang'
            ],
            writingProcess: [
              'Pre-writing: Brainstorm, outline, research',
              'Drafting: Write first draft without worrying about perfection',
              'Revising: Improve content, structure, and clarity',
              'Editing: Check grammar, style, and formatting',
              'Proofreading: Final check for errors'
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Writing guide not found' }, null, 2)
      }]
    };
  }

  private handleWritingChecklists(url: URL): any {
    const checklistType = url.pathname.split('/')[2];

    if (checklistType === 'peer-review') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Peer Review Preparation Checklist',
            categories: [
              {
                category: 'Content Quality',
                items: [
                  'Research question is clear and significant',
                  'Literature review is comprehensive and current',
                  'Methodology is appropriate and well-described',
                  'Results are clearly presented and analyzed',
                  'Discussion addresses implications and limitations',
                  'Conclusions are supported by evidence'
                ]
              },
              {
                category: 'Writing Quality',
                items: [
                  'Abstract accurately summarizes the paper',
                  'Introduction provides adequate background',
                  'Methods section allows replication',
                  'Results are presented logically',
                  'Discussion interprets findings appropriately',
                  'Language is clear and concise'
                ]
              },
              {
                category: 'Technical Aspects',
                items: [
                  'All figures/tables are clear and labeled',
                  'Statistical analyses are appropriate',
                  'Citations follow required style',
                  'References are complete and accurate',
                  'Formatting follows journal guidelines',
                  'Word count within limits'
                ]
              },
              {
                category: 'Ethical Considerations',
                items: [
                  'Research design protects participants',
                  'Conflicts of interest disclosed',
                  'Data integrity maintained',
                  'Authorship criteria met',
                  'Permissions obtained for copyrighted material'
                ]
              }
            ],
            finalChecks: [
              'Proofread multiple times',
              'Have someone else review',
              'Check all requirements met',
              'Submit before deadline',
              'Keep copies of all materials'
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Writing checklist not found' }, null, 2)
      }]
    };
  }

  private handleAnalysisGuides(url: URL): any {
    const guideType = url.pathname.split('/')[2];

    if (guideType === 'statistical-methods') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Statistical Methods Guide',
            descriptive: [
              {
                method: 'Mean',
                description: 'Average value of a dataset',
                whenToUse: 'Normally distributed data, interval/ratio scales',
                formula: 'Σx/n'
              },
              {
                method: 'Median',
                description: 'Middle value when data is ordered',
                whenToUse: 'Skewed data, ordinal scales, outliers present',
                formula: 'Middle value in ordered list'
              },
              {
                method: 'Mode',
                description: 'Most frequently occurring value',
                whenToUse: 'Categorical data, nominal scales',
                formula: 'Most frequent value'
              }
            ],
            inferential: [
              {
                method: 't-test',
                description: 'Compare means of two groups',
                types: ['Independent samples', 'Paired samples', 'One-sample'],
                assumptions: ['Normality', 'Homogeneity of variance', 'Independence']
              },
              {
                method: 'ANOVA',
                description: 'Compare means of three or more groups',
                types: ['One-way', 'Two-way', 'Repeated measures'],
                postHoc: ['Tukey HSD', 'Scheffe', 'Bonferroni']
              },
              {
                method: 'Correlation',
                description: 'Measure relationship between variables',
                types: ['Pearson (parametric)', 'Spearman (non-parametric)'],
                interpretation: ['0.8-1.0: Very strong', '0.6-0.8: Strong', '0.3-0.6: Moderate']
              },
              {
                method: 'Regression',
                description: 'Predict outcome based on predictor variables',
                types: ['Simple linear', 'Multiple linear', 'Logistic'],
                evaluation: ['R-squared', 'Adjusted R-squared', 'F-statistic']
              }
            ],
            nonParametric: [
              {
                method: 'Chi-square test',
                description: 'Test relationships between categorical variables',
                types: ['Goodness of fit', 'Test of independence'],
                assumptions: ['Expected frequencies ≥ 5', 'Random sampling']
              },
              {
                method: 'Mann-Whitney U test',
                description: 'Non-parametric alternative to t-test',
                whenToUse: 'Ordinal data, non-normal distributions',
                interpretation: 'U statistic compared to critical value'
              }
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Analysis guide not found' }, null, 2)
      }]
    };
  }

  private handleAnalysisTemplates(url: URL): any {
    const templateType = url.pathname.split('/')[2];

    if (templateType === 'data-analysis') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Data Analysis Report Template',
            sections: [
              {
                title: 'Executive Summary',
                content: 'Brief overview of analysis objectives, methods, and key findings',
                wordCount: '200-300'
              },
              {
                title: 'Introduction',
                content: 'Research questions, objectives, and data description',
                subsections: ['Research Questions', 'Data Source', 'Variables Description']
              },
              {
                title: 'Methodology',
                content: 'Analysis methods, software used, assumptions',
                subsections: ['Data Preparation', 'Statistical Methods', 'Software Tools']
              },
              {
                title: 'Data Analysis',
                content: 'Step-by-step analysis with results and interpretations',
                subsections: ['Descriptive Statistics', 'Inferential Statistics', 'Model Results']
              },
              {
                title: 'Results',
                content: 'Key findings, tables, and figures with interpretations',
                subsections: ['Summary Statistics', 'Hypothesis Testing', 'Effect Sizes']
              },
              {
                title: 'Discussion',
                content: 'Interpretation of results, implications, limitations',
                subsections: ['Interpretation', 'Practical Implications', 'Limitations']
              },
              {
                title: 'Conclusions and Recommendations',
                content: 'Summary of findings and recommendations',
                subsections: ['Conclusions', 'Recommendations', 'Future Research']
              }
            ],
            requiredElements: [
              'Clear research questions',
              'Detailed methodology description',
              'Appropriate statistical tests',
              'Clear data visualizations',
              'Interpretation of results',
              'Discussion of limitations',
              'Actionable recommendations'
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Analysis template not found' }, null, 2)
      }]
    };
  }

  private handleVisualizationGuides(url: URL): any {
    const chartType = url.pathname.split('/')[3];

    const visualizationTypes = {
      bar: {
        title: 'Bar Chart Guide',
        description: 'Compare categories or show frequency distributions',
        bestFor: ['Comparing categories', 'Showing counts/frequencies', 'Displaying nominal data'],
        elements: ['Clear axis labels', 'Consistent colors', 'Appropriate scale', 'Data labels when needed'],
        commonMistakes: ['3D effects', 'Too many categories', 'Inconsistent scales']
      },
      line: {
        title: 'Line Chart Guide',
        description: 'Show trends over time or continuous relationships',
        bestFor: ['Time series data', 'Showing trends', 'Continuous relationships'],
        elements: ['Clear time axis', 'Appropriate markers', 'Legend for multiple lines', 'Smooth curves'],
        commonMistakes: ['Too many lines', 'Inappropriate interpolation', 'Missing data points']
      },
      scatter: {
        title: 'Scatter Plot Guide',
        description: 'Show relationships between two continuous variables',
        bestFor: ['Correlation analysis', 'Regression relationships', 'Outlier detection'],
        elements: ['Clear axis labels', 'Trend line when appropriate', 'Point markers', 'Correlation coefficient'],
        commonMistakes: ['Overplotting', 'Missing scales', 'Inappropriate trend lines']
      },
      pie: {
        title: 'Pie Chart Guide',
        description: 'Show parts of a whole (limited use cases)',
        bestFor: ['Showing proportions', 'Market share', 'Simple part-to-whole relationships'],
        elements: ['Limited to 5-7 slices', 'Sorted by size', 'Percentage labels', 'Clear legend'],
        commonMistakes: ['Too many slices', '3D effects', 'Not sorted by size']
      },
      histogram: {
        title: 'Histogram Guide',
        description: 'Show distribution of continuous data',
        bestFor: ['Frequency distributions', 'Data shape analysis', 'Outlier identification'],
        elements: ['Appropriate bin size', 'Clear axis labels', 'Normal curve overlay', 'Summary statistics'],
        commonMistakes: ['Wrong bin size', 'Not showing frequency', 'Missing distribution info']
      },
      boxplot: {
        title: 'Box Plot Guide',
        description: 'Show distribution statistics and outliers',
        bestFor: ['Comparing distributions', 'Identifying outliers', 'Showing spread and center'],
        elements: ['Median line', 'Quartile boxes', 'Whiskers', 'Outlier points', 'Clear labels'],
        commonMistakes: ['No explanation', 'Too many groups', 'Missing statistical context']
      }
    };

    const visualization = visualizationTypes[chartType as keyof typeof visualizationTypes];
    if (!visualization) {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Visualization guide not found' }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(visualization, null, 2)
      }]
    };
  }

  private handleResearchPrompts(url: URL): any {
    const promptType = url.pathname.split('/')[2];

    const researchPrompts = {
      'literature-review': {
        title: 'Literature Review Prompts',
        prompts: [
          {
            name: 'Initial Research Question',
            prompt: 'What is the main research question or problem this literature review addresses? What are the key concepts and variables involved?',
            purpose: 'Define the scope and focus of your review'
          },
          {
            name: 'Search Strategy',
            prompt: 'What databases and search terms will you use? How will you ensure comprehensive coverage while avoiding irrelevant results?',
            purpose: 'Develop systematic search methodology'
          },
          {
            name: 'Inclusion Criteria',
            prompt: 'What criteria will you use to include or exclude studies? Consider date ranges, study types, quality thresholds, and relevance.',
            purpose: 'Establish clear boundaries for your review'
          },
          {
            name: 'Critical Analysis',
            prompt: 'For each study, analyze: methodology quality, sample characteristics, findings reliability, and potential biases. How do the studies compare?',
            purpose: 'Evaluate the quality and validity of research'
          },
          {
            name: 'Synthesis Framework',
            prompt: 'How will you organize and synthesize the findings? What themes, patterns, or contradictions emerge across studies?',
            purpose: 'Structure the analysis and interpretation'
          },
          {
            name: 'Research Gaps',
            prompt: 'What important questions remain unanswered? Where are the methodological weaknesses or contradictory findings?',
            purpose: 'Identify future research directions'
          }
        ]
      },
      'paper-analysis': {
        title: 'Academic Paper Analysis Prompts',
        prompts: [
          {
            name: 'Abstract Analysis',
            prompt: 'Does the abstract clearly state the research problem, methods, key findings, and implications? How well does it represent the full paper?',
            purpose: 'Evaluate the abstract\'s completeness and accuracy'
          },
          {
            name: 'Introduction Assessment',
            prompt: 'How effectively does the introduction establish the research importance, review relevant literature, and state clear objectives?',
            purpose: 'Assess the foundation and rationale'
          },
          {
            name: 'Methodology Critique',
            prompt: 'Are the methods clearly described and appropriate for the research question? Could the study be replicated based on the description?',
            purpose: 'Evaluate research design and execution'
          },
          {
            name: 'Results Interpretation',
            prompt: 'Do the results directly address the research questions? Are appropriate statistical analyses used and clearly reported?',
            purpose: 'Assess findings and their presentation'
          },
          {
            name: 'Discussion Quality',
            prompt: 'How well does the discussion interpret results, relate to existing literature, acknowledge limitations, and suggest future directions?',
            purpose: 'Evaluate interpretation and implications'
          },
          {
            name: 'Contribution Assessment',
            prompt: 'What is the paper\'s unique contribution to the field? How does it advance knowledge or practice?',
            purpose: 'Determine the paper\'s significance and impact'
          }
        ]
      },
      'methodology-selection': {
        title: 'Research Methodology Selection Guide',
        prompts: [
          {
            name: 'Research Question Analysis',
            prompt: 'What type of research question are you asking? (exploratory, descriptive, explanatory, evaluative) This will guide your methodological approach.',
            purpose: 'Match methodology to research purpose'
          },
          {
            name: 'Data Type Consideration',
            prompt: 'What type of data do you need to answer your question? (quantitative, qualitative, or mixed methods)',
            purpose: 'Determine data collection requirements'
          },
          {
            name: 'Sample and Access',
            prompt: 'What population do you need to study, and how accessible are they? Consider sample size requirements and recruitment feasibility.',
            purpose: 'Assess practical constraints and requirements'
          },
          {
            name: 'Resource Evaluation',
            prompt: 'What resources do you have available? (time, budget, expertise, equipment) How do these constrain your methodological choices?',
            purpose: 'Ensure methodological choices are feasible'
          },
          {
            name: 'Quality and Rigor',
            prompt: 'How will you ensure your chosen methodology produces valid, reliable, and trustworthy results? What quality criteria apply?',
            purpose: 'Evaluate methodological appropriateness and rigor'
          },
          {
            name: 'Ethical Considerations',
            prompt: 'What ethical issues does your chosen methodology raise? How will you address participant rights, confidentiality, and potential harm?',
            purpose: 'Ensure ethical research practices'
          }
        ]
      }
    };

    const promptSet = researchPrompts[promptType as keyof typeof researchPrompts];
    if (!promptSet) {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Research prompt set not found' }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(promptSet, null, 2)
      }]
    };
  }

  private handleWritingPrompts(url: URL): any {
    const promptType = url.pathname.split('/')[2];

    if (promptType === 'academic-outline') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Academic Writing Outline Prompts',
            prompts: [
              {
                name: 'Thesis Development',
                prompt: 'What is your main argument or thesis? How does it answer your research question? Can you state it clearly in one sentence?',
                purpose: 'Establish the central argument'
              },
              {
                name: 'Structure Planning',
                prompt: 'What is the logical flow of your argument? How will each section build on the previous one to support your thesis?',
                purpose: 'Create coherent organization'
              },
              {
                name: 'Evidence Mapping',
                prompt: 'What evidence supports each point? How strong is the evidence? Are there counterarguments you need to address?',
                purpose: 'Ensure comprehensive support'
              },
              {
                name: 'Introduction Crafting',
                prompt: 'How will you hook the reader, provide necessary background, and state your thesis? What context is essential?',
                purpose: 'Create engaging and informative opening'
              },
              {
                name: 'Body Development',
                prompt: 'For each main point, what specific evidence, examples, or analysis will you provide? How does each section advance your argument?',
                purpose: 'Develop detailed supporting content'
              },
              {
                name: 'Conclusion Planning',
                prompt: 'How will you restate your thesis, summarize key points, and provide a strong closing? What broader implications should you discuss?',
                purpose: 'Create impactful ending'
              },
              {
                name: 'Transitions and Flow',
                prompt: 'How will you connect ideas between sentences, paragraphs, and sections? What transition words or phrases will you use?',
                purpose: 'Ensure smooth readability'
              }
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Writing prompt set not found' }, null, 2)
      }]
    };
  }

  private handleAnalysisPrompts(url: URL): any {
    const promptType = url.pathname.split('/')[2];

    if (promptType === 'data-interpretation') {
      return {
        contents: [{
          uri: url.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            title: 'Data Interpretation Prompts',
            prompts: [
              {
                name: 'Results Overview',
                prompt: 'What are the main patterns or findings in your data? What stands out as most important or surprising?',
                purpose: 'Identify key findings'
              },
              {
                name: 'Statistical Significance',
                prompt: 'Which results are statistically significant? What do p-values and confidence intervals tell you about your findings?',
                purpose: 'Assess result reliability'
              },
              {
                name: 'Effect Size Evaluation',
                prompt: 'How large are the effects you observed? Are they practically meaningful, not just statistically significant?',
                purpose: 'Determine practical importance'
              },
              {
                name: 'Data Quality Assessment',
                prompt: 'How confident are you in your data quality? What limitations or potential biases might affect interpretation?',
                purpose: 'Evaluate data trustworthiness'
              },
              {
                name: 'Alternative Explanations',
                prompt: 'What other explanations might account for your findings? How can you rule out alternative hypotheses?',
                purpose: 'Consider competing interpretations'
              },
              {
                name: 'Implications Analysis',
                prompt: 'What do these findings mean for theory, practice, or future research? Who benefits from this knowledge?',
                purpose: 'Connect findings to broader context'
              },
              {
                name: 'Limitations Discussion',
                prompt: 'What are the weaknesses of your study? How might they affect the interpretation of your results?',
                purpose: 'Acknowledge study constraints'
              },
              {
                name: 'Recommendations Development',
                prompt: 'Based on your findings, what actions or further research would you recommend?',
                purpose: 'Provide actionable guidance'
              }
            ]
          }, null, 2)
        }]
      };
    }

    return {
      contents: [{
        uri: url.toString(),
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Analysis prompt set not found' }, null, 2)
      }]
    };
  }

  private generateLiteratureReviewPlanningPrompt(args: Record<string, any>): string {
    const topic = args.research_topic || 'research topic';
    const scope = args.review_scope || 'comprehensive';
    const timePeriod = args.time_period || 'recent literature';

    return `# Literature Review Planning for "${topic}"

## Overview
Conduct a ${scope} literature review covering ${timePeriod} on "${topic}".

## Planning Framework:

### 1. Research Scope Definition
- **Topic Boundaries**: Clearly define what aspects of "${topic}" to include/exclude
- **Geographic Scope**: Any geographic limitations or global coverage?
- **Time Frame**: Publications from [start date] to [end date]
- **Language Restrictions**: English only, or multilingual?

### 2. Research Questions
Develop 3-5 specific research questions your review should answer:
- What is currently known about [specific aspect]?
- What are the major debates or controversies in [topic area]?
- What methodological approaches have been most effective?
- What gaps exist in current research?

### 3. Search Strategy Development
**Database Selection**: PubMed, Web of Science, Scopus, Google Scholar, JSTOR
**Search Terms**: Develop comprehensive keyword lists including synonyms and variations
**Boolean Logic**: Use AND, OR, NOT operators strategically
**Inclusion/Exclusion Criteria**: Define clear criteria for article selection

### 4. Quality Assessment Framework
**Study Quality Criteria**:
- Research design appropriateness
- Sample size and representativeness
- Methodology rigor
- Results validity and reliability
- Theoretical grounding

**Quality Assessment Tools**: Use standardized checklists appropriate to your field

### 5. Data Extraction Plan
**Data to Extract**:
- Study characteristics (design, sample, methods)
- Key findings and results
- Theoretical frameworks used
- Limitations and biases identified
- Future research suggestions

**Extraction Tools**: Develop standardized forms or use software like Covidence, Rayyan

### 6. Synthesis Strategy
**Synthesis Approach**: Narrative synthesis, thematic analysis, meta-analysis
**Thematic Framework**: Develop coding scheme for identifying patterns
**Integration Methods**: How to integrate findings across studies
**Heterogeneity Assessment**: How to handle conflicting findings

### 7. Timeline and Milestones
- Week 1-2: Protocol development and registration
- Week 3-6: Literature search and screening
- Week 7-10: Data extraction and quality assessment
- Week 11-14: Data synthesis and analysis
- Week 15-16: Report writing and dissemination

### 8. Risk Management
**Potential Biases**: Publication bias, selection bias, language bias
**Quality Control**: Double screening, independent data extraction
**Contingency Plans**: What if search yields too few/many results?

### 9. Reporting Standards
Follow PRISMA guidelines for systematic reviews or appropriate reporting standards for your review type.

## Next Steps
1. Register your review protocol (if systematic review)
2. Begin comprehensive literature search
3. Set up data management systems
4. Train team members on screening and extraction procedures

Execute this plan systematically to ensure a comprehensive and rigorous literature review!`;
  }

  private generateResearchQuestionDevelopmentPrompt(args: Record<string, any>): string {
    const topic = args.topic_area || 'research area';
    const researchType = args.research_type || 'exploratory';
    const perspective = args.stakeholder_perspective || 'researcher';

    return `# Research Question Development for "${topic}"

## Overview
Develop clear, focused research questions from a ${perspective} perspective using a ${researchType} approach.

## Question Development Framework:

### Step 1: Topic Analysis
**Core Concepts**: What are the fundamental concepts in "${topic}"?
**Key Relationships**: What relationships exist between these concepts?
**Current Gaps**: What is not well understood or needs further investigation?

### Step 2: Stakeholder Perspective Integration
**${perspective} Needs**: What specific information or insights does the ${perspective} community need?
**Practical Constraints**: What are the real-world constraints ${perspective}s face?
**Decision-Making Context**: How will research findings be used in practice?

### Step 3: FINER Criteria Assessment
**Feasible**: Can this question be answered with available resources?
**Interesting**: Will answers advance knowledge or practice?
**Novel**: Does this address new territory or replicate unnecessarily?
**Ethical**: Can this research be conducted ethically?
**Relevant**: Does this matter to stakeholders and the field?

### Step 4: Question Refinement Process
**Broad to Narrow**: Start with general questions, refine to specific ones
**Test Clarity**: Can others understand and explain your questions?
**Test Answerability**: Can these questions realistically be answered?
**Stakeholder Validation**: Do questions resonate with intended users?

### Step 5: Question Types by Research Approach

#### For ${researchType} Research:
**Exploratory Questions**: "What is happening?", "How does this work?", "What patterns exist?"
**Descriptive Questions**: "What are the characteristics?", "How much/few/frequent?"
**Explanatory Questions**: "Why does this happen?", "What causes what?", "How does X affect Y?"
**Evaluative Questions**: "How well does this work?", "What is the impact?", "Is this effective?"

### Step 6: Question Hierarchy Development
**Primary Question**: The main question your research seeks to answer
**Secondary Questions**: Supporting questions that address sub-components
**Sub-questions**: Specific, focused questions that can be empirically addressed

### Step 7: Operational Definitions
**Key Concepts**: Define how you will measure or identify each concept
**Variables**: Specify how variables will be operationalized
**Boundaries**: Define the scope and limits of your investigation

### Step 8: Research Design Alignment
**Methodology Match**: Does your question align with feasible research methods?
**Data Requirements**: What data do you need to answer each question?
**Analysis Approach**: What analytical strategies will address your questions?

### Step 9: Stakeholder Feedback Integration
**Expert Review**: Have experts in the field reviewed your questions?
**User Testing**: Have potential users provided input on question relevance?
**Iterative Refinement**: How have questions evolved based on feedback?

### Step 10: Final Question Validation
**Clarity Check**: Are questions unambiguous and precise?
**Scope Appropriateness**: Are questions neither too broad nor too narrow?
**Answerability Confirmation**: Can questions be definitively answered?
**Impact Potential**: Will answers provide meaningful insights?

## Research Question Templates:

### Phenomenon Investigation
"What is the lived experience of [phenomenon] from the perspective of [participants]?"

### Process Exploration
"What are the key stages/phases in [process] and what factors influence each stage?"

### Comparison Analysis
"How do [group A] and [group B] differ in terms of [outcome/behavior/characteristic]?"

### Intervention Evaluation
"What is the impact of [intervention] on [outcome] for [population]?"

### Experience Understanding
"What is the lived experience of [phenomenon] from the perspective of [participants]?"

## Quality Assurance Checklist:
- [ ] Questions are clear and unambiguous
- [ ] Questions are answerable with available methods
- [ ] Questions align with stakeholder needs
- [ ] Questions are novel and contribute to knowledge
- [ ] Questions are ethically sound
- [ ] Questions are feasible within constraints

Develop focused, impactful research questions that will drive meaningful inquiry!`;
  }

  private generateAcademicPaperOutlinePrompt(args: Record<string, any>): string {
    const title = args.paper_title || 'Academic Paper';
    const paperType = args.paper_type || 'research';
    const journal = args.target_journal || 'academic journal';
    const wordCount = args.word_count_target || '5000-8000';

    return `# Academic Paper Outline for "${title}"

## Paper Specifications
- **Title**: ${title}
- **Type**: ${paperType} paper
- **Target Venue**: ${journal}
- **Word Count Target**: ${wordCount} words

## Complete Paper Structure:

### 1. Title Page
**Purpose**: Professional presentation and key information
**Content**:
- Paper title (concise, informative, engaging)
- Author names and affiliations
- Corresponding author contact information
- Running head (abbreviated title, <50 characters)
- Word count, page count
- Date of submission

**Word Count**: N/A
**Tips**: Title should be specific, avoid abbreviations, use keywords for discoverability

### 2. Abstract (${paperType === 'empirical' ? '150-250' : '100-150'} words)
**Purpose**: Standalone summary of entire paper
**Structure**:
- Background/Problem statement (1-2 sentences)
- Research objectives/questions/hypotheses
- Methods (brief description)
- Key findings/results
- Conclusions and implications

**Essential Elements**:
- Purpose of the research
- Key methods used
- Main findings
- Principal conclusions
- Theoretical/practical implications

### 3. Keywords (4-6 keywords)
**Purpose**: Improve discoverability and indexing
**Selection Criteria**:
- Reflect core content and methods
- Include established terms in your field
- Mix broad and specific terms
- Avoid overused or meaningless terms

### 4. Introduction (10-15% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.15)}-words)
**Purpose**: Establish importance and context
**Structure**:
- **Hook**: Engage reader with compelling opening
- **Background**: Provide necessary context and literature overview
- **Problem Statement**: Clearly articulate the research problem/gap
- **Research Objectives/Questions/Hypotheses**: State what you aim to achieve
- **Significance**: Explain why this matters
- **Overview**: Briefly outline paper structure

**Key Elements**:
- Broad to specific progression
- Clear articulation of research gap
- Theoretical and practical significance
- Smooth transition to literature review

### 5. Literature Review (20-25% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.225)}-words)
**Purpose**: Synthesize existing knowledge and position your work
**Structure**:
- **Historical Context**: How the field has evolved
- **Key Theories/Models**: Major theoretical frameworks
- **Empirical Evidence**: Summary of key studies and findings
- **Debates and Controversies**: Areas of disagreement or uncertainty
- **Research Gaps**: What remains unanswered
- **Theoretical Framework**: Your conceptual approach

**Best Practices**:
- Thematic organization (not chronological)
- Critical analysis, not just summary
- Clear connections between studies
- Balanced representation of perspectives

### 6. Methodology (15-20% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)}-words)
**Purpose**: Enable replication and assess validity
**Structure**:
- **Research Design**: Overall approach and rationale
- **Participants/Sample**: Recruitment, characteristics, size
- **Materials/Measures**: Instruments, tools, protocols
- **Procedure**: Step-by-step data collection process
- **Data Analysis**: Methods and software used
- **Quality Assurance**: Validity, reliability, ethical considerations

**Reporting Standards**:
- Sufficient detail for replication
- Clear justification for choices
- Transparent limitations acknowledgment

### 7. Results (15-20% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)}-words)
**Purpose**: Present findings objectively and clearly
**Structure**:
- **Descriptive Statistics**: Sample characteristics, demographics
- **Inferential Statistics**: Hypothesis testing results
- **Data Visualization**: Tables, figures, charts
- **Unexpected Findings**: Any surprising results

**Presentation Guidelines**:
- Logical flow matching research questions
- Clear labeling of all tables/figures
- Statistical notation consistency
- Effect sizes and confidence intervals
- No interpretation (save for Discussion)

### 8. Discussion (15-20% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)}-words)
**Purpose**: Interpret results and contribute to knowledge
**Structure**:
- **Summary of Findings**: Restate key results
- **Interpretation**: What findings mean in context
- **Theoretical Contributions**: How findings advance theory
- **Practical Implications**: Real-world applications
- **Limitations**: Study constraints and potential biases
- **Future Research**: Directions for further investigation

**Key Elements**:
- Connect back to literature and research questions
- Balance strengths and weaknesses
- Suggest actionable next steps

### 9. Conclusion (5-10% of paper, ~${Math.round(parseInt(wordCount.split('-')[1]) * 0.075)}-words)
**Purpose**: Provide closure and final impact statement
**Content**:
- Restate main findings and contributions
- Emphasize broader significance
- Final thoughts on implications
- Strong, memorable closing statement

### 10. References
**Purpose**: Give credit and enable verification
**Formatting**:
- Complete and accurate citations
- Consistent style (${journal.includes('APA') ? 'APA' : journal.includes('MLA') ? 'MLA' : 'Chicago/IEEE'} format)
- All cited works included
- No uncited works included

### 11. Appendices (as needed)
**Purpose**: Supplementary material that supports main content
**Content Types**:
- Detailed protocols
- Additional data tables
- Survey instruments
- Interview transcripts
- Raw data sets

## Writing Quality Checklist:
- [ ] Clear, concise, academic tone
- [ ] Logical flow between sections
- [ ] Consistent terminology and formatting
- [ ] Strong topic sentences in each paragraph
- [ ] Effective transitions between ideas
- [ ] Active voice where appropriate
- [ ] Parallel structure in lists
- [ ] Appropriate citation density

## Content Quality Checklist:
- [ ] Addresses research gap identified in introduction
- [ ] Methods enable research questions to be answered
- [ ] Results directly respond to research questions
- [ ] Discussion provides meaningful interpretation
- [ ] Contributions are clearly articulated
- [ ] Limitations are honestly acknowledged

## Word Count Distribution:
- Introduction: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.125)} words
- Literature Review: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.225)} words
- Methodology: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)} words
- Results: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)} words
- Discussion: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.175)} words
- Conclusion: ${Math.round(parseInt(wordCount.split('-')[1]) * 0.075)} words
- Abstract: ${paperType === 'empirical' ? '200' : '125'} words

Follow this structure to create a well-organized, compelling academic paper that effectively communicates your research contributions!`;
  }

  private generateDataAnalysisPlanningPrompt(args: Record<string, any>): string {
    const dataType = args.data_type || 'quantitative';
    const design = args.research_design || 'survey';
    const sampleSize = args.sample_size || 'unknown';
    const variables = args.key_variables ? args.key_variables.split(',').map((v: string) => v.trim()) : [];

    return `# Data Analysis Planning for ${dataType} Research

## Research Context
- **Data Type**: ${dataType}
- **Research Design**: ${design}
- **Sample Size**: ${sampleSize}
- **Key Variables**: ${variables.length > 0 ? variables.join(', ') : 'To be determined'}

## Comprehensive Data Analysis Planning Framework:

### Phase 1: Data Preparation and Cleaning

#### 1.1 Data Understanding
**Dataset Assessment**:
- Review data collection procedures and protocols
- Understand variable definitions and measurement scales
- Identify data structure and relationships
- Assess data completeness and quality indicators

**Data Quality Checks**:
- Missing value patterns and mechanisms
- Outlier identification and treatment strategies
- Data entry error detection and correction
- Consistency checks across related variables

#### 1.2 Data Cleaning Strategy
**Cleaning Protocols**:
- Develop systematic missing data handling approach
- Establish outlier treatment guidelines
- Create data transformation procedures
- Implement data validation rules

**Documentation Requirements**:
- Maintain detailed cleaning log
- Record all data modifications
- Preserve original data integrity
- Document assumptions and decisions

### Phase 2: Exploratory Data Analysis (EDA)

#### 2.1 Univariate Analysis
**Variable-by-Variable Assessment**:
- Distribution shape and characteristics
- Central tendency and dispersion measures
- Normality testing and transformation needs
- Categorical variable frequency distributions

**Visualization Planning**:
- Histograms for continuous variables
- Bar charts for categorical variables
- Box plots for distribution and outlier detection
- Q-Q plots for normality assessment

#### 2.2 Bivariate Analysis
**Relationship Exploration**:
- Correlation analysis for continuous variables
- Cross-tabulation for categorical variables
- Scatter plots for relationship visualization
- Group comparisons for key variables

**Pattern Identification**:
- Expected vs. observed relationships
- Interaction effect detection
- Non-linear relationship identification
- Subgroup pattern recognition

### Phase 3: Statistical Analysis Planning

#### 3.1 Analysis Framework Development
**Research Question Alignment**:
- Map each research question to appropriate analysis
- Identify primary vs. secondary analyses
- Determine confirmatory vs. exploratory approaches
- Plan sensitivity and robustness checks

**Analysis Hierarchy**:
- Descriptive statistics (all variables)
- Bivariate relationships (key associations)
- Multivariate analysis (complex relationships)
- Subgroup and moderation analysis

#### 3.2 ${dataType === 'quantitative' ? 'Quantitative' : 'Qualitative'} Analysis Methods

**${dataType === 'quantitative' ? 'Statistical Tests Selection' : 'Qualitative Analysis Methods'}**:
${dataType === 'quantitative' ?
`- **Descriptive**: Mean, median, mode, standard deviation, frequency distributions
- **Comparative**: t-tests, ANOVA, chi-square tests, non-parametric equivalents
- **Relational**: Correlation, regression, factor analysis, structural equation modeling
- **Advanced**: Multi-level modeling, time series analysis, survival analysis` :

`- **Thematic Analysis**: Code development, theme identification, pattern recognition
- **Content Analysis**: Categorization, frequency analysis, manifest/latent content
- **Discourse Analysis**: Language patterns, narrative structures, power dynamics
- **Grounded Theory**: Constant comparison, iterative analysis, conceptual frameworks`}

**Software Selection**:
${dataType === 'quantitative' ?
`- **Primary**: R, SPSS, SAS, Stata, Python (pandas, statsmodels, scikit-learn)
- **Visualization**: ggplot2, matplotlib, seaborn, Tableau
- **Specialized**: Mplus (SEM), HLM (multilevel), AMOS (path analysis)` :

`- **Primary**: NVivo, Atlas.ti, MAXQDA, Dedoose
- **Text Analysis**: Linguistic Inquiry and Word Count (LIWC), Voyant Tools
- **Mixed Methods**: QDA Miner, Qualtrics, integration platforms`}

### Phase 4: Analytical Rigor and Quality Assurance

#### 4.1 Statistical Assumptions Testing
**Key Assumptions to Verify**:
- Normality of distributions (Shapiro-Wilk, Kolmogorov-Smirnov)
- Homoscedasticity (Levene's test, visual inspection)
- Linearity of relationships (scatter plots, residual analysis)
- Independence of observations (Durbin-Watson, autocorrelation checks)

**Robustness Checks**:
- Alternative analysis methods comparison
- Sensitivity analysis with different assumptions
- Cross-validation techniques
- Bootstrap or resampling methods

#### 4.2 Power Analysis and Sample Considerations
**Power Calculations**:
- Effect size estimation from literature
- Required sample size determination
- Power analysis for primary outcomes
- Subgroup analysis power considerations

**Sample Adequacy Assessment**:
- Statistical power evaluation
- Precision of estimates needed
- Generalizability considerations
- Missing data impact analysis

### Phase 5: Results Interpretation Framework

#### 5.1 Effect Size and Practical Significance
**Interpretation Guidelines**:
- Cohen's d: 0.2 (small), 0.5 (medium), 0.8 (large)
- R-squared: 0.02 (small), 0.13 (medium), 0.26 (large)
- Odds ratios: 1.5-2.5 (moderate), >2.5 (strong)
- Clinical/practical significance assessment

**Contextual Interpretation**:
- Field-specific effect size conventions
- Stakeholder significance thresholds
- Policy and practice implications
- Cost-benefit considerations

#### 5.2 Statistical vs. Practical Significance
**Dual Assessment Framework**:
- Statistical significance (p-values, confidence intervals)
- Practical significance (effect sizes, meaningful differences)
- Clinical significance (minimal important differences)
- Economic significance (cost-effectiveness ratios)

**Integration Strategies**:
- Effect size confidence intervals
- Number needed to treat (NNT)
- Cost-effectiveness ratios
- Quality-adjusted life years (QALYs)
- Stakeholder value assessment

### Phase 6: Reporting and Visualization Strategy

#### 6.1 Results Presentation Planning
**Table and Figure Guidelines**:
- Clear, informative titles and labels
- Appropriate precision and rounding
- Consistent formatting and style
- Comprehensive but concise information

**Narrative Structure**:
- Logical flow matching research questions
- Integration of statistical and narrative elements
- Clear interpretation of complex findings
- Balanced presentation of positive and negative results

#### 6.2 Data Visualization Best Practices
**Chart Selection Framework**:
- Bar charts: Categorical comparisons
- Line graphs: Trends and changes over time
- Scatter plots: Relationships between variables
- Box plots: Distribution comparisons
- Heat maps: Complex relationship matrices

**Visualization Principles**:
- Clarity and readability
- Appropriate color schemes
- Consistent scaling and axes
- Accessibility considerations
- Professional appearance standards

### Phase 7: Advanced Analysis Techniques

#### 7.1 Multivariate and Complex Analysis
**Advanced Methods Consideration**:
- Multiple regression and mediation analysis
- Factor analysis and dimensionality reduction
- Cluster analysis and classification methods
- Time series and longitudinal analysis
- Network analysis and complex relationships

**Method Selection Criteria**:
- Research question alignment
- Data characteristics and assumptions
- Sample size adequacy
- Expertise and resource availability
- Interpretability and communication needs

### Phase 8: Reproducibility and Documentation

#### 8.1 Analysis Documentation
**Code and Process Documentation**:
- Detailed analysis scripts with comments
- Data processing and cleaning documentation
- Statistical model specifications
- Software version and package information

**Decision Documentation**:
- Rationale for analysis method selection
- Assumption testing results and handling
- Alternative analysis considerations
- Sensitivity analysis procedures

#### 8.2 Reproducibility Planning
**Data Sharing Strategy**:
- De-identified data preparation
- Metadata and codebook development
- Repository selection and deposition
- Access and usage license determination

**Replication Package**:
- Complete analysis scripts
- Synthetic data examples
- Computational environment specifications
- Step-by-step reproduction instructions

## Implementation Timeline:

### Week 1-2: Planning and Preparation
- [ ] Data cleaning and preparation protocols
- [ ] Analysis plan development and documentation
- [ ] Software and tool setup
- [ ] Team training and calibration

### Week 3-4: Exploratory Analysis
- [ ] Initial data exploration and visualization
- [ ] Descriptive statistics and basic relationships
- [ ] Data quality assessment and cleaning
- [ ] Preliminary pattern identification

### Week 5-6: Primary Analysis
- [ ] Core statistical analysis execution
- [ ] Assumption testing and validation
- [ ] Sensitivity and robustness checks
- [ ] Preliminary results interpretation

### Week 7-8: Advanced Analysis and Validation
- [ ] Multivariate and complex analysis
- [ ] Subgroup and moderation analysis
- [ ] Model validation and diagnostics
- [ ] Results synthesis and integration

### Week 9-10: Reporting and Dissemination
- [ ] Results visualization and presentation
- [ ] Report writing and documentation
- [ ] Peer review and validation
- [ ] Dissemination planning

## Quality Assurance Checklist:

### Analytical Rigor:
- [ ] Analysis plan matches research questions
- [ ] Statistical assumptions verified and met
- [ ] Appropriate sample size for planned analyses
- [ ] Data quality and integrity maintained
- [ ] Multiple testing issues addressed

### Methodological Soundness:
- [ ] Analysis methods are theoretically justified
- [ ] Alternative explanations considered
- [ ] Limitations clearly identified and discussed
- [ ] Sensitivity analyses conducted
- [ ] Results replicated across different approaches

### Reporting Excellence:
- [ ] Results clearly and completely reported
- [ ] Effect sizes and confidence intervals included
- [ ] Visualizations are clear and informative
- [ ] Statistical notation is correct and consistent
- [ ] Methods allow for replication

### Documentation Quality:
- [ ] Analysis code is well-documented and commented
- [ ] Data processing steps are clearly explained
- [ ] Assumptions and limitations are documented
- [ ] Decision-making rationale is recorded

Develop a rigorous, well-documented data analysis plan that maximizes the validity, reliability, and impact of your research findings!`;
  }

  private generateMethodologySelectionPrompt(args: Record<string, any>): string {
    const questions = args.research_questions || 'research questions';
    const resources = args.available_resources || 'available resources';
    const dataType = args.data_type_needed || 'appropriate data type';

    return `# Methodology Selection Guide

## Research Context
**Research Questions**: ${questions}
**Available Resources**: ${resources}
**Data Type Needed**: ${dataType}

## Methodology Selection Framework:

### 1. Research Paradigm Alignment
**Positivism**: Objective reality, quantitative methods, hypothesis testing
**Interpretivism**: Subjective meanings, qualitative methods, understanding contexts
**Critical Theory**: Power dynamics, emancipation, transformative research
**Pragmatism**: Practical consequences, mixed methods, problem-solving focus

### 2. Research Design Options

#### Quantitative Designs:
- **Experimental**: Random assignment, control groups, causal inference
- **Quasi-experimental**: Natural groups, pre-post designs, comparative analysis
- **Survey Research**: Large samples, standardized questions, statistical analysis
- **Correlational**: Variable relationships, prediction models, association testing

#### Qualitative Designs:
- **Case Study**: In-depth analysis, contextual understanding, rich descriptions
- **Ethnography**: Cultural immersion, participant observation, insider perspectives
- **Phenomenology**: Lived experiences, essence identification, meaning exploration
- **Grounded Theory**: Theory development, iterative analysis, conceptual frameworks

#### Mixed Methods Designs:
- **Sequential Explanatory**: Quan → Qual, statistical → in-depth explanation
- **Sequential Exploratory**: Qual → Quan, qualitative exploration → quantitative testing
- **Concurrent Triangulation**: Parallel Quan + Qual, convergence validation
- **Concurrent Nested**: Primary + secondary methods, complementary insights

### 3. Method-Question Alignment Matrix

| Research Question Type | Suitable Methods | Rationale |
|------------------------|------------------|-----------|
| What/How much/How many | Quantitative surveys, experiments | Precise measurement, statistical inference |
| How/Why processes | Qualitative interviews, observations | Process understanding, contextual depth |
| What experiences | Phenomenology, narrative analysis | Personal meaning, lived experiences |
| What patterns/relationships | Mixed methods, case studies | Comprehensive understanding |
| What impacts/effects | Experiments, quasi-experiments | Causal inference, effect estimation |
| What experiences | Phenomenology, narrative analysis | Personal meaning, lived experiences |

### 4. Resource-Appropriate Methods

#### High Resource Contexts:
- Longitudinal studies
- Multi-site research
- Advanced statistical analysis
- Large-scale surveys
- Experimental designs

#### Medium Resource Contexts:
- Cross-sectional surveys
- Multiple case studies
- Sequential mixed methods
- Advanced qualitative analysis
- Multi-method approaches

#### Limited Resource Contexts:
- Single case studies
- Focused interviews
- Simple surveys
- Basic statistical analysis
- Concurrent mixed methods

### 5. Data Type Considerations

#### For Quantitative Data:
- **Nominal**: Frequencies, chi-square tests, logistic regression
- **Ordinal**: Medians, non-parametric tests, ordinal regression
- **Interval/Ratio**: Means, t-tests, ANOVA, correlation, regression

#### For Qualitative Data:
- **Text**: Thematic analysis, content analysis, discourse analysis
- **Audio/Visual**: Transcription, coding, interpretive analysis
- **Artifacts/Documents**: Document analysis, artifact analysis

#### For Mixed Data:
- **Convergent Parallel**: Separate analysis, side-by-side comparison
- **Explanatory Sequential**: Quan analysis first, then Qual exploration
- **Exploratory Sequential**: Qual analysis first, then Quan testing

### 6. Quality Criteria Assessment

#### Internal Validity (Quantitative):
- Adequate sample size
- Appropriate controls
- Measurement reliability
- Statistical conclusion validity

#### Credibility (Qualitative):
- Prolonged engagement
- Persistent observation
- Triangulation
- Member checking
- Peer debriefing

#### Integration Quality (Mixed):
- Design quality
- Interpretive rigor
- Inference transferability
- Integration thoroughness

### 7. Feasibility Analysis

#### Time Constraints:
- Cross-sectional vs. longitudinal designs
- Concurrent vs. sequential data collection
- Analysis complexity and time requirements

#### Budget Considerations:
- Data collection costs
- Analysis tool requirements
- Participant compensation
- Travel and equipment needs

#### Expertise Requirements:
- Team member skills assessment
- Training needs identification
- Consultant requirements
- Software proficiency needs

### 8. Ethical Considerations
**Participant Protection**: Informed consent, confidentiality, risk minimization
**Research Integrity**: Data fabrication prevention, proper attribution
**Methodological Ethics**: Appropriate sampling, unbiased analysis
**Dissemination Ethics**: Accurate reporting, balanced interpretation

### 9. Pilot Testing Strategy
**Mini-Version Testing**: Small-scale trial of methods
**Process Refinement**: Identify and resolve methodological issues
**Resource Validation**: Confirm resource requirements and timelines
**Quality Assurance**: Test data collection and analysis procedures

### 10. Contingency Planning
**Alternative Methods**: Backup approaches if primary method fails
**Resource Shortfalls**: Plans for budget/time constraints
**Data Collection Issues**: Strategies for low response rates or missing data
**Analysis Challenges**: Alternative statistical approaches

## Methodology Selection Decision Tree:

1. **Question Type** → Determines broad approach (quan/qual/mixed)
2. **Resource Availability** → Constrains feasible options
3. **Data Accessibility** → Determines practical methods
4. **Timeline Requirements** → Affects design complexity
5. **Stakeholder Preferences** → Influences method acceptability
6. **Quality Standards** → Sets minimum rigor requirements

## Final Selection Checklist:
- [ ] Methods align with research questions
- [ ] Resources support selected approach
- [ ] Timeline allows method completion
- [ ] Team has necessary expertise
- [ ] Ethics review requirements met
- [ ] Quality criteria can be satisfied
- [ ] Data analysis plan is feasible

Choose a methodology that balances scientific rigor with practical constraints while maximizing research impact!`;
  }

  private generateStatisticalTestSelectionPrompt(args: Record<string, any>): string {
    const characteristics = args.data_characteristics || 'normal distribution, continuous variables';
    const comparison = args.comparison_type || 'means';
    const groups = args.group_count || '2';
    const sampleSize = args.sample_size || '30+ per group';

    return `# Statistical Test Selection Guide

## Data Characteristics
- **Data Properties**: ${characteristics}
- **Comparison Type**: ${comparison}
- **Number of Groups**: ${groups}
- **Sample Size**: ${sampleSize}

## Statistical Test Selection Decision Tree

### For Comparing Means (Parametric Tests)
\`\`\`
Data normally distributed?
├── Yes → Homogeneity of variance?
│   ├── Yes → How many groups?
│   │   ├── 2 groups → Independent samples t-test
│   │   ├── 3+ groups → One-way ANOVA
│   │   └── With covariate → ANCOVA
│   └── No → How many groups?
│       ├── 2 groups → Welch's t-test
│       └── 3+ groups → Welch's ANOVA or robust ANOVA
└── No → How many groups?
    ├── 2 groups → Mann-Whitney U test
    └── 3+ groups → Kruskal-Wallis test
\`\`\`

### For Comparing Proportions (Categorical Tests)
\`\`\`
How many variables?
├── 1 variable → Goodness of fit test (Chi-square)
├── 2 variables → Test of independence
│   ├── 2x2 table → Fisher's exact test or Chi-square
│   └── Larger table → Chi-square test
└── 3+ variables → Log-linear analysis or multinomial tests
\`\`\`

### For Relationships (Correlation/Regression)
\`\`\`
Variables normally distributed?
├── Yes → Linear relationship?
│   ├── Yes → Pearson correlation / Linear regression
│   └── No → Consider transformation or non-parametric alternatives
└── No → Monotonic relationship?
    ├── Yes → Spearman correlation / Ordinal regression
    └── No → Consider categorization or advanced methods
\`\`\`

## Specific Test Recommendations

### Parametric Tests (Normal Data, Equal Variances)
**t-Tests**:
- **Independent Samples t-test**: Compare means of two independent groups
- **Paired Samples t-test**: Compare means of related samples (before/after)
- **One-sample t-test**: Compare sample mean to known population value

**ANOVA Family**:
- **One-way ANOVA**: Compare means across three or more groups (one factor)
- **Two-way ANOVA**: Compare means with two factors (main effects + interaction)
- **Repeated Measures ANOVA**: Compare means with repeated measurements
- **ANCOVA**: Compare means while controlling for covariates

### Non-Parametric Tests (Non-Normal Data or Ordinal)
**Location Tests**:
- **Mann-Whitney U**: Compare distributions of two independent groups
- **Wilcoxon Signed-Rank**: Compare distributions of paired samples
- **Kruskal-Wallis**: Compare distributions across three or more groups
- **Friedman Test**: Compare distributions in repeated measures designs

**Other Non-Parametric Tests**:
- **Spearman Correlation**: Assess monotonic relationships (ordinal data)
- **Kendall's Tau**: Alternative rank correlation measure
- **Chi-Square Tests**: Analyze categorical data relationships

## Test Assumptions and Validation

### Key Assumptions to Verify
**Normality**:
- Shapiro-Wilk test (< 50 observations)
- Kolmogorov-Smirnov test (> 50 observations)
- Visual inspection (histograms, Q-Q plots)
- Central Limit Theorem consideration

**Homogeneity of Variance**:
- Levene's test (most common)
- Brown-Forsythe test (robust to non-normality)
- Visual inspection of box plots
- Sample size ratio consideration

**Independence**:
- Study design verification
- Durbin-Watson test (autocorrelation in regression)
- Intraclass correlation assessment

### Assumption Violation Remedies
**Transformations**:
- Log transformation (right-skewed data)
- Square root transformation (count data)
- Arcsine transformation (proportions)

**Robust Alternatives**:
- Bootstrap methods
- Rank-based tests
- Generalized linear models
- Non-parametric approaches

## Effect Size and Practical Significance

### Effect Size Measures
**For Means (Cohen's d)**:
- Small: 0.20 (small practical importance)
- Medium: 0.50 (moderate practical importance)
- Large: 0.80 (large practical importance)

**For Proportions (Odds Ratio)**:
- Small: 1.5 (slight relationship)
- Medium: 2.5 (moderate relationship)
- Large: 4.0 (strong relationship)

**For Associations (Correlation)**:
- Small: 0.10 (weak relationship)
- Medium: 0.30 (moderate relationship)
- Large: 0.50 (strong relationship)

### Confidence Intervals
**Interpretation Framework**:
- Narrow CI: Precise estimate, high certainty
- Wide CI: Imprecise estimate, low certainty
- CI excluding zero/null value: Statistically significant
- CI including important thresholds: Practical significance assessment

## Multiple Testing Corrections

### Family-Wise Error Rate Control
**Bonferroni Correction**:
- Divide α by number of tests
- Conservative approach
- Reduces Type I error risk

**Holm-Bonferroni Method**:
- Step-down procedure
- Less conservative than Bonferroni
- Maintains power better

**False Discovery Rate (FDR)**:
- Benjamini-Hochberg procedure
- Controls expected proportion of false discoveries
- More powerful for exploratory research

## Reporting Statistical Results

### APA Format Guidelines
**t-test Results**:
- t(df) = value, p = value, d = effect size
- Example: t(48) = 2.34, p = .023, d = 0.67

**ANOVA Results**:
- F(df1, df2) = value, p = value, η² = effect size
- Example: F(2, 147) = 4.56, p = .012, η² = 0.059

**Correlation Results**:
- r(df) = value, p = value
- Example: r(48) = .34, p = .016

**Regression Results**:
- R² = value, F(df1, df2) = value, p = value
- β = coefficient, t = test statistic, p = significance

## Software Implementation and Validation

### Statistical Software Selection
**General Purpose**:
- **R**: Free, comprehensive, steep learning curve
- **SPSS**: User-friendly GUI, expensive licensing
- **SAS**: Enterprise-grade, very expensive
- **Python**: Programming required, extensive libraries

**Specialized Software**:
- **G*Power**: Power analysis and sample size
- **Mplus**: Structural equation modeling
- **HLM**: Multilevel modeling
- **NVivo**: Qualitative data analysis

### Code Validation and Documentation
**Reproducibility Requirements**:
- Version control for analysis scripts
- Seed setting for random number generation
- Package version documentation
- Code commenting and documentation

**Peer Review Preparation**:
- Clear variable naming conventions
- Step-by-step analysis documentation
- Assumption testing inclusion
- Sensitivity analysis demonstration

## Test Selection Quick Reference

| Situation | Parametric Test | Non-Parametric Alternative |
|-----------|-----------------|---------------------------|
| 2 independent groups, means | Independent t-test | Mann-Whitney U |
| 2 related groups, means | Paired t-test | Wilcoxon signed-rank |
| 3+ independent groups, means | One-way ANOVA | Kruskal-Wallis |
| 2 categorical variables | Chi-square test | Fisher's exact test |
| 2 continuous variables, relationship | Pearson correlation | Spearman correlation |
| Predict DV from IV(s) | Linear regression | Ordinal regression |

## Final Checklist

### Test Selection Validation:
- [ ] Data meets test assumptions
- [ ] Sample size is adequate
- [ ] Test matches research question
- [ ] Effect size considerations included
- [ ] Multiple testing addressed
- [ ] Power analysis conducted

### Implementation Readiness:
- [ ] Software skills verified
- [ ] Data format confirmed
- [ ] Analysis script prepared
- [ ] Results reporting plan ready
- [ ] Documentation prepared

Choose statistical tests that align with your research design, data characteristics, and analytical objectives for valid and reliable results!`;
  }

  private generateResultsInterpretationPrompt(args: Record<string, any>): string {
    const findings = args.statistical_findings || 'key statistical findings';
    const effectSize = args.effect_size || 'effect size measures';
    const confidence = args.confidence_level || '95%';
    const context = args.research_context || 'research context';

    return `# Statistical Results Interpretation Guide

## Research Context
- **Key Findings**: ${findings}
- **Effect Size Information**: ${effectSize}
- **Confidence Level**: ${confidence}
- **Research Context**: ${context}

## Comprehensive Results Interpretation Framework

### Phase 1: Results Overview and Validation

#### 1.1 Statistical Significance Assessment
**p-value Interpretation**:
- p < 0.05: Statistically significant (reject null hypothesis)
- p < 0.01: Highly statistically significant
- p < 0.001: Very highly statistically significant
- p ≥ 0.05: Not statistically significant (fail to reject null hypothesis)

**Contextual Considerations**:
- Study design and sample size impact
- Multiple testing correction effects
- Practical vs. statistical significance distinction
- Replication probability assessment

#### 1.2 Confidence Intervals Analysis
**CI Interpretation Framework**:
- Narrow CI: Precise estimate, high certainty
- Wide CI: Imprecise estimate, low certainty
- CI excluding zero/null value: Statistically significant result
- CI including important thresholds: Practical significance assessment

**Precision Indicators**:
- CI width relative to effect size
- Sample size relationship to precision
- Measurement error contributions
- Study design efficiency assessment

### Phase 2: Effect Size Evaluation

#### 2.1 Standardized Effect Sizes
**Cohen's d (Mean Differences)**:
- 0.2: Small effect (noticeable under ideal conditions)
- 0.5: Medium effect (visible to naked eye)
- 0.8: Large effect (obvious and substantial)

**Odds Ratios (Proportional Data)**:
- 1.5-2.5: Moderate evidence of association
- 2.5-4.0: Strong evidence of association
- >4.0: Very strong evidence of association

**Correlation Coefficients (r)**:
- 0.1-0.3: Small/weak relationship
- 0.3-0.5: Medium/moderate relationship
- 0.5-1.0: Large/strong relationship

#### 2.2 Practical Significance Assessment
**Real-World Impact Evaluation**:
- Clinical significance: Minimal important difference (MID)
- Educational significance: Standard deviation units
- Economic significance: Cost-benefit ratios
- Policy significance: Population-level impact

**Stakeholder Relevance**:
- Target audience benefit assessment
- Implementation feasibility evaluation
- Resource requirement consideration
- Sustainability factor analysis

### Phase 3: Statistical vs. Practical Significance

#### 3.1 Dual Significance Framework
**Statistical Significance**:
- Probability of results due to chance
- Sample size dependent
- Hypothesis testing framework
- Type I and Type II error considerations

**Practical Significance**:
- Real-world meaningfulness
- Effect size magnitude
- Stakeholder impact assessment
- Implementation cost-benefit analysis

#### 3.2 Integration Strategies
**Comprehensive Evaluation**:
- Effect size confidence intervals
- Number needed to treat (NNT)
- Cost-effectiveness ratios
- Quality-adjusted life years (QALYs)
- Stakeholder value assessment

### Phase 4: Alternative Explanations and Robustness

#### 4.1 Confounding Variables Assessment
**Potential Confounders**:
- Unmeasured third variables
- Selection bias effects
- Measurement error impacts
- Historical trend influences

**Control Strategy Evaluation**:
- Randomization adequacy
- Matching effectiveness
- Statistical control appropriateness
- Sensitivity analysis comprehensiveness

#### 4.2 Alternative Explanations
**Rival Hypotheses**:
- Different causal mechanisms
- Measurement artifact explanations
- Sampling bias considerations
- Temporal precedence issues

**Evidence Quality Assessment**:
- Consistency across studies
- Biological plausibility
- Dose-response relationships
- Experimental evidence strength

### Phase 5: Results Synthesis and Integration

#### 5.1 Within-Study Integration
**Pattern Recognition**:
- Consistency across measures
- Convergence of different methods
- Triangulation of findings
- Robustness across subgroups

**Data Transformation Effects**:
- Raw vs. transformed variable relationships
- Scale transformation impacts
- Missing data imputation effects
- Outlier treatment consequences

#### 5.2 Cross-Study Integration
**Literature Comparison**:
- Agreement with existing research
- Discrepancy explanations
- Methodological difference assessment
- Population variation considerations

**Meta-Analysis Context**:
- Effect size comparison to literature
- Heterogeneity assessment
- Publication bias evaluation
- Cumulative evidence strength

### Phase 6: Limitations and Generalizability

#### 6.1 Internal Validity Threats
**Design Limitations**:
- Randomization adequacy
- Blinding effectiveness
- Contamination prevention
- Attrition impact assessment

**Measurement Issues**:
- Instrument reliability assessment
- Validity evidence evaluation
- Inter-rater agreement analysis
- Response bias evaluation

#### 6.2 External Validity Considerations
**Population Generalizability**:
- Sample representativeness evaluation
- Demographic characteristic comparison
- Inclusion/exclusion criteria impact
- Self-selection bias assessment

**Setting Generalizability**:
- Laboratory vs. real-world transfer
- Implementation fidelity assessment
- Cultural context relevance
- Historical time appropriateness

### Phase 7: Implications and Applications

#### 7.1 Theoretical Implications
**Knowledge Advancement**:
- Theory confirmation or disconfirmation
- Conceptual framework refinement
- New relationship identification
- Boundary condition specification

**Conceptual Contributions**:
- Construct clarification
- Measurement improvement
- Theoretical integration
- Paradigm development

#### 7.2 Practical Implications
**Application Areas**:
- Clinical practice guidelines
- Educational program development
- Policy recommendation formulation
- Organizational practice improvement

**Implementation Considerations**:
- Resource requirement assessment
- Training need identification
- Monitoring strategy development
- Evaluation framework establishment

### Phase 8: Future Research Directions

#### 8.1 Research Agenda Development
**Knowledge Gap Identification**:
- Unanswered question specification
- Methodological limitation addressing
- Population extension opportunities
- Context variation exploration

**Research Priority Setting**:
- Impact potential assessment
- Feasibility evaluation
- Resource availability consideration
- Timeline appropriateness

#### 8.2 Study Design Recommendations
**Methodological Improvements**:
- Enhanced measurement approaches
- Improved design controls
- Advanced analytical techniques
- Longitudinal extension possibilities

**Replication and Extension**:
- Direct replication opportunities
- Conceptual replication designs
- Extension to new populations
- Application to new contexts

### Phase 9: Communication Strategy

#### 9.1 Audience-Specific Messaging
**Academic Audience**:
- Statistical detail emphasis
- Methodological rigor highlighting
- Theoretical contribution articulation
- Peer review context consideration

**Practitioner Audience**:
- Practical implication focus
- Implementation guidance provision
- Resource requirement clarification
- Outcome expectation setting

**Policy Audience**:
- Population-level impact quantification
- Cost-effectiveness demonstration
- Implementation feasibility assessment
- Political acceptability consideration

#### 9.2 Visual Communication
**Data Visualization Best Practices**:
- Clear, informative graphics
- Appropriate scale selection
- Error bar inclusion
- Uncertainty representation
- Accessibility consideration

**Presentation Optimization**:
- Key finding prioritization
- Logical flow maintenance
- Statistical complexity balancing
- Actionable recommendation emphasis

### Phase 10: Peer Review Preparation

#### 10.1 Anticipated Questions
**Methodological Challenges**:
- Design limitation responses
- Alternative explanation addressing
- Assumption violation handling
- Generalizability concern responses

**Interpretation Disputes**:
- Effect size magnitude justification
- Practical significance arguments
- Alternative interpretation responses
- Limitation acknowledgment strategies

#### 10.2 Response Preparation
**Evidence-Based Responses**:
- Additional analysis provision
- Literature comparison inclusion
- Sensitivity analysis results
- Robustness check documentation

**Professional Communication**:
- Reviewer appreciation expression
- Point-by-point response structure
- Evidence-based argument development
- Collaborative problem-solving approach

## Interpretation Quality Checklist

### Rigor and Accuracy:
- [ ] Statistical significance correctly interpreted
- [ ] Effect sizes properly contextualized
- [ ] Confidence intervals appropriately considered
- [ ] Assumptions verified and limitations acknowledged

### Practical Relevance:
- [ ] Real-world implications clearly articulated
- [ ] Stakeholder benefits identified
- [ ] Implementation feasibility assessed
- [ ] Resource requirements specified

### Theoretical Integration:
- [ ] Findings related to existing literature
- [ ] Theoretical contributions specified
- [ ] Conceptual framework implications discussed
- [ ] Future research directions proposed

### Communication Excellence:
- [ ] Results clearly and concisely presented
- [ ] Visual representations effective and appropriate
- [ ] Statistical complexity balanced with clarity
- [ ] Key messages effectively communicated

## Success Metrics for Results Interpretation

1. **Clarity**: Can non-experts understand the main findings?
2. **Accuracy**: Are interpretations statistically and theoretically sound?
3. **Relevance**: Do interpretations matter to stakeholders?
4. **Actionability**: Can findings inform decision-making and practice?
5. **Balance**: Are strengths and limitations appropriately weighted?

Develop interpretations that are statistically sound, practically relevant, and theoretically insightful to maximize your research impact!`;
  }

  private generatePeerReviewPreparationPrompt(args: Record<string, any>): string {
    const title = args.manuscript_title || 'Manuscript';
    const journal = args.target_journal || 'target journal';
    const stage = args.manuscript_stage || 'initial submission';

    return `# Peer Review Preparation for "${title}"

## Manuscript Details
- **Title**: ${title}
- **Target Journal**: ${journal}
- **Submission Stage**: ${stage}

## Comprehensive Peer Review Preparation Framework

### Phase 1: Pre-Submission Preparation

#### 1.1 Journal Fit Assessment
**Alignment Check**:
- Does your topic fit the journal's scope and focus?
- Are your methods appropriate for this journal's audience?
- Is your contribution significant for this readership?
- Does your writing style match journal conventions?

**Journal Requirements Review**:
- Manuscript length and structure requirements
- Reference style and formatting guidelines
- Figure/table specifications and limits
- Supplementary material policies
- Open access and data sharing policies

#### 1.2 Internal Review Process
**Self-Assessment Questions**:
- Is the research question clearly articulated?
- Are methods sufficiently detailed for replication?
- Do results directly address the research question?
- Are conclusions supported by the data?
- Is the theoretical contribution clear?

**Colleague Review**:
- Share with trusted colleagues for initial feedback
- Ask specific questions about clarity and logic
- Request assessment of contribution significance
- Get input on potential weaknesses

### Phase 2: Content Quality Enhancement

#### 2.1 Clarity and Structure
**Title and Abstract**:
- Is the title informative and engaging?
- Does the abstract stand alone as a complete summary?
- Are keywords comprehensive and searchable?

**Introduction**:
- Does it provide compelling rationale?
- Is the research gap clearly identified?
- Are objectives/hypotheses clearly stated?

**Literature Review**:
- Is it comprehensive but focused?
- Does it establish theoretical framework?
- Are sources current and relevant?

**Methodology**:
- Can another researcher replicate your study?
- Are sample size justifications provided?
- Are limitations acknowledged upfront?

**Results**:
- Are findings presented logically?
- Are tables/figures clear and necessary?
- Is statistical reporting complete?

**Discussion**:
- Do interpretations go beyond data description?
- Are implications clearly articulated?
- Are limitations honestly addressed?

#### 2.2 Writing Quality
**Academic Writing Standards**:
- Formal, objective tone throughout
- Precise language and terminology
- Clear sentence and paragraph structure
- Appropriate voice (active vs. passive)

**Flow and Coherence**:
- Logical progression between sections
- Clear transitions between ideas
- Consistent terminology usage
- Smooth narrative arc

### Phase 3: Technical Preparation

#### 3.1 Formatting and Compliance
**Manuscript Formatting**:
- Correct file format and naming
- Proper heading hierarchy and numbering
- Consistent font, spacing, and margins
- Correct figure and table formatting

**Reference Accuracy**:
- Complete and accurate citations
- Consistent reference style
- All cited works in reference list
- No uncited works in reference list

**Figure and Table Preparation**:
- High-resolution images (300+ DPI)
- Clear, readable fonts and labels
- Professional appearance
- Appropriate file formats

#### 3.2 Supplementary Materials
**Supporting Documentation**:
- Raw data availability statement
- Analysis code/scripts
- Survey instruments
- Interview protocols
- Detailed methods appendices

### Phase 4: Submission Strategy

#### 4.1 Journal Ranking and Targeting
**Primary Target Selection**:
- Best fit journal identification
- Realistic acceptance probability
- Impact potential maximization
- Timeline compatibility assessment

**Secondary Target Development**:
- Backup journal options
- Cascading submission strategy
- Rejection response planning
- Alternative publication formats

#### 4.2 Submission Preparation Strategy
**Manuscript Optimization**:
- Journal-specific formatting
- Keyword selection for indexing
- Abstract tailoring for audience
- Title optimization for searchability

**Supporting Material Preparation**:
- Cover letter customization
- Response to reviewer preparation
- Supplementary material organization
- Data availability statement preparation

### Phase 5: Anticipating Reviewer Feedback

#### 5.1 Common Reviewer Concerns
**Methodological Issues**:
- Sample size and power calculations
- Measurement validity and reliability
- Control of confounding variables
- Appropriate statistical analysis

**Theoretical Concerns**:
- Clear theoretical framework
- Logical argument development
- Contribution to existing literature
- Appropriate scope and focus

**Practical Issues**:
- Real-world significance
- Implementation feasibility
- Stakeholder implications
- Policy relevance

#### 5.2 Response Preparation
**Constructive Response Framework**:
- Thank reviewers for their time and insights
- Address each concern point-by-point
- Provide evidence for your position
- Acknowledge valid criticisms
- Explain changes made (or rationale for not changing)

**Revision Documentation**:
- Track all reviewer comments
- Document responses and changes
- Maintain revision history
- Prepare detailed response letter

### Phase 6: Post-Submission Activities

#### 6.1 Tracking and Communication
**Submission Monitoring**:
- Confirm receipt and registration
- Track submission status
- Note important deadlines
- Prepare for potential inquiries

**Editorial Communication**:
- Respond promptly to editor queries
- Provide additional information as requested
- Maintain professional correspondence
- Keep detailed records of all interactions

#### 6.2 Revision Management (if needed)
**Revision Planning**:
- Assess feasibility of requested changes
- Prioritize required vs. suggested revisions
- Plan timeline for completion
- Consider impact on manuscript quality

**Quality Control**:
- Re-review revised manuscript
- Check all changes are correctly implemented
- Verify no new errors introduced
- Confirm adherence to journal requirements

## Quality Assurance Checklist

### Content Quality:
- [ ] Research question is novel and significant
- [ ] Methods are rigorous and appropriate
- [ ] Results are clearly presented and analyzed
- [ ] Conclusions are supported by evidence
- [ ] Writing is clear and professional

### Technical Quality:
- [ ] Formatting meets journal requirements
- [ ] References are complete and accurate
- [ ] Figures/tables are clear and professional
- [ ] Word count within limits
- [ ] All required sections included

### Submission Readiness:
- [ ] Cover letter is compelling and professional
- [ ] All author information is correct
- [ ] Conflict of interest statement prepared
- [ ] Data availability statement included
- [ ] Funding information disclosed

## Success Maximization Strategies

1. **Target the Right Journal**: Choose based on scope, audience, and impact factor
2. **Tell a Compelling Story**: Structure manuscript as a coherent narrative
3. **Anticipate Objections**: Address potential concerns proactively
4. **Highlight Significance**: Clearly articulate your contribution
5. **Professional Presentation**: Ensure impeccable formatting and presentation

Remember: Peer review is a dialogue, not a judgment. Approach it as an opportunity to strengthen your work and contribute meaningfully to your field!`;
  }

  private generateCitationManagementPrompt(args: Record<string, any>): string {
    const style = args.citation_style || 'APA';
    const documentType = args.document_type || 'research paper';
    const referenceCount = args.reference_count || '50';

    return `# Citation Management for ${style} Style in ${documentType}

## Citation Management Overview
**Style**: ${style}
**Document Type**: ${documentType}
**Expected References**: ${referenceCount}

## Citation Management Framework

### 1. Citation Planning Strategy

#### Reference Collection Phase
**Systematic Collection**:
- Use reference management software (Zotero, Mendeley, EndNote)
- Create dedicated folders for different source types
- Tag references by topic, methodology, or key concepts
- Maintain digital copies of all sources

**Source Evaluation**:
- Assess source credibility and relevance
- Prioritize peer-reviewed, recent publications
- Balance classic foundational works with current research
- Ensure geographic and methodological diversity

#### Citation Density Planning
**Appropriate Citation Rates**:
- Literature review sections: 2-3 citations per paragraph
- Methodology sections: 1-2 citations per key decision
- Discussion sections: 3-5 citations per major point
- Introduction sections: 1 citation per 3-4 sentences

### 2. ${style} Style Implementation

#### In-Text Citation Rules
**Basic Format**: (Author, Year) or Author (Year)
**Multiple Authors**:
- 2 authors: (Author1 & Author2, Year)
- 3+ authors: (Author1 et al., Year) [first citation]
- 3+ authors: (Author1 et al., Year) [subsequent citations]

**Page Numbers**: (Author, Year, p. 42) or (Author, Year, pp. 42-45)
**Multiple Sources**: (Author1, Year1; Author2, Year2)

#### Reference List Organization
**Alphabetical Order**: By first author's last name
**Consistency**: Same style throughout document
**Completeness**: All elements required by ${style} style
**Format Verification**: Use official style guides or software

### 3. Reference Management Workflow

#### Collection and Organization
**Digital Library Setup**:
- Create subject-specific groups in reference manager
- Use consistent naming conventions
- Add keywords and abstracts to each entry
- Link to full-text PDFs when available

**Metadata Quality Control**:
- Verify author names and affiliations
- Check publication dates and journal names
- Ensure DOI or URL accuracy
- Validate page numbers and volume/issue information

#### Citation Integration
**Seamless Integration**:
- Cite to support claims, not replace argumentation
- Use signal phrases: "According to Smith (2023)..." or "Research shows..."
- Integrate citations smoothly into sentence flow
- Avoid over-reliance on single sources

### 4. Quality Assurance Process

#### Citation Accuracy
**Verification Checklist**:
- [ ] All citations appear in reference list
- [ ] All references are cited in text
- [ ] Author names spelled consistently
- [ ] Dates match between citations and references
- [ ] Page numbers accurate when included

#### Style Compliance
**${style} Style Checklist**:
- [ ] Correct in-text citation format
- [ ] Proper reference list formatting
- [ ] Consistent use of italics, capitals, punctuation
- [ ] Appropriate abbreviations and acronyms
- [ ] Correct treatment of DOIs and URLs

### 5. Advanced Citation Strategies

#### Synthesis Techniques
**Citation Synthesis**:
- Group related sources: (Smith, 2021; Johnson, 2022; Brown, 2023)
- Use integrative citations: "Multiple studies (Smith, 2021; Johnson, 2022) demonstrate..."
- Create citation chains linking related works
- Develop thematic citation groupings

#### Citation Diversity
**Balanced Citation Practices**:
- Include diverse methodological approaches
- Represent different theoretical perspectives
- Incorporate international and cross-cultural research
- Balance foundational and recent works
- Include both supporting and contrasting viewpoints

### 6. Technology and Tools Integration

#### Reference Management Software
**Recommended Tools**:
- Zotero: Free, user-friendly, excellent browser integration
- Mendeley: Good PDF annotation features, social networking
- EndNote: Powerful but expensive, institutional preference
- Paperpile: Google Docs integration, collaborative features

**Integration Strategies**:
- Use browser extensions for easy capture
- Set up automatic ${style} formatting
- Enable cloud synchronization
- Create shared libraries for team collaboration

#### Citation Software Integration
**Word Processor Plugins**:
- Microsoft Word: EndNote, Zotero, Mendeley plugins
- Google Docs: Paperpile, Zotero integration
- LaTeX: BibTeX, BibLaTeX with reference managers

### 7. Ethical Citation Practices

#### Academic Integrity
**Ethical Guidelines**:
- Cite all sources of ideas, data, and direct quotations
- Avoid plagiarism through proper paraphrasing and citation
- Maintain intellectual honesty in source representation
- Respect intellectual property rights

#### Citation Ethics
**Responsible Practices**:
- Provide accurate source information
- Avoid selective citation to support predetermined conclusions
- Maintain transparency in source evaluation
- Respect intellectual property rights

### 8. Maintenance and Updates

#### Ongoing Citation Management
**Regular Maintenance**:
- Update references as new relevant works emerge
- Verify continued accessibility of cited sources
- Check for retractions or corrections
- Maintain currency of foundational references

#### Version Control
**Citation Tracking**:
- Document citation decisions and rationales
- Track changes in citation practices
- Maintain version history of reference lists
- Archive final citation lists

## Implementation Checklist

### Setup Phase:
- [ ] Choose and set up reference management software
- [ ] Install ${style} style guide and plugins
- [ ] Create organized folder structure
- [ ] Establish citation collection workflow

### Collection Phase:
- [ ] Begin systematic reference collection
- [ ] Implement quality control checks
- [ ] Organize references by topic/theme
- [ ] Maintain digital library organization

### Integration Phase:
- [ ] Practice consistent citation formatting
- [ ] Integrate citations smoothly into writing
- [ ] Maintain appropriate citation density
- [ ] Use citations to support arguments effectively

### Quality Assurance Phase:
- [ ] Conduct thorough citation verification
- [ ] Ensure style compliance throughout
- [ ] Cross-reference citations and references
- [ ] Proofread final citation accuracy

## Success Metrics
- Zero citation errors in final manuscript
- Appropriate balance of recent and foundational works
- Clear demonstration of literature familiarity
- Seamless integration of citations into argumentation

Master citation management to strengthen your scholarly communication and academic integrity!`;
  }

  private generateEthicsReviewPreparationPrompt(args: Record<string, any>): string {
    const participantType = args.participant_type || 'human participants';
    const dataMethod = args.data_collection_method || 'survey/interview';
    const riskLevel = args.risk_level || 'minimal';
    const reviewBoard = args.institutional_review || 'IRB';

    return `# Ethics Review Preparation for ${participantType} Research

## Research Context
- **Participant Type**: ${participantType}
- **Data Collection**: ${dataMethod}
- **Risk Level**: ${riskLevel}
- **Review Board**: ${reviewBoard}

## Comprehensive Ethics Review Preparation Framework

### Phase 1: Ethical Framework Assessment

#### 1.1 Research Ethics Principles
**Core Ethical Principles**:
- **Respect for Persons**: Autonomy, protection of vulnerable individuals
- **Beneficence**: Maximize benefits, minimize harms
- **Justice**: Fair distribution of research benefits and burdens
- **Respect for Communities**: Cultural sensitivity, community engagement

**Application to Research**:
- Participant autonomy and informed consent
- Risk-benefit analysis and minimization
- Fair participant selection and inclusion
- Community consultation and engagement

#### 1.2 Regulatory Compliance Requirements
**${reviewBoard} Requirements**:
- Protocol submission and review process
- Informed consent documentation standards
- Data protection and privacy requirements
- Adverse event reporting procedures
- Continuing review and amendments process

**Additional Compliance Considerations**:
- HIPAA requirements (health information)
- FERPA requirements (educational records)
- GDPR requirements (EU data protection)
- Local institutional policies and procedures

### Phase 2: Risk Assessment and Mitigation

#### 2.1 Participant Risk Evaluation
**Physical Risks**:
- Direct physical harm from procedures
- Indirect physical effects from participation
- Long-term health consequence potential
- Emergency response capability assessment

**Psychological Risks**:
- Emotional distress or trauma induction
- Privacy violation concerns
- Stigmatization or discrimination potential
- Social relationship impact assessment

**Social/Economic Risks**:
- Employment or economic consequence potential
- Legal or immigration status risks
- Family or community relationship impacts
- Reputation or social standing effects

#### 2.2 Risk Level Determination
**Minimal Risk Research**:
- Risks not greater than daily life activities
- Routine physical/psychological examinations
- Standard survey procedures with sensitive topics
- Anonymous educational assessments

**Greater Than Minimal Risk**:
- Invasive procedures or interventions
- Sensitive personal information collection
- Deception or incomplete disclosure
- Research with vulnerable populations

**High Risk Research**:
- Significant physical or psychological harm potential
- Life-threatening procedures
- Research with highly vulnerable populations
- Research with no direct benefit to participants

### Phase 3: Informed Consent Development

#### 3.1 Consent Element Requirements
**Required Consent Elements**:
- Research purpose and procedures explanation
- Expected duration of participation
- Participant rights and responsibilities
- Potential risks and discomforts
- Potential benefits to participants and others
- Confidentiality and data handling procedures
- Contact information for questions
- Voluntary participation and withdrawal rights

**Additional Considerations**:
- Language accessibility and comprehension
- Cultural appropriateness of consent process
- Capacity assessment for vulnerable participants
- Parental/guardian consent for minors

#### 3.2 Consent Process Design
**Consent Administration Methods**:
- Written consent forms with signatures
- Oral consent with documentation
- Online consent with electronic verification
- Assent procedures for children/adolescents

**Consent Monitoring and Documentation**:
- Consent verification procedures
- Documentation retention requirements
- Consent withdrawal process
- Ongoing consent verification for longitudinal studies

### Phase 4: Participant Protection Measures

#### 4.1 Vulnerable Population Considerations
**Children and Minors**:
- Age-appropriate assent procedures
- Parental/guardian consent requirements
- Child protection agency compliance
- Developmental stage considerations

**Elderly Participants**:
- Cognitive assessment requirements
- Decision-making capacity evaluation
- Family member consultation procedures
- Long-term care facility policies

**Economically Disadvantaged**:
- Coercion prevention measures
- Incentive appropriateness assessment
- Transportation and logistical support
- Follow-up care access assurance

**Culturally Diverse Groups**:
- Cultural competency requirements
- Language access provision
- Community consultation processes
- Traditional healing practice respect

#### 4.2 Data Protection and Privacy
**Confidentiality Measures**:
- Data encryption requirements
- Secure storage procedures
- Access control and authorization
- Data retention and destruction policies

**Privacy Protection Strategies**:
- Anonymization and de-identification procedures
- Certificate of Confidentiality consideration
- Data sharing agreement requirements
- Breach notification procedures

### Phase 5: Protocol Development

#### 5.1 Research Protocol Structure
**Protocol Components**:
- Research objectives and hypotheses
- Study design and methodology
- Participant recruitment and selection
- Data collection and management procedures
- Risk assessment and minimization plans
- Data analysis and interpretation plans
- Dissemination and reporting plans

**Protocol Quality Standards**:
- Clear and unambiguous language
- Detailed procedure descriptions
- Risk-benefit analysis inclusion
- Stakeholder involvement documentation
- Quality control procedure specification

#### 5.2 Data Management Plan
**Data Handling Procedures**:
- Data collection and recording methods
- Data storage and security measures
- Data quality control procedures
- Data analysis and interpretation guidelines
- Data retention and destruction policies

**Data Sharing Considerations**:
- Data sharing plan development
- Repository selection and requirements
- Metadata and documentation standards
- Access and usage restrictions

### Phase 6: Monitoring and Oversight

#### 6.1 Ongoing Review Requirements
**Continuing Review Process**:
- Annual protocol review requirements
- Adverse event reporting procedures
- Protocol amendment submission process
- Study closure and final reporting

**Quality Assurance Procedures**:
- Data monitoring and auditing procedures
- Protocol adherence verification
- Participant safety monitoring
- Regulatory compliance verification

#### 6.2 Adverse Event Management
**Adverse Event Classification**:
- Unexpected adverse events
- Serious adverse events
- Study termination criteria
- Reporting timeline requirements

**Response and Management Procedures**:
- Event investigation procedures
- Corrective action development
- Notification requirement compliance
- Documentation and reporting standards

### Phase 7: Cultural Competence and Community Engagement

#### 7.1 Cultural Sensitivity Assessment
**Cultural Competence Requirements**:
- Cultural context understanding
- Traditional practice respect
- Community value integration
- Cultural adaptation strategies

**Cultural Adaptation Strategies**:
- Research question cultural appropriateness
- Method adaptation for cultural context
- Measure translation and validation
- Community partnership development

#### 7.2 Community Engagement Approaches
**Stakeholder Identification**:
- Community leader consultation
- Cultural expert involvement
- Participant community representation
- Advocacy group partnership

**Engagement Methods**:
- Community advisory boards
- Focus group consultations
- Cultural broker utilization
- Participatory research approaches

### Phase 8: Training and Capacity Building

#### 8.1 Researcher Training Requirements
**Ethics Training Components**:
- Research ethics principles and standards
- Regulatory requirement understanding
- Vulnerable population protection
- Data management and privacy principles

**Method-Specific Training**:
- Research method ethical considerations
- Participant interaction skills
- Cultural competence development
- Emergency response procedures

#### 8.2 Research Team Education
**Team Training Areas**:
- Protocol adherence procedures
- Participant protection measures
- Adverse event reporting requirements
- Data management responsibilities

**Ongoing Education Requirements**:
- Annual ethics refresher training
- Regulatory update awareness
- Best practice sharing sessions
- Quality improvement training

### Phase 9: Documentation and Record Keeping

#### 9.1 Ethics Documentation Requirements
**Required Documentation**:
- Ethics review application and approval
- Informed consent forms and processes
- Protocol amendments and approvals
- Adverse event reports and resolutions

**Record Retention Requirements**:
- Research record retention periods
- Documentation storage requirements
- Access and security procedures
- Destruction procedure compliance

#### 9.2 Audit Preparation
**Audit Trail Requirements**:
- Decision-making documentation
- Protocol deviation recording
- Participant communication logs
- Data management procedure documentation

**Compliance Verification**:
- Regulatory requirement checklist
- Internal policy compliance verification
- Quality assurance procedure documentation
- Continuous improvement evidence

### Phase 10: Post-Approval Management

#### 10.1 Implementation Monitoring
**Protocol Adherence Monitoring**:
- Regular protocol compliance checks
- Participant recruitment progress monitoring
- Data collection quality verification
- Timeline and milestone tracking

**Quality Control Procedures**:
- Data integrity verification
- Procedure consistency assessment
- Participant safety monitoring
- Regulatory compliance verification

#### 10.2 Amendments and Modifications
**Amendment Process**:
- Change identification and documentation
- Amendment justification development
- Review board submission requirements
- Implementation and monitoring procedures

**Unanticipated Problem Management**:
- Problem identification procedures
- Immediate response requirements
- Review board notification timelines
- Corrective action implementation

## Ethics Review Preparation Checklist

### Pre-Submission Phase:
- [ ] Ethical principles assessment completed
- [ ] Risk-benefit analysis conducted
- [ ] Informed consent process designed
- [ ] Vulnerable participant protections identified
- [ ] Data protection measures implemented
- [ ] Regulatory compliance verified

### Submission Phase:
- [ ] Complete protocol documentation prepared
- [ ] Informed consent forms developed
- [ ] Data management plan finalized
- [ ] Conflict of interest disclosures prepared
- [ ] Budget and resource justifications completed
- [ ] Timeline and milestones established

### Post-Approval Phase:
- [ ] Training and certification completed
- [ ] Monitoring and oversight procedures established
- [ ] Documentation and record-keeping systems ready
- [ ] Emergency and adverse event procedures prepared
- [ ] Quality assurance processes implemented

### Ongoing Compliance:
- [ ] Continuing review requirements understood
- [ ] Amendment procedures documented
- [ ] Audit and inspection readiness maintained
- [ ] Participant safety monitoring active
- [ ] Data integrity and privacy protected

Prepare thoroughly for ethics review to ensure participant protection, regulatory compliance, and research integrity!`;
  }

  private generateResearchRigorAssessmentPrompt(args: Record<string, any>): string {
    const methodology = args.research_methodology || 'research methodology';
    const qualityCriteria = args.quality_criteria || 'validity, reliability, generalizability';
    const studyPhase = args.study_phase || 'complete study';

    return `# Research Rigor Assessment for ${methodology}

## Assessment Context
- **Methodology**: ${methodology}
- **Quality Criteria**: ${qualityCriteria}
- **Study Phase**: ${studyPhase}

## Comprehensive Research Rigor Assessment Framework

### Phase 1: Rigor Concept Definition

#### 1.1 Rigor Dimensions
**Methodological Rigor**:
- Systematic and disciplined approach
- Appropriate method selection and application
- Transparent procedure documentation
- Logical analysis and interpretation

**Evidentiary Rigor**:
- Comprehensive data collection
- Multiple data source triangulation
- Chain of evidence maintenance
- Audit trail documentation

**Interpretive Rigor**:
- Alternative explanation consideration
- Bias and assumption acknowledgment
- Theory-data connection clarity
- Transferability assessment

#### 1.2 Quality Criteria Framework
**Validity Types**:
- **Internal Validity**: Causal relationship confidence within study context
- **External Validity**: Generalizability to other contexts and populations
- **Construct Validity**: Concept accurate measurement and manipulation
- **Statistical Conclusion Validity**: Appropriate statistical analysis and inference

**Reliability Dimensions**:
- **Internal Consistency**: Measure coherence and stability
- **Inter-rater Reliability**: Consistency across different observers
- **Test-retest Reliability**: Stability over time
- **Parallel Forms Reliability**: Consistency across equivalent measures

### Phase 2: Methodology-Specific Rigor Assessment

#### 2.1 Quantitative Research Rigor
**Design Rigor**:
- Sample size adequacy and power analysis
- Randomization and control procedures
- Measurement instrument validation
- Confounding variable control

**Analysis Rigor**:
- Appropriate statistical test selection
- Assumption testing and validation
- Multiple testing correction application
- Effect size and confidence interval reporting

**Reporting Rigor**:
- Complete methodological transparency
- Result interpretation accuracy
- Limitation clear articulation
- Replication information provision

#### 2.2 Qualitative Research Rigor
**Credibility Strategies**:
- Prolonged engagement in field
- Persistent observation practice
- Triangulation across data sources
- Member checking procedures
- Peer debriefing utilization

**Transferability Approaches**:
- Thick description provision
- Purposive sampling documentation
- Context-rich detail inclusion
- Reader generalization guidance

**Dependability Methods**:
- Audit trail maintenance
- Code-recode procedure application
- Stepwise replication documentation
- Researcher reflexivity practice

**Confirmability Techniques**:
- Bias identification and minimization
- Assumption explicit articulation
- Researcher positionality disclosure
- Interpretation validation procedures

#### 2.3 Mixed Methods Research Rigor
**Integration Quality**:
- Design coherence assessment
- Data transformation procedures
- Meta-inference development
- Paradigm integration clarity

**Multiple Method Rigor**:
- Quan/qual interaction documentation
- Paradigm conflict resolution
- Integration timing appropriateness
- Inference transformation validity

### Phase 3: Phase-Specific Rigor Assessment

#### 3.1 Planning Phase Rigor
**Protocol Development**:
- Research question clarity and focus
- Literature review comprehensiveness
- Theoretical framework appropriateness
- Method selection justification

**Resource Planning**:
- Sample size calculation accuracy
- Timeline realism assessment
- Budget adequacy evaluation
- Expertise availability verification

#### 3.2 Data Collection Phase Rigor
**Procedure Standardization**:
- Protocol adherence monitoring
- Training adequacy assessment
- Calibration procedure implementation
- Quality control measure application

**Data Quality Assurance**:
- Missing value pattern analysis
- Outlier identification and handling
- Response bias assessment
- Data integrity verification

#### 3.3 Analysis Phase Rigor
**Analytical Integrity**:
- Method appropriateness verification
- Assumption testing completeness
- Alternative analysis consideration
- Sensitivity analysis implementation

**Result Validation**:
- Cross-validation procedures
- Replication analysis performance
- Bootstrap validation application
- Model fit assessment adequacy

#### 3.4 Reporting Phase Rigor
**Transparency Standards**:
- Complete method description
- Data availability statement inclusion
- Analysis code accessibility
- Replication material provision

**Accuracy Requirements**:
- Result reporting completeness
- Statistical notation correctness
- Interpretation justification
- Limitation honest disclosure

### Phase 4: Quality Criterion Assessment Tools

#### 4.1 Validity Assessment Frameworks
**Internal Validity Threats**:
- History: External event influence
- Maturation: Natural change over time
- Testing: Assessment effect on outcomes
- Instrumentation: Measurement change effects
- Statistical regression: Extreme score normalization
- Selection: Group difference bias
- Mortality: Differential attrition effects

**Control Strategy Evaluation**:
- Randomization adequacy
- Matching effectiveness
- Statistical control appropriateness
- Sensitivity analysis comprehensiveness

#### 4.2 Reliability Assessment Methods
**Consistency Measurement**:
- Cronbach's alpha for internal consistency
- Intraclass correlation for inter-rater reliability
- Test-retest correlation for stability
- Parallel forms correlation for equivalence

**Error Source Identification**:
- Random error quantification
- Systematic error detection
- Measurement error assessment
- Observer bias evaluation

#### 4.3 Generalizability Assessment
**Population Generalizability**:
- Sample representativeness evaluation
- Demographic characteristic comparison
- Inclusion/exclusion criteria impact
- Self-selection bias assessment

**Context Generalizability**:
- Setting similarity evaluation
- Implementation fidelity assessment
- Cultural context relevance
- Historical time appropriateness

### Phase 5: Rigor Enhancement Strategies

#### 5.1 Methodological Strengthening
**Design Enhancement**:
- Pilot testing implementation
- Manipulation check inclusion
- Multiple baseline establishment
- Counterbalancing procedure application

**Measurement Improvement**:
- Multi-method measurement approaches
- Convergent evidence collection
- Discriminant validity assessment
- Response process validation

#### 5.2 Analytical Strengthening
**Statistical Rigor**:
- Power analysis completion
- Assumption testing thoroughness
- Multiple comparison correction
- Effect size calculation and interpretation

**Qualitative Rigor**:
- Saturation achievement documentation
- Negative case analysis completion
- Researcher bias acknowledgment
- Peer review incorporation

### Phase 6: Documentation and Transparency

#### 6.1 Protocol Documentation
**Research Protocol Elements**:
- Objective and hypothesis specification
- Method detailed description
- Analysis plan articulation
- Quality control procedures
- Deviation handling procedures

**Protocol Adherence**:
- Implementation fidelity assessment
- Deviation documentation and justification
- Corrective action implementation
- Lesson learned incorporation

#### 6.2 Data Documentation
**Data Management Plan**:
- Collection procedure documentation
- Storage and security measures
- Access and sharing policies
- Retention and destruction procedures

**Metadata Standards**:
- Variable definition completeness
- Coding scheme documentation
- Transformation procedure recording
- Quality control measure documentation

### Phase 7: Peer Review and Validation

#### 7.1 Internal Validation
**Research Team Review**:
- Methodological critique sessions
- Alternative interpretation discussions
- Limitation identification exercises
- Improvement suggestion development

**Expert Consultation**:
- Content expert input integration
- Methodological expert consultation
- Statistical analysis review
- Interpretation validation

#### 7.2 External Validation
**Peer Review Process**:
- Manuscript submission preparation
- Reviewer feedback integration
- Revision justification development
- Response clarity and completeness

**Replication and Extension**:
- Replication study planning
- Extension opportunity identification
- Cross-validation procedure development
- Meta-analysis contribution potential

### Phase 8: Continuous Quality Improvement

#### 8.1 Reflective Practice
**Research Process Reflection**:
- Decision rationale documentation
- Alternative approach consideration
- Learning opportunity identification
- Process improvement development

**Quality Monitoring**:
- Ongoing quality metric tracking
- Process deviation identification
- Corrective action implementation
- Best practice incorporation

#### 8.2 Research Program Development
**Quality Infrastructure**:
- Standard operating procedure development
- Training program establishment
- Quality assurance system implementation
- Continuous improvement culture development

**Knowledge Management**:
- Lesson learned documentation
- Best practice sharing mechanisms
- Process improvement implementation
- Research capacity building

## Rigor Assessment Checklist

### Design Phase Rigor:
- [ ] Research questions clearly articulated
- [ ] Literature review comprehensive and current
- [ ] Theoretical framework well-developed
- [ ] Methodology appropriate and justified
- [ ] Sample size adequate and justified
- [ ] Measurement instruments validated
- [ ] Data collection procedures standardized

### Implementation Phase Rigor:
- [ ] Protocol adherence maintained
- [ ] Quality control procedures implemented
- [ ] Data integrity preserved
- [ ] Participant safety ensured
- [ ] Ethical standards maintained
- [ ] Resource utilization optimized

### Analysis Phase Rigor:
- [ ] Appropriate statistical methods selected
- [ ] Assumptions tested and met
- [ ] Multiple testing issues addressed
- [ ] Effect sizes calculated and interpreted
- [ ] Sensitivity analyses conducted
- [ ] Results replicated across different approaches

### Reporting Phase Rigor:
- [ ] Methods completely and transparently reported
- [ ] Results accurately and completely presented
- [ ] Limitations honestly and comprehensively disclosed
- [ ] Implications clearly and appropriately discussed
- [ ] Recommendations evidence-based and actionable

## Rigor Enhancement Action Plan

### Immediate Actions (Next 1-2 weeks):
1. Conduct rigor self-assessment using this framework
2. Identify 3-5 most critical rigor gaps
3. Develop specific improvement plans for each gap
4. Implement quick wins and document changes

### Short-term Actions (Next 1-3 months):
1. Enhance methodological documentation
2. Implement additional quality control procedures
3. Conduct peer review of research design
4. Strengthen data management practices

### Long-term Actions (3-12 months):
1. Develop comprehensive quality assurance system
2. Implement advanced statistical and analytical methods
3. Establish research process standardization
4. Build institutional knowledge and best practices

## Success Metrics for Research Rigor

1. **Methodological Soundness**: Methods appropriate for research questions and context
2. **Data Quality**: High-quality, reliable, and valid data collection and management
3. **Analytical Integrity**: Appropriate and rigorous data analysis procedures
4. **Interpretive Accuracy**: Valid and well-supported interpretations and conclusions
5. **Transparency**: Complete and honest reporting of methods, results, and limitations
6. **Reproducibility**: Sufficient detail for research replication by qualified investigators

Elevate your research rigor to ensure credible, trustworthy, and impactful findings that advance knowledge and inform practice!`;
  }

  private generateJournalSelectionStrategyPrompt(args: Record<string, any>): string {
    const topic = args.research_topic || 'research topic';
    const audience = args.target_audience || 'academic researchers';
    const impactGoal = args.impact_goal || 'citation impact';
    const timeline = args.timeline_constraint || 'standard timeline';

    return `# Journal Selection Strategy for "${topic}"

## Research Context
- **Topic**: ${topic}
- **Target Audience**: ${audience}
- **Impact Goal**: ${impactGoal}
- **Timeline**: ${timeline}

## Strategic Journal Selection Framework

### Phase 1: Research Profile Analysis

#### 1.1 Manuscript Characteristics Assessment
**Scope and Focus**:
- Disciplinary boundaries (single vs. multidisciplinary)
- Theoretical vs. applied orientation
- Basic vs. translational research
- Fundamental vs. developmental contributions

**Innovation Level**:
- Incremental vs. breakthrough contributions
- Replication vs. novel findings
- Theoretical vs. empirical emphasis
- Exploratory vs. confirmatory research

**Methodological Approach**:
- Quantitative, qualitative, or mixed methods
- Experimental, observational, or intervention design
- Single method vs. multi-method approaches
- Traditional vs. innovative methodologies

#### 1.2 Target Audience Analysis
**Primary Audience Characteristics**:
- Academic researchers (junior vs. senior scholars)
- Practitioners and professionals
- Policy makers and administrators
- Industry professionals and consultants

**Audience Needs and Preferences**:
- Theoretical depth requirements
- Practical application emphasis
- Methodological rigor expectations
- Publication timeline preferences

### Phase 2: Journal Landscape Analysis

#### 2.1 Field-Specific Journal Mapping
**Core Disciplinary Journals**:
- Flagship journals in primary discipline
- Subfield specialty journals
- Interdisciplinary boundary journals
- Regional vs. international scope journals

**Emerging Journal Opportunities**:
- New journals in growing subfields
- Open access mega-journals
- Field-specific open access journals
- University press journals

**Journal Tier Analysis**:
- Top-tier (high impact, selective)
- Mid-tier (established, moderate selectivity)
- Field-specific (specialized focus)
- Regional (geographic scope limitation)

#### 2.2 Journal Performance Metrics
**Citation Impact Analysis**:
- Journal Impact Factor trends
- Field-normalized citation metrics
- Article-level citation distributions
- Citation half-life analysis

**Alternative Metrics Consideration**:
- Altmetric attention scores
- Social media mentions
- Policy document citations
- Media coverage impact

### Phase 3: Strategic Alignment Assessment

#### 3.1 Manuscript-Journal Fit Evaluation
**Scope Alignment**:
- Topic coverage appropriateness
- Methodological approach acceptance
- Theoretical orientation compatibility
- Geographic scope congruence

**Quality Standard Compatibility**:
- Rigor expectation alignment
- Novelty threshold assessment
- Contribution type preferences
- Length and format requirements

**Audience Match Analysis**:
- Reader interest alignment
- Expertise level appropriateness
- Practical relevance expectations
- International vs. local audience focus

#### 3.2 Acceptance Probability Assessment
**Selectivity Level Analysis**:
- Acceptance rate trends
- Desk rejection patterns
- Revision requirements
- Time to decision metrics

**Competitive Landscape**:
- Manuscript flow analysis
- Backlog assessment
- Publication lag time
- Special issue opportunities

### Phase 4: Impact Maximization Strategy

#### 4.1 Citation Impact Optimization
**High-Impact Journal Strategy**:
- Breakthrough finding targeting
- Novel methodology emphasis
- Broad interest demonstration
- Timely publication importance

**Field-Specific Impact Strategy**:
- Specialized audience targeting
- Deep disciplinary contribution
- Methodological innovation focus
- Community impact maximization

**Practical Impact Strategy**:
- Practitioner audience targeting
- Implementation guidance provision
- Policy relevance demonstration
- Real-world application emphasis

#### 4.2 Career Impact Considerations
**Academic Career Stage Factors**:
- Early career (quantity emphasis)
- Mid-career (quality focus)
- Senior scholar (impact maximization)
- Career transition (field establishment)

**Institutional Factors**:
- Departmental publication expectations
- Tenure and promotion requirements
- Funding agency preferences
- Institutional reputation considerations

### Phase 5: Practical Constraints Analysis

#### 5.1 Timeline and Urgency Factors
**Publication Speed Requirements**:
- Conference presentation deadlines
- Funding report requirements
- Job application timelines
- Dissertation completion dates

**Review Process Duration**:
- Journal decision time analysis
- Revision timeline assessment
- Publication lag evaluation
- Alternative venue backup planning

#### 5.2 Resource and Cost Considerations
**Open Access Costs**:
- Article processing charge assessment
- Institutional funding availability
- Funders' open access policies
- Cost-benefit analysis

**Submission Costs**:
- Page charges and color figure fees
- Copyright transfer requirements
- Embargo period implications
- Repository deposition requirements

### Phase 6: Submission Strategy Development

#### 6.1 Journal Ranking and Targeting
**Primary Target Selection**:
- Best fit journal identification
- Realistic acceptance probability
- Impact potential maximization
- Timeline compatibility assessment

**Secondary Target Development**:
- Backup journal options
- Cascading submission strategy
- Rejection response planning
- Alternative publication formats

#### 6.2 Submission Preparation Strategy
**Manuscript Optimization**:
- Journal-specific formatting
- Keyword selection for indexing
- Abstract tailoring for audience
- Title optimization for searchability

**Supporting Material Preparation**:
- Cover letter customization
- Response to reviewer preparation
- Supplementary material organization
- Data availability statement preparation

### Phase 7: Long-term Publication Strategy

#### 7.1 Portfolio Publication Planning
**Publication Mix Strategy**:
- High-impact journal targeting (10-20% of papers)
- Field journal publishing (40-50% of papers)
- Conference and workshop papers (20-30% of papers)
- Book chapters and reviews (10-20% of papers)

**Career Stage Publication Strategy**:
- Early career: Establish publication record
- Mid-career: Build reputation and impact
- Senior career: Maximize influence and legacy
- Career transition: Establish new field presence

#### 7.2 Research Program Publication Planning
**Publication Timeline Development**:
- Literature review and theory papers
- Methodology development papers
- Empirical finding papers
- Synthesis and review papers
- Theoretical contribution papers

**Publication Sequencing Strategy**:
- Foundational work first
- Methodology papers early
- Major empirical work mid-stream
- Synthesis work later in program
- Replication and extension work ongoing

### Phase 8: Ethical and Responsible Publishing

#### 8.1 Publication Ethics Considerations
**Authorship Integrity**:
- Authorship criteria adherence
- Author order appropriateness
- Contribution acknowledgment
- Ghost authorship avoidance

**Duplicate Publication Prevention**:
- Prior publication assessment
- Self-plagiarism avoidance
- Salami slicing prevention
- Preprint policy compliance

#### 8.2 Data and Material Sharing
**Data Availability Planning**:
- Data sharing policy assessment
- Repository selection and preparation
- Metadata and documentation
- Access and usage license determination

**Material Sharing Strategy**:
- Code availability planning
- Material transfer agreements
- Intellectual property considerations
- Collaboration agreement compliance

### Phase 9: Monitoring and Adaptation

#### 9.1 Publication Outcome Tracking
**Success Metric Monitoring**:
- Acceptance rates by journal tier
- Citation impact tracking
- Altmetric attention monitoring
- Download and view statistics

**Rejection Analysis**:
- Rejection reason categorization
- Common feedback theme identification
- Revision success rate tracking
- Journal preference pattern analysis

#### 9.2 Strategy Refinement
**Performance Review Cycles**:
- Quarterly publication portfolio review
- Annual impact metric assessment
- Career goal alignment verification
- Strategy adjustment implementation

**Learning and Improvement**:
- Peer comparison analysis
- Mentor consultation integration
- Professional development planning
- Network expansion strategies

### Phase 10: Alternative Publishing Options

#### 10.1 Non-Traditional Publishing
**Preprint Server Utilization**:
- arXiv, bioRxiv, socArXiv, medRxiv
- Field-specific preprint services
- Institutional repository options
- Disciplinary repository networks

**Open Access Options**:
- Fully open access journals
- Hybrid open access options
- Institutional open access funds
- Transformative agreements

#### 10.2 Alternative Formats
**Conference Publications**:
- Full paper vs. extended abstract
- Conference proceedings vs. journals
- Workshop and symposium papers
- Poster presentation options

**Book and Chapter Publications**:
- Edited book chapters
- Authored book options
- Handbook and encyclopedia entries
- Technical report publications

## Journal Selection Decision Framework

### Step 1: Define Publication Goals
- What is the primary purpose of this publication?
- Who is the intended audience?
- What impact do you hope to achieve?
- What are your timeline constraints?

### Step 2: Assess Manuscript Characteristics
- What is the scope and focus of your work?
- What type of contribution does it represent?
- What methodological approach did you use?
- What is the quality and completeness of your work?

### Step 3: Research Journal Options
- What journals publish work in your area?
- What are their acceptance rates and timelines?
- What are their readership and impact metrics?
- What are their formatting and submission requirements?

### Step 4: Evaluate Fit and Feasibility
- How well does your work match each journal's scope?
- What is the probability of acceptance?
- What are the publication costs and timelines?
- How does each option align with your goals?

### Step 5: Develop Submission Strategy
- Select primary and backup journal options
- Prepare journal-specific versions of your manuscript
- Develop response strategies for different outcomes
- Plan for post-submission activities

### Step 6: Monitor and Learn
- Track submission outcomes and timelines
- Analyze reviewer feedback patterns
- Adjust future submission strategies
- Build publication portfolio strategically

## Success Metrics for Journal Selection

1. **Acceptance Rate**: Percentage of submissions accepted
2. **Impact Achievement**: Citation rates and journal metrics
3. **Timeline Efficiency**: Time from submission to publication
4. **Audience Reach**: Reader access and engagement metrics
5. **Career Advancement**: Contribution to professional goals

Select journals strategically to maximize your research impact, reach your target audience, and advance your academic career!`;
  }

  private generateManuscriptRevisionPlanningPrompt(args: Record<string, any>): string {
    const feedback = args.reviewer_feedback || 'reviewer feedback';
    const deadline = args.revision_deadline || 'revision deadline';
    const weaknesses = args.manuscript_weaknesses || 'identified weaknesses';
    const strategy = args.response_strategy || 'response strategy';

    return `# Manuscript Revision Planning Based on "${feedback}"

## Revision Context
- **Reviewer Feedback**: ${feedback}
- **Revision Deadline**: ${deadline}
- **Identified Weaknesses**: ${weaknesses}
- **Response Strategy**: ${strategy}

## Comprehensive Manuscript Revision Planning Framework

### Phase 1: Feedback Analysis and Prioritization

#### 1.1 Reviewer Feedback Categorization
**Major vs. Minor Concerns**:
- **Major Issues**: Fatal flaws requiring significant changes
- **Moderate Issues**: Important but addressable concerns
- **Minor Issues**: Suggestions for improvement
- **Editorial Issues**: Formatting, clarity, style improvements

**Feedback Type Classification**:
- **Methodological Concerns**: Design, sample, analysis issues
- **Theoretical Issues**: Conceptual framework, literature integration problems
- **Interpretive Questions**: Results interpretation challenges
- **Writing Quality**: Clarity, organization, style issues
- **Contribution Assessment**: Novelty, significance, advance evaluation

#### 1.2 Feedback Pattern Analysis
**Common Themes Identification**:
- Recurring concerns across reviewers
- Contradictory feedback resolution
- Underlying conceptual issues
- Communication clarity problems

**Reviewer Expertise Consideration**:
- Methodological expert feedback weighting
- Content expert opinion valuation
- Writing quality feedback assessment
- Statistical analysis critique evaluation

### Phase 2: Revision Scope Assessment

#### 2.1 Required Changes Identification
**Must-Fix Issues**:
- Factual errors or inaccuracies
- Methodological flaws or gaps
- Statistical analysis errors
- Ethical concern resolutions
- Regulatory requirement compliance

**Should-Fix Improvements**:
- Clarity and readability enhancements
- Additional analysis suggestions
- Literature integration improvements
- Theoretical framework strengthening
- Writing quality refinements

**Optional Enhancements**:
- Additional data or analysis inclusion
- Extended discussion development
- Alternative interpretation exploration
- Future research direction expansion

#### 2.2 Feasibility and Timeline Assessment
**Time Requirement Evaluation**:
- Major revision time estimation
- Additional analysis completion timeline
- Literature review expansion duration
- Writing and editing time allocation

**Resource Availability Check**:
- Additional data collection feasibility
- Statistical expertise access availability
- Co-author contribution potential
- Technical support requirement assessment

### Phase 3: Revision Strategy Development

#### 3.1 Overall Response Framework
**Rejection Response Strategies**:
- Direct address of fatal flaws
- Major design or analysis changes
- Fundamental concept reconsideration
- Potential journal switch consideration

**Major Revision Approaches**:
- Comprehensive response development
- Additional data collection planning
- Fundamental flaw resolution strategy
- Theoretical framework reconstruction

**Minor Revision Tactics**:
- Point-by-point response preparation
- Clarity and precision improvements
- Additional explanation insertions
- Supporting evidence additions

#### 3.2 Change Implementation Planning
**Structural Revision Strategy**:
- Section reorganization planning
- Content addition/removal decisions
- Flow and logic improvement approaches
- Reader guidance enhancement methods

**Content Enhancement Planning**:
- Literature integration improvements
- Theoretical framework strengthening
- Methodological clarification approaches
- Results interpretation refinement strategies

### Phase 4: Point-by-Point Response Development

#### 4.1 Response Structure Planning
**Response Letter Organization**:
- Executive summary of changes
- Point-by-point reviewer address
- Change justification explanations
- Additional information provisions

**Evidence-Based Responses**:
- Specific change documentation
- Rationale clear articulation
- Supporting evidence provision
- Alternative interpretation acknowledgment

#### 4.2 Contentious Issue Management
**Disagreement Handling**:
- Respectful difference explanation
- Alternative perspective presentation
- Additional evidence provision
- Theoretical justification development

**Compromise Strategy Development**:
- Partial concession approaches
- Additional analysis provision
- Clarification and explanation additions
- Future research implication discussions

### Phase 5: Manuscript Content Revision

#### 5.1 Introduction and Background Revision
**Literature Review Enhancement**:
- Recent reference integration
- Gap identification strengthening
- Theoretical framework clarification
- Research significance reinforcement

**Research Question Refinement**:
- Question clarity improvement
- Scope appropriateness assessment
- Theoretical grounding enhancement
- Practical relevance strengthening

#### 5.2 Methodology Section Revision
**Methodological Clarification**:
- Procedure detail enhancement
- Sample description improvement
- Measurement instrument clarification
- Analysis method justification strengthening

**Additional Analysis Inclusion**:
- Robustness check implementation
- Sensitivity analysis addition
- Alternative method comparison
- Assumption testing documentation

#### 5.3 Results Section Revision
**Presentation Clarity Improvement**:
- Table/figure enhancement
- Statistical reporting standardization
- Result interpretation clarification
- Uncertainty quantification addition

**Additional Results Integration**:
- Subgroup analysis inclusion
- Mediation/moderation analysis addition
- Model comparison results
- Validation analysis incorporation

#### 5.4 Discussion Section Enhancement
**Interpretation Strengthening**:
- Theoretical implication development
- Practical implication clarification
- Limitation honest articulation
- Future research direction specification

**Alternative Explanation Addressing**:
- Rival hypothesis discussion
- Boundary condition identification
- Contextual factor consideration
- Generalizability limitation acknowledgment

### Phase 6: Writing Quality and Clarity Enhancement

#### 6.1 Language and Style Refinement
**Clarity Improvements**:
- Jargon explanation addition
- Complex sentence simplification
- Technical term definition provision
- Concept illustration enhancement

**Precision Enhancement**:
- Ambiguity elimination
- Qualification addition where needed
- Specificity increase in descriptions
- Measurement precision clarification

#### 6.2 Structure and Flow Optimization
**Logical Flow Enhancement**:
- Transition sentence addition
- Paragraph reorganization
- Section connection improvement
- Argument progression clarification

**Reader Guidance Improvement**:
- Section purpose statements
- Key point highlighting
- Summary sentence inclusion
- Road map provision for complex sections

### Phase 7: Additional Data and Analysis Integration

#### 7.1 Supplementary Analysis Planning
**Robustness Testing**:
- Alternative model specification
- Different estimation methods
- Subsample analysis implementation
- Cross-validation procedure application

**Sensitivity Analysis Development**:
- Parameter variation testing
- Assumption relaxation assessment
- Boundary condition exploration
- Uncertainty quantification

#### 7.2 Additional Data Collection
**Feasibility Assessment**:
- Time availability evaluation
- Resource requirement assessment
- Cost-benefit analysis completion
- Ethical consideration review

**Data Integration Strategy**:
- Existing data reanalysis opportunities
- Additional variable collection planning
- Follow-up data collection design
- Meta-analysis inclusion consideration

### Phase 8: Collaborative Revision Process

#### 8.1 Team Revision Coordination
**Revision Task Assignment**:
- Content expert revision assignment
- Methodological expert consultation
- Writing quality reviewer designation
- Statistical analysis validator appointment

**Timeline Coordination**:
- Individual contribution deadlines
- Integration milestone establishment
- Review and feedback cycles
- Final integration timeline

#### 8.2 External Review Integration
**Additional Reviewer Consultation**:
- Content expert feedback solicitation
- Methodological expert engagement
- Writing coach utilization
- Peer review group consultation

**Mentor Integration**:
- Senior scholar guidance seeking
- Career advice incorporation
- Strategic revision planning
- Long-term publication strategy development

### Phase 9: Quality Assurance and Final Checks

#### 9.1 Comprehensive Review Process
**Content Accuracy Verification**:
- Factual claim validation
- Citation accuracy confirmation
- Reference completeness checking
- Data accuracy verification

**Logical Consistency Assessment**:
- Argument coherence evaluation
- Evidence-claim alignment verification
- Conclusion-justification validation
- Assumption-consistency checking

#### 9.2 Technical Quality Assurance
**Formatting and Style Compliance**:
- Journal style guide adherence
- Reference formatting consistency
- Figure and table standards compliance
- Word count and length requirements

**Proofreading and Editing**:
- Grammar and syntax checking
- Typographical error elimination
- Consistency verification
- Readability assessment

### Phase 10: Submission Preparation and Follow-up

#### 10.1 Revised Manuscript Packaging
**Complete Submission Package**:
- Revised manuscript with track changes
- Point-by-point response letter
- Additional supporting materials
- Data availability statements
- Conflict of interest disclosures

**Cover Letter Enhancement**:
- Revision summary highlighting
- Change significance articulation
- Reviewer concern address confirmation
- Publication importance reemphasis

#### 10.2 Post-Revision Strategy
**Acceptance Preparation**:
- Final formatting completion
- Proof preparation anticipation
- Publication timeline planning
- Dissemination strategy development

**Rejection Contingency Planning**:
- Alternative journal identification
- Further revision planning
- Different publication format consideration
- Research program adaptation planning

## Revision Planning Timeline

### Week 1: Analysis and Planning
- [ ] Reviewer feedback detailed analysis
- [ ] Revision scope and feasibility assessment
- [ ] Team and resource allocation planning
- [ ] Timeline and milestone development

### Week 2-3: Content Revision
- [ ] Major content changes implementation
- [ ] Additional analysis completion
- [ ] Literature integration enhancement
- [ ] Theoretical framework strengthening

### Week 4: Writing and Clarity
- [ ] Language and style refinement
- [ ] Structure and flow optimization
- [ ] Reader guidance improvement
- [ ] Argument clarity enhancement

### Week 5: Response Development
- [ ] Point-by-point response letter drafting
- [ ] Evidence and justification gathering
- [ ] Additional material preparation
- [ ] Response letter finalization

### Week 6: Quality Assurance
- [ ] Comprehensive content review
- [ ] Technical quality verification
- [ ] Collaborative feedback integration
- [ ] Final proofreading and editing

### Week 7: Submission Preparation
- [ ] Complete submission package assembly
- [ ] Cover letter refinement
- [ ] Final check and validation
- [ ] Timely submission completion

## Success Metrics for Manuscript Revision

1. **Reviewer Concern Resolution**: All major concerns adequately addressed
2. **Manuscript Quality Improvement**: Clear, coherent, and compelling presentation
3. **Response Quality**: Respectful, evidence-based, and convincing responses
4. **Timeline Compliance**: Revision completed within required timeframe
5. **Re-acceptance Probability**: Strong case made for publication acceptance

Plan and execute your manuscript revision strategically to transform reviewer feedback into publication success!`;
  }

  private generateCollaborationPlanningPrompt(args: Record<string, any>): string {
    const collabType = args.collaboration_type || 'inter-institutional';
    const teamSize = args.team_size || 'team size';
    const goals = args.collaboration_goals || 'collaboration goals';
    const timeline = args.timeline_requirements || 'timeline requirements';

    return `# ${collabType} Collaboration Planning

## Collaboration Context
- **Type**: ${collabType}
- **Team Size**: ${teamSize}
- **Goals**: ${goals}
- **Timeline**: ${timeline}

## Comprehensive Research Collaboration Planning Framework

### Phase 1: Collaboration Foundation Development

#### 1.1 Partnership Rationale Establishment
**Mutual Benefit Analysis**:
- Complementary expertise identification
- Resource sharing opportunities
- Knowledge exchange potential
- Reputation and visibility enhancement

**Value Proposition Development**:
- Unique contribution articulation
- Competitive advantage creation
- Innovation potential realization
- Impact amplification opportunities

**Risk-Reward Assessment**:
- Collaboration cost evaluation
- Failure risk mitigation
- Success probability assessment
- Exit strategy development

#### 1.2 Partner Selection Strategy
**Partner Criteria Definition**:
- Expertise and capability alignment
- Reputation and track record assessment
- Cultural fit and value compatibility
- Resource and capacity evaluation

**Selection Process Development**:
- Potential partner identification
- Initial outreach and communication
- Compatibility assessment procedures
- Final selection decision criteria

### Phase 2: Collaboration Structure Design

#### 2.1 Governance Framework Development
**Decision-Making Structure**:
- Leadership and authority distribution
- Decision-making process establishment
- Conflict resolution mechanism design
- Accountability and responsibility assignment

**Communication Protocol Establishment**:
- Regular meeting schedule development
- Communication channel specification
- Information sharing procedure design
- Documentation and record-keeping requirements

**Progress Monitoring System**:
- Milestone and deliverable definition
- Progress tracking mechanism establishment
- Performance metric development
- Quality control procedure implementation

#### 2.2 Role and Responsibility Assignment
**Individual Role Definition**:
- Specific task and responsibility assignment
- Authority level and decision scope clarification
- Accountability measure establishment
- Performance expectation setting

**Team Dynamics Optimization**:
- Interpersonal relationship building
- Trust and respect cultivation
- Conflict prevention strategies
- Collaboration skill development

### Phase 3: Resource and Capacity Planning

#### 3.1 Resource Inventory and Allocation
**Human Resource Assessment**:
- Team member expertise and skill evaluation
- Time commitment availability assessment
- Training and development need identification
- Workload distribution planning

**Financial Resource Planning**:
- Budget requirement estimation
- Funding source identification
- Cost sharing agreement development
- Financial accountability establishment

**Technical Resource Evaluation**:
- Equipment and technology requirement assessment
- Software and tool availability verification
- Data and information resource identification
- Infrastructure capacity evaluation

#### 3.2 Capacity Building Strategy
**Skill Gap Analysis**:
- Required competency identification
- Current capability assessment
- Training and development planning
- External expertise procurement strategy

**Resource Acquisition Planning**:
- Additional resource need identification
- Procurement timeline development
- Quality assurance procedures
- Contingency resource planning

### Phase 4: Research Design and Methodology Integration

#### 4.1 Collaborative Research Design
**Integrated Methodology Development**:
- Research question co-development
- Methodology integration strategy
- Data collection coordination
- Analysis approach harmonization

**Quality Assurance Framework**:
- Research integrity standard establishment
- Quality control procedure development
- Peer review mechanism design
- Validation and verification processes

#### 4.2 Intellectual Property Management
**IP Ownership Agreement**:
- Contribution recognition framework
- Ownership right distribution
- Usage and dissemination rights
- Commercial exploitation agreements

**Publication and Dissemination Planning**:
- Authorship order determination
- Publication credit allocation
- Intellectual contribution acknowledgment
- Dissemination strategy coordination

### Phase 5: Communication and Relationship Management

#### 5.1 Communication Strategy Development
**Internal Communication Framework**:
- Regular progress update procedures
- Issue and concern reporting mechanisms
- Decision-making communication protocols
- Documentation and information sharing

**External Communication Planning**:
- Stakeholder communication strategy
- Public engagement approach
- Media and press release coordination
- Conference and presentation planning

**Crisis Communication Preparation**:
- Potential issue identification
- Response strategy development
- Communication protocol establishment
- Recovery and relationship rebuilding plans

#### 5.2 Relationship Building and Maintenance
**Trust Building Activities**:
- Team building and social event planning
- Shared experience creation opportunities
- Mutual understanding development activities
- Long-term relationship cultivation strategies

**Conflict Management Preparation**:
- Potential conflict area identification
- Resolution mechanism establishment
- Mediation and arbitration procedures
- Relationship preservation strategies

### Phase 6: Risk Management and Contingency Planning

#### 6.1 Risk Identification and Assessment
**Collaboration-Specific Risks**:
- Communication breakdown potential
- Resource allocation conflicts
- Intellectual property disputes
- Timeline and deadline pressures

**External Risk Factors**:
- Funding uncertainty considerations
- Institutional policy changes
- Personnel changes and turnover
- Technological or methodological challenges

**Project-Specific Risks**:
- Research design and methodology issues
- Data collection and quality problems
- Analysis and interpretation challenges
- Dissemination and impact limitations

#### 6.2 Mitigation Strategy Development
**Preventive Measures**:
- Clear agreement and contract development
- Regular monitoring and communication
- Quality assurance procedure implementation
- Contingency planning and preparation

**Response Strategy Planning**:
- Issue escalation procedures
- Problem resolution mechanisms
- Alternative approach development
- Exit strategy and transition planning

### Phase 7: Timeline and Milestone Planning

#### 7.1 Project Timeline Development
**Phase-Based Timeline Creation**:
- Planning and preparation phase timeline
- Implementation and execution timeline
- Analysis and interpretation timeline
- Dissemination and reporting timeline

**Milestone Definition and Sequencing**:
- Critical path identification
- Dependency relationship mapping
- Resource requirement alignment
- Risk mitigation integration

#### 7.2 Progress Monitoring Framework
**Regular Review Cycles**:
- Weekly progress check-in procedures
- Monthly milestone review meetings
- Quarterly comprehensive assessments
- Annual strategic review sessions

**Performance Tracking System**:
- Progress metric development
- Quality indicator establishment
- Timeline adherence monitoring
- Budget and resource utilization tracking

### Phase 8: Evaluation and Learning Framework

#### 8.1 Collaboration Success Metrics
**Process Metrics**:
- Timeline adherence assessment
- Budget compliance evaluation
- Quality standard achievement
- Stakeholder satisfaction measurement

**Outcome Metrics**:
- Research output quality evaluation
- Impact and dissemination success
- Knowledge creation and transfer
- Capacity building achievement

**Relationship Metrics**:
- Trust and communication quality
- Conflict resolution effectiveness
- Mutual benefit realization
- Future collaboration potential

#### 8.2 Learning and Improvement Planning
**Lessons Learned Process**:
- Regular reflection session scheduling
- Success factor identification
- Challenge and barrier analysis
- Improvement opportunity recognition

**Knowledge Management Strategy**:
- Best practice documentation
- Lesson learned sharing mechanisms
- Process improvement implementation
- Future collaboration enhancement

### Phase 9: Sustainability and Long-term Planning

#### 9.1 Collaboration Sustainability Assessment
**Ongoing Value Evaluation**:
- Continued benefit assessment
- Resource sustainability evaluation
- Relationship strength monitoring
- Impact persistence measurement

**Sustainability Strategy Development**:
- Long-term commitment planning
- Resource security measures
- Institutional support cultivation
- Success story development and sharing

#### 9.2 Future Collaboration Foundation
**Network Expansion Opportunities**:
- Additional partner identification
- New collaboration area exploration
- Capacity building initiative development
- Reputation and visibility enhancement

**Legacy and Continuity Planning**:
- Knowledge transfer mechanism development
- Institutional memory preservation
- Successor planning and preparation
- Ongoing impact monitoring and evaluation

### Phase 10: Legal and Ethical Framework

#### 10.1 Legal Agreement Development
**Collaboration Agreement Components**:
- Scope and objective specification
- Role and responsibility definition
- Resource and contribution commitment
- Intellectual property arrangement
- Confidentiality and non-disclosure terms

**Contractual Protection Measures**:
- Performance obligation specification
- Termination and exit provisions
- Dispute resolution mechanisms
- Liability and risk allocation
- Compliance requirement specification

#### 10.2 Ethical Collaboration Practices
**Research Ethics Integration**:
- Ethical standard harmonization
- Participant protection coordination
- Data privacy and security alignment
- Cultural sensitivity consideration

**Collaborative Ethics Framework**:
- Transparency and openness commitment
- Fairness and equity principles
- Respect and trust cultivation
- Accountability and responsibility sharing

## Collaboration Planning Implementation Roadmap

### Month 1: Foundation and Planning
- [ ] Partner selection and relationship building
- [ ] Collaboration rationale and value proposition development
- [ ] Initial agreement and commitment establishment
- [ ] Basic governance structure and communication protocol setup

### Month 2: Structure and Resource Planning
- [ ] Detailed governance framework development
- [ ] Role and responsibility assignment completion
- [ ] Resource inventory and allocation planning
- [ ] Capacity building and training planning

### Month 3: Operational Setup
- [ ] Research design and methodology integration
- [ ] Communication and monitoring system establishment
- [ ] Risk management and contingency planning
- [ ] Timeline and milestone development

### Month 4-Execution Timeline: Implementation and Execution
- [ ] Regular progress monitoring and adjustment
- [ ] Quality assurance and compliance verification
- [ ] Issue identification and resolution
- [ ] Relationship building and trust development

### Ongoing: Evaluation and Adaptation
- [ ] Regular performance and progress evaluation
- [ ] Learning and improvement integration
- [ ] Stakeholder communication and engagement
- [ ] Sustainability and long-term planning

## Success Factors for Research Collaboration

1. **Clear Communication**: Regular, transparent, and effective communication channels
2. **Shared Vision**: Common goals, values, and understanding of collaboration purpose
3. **Mutual Respect**: Recognition and valuation of each partner's contributions and expertise
4. **Strong Leadership**: Clear direction, conflict resolution, and motivation maintenance
5. **Resource Alignment**: Adequate resources, capacity, and commitment from all partners
6. **Trust Building**: Openness, reliability, and integrity in all collaborative activities

Plan and execute your research collaboration systematically to maximize collective impact and achieve shared research objectives!`;
  }

  private generateResearchPresentationPlanningPrompt(args: Record<string, any>): string {
    const presentationType = args.presentation_type || 'conference presentation';
    const audience = args.audience_composition || 'mixed audience';
    const timeLimit = args.time_allocation || '15 minutes';
    const goal = args.presentation_goal || 'inform and discuss';

    return `# ${presentationType} Planning for ${audience}

## Presentation Context
- **Type**: ${presentationType}
- **Audience**: ${audience}
- **Time Allocation**: ${timeLimit}
- **Primary Goal**: ${goal}

## Comprehensive Research Presentation Planning Framework

### Phase 1: Audience and Context Analysis

#### 1.1 Audience Analysis and Adaptation
**Audience Composition Assessment**:
- Expertise level evaluation (novice, intermediate, expert)
- Disciplinary background diversity
- Professional roles and interests
- Cultural and linguistic considerations

**Audience Need Identification**:
- Knowledge gap assessment
- Interest alignment evaluation
- Practical application relevance
- Theoretical contribution appreciation

**Adaptation Strategy Development**:
- Content complexity adjustment
- Jargon and terminology management
- Example and illustration selection
- Question and discussion planning

#### 1.2 Context and Constraint Analysis
**Venue and Format Characteristics**:
- Formal conference vs. informal seminar
- Large auditorium vs. small room setting
- Virtual vs. in-person presentation
- Single presentation vs. panel session

**Time and Resource Constraints**:
- Total presentation time allocation
- Question and answer period duration
- Audio-visual equipment availability
- Handout and material distribution options

**Competition and Positioning**:
- Other presentations in session
- Audience attention management
- Unique contribution articulation
- Networking opportunity maximization

### Phase 2: Content Strategy and Structure Development

#### 2.1 Core Message Identification
**Key Message Distillation**:
- Primary research contribution identification
- Most important finding selection
- Core implication articulation
- Take-home message crystallization

**Message Hierarchy Establishment**:
- Main message and supporting points
- Evidence and example relationship
- Logical flow and progression
- Redundancy and reinforcement strategies

**Audience Relevance Optimization**:
- Benefit and value proposition development
- Practical implication highlighting
- Theoretical contribution explanation
- Future direction significance articulation

#### 2.2 Content Organization Framework
**Traditional Structure Evaluation**:
- Introduction-Body-Conclusion format appropriateness
- Problem-Solution-Benefit structure suitability
- Chronological or logical flow preference
- Audience knowledge-based sequencing

**Alternative Structure Consideration**:
- Story-based narrative approach
- Problem-solution case study format
- Demonstration and example-driven structure
- Question-driven interactive format

**Content Chunking Strategy**:
- Major section identification and sequencing
- Transition and connection development
- Summary and reinforcement points
- Audience engagement checkpoints

### Phase 3: Visual Design and Support Material Development

#### 3.1 Visual Aid Strategy
**Slide Design Principles**:
- Less is more philosophy application
- Visual hierarchy establishment
- Color and font consistency maintenance
- Branding and professional appearance

**Content-Visual Relationship**:
- Key point visual representation
- Data visualization technique selection
- Concept illustration and metaphor usage
- Emotional impact and engagement creation

**Technical Quality Assurance**:
- High-resolution image usage
- Readable font size and style
- Animation and transition appropriateness
- Backup presentation readiness

#### 3.2 Supporting Material Preparation
**Handout and Takeaway Development**:
- Key point summary creation
- Contact information inclusion
- Additional resource references
- Discussion question provision

**Digital Material Preparation**:
- Presentation file backup creation
- Online resource link compilation
- Supplementary material organization
- Follow-up communication planning

### Phase 4: Delivery and Performance Planning

#### 4.1 Delivery Style Development
**Presentation Persona Cultivation**:
- Authentic voice and style identification
- Confidence and enthusiasm projection
- Audience connection and engagement
- Professional credibility establishment

**Verbal Delivery Techniques**:
- Pace and rhythm variation
- Pause and emphasis utilization
- Vocal variety and expressiveness
- Natural language and conversational tone

**Non-Verbal Communication Planning**:
- Eye contact and audience connection
- Posture and movement appropriateness
- Gesture and expression naturalness
- Proximity and engagement optimization

#### 4.2 Timing and Pacing Strategy
**Time Allocation Planning**:
- Introduction segment timing
- Main content delivery pacing
- Conclusion and Q&A preparation
- Buffer time for unexpected delays

**Pacing Technique Development**:
- Slow introduction for audience orientation
- Moderate pace for complex content delivery
- Accelerated delivery for review and summary
- Flexible adaptation for audience response

### Phase 5: Interaction and Engagement Strategy

#### 5.1 Audience Engagement Techniques
**Active Learning Integration**:
- Question posing and pause for thinking
- Polling and opinion gathering
- Small group discussion facilitation
- Interactive demonstration inclusion

**Attention Management Strategies**:
- Hook development and maintenance
- Variety and novelty incorporation
- Relevance connection reinforcement
- Energy level and enthusiasm projection

**Participation Encouragement Methods**:
- Question invitation and welcoming
- Discussion facilitation techniques
- Feedback solicitation approaches
- Follow-up engagement planning

#### 5.2 Question and Answer Preparation
**Anticipated Question Identification**:
- Methodology and design questions
- Result interpretation queries
- Implication and application questions
- Limitation and future direction inquiries

**Response Strategy Development**:
- Clear and concise answer preparation
- Evidence-based response foundation
- Bridge to key message maintenance
- Follow-up discussion encouragement

**Difficult Question Handling**:
- Honest limitation acknowledgment
- Alternative explanation provision
- Future research direction indication
- Expert consultation suggestion

### Phase 6: Technology and Logistics Planning

#### 6.1 Technical Setup and Testing
**Equipment Verification**:
- Projector and computer compatibility
- Microphone and sound system testing
- Remote presentation tool preparation
- Backup equipment availability

**Presentation Software Optimization**:
- Slide transition and timing setup
- Hyperlink and navigation testing
- Video and animation functionality
- Presenter view and note utilization

**Contingency Planning**:
- Technical failure backup strategies
- Alternative delivery method preparation
- Manual presentation capability
- Audience handout preparation

#### 6.2 Logistics and Coordination
**Venue and Timing Management**:
- Room setup and equipment testing
- Timing synchronization with program
- Speaker introduction coordination
- Transition and setup time management

**Material and Resource Coordination**:
- Handout printing and distribution
- Business card and contact exchange
- Signage and promotional material
- Follow-up material delivery planning

### Phase 7: Practice and Refinement Strategy

#### 7.1 Rehearsal Planning and Execution
**Practice Session Structure**:
- Full run-through timing and content
- Section-by-section detailed practice
- Q&A simulation and response testing
- Technical setup and timing practice

**Feedback Integration Process**:
- Peer review and feedback solicitation
- Self-recording and self-assessment
- Professional coaching utilization
- Iterative improvement implementation

**Performance Anxiety Management**:
- Relaxation and preparation techniques
- Positive visualization practice
- Confidence building exercises
- Success scenario mental rehearsal

#### 7.2 Refinement and Optimization
**Content Refinement Process**:
- Clarity and precision enhancement
- Redundancy elimination
- Flow and transition improvement
- Audience adaptation optimization

**Delivery Refinement Techniques**:
- Pacing and timing optimization
- Vocal variety and emphasis practice
- Body language and presence enhancement
- Audience connection strengthening

### Phase 8: Post-Presentation Strategy and Follow-up

#### 8.1 Immediate Post-Presentation Activities
**Audience Engagement Continuation**:
- Question and discussion facilitation
- Contact information exchange
- Follow-up discussion scheduling
- Additional resource provision

**Feedback Collection Planning**:
- Immediate reaction assessment
- Formal feedback form distribution
- Follow-up contact and discussion
- Continuous improvement data gathering

#### 8.2 Long-term Impact Maximization
**Relationship Building Opportunities**:
- Networking contact follow-up
- Collaboration discussion initiation
- Mentorship relationship development
- Professional network expansion

**Knowledge Dissemination Enhancement**:
- Presentation recording and sharing
- Written summary and key point distribution
- Additional resource and material provision
- Ongoing dialogue and discussion facilitation

### Phase 9: Measurement and Evaluation Planning

#### 9.1 Success Metric Definition
**Presentation Quality Metrics**:
- Content clarity and organization
- Visual aid effectiveness and appeal
- Delivery skill and engagement level
- Time management and pacing appropriateness

**Audience Response Metrics**:
- Question quantity and quality
- Engagement level and interaction
- Feedback score and comment analysis
- Follow-up contact and discussion generation

**Impact and Outcome Metrics**:
- Knowledge transfer effectiveness
- Attitude and opinion change measurement
- Behavior and practice modification assessment
- Long-term relationship and collaboration development

#### 9.2 Evaluation and Learning Process
**Self-Evaluation Framework**:
- Personal performance assessment
- Strength and improvement area identification
- Goal achievement evaluation
- Future presentation strategy adjustment

**Feedback Integration Strategy**:
- Constructive feedback extraction
- Positive reinforcement acknowledgment
- Actionable improvement identification
- Implementation planning and follow-through

### Phase 10: Professional Development and Growth

#### 10.1 Skill Development Planning
**Presentation Skill Enhancement**:
- Public speaking training pursuit
- Visual design skill development
- Audience analysis technique learning
- Technology proficiency improvement

**Content Expertise Development**:
- Research area knowledge deepening
- Current literature staying current
- Methodological skill enhancement
- Interdisciplinary perspective broadening

#### 10.2 Career Advancement Strategy
**Visibility and Recognition Building**:
- Conference participation expansion
- Speaking opportunity pursuit
- Publication and presentation linkage
- Professional network development

**Leadership and Influence Cultivation**:
- Mentorship and guidance provision
- Professional community contribution
- Thought leadership establishment
- Collaborative opportunity creation

## Presentation Planning Implementation Timeline

### Week 1-2: Analysis and Planning
- [ ] Audience and context analysis completion
- [ ] Core message and content strategy development
- [ ] Structure and flow planning
- [ ] Visual aid concept and design initiation

### Week 3: Content Development
- [ ] Detailed content outline creation
- [ ] Slide and visual material development
- [ ] Script and talking point preparation
- [ ] Supporting material creation

### Week 4: Practice and Refinement
- [ ] Full presentation rehearsal
- [ ] Timing and pacing optimization
- [ ] Delivery style refinement
- [ ] Q&A preparation and practice

### Day of Presentation: Execution
- [ ] Final content review and adjustment
- [ ] Technical setup and testing
- [ ] Mental preparation and warm-up
- [ ] Professional delivery execution

### Post-Presentation: Evaluation and Follow-up
- [ ] Immediate audience engagement
- [ ] Feedback collection and analysis
- [ ] Relationship building continuation
- [ ] Learning and improvement integration

## Success Factors for Research Presentations

1. **Audience-Centric Approach**: Tailor content and delivery to audience needs and interests
2. **Clear and Compelling Message**: Distill complex research into understandable and engaging narratives
3. **Professional Delivery**: Combine content expertise with effective presentation skills
4. **Active Engagement**: Foster interaction and dialogue throughout the presentation
5. **Preparation Excellence**: Thorough planning, practice, and contingency preparation
6. **Follow-Through**: Strong post-presentation engagement and relationship building

Plan and deliver your research presentation strategically to maximize impact, engagement, and professional advancement!`;
  }

  private generateImpactAssessmentPlanningPrompt(args: Record<string, any>): string {
    const researchType = args.research_type || 'applied research';
    const impactAreas = args.impact_areas ? args.impact_areas.split(',').map((a: string) => a.trim()) : ['academic', 'practice', 'policy'];
    const timeline = args.timeline_horizon || 'medium-term';
    const stakeholders = args.stakeholder_groups ? args.stakeholder_groups.split(',').map((s: string) => s.trim()) : ['researchers', 'practitioners'];

    return `# Research Impact Assessment Planning for ${researchType}

## Assessment Context
- **Research Type**: ${researchType}
- **Impact Areas**: ${impactAreas.join(', ')}
- **Timeline Horizon**: ${timeline}
- **Key Stakeholders**: ${stakeholders.join(', ')}

## Comprehensive Research Impact Assessment Planning Framework

### Phase 1: Impact Conceptualization and Theory Development

#### 1.1 Impact Definition and Scope
**Impact Dimension Identification**:
- **Academic Impact**: Knowledge advancement, theory development, methodological innovation
- **Economic Impact**: Cost savings, productivity improvements, market value creation
- **Social Impact**: Quality of life improvements, equity enhancement, community benefits
- **Environmental Impact**: Sustainability contributions, resource conservation, ecological benefits
- **Policy Impact**: Decision-making influence, regulatory changes, institutional reforms
- **Technological Impact**: Innovation adoption, technology transfer, capability enhancement

**Impact Scope Determination**:
- Direct vs. indirect impact pathways
- Intended vs. unintended consequences
- Short-term vs. long-term impact horizons
- Local vs. global impact scales

**Impact Attribution Challenges**:
- Causality establishment difficulties
- Contribution isolation complexities
- Time lag consideration
- Counterfactual scenario development

#### 1.2 Impact Theory Development
**Logic Model Construction**:
- Input identification and characterization
- Process and activity specification
- Output definition and measurement
- Outcome articulation and attribution
- Impact pathway mapping and validation

**Impact Hypothesis Formulation**:
- Expected impact trajectory prediction
- Contingency factor identification
- Threshold condition specification
- Interaction effect anticipation

### Phase 2: Impact Assessment Framework Development

#### 2.1 Assessment Methodology Selection
**Quantitative Assessment Methods**:
- **Bibliometric Analysis**: Citation counting, h-index calculation, field-normalized metrics
- **Econometric Modeling**: Cost-benefit analysis, return on investment calculation
- **Survey Research**: Stakeholder perception assessment, impact perception measurement
- **Secondary Data Analysis**: Administrative data utilization, existing database analysis

**Qualitative Assessment Methods**:
- **Case Study Analysis**: In-depth impact examination, contextual factor exploration
- **Stakeholder Interviews**: Experience and perception gathering, story and narrative collection
- **Document Analysis**: Policy change documentation, implementation record review
- **Participatory Evaluation**: Stakeholder involvement, collaborative assessment approach

**Mixed Methods Integration**:
- **Sequential Explanatory Design**: Quantitative impact identification, qualitative explanation
- **Concurrent Triangulation**: Multiple method convergence, result validation
- **Embedded Design**: Qualitative insights in quantitative framework
- **Multi-Phase Design**: Assessment evolution, adaptive methodology application

#### 2.2 Indicator and Metric Development
**Input Indicators**:
- Research funding amount and source diversity
- Researcher expertise and team composition
- Institutional support and infrastructure quality
- Collaboration network extent and quality

**Output Indicators**:
- Publication quantity and quality metrics
- Intellectual property creation and protection
- Research tool and method development
- Dataset creation and accessibility

**Outcome Indicators**:
- Knowledge utilization and application evidence
- Practice change documentation and measurement
- Policy influence and decision-making impact
- Economic benefit quantification and attribution

**Impact Indicators**:
- Sustainable change evidence and durability
- Scalability and transferability demonstration
- Unintended consequence identification
- Long-term societal benefit realization

### Phase 3: Data Collection and Measurement Strategy

#### 3.1 Data Source Identification
**Primary Data Sources**:
- Researcher and team member interviews
- Funding agency and institutional records
- Stakeholder and beneficiary surveys
- Implementation and utilization documentation

**Secondary Data Sources**:
- Citation database and bibliometric information
- Patent and intellectual property records
- Policy document and regulatory filing analysis
- Economic and social indicator databases
- Media coverage and public attention metrics

**Real-Time Data Sources**:
- Web analytics and usage tracking
- Social media mention and engagement monitoring
- Download and access statistics
- Implementation and adoption metrics

#### 3.2 Measurement Strategy Development
**Baseline Establishment**:
- Pre-research condition documentation
- Comparison group or counterfactual identification
- Trend analysis and contextual factor consideration
- Attribution strategy and contribution isolation

**Longitudinal Tracking**:
- Timeline milestone establishment
- Regular assessment point definition
- Data collection schedule development
- Change trajectory documentation

**Triangulation Approach**:
- Multiple data source integration
- Diverse stakeholder perspective inclusion
- Mixed method validation approach
- Convergence and divergence analysis

### Phase 4: Stakeholder Engagement and Communication

#### 4.1 Stakeholder Mapping and Analysis
**Primary Stakeholder Groups**:
- **Researchers and Academics**: Knowledge advancement, career development
- **Practitioners and Professionals**: Application relevance, implementation support
- **Policy Makers and Government**: Decision-making influence, regulatory impact
- **Industry and Business**: Economic benefit, innovation adoption
- **Community and Public**: Social benefit, quality of life improvement

**Stakeholder Interest Assessment**:
- Information need identification
- Engagement level determination
- Influence and importance evaluation
- Communication preference understanding

**Stakeholder Engagement Strategy**:
- Participation level determination (inform, consult, involve, collaborate)
- Engagement method selection (surveys, interviews, workshops, advisory boards)
- Communication frequency and format planning
- Feedback integration and response planning

#### 4.2 Communication Strategy Development
**Impact Narrative Development**:
- Compelling story creation and articulation
- Evidence-based impact demonstration
- Contextual factor integration
- Success factor and challenge balancing

**Communication Channel Selection**:
- Academic publication and conference presentation
- Policy brief and government report submission
- Media release and public communication
- Stakeholder-specific tailored messaging

**Timing and Sequencing Strategy**:
- Impact milestone identification and celebration
- Communication cadence establishment
- Story evolution and development tracking
- Long-term impact narrative cultivation

### Phase 5: Evaluation Design and Implementation

#### 5.1 Evaluation Framework Construction
**Evaluation Question Development**:
- Impact achievement assessment questions
- Attribution and contribution analysis questions
- Contextual factor influence evaluation questions
- Sustainability and scalability examination questions

**Evaluation Criteria Establishment**:
- **Relevance**: Research addresses important needs and priorities
- **Effectiveness**: Research achieves intended outcomes and impacts
- **Efficiency**: Research achieves impacts cost-effectively
- **Sustainability**: Research impacts endure over time
- **Scalability**: Research impacts can be expanded and replicated

**Logic Framework Development**:
- Assumption testing and validation
- Risk and threat identification
- Critical path and dependency mapping
- Success factor and barrier analysis

#### 5.2 Implementation Planning
**Timeline Development**:
- Baseline assessment and data collection
- Process tracking and monitoring
- Outcome evaluation and measurement
- Impact assessment and attribution
- Dissemination and utilization planning

**Resource Requirement Assessment**:
- Personnel and expertise needs
- Data collection and analysis resources
- Technology and tool requirements
- Budget and funding considerations

**Quality Assurance Procedures**:
- Data validation and verification processes
- Analysis reliability and validity checks
- Stakeholder validation and feedback integration
- Independent review and audit procedures

### Phase 6: Analysis and Interpretation Strategy

#### 6.1 Analytical Approach Development
**Quantitative Analysis Methods**:
- **Descriptive Statistics**: Central tendency, variability, distribution analysis
- **Inferential Statistics**: Significance testing, confidence interval estimation
- **Econometric Methods**: Regression analysis, impact evaluation modeling
- **Time Series Analysis**: Trend identification, forecasting model development

**Qualitative Analysis Methods**:
- **Thematic Analysis**: Pattern and theme identification, content categorization
- **Content Analysis**: Document and text analysis, coding and classification
- **Narrative Analysis**: Story and experience interpretation, meaning making
- **Framework Analysis**: Deductive category application, structured analysis

**Integration Strategies**:
- **Data Transformation**: Qualitative to quantitative conversion
- **Joint Display**: Side-by-side quantitative and qualitative result presentation
- **Meta-Inference Development**: Cross-method insight integration
- **Paradigm Bridging**: Quantitative and qualitative perspective integration

#### 6.2 Interpretation Framework
**Causal Attribution Analysis**:
- Contribution vs. attribution distinction
- Necessary vs. sufficient condition evaluation
- Direct vs. indirect impact pathway assessment
- Short-term vs. long-term impact differentiation

**Contextual Factor Integration**:
- Facilitating and hindering factor identification
- Interaction effect and moderation analysis
- Implementation quality and fidelity assessment
- External factor and environmental influence consideration

**Value and Significance Assessment**:
- Practical significance vs. statistical significance evaluation
- Stakeholder value and benefit assessment
- Cost-benefit and return on investment analysis
- Societal and public good contribution evaluation

### Phase 7: Reporting and Dissemination Strategy

#### 7.1 Impact Report Development
**Report Structure and Content**:
- Executive summary with key finding highlights
- Methodology and approach description
- Result and impact presentation
- Interpretation and implication discussion
- Recommendation and future direction articulation

**Audience-Specific Reporting**:
- **Academic Reports**: Detailed methodology, theoretical implications, comprehensive references
- **Policy Reports**: Executive summaries, actionable recommendations, political context consideration
- **Practitioner Reports**: Practical implications, implementation guidance, case examples
- **Public Reports**: Accessible language, compelling narratives, visual presentation

**Evidence Integration Strategy**:
- Quantitative data visualization and presentation
- Qualitative evidence and quote integration
- Mixed method result synthesis and presentation
- Uncertainty and limitation transparent communication

#### 7.2 Dissemination Strategy
**Targeted Communication Approach**:
- **Academic Dissemination**: Journal publications, conference presentations, academic networks
- **Policy Dissemination**: Policy briefs, government submissions, legislative testimony
- **Practice Dissemination**: Professional association publications, training workshops, implementation guides
- **Public Dissemination**: Media releases, social media campaigns, public presentations

**Channel and Timing Optimization**:
- Communication channel selection based on audience preference
- Timing alignment with policy cycles and decision-making processes
- Sequential dissemination strategy for maximum impact
- Feedback loop establishment for continuous improvement

### Phase 8: Sustainability and Continuous Monitoring

#### 8.1 Long-term Impact Tracking
**Monitoring Framework Development**:
- Key performance indicator identification
- Regular assessment schedule establishment
- Data collection and analysis procedures
- Reporting and communication protocols

**Adaptive Management Approach**:
- Regular review and adjustment processes
- Course correction and improvement implementation
- Scaling and expansion opportunity identification
- Sustainability factor monitoring and enhancement

#### 8.2 Legacy and Continuation Planning
**Knowledge Preservation Strategy**:
- Documentation and archiving procedures
- Institutional memory development
- Success story and lesson learned capture
- Best practice and methodology dissemination

**Ongoing Impact Maximization**:
- Follow-up study and evaluation planning
- Replication and scaling strategy development
- Continuous improvement and adaptation processes
- Stakeholder relationship maintenance and cultivation

### Phase 9: Ethical and Responsible Assessment

#### 9.1 Assessment Ethics Considerations
**Stakeholder Protection**:
- Privacy and confidentiality maintenance
- Informed consent for data collection
- Cultural sensitivity and respect
- Power dynamic awareness and mitigation

**Evidence-Based Assessment**:
- Rigorous and systematic evaluation approach
- Bias minimization and transparency
- Multiple perspective integration
- Limitation and uncertainty acknowledgment

**Responsible Communication**:
- Balanced and accurate impact representation
- Contextual factor and limitation disclosure
- Stakeholder validation and feedback integration
- Continuous learning and improvement commitment

#### 9.2 Impact Assessment Standards
**Quality Standards Adherence**:
- **Utility**: Assessment serves information needs of intended users
- **Feasibility**: Assessment is practical and cost-effective
- **Propriety**: Assessment is conducted ethically and legally
- **Accuracy**: Assessment results are correct and reliable

**Professional Standards Compliance**:
- Field-specific evaluation standards adherence
- Professional code of ethics compliance
- Institutional review board approval
- Peer review and validation processes

### Phase 10: Integration and Learning

#### 10.1 Organizational Learning Integration
**Knowledge Capture and Sharing**:
- Lesson learned documentation and dissemination
- Best practice identification and sharing
- Process improvement implementation
- Training and capacity building

**Feedback Loop Establishment**:
- Stakeholder feedback collection and analysis
- Assessment result utilization for improvement
- Continuous learning culture development
- Adaptive management practice implementation

#### 10.2 Future Assessment Planning
**Assessment Program Development**:
- Regular impact assessment scheduling
- Methodology refinement and improvement
- Technology and tool enhancement
- Capacity building and training expansion

**Strategic Impact Planning**:
- Long-term impact goal setting
- Resource allocation and prioritization
- Partnership and collaboration development
- Sustainability and scalability planning

## Impact Assessment Planning Implementation Roadmap

### Month 1-2: Foundation and Planning
- [ ] Impact conceptualization and theory development
- [ ] Assessment framework and methodology selection
- [ ] Indicator and metric development
- [ ] Stakeholder engagement strategy formulation

### Month 3-4: Design and Preparation
- [ ] Evaluation design and implementation planning
- [ ] Data collection and measurement strategy development
- [ ] Communication and dissemination planning
- [ ] Resource and capacity requirement assessment

### Month 5-6: Implementation and Data Collection
- [ ] Baseline and initial data collection
- [ ] Process tracking and monitoring setup
- [ ] Stakeholder engagement and communication
- [ ] Quality assurance and validation procedures

### Month 7-12: Analysis and Reporting
- [ ] Data analysis and interpretation
- [ ] Impact attribution and assessment
- [ ] Report development and validation
- [ ] Dissemination and utilization planning

### Ongoing: Monitoring and Adaptation
- [ ] Long-term impact tracking and monitoring
- [ ] Adaptive management and course correction
- [ ] Continuous improvement and learning
- [ ] Sustainability and legacy planning

## Success Metrics for Impact Assessment Planning

1. **Comprehensive Coverage**: All relevant impact areas and stakeholder groups addressed
2. **Methodological Rigor**: Assessment approach is systematic, valid, and reliable
3. **Stakeholder Engagement**: Meaningful involvement of all relevant stakeholders
4. **Actionable Insights**: Results provide clear guidance for future decisions and actions
5. **Sustainable Impact**: Assessment framework supports ongoing monitoring and improvement

Plan and execute your research impact assessment systematically to maximize understanding, learning, and future impact optimization!`;
  }

  private generateResearchDisseminationStrategyPrompt(args: Record<string, any>): string {
    const findings = args.research_findings || 'key research findings';
    const audiences = args.target_audiences ? args.target_audiences.split(',').map((a: string) => a.trim()) : ['academic', 'practice', 'policy'];
    const channels = args.dissemination_channels ? args.dissemination_channels.split(',').map((c: string) => c.trim()) : ['academic', 'social media'];
    const constraints = args.resource_constraints || 'limited resources and time';

    return `# Research Dissemination Strategy for "${findings}"

## Dissemination Context
- **Key Findings**: ${findings}
- **Target Audiences**: ${audiences.join(', ')}
- **Channels**: ${channels.join(', ')}
- **Constraints**: ${constraints}

## Strategic Framework

This prompt would provide comprehensive guidance for research dissemination strategy development, including audience analysis, channel selection, timeline planning, and impact measurement.

For detailed dissemination planning, consider:
1. Audience segmentation and messaging adaptation
2. Multi-channel communication strategy
3. Timeline optimization for maximum impact
4. Resource allocation and budget planning
5. Success metrics and evaluation frameworks

Develop and execute a comprehensive research dissemination strategy to maximize your research impact, reach, and utilization!`;
  }

  private generateSystematicReviewProtocolPrompt(args: Record<string, any>): string {
    const reviewQuestion = args.review_question || 'systematic review question';
    const inclusionCriteria = args.inclusion_criteria || 'inclusion criteria';
    const searchStrategy = args.search_strategy || 'search strategy';

    return `# Systematic Review Protocol Development

## Review Overview
- **Research Question**: ${reviewQuestion}
- **Inclusion Criteria**: ${inclusionCriteria}
- **Search Strategy**: ${searchStrategy}

## Comprehensive Systematic Review Protocol Framework

### Phase 1: Protocol Development and Registration

#### 1.1 Research Question Refinement
**PICO Framework Application**:
- **Population**: Who is the target population?
- **Intervention**: What is the intervention or exposure?
- **Comparison**: What is the comparison or control?
- **Outcome**: What are the outcomes of interest?

**Question Refinement Process**:
- Stakeholder consultation and input
- Scope limitation and feasibility assessment
- Question clarity and answerability verification
- Protocol registration preparation

#### 1.2 Protocol Registration
**Registration Platform Selection**:
- PROSPERO (health and social care)
- Open Science Framework (OSF)
- Cochrane Database of Systematic Reviews
- Campbell Collaboration
- INPLASY (preclinical and clinical studies)

**Registration Requirements**:
- Detailed protocol documentation
- Review team composition specification
- Timeline and milestone establishment
- Quality assurance procedure description

### Phase 2: Eligibility Criteria Development

#### 2.1 Study Design Inclusion
**Quantitative Studies**:
- Randomized controlled trials (RCTs)
- Quasi-experimental designs
- Cohort studies (prospective/retrospective)
- Case-control studies
- Cross-sectional studies

**Qualitative Studies**:
- Phenomenological studies
- Grounded theory studies
- Ethnographic research
- Case study research
- Narrative inquiry

**Mixed Methods Studies**:
- Convergent parallel designs
- Explanatory sequential designs
- Exploratory sequential designs
- Embedded designs

#### 2.2 Population and Sample Criteria
**Participant Characteristics**:
- Age range and developmental stage
- Gender and demographic considerations
- Geographic and cultural scope
- Clinical or diagnostic criteria

**Setting Specifications**:
- Healthcare facility types
- Educational institution levels
- Community and organizational contexts
- Geographic location limitations

### Phase 3: Search Strategy Development

#### 3.1 Information Source Identification
**Electronic Database Selection**:
- Discipline-specific databases (PubMed, CINAHL, PsycINFO)
- Multidisciplinary databases (Web of Science, Scopus)
- Regional databases (Latin American/Caribbean Health Sciences)
- Specialty databases (Cochrane, JBI, Campbell)

**Grey Literature Sources**:
- Conference proceedings and abstracts
- Dissertation and thesis repositories
- Government and organizational reports
- Professional association publications

#### 3.2 Search Term Development
**Keyword Identification**:
- Controlled vocabulary (MeSH, CINAHL Headings)
- Free-text keywords and synonyms
- Truncation and wildcard usage
- Spelling variation consideration

**Boolean Logic Construction**:
- AND operators for concept combination
- OR operators for synonym inclusion
- NOT operators for concept exclusion
- Nested parentheses for complex queries

### Phase 4: Study Selection Process

#### 4.1 Screening Methodology
**Title and Abstract Screening**:
- Inclusion/exclusion criteria application
- Calibration exercise implementation
- Inter-rater reliability assessment
- Conflict resolution procedures

**Full-Text Screening**:
- Complete article retrieval and review
- Detailed eligibility assessment
- Reason for exclusion documentation
- Quality appraisal integration

#### 4.2 Quality Assessment Framework
**Study Quality Evaluation**:
- Risk of bias assessment tools
- Quality appraisal checklists
- Validity and reliability evaluation
- Reporting quality assessment

**Critical Appraisal Tools**:
- Cochrane Risk of Bias tool (RCTs)
- Newcastle-Ottawa Scale (observational studies)
- CASP checklists (qualitative research)
- GRADE approach (evidence quality)

### Phase 5: Data Extraction Strategy

#### 5.1 Data Extraction Form Development
**Study Characteristics**:
- Author, publication year, journal
- Study design and methodology
- Sample size and participant characteristics
- Setting and geographic location

**Intervention/Exposure Details**:
- Intervention description and components
- Comparison condition specification
- Intervention fidelity measures
- Implementation quality indicators

#### 5.2 Outcome Data Collection
**Quantitative Outcomes**:
- Effect sizes and confidence intervals
- Statistical significance levels
- Raw data for meta-analysis
- Subgroup analysis results

**Qualitative Outcomes**:
- Key themes and findings
- Supporting quotations
- Contextual factors
- Researcher reflexivity notes

### Phase 6: Data Synthesis Planning

#### 6.1 Synthesis Approach Selection
**Narrative Synthesis**:
- Thematic analysis and categorization
- Cross-study pattern identification
- Conceptual framework development
- Subgroup analysis integration

**Quantitative Synthesis (Meta-Analysis)**:
- Effect size calculation methods
- Heterogeneity assessment procedures
- Publication bias evaluation
- Sensitivity analysis planning

**Mixed Methods Synthesis**:
- Quantitative and qualitative integration
- Threaded analysis approach
- Typological analysis methods
- Mixed methods review procedures

#### 6.2 Heterogeneity Assessment
**Clinical Heterogeneity**:
- Population characteristic differences
- Intervention variation assessment
- Outcome measure diversity
- Study quality variation

**Methodological Heterogeneity**:
- Study design differences
- Quality assessment variation
- Data extraction consistency
- Analysis approach diversity

### Phase 7: Risk of Bias and Quality Assessment

#### 7.1 Bias Assessment Tools
**Selection Bias Evaluation**:
- Random sequence generation assessment
- Allocation concealment evaluation
- Baseline characteristic comparison
- Inclusion/exclusion criteria consistency

**Performance and Detection Bias**:
- Blinding assessment (participants, personnel, outcome assessors)
- Intervention fidelity evaluation
- Contamination prevention measures
- Detection bias minimization strategies

#### 7.2 Quality Appraisal Integration
**Study Quality Scoring**:
- Quality checklist completion
- Scoring system development
- Quality threshold establishment
- Sensitivity analysis preparation

**Quality-Based Subgroup Analysis**:
- High vs. low quality study comparison
- Quality moderator analysis
- Robustness assessment
- Recommendation development

### Phase 8: Reporting Standards and Guidelines

#### 8.1 Systematic Review Reporting
**PRISMA Guidelines Adherence**:
- Title and abstract structure
- Introduction and methods detail
- Results presentation clarity
- Discussion and conclusion development

**Protocol Reporting Standards**:
- Research question clarity
- Eligibility criteria specification
- Information source comprehensiveness
- Data collection and analysis procedures

#### 8.2 Quality Assurance Procedures
**Review Team Calibration**:
- Screening and extraction practice sessions
- Inter-rater reliability assessment
- Ongoing calibration maintenance
- Quality control monitoring

**Documentation Standards**:
- Decision audit trail maintenance
- Exclusion reason documentation
- Quality assessment recording
- Data extraction verification

## Systematic Review Protocol Implementation Timeline

### Month 1: Planning and Protocol Development
- [ ] Research question finalization and PICO development
- [ ] Protocol registration and documentation
- [ ] Review team assembly and training
- [ ] Quality assurance procedures establishment

### Month 2: Search Strategy Development and Execution
- [ ] Comprehensive search strategy development
- [ ] Database and source identification
- [ ] Search execution and documentation
- [ ] Search result management and deduplication

### Month 3: Study Selection and Quality Assessment
- [ ] Title and abstract screening process
- [ ] Full-text retrieval and screening
- [ ] Quality assessment and critical appraisal
- [ ] Study selection finalization

### Month 4: Data Extraction and Synthesis
- [ ] Data extraction form development and testing
- [ ] Full data extraction completion
- [ ] Data synthesis approach implementation
- [ ] Preliminary analysis and interpretation

### Month 5: Reporting and Dissemination
- [ ] Comprehensive report writing
- [ ] PRISMA checklist completion
- [ ] Peer review and revision
- [ ] Publication and dissemination planning

## Success Metrics for Systematic Review Protocol

1. **Protocol Quality**: Comprehensive, clear, and reproducible methodology
2. **Search Comprehensiveness**: Thorough and systematic literature identification
3. **Study Selection Rigor**: Transparent and reproducible inclusion process
4. **Data Extraction Accuracy**: Reliable and consistent data collection
5. **Synthesis Appropriateness**: Methodologically sound evidence integration
6. **Reporting Completeness**: Full adherence to reporting standards

Develop and execute a rigorous systematic review protocol to ensure transparent, comprehensive, and trustworthy evidence synthesis!`;
  }

  private generateMetaAnalysisPlanningPrompt(args: Record<string, any>): string {
    const researchTopic = args.research_topic || 'research topic';
    const effectSizeType = args.effect_size_type || 'standardized mean difference';
    const heterogeneityAssessment = args.heterogeneity_assessment || 'I² statistic and Q-test';

    return `# Meta-Analysis Planning for "${researchTopic}"

## Meta-Analysis Context
- **Research Topic**: ${researchTopic}
- **Effect Size Type**: ${effectSizeType}
- **Heterogeneity Assessment**: ${heterogeneityAssessment}

## Comprehensive Meta-Analysis Planning Framework

### Phase 1: Meta-Analysis Justification and Feasibility

#### 1.1 Research Question Appropriateness
**Suitability Assessment**:
- Sufficient number of studies available
- Research question amenable to quantitative synthesis
- Study designs compatible with meta-analysis
- Outcome measures sufficiently similar

**Literature Review Completion**:
- Comprehensive systematic review prerequisite
- Study quality assessment completion
- Data extraction form development
- Individual study effect size calculation

#### 1.2 Feasibility Evaluation
**Study Availability Assessment**:
- Minimum study count requirements (typically 3-5+)
- Study quality and methodological similarity
- Outcome measure comparability
- Statistical data availability and extractability

**Resource Requirement Evaluation**:
- Statistical expertise availability
- Software access and proficiency
- Time commitment assessment
- Publication opportunity evaluation

### Phase 2: Effect Size Selection and Calculation

#### 2.1 Effect Size Type Determination
**Continuous Outcomes**:
- **Standardized Mean Difference (SMD)**: Cohen's d, Hedges' g
- **Raw Mean Difference**: When measures are identical
- **Response Ratio**: For ratio-level outcomes
- **Correlation Coefficient**: For relationship strength

**Dichotomous Outcomes**:
- **Odds Ratio (OR)**: For binary outcomes
- **Risk Ratio (RR)**: Relative risk measures
- **Risk Difference (RD)**: Absolute risk difference
- **Number Needed to Treat (NNT)**: Clinical significance

#### 2.2 Effect Size Calculation Methods
**From Published Statistics**:
- t-test results conversion
- F-test statistics transformation
- Correlation coefficients direct use
- Chi-square test conversions

**From Raw Data**:
- Mean and standard deviation calculations
- Frequency count analysis
- Pre-post comparison analysis
- Group difference computation

### Phase 3: Data Preparation and Coding

#### 3.1 Coding Scheme Development
**Study Characteristic Coding**:
- Author, publication year, journal
- Sample size and participant characteristics
- Study design and methodological features
- Intervention or exposure details

**Effect Size Coding**:
- Effect size magnitude and direction
- Standard error or confidence interval
- Sample size for each comparison
- Statistical significance indicators

#### 3.2 Data Extraction and Validation
**Extraction Protocol Development**:
- Multiple extractor training and calibration
- Extraction form development and testing
- Inter-rater reliability assessment
- Discrepancy resolution procedures

**Data Quality Control**:
- Extraction accuracy verification
- Outlier and error identification
- Missing data handling procedures
- Data transformation and standardization

### Phase 4: Heterogeneity Assessment and Exploration

#### 4.1 Heterogeneity Quantification
**Statistical Heterogeneity Measures**:
- **Cochran's Q Test**: Chi-square test for heterogeneity
- **I² Statistic**: Percentage of variation due to heterogeneity
- **Tau² (τ²)**: Between-study variance estimation
- **Prediction Interval**: Expected range for future studies

**Heterogeneity Magnitude Interpretation**:
- I² = 0-40%: Low heterogeneity
- I² = 30-60%: Moderate heterogeneity
- I² = 50-90%: Substantial heterogeneity
- I² = 75-100%: Considerable heterogeneity

#### 4.2 Heterogeneity Exploration
**Moderator Analysis Planning**:
- Study characteristic examination
- Methodological factor assessment
- Population difference evaluation
- Intervention variation analysis

**Subgroup Analysis Development**:
- A priori subgroup specification
- Post hoc exploration justification
- Multiple testing correction planning
- Clinical relevance assessment

### Phase 5: Meta-Analysis Model Selection

#### 5.1 Fixed vs. Random Effects Models
**Fixed Effects Model**:
- Assumes single true effect size
- Appropriate when studies are functionally identical
- Weights studies by inverse variance
- Narrower confidence intervals

**Random Effects Model**:
- Allows for between-study variation
- Appropriate when population of studies exists
- Incorporates between-study variance (τ²)
- Wider confidence intervals

**Model Selection Criteria**:
- Clinical heterogeneity assessment
- Methodological diversity evaluation
- Statistical heterogeneity testing
- Research question consideration

#### 5.2 Advanced Modeling Techniques
**Meta-Regression Analysis**:
- Moderator variable examination
- Continuous covariate analysis
- Categorical predictor assessment
- Interaction effect evaluation

**Network Meta-Analysis**:
- Multiple intervention comparison
- Indirect evidence incorporation
- Treatment ranking development
- Comparative effectiveness assessment

### Phase 6: Publication Bias Assessment

#### 6.1 Bias Detection Methods
**Funnel Plot Analysis**:
- Effect size vs. standard error plotting
- Asymmetry visual assessment
- Contour-enhanced funnel plots
- Trim-and-fill method application

**Statistical Tests for Asymmetry**:
- Egger's regression test
- Begg's rank correlation test
- Harbord's modified test
- Peters' test for small study effects

#### 6.2 Bias Adjustment Techniques
**Trim-and-Fill Method**:
- Missing study imputation
- Funnel plot asymmetry correction
- Adjusted effect size calculation
- Confidence interval modification

**Selection Model Approaches**:
- Copas selection model application
- Heckman selection correction
- IVhet model implementation
- Robust variance estimation

### Phase 7: Sensitivity and Robustness Analysis

#### 7.1 Sensitivity Testing
**Influence Analysis**:
- Individual study removal assessment
- Effect size change evaluation
- Confidence interval variation
- Heterogeneity modification

**Robustness Checks**:
- Different effect size calculations
- Alternative statistical models
- Various heterogeneity estimators
- Different inclusion criteria

#### 7.2 Cumulative Meta-Analysis
**Evidence Accumulation Assessment**:
- Chronological effect size plotting
- Evidence strength evaluation over time
- Publication bias temporal assessment
- Research agenda influence evaluation

### Phase 8: Reporting and Interpretation Standards

#### 8.1 PRISMA-MA Reporting Guidelines
**Meta-Analysis Specific Reporting**:
- Review protocol and registration
- Search strategy comprehensiveness
- Inclusion/exclusion criteria clarity
- Study selection process transparency

**Statistical Reporting Standards**:
- Effect size calculation methods
- Heterogeneity assessment results
- Model selection rationale
- Publication bias evaluation

#### 8.2 Forest Plot and Visualization
**Forest Plot Development**:
- Study identification and weighting
- Effect size and confidence intervals
- Overall effect size representation
- Heterogeneity visualization

**Additional Visualizations**:
- Funnel plot for bias assessment
- Galbraith plot for heterogeneity
- L'Abbe plot for event data
- Radial plot for meta-regression

### Phase 9: Software and Tool Selection

#### 9.1 Meta-Analysis Software Options
**Comprehensive Packages**:
- **R**: Comprehensive statistical environment
  - meta, metafor, netmeta packages
  - Advanced modeling capabilities
  - Custom visualization options

**User-Friendly Interfaces**:
- **RevMan (Review Manager)**: Cochrane Collaboration software
  - Standardized Cochrane reviews
  - Forest plot generation
  - Risk of bias assessment

**Commercial Software**:
- **Comprehensive Meta-Analysis**: User-friendly interface
  - Point-and-click analysis
  - Automated report generation
  - Publication-quality graphics

#### 9.2 Software Capability Assessment
**Required Features Evaluation**:
- Effect size calculation flexibility
- Model specification options
- Heterogeneity assessment tools
- Publication bias detection methods

**Learning Curve Consideration**:
- Software familiarity assessment
- Training resource availability
- Documentation quality evaluation
- Community support assessment

### Phase 10: Quality Assurance and Validation

#### 10.1 Analysis Validation Procedures
**Internal Consistency Checks**:
- Effect size calculation verification
- Data entry accuracy assessment
- Statistical analysis reproducibility
- Result consistency evaluation

**Peer Review Integration**:
- Statistical reviewer consultation
- Methodological expert input
- Content expert validation
- Interdisciplinary review incorporation

#### 10.2 Documentation and Transparency
**Analysis Documentation**:
- Complete syntax and code preservation
- Data manipulation record maintenance
- Decision rationale documentation
- Assumption specification recording

**Open Science Practices**:
- Data and code sharing preparation
- Replication material organization
- Pre-registration compliance
- Open access publication planning

## Meta-Analysis Planning Implementation Roadmap

### Month 1: Preparation and Planning
- [ ] Research question refinement for meta-analysis suitability
- [ ] Comprehensive literature review completion
- [ ] Effect size type selection and calculation method determination
- [ ] Software selection and proficiency development

### Month 2: Data Extraction and Preparation
- [ ] Data extraction protocol development and testing
- [ ] Individual study effect size calculation
- [ ] Data coding and entry completion
- [ ] Data quality control and validation

### Month 3: Preliminary Analysis and Model Selection
- [ ] Descriptive statistics and study characteristics summary
- [ ] Heterogeneity assessment and exploration
- [ ] Fixed vs. random effects model comparison
- [ ] Outlier and influence analysis

### Month 4: Main Analysis and Sensitivity Testing
- [ ] Primary meta-analysis model execution
- [ ] Publication bias assessment and adjustment
- [ ] Sensitivity and robustness analysis
- [ ] Moderator and subgroup analysis

### Month 5: Advanced Analysis and Reporting
- [ ] Meta-regression and advanced modeling if applicable
- [ ] Cumulative meta-analysis and evidence accumulation
- [ ] Comprehensive result interpretation
- [ ] PRISMA-MA compliant report writing

## Success Metrics for Meta-Analysis Planning

1. **Methodological Rigor**: Comprehensive and transparent methodology implementation
2. **Statistical Validity**: Appropriate model selection and assumption verification
3. **Clinical Relevance**: Meaningful effect size interpretation and practical implications
4. **Publication Quality**: High-quality reporting and visualization standards
5. **Reproducibility**: Complete documentation enabling replication by others

Plan and execute your meta-analysis systematically to provide the highest quality evidence synthesis for your research field!`;
  }

  private generateQualitativeCodingFrameworkPrompt(args: Record<string, any>): string {
    const dataType = args.data_type || 'interview transcripts';
    const analyticalApproach = args.analytical_approach || 'thematic analysis';
    const codingLevel = args.coding_level || 'open coding';

    return `# Qualitative Coding Framework for ${dataType}

## Coding Context
- **Data Type**: ${dataType}
- **Analytical Approach**: ${analyticalApproach}
- **Coding Level**: ${codingLevel}

## Comprehensive Qualitative Coding Framework

### Phase 1: Coding Preparation and Planning

#### 1.1 Research Question Alignment
**Coding Purpose Definition**:
- Research question direct connection
- Theoretical framework integration
- Phenomenon of interest specification
- Analytical goal clarification

**Coding Scope Determination**:
- Data subset selection rationale
- Coding unit definition (word, sentence, paragraph)
- Contextual consideration inclusion
- Boundary setting for analysis

#### 1.2 Coding System Development
**Code Development Strategy**:
- Inductive vs. deductive approach selection
- Initial code list creation
- Code definition and application rules
- Hierarchical code structure planning

**Codebook Development**:
- Code name and definition specification
- Inclusion/exclusion criteria establishment
- Example and non-example provision
- Coding rule documentation

### Phase 2: Coding Process Implementation

#### 2.1 ${codingLevel.charAt(0).toUpperCase() + codingLevel.slice(1)} Coding Procedures
**${codingLevel === 'open' ? 'Open Coding Process' : codingLevel === 'axial' ? 'Axial Coding Process' : 'Selective Coding Process'}**:
${codingLevel === 'open' ?
`- **Initial Reading**: Multiple data immersion passes
- **Code Generation**: Line-by-line code assignment
- **Category Development**: Similar code grouping
- **Constant Comparison**: Code refinement through comparison` :

codingLevel === 'axial' ?
`- **Category Examination**: Open code category analysis
- **Relationship Identification**: Category interconnections
- **Subcategory Development**: Category subdivision
- **Paradigm Model Creation**: Causal relationship mapping` :

`- **Core Category Selection**: Central phenomenon identification
- **Category Integration**: Around core category organization
- **Theoretical Saturation**: Category refinement completion
- **Theoretical Framework Development**: Comprehensive model creation`}

**Coding Consistency Maintenance**:
- Regular codebook consultation
- Coding decision documentation
- Inter-coder reliability assessment
- Code application rule adherence

### Phase 3: ${analyticalApproach.charAt(0).toUpperCase() + analyticalApproach.slice(1)} Implementation

#### 3.1 ${analyticalApproach === 'thematic' ? 'Thematic Analysis' : analyticalApproach === 'grounded theory' ? 'Grounded Theory' : analyticalApproach === 'content analysis' ? 'Content Analysis' : 'Framework Analysis'} Procedures
**${analyticalApproach === 'thematic' ? 'Thematic Analysis Steps' : analyticalApproach === 'grounded theory' ? 'Grounded Theory Procedures' : analyticalApproach === 'content analysis' ? 'Content Analysis Process' : 'Framework Analysis Stages'}**:
${analyticalApproach === 'thematic' ?
`- **Familiarization**: Data immersion and understanding
- **Initial Coding**: Basic code generation
- **Theme Search**: Pattern and theme identification
- **Theme Review**: Theme refinement and validation
- **Theme Definition**: Final theme naming and description
- **Report Production**: Analysis write-up and presentation` :

analyticalApproach === 'grounded theory' ?
`- **Open Coding**: Initial concept identification
- **Axial Coding**: Relationship development
- **Selective Coding**: Theory integration
- **Theoretical Saturation**: Data collection continuation until saturation
- **Theoretical Coding**: Theory refinement and validation
- **Memo Writing**: Theoretical idea documentation` :

analyticalApproach === 'content analysis' ?
`- **Unit Definition**: Analysis unit specification
- **Category Development**: Coding category creation
- **Coding Frame Application**: Systematic coding implementation
- **Category Refinement**: Category modification based on data
- **Frequency Analysis**: Code and category quantification
- **Interpretation**: Meaning and implication development` :

`- **Familiarization**: Data familiarization process
- **Thematic Framework Identification**: Key theme determination
- **Indexing**: Data thematic indexing application
- **Charting**: Thematic chart creation
- **Mapping**: Theme relationship exploration
- **Interpretation**: Key finding synthesis`}

### Phase 4: Quality Assurance and Rigor

#### 4.1 Coding Quality Control
**Inter-Coder Reliability Assessment**:
- Cohen's Kappa calculation for categorical items
- Percentage agreement for coding consistency
- Discrepancy discussion and resolution
- Ongoing reliability monitoring

**Intra-Coder Consistency Evaluation**:
- Periodic recoding of same passages
- Consistency percentage calculation
- Drift identification and correction
- Quality maintenance procedures

#### 4.2 Credibility Enhancement Strategies
**Triangulation Implementation**:
- **Data Triangulation**: Multiple data source utilization
- **Method Triangulation**: Multiple analytical method application
- **Investigator Triangulation**: Multiple analyst involvement
- **Theory Triangulation**: Multiple theoretical perspective integration

**Member Checking Procedures**:
- Participant validation of findings
- Interpretation accuracy verification
- Feedback integration into analysis
- Revised understanding development

### Phase 5: Software and Tool Utilization

#### 5.1 Qualitative Analysis Software Selection
**Software Capability Assessment**:
${dataType === 'interview transcripts' ?
`- **NVivo**: Advanced coding and thematic analysis features
- **Atlas.ti**: Network visualization and team collaboration
- **MAXQDA**: Mixed methods and statistical integration
- **Dedoose**: Web-based collaboration and mixed methods` :

dataType === 'survey responses' ?
`- **NVivo**: Text analysis and pattern recognition
- **QDA Miner**: Statistical analysis integration
- **MAXQDA**: Qualitative and quantitative integration
- **Atlas.ti**: Survey data coding and analysis` :

`- **NVivo**: Multimedia analysis capabilities
- **Atlas.ti**: Visual data coding and analysis
- **Transana**: Video transcription and analysis
- **ELAN**: Linguistic and gesture analysis`}

**Software Feature Evaluation**:
- Coding flexibility and hierarchy support
- Team collaboration capabilities
- Visualization and reporting options
- Data import/export compatibility
- Cost and learning curve assessment

### Phase 6: Thematic Development and Refinement

#### 6.1 Theme Identification Process
**Inductive Theme Development**:
- Bottom-up theme emergence from data
- Pattern recognition across data segments
- Theme abstraction and generalization
- Central theme identification

**Deductive Theme Application**:
- Theoretical framework theme application
- Existing theory data matching
- Framework refinement through data
- Theoretical saturation assessment

#### 6.2 Theme Refinement Techniques
**Theme Consolidation**:
- Similar theme merging
- Overlapping concept integration
- Redundant theme elimination
- Hierarchical theme organization

**Theme Definition and Naming**:
- Clear and concise theme labels
- Theme definition and boundary specification
- Representative data quote selection
- Theme prevalence documentation

### Phase 7: Interpretation and Theory Development

#### 7.1 Interpretive Framework Construction
**Contextual Interpretation**:
- Social and cultural context integration
- Historical factor consideration
- Power dynamic analysis
- Structural influence assessment

**Theoretical Integration**:
- Existing theory connection development
- Theoretical gap identification
- New theory generation potential
- Conceptual framework refinement

#### 7.2 Theoretical Saturation Assessment
**Saturation Criteria Evaluation**:
- No new codes emerging from data
- Category theoretical density achievement
- Relationship pattern stability
- Theoretical completeness assessment

**Saturation Documentation**:
- Data collection point of saturation
- Additional data analysis consideration
- Theoretical adequacy evaluation
- Interpretation confidence assessment

### Phase 8: Reporting and Presentation

#### 8.1 Qualitative Reporting Standards
**COREQ Checklist Adherence**:
- **Research Team**: Personal characteristics, reflexivity
- **Study Design**: Theoretical framework, participant selection
- **Data Collection**: Setting, data collection methods
- **Data Analysis**: Coding process, derivation of themes
- **Reporting**: Clarity of major themes, quotations

**Consolidated Criteria for Reporting Qualitative Research (COREQ)**:
- Domain 1: Research team and reflexivity
- Domain 2: Study design
- Domain 3: Analysis and findings

#### 8.2 Finding Presentation Strategies
**Thematic Presentation Structure**:
- Theme introduction with definition
- Representative quote inclusion
- Theme illustration with examples
- Analytical interpretation provision

**Visual Representation Development**:
- Thematic map creation
- Network diagram development
- Process model construction
- Conceptual framework visualization

### Phase 9: Validation and Verification

#### 9.1 Internal Validation Procedures
**Analytic Memo Development**:
- Coding decision rationale documentation
- Theme development process recording
- Theoretical insight capture
- Analysis progression tracking

**Audit Trail Maintenance**:
- Coding decision documentation
- Theme refinement tracking
- Theoretical development recording
- Interpretation evolution documentation

#### 9.2 External Validation Approaches
**Peer Debriefing Implementation**:
- Expert colleague consultation
- Analytical process discussion
- Alternative interpretation exploration
- Credibility enhancement through dialogue

**Expert Panel Review**:
- Content expert involvement
- Methodological expert consultation
- Stakeholder validation sessions
- Interdisciplinary review incorporation

### Phase 10: Reflexivity and Positionality

#### 10.1 Researcher Reflexivity Practice
**Positionality Acknowledgment**:
- Personal background influence recognition
- Professional experience impact assessment
- Theoretical orientation disclosure
- Value system influence identification

**Reflexive Journaling**:
- Analysis decision documentation
- Personal reaction recording
- Assumption identification
- Bias awareness development

#### 10.2 Reflexivity Integration
**Analysis Transparency**:
- Researcher background disclosure
- Analytical lens specification
- Positionality influence documentation
- Reflexive practice demonstration

**Credibility Enhancement**:
- Researcher bias acknowledgment
- Alternative interpretation consideration
- Personal influence assessment
- Transparency and honesty demonstration

## Qualitative Coding Framework Implementation Timeline

### Week 1-2: Preparation and Planning
- [ ] Research question and analytical approach alignment
- [ ] Coding system and codebook development
- [ ] Software selection and training
- [ ] Quality assurance procedures establishment

### Week 3-4: Initial Coding and Analysis
- [ ] Data familiarization and immersion
- [ ] Initial coding round completion
- [ ] Code refinement and consolidation
- [ ] Preliminary theme identification

### Week 5-6: Advanced Coding and Refinement
- [ ] Thematic development and refinement
- [ ] Relationship and connection analysis
- [ ] Theoretical integration consideration
- [ ] Saturation assessment and evaluation

### Week 7-8: Quality Assurance and Validation
- [ ] Inter-coder reliability assessment
- [ ] Member checking and validation
- [ ] Peer debriefing and review
- [ ] Credibility enhancement procedures

### Week 9-10: Final Analysis and Reporting
- [ ] Comprehensive interpretation development
- [ ] Visual representation creation
- [ ] Report writing and documentation
- [ ] Dissemination planning and preparation

## Success Metrics for Qualitative Coding Framework

1. **Analytical Rigor**: Systematic and transparent analytical process implementation
2. **Theoretical Grounding**: Clear theoretical framework and conceptual development
3. **Credibility**: Trustworthy and believable findings with validation procedures
4. **Auditability**: Clear documentation enabling analysis replication
5. **Fittingness**: Findings fit the data and context with stakeholder resonance
6. **Transparency**: Complete disclosure of analytical processes and decisions

Develop and execute a rigorous qualitative coding framework to ensure trustworthy, insightful, and impactful qualitative research findings!`;
  }

  private generateGrantProposalWritingPrompt(args: Record<string, any>): string {
    const fundingAgency = args.funding_agency || 'funding agency';
    const projectBudget = args.project_budget || 'project budget';
    const projectDuration = args.project_duration || 'project duration';

    return `# Grant Proposal Writing for ${fundingAgency}

## Grant Context
- **Funding Agency**: ${fundingAgency}
- **Project Budget**: ${projectBudget}
- **Project Duration**: ${projectDuration}

## Comprehensive Grant Proposal Writing Framework

### Phase 1: Grant Opportunity Analysis

#### 1.1 Funding Agency Research
**Agency Mission Alignment**:
- Agency priority area identification
- Mission statement analysis
- Strategic goal alignment assessment
- Past funding pattern review

**Review Criteria Understanding**:
- Evaluation rubric examination
- Scoring criteria identification
- Common rejection reason analysis
- Successful proposal characteristic study

#### 1.2 Proposal Requirement Analysis
**Application Component Identification**:
- Required sections and documents
- Page limits and formatting requirements
- Budget justification guidelines
- Timeline and milestone specifications

**Eligibility Verification**:
- Applicant qualification confirmation
- Institutional requirement compliance
- Collaboration necessity assessment
- Matching fund availability check

### Phase 2: Proposal Planning and Strategy

#### 2.1 Competitive Analysis
**Funding Landscape Assessment**:
- Similar proposal success rate analysis
- Funding availability trend evaluation
- Competition level estimation
- Success factor identification

**Unique Selling Proposition Development**:
- Project differentiation strategy
- Innovation emphasis development
- Impact potential articulation
- Team strength highlighting

#### 2.2 Timeline and Resource Planning
**Proposal Development Timeline**:
- Literature review completion target
- Draft writing milestone establishment
- Review and revision period allocation
- Final submission deadline management

**Team Resource Allocation**:
- Writing responsibility assignment
- Expertise area identification
- Review and feedback process
- Quality control procedure implementation

### Phase 3: Scientific Content Development

#### 3.1 Research Plan Construction
**Research Question Refinement**:
- Significance and innovation demonstration
- Feasibility evidence provision
- Gap in knowledge clear articulation
- Theoretical framework solid grounding

**Methodology Development**:
- Approach appropriateness justification
- Preliminary data inclusion
- Statistical power demonstration
- Potential limitation acknowledgment

#### 3.2 Expected Outcomes Specification
**Outcome Hierarchy Development**:
- Immediate outcome identification
- Intermediate impact specification
- Long-term goal articulation
- Measurable objective definition

**Evaluation Plan Creation**:
- Success metric establishment
- Data collection procedure specification
- Analysis approach determination
- Reporting timeline development

### Phase 4: Budget Development and Justification

#### 4.1 Budget Category Analysis
**Personnel Costs**:
- Salary and benefit calculation
- Effort percentage justification
- Role and responsibility alignment
- Institutional rate application

**Equipment and Supplies**:
- Necessary resource identification
- Cost justification provision
- Alternative sourcing consideration
- Sustainability planning inclusion

#### 4.2 Budget Narrative Development
**Cost Justification Strategy**:
- Essentiality demonstration
- Cost-effectiveness evidence
- Value for money argumentation
- Alternative approach comparison

**Budget Realism Assessment**:
- Market rate verification
- Institutional policy compliance
- Funding restriction adherence
- Cost-sharing contribution inclusion

### Phase 5: Writing and Communication Excellence

#### 5.1 Proposal Writing Best Practices
**Clarity and Conciseness**:
- Jargon minimization strategy
- Complex concept simplification
- Logical flow maintenance
- Reader-friendly language usage

**Persuasive Communication**:
- Compelling problem statement development
- Solution benefit clear articulation
- Team capability confident presentation
- Impact potential enthusiastic communication

#### 5.2 Section-Specific Writing Strategies
**Abstract/Summary Writing**:
- Hook development for attention capture
- Essential element inclusion strategy
- Concise language utilization
- Standalone comprehensibility assurance

**Introduction/Background Crafting**:
- Problem significance demonstration
- Knowledge gap clear articulation
- Solution potential exciting presentation
- Reader interest and investment generation

### Phase 6: Review and Revision Process

#### 6.1 Internal Review Strategy
**Peer Review Organization**:
- Content expert reviewer selection
- Methodological reviewer identification
- Writing quality reviewer assignment
- Funding agency criterion specialist inclusion

**Feedback Integration Process**:
- Constructive feedback extraction
- Revision priority establishment
- Response strategy development
- Quality improvement implementation

#### 6.2 External Review Preparation
**Mock Review Simulation**:
- Funding panel simulation
- Common concern anticipation
- Response preparation practice
- Weakness strengthening focus

**Pilot Testing Approach**:
- Preliminary reviewer consultation
- Feedback integration testing
- Proposal strength validation
- Improvement opportunity identification

### Phase 7: Submission Preparation

#### 7.1 Technical Compliance Verification
**Formatting Requirement Adherence**:
- Font, margin, spacing specification compliance
- Page limit strict observance
- Figure and table guideline following
- File format and naming convention adherence

**Content Requirement Verification**:
- All required section inclusion
- Word count limit compliance
- Reference style consistency
- Appendix material appropriateness

#### 7.2 Final Quality Assurance
**Proofreading and Editing**:
- Grammar and spelling error elimination
- Typographical mistake correction
- Consistency verification across sections
- Clarity and readability final check

**Fact-Checking Process**:
- Data accuracy verification
- Citation correctness confirmation
- Contact information validation
- Budget number accuracy assurance

### Phase 8: Post-Submission Activities

#### 8.1 Submission Confirmation and Tracking
**Submission Verification**:
- Receipt confirmation obtaining
- Submission completeness assurance
- Contact information accuracy verification
- Follow-up procedure establishment

**Review Timeline Tracking**:
- Decision timeline awareness
- Status update request planning
- Alternative funding source identification
- Resubmission preparation initiation

#### 8.2 Award Management Preparation
**Award Acceptance Planning**:
- Acceptance timeline understanding
- Institutional process familiarity
- Budget negotiation preparation
- Award condition compliance planning

**Project Initiation Readiness**:
- Team assembly preparation
- Resource acquisition planning
- Timeline development initiation
- Risk management strategy formulation

### Phase 9: Resubmission Strategy Development

#### 9.1 Rejection Analysis and Learning
**Feedback Integration Strategy**:
- Reviewer comment careful analysis
- Common theme identification
- Weakness systematic addressing
- Strength further development

**Rejection Reason Categorization**:
- Scientific merit concern identification
- Methodological issue recognition
- Budget or resource problem acknowledgment
- Presentation or writing issue diagnosis

#### 9.2 Resubmission Planning
**Timeline and Target Selection**:
- Appropriate resubmission timeline determination
- Alternative funding source identification
- Revised proposal scope consideration
- Team and resource adjustment planning

**Improvement Strategy Development**:
- Identified weakness targeted addressing
- Additional preliminary data inclusion
- Collaboration expansion consideration
- Impact potential enhancement focus

### Phase 10: Long-term Funding Strategy

#### 10.1 Funding Portfolio Development
**Diversification Strategy**:
- Multiple funding source identification
- Funding type variety inclusion
- Timeline staggering implementation
- Risk mitigation through diversification

**Relationship Building Approach**:
- Funding agency program officer connection
- Professional network development
- Collaboration opportunity cultivation
- Reputation building through quality work

#### 10.2 Career Funding Strategy
**Career Stage Funding Planning**:
- Early career pilot funding focus
- Mid-career larger grant targeting
- Senior career programmatic funding pursuit
- Career transition funding strategy adaptation

**Sustainability Focus**:
- Funding stream continuity planning
- Institutional support development
- Training grant consideration
- Endowment and philanthropy exploration

## Grant Proposal Writing Implementation Roadmap

### Month 1: Research and Planning
- [ ] Funding opportunity analysis and agency research
- [ ] Proposal requirement detailed review
- [ ] Competitive analysis and positioning strategy
- [ ] Team assembly and resource planning

### Month 2: Content Development
- [ ] Research plan and methodology development
- [ ] Expected outcomes and evaluation plan creation
- [ ] Budget development and justification preparation
- [ ] Timeline and milestone establishment

### Month 3: Writing and Refinement
- [ ] First draft completion across all sections
- [ ] Internal review and feedback integration
- [ ] Writing quality improvement and clarity enhancement
- [ ] Figure and table development and integration

### Month 4: Review and Finalization
- [ ] External review and mock panel simulation
- [ ] Revision and improvement implementation
- [ ] Final proofreading and quality assurance
- [ ] Submission package complete assembly

## Success Metrics for Grant Proposal Writing

1. **Competitive Advantage**: Clear differentiation from competing proposals
2. **Scientific Excellence**: Rigorous methodology and significant contribution demonstration
3. **Communication Clarity**: Compelling story told with clarity and persuasiveness
4. **Technical Compliance**: Perfect adherence to all agency requirements and guidelines
5. **Impact Potential**: Strong case made for significance and potential impact
6. **Feasibility Demonstration**: Convincing evidence of project successful completion

Write compelling, competitive grant proposals that secure funding and advance your research agenda!`;
  }

  private generateResearchNetworkingStrategyPrompt(args: Record<string, any>): string {
    const researchField = args.research_field || 'research field';
    const networkingGoals = args.networking_goals || 'networking goals';
    const availableTime = args.available_time || 'available time';

    return `# Research Networking Strategy for ${researchField}

## Networking Context
- **Research Field**: ${researchField}
- **Networking Goals**: ${networkingGoals}
- **Available Time**: ${availableTime}

## Comprehensive Research Networking Strategy Framework

### Phase 1: Networking Foundation and Goal Setting

#### 1.1 Networking Purpose Clarification
**Goal Hierarchy Development**:
- **Immediate Goals**: Short-term connection establishment
- **Intermediate Goals**: Collaboration opportunity creation
- **Long-term Goals**: Career advancement and recognition
- **Impact Goals**: Field contribution and influence building

**Networking Type Determination**:
- **Transactional Networking**: Specific resource or information seeking
- **Investigative Networking**: Learning and knowledge acquisition
- **Strategic Networking**: Career advancement and positioning
- **Generative Networking**: Mutual benefit and relationship building

#### 1.2 Personal Networking Style Assessment
**Communication Preference Identification**:
- **Introvert vs. Extrovert**: Energy source and interaction preference
- **Analytical vs. Intuitive**: Information processing approach
- **Thinking vs. Feeling**: Decision-making orientation
- **Judging vs. Perceiving**: Structure and flexibility preference

**Strength and Growth Area Identification**:
- **Existing Skills**: Current networking competency assessment
- **Development Needs**: Skill gap identification and prioritization
- **Comfort Zone Expansion**: Challenging interaction type exploration
- **Authenticity Maintenance**: Personal style honoring while growth pursuing

### Phase 2: Target Network Identification

#### 2.1 Stakeholder Mapping Development
**Primary Network Categories**:
- **Academic Colleagues**: Department, institution, and field researchers
- **Industry Professionals**: Practice application and commercialization experts
- **Policy Makers**: Research utilization and policy development influencers
- **Funding Agency Representatives**: Grant opportunity and requirement experts
- **Professional Association Leaders**: Field standard and trend setters

**Network Level Stratification**:
- **Operational Level**: Day-to-day collaboration and information exchange
- **Managerial Level**: Project coordination and resource allocation
- **Strategic Level**: Field direction and policy influence
- **Executive Level**: Institutional and system-level decision making

#### 2.2 Network Value Assessment
**Relationship Potential Evaluation**:
- **Knowledge Access**: Unique expertise and information availability
- **Resource Control**: Funding, equipment, or facility access potential
- **Influence Level**: Decision-making authority and impact scope
- **Collaboration Likelihood**: Working together interest and feasibility

**Network Diversity Planning**:
- **Disciplinary Diversity**: Different field and specialty representation
- **Geographic Diversity**: Local, national, and international connection balance
- **Career Stage Diversity**: Early, mid, and senior career researcher inclusion
- **Sector Diversity**: Academic, industry, government, and nonprofit balance

### Phase 3: Networking Approach and Strategy Development

#### 3.1 Entry Point Identification
**Conference and Meeting Strategy**:
- **Field-Specific Conferences**: Primary disciplinary gathering attendance
- **Cross-Disciplinary Events**: Interdisciplinary connection opportunity pursuit
- **Regional Meetings**: Local networking and relationship building focus
- **International Conferences**: Global perspective and connection development

**Digital Networking Approach**:
- **Professional Social Media**: LinkedIn, ResearchGate, Academia.edu utilization
- **Academic Networking Platforms**: Research networking site engagement
- **Field-Specific Online Communities**: Discussion forum and group participation
- **Virtual Collaboration Tools**: Online meeting and collaboration platform usage

#### 3.2 Communication and Interaction Planning
**Elevator Pitch Development**:
- **30-Second Introduction**: Research focus and interest clear articulation
- **Value Proposition Statement**: Unique contribution and expertise highlighting
- **Collaboration Interest Expression**: Working together possibility indication
- **Follow-up Request Inclusion**: Next step conversation initiation

**Conversation Starter Preparation**:
- **Current Trend Discussion**: Field recent development conversation initiation
- **Shared Interest Exploration**: Common research or professional interest identification
- **Resource Need Expression**: Assistance or collaboration need articulation
- **Mutual Benefit Proposition**: Collaborative opportunity suggestion

### Phase 4: Networking Event and Activity Planning

#### 4.1 Conference Strategy Development
**Pre-Conference Preparation**:
- **Attendee List Review**: Interesting participant identification
- **Presentation Planning**: Research presentation or poster preparation
- **Meeting Scheduling**: Pre-arranged meeting setup
- **Material Preparation**: Business card, one-pager, and handout creation

**During Conference Activities**:
- **Session Participation**: Relevant presentation and workshop attendance
- **Networking Event Engagement**: Reception and social event active participation
- **Informal Interaction**: Coffee break and meal conversation utilization
- **Follow-up Planning**: Contact information collection and next step planning

#### 4.2 Professional Association Engagement
**Association Involvement Strategy**:
- **Membership Benefits**: Organization membership value assessment
- **Committee Participation**: Working group and committee involvement
- **Leadership Role Pursuit**: Officer position and leadership opportunity seeking
- **Event Organization**: Conference and workshop planning contribution

**Publication and Communication Engagement**:
- **Journal Reviewing**: Manuscript review opportunity utilization
- **Editorial Board Participation**: Journal editorial involvement
- **Newsletter Contribution**: Field communication and information sharing
- **Social Media Management**: Association online presence contribution

### Phase 5: Digital Networking Strategy

#### 5.1 Online Presence Optimization
**Professional Profile Development**:
- **LinkedIn Optimization**: Professional profile completeness and engagement
- **ResearchGate/Academia.edu**: Academic profile development and maintenance
- **Personal Website**: Professional website creation and content strategy
- **ORCID Integration**: Researcher identifier consistency and linking

**Content Strategy Implementation**:
- **Research Sharing**: Publication and working paper dissemination
- **Thought Leadership**: Blog post and opinion piece contribution
- **Resource Sharing**: Tool, dataset, and resource availability announcement
- **Discussion Engagement**: Field discussion and debate active participation

#### 5.2 Digital Engagement Tactics
**Content Creation and Sharing**:
- **Blog Post Development**: Research insight and analysis sharing
- **Video Content Creation**: Research explanation and demonstration video
- **Infographic Development**: Research finding visual representation
- **Podcast Participation**: Research discussion and interview engagement

**Community Building Approach**:
- **Online Group Creation**: Field-specific discussion group establishment
- **Webinar Organization**: Virtual seminar and workshop hosting
- **Mentoring Program Development**: Early career researcher support program
- **Collaborative Project Initiation**: Online collaboration opportunity creation

### Phase 6: Relationship Development and Maintenance

#### 6.1 Relationship Building Process
**Initial Contact Strategy**:
- **Value-First Approach**: Help and value provision before request making
- **Common Ground Establishment**: Shared interest and experience identification
- **Authentic Connection**: Genuine interest and curiosity demonstration
- **Follow-up Commitment**: Continued engagement and relationship building

**Relationship Nurturing Tactics**:
- **Regular Communication**: Periodic check-in and update sharing
- **Resource Sharing**: Relevant article, opportunity, and information exchange
- **Collaboration Exploration**: Joint project and activity discussion
- **Mutual Support**: Professional development opportunity sharing

#### 6.2 Networking Etiquette and Best Practices
**Professional Communication Standards**:
- **Response Time**: Email and message prompt response maintenance
- **Gratitude Expression**: Help and assistance appreciation demonstration
- **Professional Boundaries**: Appropriate personal-professional balance maintenance
- **Confidentiality Respect**: Sensitive information protection and appropriate handling

**Networking Ethics Consideration**:
- **Authenticity Maintenance**: Genuine interest and relationship building
- **Manipulation Avoidance**: Hidden agenda and self-serving approach prevention
- **Diversity and Inclusion**: Broad and inclusive networking approach
- **Mutual Benefit Focus**: Reciprocal value and benefit creation

### Phase 7: Measurement and Evaluation Strategy

#### 7.1 Networking Success Metrics
**Quantitative Metrics**:
- **Connection Count**: New contact number and quality assessment
- **Engagement Level**: Interaction frequency and depth measurement
- **Collaboration Outcome**: Joint project and publication number
- **Resource Access**: Grant, equipment, or facility access achievement

**Qualitative Metrics**:
- **Relationship Quality**: Trust and rapport development assessment
- **Knowledge Gain**: New insight and learning acquisition
- **Opportunity Creation**: Career and professional development opportunity
- **Field Influence**: Research direction and policy impact contribution

#### 7.2 Progress Tracking and Adjustment
**Regular Assessment Schedule**:
- **Monthly Review**: Activity and outcome progress evaluation
- **Quarterly Assessment**: Goal achievement and strategy effectiveness review
- **Annual Reflection**: Overall networking impact and adjustment consideration
- **Ad hoc Evaluation**: Significant event or opportunity response

**Strategy Refinement Process**:
- **Success Factor Identification**: Working approach recognition and replication
- **Challenge Analysis**: Obstacle identification and solution development
- **Opportunity Recognition**: New networking possibility identification
- **Resource Reallocation**: Time and effort strategic redistribution

### Phase 8: Long-term Networking Strategy

#### 8.1 Career Stage Networking Adaptation
**Early Career Networking Focus**:
- **Mentorship Seeking**: Experienced researcher guidance and advice acquisition
- **Skill Development**: Training and workshop participation opportunity
- **Visibility Building**: Conference presentation and publication opportunity pursuit
- **Network Foundation Establishment**: Broad connection base development

**Mid-Career Networking Strategy**:
- **Leadership Development**: Committee and leadership role assumption
- **Collaboration Expansion**: Multi-institutional project leadership
- **Mentorship Provision**: Early career researcher support and guidance
- **Field Influence Building**: Policy and standard development participation

**Senior Career Networking Approach**:
- **Legacy Building**: Field advancement and sustainability contribution
- **International Connection**: Global collaboration and influence development
- **Policy Engagement**: Research utilization in policy development
- **Knowledge Transfer**: Research-to-practice translation facilitation

#### 8.2 Field Evolution Adaptation
**Emerging Trend Monitoring**:
- **Technology Advancement**: New tool and method development tracking
- **Interdisciplinary Opportunity**: Cross-field collaboration possibility identification
- **Policy Change Anticipation**: Funding and regulatory change preparation
- **Global Development Awareness**: International research trend monitoring

**Network Evolution Strategy**:
- **Connection Refreshing**: Existing relationship maintenance and updating
- **New Area Exploration**: Emerging field and topic investigation
- **Skill Update Planning**: New competency and knowledge acquisition
- **Adaptation Strategy Development**: Changing field need response planning

### Phase 9: Risk Management and Challenge Addressing

#### 9.1 Networking Challenge Anticipation
**Common Networking Obstacles**:
- **Time Constraint Management**: Limited availability effective utilization
- **Rejection Handling**: Unresponsive contact appropriate response development
- **Authenticity Maintenance**: Networking genuine interest preservation
- **Follow-through Assurance**: Commitment and promise delivery guarantee

**Personal Barrier Overcoming**:
- **Introversion Accommodation**: Small group and one-on-one preference utilization
- **Cultural Difference Navigation**: Cross-cultural communication skill development
- **Imposter Syndrome Management**: Accomplishment recognition and confidence building
- **Work-Life Balance Maintenance**: Professional and personal boundary establishment

#### 9.2 Ethical Networking Practice
**Networking Ethics Framework**:
- **Transparency Maintenance**: Intent and motivation clear communication
- **Mutual Benefit Focus**: Win-win relationship and opportunity creation
- **Confidentiality Protection**: Sensitive information appropriate handling
- **Credit Attribution**: Collaboration contribution proper acknowledgment

**Professional Integrity Preservation**:
- **Honesty in Representation**: Achievement and capability accurate presentation
- **Commitment Fulfillment**: Agreement and promise reliable delivery
- **Conflict of Interest Disclosure**: Potential conflict transparent communication
- **Professional Standard Adherence**: Field norm and ethical standard compliance

### Phase 10: Technology and Tool Integration

#### 10.1 Networking Technology Utilization
**Digital Networking Platforms**:
- **LinkedIn**: Professional connection and content sharing
- **ResearchGate**: Academic collaboration and paper sharing
- **Academia.edu**: Research profile and network building
- **ORCID**: Researcher identity and work linking

**Communication and Collaboration Tools**:
- **Zoom/Teams**: Virtual meeting and webinar hosting
- **Slack/Discord**: Research community and discussion participation
- **Trello/Asana**: Project collaboration and task management
- **Google Workspace**: Document sharing and collaborative writing

#### 10.2 Networking Analytics and Optimization
**Network Analysis Tools**:
- **Connection Mapping**: Relationship visualization and analysis
- **Engagement Tracking**: Interaction frequency and quality monitoring
- **Impact Measurement**: Networking outcome and benefit assessment
- **Opportunity Identification**: Potential collaboration automatic detection

**Personal Branding Development**:
- **Online Presence Optimization**: Professional profile and content strategy
- **Content Marketing**: Research insight and expertise demonstration
- **Thought Leadership Positioning**: Field contribution and influence establishment
- **Reputation Management**: Online presence and interaction monitoring

## Research Networking Strategy Implementation Roadmap

### Month 1-3: Foundation Building
- [ ] Networking goal clarification and personal assessment
- [ ] Target network identification and stakeholder mapping
- [ ] Online presence optimization and profile development
- [ ] Initial outreach strategy and communication planning

### Month 4-6: Active Networking
- [ ] Conference and event attendance and participation
- [ ] Professional association engagement and committee involvement
- [ ] Online community participation and content contribution
- [ ] One-on-one meeting and relationship building

### Month 7-9: Relationship Development
- [ ] Follow-up and relationship nurturing activities
- [ ] Collaboration opportunity exploration and initiation
- [ ] Mentorship relationship establishment and utilization
- [ ] Networking event organization and hosting

### Month 10-12: Expansion and Optimization
- [ ] Network expansion to new areas and connections
- [ ] Networking strategy evaluation and refinement
- [ ] Leadership role pursuit and responsibility assumption
- [ ] Long-term networking plan development and implementation

## Success Metrics for Research Networking Strategy

1. **Connection Quality**: High-value relationship establishment and maintenance
2. **Collaboration Outcomes**: Joint project, publication, and grant success
3. **Knowledge Access**: Unique information and resource acquisition
4. **Career Advancement**: Professional opportunity and recognition achievement
5. **Field Influence**: Research direction and practice impact contribution
6. **Personal Growth**: Networking skill development and confidence building

Develop and execute a strategic research networking approach to build valuable connections, access resources, and advance your research career!`;
  }

  private setupHandlers() {
    // Handle prompts
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;
      try {
        const prompt = researchPrompts.find(p => p.name === name);
        if (!prompt) {
          throw new Error(`Unknown prompt: ${name}`);
        }

        const promptContent = this.generateResearchPrompt(name, args);
        return {
          description: prompt.description,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: promptContent
            }
          }]
        };
      } catch (error) {
        throw new Error(`Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: researchPrompts };
    });

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

      // Handle research template and guide resources
      if (url.protocol === 'research:' && url.pathname.startsWith('//templates/')) {
        return this.handleResearchTemplates(url);
      }

      if (url.protocol === 'research:' && url.pathname.startsWith('//guides/methodology/')) {
        return this.handleMethodologyGuides(url);
      }

      if (url.protocol === 'research:' && url.pathname.startsWith('//citations/styles/')) {
        return this.handleCitationStyles(url);
      }

      // Handle writing resources
      if (url.protocol === 'writing:' && url.pathname.startsWith('//templates/')) {
        return this.handleWritingTemplates(url);
      }

      if (url.protocol === 'writing:' && url.pathname.startsWith('//guides/')) {
        return this.handleWritingGuides(url);
      }

      if (url.protocol === 'writing:' && url.pathname.startsWith('//checklists/')) {
        return this.handleWritingChecklists(url);
      }

      // Handle analysis resources
      if (url.protocol === 'analysis:' && url.pathname.startsWith('//guides/')) {
        return this.handleAnalysisGuides(url);
      }

      if (url.protocol === 'analysis:' && url.pathname.startsWith('//templates/')) {
        return this.handleAnalysisTemplates(url);
      }

      if (url.protocol === 'analysis:' && url.pathname.startsWith('//visualization/types/')) {
        return this.handleVisualizationGuides(url);
      }

      // Handle prompt resources
      if (url.protocol === 'prompts:' && url.pathname.startsWith('//research/')) {
        return this.handleResearchPrompts(url);
      }

      if (url.protocol === 'prompts:' && url.pathname.startsWith('//writing/')) {
        return this.handleWritingPrompts(url);
      }

      if (url.protocol === 'prompts:' && url.pathname.startsWith('//analysis/')) {
        return this.handleAnalysisPrompts(url);
      }

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

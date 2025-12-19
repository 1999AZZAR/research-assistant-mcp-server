import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Combined configuration schema for both Google Search and Wikipedia services
const envSchema = z.object({
  // Google Search Configuration
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CSE_ID: z.string().optional(),

  // Wikipedia Configuration
  CACHE_MAX: z.coerce.number().default(100),
  CACHE_TTL: z.coerce.number().default(300000), // 5 minutes in milliseconds
  DEFAULT_LANGUAGE: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).default('en'),
  ENABLE_DEDUPLICATION: z.coerce.boolean().default(true),
  USER_AGENT: z.string().optional(),

  // Server Configuration
  SERVER_NAME: z.string().default('combined-mcp-server'),
  SERVER_VERSION: z.string().default('1.0.0'),

  // General Configuration
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  LRU_CACHE_SIZE: z.coerce.number().default(500),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('❌ Configuration validation error:', result.error.format());
  process.exit(1);
}

const config = {
  // Google Search config
  google: {
    apiKey: result.data.GOOGLE_API_KEY,
    cseId: result.data.GOOGLE_CSE_ID,
  },

  // Wikipedia config
  wikipedia: {
    cache: {
      max: result.data.CACHE_MAX,
      ttl: result.data.CACHE_TTL,
    },
    defaultLanguage: result.data.DEFAULT_LANGUAGE,
    enableDeduplication: result.data.ENABLE_DEDUPLICATION,
    userAgent: result.data.USER_AGENT,
  },

  // Server config
  server: {
    name: result.data.SERVER_NAME,
    version: result.data.SERVER_VERSION,
    port: result.data.PORT,
  },

  // General config
  lruCacheSize: result.data.LRU_CACHE_SIZE,
  logLevel: result.data.LOG_LEVEL,
};

export default config;

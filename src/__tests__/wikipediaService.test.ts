import { EnhancedWikipediaService } from '../wikipediaService';
import LRUCache from 'lru-cache';

describe('EnhancedWikipediaService', () => {
  let service: EnhancedWikipediaService;
  let cache: LRUCache<string, any>;

  beforeEach(() => {
    cache = new LRUCache<string, any>({ max: 100, ttl: 300000 });
    service = new EnhancedWikipediaService({
      cache,
      enableDeduplication: true,
      defaultLanguage: 'en'
    });
  });

  test('should be instantiated correctly', () => {
    expect(service).toBeInstanceOf(EnhancedWikipediaService);
  });

  test('should have search method', () => {
    expect(typeof service.search).toBe('function');
  });

  test('should have getPage method', () => {
    expect(typeof service.getPage).toBe('function');
  });

  test('should have getPageById method', () => {
    expect(typeof service.getPageById).toBe('function');
  });

  test('should have getPageSummary method', () => {
    expect(typeof service.getPageSummary).toBe('function');
  });

  test('should have getRandomPage method', () => {
    expect(typeof service.getRandomPage).toBe('function');
  });

  test('should have healthCheck method', () => {
    expect(typeof service.healthCheck).toBe('function');
  });

  test('healthCheck should return proper structure', async () => {
    const health = await service.healthCheck();
    
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('endpoints');
    expect(health).toHaveProperty('cache');
    expect(health).toHaveProperty('deduplication');
    
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
  });

  // Note: Real API tests would require network access and might be flaky
  // For a real test suite, you'd want to mock the Wikipedia API responses
}); 
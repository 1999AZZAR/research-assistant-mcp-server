// Resilience utilities for robust error handling
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: (error: any) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: any;
  let delay = options.baseDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!options.retryableErrors(error)) {
        throw error;
      }

      // Don't delay on last attempt
      if (attempt === options.maxRetries) {
        break;
      }

      // Wait with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError;
}

export class WikipediaEndpointManager {
  private endpoints: string[];
  private currentEndpointIndex = 0;
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(language: string) {
    this.endpoints = [
      `https://${language}.wikipedia.org`,
      `https://${language}.m.wikipedia.org`, // Mobile endpoint as fallback
      // Add more mirrors/CDNs as needed
    ];

    // Initialize circuit breakers for each endpoint
    this.endpoints.forEach(endpoint => {
      this.circuitBreakers.set(endpoint, new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000 // 1 minute
      }));
    });
  }

  async makeRequest(path: string): Promise<Response> {
    const retryOptions: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      retryableErrors: (error) => {
        // Retry on network errors, 5xx errors, timeouts
        return error.name === 'TypeError' || 
               (error.status >= 500 && error.status < 600) ||
               error.name === 'TimeoutError';
      }
    };

    return retryWithBackoff(async () => {
      let lastError: any;

      // Try each endpoint
      for (let i = 0; i < this.endpoints.length; i++) {
        const endpointIndex = (this.currentEndpointIndex + i) % this.endpoints.length;
        const endpoint = this.endpoints[endpointIndex];
        const circuitBreaker = this.circuitBreakers.get(endpoint)!;

        try {
          return await circuitBreaker.execute(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            try {
              const response = await fetch(`${endpoint}${path}`, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Wikipedia-MCP-Server/1.0 (https://github.com/1999AZZAR/wikipedia-mcp-server)'
                }
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              // Success - make this the preferred endpoint
              this.currentEndpointIndex = endpointIndex;
              return response;
            } finally {
              clearTimeout(timeoutId);
            }
          });
        } catch (error) {
          lastError = error;
          console.warn(`Endpoint ${endpoint} failed:`, (error as Error).message);
          continue;
        }
      }

      throw lastError || new Error('All Wikipedia endpoints failed');
    }, retryOptions);
  }

  getEndpointStatus() {
    return this.endpoints.map(endpoint => ({
      endpoint,
      status: this.circuitBreakers.get(endpoint)?.getState()
    }));
  }
}

// Request deduplication
export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = operation().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 
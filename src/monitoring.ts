// Monitoring and observability for the Wikipedia MCP Server
export interface MetricEvent {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

export interface LogEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

export class MetricsCollector {
  private metrics: MetricEvent[] = [];
  private maxSize = 1000;

  record(name: string, value: number, tags: Record<string, string> = {}): void {
    const event: MetricEvent = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };

    this.metrics.push(event);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  increment(name: string, tags: Record<string, string> = {}): void {
    this.record(name, 1, tags);
  }

  timing(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.record(name, duration, { ...tags, unit: 'ms' });
  }

  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.record(name, value, { ...tags, type: 'gauge' });
  }

  getMetrics(since?: number): MetricEvent[] {
    if (since) {
      return this.metrics.filter(m => m.timestamp >= since);
    }
    return [...this.metrics];
  }

  getAggregatedMetrics(timeWindow = 300000): Record<string, any> { // 5 minutes default
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => m.timestamp >= now - timeWindow);
    
    const aggregated: Record<string, any> = {};
    
    recentMetrics.forEach(metric => {
      const key = `${metric.name}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
          tags: metric.tags
        };
      }
      
      const agg = aggregated[key];
      agg.count++;
      agg.sum += metric.value;
      agg.min = Math.min(agg.min, metric.value);
      agg.max = Math.max(agg.max, metric.value);
      agg.avg = agg.sum / agg.count;
    });
    
    return aggregated;
  }
}

export class Logger {
  private logs: LogEvent[] = [];
  private maxSize = 500;

  private log(level: LogEvent['level'], message: string, context?: Record<string, any>, requestId?: string): void {
    const event: LogEvent = {
      level,
      message,
      context,
      timestamp: Date.now(),
      requestId
    };

    this.logs.push(event);
    
    // Console log for immediate visibility
    const logData = { ...event, timestamp: new Date(event.timestamp).toISOString() };
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(logData));
    
    // Keep only recent logs
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  info(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log('info', message, context, requestId);
  }

  warn(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log('warn', message, context, requestId);
  }

  error(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log('error', message, context, requestId);
  }

  debug(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log('debug', message, context, requestId);
  }

  getLogs(level?: LogEvent['level'], since?: number): LogEvent[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    if (since) {
      filtered = filtered.filter(log => log.timestamp >= since);
    }
    
    return filtered;
  }
}

export class PerformanceMonitor {
  private timers = new Map<string, number>();
  
  constructor(
    private metrics: MetricsCollector,
    private logger: Logger
  ) {}

  startTimer(operation: string, requestId?: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, Date.now());
    
    this.logger.debug(`Started timer for ${operation}`, { operation }, requestId);
    return timerId;
  }

  endTimer(timerId: string, tags: Record<string, string> = {}): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      this.logger.warn(`Timer not found: ${timerId}`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(timerId);
    
    const operation = tags.operation || 'unknown';
    this.metrics.timing(`operation_duration`, duration, tags);
    
    this.logger.debug(`Completed ${operation}`, { duration, ...tags });
    
    return duration;
  }

  async monitorAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {},
    requestId?: string
  ): Promise<T> {
    const timerId = this.startTimer(operation, requestId);
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = this.endTimer(timerId, { ...tags, operation, status: 'success' });
      
      this.metrics.increment('operation_success', { operation, ...tags });
      this.logger.info(`${operation} completed successfully`, { duration, ...tags }, requestId);
      
      return result;
    } catch (error) {
      const duration = this.endTimer(timerId, { ...tags, operation, status: 'error' });
      
      this.metrics.increment('operation_error', { operation, ...tags });
      this.logger.error(`${operation} failed`, { 
        duration, 
        error: (error as Error).message, 
        ...tags 
      }, requestId);
      
      throw error;
    }
  }
}

export class UsageAnalytics {
  private requests: Array<{
    method: string;
    params: any;
    timestamp: number;
    requestId: string;
    duration?: number;
    success: boolean;
    errorType?: string;
    userAgent?: string;
    language?: string;
  }> = [];
  
  private maxSize = 2000;

  recordRequest(data: {
    method: string;
    params: any;
    requestId: string;
    duration?: number;
    success: boolean;
    errorType?: string;
    userAgent?: string;
    language?: string;
  }): void {
    this.requests.push({
      ...data,
      timestamp: Date.now()
    });
    
    // Keep only recent requests
    if (this.requests.length > this.maxSize) {
      this.requests = this.requests.slice(-this.maxSize);
    }
  }

  getUsageStats(timeWindow = 3600000): { // 1 hour default
    total: number;
    byMethod: Record<string, number>;
    byLanguage: Record<string, number>;
    errorRate: number;
    avgDuration: number;
    popularQueries: Array<{ query: string; count: number }>;
  } {
    const now = Date.now();
    const recentRequests = this.requests.filter(r => r.timestamp >= now - timeWindow);
    
    const stats = {
      total: recentRequests.length,
      byMethod: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      errorRate: 0,
      avgDuration: 0,
      popularQueries: [] as Array<{ query: string; count: number }>
    };
    
    if (recentRequests.length === 0) return stats;
    
    let totalDuration = 0;
    let errorCount = 0;
    const queryCount = new Map<string, number>();
    
    recentRequests.forEach(req => {
      // Method stats
      stats.byMethod[req.method] = (stats.byMethod[req.method] || 0) + 1;
      
      // Language stats
      const lang = req.language || req.params?.lang || 'unknown';
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      
      // Error tracking
      if (!req.success) errorCount++;
      
      // Duration tracking
      if (req.duration) totalDuration += req.duration;
      
      // Query popularity (for search methods)
      if (req.method.includes('search') && req.params?.query) {
        const query = req.params.query.toLowerCase();
        queryCount.set(query, (queryCount.get(query) || 0) + 1);
      }
    });
    
    stats.errorRate = errorCount / recentRequests.length;
    stats.avgDuration = totalDuration / recentRequests.length;
    
    // Top queries
    stats.popularQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return stats;
  }

  getHealthMetrics(): {
    requestRate: number; // requests per minute
    errorRate: number;
    avgResponseTime: number;
    topErrors: Array<{ error: string; count: number }>;
  } {
    const now = Date.now();
    const lastMinute = this.requests.filter(r => r.timestamp >= now - 60000);
    const lastHour = this.requests.filter(r => r.timestamp >= now - 3600000);
    
    const errorCounts = new Map<string, number>();
    let totalDuration = 0;
    let durationsCount = 0;
    
    lastHour.forEach(req => {
      if (!req.success && req.errorType) {
        errorCounts.set(req.errorType, (errorCounts.get(req.errorType) || 0) + 1);
      }
      if (req.duration) {
        totalDuration += req.duration;
        durationsCount++;
      }
    });
    
    return {
      requestRate: lastMinute.length, // per minute
      errorRate: lastHour.filter(r => !r.success).length / Math.max(lastHour.length, 1),
      avgResponseTime: durationsCount > 0 ? totalDuration / durationsCount : 0,
      topErrors: Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }
}

// Global monitoring instance
export class MonitoringService {
  public metrics = new MetricsCollector();
  public logger = new Logger();
  public performance = new PerformanceMonitor(this.metrics, this.logger);
  public analytics = new UsageAnalytics();

  // Middleware function for JSON-RPC requests
  async monitorRequest<T>(
    method: string,
    params: any,
    requestId: string,
    handler: () => Promise<T>,
    userAgent?: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.performance.monitorAsync(
        `jsonrpc_${method}`,
        handler,
        { method, language: params?.lang || 'en' },
        requestId
      );
      
      const duration = Date.now() - startTime;
      
      this.analytics.recordRequest({
        method,
        params,
        requestId,
        duration,
        success: true,
        userAgent,
        language: params?.lang || 'en'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.analytics.recordRequest({
        method,
        params,
        requestId,
        duration,
        success: false,
        errorType: (error as Error).constructor.name,
        userAgent,
        language: params?.lang || 'en'
      });
      
      throw error;
    }
  }

  // Get comprehensive monitoring dashboard data
  getDashboardData(): {
    health: any;
    metrics: any;
    usage: any;
    recentErrors: LogEvent[];
  } {
    return {
      health: this.analytics.getHealthMetrics(),
      metrics: this.metrics.getAggregatedMetrics(),
      usage: this.analytics.getUsageStats(),
      recentErrors: this.logger.getLogs('error', Date.now() - 3600000) // Last hour
    };
  }
} 
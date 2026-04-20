import { api } from '../lib/api';

export interface AppMetric {
  userId: string;
  action: 'view' | 'click' | 'search' | 'publish' | 'contact';
  targetId: string;
  targetType: 'product' | 'category' | 'user' | 'social_post';
  timestamp: string;
  metadata?: Record<string, any>;
}

let metricBuffer: AppMetric[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_LIMIT = 10;

const flushMetrics = async () => {
  if (metricBuffer.length === 0) return;
  
  const metricsToFlush = [...metricBuffer];
  metricBuffer = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    // Sending individual requests for now since the API expects single metrics, 
    // but in a controlled Promise.all to ensure they go out together
    await Promise.all(metricsToFlush.map(m => api.trackMetric(m)));
  } catch (err) {
    console.error('[Telemetry Flush Error]:', err);
    // Silent fail to not disrupt user experience
  }
};

export const trackMetric = (metric: Omit<AppMetric, 'timestamp'>) => {
  const newMetric = {
    ...metric,
    timestamp: new Date().toISOString(),
  };
  
  metricBuffer.push(newMetric as AppMetric);

  if (metricBuffer.length >= BUFFER_LIMIT) {
    flushMetrics();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushMetrics, FLUSH_INTERVAL);
  }
};

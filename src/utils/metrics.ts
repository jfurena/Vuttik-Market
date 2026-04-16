/**
 * Simulated Metrics Tracker
 * Collects interaction data for Mega Guardian analytics
 */

export interface AppMetric {
  userId: string;
  action: 'view' | 'click' | 'search' | 'publish' | 'contact';
  targetId: string;
  targetType: 'product' | 'category' | 'user' | 'social_post';
  timestamp: string;
  metadata?: Record<string, any>;
}

const metricsStorage: AppMetric[] = [];

export const trackMetric = (metric: Omit<AppMetric, 'timestamp'>) => {
  const newMetric: AppMetric = {
    ...metric,
    timestamp: new Date().toISOString(),
  };
  metricsStorage.push(newMetric);
  
  // In a real app, this would be sent to a backend API
  console.log('[Metric Tracked]:', newMetric);
};

export const getUserMetrics = (userId: string) => {
  return metricsStorage.filter(m => m.userId === userId);
};

export const getProductMetrics = (productId: string) => {
  return metricsStorage.filter(m => m.targetId === productId);
};

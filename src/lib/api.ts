/**
 * API client to replace direct Firestore calls with SQL backend calls.
 */

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Server error');
  }

  return response.json();
}

export const api = {
  // Users
  getUser: (uid: string) => request(`/api/users/${uid}`),
  saveUser: (userData: any) => request('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  // Categories & Types
  getCategories: () => request('/api/categories'),
  getTransactionTypes: () => request('/api/transaction-types'),

  // Products
  getProducts: (categoryId?: string) => request(`/api/products${categoryId ? `?categoryId=${categoryId}` : ''}`),
  publishProduct: (productData: any) => request('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),

  // Social
  getPosts: () => request('/api/posts'),
  publishPost: (postData: any) => request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  }),

  // Metrics
  trackMetric: (metricData: any) => request('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metricData),
  }),
};

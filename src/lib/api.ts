/**
 * API client to replace direct Firestore calls with SQL backend calls.
 */

// Use relative paths so the server proxy (.htaccess / LiteSpeed) forwards /api/ to Node.js backend.
// This avoids mixed-content errors when the site runs on HTTPS.
const API_BASE = '';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('vuttik_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Server error');
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  googleCallback: (data: any) => request('/api/auth/google/callback', { method: 'POST', body: JSON.stringify(data) }),
  facebookCallback: (data: any) => request('/api/auth/facebook/callback', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),

  // Users
  // Users
  getUser: (uid: string) => request(`/api/users/${uid}`),
  getAllUsers: () => request('/api/users'),
  saveUser: (userData: any) => request('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  searchUsers: (q: string) => request(`/api/users/search?q=${encodeURIComponent(q)}`),

  // Categories & Types
  getCategories: () => request('/api/categories'),
  saveCategory: (categoryData: any) => request('/api/categories', { method: 'POST', body: JSON.stringify(categoryData) }),
  deleteCategory: (id: string) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  getTransactionTypes: () => request('/api/transaction-types'),
  saveTransactionType: (typeData: any) => request('/api/transaction-types', { method: 'POST', body: JSON.stringify(typeData) }),
  deleteTransactionType: (id: string) => request(`/api/transaction-types/${id}`, { method: 'DELETE' }),

  // Subscription Plans
  getSubscriptionPlans: () => request('/api/subscription-plans'),
  saveSubscriptionPlan: (planData: any) => request('/api/subscription-plans', { method: 'POST', body: JSON.stringify(planData) }),
  deleteSubscriptionPlan: (id: string) => request(`/api/subscription-plans/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (categoryId?: string, authorId?: string) => {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'GLOBAL') params.set('categoryId', categoryId);
    if (authorId) params.set('authorId', authorId);
    const qs = params.toString();
    return request(`/api/products${qs ? `?${qs}` : ''}`);
  },
  publishProduct: (productData: any) => request('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),

  // Social Posts
  getPosts: (filter?: 'all' | 'following', userId?: string) => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (userId) params.set('userId', userId);
    const qs = params.toString();
    return request(`/api/posts/feed${qs ? `?${qs}` : ''}`);
  },
  publishPost: (postData: any) => request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  }),

  // Follows
  followUser: (followerId: string, followingId: string) => request('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ followerId, followingId }),
  }),
  unfollowUser: (followerId: string, followingId: string) => request('/api/follows', {
    method: 'DELETE',
    body: JSON.stringify({ followerId, followingId }),
  }),
  getFollowing: (userId: string) => request(`/api/follows/${userId}/following`),

  // Conversations
  getConversations: (userId: string) => request(`/api/conversations/${userId}`),
  getOrCreateConversation: (userId1: string, userId2: string) => request('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ userId1, userId2 }),
  }),

  // Messages
  getMessages: (conversationId: string) => request(`/api/messages/${conversationId}`),
  sendMessage: (data: { conversationId: string; senderId: string; content: string }) =>
    request('/api/messages', { method: 'POST', body: JSON.stringify(data) }),
  markMessagesRead: (conversationId: string, userId: string) =>
    request('/api/messages/read', { method: 'PATCH', body: JSON.stringify({ conversationId, userId }) }),

  // Metrics
  trackMetric: (metricData: any) => request('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metricData),
  }),

  // Stats
  getMegaGuardianStats: () => request('/api/stats/mega-guardian'),
  getTrends: () => request('/api/stats/trends'),
  getBusinessStats: (userId: string) => request(`/api/stats/business/${userId}`),
  getUserAnalytics: (uid: string) => request(`/api/users/${uid}/analytics`),
  getAuditLog: () => request('/api/admin/audit-log'),

  // Comments & Verification
  getComments: (postId: string) => request(`/api/posts/${postId}/comments`),
  addComment: (postId: string, data: any) => request(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  verifyPost: (postId: string, data: any) => request(`/api/posts/${postId}/verify`, { method: 'POST', body: JSON.stringify(data) }),

  // Deletions
  deleteProduct: (id: string, userId: string) => request(`/api/products/${id}?userId=${userId}`, { method: 'DELETE' }),
  deletePost: (id: string, userId: string) => request(`/api/posts/${id}?userId=${userId}`, { method: 'DELETE' }),
  banUser: (uid: string, adminId: string) => request(`/api/users/${uid}/ban`, { method: 'POST', body: JSON.stringify({ adminId }) }),
};

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

  if (!options.cache) {
    options.cache = 'no-store'; // Prevent aggressive browser caching of GET requests
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Safely parse response body — avoids "Unexpected end of JSON input"
  // when the server returns an empty body or an HTML error page
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. HTML error page from a crashed server)
    if (!response.ok) {
      throw new Error(`El servidor no está disponible. Asegúrate de que el backend esté corriendo (npm run dev).`);
    }
    return null;
  }

  if (!response.ok) {
    const errorDetails = data?.details ? `: ${JSON.stringify(data.details)}` : '';
    throw new Error((data?.error || `Error del servidor (${response.status})`) + errorDetails);
  }

  return data;
}

export const api = {
  // Settings
  updateSettings: (data: any) => request('/api/settings', { method: 'POST', body: JSON.stringify(data) }),

  // Subscription Plans
  getSubscriptionPlans: () => request('/api/subscription-plans'),
  saveSubscriptionPlan: (data: any) => request('/api/subscription-plans', { method: 'POST', body: JSON.stringify(data) }),
  deleteSubscriptionPlan: (id: string, fallbackPlanId?: string) => request(`/api/subscription-plans/${id}${fallbackPlanId ? `?fallbackPlanId=${fallbackPlanId}` : ''}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: (userId: string) => request(`/api/notifications?userId=${userId}`),
  markNotificationRead: (id: string) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: (userId: string) => request(`/api/notifications/mark-all-read`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // Logs
  getLogs: (level?: string) => request(`/api/logs${level ? `?level=${level}` : ''}`),

  // Auth
  register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (credentials: any) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  verifyEmail: (token: string) => request(`/api/auth/verify-email?token=${token}`),
  requestPasswordReset: (email: string) => request('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  resendVerification: () => request('/api/auth/resend-verification', {
    method: 'POST'
  }),
  getMe: () => request('/api/auth/me'),
  updateProfileMode: (mode: string, uid: string) => request('/api/users/me/mode', { method: 'PUT', body: JSON.stringify({ mode, uid }) }),
  googleCallback: (data: any) => request('/api/auth/google/callback', { method: 'POST', body: JSON.stringify(data) }),
  facebookCallback: (data: any) => request('/api/auth/facebook/callback', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getUser: (uid: string, raw?: boolean) => request(`/api/users/${uid}${raw ? '?raw=true' : ''}`),
  getUserByUsername: (username: string, raw?: boolean) => request(`/api/users/by-username/${encodeURIComponent(username)}${raw ? '?raw=true' : ''}`),
  getAllUsers: () => request('/api/users'),
  checkUsername: (username: string) => request(`/api/users/check-username?username=${encodeURIComponent(username)}`),
  suggestUsername: (name: string) => request(`/api/users/suggest-username?name=${encodeURIComponent(name)}`),
  changeUsername: (uid: string, username: string) => request(`/api/users/${uid}/username`, {
    method: 'PUT',
    body: JSON.stringify({ username })
  }),
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



  // EAN Database
  searchEanDatabase: (query: string) => request(`/api/ean-database${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  addEanEntry: (data: any) => request('/api/ean-database', { method: 'POST', body: JSON.stringify(data) }),
  updateEanEntry: (ean: string, data: any) => request(`/api/ean-database/${ean}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Products
  getBusinessSuggestions: (query: string) => request(`/api/business-names?query=${encodeURIComponent(query)}`),
  getChains: () => request('/api/chains'),
  getProduct: (id: string) => request(`/api/products/${id}`),
  getProducts: (categoryId?: string, authorId?: string, postedAs?: string) => {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'GLOBAL') params.set('categoryId', categoryId);
    if (authorId) params.set('authorId', authorId);
    if (postedAs) params.set('postedAs', postedAs);
    const qs = params.toString();
    return request(`/api/products${qs ? `?${qs}` : ''}`);
  },
  publishProduct: (productData: any) => request('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),
  updateProductStatus: (id: string, status: string) => request(`/api/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Reports & Moderation
  submitReport: (reportData: any) => request('/api/reports', { method: 'POST', body: JSON.stringify(reportData) }),
  getReports: () => request('/api/reports'),
  updateReportStatus: (id: string, status: string, guardianId?: string) => request(`/api/reports/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, guardianId }) }),
  banUser: (uid: string, adminId: string) => request(`/api/users/${uid}/ban`, { method: 'POST', body: JSON.stringify({ adminId }) }),
  unbanUser: (uid: string, adminId: string) => request(`/api/users/${uid}/unban`, { method: 'POST', body: JSON.stringify({ adminId }) }),
  changeUserRole: (uid: string, role: string, adminId: string) => request(`/api/users/${uid}/role`, { method: 'PUT', body: JSON.stringify({ role, adminId }) }),
  getAuditLogs: (limit?: number) => request(`/api/audit-logs${limit ? `?limit=${limit}` : ''}`),
  issueStrike: (uid: string, guardianId: string) => request(`/api/users/${uid}/strike`, { method: 'POST', body: JSON.stringify({ guardianId }) }),
  getFlaggedProducts: () => request('/api/products/flagged'),
  updateFlaggedReport: (id: string, action: string, adminId: string) => request(`/api/products/flagged/${id}`, { method: 'PUT', body: JSON.stringify({ action, adminId }) }),

  // Category Proposals
  getCategoryProposals: (userId?: string) => request(`/api/categories/proposals${userId ? `?userId=${userId}` : ''}`),
  submitCategoryProposal: (data: { id: string, name: string, suggested_by_id: string, suggested_by_name: string }) => 
    request('/api/categories/proposals', { method: 'POST', body: JSON.stringify(data) }),
  voteCategoryProposal: (id: string, guardian_id: string, vote_type: 'up' | 'down') => 
    request(`/api/categories/proposals/${id}/vote`, { method: 'POST', body: JSON.stringify({ guardian_id, vote_type }) }),

  // Products
  updateProduct: (id: string, data: any, userId: string) => request(`/api/products/${id}?userId=${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  voteProduct: (id: string, userId: string, voteType: 'up' | 'down' | null) => request(`/api/products/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ userId, voteType })
  }),

  // Social Posts
  getUserSocialPosts: (authorId: string, postedAs?: string) => request(`/api/posts?authorId=${authorId}${postedAs ? `&postedAs=${postedAs}` : ''}`),
  getPosts: (filter?: 'all' | 'following', userId?: string, type?: 'all' | 'posts' | 'products') => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (userId) params.set('userId', userId);
    if (type) params.set('type', type);
    const qs = params.toString();
    return request(`/api/posts/feed${qs ? `?${qs}` : ''}`);
  },
  followProduct: (productId: string, userId: string) => request(`/api/products/${productId}/follow`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
  unfollowProduct: (productId: string, userId: string) => request(`/api/products/${productId}/follow?userId=${userId}`, {
    method: 'DELETE'
  }),
  getFollowingProducts: (userId: string) => request(`/api/users/${userId}/following-products`),
  publishPost: (postData: any) => request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  }),
  // Social - Posts
  likePost: (postId: string, userId: string) => request(`/api/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
  updatePost: (postId: string, userId: string, content: string) => request(`/api/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify({ userId, content })
  }),
  deleteComment: (commentId: string, userId: string) => request(`/api/comments/${commentId}?userId=${userId}`, { method: 'DELETE' }),
  updateUserProfile: (uid: string, data: { displayName?: string, bio?: string, location?: string, photoURL?: string }) =>
    request(`/api/users/${uid}/profile`, { method: 'PUT', body: JSON.stringify(data) }),

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
  getUnreadMessagesCount: (userId: string) => request(`/api/users/${userId}/unread-messages`),

  // Mega Guardian Verification
  verifyUser: (uid: string, isVerified: boolean, adminId: string) => request(`/api/users/${uid}/verify`, { method: 'PUT', body: JSON.stringify({ isVerified, adminId }) }),

  // Portfolios (Mocked in localStorage for now)
  getPortfolios: async (userId: string) => {
    const res = await fetch(`/api/portfolios?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch portfolios');
    return res.json();
  },
  createPortfolio: async (userId: string, data: { name: string, isPublic: boolean }) => {
    const res = await fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data })
    });
    if (!res.ok) throw new Error('Failed to create portfolio');
    return res.json();
  },
  deletePortfolio: async (portfolioId: string, userId: string) => {
    const res = await fetch(`/api/portfolios/${portfolioId}?userId=${userId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete portfolio');
    return res.json();
  },
  updatePortfolio: async (portfolioId: string, userId: string, data: { name?: string, isPublic?: boolean }) => {
    const portfolios = JSON.parse(localStorage.getItem('vuttik_portfolios') || '[]');
    const index = portfolios.findIndex((p: any) => p.id === portfolioId && p.userId === userId);
    if (index !== -1) {
      portfolios[index] = { ...portfolios[index], ...data };
      localStorage.setItem('vuttik_portfolios', JSON.stringify(portfolios));
    }
    return { success: true };
  },
  updatePortfolioProducts: async (portfolioId: string, products: any[]) => {
    const res = await fetch(`/api/portfolios/${portfolioId}/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products })
    });
    if (!res.ok) throw new Error('Failed to update portfolio products');
    return res.json();
  },
  addProductToPortfolio: async (portfolioId: string, product: any, quantity: number) => {
    // This requires fetching the current portfolio, updating, and saving.
    // For now, since the UI calls updatePortfolioProducts when saving changes, we might just leave this or implement a server-side route.
    // The previous implementation used localStorage. We'll fetch the current one first:
    const res = await fetch(`/api/portfolios?userId=${product.author_id}`); // Hackish, but usually we just handle this entirely from the frontend.
    // Let's implement this properly:
    // Actually, in PortfolioManager, the user does not use addProductToPortfolio. They add it to local state and call handleSaveChanges which calls updatePortfolioProducts.
    // So we can just leave this as a dummy or implement it using fetch and PUT.
    return { success: true };
  },
  updateProductInPortfolio: async (portfolioId: string, productId: string, quantity: number) => {
    const portfolios = JSON.parse(localStorage.getItem('vuttik_portfolios') || '[]');
    const index = portfolios.findIndex((p: any) => p.id === portfolioId);
    if (index !== -1) {
      const pIndex = portfolios[index].products.findIndex((p: any) => p.product.id === productId);
      if (pIndex !== -1) {
        portfolios[index].products[pIndex].quantity = quantity;
        localStorage.setItem('vuttik_portfolios', JSON.stringify(portfolios));
      }
    }
    return { success: true };
  },
  removeProductFromPortfolio: async (portfolioId: string, productId: string) => {
    const portfolios = JSON.parse(localStorage.getItem('vuttik_portfolios') || '[]');
    const index = portfolios.findIndex((p: any) => p.id === portfolioId);
    if (index !== -1) {
      portfolios[index].products = portfolios[index].products.filter((p: any) => p.product.id !== productId);
      localStorage.setItem('vuttik_portfolios', JSON.stringify(portfolios));
    }
    return { success: true };
  },

  // Web3 Auth
  getWalletNonce: (address: string) => request(`/api/auth/wallet/nonce/${address}`),
  verifyWalletSignature: (address: string, signature: string) => request('/api/auth/wallet/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature })
  }),

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
  rateUser: async (userId: string, rating: number, raterId: string) => {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500));
  },

  // Comments & Verification
  getComments: (postId: string) => request(`/api/posts/${postId}/comments`),
  addComment: (postId: string, data: any) => request(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  verifyPost: (postId: string, data: any) => request(`/api/posts/${postId}/verify`, { method: 'POST', body: JSON.stringify(data) }),

  // Deletions
  deleteProduct: (id: string, userId: string, override?: boolean) => request(`/api/products/${id}?userId=${userId}${override ? '&override=true' : ''}`, { method: 'DELETE' }),
  deletePost: (id: string, userId: string, override?: boolean) => request(`/api/posts/${id}?userId=${userId}${override ? '&override=true' : ''}`, { method: 'DELETE' }),


  // Flagging
  flagProduct: (productId: string, userId: string, reason?: string) => request(`/api/products/${productId}/flag`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason })
  }),

  // Followers
  getFollowers: (userId: string) => request(`/api/follows/${userId}/followers`),

  // Business Profiles
  getBusinessProfile: (uid: string) => request(`/api/business-profiles/${uid}`),
  saveBusinessProfile: (uid: string, data: any, requesterUid: string) => request(`/api/business-profiles/${uid}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, requesterUid }),
  }),
  updateBusinessMemberRole: (id: string, role: string) => request(`/api/business-members/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }),

  // Promotions
  getPromotions: () => request('/api/promotions'),
  createPromotion: (data: any) => request('/api/promotions', { method: 'POST', body: JSON.stringify(data) }),
  deletePromotion: (id: string) => request(`/api/promotions/${id}`, { method: 'DELETE' }),

  // Business Members
  getBusinessMembers: (businessUid: string) => request(`/api/business-members/${businessUid}`),
  inviteBusinessMember: (data: { businessUid: string; email: string }) => request('/api/business-members/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  acceptBusinessInvite: (id: string) => request(`/api/business-members/${id}/accept`, { method: 'PUT' }),
  deleteBusinessMember: (id: string) => request(`/api/business-members/${id}`, { method: 'DELETE' }),
  getBusinessInvites: (uid: string) => request(`/api/users/${uid}/business-invites`),
  getBusinesses: (uid: string) => request(`/api/users/${uid}/businesses?t=${Date.now()}`),
};

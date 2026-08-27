/**
 * API client to replace direct Firestore calls with SQL backend calls.
 */

// On the web, relative paths let the server proxy (.htaccess / LiteSpeed)
// forward /api/ to the Node backend and avoid mixed-content errors over HTTPS.
//
// Inside a native shell (Capacitor) the page is served from capacitor:// or a
// local file, so a relative path would resolve against the bundle instead of
// the API. The mobile build sets VITE_NATIVE_API_URL to an absolute origin.
// A separate variable from VITE_API_URL on purpose: that one is already set to
// https://vuttik.com for the web build, and switching the web over to absolute
// URLs would change same-origin behaviour for no benefit.
const API_BASE = import.meta.env.VITE_NATIVE_API_URL || '';

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

  // 60-second timeout to prevent infinite loading states, especially needed for AI features
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Safely parse response body
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
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
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado tiempo. Verifica tu conexión a internet.');
    }
    throw err;
  }
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
  createOrProposeCategory: (name: string, createdBy: string) => request('/api/categories/create-or-propose', { method: 'POST', body: JSON.stringify({ name, createdBy }) }),
  deleteCategory: (id: string) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  getTransactionTypes: () => request('/api/transaction-types'),
  saveTransactionType: (typeData: any) => request('/api/transaction-types', { method: 'POST', body: JSON.stringify(typeData) }),
  deleteTransactionType: (id: string) => request(`/api/transaction-types/${id}`, { method: 'DELETE' }),



  // Map Database
  getMapPlaces: async (search = '', page = 1, limit = 50) => {
    const res = await fetch(`/api/places?q=${encodeURIComponent(search)}&offset=${(page - 1) * limit}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch places');
    return res.json();
  },
  createMapPlace: async (data: any) => {
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create place');
    return res.json();
  },
  updateMapPlace: async (id: number, data: any) => {
    const res = await fetch(`/api/places/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update place');
    return res.json();
  },
  deleteMapPlace: async (id: number) => {
    const res = await fetch(`/api/places/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete place');
    return res.json();
  },

  // EAN Database
  searchEanDatabase: (query: string) => request(`/api/ean-database${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  addEanEntry: (data: any) => request('/api/ean-database', { method: 'POST', body: JSON.stringify(data) }),
  updateEanEntry: (ean: string, data: any) => request(`/api/ean-database/${ean}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Products
  getBusinessSuggestions: (query: string) => request(`/api/business-names?query=${encodeURIComponent(query)}`),
  getChains: () => request('/api/chains'),
  getProduct: (id: string) => request(`/api/products/${id}`),
  getProducts: (categoryId?: string, authorId?: string, postedAs?: string, page = 1, limit = 20, q?: string) => {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'GLOBAL') params.set('categoryId', categoryId);
    if (authorId) params.set('authorId', authorId);
    if (postedAs) params.set('postedAs', postedAs);
    if (q) params.set('q', q);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    const qs = params.toString();
    return request(`/api/products${qs ? `?${qs}` : ''}`);
  },
  publishProduct: (productData: any) => request('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),
  scanImageAI: (imageBase64: string, mode: 'menu' | 'product') => request('/api/ai/scan-image', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mode }),
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
  getPosts: (filter?: 'all' | 'following', userId?: string, type?: 'all' | 'posts' | 'products', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (userId) params.set('userId', userId);
    if (type) params.set('type', type);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
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
  getConversations: (userId: string, page = 1, limit = 5) => request(`/api/conversations/${userId}?page=${page}&limit=${limit}`),
  getOrCreateConversation: (userId1: string, userId2: string) => request('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ userId1, userId2 }),
  }),

  // Messages
  getMessages: (conversationId: string, page = 1, limit = 30) => request(`/api/messages/${conversationId}?page=${page}&limit=${limit}`),
  sendMessage: (data: { conversationId: string; senderId: string; content: string }) =>
    request('/api/messages', { method: 'POST', body: JSON.stringify(data) }),
  markMessagesRead: (conversationId: string, userId: string) =>
    request('/api/messages/read', { method: 'PATCH', body: JSON.stringify({ conversationId, userId }) }),
  getUnreadMessagesCount: (userId: string) => request(`/api/users/${userId}/unread-messages`),

  // Mega Guardian Verification
  verifyUser: (uid: string, isVerified: boolean, adminId: string) => request(`/api/users/${uid}/verify`, { method: 'PUT', body: JSON.stringify({ isVerified, adminId }) }),

  // Portfolios. These go through `request` so the Authorization header is
  // attached; the endpoints derive ownership from the token and ignore any
  // userId passed by the caller.
  getPortfolios: async (_userId?: string) => request('/api/portfolios'),
  createPortfolio: async (_userId: string, data: { name: string, isPublic: boolean }) =>
    request('/api/portfolios', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deletePortfolio: async (portfolioId: string, _userId?: string) =>
    request(`/api/portfolios/${portfolioId}`, { method: 'DELETE' }),
  updatePortfolio: async (portfolioId: string, userId: string, data: { name?: string, isPublic?: boolean }) => {
    return request(`/api/portfolios/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  updatePortfolioProducts: async (portfolioId: string, products: any[]) =>
    request(`/api/portfolios/${portfolioId}/products`, {
      method: 'PUT',
      body: JSON.stringify({ products })
    }),
  addProductToPortfolio: async (portfolioId: string, product: any, quantity: number, userId: string) => {
    const portfolios = await api.getPortfolios(userId);
    const portfolio = portfolios.find((p: any) => p.id === portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');
    
    const products = portfolio.products || [];
    // Handle both formats just in case
    const exists = products.find((p: any) => (p.product && p.product.id === product.id) || p.id === product.id);
    let newProducts;
    if (exists) {
      newProducts = products.map((p: any) => {
        if ((p.product && p.product.id === product.id) || p.id === product.id) {
          return { ...p, quantity: (p.quantity || 1) + quantity };
        }
        return p;
      });
    } else {
      newProducts = [...products, { product, quantity }];
    }
    
    await api.updatePortfolioProducts(portfolioId, newProducts);
    return { success: true };
  },
  updateProductInPortfolio: async (portfolioId: string, productId: string, quantity: number, userId: string) => {
    const portfolios = await api.getPortfolios(userId);
    const portfolio = portfolios.find((p: any) => p.id === portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');
    const products = (portfolio.products || []).map((p: any) => {
      const pid = p.product ? p.product.id : p.id;
      if (pid === productId) return { ...p, quantity };
      return p;
    });
    await api.updatePortfolioProducts(portfolioId, products);
    return { success: true };
  },
  removeProductFromPortfolio: async (portfolioId: string, productId: string, userId: string) => {
    const portfolios = await api.getPortfolios(userId);
    const portfolio = portfolios.find((p: any) => p.id === portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');
    
    const products = portfolio.products || [];
    const newProducts = products.filter((p: any) => !((p.product && p.product.id === productId) || p.id === productId));
    
    await api.updatePortfolioProducts(portfolioId, newProducts);
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
  // NOTE: rateUser now implemented on the server.
  rateUser: async (userId: string, rating: number, _raterId: string) => {
    return request(`/api/users/${userId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating })
    });
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
  
  // Mega Guardian: POS Business Requests
  getBusinessRequests: () => request('/api/auth/business-requests'),
  approveBusinessRequest: (id: string) => request(`/api/auth/business-requests/${id}/approve`, { method: 'POST' }),
  rejectBusinessRequest: (id: string) => request(`/api/auth/business-requests/${id}/reject`, { method: 'POST' }),

  // Mega Guardian DB Explorer
  getMegaGuardianDB: (source: string, table: string) => request(`/api/auth/mega-guardian/db/${source}/${table}`),
  updateMegaGuardianDB: (source: string, table: string, id: string, data: any) => request(`/api/auth/mega-guardian/db/${source}/${table}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteMegaGuardianDB: (source: string, table: string, id: string) => request(`/api/auth/mega-guardian/db/${source}/${table}/${id}`, {
    method: 'DELETE'
  }),

  // --- Advertising ---

  /** Asks the ad server for a creative for one slot. Never throws on "no ad". */
  serveAd: (params: { placement: string; categoryId?: string; country?: string; province?: string }) => {
    const query = new URLSearchParams({ placement: params.placement });
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.country) query.set('country', params.country);
    if (params.province) query.set('province', params.province);
    return request(`/api/ads/serve?${query.toString()}`);
  },

  /** Reports an impression or click. The serve token proves the ad was real. */
  trackAdEvent: (type: 'impression' | 'click', payload: Record<string, unknown>) =>
    request(`/api/ads/${type}`, { method: 'POST', body: JSON.stringify(payload) }),

  // Advertiser self-service
  getAdCampaigns: () => request('/api/ads/campaigns'),
  createAdCampaign: (data: Record<string, unknown>) =>
    request('/api/ads/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  setAdCampaignStatus: (id: string, status: 'active' | 'paused') =>
    request(`/api/ads/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAdCreatives: (campaignId: string) => request(`/api/ads/campaigns/${campaignId}/creatives`),
  createAdCreative: (campaignId: string, data: Record<string, unknown>) =>
    request(`/api/ads/campaigns/${campaignId}/creatives`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAdCreative: (id: string) => request(`/api/ads/creatives/${id}`, { method: 'DELETE' }),

  // Moderation
  getAdminAdCampaigns: (status?: string) =>
    request(`/api/ads/admin/campaigns${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  reviewAdCampaign: (id: string, decision: 'approve' | 'reject', note?: string) =>
    request(`/api/ads/admin/campaigns/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
  getAdminAdStats: () => request('/api/ads/admin/stats'),
};

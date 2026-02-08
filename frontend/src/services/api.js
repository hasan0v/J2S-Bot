const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * API client with automatic token handling and refresh
 */
class ApiService {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    return localStorage.getItem('j2s_access_token');
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('j2s_access_token', accessToken);
    if (refreshToken) localStorage.setItem('j2s_refresh_token', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('j2s_access_token');
    localStorage.removeItem('j2s_refresh_token');
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    // Handle token expiration
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          return fetch(url, { ...options, headers });
        }
      }
      this.clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return res;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('j2s_refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async get(path) {
    const res = await this.request(path);
    return res.json();
  }

  async post(path, body) {
    const res = await this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async put(path, body) {
    const res = await this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async del(path) {
    const res = await this.request(path, { method: 'DELETE' });
    return res.json();
  }

  // ─── Auth ─────────────────────────────────────────────

  async login(email, password) {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error);
    }
    const data = await res.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  logout() {
    this.clearTokens();
  }

  // ─── Admin endpoints ──────────────────────────────────

  getConversations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/api/admin/conversations${qs ? '?' + qs : ''}`);
  }

  getConversation(id) {
    return this.get(`/api/admin/conversations/${id}`);
  }

  escalateConversation(id, reason) {
    return this.put(`/api/admin/conversations/${id}/escalate`, { reason });
  }

  endConversation(id) {
    return this.put(`/api/admin/conversations/${id}/end`);
  }

  getLeads(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/api/admin/leads${qs ? '?' + qs : ''}`);
  }

  async exportLeads() {
    const res = await this.request('/api/admin/leads/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getMetrics() {
    return this.get('/api/admin/metrics');
  }

  getTrends() {
    return this.get('/api/admin/trends');
  }

  // ─── Knowledge Base ───────────────────────────────────

  getKnowledgeBase() {
    return this.get('/api/knowledge-base/all');
  }

  createKBEntry(entry) {
    return this.post('/api/knowledge-base', entry);
  }

  updateKBEntry(id, entry) {
    return this.put(`/api/knowledge-base/${id}`, entry);
  }

  deleteKBEntry(id) {
    return this.del(`/api/knowledge-base/${id}`);
  }

  // ─── Auth ─────────────────────────────────────────────

  changePassword(currentPassword, newPassword) {
    return this.put('/api/auth/password', { currentPassword, newPassword });
  }
}

const api = new ApiService();
export default api;

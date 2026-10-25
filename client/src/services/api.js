const API_BASE = '/api';

function getAuthHeader(token) {
  const activeToken = token || localStorage.getItem('shamiit_crm_token');
  return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
}

async function request(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(token),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: (token) => request('/auth/me', { method: 'GET' }, token),

  // Leads
  getLeads: (params = {}, token) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.stage && params.stage !== 'All' && params.stage !== 'All Stages') query.append('stage', params.stage);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.sort) query.append('sort', params.sort);
    if (params.order) query.append('order', params.order);

    const qs = query.toString();
    return request(`/leads${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
  },

  getDashboardStats: (token) => request('/leads/stats', { method: 'GET' }, token),
  createLead: (leadData, token) => request('/leads', { method: 'POST', body: JSON.stringify(leadData) }, token),
  updateLead: (id, leadData, token) => request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(leadData) }, token),
  deleteLead: (id, token) => request(`/leads/${id}`, { method: 'DELETE' }, token),
  getTrashLeads: (token) => request('/leads/trash', { method: 'GET' }, token),
  restoreLead: (id, token) => request(`/leads/${id}/restore`, { method: 'PUT' }, token),
  permanentDeleteLead: (id, token) => request(`/leads/${id}/permanent`, { method: 'DELETE' }, token),
  getExcelDownloadUrl: () => `${API_BASE}/leads/export/excel`,

  // Activities
  getLeadActivities: (leadId, token) => request(`/activities/lead/${leadId}`, { method: 'GET' }, token),
  createActivity: (activityData, token) => request('/activities', { method: 'POST', body: JSON.stringify(activityData) }, token),

  // Tasks
  getTasks: (params = {}, token) => {
    const query = new URLSearchParams();
    if (params.leadId) query.append('leadId', params.leadId);
    const qs = query.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
  },
  createTask: (taskData, token) => request('/tasks', { method: 'POST', body: JSON.stringify(taskData) }, token),
  toggleTask: (id, token) => request(`/tasks/${id}/toggle`, { method: 'PUT' }, token),
  deleteTask: (id, token) => request(`/tasks/${id}`, { method: 'DELETE' }, token),

  // Google Drive OAuth2 & Sync API
  getGoogleAuthUrl: (token) => request('/auth/google?json=true', { method: 'GET' }, token),
  getGoogleStatus: (token) => request('/sync/drive/status', { method: 'GET' }, token),
  getSyncStatus: (token) => request('/sync/status', { method: 'GET' }, token),
  syncGoogleNow: (token) => request('/sync/drive/sync', { method: 'POST' }, token),
  disconnectGoogle: (token) => request('/sync/drive/disconnect', { method: 'POST' }, token),
  getGoogleAuthDirectUrl: (token) => {
    const activeToken = token || localStorage.getItem('shamiit_crm_token');
    return activeToken ? `/api/auth/google?token=${encodeURIComponent(activeToken)}` : '/api/auth/google';
  }
};

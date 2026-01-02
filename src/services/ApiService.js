const API_BASE = '/api/admin/monitor';

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }
  return data.data;
}

export const ApiService = {
  async getDashboard() {
    const response = await fetch(`${API_BASE}/dashboard`);
    return handleResponse(response);
  },

  async getPlaceStats() {
    const response = await fetch(`${API_BASE}/places/stats`);
    return handleResponse(response);
  },

  async searchPlaces({ keyword = '', status = 'all', page = 0, size = 20 } = {}) {
    const params = new URLSearchParams({
      status,
      page: String(page),
      size: String(size)
    });
    if (keyword) params.set('keyword', keyword);

    const response = await fetch(`${API_BASE}/places/search?${params}`);
    return handleResponse(response);
  },

  // Multi-server support
  async getBatchServers() {
    const response = await fetch(`${API_BASE}/batch/servers`);
    return handleResponse(response);
  },

  async getBatchStats(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/stats/${serverName}`);
    return handleResponse(response);
  },

  async getWorkers(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/workers/${serverName}`);
    return handleResponse(response);
  },

  async startWorker(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/worker/start/${serverName}`, { method: 'POST' });
    return handleResponse(response);
  },

  async stopWorker(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/worker/stop/${serverName}`, { method: 'POST' });
    return handleResponse(response);
  },

  async pushAllToQueue(serverName = 'local', { menus = true, images = true, reviews = true } = {}) {
    const params = new URLSearchParams({
      menus: String(menus),
      images: String(images),
      reviews: String(reviews)
    });
    const response = await fetch(`${API_BASE}/batch/push-all/${serverName}?${params}`, { method: 'POST' });
    return handleResponse(response);
  },

  async executeBatchEndpoint(serverName, method, path, body = null) {
    const options = {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE}/batch/execute/${serverName}?path=${encodeURIComponent(path)}&method=${method}`, options);
    return handleResponse(response);
  },

  // Docker APIs
  async getDockerContainers(serverName = null) {
    const url = serverName
      ? `${API_BASE}/docker/containers/${serverName}`
      : `${API_BASE}/docker/containers`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getDockerLogs(containerName, lines = 100, serverName = null) {
    const url = serverName
      ? `${API_BASE}/docker/logs/${serverName}/${containerName}?lines=${lines}`
      : `${API_BASE}/docker/logs/${containerName}?lines=${lines}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  // Server config
  async getServerConfig(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/config/${serverName}`);
    return handleResponse(response);
  },

  // Current running jobs
  async getCurrentJobs(serverName = 'local') {
    const response = await fetch(`${API_BASE}/batch/current-jobs/${serverName}`);
    return handleResponse(response);
  }
};

export default ApiService;

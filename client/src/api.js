export const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const handleResponse = async (res) => {
  if (!res.ok) {
    let errorMsg = `API Error: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch(e) {}
    
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-error', { detail: errorMsg }));
    }
    
    return { error: errorMsg };
  }
  return res.json();
};

export const apiClient = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    return handleResponse(res);
  },
  async post(endpoint, data) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async put(endpoint, data) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async delete(endpoint, data = null) {
    const options = { method: 'DELETE' };
    if (data) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(data);
    }
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return handleResponse(res);
  }
};

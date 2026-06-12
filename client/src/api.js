export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const apiClient = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) {
      try { return await res.json(); } catch(e) { throw new Error(`API Error: ${res.statusText}`); }
    }
    return res.json();
  },
  async post(endpoint, data) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      try { return await res.json(); } catch(e) { throw new Error(`API Error: ${res.statusText}`); }
    }
    return res.json();
  },
  async put(endpoint, data) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      try { return await res.json(); } catch(e) { throw new Error(`API Error: ${res.statusText}`); }
    }
    return res.json();
  },
  async delete(endpoint, data = null) {
    const options = { method: 'DELETE' };
    if (data) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(data);
    }
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!res.ok) {
      try { return await res.json(); } catch(e) { throw new Error(`API Error: ${res.statusText}`); }
    }
    return res.json();
  }
};

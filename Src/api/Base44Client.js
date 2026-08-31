// Src/api/Base44Client.js
// Replaces direct Base44 SDK calls with standardized API fetching

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.yourdomain.com';

export const Base44Client = {
  async getEntities(entityName) {
    const res = await fetch(`${API_BASE_URL}/api/${entityName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${entityName}`);
    return res.json();
  },

  async createEntity(entityName, data) {
    const res = await fetch(`${API_BASE_URL}/api/${entityName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async authenticateUser(credentials) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  }
};

export default Base44Client;
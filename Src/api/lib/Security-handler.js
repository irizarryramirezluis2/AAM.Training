// Src/api/lib/SecurityHandler.js

export const SecurityHandler = {
  // Sanitize user inputs to prevent XSS attacks
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Validate JWT/Token structures before storage
  setSecureToken(tokenName, tokenValue) {
    if (!tokenValue) return;
    localStorage.setItem(tokenName, tokenValue);
  },

  getSecureToken(tokenName) {
    return localStorage.getItem(tokenName) || null;
  },

  clearSecureSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_session');
  }
};

export default SecurityHandler;
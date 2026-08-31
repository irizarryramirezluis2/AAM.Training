// Src/api/lib/EncryptionService.js

const ENCRYPTION_KEY_NAME = 'aam_app_sec_key';

export const EncryptionService = {
  // Generate or retrieve a persistent CryptoKey
  async _getKey() {
    let rawKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
    if (!rawKey) {
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const exported = await window.crypto.subtle.exportKey('jwk', key);
      localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exported));
      return key;
    }
    return window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(rawKey),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  },

  // Encrypt string data into a base64 payload
  async encrypt(data) {
    try {
      const key = await this._getKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(data));

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );

      const payload = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };
      return btoa(JSON.stringify(payload));
    } catch (err) {
      console.error('Encryption failed:', err);
      return null;
    }
  },

  // Decrypt base64 payload back into original data
  async decrypt(encryptedBase64) {
    try {
      if (!encryptedBase64) return null;
      const key = await this._getKey();
      const payload = JSON.parse(atob(encryptedBase64));

      const iv = new Uint8Array(payload.iv);
      const data = new Uint8Array(payload.data);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoded = new TextDecoder().decode(decrypted);
      return JSON.parse(decoded);
    } catch (err) {
      console.error('Decryption failed:', err);
      return null;
    }
  }
};

export default EncryptionService;
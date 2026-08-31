// Src/api/lib/EnhancedStorageService.js
import EncryptionService from './EncryptionService';

const STORAGE_PREFIX = 'aam_app_sec_';

export const EnhancedStorageService = {
  // Save data with encryption
  async saveData(collection, data) {
    try {
      const existing = (await this.getData(collection)) || [];
      const updated = Array.isArray(data) ? [...existing, ...data] : [...existing, data];

      // Automatically prune audit logs older than 90 days
      const pruned = this._pruneOldLogs(collection, updated);

      const encryptedPayload = await EncryptionService.encrypt(pruned);
      localStorage.setItem(`${STORAGE_PREFIX}${collection}`, encryptedPayload);
      return { success: true, count: pruned.length };
    } catch (error) {
      console.error(`Error writing encrypted data to ${collection}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Read and decrypt collection data
  async getData(collection) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${collection}`);
      if (!raw) return [];
      const decrypted = await EncryptionService.decrypt(raw);
      return decrypted || [];
    } catch (error) {
      console.error(`Error reading encrypted data from ${collection}:`, error);
      return [];
    }
  },

  // Log Retention Policy: Remove entries older than 90 days
  _pruneOldLogs(collection, data) {
    if (!collection.includes('logs')) return data;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return data.filter((item) => {
      if (!item.timestamp) return true;
      return new Date(item.timestamp).getTime() > ninetyDaysAgo;
    });
  }
};

export default EnhancedStorageService;
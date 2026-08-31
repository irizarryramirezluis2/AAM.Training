// Src/api/lib/StorageService.js

const STORAGE_KEY_PREFIX = 'aam_app_data_';

export const StorageService = {
  // Save generic entity data
  saveData(collection, data) {
    try {
      const existing = this.getData(collection) || [];
      const updated = Array.isArray(data) ? [...existing, ...data] : [...existing, data];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${collection}`, JSON.stringify(updated));
      return { success: true, count: updated.length };
    } catch (error) {
      console.error(`Error saving data to ${collection}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Retrieve stored collection data
  getData(collection) {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${collection}`);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error(`Error reading data from ${collection}:`, error);
      return [];
    }
  },

  // Clear specific collection
  clearData(collection) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${collection}`);
  }
};

export default StorageService;
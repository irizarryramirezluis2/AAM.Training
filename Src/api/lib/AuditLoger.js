// Src/api/lib/AuditLogger.js
import StorageService from './StorageService';

export const AuditLogger = {
  logEvent(userId, eventType, details = {}) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || 'anonymous',
      eventType, // 'LOGIN', 'LOGOUT', 'AUTH_FAILURE', etc.
      timestamp: new Date().toISOString(),
      details
    };

    StorageService.saveData('audit_logs', logEntry);
    console.log(`[AUDIT LOG - ${logEntry.timestamp}] ${eventType}: User ${userId}`);
    return logEntry;
  },

  logLogin(userId, userEmail) {
    return this.logEvent(userId, 'USER_LOGIN', { email: userEmail, status: 'SUCCESS' });
  },

  logLogout(userId) {
    return this.logEvent(userId, 'USER_LOGOUT', { status: 'SUCCESS' });
  },

  getLogs() {
    return StorageService.getData('audit_logs');
  }
};

export default AuditLogger;
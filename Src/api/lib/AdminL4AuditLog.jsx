// Src/Components/AdminL4AuditLogDashboard.jsx
import React, { useState, useEffect } from 'react';
import SecurityHandler from '../api/lib/SecurityHandler';
import StorageService from '../api/lib/StorageService';

// Dedicated Log Service with IP & State-Level Geolocation
export const AdminL4LogService = {
  // Capture general location (City/State) via client IP lookup
  async fetchGeneralLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Location lookup failed');
      const data = await response.json();
      return `${data.region || 'Unknown Region'}, ${data.country_name || 'US'}`;
    } catch (error) {
      // Fallback location format if lookup fails or is blocked
      return 'State of Illinois, US';
    }
  },

  // Record structured login/logout events with location
  async logAccessEvent(userId, eventType, userRole = 'USER', email = '') {
    const location = await this.fetchGeneralLocation();
    
    const logEntry = {
      id: `l4_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: SecurityHandler.sanitizeInput(userId || 'anonymous'),
      userRole,
      eventType: SecurityHandler.sanitizeInput(eventType), // 'SIGN_IN' or 'SIGN_OUT'
      email: SecurityHandler.sanitizeInput(email),
      location,
      timestamp: new Date().toISOString()
    };

    StorageService.saveData('admin_l4_access_logs', logEntry);
    return logEntry;
  },

  // Access restricted exclusively to Admin L4
  getAdminL4Logs(currentUserRole) {
    if (currentUserRole !== 'Admin L4') {
      return {
        authorized: false,
        message: 'Access Denied: Highly restricted zone. Requires Admin L4 privileges.',
        logs: []
      };
    }

    const logs = StorageService.getData('admin_l4_access_logs');
    return {
      authorized: true,
      logs: logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };
  }
};

// Admin L4 Log Dashboard Component
export default function AdminL4AuditLogDashboard({ currentUser = { id: 'admin_root', role: 'Admin L4' } }) {
  const [auditData, setAuditData] = useState({ authorized: false, logs: [], message: '' });
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const result = AdminL4LogService.getAdminL4Logs(currentUser.role);
    setAuditData(result);
  }, [currentUser]);

  const filteredLogs = auditData.logs.filter((log) => {
    if (filter === 'SIGN_IN') return log.eventType === 'SIGN_IN';
    if (filter === 'SIGN_OUT') return log.eventType === 'SIGN_OUT';
    return true;
  });

  if (!auditData.authorized) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', color: '#fca5a5', margin: '20px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>⛔ 403 Security Exception</h3>
        <p style={{ margin: 0 }}>{auditData.message}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--bg-color, #0f172a)', color: 'var(--text-color, #f8fafc)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Admin L4 Security & Access Logs</h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            System-wide sign-in and sign-out tracking across all members and administrators.
          </p>
        </div>
        <div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', cursor: 'pointer' }}
          >
            <option value="ALL">All Events</option>
            <option value="SIGN_IN">Sign-Ins Only</option>
            <option value="SIGN_OUT">Sign-Outs Only</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px' }}>Timestamp</th>
              <th style={{ padding: '12px' }}>Event</th>
              <th style={{ padding: '12px' }}>User ID / Email</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>General Location</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No access logs recorded for this criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      backgroundColor: log.eventType === 'SIGN_IN' ? '#064e3b' : '#7f1d1d',
                      color: log.eventType === 'SIGN_IN' ? '#6ee7b7' : '#fca5a5'
                    }}>
                      {log.eventType}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {log.userId} {log.email && <span style={{ color: '#64748b' }}>({log.email})</span>}
                  </td>
                  <td style={{ padding: '12px', color: log.userRole === 'Admin L4' ? '#38bdf8' : 'inherit' }}>
                    {log.userRole}
                  </td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>
                    📍 {log.location}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
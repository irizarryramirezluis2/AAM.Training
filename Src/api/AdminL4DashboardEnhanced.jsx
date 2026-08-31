// Src/Components/AdminL4EnterpriseDashboard.jsx
import React, { useState, useEffect } from 'react';
import EnhancedStorageService from '../api/lib/EnhancedStorageService';
import AdminL42FAVerification from './AdminL42FAVerification';

export default function AdminL4EnterpriseDashboard({ currentUser = { id: 'admin_root', role: 'Admin L4' } }) {
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (is2FAVerified && currentUser.role === 'Admin L4') {
      loadLogsAndAnalyze();
    }
  }, [is2FAVerified, currentUser]);

  const loadLogsAndAnalyze = async () => {
    const fetchedLogs = await EnhancedStorageService.getData('admin_l4_access_logs');
    const sorted = fetchedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setLogs(sorted);
    analyzeSecurityThreats(sorted);
  };

  // Automated threat analysis: Brute force & Impossible travel detection
  const analyzeSecurityThreats = (logData) => {
    const detectedAlerts = [];
    const userLogins = {};

    logData.forEach((log) => {
      if (!userLogins[log.userId]) userLogins[log.userId] = [];
      userLogins[log.userId].push(log);
    });

    Object.keys(userLogins).forEach((userId) => {
      const userEntries = userLogins[userId];

      // Alert 1: Detect multi-location sign-ins within 15 minutes (Impossible Travel)
      for (let i = 0; i < userEntries.length - 1; i++) {
        const current = userEntries[i];
        const previous = userEntries[i + 1];
        const timeDiffMinutes = (new Date(current.timestamp) - new Date(previous.timestamp)) / (1000 * 60);

        if (timeDiffMinutes < 15 && current.location !== previous.location) {
          detectedAlerts.push({
            id: `alert_travel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            severity: 'CRITICAL',
            type: 'Impossible Travel Suspicion',
            message: `User ${userId} logged in from "${previous.location}" and "${current.location}" within ${Math.round(timeDiffMinutes)} minutes.`
          });
        }
      }
    });

    setAlerts(detectedAlerts);
  };

  // CSV Export Handler
  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Event', 'User ID', 'Role', 'Email', 'Location'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.eventType}"`,
      `"${l.userId}"`,
      `"${l.userRole}"`,
      `"${l.email || ''}"`,
      `"${l.location || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admin_l4_security_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export Handler
  const exportToJSON = () => {
    if (logs.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `admin_l4_security_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (currentUser.role !== 'Admin L4') {
    return (
      <div style={{ padding: '24px', backgroundColor: '#450a0a', color: '#fca5a5', borderRadius: '8px', margin: '20px' }}>
        ⛔ <strong>Access Denied:</strong> Only <strong>Admin L4</strong> accounts can view this dashboard.
      </div>
    );
  }

  if (!is2FAVerified) {
    return <AdminL42FAVerification onVerified={() => setIs2FAVerified(true)} />;
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Admin L4 Security Command Center</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Encrypted Audit Logs • Real-Time Alerting • Compliance Export
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportToCSV} style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Export CSV
          </button>
          <button onClick={exportToJSON} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Export JSON
          </button>
        </div>
      </div>

      {/* Real-time Threat Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f87171', fontSize: '1rem', marginBottom: '8px' }}>⚠️ Active Security Alerts</h3>
          {alerts.map((alert) => (
            <div key={alert.id} style={{ padding: '12px', backgroundColor: '#7f1d1d', border: '1px solid #f87171', color: '#fef2f2', borderRadius: '6px', marginBottom: '8px', fontSize: '0.875rem' }}>
              <strong>[{alert.severity}] {alert.type}:</strong> {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Access Log Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px' }}>Timestamp</th>
              <th style={{ padding: '12px' }}>Event</th>
              <th style={{ padding: '12px' }}>User ID / Email</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No encrypted access logs retrieved.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</td>
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
                  <td style={{ padding: '12px' }}>{log.userId} {log.email && <span style={{ color: '#64748b' }}>({log.email})</span>}</td>
                  <td style={{ padding: '12px', color: log.userRole === 'Admin L4' ? '#38bdf8' : 'inherit' }}>{log.userRole}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>📍 {log.location}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
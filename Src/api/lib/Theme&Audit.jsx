// Src/Components/ThemeAndAuditDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../api/lib/ThemeContext';
import AuditLogger from '../api/lib/AuditLogger';

export default function ThemeAndAuditDashboard() {
  const { currentTheme, changeTheme, themes } = useTheme();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    setLogs(AuditLogger.getLogs());
  }, []);

  return (
    <div style={{ padding: '20px', background: 'var(--bg-color)', color: 'var(--text-color)', minHeight: '100vh' }}>
      <h2>Customize Website Theme</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {Object.keys(themes).map((key) => (
          <button
            key={key}
            onClick={() => changeTheme(key)}
            style={{
              padding: '10px 15px',
              cursor: 'pointer',
              border: currentTheme === key ? '2px solid var(--primary-color)' : '1px solid #ccc',
              borderRadius: '5px',
              fontWeight: currentTheme === key ? 'bold' : 'normal'
            }}
          >
            {themes[key].name}
          </button>
        ))}
      </div>

      <hr />

      <h2>Login & Access Audit Logs</h2>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--primary-color)' }}>
            <th style={{ padding: '8px' }}>Timestamp</th>
            <th style={{ padding: '8px' }}>Event</th>
            <th style={{ padding: '8px' }}>User ID</th>
            <th style={{ padding: '8px' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px' }}>No logs recorded yet.</td></tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #444' }}>
                <td style={{ padding: '8px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{log.eventType}</td>
                <td style={{ padding: '8px' }}>{log.userId}</td>
                <td style={{ padding: '8px' }}>{JSON.stringify(log.details)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
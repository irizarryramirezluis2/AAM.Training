// Src/Components/AdminL42FAVerification.jsx
import React, { useState } from 'react';

export default function AdminL42FAVerification({ onVerified, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Static 2FA check (Matches updated passcode: 135744)
  const handleVerify = (e) => {
    e.preventDefault();
    if (code.trim() === '135744') {
      setError('');
      onVerified();
    } else {
      setError('Invalid 2FA Verification Code. Try "135744" for demo access.');
    }
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', maxWidth: '400px', margin: '40px auto', color: '#f8fafc' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>🔐 Admin L4 Step-Up 2FA</h2>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
        Please enter the verification code from your authenticator app to access Admin L4 logs.
      </p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          maxLength="6"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1.25rem',
            letterSpacing: '4px',
            textAlign: 'center',
            borderRadius: '6px',
            border: '1px solid #475569',
            backgroundColor: '#0f172a',
            color: '#fff',
            marginBottom: '15px'
          }}
        />

        {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Verify
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ flex: 1, padding: '10px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
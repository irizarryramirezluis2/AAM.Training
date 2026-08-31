# Ethics & Reasoning Infrastructure Implementation Guide

## Overview

This guide explains how to implement and use the Ethics & Reasoning infrastructure that has been set up for AAM.Training. The system provides:

- **Mandatory ethics oversight** of all code changes
- **Automated compliance** with privacy regulations (GDPR, CCPA)
- **Immutable audit trails** for transparency
- **User privacy controls** via a dashboard
- **CI/CD integration** for compliance scanning

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Infrastructure Components](#infrastructure-components)
3. [Setup & Configuration](#setup--configuration)
4. [Git Hooks Integration](#git-hooks-integration)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Backend API Implementation](#backend-api-implementation)
7. [Frontend Integration](#frontend-integration)
8. [Monitoring & Auditing](#monitoring--auditing)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Developers

Before making any code changes:

1. **Understand the Privacy Policy**
   ```bash
   cat .github/docs/PRIVACY_POLICY.md
   ```

2. **Review Ethics Rules** (enforced by pre-commit hook)
   ```bash
   cat .github/hooks/pre-tool-use.json
   ```

3. **Make Your Changes**
   - Avoid hardcoded secrets
   - Use environment variables for sensitive data
   - Add consent checks for analytics/tracking
   - Follow data minimization principles

4. **Commit Your Code**
   - The pre-commit hook automatically runs
   - If violations are found, fix them and try again
   ```bash
   git add .
   git commit -m "Your changes"
   # Pre-commit hook runs automatically
   ```

5. **Push to GitHub**
   - CI/CD pipeline runs comprehensive ethics scan
   - Review the compliance report on your PR

---

## Infrastructure Components

### 1. Pre-Commit Hook
**File**: `.github/hooks/pre-commit-ethics.sh`

Runs on every `git commit` and scans staged files for:
- ✅ Hardcoded secrets (API keys, passwords, tokens)
- ✅ Plaintext password storage
- ✅ Unauthorized tracking without consent
- ✅ Sensitive data in logs
- ✅ Over-collection of personal information
- ✅ Missing input validation
- ✅ Authentication bypasses
- ✅ PII exposure in responses

**Setup**:
```bash
# Install pre-commit hook
ln -s ../../.github/hooks/pre-commit-ethics.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Pre-Tool-Use Hooks Configuration
**File**: `.github/hooks/pre-tool-use.json`

JSON configuration for VS Code agent hooks that intercept tool execution:
- PreToolUse: Validates before file edits
- PostToolUse: Logs and verifies after edits
- SessionStart: Initializes ethics monitoring
- UserPromptSubmit: Validates user instructions

### 3. Database Schema
**File**: `.github/docs/DATABASE_SCHEMA.md`

Complete PostgreSQL schema for audit logging:
- `audit_logs`: Immutable record of all changes
- `ethics_violations`: Detected violations and fixes
- `user_consent`: Consent management
- `user_registrations`: New user tracking
- `data_access_logs`: Privacy-critical access tracking
- `agent_actions`: Agent operation logging

### 4. Privacy Policy
**File**: `.github/docs/PRIVACY_POLICY.md`

User-facing privacy policy covering:
- Data collection practices
- User rights (access, deletion, portability)
- Consent management
- Data retention periods
- International compliance (GDPR, CCPA)

### 5. Audit Dashboard Component
**File**: `Src/Components/AuditDashboard.jsx`

React component for users to:
- View their audit trail
- Manage consent preferences
- See data access logs
- Export their data
- Delete their account

### 6. CI/CD Pipeline
**File**: `.github/workflows/ethics-compliance.yml`

GitHub Actions workflow that:
- Scans PRs for ethics violations
- Validates consent implementations
- Checks for security compliance
- Generates compliance reports
- Blocks merge if critical violations found

---

## Setup & Configuration

### Step 1: Set Up Git Hooks

```bash
# Clone the repo
cd /workspaces/AAM.Training

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Link the pre-commit hook
ln -s ../../.github/hooks/pre-commit-ethics.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Verify it's working
.git/hooks/pre-commit --help
```

### Step 2: Set Up Database

**Option A: Local Development (SQLite)**
```bash
# For development, use SQLite (simpler)
sqlite3 .github/audit/audit.db < .github/docs/DATABASE_SCHEMA.md
```

**Option B: Production (PostgreSQL)**
```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE aam_training_audit;"

# Import schema
psql -U postgres -d aam_training_audit -f .github/docs/DATABASE_SCHEMA.md

# Set connection string in .env
echo "AUDIT_DB_URL=postgresql://user:password@localhost/aam_training_audit" >> .env.local
```

### Step 3: Configure Environment Variables

Create `.env.local`:
```bash
# Database
AUDIT_DB_URL=postgresql://user:password@localhost/aam_training_audit
AUDIT_DB_ENABLE_IMMUTABLE=true

# Privacy
PRIVACY_POLICY_VERSION=1.0
CONSENT_DEFAULT=deny
REQUIRE_CONSENT_FOR_ANALYTICS=true
REQUIRE_CONSENT_FOR_TRACKING=true

# Security
ENCRYPTION_KEY_AUDIT=<32-byte-key>
HASH_PASSWORDS_ALGORITHM=bcrypt

# Ethics Agent
ETHICS_AGENT_ENABLED=true
ETHICS_AUTO_FIX_ENABLED=true
ETHICS_BLOCK_ON_CRITICAL=true
```

### Step 4: Install Dependencies

```bash
npm install

# Install pre-commit framework (optional, for more control)
npm install --save-dev husky

# Set up husky
npx husky install
```

---

## Git Hooks Integration

### How Pre-Commit Hook Works

```
$ git commit -m "Add new auth feature"
  ↓
[Running .github/hooks/pre-commit-ethics.sh]
  ├─ Scan staged files for violations
  ├─ Check for hardcoded secrets
  ├─ Verify consent for analytics
  ├─ Check for sensitive data logging
  └─ ...
  ↓
[Violations Found?]
  ├─ YES → Block commit, show violations
  │        Developer must fix
  │        ↓
  │        git add . && git commit -m "..."  (retry)
  │
  └─ NO → Commit allowed
           Create audit log entry
           Proceed with commit
```

### Bypassing (Not Recommended)

If you absolutely need to bypass the hook (NOT RECOMMENDED):

```bash
# Skip hook for this commit only (logged as exception)
git commit --no-verify -m "Emergency fix"

# This creates an audit log of the bypass for review
```

### Testing the Hook

```bash
# Test with a violation
echo 'const apiKey = "sk-fake-key-12345";' > test.js
git add test.js
git commit -m "test"
# → Should fail with hardcoded secret warning

# Fix it
rm test.js
git reset HEAD test.js
```

---

## CI/CD Pipeline

### Workflow: `.github/workflows/ethics-compliance.yml`

The workflow runs on every PR and push to `main`/`develop`.

#### Jobs:

1. **ethics-scan**
   - Scans changed files for ethics violations
   - Checks for privacy issues
   - Generates report
   - Comments on PR

2. **consent-verification**
   - Verifies consent mechanisms are in place
   - Checks for hardcoded secrets
   - Validates privacy policy references

3. **security-compliance**
   - Scans for sensitive data patterns
   - Verifies input validation
   - Checks auth implementation
   - Validates access controls

4. **generate-compliance-report**
   - Compiles all reports
   - Posts comprehensive report to PR
   - Archives for compliance

#### Outputs:

- **PR Comment**: Detailed compliance report on every PR
- **Artifacts**: Ethics report and compliance documentation
- **Blocking**: Merge blocked if critical violations found

#### View Results:

1. Go to PR on GitHub
2. Scroll to "Checks" section
3. Click "Ethics & Compliance Scan"
4. View detailed report

---

## Backend API Implementation

You need to implement these API endpoints for the Ethics infrastructure to work:

### 1. Audit Log Endpoints

```javascript
// POST /api/audit/logs
// Create audit log entry
{
  actor_id: "uuid",
  actor_type: "user|agent|system",
  action_type: "CREATE|UPDATE|DELETE|etc",
  resource_type: "CODE|USER|DATA|etc",
  change_description: "What changed",
  ethics_violations_detected: [],
  compliance_status: "PASS|AUTO_FIXED|BLOCKED"
}

// GET /api/audit/logs?limit=100&offset=0
// Retrieve audit logs
[{ id, timestamp, actor_id, action_type, ... }]
```

### 2. Consent Management Endpoints

```javascript
// GET /api/audit/consent
// Get user's consent preferences
[
  {
    id: "uuid",
    consent_type: "analytics|profiling|etc",
    status: "granted|denied|pending",
    given_at: "2026-08-29T...",
  }
]

// PATCH /api/audit/consent/:consentId
// Update consent status
{ status: "granted|denied|revoked" }

// POST /api/audit/consent
// Create new consent record
{ consent_type: "analytics", status: "granted" }
```

### 3. Data Access Endpoints

```javascript
// GET /api/audit/data-access
// Get data access logs
[
  {
    id: "uuid",
    timestamp: "2026-08-29T...",
    accessor_id: "uuid",
    data_type: "personal_info|contact_info|etc",
    access_method: "direct_read|api_call",
    purpose: "Why data was accessed"
  }
]
```

### 4. Ethics Violations Endpoints

```javascript
// GET /api/audit/violations
// Get ethics violations
[
  {
    id: "uuid",
    violation_type: "HARDCODED_SECRET|PLAINTEXT_PASSWORD|etc",
    severity: "critical|high|medium",
    fix_applied: true|false,
    created_at: "2026-08-29T..."
  }
]
```

### 5. Data Subject Rights Endpoints

```javascript
// POST /api/audit/export
// GDPR Right to Data Portability
// Returns user's data in JSON format
Content-Type: application/json
{ all user data in portable format }

// POST /api/audit/delete-account
// GDPR Right to Deletion
// Schedules account for deletion (30-day grace period)
{ status: "deletion_scheduled", deletion_date: "2026-09-28" }

// GET /api/audit/user-data/:userId
// Admin/support endpoint to see what data we have
{ all data stored about user }
```

### 6. User Registration Logging

```javascript
// Internal API (called by auth system)
// POST /internal/audit/register-user
{
  user_id: "uuid",
  username: "newuser",
  email_hash: "sha256...",
  ip_address: "1.2.3.4",
  consent_status: "fully_consented",
  registration_timestamp: "2026-08-29T..."
}
```

### Implementation Example (Express.js):

```javascript
// routes/audit.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get audit logs
router.get('/logs', authenticateUser, async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  try {
    const logs = await db.query(
      'SELECT * FROM audit_logs WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user consent
router.get('/consent', authenticateUser, async (req, res) => {
  try {
    const consents = await db.query(
      'SELECT * FROM user_consent WHERE user_id = $1',
      [req.user.id]
    );
    res.json(consents.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update consent
router.patch('/consent/:consentId', authenticateUser, async (req, res) => {
  const { status } = req.body;
  
  try {
    await db.query(
      'UPDATE user_consent SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [status, req.params.consentId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export data (GDPR)
router.post('/export', authenticateUser, async (req, res) => {
  try {
    const userData = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    const auditLogs = await db.query(
      'SELECT * FROM audit_logs WHERE actor_id = $1',
      [req.user.id]
    );
    
    const exportData = {
      user: userData.rows[0],
      audit_trail: auditLogs.rows,
      export_date: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## Frontend Integration

### 1. Add Audit Dashboard Route

```javascript
// Src/main.jsx
import AuditDashboard from './Components/AuditDashboard';

const routes = [
  // ... other routes
  { path: '/privacy-audit', component: AuditDashboard, auth: true },
];
```

### 2. Add Link to Navigation

```jsx
// Src/Components/Sidebar.jsx
<NavItem 
  href="/privacy-audit" 
  icon={<Lock />}
  label="Privacy & Audit"
/>
```

### 3. Add Consent Component to Registration

```jsx
// Src/Pages/Register.jsx
import ConsentForm from './Components/ConsentForm';

export default function Register() {
  return (
    <form>
      {/* ... registration fields ... */}
      <ConsentForm required />
      <button type="submit">Create Account</button>
    </form>
  );
}
```

### 4. Create Consent Form Component

```jsx
// Src/Components/ConsentForm.jsx
export default function ConsentForm({ required = true }) {
  return (
    <div className="consent-section">
      <h3>Privacy & Consent</h3>
      
      <label>
        <input type="checkbox" required={required} />
        I have read and accept the Privacy Policy
      </label>
      
      <label>
        <input type="checkbox" />
        Allow analytics to improve the platform
      </label>
      
      <label>
        <input type="checkbox" />
        Allow marketing communications
      </label>
      
      <a href="/privacy-policy" target="_blank">
        Read full Privacy Policy
      </a>
    </div>
  );
}
```

---

## Monitoring & Auditing

### Viewing Audit Logs

#### Via CLI:
```bash
# View recent audit logs
psql -d aam_training_audit -c \
  "SELECT timestamp, actor_id, action_type, compliance_status FROM audit_logs ORDER BY timestamp DESC LIMIT 50;"

# Find ethics violations
psql -d aam_training_audit -c \
  "SELECT * FROM ethics_violations WHERE fix_applied = FALSE ORDER BY severity DESC;"

# Check user consents
psql -d aam_training_audit -c \
  "SELECT * FROM user_consent WHERE user_id = 'USER_UUID' ORDER BY updated_at DESC;"
```

#### Via Dashboard:
- Go to `/privacy-audit` after login
- View all tabs (Overview, Consent, Data Access, Ethics & Security)
- Export your data
- Download audit logs

### Regular Compliance Reviews

Weekly:
```bash
# Generate ethics report
node .github/scripts/generate-compliance-report.js --period week

# Check for unresolved violations
psql -d aam_training_audit -c \
  "SELECT COUNT(*) FROM ethics_violations WHERE fix_applied = FALSE;"
```

Monthly:
```bash
# Generate monthly compliance report
node .github/scripts/generate-compliance-report.js --period month --output compliance-report-2026-09.md

# Archive audit logs
.github/scripts/archive-audit-logs.sh
```

---

## Troubleshooting

### Pre-Commit Hook Not Running

**Problem**: `git commit` works despite violations

**Solution**:
```bash
# Verify hook is installed
ls -la .git/hooks/pre-commit

# Reinstall if missing
ln -s ../../.github/hooks/pre-commit-ethics.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Test
echo 'apiKey = "test123"' > test.js && git add test.js && git commit -m "test"
```

### Database Connection Error

**Problem**: `ERROR: connect ECONNREFUSED`

**Solution**:
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Verify connection string
echo $AUDIT_DB_URL

# Test connection
psql $AUDIT_DB_URL -c "SELECT 1;"
```

### CI/CD Pipeline Blocked PR

**Problem**: PR won't merge due to ethics violations

**Solution**:
1. Review PR comment for violation details
2. Run local pre-commit hook to test fix:
   ```bash
   .github/hooks/pre-commit-ethics.sh
   ```
3. Fix violations and push again

### Consent Not Being Recorded

**Problem**: Users can register without consent being logged

**Solution**:
1. Verify consent API is implemented
2. Check database has `user_consent` table
3. Ensure registration form includes consent checkbox
4. Test consent API:
   ```bash
   curl -X GET http://localhost:3000/api/audit/consent \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review ethics violations dashboard
- Check for unresolved security issues
- Monitor audit log size

**Monthly**:
- Generate compliance report
- Review consent statistics
- Audit agent actions

**Quarterly**:
- Update privacy policy if needed
- Review data retention policies
- Conduct security audit

**Annually**:
- Comprehensive compliance audit
- Privacy impact assessment
- Penetration testing

---

## Support & Questions

For questions about the ethics infrastructure:

1. **Documentation**: See `.github/docs/`
2. **Code Examples**: See `.github/scripts/`
3. **Privacy Policy**: See `.github/docs/PRIVACY_POLICY.md`
4. **Report Issues**: Create GitHub issue with `[ethics]` tag

---

## Next Steps

1. ✅ Set up Git hooks (see Step 1)
2. ✅ Configure database (see Step 2)
3. ✅ Implement backend APIs (see Backend API Implementation)
4. ✅ Integrate frontend components (see Frontend Integration)
5. ✅ Enable CI/CD workflow (GitHub Actions activated)
6. ✅ Test end-to-end (see Troubleshooting)
7. ✅ Deploy to production
8. ✅ Monitor and maintain

---

**Last Updated**: 2026-08-29
**Status**: ACTIVE
**Version**: 1.0

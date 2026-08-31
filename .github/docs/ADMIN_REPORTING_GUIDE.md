# Admin Audit Reporting System

## Overview

The Admin Audit Reporting System provides tiered access to ethics and compliance reports based on admin levels:

- **Level 3 (Admin)**: Access to audit reports, updated every **2 weeks**
- **Level 4 (Super Admin)**: Access to audit reports, updated every **3 days**
- **Level 0-2**: No access to audit reports

Reports are automatically generated on a schedule and include:
- Ethics violations (hardcoded secrets, privacy issues, etc.)
- Security incidents and vulnerabilities
- Compliance status (GDPR, CCPA, etc.)
- Data access logs
- User consent status
- Agent action audit trail

---

## Setup Instructions

### Step 1: Add Admin Level Support to Database

Run the migration in `.github/docs/ADMIN_REPORTING_SCHEMA.md`:

```bash
psql -d aam_training_audit < .github/docs/ADMIN_REPORTING_SCHEMA.md
```

This creates:
- `admin_audit_reports` table (reports storage)
- `admin_report_access_logs` table (audit of who accessed what)
- `report_schedules` table (scheduling configuration)
- `report_generation_audit` table (generation status tracking)

### Step 2: Update Users Table

Add admin level to users:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level INT DEFAULT 0;

-- Set admin levels
UPDATE users SET admin_level = 3 WHERE email = 'admin@example.com';
UPDATE users SET admin_level = 4 WHERE email = 'superadmin@example.com';
```

### Step 3: Install Dependencies

```bash
npm install node-cron
```

### Step 4: Set Up Report Scheduler

In your server startup file (e.g., `server.js` or `index.js`):

```javascript
const reportScheduler = require('./.github/docs/report-scheduler');

// Start the scheduler after database connection
db.connect().then(() => {
  reportScheduler.start();
});

// Stop scheduler on shutdown
process.on('SIGTERM', () => {
  reportScheduler.stop();
  process.exit(0);
});
```

### Step 5: Initialize Report Schedules

Insert default schedules into database:

```sql
-- Level 3 Admin - Every 2 weeks
INSERT INTO report_schedules (report_type, admin_level, frequency, next_generation_at, enabled)
VALUES 
  ('ethics_violations', 3, '2_weeks', NOW(), TRUE),
  ('security_incidents', 3, '2_weeks', NOW(), TRUE),
  ('compliance_summary', 3, '2_weeks', NOW(), TRUE),
  ('data_access', 3, '2_weeks', NOW(), TRUE),
  ('consent_status', 3, '2_weeks', NOW(), TRUE),
  ('agent_actions', 3, '2_weeks', NOW(), TRUE);

-- Level 4 Super Admin - Every 3 days
INSERT INTO report_schedules (report_type, admin_level, frequency, next_generation_at, enabled)
VALUES 
  ('ethics_violations', 4, '3_days', NOW(), TRUE),
  ('security_incidents', 4, '3_days', NOW(), TRUE),
  ('compliance_summary', 4, '3_days', NOW(), TRUE),
  ('data_access', 4, '3_days', NOW(), TRUE),
  ('consent_status', 4, '3_days', NOW(), TRUE),
  ('agent_actions', 4, '3_days', NOW(), TRUE);
```

### Step 6: Implement API Endpoints

Copy the API implementation from `.github/docs/ADMIN_REPORT_API.js` to your backend:

```javascript
// routes/admin-reports.js
const adminReportsRouter = require('./.github/docs/ADMIN_REPORT_API');
app.use('/api/admin', adminReportsRouter);
```

### Step 7: Add Frontend Component

Add the Admin Dashboard to your React app:

```javascript
// In your routes
import AdminAuditDashboard from './Components/AdminAuditDashboard';

const routes = [
  // ... other routes
  { 
    path: '/admin/audit', 
    component: AdminAuditDashboard, 
    auth: true, 
    adminLevel: 3 
  },
];
```

Add link to navigation (if admin level >= 3):

```jsx
{user?.admin_level >= 3 && (
  <NavLink href="/admin/audit" icon={<BarChart />}>
    Audit Reports
  </NavLink>
)}
```

---

## Report Types

### 1. Ethics Violations Report
- **Content**: Hardcoded secrets, plaintext passwords, unauthorized tracking, sensitive data logging, PII exposure
- **Metrics**: Total violations, auto-fixes applied, critical/high severity counts
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

### 2. Security Incidents Report
- **Content**: Detected security incidents, vulnerabilities, patches applied
- **Metrics**: Incident count, vulnerability count, patch status
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

### 3. Compliance Summary Report
- **Content**: GDPR, CCPA, COPPA compliance status, violations resolved
- **Metrics**: Compliance score, regulations monitored, violations resolved
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

### 4. Data Access Report
- **Content**: All data access events, who accessed what data, when
- **Metrics**: Total access events, unique users, sensitive data access count
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

### 5. Consent Status Report
- **Content**: User consent preferences, grants vs denials, pending consents
- **Metrics**: Total users, consents granted, denied, pending
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

### 6. Agent Actions Report
- **Content**: All agent operations (Code Rewriter, Security, Test & Debug, Ethics)
- **Metrics**: Total actions, auto-fixes, manual reviews needed
- **Frequency**: Level 3 → 2 weeks, Level 4 → 3 days

---

## API Endpoints

### Access Control Middleware

All endpoints require minimum admin level. Access is checked on every request:

```
GET /api/admin/reports
  ├─ Required: Level 3+
  ├─ Returns: List of reports visible to your level
  └─ Update Frequency: Every 2 weeks (Level 3) or 3 days (Level 4)

GET /api/admin/reports/:reportId
  ├─ Required: Level 3+
  ├─ Returns: Detailed report (if you have access)
  └─ Logs: Access event to audit trail

POST /api/admin/reports/generate
  ├─ Required: Level 4+ (Super Admin only)
  ├─ Body: { report_type, period_days }
  └─ Returns: Newly generated report

GET /api/admin/reports/:reportId/download
  ├─ Required: Level 3+
  ├─ Returns: Report as JSON file download
  └─ Logs: Download access to audit trail

POST /api/admin/reports/:reportId/email
  ├─ Required: Level 3+
  ├─ Action: Emails report to your email address
  └─ Logs: Email access to audit trail

GET /api/admin/summary
  ├─ Required: Level 3+
  ├─ Returns: Dashboard summary (metrics, recent violations, schedules)
  └─ Use Case: Overview page on dashboard

GET /api/admin/schedule
  ├─ Required: Level 3+
  ├─ Returns: Report generation schedules for your level
  └─ Shows: When next report will be generated

GET /api/admin/access-logs
  ├─ Required: Level 4+ (Super Admin only)
  ├─ Returns: Who accessed which reports and when
  └─ Use Case: Audit trail of admin report access
```

---

## Usage Examples

### For Level 3 Admins (Reports Every 2 Weeks)

**View available reports:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/reports
```

**Get summary:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/summary
```

**Download a report:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/reports/{reportId}/download \
  > audit-report.json
```

**Email a report to yourself:**
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/reports/{reportId}/email
```

### For Level 4 Super Admins (Reports Every 3 Days)

**Same as Level 3, PLUS:**

**Manually generate a report:**
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/reports/generate \
  -d '{"report_type": "ethics_violations", "period_days": 14}'
```

**View access logs (who accessed what reports):**
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.example.com/api/admin/access-logs
```

---

## Report Generation Schedule

### Automatic Generation

Reports are automatically generated on this schedule:

| Report Type | Level 3 | Level 4 |
|-------------|---------|---------|
| Ethics Violations | Every 2 weeks | Every 3 days |
| Security Incidents | Every 2 weeks | Every 3 days |
| Compliance Summary | Every 2 weeks | Every 3 days |
| Data Access | Every 2 weeks | Every 3 days |
| Consent Status | Every 2 weeks | Every 3 days |
| Agent Actions | Every 2 weeks | Every 3 days |

**Generation Time**: Midnight UTC (configurable in `generation_time` field)

### Scheduler Status

Check if scheduler is running:

```bash
# In your app logs, you should see:
# 🚀 Starting Report Scheduler...
# ⏰ Scheduling ethics_violations_3 - Frequency: 2_weeks
# ⏰ Scheduling ethics_violations_4 - Frequency: 3_days
# ✅ Report Scheduler started successfully
```

Monitor scheduler execution:

```sql
-- View scheduled reports awaiting generation
SELECT * FROM report_schedules WHERE enabled = TRUE AND next_generation_at <= NOW();

-- View report generation history
SELECT * FROM report_generation_audit ORDER BY triggered_at DESC LIMIT 20;

-- View failed report generations
SELECT * FROM report_generation_audit WHERE status = 'failed' ORDER BY triggered_at DESC;
```

---

## Audit Trail

### Report Access Logging

Every report access is logged:

```sql
-- View all report accesses by an admin
SELECT * FROM admin_report_access_logs 
WHERE admin_id = 'USER_UUID' 
ORDER BY accessed_at DESC;

-- View report downloads
SELECT * FROM admin_report_access_logs 
WHERE access_method = 'download' 
ORDER BY accessed_at DESC;

-- View emailed reports
SELECT * FROM admin_report_access_logs 
WHERE access_method = 'email' 
ORDER BY accessed_at DESC;
```

### Generation Audit

Track all report generation events:

```sql
-- View report generation history
SELECT ar.report_type, ar.generated_at, rga.status, rga.records_processed, rga.violations_found
FROM report_generation_audit rga
JOIN admin_audit_reports ar ON rga.report_id = ar.id
ORDER BY rga.triggered_at DESC
LIMIT 50;

-- Find failed generations
SELECT * FROM report_generation_audit WHERE status = 'failed';
```

---

## Configuration

### Changing Update Frequency

To change how often reports are generated:

```sql
-- Change Level 3 to weekly instead of biweekly
UPDATE report_schedules
SET frequency = 'weekly'  -- Would need to be added to SCHEDULES in report-scheduler.js
WHERE admin_level = 3;
```

### Disabling Reports

To disable report generation:

```sql
UPDATE report_schedules SET enabled = FALSE WHERE admin_level = 3;
```

### Changing Generation Time

Reports are generated at midnight UTC by default. To change:

```sql
UPDATE report_schedules 
SET generation_time = '09:00:00'  -- Generate at 9 AM instead
WHERE admin_level = 3;
```

---

## Troubleshooting

### Reports Not Generating

**Check if scheduler is running:**
```bash
# In server logs, look for:
# "🚀 Starting Report Scheduler..."
```

**Check report schedules:**
```sql
SELECT * FROM report_schedules WHERE enabled = TRUE;
```

**Check for failed generations:**
```sql
SELECT * FROM report_generation_audit WHERE status IN ('failed', 'pending');
```

### Reports Not Visible in Dashboard

**Check your admin level:**
```sql
SELECT admin_level FROM users WHERE id = 'YOUR_USER_ID';
```
Must be 3+. Set it if needed:
```sql
UPDATE users SET admin_level = 3 WHERE id = 'YOUR_USER_ID';
```

**Check report visibility:**
```sql
SELECT * FROM admin_audit_reports 
WHERE min_admin_level <= 3  -- Your level
ORDER BY generated_at DESC;
```

### Permission Denied Error

**Check authentication token:** Ensure you're logged in and have a valid JWT

**Check admin level:** Must be Level 3+ for any report access

```javascript
// In API middleware
if (!req.user || !req.user.admin_level || req.user.admin_level < 3) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

---

## Security Considerations

### Access Control

- Reports are access-controlled by admin level
- All accesses are logged
- Super Admin (Level 4) can see all reports generated for their level
- Admin (Level 3) can only see reports for their level

### Data Protection

- Reports contain sensitive security and ethics data
- Should never be shared outside the admin team
- Downloaded reports should be treated as confidential
- Email delivery should use encrypted channels

### Audit Trail

- All report accesses are logged immutably
- Access logs cannot be deleted
- Super Admins can view access logs
- Audit logs are retained for 7 years

---

## Integration with Ethics System

Reports integrate with the Ethics & Reasoning infrastructure:

1. **Automatic data collection** from:
   - `ethics_violations` table (ethics violations)
   - `audit_logs` table (all changes)
   - `user_consent` table (consent status)
   - `data_access_logs` table (data access)
   - `agent_actions` table (agent operations)

2. **Report generation** happens on schedule (async)

3. **Notifications** sent to admins when reports are ready (email)

4. **Dashboard** displays reports with metrics and recommendations

---

## Monitoring & Maintenance

### Weekly Tasks
- Review ethics violations dashboard
- Check for any failed report generations
- Monitor report access logs

### Monthly Tasks
- Archive old reports (1+ year old)
- Review compliance scores
- Update recommendations

### Quarterly Tasks
- Audit report accuracy
- Review admin access patterns
- Update report templates

---

## Next Steps

1. ✅ Run database migrations
2. ✅ Set admin levels for users
3. ✅ Install `node-cron` dependency
4. ✅ Configure and start report scheduler
5. ✅ Implement backend API endpoints
6. ✅ Add frontend Admin Dashboard component
7. ✅ Initialize report schedules
8. ✅ Test end-to-end workflow
9. ✅ Monitor first few report generations
10. ✅ Set up email notifications (optional)

---

**Status**: Ready for implementation  
**Created**: 2026-08-29  
**Documentation Version**: 1.0  
